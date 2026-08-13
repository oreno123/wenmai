# 纹脉 v3 Plan 5 — Plan 4 收尾优化

**Date:** 2026-08-13
**Status:** Design approved, awaiting spec review
**Predecessor:** Plan 4 (`docs/superpowers/plans/2026-08-12-wenmai-v3-plan-4-page-rebuild.md`, final commit `ecd90e2`)
**Successor:** Plan 6（zustand 5 store 拆分）/ Plan 7（features/ 完整化）

---

## Goal

清掉 Plan 4 留下的 5 项尾巴，让 v3 重构真正落地：bundle 数字达标、TS strict 全量通过、UI 回归覆盖、GoldBackground 弃用、R3F v9 类型清理。

## Architecture

5 个独立 task，互不耦合，按依赖顺序执行：bundle 拆分 → TS strict 清零 → GoldBackground 移除 → R3F 类型清理 → Lighthouse + 18 路由回归。验收靠"显著改善"数字（用户选定 B 验收标准：不卡死达标，但要可见改善）。

## Tech Stack

Vite 8 + rolldown-vite (`build.rollupOptions.output.manualChunks`) / TypeScript 6.0.3 strict (`noUnusedLocals` / `noUnusedParameters` / `ignoreDeprecations:"6.0"`) / @react-three/fiber v9 / Lighthouse Mobile

---

## §1 验收标准

| 指标 | Plan 4 末尾 | Plan 5 目标 | 测量方式 |
|---|---|---|---|
| index chunk gzip | 278 kB | **≤ 180 kB** | `npm run build` |
| TS strict 错误 | 83 | **≤ 20**（实际预期 0-5） | `npx tsc --noEmit --ignoreDeprecations 6.0` |
| 路由 chunk gzip | 全部 ≤ 200 kB | **维持全部 ≤ 200 kB** | `npm run build` |
| `src/` 下 `.jsx`/`.js` 文件 | 0 | **维持 0**（仅 `vite-env.d.ts` + `test-setup.ts` 例外） | `find src -name "*.jsx" -o -name "*.js"` |
| 测试通过 | 126/126 | **维持 126/126** | `npx vitest run` |
| Lighthouse Performance（/, /home, /library, /create） | 未测 | **≥ 60**（至少 3/4 路由达到） | 浏览器 Lighthouse Mobile |
| Lighthouse Accessibility | 未测 | **≥ 80** | 同上 |
| Lighthouse Best Practices | 未测 | **≥ 90** | 同上 |
| 18 路由 UI 回归 | 未测 | **核心验证点过**（少量 ✗ 列入 Plan 6+ follow-up，不阻塞完成） | 人眼跑 |

---

## §2 Task 1: bundle 拆分

### 决策

`vite.config.ts` 加 `manualChunks`，零业务代码改动。**不**走 dynamic import + lazy singleton 路线——`src/app/App.tsx:7-9` 的 `setSyncUser` 桥接 supabase auth 到 zustand gameStore 在 App 顶层执行，每个路由都需要 supabase，按需加载收益小且破坏同步 API。

### 实现

`vite.config.ts` `build` 块新增：

```ts
build: {
  // ...existing options...
  rollupOptions: {
    output: {
      manualChunks: {
        supabase: ['@supabase/supabase-js'],
        motion: ['framer-motion'],
        lottie: ['lottie-web'],
      }
    }
  }
}
```

### 验证

```bash
npm run build
# dist/assets/ 应出现 supabase-*.js / motion-*.js / lottie-*.js 单独 chunk
# index-*.js gzip 应降到 ≤ 180 kB
```

### 风险与回退

- **拆出 chunk 后首屏字节总量不变**：浏览器 parallel 加载。改善的是 parse/execute 时间 + cache 命中率（依赖版本不变时缓存命中）。
- **实测可能仍 > 180 kB**：Fallback 再拆 1-2 个大依赖（候选：`@react-three/drei`、`zustand` 子模块）。

---

## §3 Task 2: TS strict 清零

### 错误分类与修法（共 83 处，8 个文件）

**Class 1: 同函数体 null check 缺失（60+ 处，机械化）**

| 文件 | 错误数 | 修法 |
|---|---|---|
| `src/utils/shareCard.ts` | ~60 | 函数 `generateShareCard` 顶部加 `if (!ctx) return`（1 行解决全部）；函数参数 `(pattern, seriesInfo)` 加显式类型 |
| `src/gesture-cards/GestureCardView.tsx` | 2 | `if (!canvas) return` 加在 `canvas` 使用前 |

**Class 2: 函数签名/属性不匹配（10 处，要思考）**

| 文件 | 错误数 | 修法 |
|---|---|---|
| `src/engine/proceduralPatterns.ts` | 5 | 5 个生成器函数签名 `(size?, unit?, turns?) => SVGSVGElement` 不匹配目标 `Record<string, number> => SVGSVGElement`。改目标类型用 union / overloads，不破坏调用方 |
| `src/gesture-cards/HandSwipeDetector.ts` | 3 | `this.swipeDirections` 用了但未声明。加私有字段 `private swipeDirections: SwipeDirection[] = []` |
| `src/store/gameStore.ts` | 1 | `string \| null` 传入要求 `string` 的参数。加 `?? ''` 兜底 |
| `src/store/patternData.ts` | 1 | `string` 不匹配 `ProceduralPatternType` 枚举。加 cast 或类型守卫 |

**Class 3: typo + 简单类型（10 处，trivial）**

| 文件 | 错误数 | 修法 |
|---|---|---|
| `src/engine/puzzleSnap.ts` | 1 | `SNAP_STRENGTH_VAL` → `SNAP_STRENGTH`（导入 typo） |
| `src/utils/shareOrDownload.ts` | 2 | `(blob)` 和 `(e)` 参数加显式类型 |
| `src/utils/shareCard.ts` | ~8 | 函数参数 `pattern`、`seriesInfo`、`src`、`ctx`、`x/y/w/h/r` 加类型 |

### 修复原则（写进每个 implementer prompt）

1. **行为不变优先**：null check 用 `return`，不抛错（避免改变 shareCard 已有的成功/失败语义）
2. **允许 `as unknown as X` 双 cast**（Plan 4 已用，合规）
3. **允许保留 ≤ 5 处 `// @ts-expect-error` + 注释原因 + Plan 6+ 跟进**
4. **禁止 `as any`、禁止 disable strict、禁止 `// @ts-ignore`**
5. **dead code 不删**，用 `void X` 静默（Plan 4 已用）

### 验证

```bash
npx tsc --noEmit --ignoreDeprecations 6.0
# 错误 ≤ 20（实际预期 0-5）
```

---

## §4 Task 3: GoldBackground 移除

### 当前状态

`src/app/App.tsx`:

- 第 11 行：`const GoldBackground = lazy(() => import('../components/common/GoldBackground'))`
- 第 44-46 行：`<Suspense fallback={null}><GoldBackground /></Suspense>`

`SeriesSkinLayer`（line 47）已包裹所有路由，接管背景渲染（`neutral` 用于跨系列页面，`qinghua` / `shanjing` / `dragon` 等系列有各自背景）。

### 实现

1. 删 `src/app/App.tsx` 第 11 行 `GoldBackground` import
2. 删 `src/app/App.tsx` 第 44-46 行 `<Suspense fallback={null}><GoldBackground /></Suspense>` 整块
3. **保留** `src/components/common/GoldBackground.tsx` 文件本身（Plan 5 不彻底删，避免破坏性改动；Plan 6+ 决定是否删文件）

### 验证

```bash
npm run dev
# 访问 /、/home、/pattern/qh-1、/create 各 1 次
# 确认无金色背景渲染
# SeriesSkinLayer neutral（跨系列）+ 系列专属背景（pattern/*）正确覆盖
```

---

## §5 Task 4: R3F v9 intrinsic 元素清理

### 背景

`@react-three/fiber@9.6.1` 重命名 4 个与 SVG/HTML 冲突的 intrinsic：

- `<line>` → `<threeLine>`
- `<path>` → `<threePath>`
- `<audio>` → `<threeAudio>`
- `<source>` → `<threeSource>`

R3F 运行时自动 strip `three` 前缀，行为一致；但 TS 类型只识别新名字。Plan 4 T19 只修了 `ShatterScene.tsx` 的 3 处 `<line>`。

### 实现

```bash
# 全量搜索
grep -rn '<line\b\|<path\b\|<audio\b\|<source\b' src/ --include='*.tsx'
# 逐个判断：
#   - R3F 内（在 <Canvas> 内或 Three 元素链中）→ 替换为 three 前缀
#   - SVG <path>/HTML <audio> 等 → 保留
```

### 验证

```bash
npx tsc --noEmit --ignoreDeprecations 6.0
# 无 TS2322 / TS2339 关于 R3F intrinsic 元素的错误
# 运行时: npm run dev 跑 /create?mode=preview&sub=shatter 确认 Shatter 渲染正常
```

---

## §6 Task 5: Lighthouse + 18 路由 UI 回归

### 流程

1. **我准备（机械工作）**：
   - Lighthouse 结果记录表（markdown）：4 核心路由 × 3 指标（Performance / Accessibility / Best Practices）
   - UI 回归 checklist：本 spec §7 表（18 行）
2. **你跑（无法 headless）**：
   - `npm run preview` 启动生产构建
   - Chrome DevTools → Lighthouse → Mobile → Performance，依次跑 `/`、`/home`、`/library`、`/create`
   - `npm run dev` + 人眼跑 §7 表 18 行
3. **你反馈**：把 4×3 Lighthouse 数字 + 18 行 ✓/✗ 给我
4. **我写进 final commit**

### 验收

- **Lighthouse Performance ≥ 60**（4 个里至少 3 个达到；Plan 4 未跑过基线，"不退步"无法量化，用绝对值 60 作为门槛）
- **Lighthouse Accessibility ≥ 80**
- **Lighthouse Best Practices ≥ 90**
- **18 路由 UI 验证点全过**——少数 ✗ 不阻塞 Plan 5 完成，但每条 ✗ 必须记入"Plan 6+ follow-up"清单

### 不达标怎么办

- **单个指标差**：分析原因，能 30 分钟内修就修，否则记 Plan 6+
- **多个指标差**：停 Plan 5，重新 brainstorm 性能优化策略（可能要提前做原定 Plan 6 的 zustand 拆分以减小 store 体积）

---

## §7 18 路由 UI 回归 checklist

| # | 路由 | 验证点 | 结果 |
|---|---|---|---|
| 1 | `/` | Splash 动画、点击进入 | ☐ |
| 2 | `/auth` | 登录/注册、提交后跳 `/home` | ☐ |
| 3 | `/home` | 4 章节故事、抽卡 banner、系列入口、最近作品、删除作品 | ☐ |
| 4 | `/library` | 我的/全部 tab、系列筛选、点击卡片进详情 | ☐ |
| 5 | `/pattern/qh-1` | 详情、`SeriesSkin` qinghua 全强度背景 | ☐ |
| 6 | `/create` | FreeMode（PuzzlePage）：拖拽、旋转、缩放、模板、完成、发布 | ☐ |
| 7 | `/create?mode=guided&sub=symmetry` | Composer 4 角对称 | ☐ |
| 8 | `/create?mode=guided&sub=jigsaw` | Jigsaw 拼图 | ☐ |
| 9 | `/create?mode=preview&sub=relief` | Relief 3D 浮雕 | ☐ |
| 10 | `/create?mode=preview&sub=shatter` | Shatter 手势碎裂 | ☐ |
| 11 | `/gacha` | 单抽/十连、概率显示、分享 | ☐ |
| 12 | `/gallery` | 列表加载、点赞、fork 跳转 | ☐ |
| 13 | `/work/<id>` | 作品详情、fork 链、点赞 | ☐ |
| 14 | `/photo-match` | 上传图片、VLM 识别、三段式匹配 | ☐ |
| 15 | `/admin`（管理员账号） | 审核队列、通过、驳回 | ☐ |
| 16 | `/tools/curate` | 元素筛选、保存到项目 | ☐ |
| 17 | `/demo/series/qinghua` | 完整 SeriesSkin | ☐ |
| 18 | `/demo/series/dragon` | 完整 SeriesSkin | ☐ |

旧 URL 301 重定向（`/puzzle` `/editor` `/showcase` `/composer` `/jigsaw` `/qinghua` `/landing` `/curate` `/splash` → 新路径）：抽查 2-3 个即可。

---

## §8 任务依赖与执行顺序

```
T1 (bundle)  ─┐
T2 (TS)      ─┼─→ T5（回归：用 build + tsc 通过后的产物）
T3 (Gold)    ─┤
T4 (R3F)     ─┘
```

- T1-T4 互相独立，可以并行子代理（但 T1 改 `vite.config.ts` 会影响后续 build 输出，建议先做）
- T5 必须最后（用 final 产物跑 Lighthouse + 回归）

**建议执行顺序**：T1 → T2 → T3 → T4 → T5（每个 task fresh implementer + 两阶段 review：spec compliance → code quality）

---

## §9 不在 Plan 5 范围内（明确 deferred）

用户已确认拆 3 个 Plan，以下留给 Plan 6 / 7：

### Plan 6: zustand 5 store 拆分

- `useUserStore` / `useGachaStore` / `useLibraryStore` / `useCreationStore` / `useGalleryStore`
- `AppState.tsx` Context 完全干掉
- `gameStore.ts` 合并到 `useGachaStore` + `useLibraryStore`

### Plan 7: features/ 完整化

- 每个 feature（gallery / gacha / create / home / library / auth / splash / photo-match / tools）带自己的 `store.ts` + `utils.ts`
- 当前的 `src/store/*` 整体搬进对应 feature

### 单点 follow-up（Plan 6+ 决定）

- `GoldBackground.tsx` 文件本身的彻底删除
- supabase 改 dynamic import（如果 Plan 6 拆 userStore 时一并重构）
- `@ts-expect-error` 留下的 known issue 逐个跟进
- `framer-motion` 升级 / 替换为 `motion`（如果 bundle 还要进一步压）

---

## §10 风险与回退

| 风险 | 概率 | 影响 | 回退方案 |
|---|---|---|---|
| `manualChunks` 拆出 chunk 后 build 失败 | 低 | 中 | 移除 `motion` / `lottie` 配置，只保留 `supabase` |
| T2 修复改变 `shareCard` 运行时行为（如 ctx null 时原代码静默失败，新代码 return 后下游异常） | 中 | 中 | revert 该 commit，加 `// @ts-expect-error` 暂时跳过；记 Plan 6+ 重构 shareCard |
| GoldBackground 移除后部分路由视觉变化（如 neutral 没真覆盖） | 中 | 低 | revert T3 commit，重新评估 `SeriesSkinLayer` neutral 是否真覆盖所有跨系列路由 |
| R3F 改完 tsc 过但运行时 svg 渲染异常（误把 SVG `<path>` 改成 `<threePath>`） | 低 | 中 | revert T4 commit；T4 review 必须人眼确认每处替换都是 R3F 上下文 |
| Lighthouse 大幅退步（如 manualChunks 反优化首屏） | 中 | 中 | 分析具体指标；如能 30 分钟内修则修，否则降级验收门槛（如 Performance ≥ 50）或提前做 Plan 6 |

每个 task 都是独立 commit，单 task 回退不影响其他 task。

---

## §11 完成判定

Plan 5 完成需**同时满足**：

1. ✅ T1-T4 全部 commit + 通过两阶段 review
2. ✅ `npx tsc --noEmit --ignoreDeprecations 6.0` 错误 ≤ 20
3. ✅ `npm run build` index chunk ≤ 180 kB gzip
4. ✅ `npm run build` 所有路由 chunk ≤ 200 kB gzip
5. ✅ `npx vitest run` 126/126 测试维持
6. ✅ `find src -name "*.jsx" -o -name "*.js"` 仍为 0（仅 `vite-env.d.ts` + `test-setup.ts` 例外）
7. ✅ Lighthouse 数字 + 18 路由 UI 回归表写入 final commit
8. ✅ final regression commit 包含完整数字 + Plan 6/7 deferred 项清单

---

## §12 工时估算

| Task | 工时 |
|---|---|
| T1 bundle 拆分 | 1h |
| T2 TS strict 清零 | 3h（Class 1: 30min, Class 2: 1.5h, Class 3: 1h） |
| T3 GoldBackground 移除 | 15min |
| T4 R3F 类型清理 | 30min |
| T5 Lighthouse + UI 回归（用户跑） | 2-3h |
| Final regression commit + memory 更新 | 30min |
| **总计** | **~7-8 小时**（不含用户跑回归的等待时间） |

可一天内完成（含两阶段 review 周期）。
