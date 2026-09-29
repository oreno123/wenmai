# 纹脉 (wenmai) — 编码 Agent 入场说明

> 本文件是代码仓的**唯一真相入口**。
> `README.md` 停在 2026-06-14，功能列表已严重过时（没写画廊/文物/产品/鸿蒙），**不要以它为准**。

---

## 1. 项目是什么

中国传统纹样「抽卡 + 创作 + 文创」Web 应用。用户抽卡收集纹样，用拼图块/对称工具二次创作，在 3D 产品（马克杯/手机壳/盘/丝巾）上预览，作品可发布到广场。

产品主线（2026-09 老师导向后收缩）：**拍照识别 → 纹样讲解 → 文创衍生**。这三个方向是核心，改代码时优先保它们的可用性。

更大背景是文化 IP 生态：小说叙事层 / 纹脉数据层 / 博物馆合作 / 文创产品 / 电商 / 学术背书。对本仓的影响只有一个：**文化准确性是硬要求**，纹样名称、朝代、寓意不能编。

### 1.1 已经废弃的技术路线（别回头重走）

这几条都是踩过坑换出来的，看到"也许可以用 X 重做"的念头时先读这里：

| 废弃方案 | 为什么废 | 现在用的是什么 |
|---|---|---|
| SAM (ViT-B) 分割提取纹样元素 | 金丝线稿不是视觉显著物，SAM 不对路。它只在拼图块上还留着 8 个预切好的资产 | LAB 颜色阈值提金丝 → 连通域拆件 → DBSCAN 空间聚类语义分组 |
| 48 维 RGB 颜色直方图做拍照识别 | **0% 准确**。库里纹样同色系（金线黑底 / 红底白纹 / 青花蓝白），直方图分不开两张金线黑底图 | pHash(DCT 64) + dHash 0.6/0.4 加权汉明距离，库内 100% 命中 |
| 纯 pHash 撑真实场景 | 库内命中率漂亮，但 pHash 是 bit 级敏感，实拍照片仍不稳，只能降级成"找相似" | Step Fun 视觉模型（`src/utils/vlmMatch.ts`），pHash 退为 fallback |
| 在渲染层修「金线黑底不好看」 | 治标。问题是素材本身是装饰风、系列风格不统一 | 重走素材管线重生成浅底（`scripts/process_patterns.py`） |

注：`src/utils/imageComparison.ts` 的文件头注释里写了旧直方图失败的完整原因，改动这块前先读它。

---

## 2. 技术栈与命令

Vite 8 · React 19 · Three.js (`@react-three/fiber` + `drei`) · Framer Motion · Tailwind CSS 4 · MediaPipe Tasks Vision · Supabase · Vitest

```bash
npm run dev       # 开发服务器
npm run build     # 产出 dist/
npm run test      # vitest run（目前仅 src/utils/vlmMatch.test.ts）
npm run lint      # eslint
```

前端是纯 SPA，无 SSR、无状态管理库、无 UI 组件库——**不要引入这几类依赖**，现有结构是有意保持轻的。

---

## 3. 目录地图

```
src/
├── App.jsx                 路由表 + 布局 + CloudSync（登录桥接）
├── constants.ts            游戏经济/保底/画布尺寸 全部魔法数字
├── index.css               设计令牌（@theme）+ 全局样式  ← 色值真相源
├── components/
│   ├── common/Router.jsx   自写 hash 路由（见 §4.1）
│   ├── cards/              PatternCard 纹样卡
│   ├── gacha/              抽卡动画
│   ├── gallery/            广场：WorkCard / PublishModal / AdminOnlyRoute
│   ├── products/           3D 产品：Mug / PhoneCase / Plate / Scarf / GLBModel
│   └── relief/             ReliefScene 浮雕
├── data/                   静态数据
│   ├── patternDescriptions.ts  586 行纹样百科（朝代/寓意/用途/冷知识）
│   ├── qinghuaPatterns.ts      青花瓷 335 张
│   ├── aiAssets.ts             AI 生成纹样清单
│   ├── artifactMap.ts          文物映射
│   └── templates.ts            6 套模板填空预设
├── engine/                 纯算法层（无 React）
│   ├── proceduralPatterns.js  回纹/万字/冰裂/雷纹/绳纹 实时 SVG
│   ├── puzzleBlocks.js / puzzleSnap.js      拼图块与磁吸
│   ├── shapeInteraction.ts    MarchingSquares 轮廓 + mask 碰撞
│   ├── jigsawEngine.ts / snapEngine.ts / symmetry.ts
│   └── componentLibrary.ts
├── lib/
│   ├── supabase.js         client 单例 + isSupabaseConfigured
│   ├── auth.js             useAuth + 注册/登录/登出（含新人福利落库）
│   └── galleryApi.js       广场全部读写（works / likes / storage）
├── pages/                  19 个页面，见 §3.1
├── showcase/               手势展示：Voronoi 碎裂 / 丝线 / 弹簧物理
├── store/
│   ├── gameStore.ts        游戏数据（localStorage + 云端同步）← 核心
│   ├── AppState.tsx        仅 Context 包装，转出 useApp()
│   └── patternData.ts      纹样总库（11 系列）+ 抽卡池逻辑
├── utils/                  分享卡 / 法线贴图 / 轮廓 / 图像比对 / VLM
└── gesture-cards/          MediaPipe 手势图鉴（独立子应用）

public/                     716 patterns · 593 relic · 97 elements · 13 artifacts · 22 puzzle
scripts/                    Python 素材管线（生成/去底/多尺寸/WebP）
deploy/                     Supabase 核心 docker-compose + nginx + SQL init/fix/seed
```

### 3.1 路由表（`src/App.jsx`）

`/` Splash · `/landing` · `/home` · `/library` · `/gacha` · `/editor` · `/composer` · `/puzzle` · `/jigsaw` · `/curate` · `/pattern/:id` · `/photo-match` · `/qinghua` · `/auth` · `/gallery` · `/work/:id` · `/admin` · `/relic` · `/ai-patterns` · `/showcase`

`BottomNav` 在 `/`、`/landing`、`/showcase`、`/auth` 四个路径下隐藏（`App.jsx` 的 `Layout`）。新增页面若不该带底栏，记得同步这个判断。

---

## 4. 改之前必须知道的五件事

### 4.1 路由是自写的 hash 路由，不要换成 react-router

`src/components/common/Router.jsx` 只有 44 行：解析 `#/path?query`，监听 `hashchange`，`useNavigate()` 直接写 `window.location.hash`。

**为什么不能换**：鸿蒙 HAP 把前端塞进 `rawfile`，走的是 `http://localhost/` 虚拟 origin + 全量拦截（见 §7）。history API 路由在 `resource://` 协议下会碎。这是架构约束，不是历史包袱。

新增页面 = 在 `App.jsx` 的 `Pages()` 里加一条 `else if`，并在顶部 `lazy()` 导入。没有别的注册步骤。

### 4.2 数据是双层：localStorage 为底，Supabase 覆盖

`src/store/gameStore.ts`：

- 本地键 `wenmai_data`，`MAX_STORAGE_BYTES` = 4MB；超限会裁掉旧 creations（`creations.slice(-10)`），`MAX_CREATIONS` = 20
- 登录瞬间 `CloudSync`（App.jsx）先 `resetLocalData()` 再 `syncFromCloud()`——**顺序不能反**，否则上一个账号的 library/points 会泄漏进新会话
- 每次 `setData` 触发 1s debounce 的 `pushToCloud`；`syncUserId` 是模块级变量，由 `App.tsx` 经 `setSyncUser` 注入
- 云端优先：`syncFromCloud` 用 `row.points ?? prev.points` 逐字段覆盖
- **新用户必须在 `profiles` 落一行完整数据**（`lib/auth.js` 的 `signUpWithEmail`）。表默认值 points=0、free_pulls=0，而云是真相源，漏了这步新用户会直接抽不了卡

新增持久化字段 = 改 `GameData` 接口 + `DEFAULT_DATA` + `pushToCloud` + `syncFromCloud` 四处，并同步 `deploy/seed/00-profiles.sql`。

### 4.3 色值只有一个真相源

所有颜色定义在 `src/index.css` 的 `@theme` 块。组件里用 `var(--color-gold-main)` 或 Tailwind 令牌类。

**不要在组件里写 hex**。已有语义化双橙：`--color-accent-persistent`（常驻铜橙，卡片内按钮）/ `--color-accent-transient`（瞬时亮橙，FAB 与强调 CTA）——按语义选，别按深浅选。

### 4.4 CDN 与绝对路径

`HomeHero3D.jsx:12` 有一处 hostname 判断：线上 `wenmai.ruoziqing.cn` 时 GLB 走 `https://wmstatic.ruoziqing.cn`（源站出口只有 3Mbps），本地与 HAP 走同源。

VLM 反代同理硬编码绝对 URL（`src/utils/vlmMatch.ts`）：

```
https://wenmai-api.ruoziqing.cn/vlm/chat/completions
```

**不能用相对路径**——鸿蒙虚拟 origin 下相对路径会被拦截器吃掉，线上同域又没有 `/vlm/`（SPA fallback 会返回 HTML）。`vite.config.js` 里的 `server.proxy` 只是 dev 备用通道。

### 4.5 素材管线在 Python 侧

`scripts/` 与 `wenmai-harmony/*.py` 是素材处理管线（去黑底/合成宣纸底/多尺寸/WebP/GLB 压缩）。图片素材的问题**不要在渲染层糊弄**——历史上出现过金线黑底"装饰风"不好看，正解是重生成浅底素材，不是调 shader 硬凑。

---

## 5. 红线

| 禁止 | 原因 |
|---|---|
| 把 `is_admin` 加进 `select *` 或任何前端可写路径 | WM-01 Critical 提权漏洞。修复在 `deploy/fix/04-admin-column-lock.sql`（整表 REVOKE UPDATE + 按列 GRANT 回白名单）；判定只走 `SECURITY DEFINER` 函数 |
| 在前端 bundle 里放任何 API key | VLM key 由服务器 nginx 反代注入，bundle 零 key。`.env.example` 里遗留的 `VITE_STEPFUN_API_KEY` 是历史残留，**别再启用** |
| 放宽 `vite.config.js` 的 `/__write` 中间件白名单 | 仅 dev、仅允许写 `public/elements/`。这是 CuratePage 的写盘口子，放宽即任意文件写 |
| 提交 `.env.local` | 含 Supabase URL/ANON_KEY，已 gitignore |
| 编造纹样朝代/寓意/出处 | 文化准确性是产品底线，百科文案以 `patternDescriptions.ts` 与实物资料为准 |
| 把设计改成杂志式编辑排版 | 已经试过并被否。获准的方向是「仪式感 + 叙事」（钤印、竖排、年代全角、揭幕式加载） |
| 换路由库 / 引入状态管理库 / 引入 UI 组件库 | 见 §4.1、§2 |

---

## 6. 已知欠账（别当成 bug 去修，除非用户点名）

- `.env.example` 的 `VITE_STEPFUN_API_KEY` 与实际实现脱钩（见红线表）
- `README.md` 内容过时，功能清单停留在 6 月
- `public/models/` 为空目录，3D 产品模型走 CDN 或 HAP 包内 `relic_pack`
- 分支 `wenmai-v3` 挂在 worktree `wenmai/.claude/worktrees/wenmai-v3`（自托管迁移线，含文物 overlay 性能优化）。`vite.config.js` 的 `test.exclude` 特意排除 `.claude/` 是为了不让 worktree 里的旧测试副本被扫到——**改这个 exclude 要小心**
- `npm run test` 目前只有一个测试文件，覆盖率极低；不要假装有测试保护的改动
- 记忆里提到的安全审计「WM-02 三 key 待吊销」属运维动作，不在本仓

---

## 7. 鸿蒙 HAP 包装层（`../wenmai-harmony`）

**那不是工程本体，是素材与脚本目录。** DevEco 工程必须建在 `D:\wenmai-harmony`——所有脚本把路径硬编码了，且**路径不能含中文**。

打包流程：

```bash
cd wenmai && npm run build
python ../wenmai-harmony/prepare_harmony_assets.py   # dist → dist_harmony（剔 patterns/ai 316M + 调试页）
python ../wenmai-harmony/build_relic_pack.py         # 4 件代表作压进包，其余走云端 URL
python ../wenmai-harmony/inject_wenmai.py            # 注入 DevEco 工程
# DevEco Studio: Sync → Run 'entry' → 签名打 HAP
```

`inject_wenmai.py` 做四件事：`dist_harmony` 铺平进 `rawfile/`（**不是 `rawfile/web/`**，绝对路径 `/assets/...` 才能对上）、覆盖 `template/Index.ets`、`module.json5` 加 INTERNET + CAMERA、`string.json` 加权限文案。

`template/Index.ets` 的核心坑（**改动前必读**）：`resource://` 协议 origin 为 null，Chromium 在发出前就会按 scheme 白名单拒掉 CORS 请求，`onInterceptRequest` 救不了。正解是主文档用虚拟 `http://localhost/` origin，拦截器全量喂 rawfile。

---

## 8. 改完怎么验

1. `npm run lint` 与 `npm run test`
2. `npm run dev`，浏览器里真走一遍受影响路径（这条最容易被跳过——UI 改动必须在浏览器里看过，类型检查和测试只证明代码能跑，不证明功能对）
3. 涉及数据层的改动，**登出状态与登录状态各测一遍**（§4.2 的双层结构最容易只测一半）
4. 涉及鸿蒙的改动，必须重跑 §7 全流程再打 HAP
