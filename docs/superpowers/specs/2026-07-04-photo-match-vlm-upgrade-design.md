# Photo Match VLM Upgrade Design

把拍照识别从纯 pHash 本地检索升级为「VLM 直接识别纹样名 + 库内匹配」。Step Fun Vision 一次调用给结论，前端拿名字去库内三段式匹配。

## Background

当前 `src/utils/imageComparison.ts` 是 pHash(64bit) + dHash(64bit) 0.6/0.4 加权汉明距离，库内原图 100% 命中，但真实场景（拍照/截图/裁切）框差几像素就翻转好几个 bit，相似度暴跌。产品定位之前降级为「找相似」。

升级目标：恢复「精确识别这是哪个纹样」。中国纹样库 ~360 张，VLM 看一眼就能给出名字。

## Architecture

```
用户上传图 → 框选 crop（可选）
         ↓
    Step Fun step-3.7-flash（VLM）
         ↓ prompt: 输出 1-3 个候选纹样名
         ↓
    VLM 输出（"团龙纹" 或 "龙|云纹|海水"）
         ↓
    库内三段式匹配
         ↓
    ┌──────────────────────────────────────┐
    │ ① 精确 name === VLM候选              │
    │ ② 模糊 includes / type 兜底           │
    │ ③ pHash fallback（库内原图相似度）    │
    └──────────────────────────────────────┘
         ↓
    结果展示
```

## VLM 调用

### 接口

- **服务**：Step Fun `step-3.7-flash`（套餐内唯一支持视觉的模型）
- **认证**：`Authorization: Bearer ${VITE_STEPFUN_API_KEY}`
- **Endpoint**：参考 Botender 项目已验证的调用方式（`D:\desktop\botender\` 或 memory `reference_stepfun-api.md`）
- **请求结构**：单图（用户裁切后的 base64 or 上传 file）+ 文本 prompt

### Prompt

```
识别图中的中国传统纹样。

输出规则：
- 只输出纹样名，不要解释、不要标点
- 多主题时按主次输出 1-3 个，用 | 分隔
- 示例：团龙纹 / 缠枝纹 / 龙|云纹|海水 / 莲瓣纹

常见纹样参考（不限于这些）：
团龙纹、行龙纹、云雷纹、回纹、卷草纹、缠枝纹、莲瓣纹、如意云纹、海水江崖纹、宝相花、冰裂纹、万字纹、绳纹、饕餮纹、凤鸟纹、牡丹纹、菊花纹、兰花纹、青花龙纹、青花山水
```

### 输出解析

```ts
type VlmResult = {
  candidates: string[]      // ["团龙纹"] 或 ["龙","云纹","海水"]
  rawOutput: string         // VLM 原始输出
}

function parseVlmNames(raw: string): VlmResult {
  const cleaned = raw.trim().replace(/[。，,\s]+$/, '')
  const names = cleaned.split(/[|｜、]/).map(s => s.trim()).filter(Boolean)
  return { candidates: names.slice(0, 3), rawOutput: raw }
}
```

## 库内匹配规则

输入：`VlmResult.candidates`（最多 3 个名字）  
输出：`{ primaryMatch: Pattern | null, fuzzyMatches: Pattern[], fallbackMatches: Pattern[] }`

### 三段式匹配（按候选顺序执行）

```ts
function matchPattern(vlmNames: string[]): MatchResult {
  // ① 精确匹配：name === vlmName
  for (const name of vlmNames) {
    const exact = PATTERN_LIBRARY.find(p => p.name === name)
    if (exact) return { primaryMatch: exact, source: 'exact', ... }
  }

  // ② 模糊匹配：name includes 关键词，或 type 匹配
  const fuzzySet = new Set<Pattern>()
  for (const name of vlmNames) {
    // 提取核心关键词（去掉"纹"字后取最后一个字，如"团龙纹"→"龙"）
    const keyword = extractKeyword(name)  // "团龙纹" → "龙"
    PATTERN_LIBRARY.forEach(p => {
      if (p.name.includes(keyword) || p.type?.includes(keyword)) {
        fuzzySet.add(p)
      }
    })
  }

  // ③ pHash fallback：如果模糊匹配为空，用 pHash
  if (fuzzySet.size === 0) {
    return { primaryMatch: null, fuzzyMatches: [], fallbackMatches: pHashTop3 }
  }

  return { primaryMatch: null, fuzzyMatches: [...fuzzySet].slice(0, 3), ... }
}
```

### 关键词提取规则

```ts
function extractKeyword(name: string): string {
  // 去掉常见后缀
  const cleaned = name.replace(/(纹|花|字|草|水)$/, '')
  // 取最后 1-2 字（核心主题）
  return cleaned.slice(-2)
}
```

| VLM 输出 | 关键词 | 匹配范围 |
|---|---|---|
| `团龙纹` | `团龙` | name includes "团龙" |
| `蟠龙纹` | `蟠龙` → fallback `龙` | name includes "龙" |
| `龙` | `龙` | name/type includes "龙" |
| `海水` | `海` | name includes "海" |
| `青花` | `青` | name includes "青" |

### 同义词扩展词典（可选，先小规模）

```ts
const SYNONYMS = {
  '蟠龙': ['团龙', '盘龙', '坐龙'],
  '宝相花': ['莲花', '牡丹'],
  '回字纹': ['回纹'],
}
```

先不展开，等测试看不命中率再补。

## UI 变更

### 结果区结构调整

**当前**（4 档徽章）：很像 / 相似 / 略像 / 参考  
**改后**（两段式）：

```
┌──────────────────────────────────────┐
│  📷 你上传的图片                      │
│  [缩略图]                            │
├──────────────────────────────────────┤
│  🎯 VLM 识别：团龙纹                  │  ← 大字（金红主色）
│  （候选 1/3）                         │
├──────────────────────────────────────┤
│  库内匹配                            │
│  [卡片 1: 团龙纹 SSR]   ← 命中        │  ← primaryMatch 高亮
│  [卡片 2: 龙海水云纹 SSR]              │  ← fuzzyMatches
│  [卡片 3: 行龙纹 RARE]                │
├──────────────────────────────────────┤
│  ℹ️ 库内一致 · VLM 直接命中           │  ← 档位说明
└──────────────────────────────────────┘
```

### 档位标签（替换当前 similarityLabel）

```ts
function matchLabel(result: MatchResult) {
  if (result.primaryMatch && result.source === 'exact') {
    return { label: '库内一致', color: '#F2D58A' }  // 金色
  }
  if (result.fuzzyMatches.length > 0) {
    return { label: '库内近似', color: '#D4AF6A' }  // 黄铜
  }
  if (result.fallbackMatches.length > 0) {
    return { label: '本地参考', color: '#8a7a4a' }  // 暗
  }
  return { label: '未识别', color: '#5a5a5a' }
}
```

### Loading 文案

`正在匹配纹样...` → `VLM 正在识别...`

### 底部说明

`本地特征匹配，结果仅供参考 · 想精确识别同一张图请上传库内原图`  
→ `VLM 识别 + 库内匹配 · 拍博物馆实物效果最好`

## 错误处理

| 场景 | 处理 |
|---|---|
| Step Fun API 失败（限流/网络/key 错） | 静默 fallback 到 pHash，UI 加提示「在线识别不可用，已用本地匹配」 |
| VLM 输出无法解析（空/乱码） | 当作未命中，走 pHash fallback |
| VLM 输出纹样名全不在库内 | 走模糊匹配 → 仍空走 pHash fallback |
| 用户没设 API key | 提示「未配置 VLM，使用本地匹配」+ 隐藏 VLM 识别大字 |

## 配置与密钥

### `.env.local` 加新字段

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STEPFUN_API_KEY=step-xxx      # 新增
```

`.env.example` 同步加注释。

### 安全说明（demo 阶段接受）

- key 暴露在 `import.meta.env` 浏览器可见
- Step Fun 后台开 IP 限制 + 调用频次（如 100/天）兜底
- 上线前演进：迁到 Supabase Edge Function 代理

## 测试

### 样本集

10 张测试图，看 VLM 出词稳定性和库内匹配率：

| 类别 | 数量 | 来源 | 预期 |
|---|---|---|---|
| 库内原图 | 5 | `public/patterns/` 直接截图 | 精确匹配 ≥ 4/5 |
| 真实场景 | 3 | 网上找博物馆实物图 | 模糊匹配 ≥ 2/3 |
| 复合纹样 | 2 | 青花瓷照片（龙+云+海水） | 至少 1 个候选命中 |

### 手工跑测脚本

`scripts/test_vlm_match.js`（开发期 node 脚本）：
- 读 `public/patterns/*.webp` 5 张
- 调 Step Fun API
- 打印 VLM 输出 + 库内匹配结果
- 跑一次看准确率

## File Structure

```
src/
├── utils/
│   ├── imageComparison.ts       # 保留（fallback 用 pHash+dHash）
│   └── vlmMatch.ts              # 新增：Step Fun API + prompt + 解析
├── pages/
│   └── PhotoMatchPage.jsx       # 改：UI 重排 + VLM 调用编排
└── store/
    └── patternData.ts           # 不动（匹配规则只读）

docs/superpowers/specs/
└── 2026-07-04-photo-match-vlm-upgrade-design.md  # 本文档

scripts/
└── test_vlm_match.js            # 新增：开发期测试脚本（可选）

.env.example                     # 加 VITE_STEPFUN_API_KEY 注释
.env.local                       # 加真实 key（gitignored）
```

## Out of Scope

以下不在本次实现范围：

- 多服务商 fallback（GLM-4V / Claude Vision）
- VLM 输出结构化标签（朝代/构图/色彩）用于搜索筛选
- Embedding 预计算 + 向量检索
- Supabase Edge Function 代理（API key 隐藏）
- 自动打标签供广场发布时补 tag

如果方案 A 跑通后精度不够，下一步演进方向：方案 C（pHash 粗筛 top-10 + VLM 看候选图二选一）。
