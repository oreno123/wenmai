# Photo Match VLM 接入设计（2026-08-27）

把 07-04 已实现但从未接入页面的 VLM 识别（`src/utils/vlmMatch.ts`）真正接进 `/photo-match` 找相似页面，并把 API key 从前端 bundle 迁到服务器反代——wenmai.ruoziqing.cn 已公开上线，07-04 设计里"key 暴露在 import.meta.env、demo 阶段接受"的前提不再成立。

前作：`2026-07-04-photo-match-vlm-upgrade-design.md`（三段式匹配、prompt、解析坑——已实现于 vlmMatch.ts，本文不重复）。

## 背景

- 线上"找相似"仍是本地 pHash/dHash 撞库（真实拍照场景框差几像素相似度就暴跌），VLM 工具函数 07-04 写完测过但"PhotoMatchPage 接入留作下一步"后搁置
- 郭亚敏老师反馈的产品主线 = 拍照识别 + 讲解 + 文创；识别是主线入口
- 供应商定为 Step Fun `step-3.7-flash`（套餐内唯一视觉模型；豆包需新购 key，openai-next 中转不可控）
- 2026-08-27 已排障：线上 chunk/图片全部正常部署，"Failed to fetch dynamically imported module" 为浏览器瞬态故障，与本设计无关

## 1. 总体架构

```
浏览器（/photo-match 页）
  │ POST https://wenmai-api.ruoziqing.cn/vlm/chat/completions（同源，带 crop 压缩图 base64）
  ▼
nginx wenmai-api server
  │ 剥掉 /vlm 前缀 + 注入 Authorization: Bearer <key>（key 只存服务器）
  │ OPTIONS 预检直答（复用 /auth/v1 同款写法）
  ▼
https://api.stepfun.com/v1/chat/completions → step-3.7-flash
```

- **key 永不进前端 bundle**：bundle 是公开资产，任何 VITE_ key 等于公开
- 本地 dev：`vite.config` 的 `server.proxy` 把 `/vlm` 转发到 `https://wenmai-api.ruoziqing.cn`，前后端代码同一条相对路径
- 防滥用：`/vlm/` 是公开端点，加 `limit_req` 每 IP 10 次/分钟 burst 5（zone 声明放 `/etc/nginx/conf.d/wenmai-vlm-limit.conf`，不动主 nginx.conf）

## 2. vlmMatch.ts 改动

| 项 | 改动 |
|---|---|
| `STEPFUN_ENDPOINT` | `https://api.stepfun.com/v1/chat/completions` → 相对路径 `/vlm/chat/completions` |
| `callStepFunVision` | 去掉 `opts.apiKey`（反代注入）；`AbortSignal` 保留（页面传 25s 超时） |
| `VLM_PROMPT` | 升级两行输出：`答案：纹样名（1-3 个按主次 \| 分隔）` + `讲解：60 字内说明是什么/盛行朝代/寓意` |
| 新 `parseVlmOutput(raw)` | `{ names: string[], explanation: string }`；优先找 `答案：` 行解析名字，找不到退回现有"取最后一行"逻辑（向后兼容）；`讲解：` 行取讲解，缺失给空串 |
| 新 `fileToCompressedBase64(file, crop?)` | Image 解码 → canvas 画 crop（有框选时）或整图 → 最长边 1024 → JPEG q0.82 → 纯 base64。手机原图 5-10MB 压到 ~200KB，上行快约 10 倍 |
| `matchPattern` / `extractKeyword` / reasoning 三段 fallback | 不动（07-04 已实现并有单测） |
| `vlmMatch.test.ts` | 补 `parseVlmOutput` 用例：双行输出 / 只有答案行 / reasoning 包裹（答案行不在末尾）/ 讲解缺失 / 空输出 |

保留 `fileToBase64` 原函数（测试脚本用），页面一律走压缩版。

## 3. PhotoMatchPage 接入

`runIdentify` 新流程：压缩 → `callStepFunVision`（AbortController 25s）→ `matchPattern` → 按四种结果态渲染：

| 态 | 触发条件 | UI |
|---|---|---|
| exact | VLM 名字精确命中库内 | 大卡"识别为 · {name}"（金红主色）+ AI 讲解 + 「查看百科」跳 `/pattern/:id` |
| fuzzy | 模糊命中 | 候选纹样列表（沿用现有卡片）+ AI 讲解置顶 |
| 未收录 | VLM 出了名字但库里没有 | "图鉴暂未收录 · AI 识别为 {name}" + 讲解 + 自动跑 hash top3 作"相似参考" |
| VLM 失败 | 超时/网络/5xx/空输出 | 静默落回现有 hash 全流程 + 小字"AI 识别不可用，已用本地匹配" |

- 框选 crop 保留：框了就把框内区域送 VLM（压缩函数吃 crop 参数）
- loading 文案：`正在匹配纹样...` → `AI 正在识别纹样...`
- 底部说明：`本地特征匹配，结果仅供参考...` → `AI 识别 + 库内匹配 · 拍博物馆实物效果最好`

## 4. 服务器 nginx（wenmai-api.ruoziqing.cn）

```nginx
# /etc/nginx/conf.d/wenmai-vlm-limit.conf（http 上下文）
limit_req_zone $binary_remote_addr zone=vlm:10m rate=10r/m;

# sites-available/wenmai-api 的 server{} 内新增
location /vlm/ {
    limit_req zone=vlm burst=5 nodelay;
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
        add_header Access-Control-Max-Age "86400";
        return 204;
    }
    proxy_pass https://api.stepfun.com/v1/;
    proxy_set_header Host api.stepfun.com;
    proxy_ssl_server_name on;
    proxy_set_header Authorization "Bearer <STEPFUN_KEY>";  # 只在服务器上，不进 git
    proxy_read_timeout 60s;  # reasoning 模型偶尔慢
}
```

- key 不进 git：仓库 `deploy/nginx-wenmai-api.conf.template` 存脱敏模板（占位符 `<STEPFUN_KEY>`）+ 注释说明
- 变更三步：backup → `nginx -t` → reload；旧配置已有 `wenmai-api.bak-20260827` 基线
- 回滚：`cp` 回 .bak 再 reload 即可

## 5. 测试与部署

**测试顺序：**
1. 单测：`npm test`（parseVlmOutput 新用例 + 既有用例不回归）
2. 本地 dev 全流程三张代表图：库内原图截图（预期 exact）/ 山海经类纹样（预期 fuzzy）/ 无关照片（预期"未收录"+hash 参考）
3. nginx 上线后 `curl -X POST https://wenmai-api.ruoziqing.cn/vlm/chat/completions`（带最小 base64 图）验证 200 + 正常 choices

**部署：**
1. nginx 配置 scp + backup + test + reload
2. `npm run build` → dist 整包 scp 到 `/var/www/wenmai`（~359MB，约 1 分钟；服务器端先 `cp -r` 留上一版作回滚点）
3. 手机浏览器实测上传照片全流程

**验证清单：**
- [ ] dev 与线上同一条 `/vlm` 代码路径
- [ ] 线上 bundle 中 grep 不到 Step Fun key
- [ ] 未登录可识别（识别不要求登录）
- [ ] limit_req 生效（连发 15 次出现 503）

## Out of Scope

- 豆包/多供应商 fallback（Step Fun 失败即 hash 兜底，够用）
- VLM 结构化标签（朝代/构图）用于图鉴筛选
- Supabase Edge Function 代理（nginx 反代已覆盖需求）
- 识别历史记录持久化
- pHash 粗筛 top10 + VLM 二选一的精度增强（留给实测后如果准确率不够再上）
