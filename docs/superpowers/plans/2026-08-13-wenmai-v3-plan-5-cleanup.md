# 纹脉 v3 Plan 5 Implementation Plan — Plan 4 收尾优化

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清掉 Plan 4 留下的 5 项尾巴——bundle 拆分 / TS strict 清零 / GoldBackground 移除 / R3F v9 类型清理 / Lighthouse + 18 路由 UI 回归。

**Architecture:** 9 个独立 task，按依赖顺序：先 vite.config 拆 chunk，再分文件清 TS 错误，再 GoldBackground/R3F 清理，最后用户跑 Lighthouse + UI 回归后写 final commit。验收靠"显著改善"数字（index ≤ 180 kB / TS ≤ 20 / Lighthouse Perf ≥ 60）。

**Tech Stack:** Vite 8 + rolldown-vite (manualChunks) / TypeScript 6.0.3 strict (`noUnusedLocals` / `noUnusedParameters` / `ignoreDeprecations:"6.0"`) / @react-three/fiber v9 / Vitest / Lighthouse Mobile

**Spec:** `docs/superpowers/specs/2026-08-13-wenmai-v3-plan-5-cleanup-design.md`（commit `19e6fab`）

**Predecessor:** Plan 4 final commit `ecd90e2`——T1-T19 全部完成，13 .js/.jsx 文件已迁完，但 5 项尾巴未做。

---

## File Map

每个 task 的文件责任：

| Task | 文件 | 责任 |
|---|---|---|
| T1 | `vite.config.js` | 加 manualChunks（supabase + motion + lottie 单独 chunk） |
| T2 | `src/utils/shareCard.ts` | 加 null check + 函数参数类型，清 ~70 处错误 |
| T3 | `src/gesture-cards/{GestureCardView.tsx,HandSwipeDetector.ts}` | canvas null check + swipeDirections 字段 |
| T4 | `src/engine/{proceduralPatterns.ts,puzzleSnap.ts}` | 函数签名 union + 修 SNAP_STRENGTH typo |
| T5 | `src/store/{gameStore.ts,patternData.ts}` | null 兜底 + ProceduralPatternType cast |
| T6 | `src/utils/shareOrDownload.ts` | 函数参数显式类型 |
| T7 | `src/app/App.tsx` | 删 GoldBackground lazy import + Suspense 块 |
| T8 | `src/**//*.tsx`（grep 确定） | R3F `<line>` 等 → `<threeLine>` 等前缀替换 |
| T9 | `docs/superpowers/plans/.../2026-08-13-wenmai-v3-plan-5-cleanup.md`（本文） | Lighthouse + UI 回归 checklist 填数字 + final commit |

**Out of scope**（明确 deferred 到 Plan 6/7）：
- zustand 5 store 拆分（Plan 6）
- AppState Context 干掉（Plan 6）
- features/ 完整化（Plan 7）
- `GoldBackground.tsx` 文件本身的彻底删除（Plan 6+ 决定）

---

## 全局基线（执行前快照，2026-08-13）

| 指标 | 当前值 | 目标 |
|---|---|---|
| `find src -name "*.jsx" -o -name "*.js"` | 0 | 维持 0 |
| `npx vitest run` | 126/126 pass | 维持 126/126 |
| `npm run build` | 成功，index chunk 278 kB gzip | index ≤ 180 kB gzip |
| `npx tsc --noEmit --ignoreDeprecations 6.0` 错误数 | 83 | ≤ 20 |
| 路由 chunk gzip | 全部 ≤ 200 kB | 维持 |

执行中任何 task 后必须保持：tests 126/126、find .js = 0、build 成功。

---

## Task 1: vite.config 拆 supabase + motion + lottie chunk

**Files:**
- Modify: `vite.config.js:43-49`（`defineConfig` 对象）

**Why:** index chunk 278 kB gzip 包含所有未拆出的依赖。`manualChunks` 把 3 个大依赖拆成独立 chunk，零业务代码改动，浏览器仍 parallel 加载（不延迟），改善 parse/execute + cache 命中率。

- [ ] **Step 1: 读当前 vite.config.js 确认无既有 build 配置**

```bash
cat vite.config.js
```

预期：`defineConfig({ plugins: [...] })`，无 `build` 字段。

- [ ] **Step 2: 在 `defineConfig` 加 `build.rollupOptions.output.manualChunks`**

把 `defineConfig({` 块改成：

```js
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    writeFilePlugin(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          motion: ['framer-motion'],
          lottie: ['lottie-web'],
        },
      },
    },
  },
})
```

- [ ] **Step 3: 跑 build 验证 chunk 拆出**

```bash
npm run build
```

预期输出包含：
- `dist/assets/supabase-*.js`（新 chunk，gzip ~50-70 kB）
- `dist/assets/motion-*.js`（新 chunk，gzip ~25-40 kB）
- `dist/assets/lottie-*.js`（新 chunk，gzip ~20-40 kB）
- `dist/assets/index-*.js` gzip 显著下降（目标 ≤ 180 kB）

- [ ] **Step 4: 验证测试不退步**

```bash
npx vitest run
```

预期：126/126 pass（vite config 不影响测试）。

- [ ] **Step 5: Commit**

```bash
git add vite.config.js
git commit -m "$(cat <<'EOF'
perf(plan-5/t1): split supabase + motion + lottie into separate chunks

vite.config.js build.rollupOptions.output.manualChunks:
- supabase: ~50-70 kB gzip (was in index)
- motion: ~25-40 kB gzip (was in index)
- lottie: ~20-40 kB gzip (was in index)

Index chunk: 278 kB → <TBD> kB gzip (target ≤ 180).
Zero business code changes; chunks load in parallel so no latency hit.
Cache efficiency improves when dependency versions unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

把 commit message 里的 `<TBD>` 替换成实测的 index gzip 数字。

---

## Task 2: shareCard.ts 全量修复（~70 错误，单文件最大头）

**Files:**
- Modify: `src/utils/shareCard.ts:9`（函数签名）
- Modify: `src/utils/shareCard.ts:15`（ctx null check）
- Modify: `src/utils/shareCard.ts:46`（loadImage 返回类型）
- Modify: `src/utils/shareCard.ts:133`（loadImage 函数签名）
- Modify: `src/utils/shareCard.ts:143`（roundRect 函数签名）

**Why:** shareCard.ts 单文件贡献 83 个 TS 错误中的 ~70 个。根因：`(pattern, seriesInfo)` 无类型、`canvas.getContext('2d')` 返回 `CanvasRenderingContext2D | null` 后未 null check、`loadImage` 返回 `Promise<unknown>`、`roundRect` 参数全 any。

**修复原则（写进每个 T2-T6 implementer prompt）：**
- 行为不变优先：null check 用 `return`（generateShareCard 返回 `Promise<Blob | null>`），不抛错
- 允许 `as unknown as X` 双 cast
- 禁止 `as any` / 禁止 disable strict / 禁止 `// @ts-ignore`
- dead code 不删

- [ ] **Step 1: 读 shareCard.ts 全文（156 行）**

```bash
cat src/utils/shareCard.ts
```

确认结构：`generateShareCard`（line 9-131）、`loadImage`（line 133-141）、`roundRect`（line 143-155）。

- [ ] **Step 2: 加 pattern/seriesInfo 类型 + ctx null check**

把 line 9-15 改成：

```ts
interface ShareCardPattern {
  rarity: 'ssr' | 'rare' | 'common' | string
  name: string
  series: string
  type: string
  tags?: string[]
}

interface ShareCardSeriesInfo {
  name?: string
}

export async function generateShareCard(
  pattern: ShareCardPattern,
  seriesInfo?: ShareCardSeriesInfo
): Promise<Blob | null> {
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
```

`if (!ctx) return null` 一行解决全部 ~50 处 TS18047（ctx possibly null）错误。

- [ ] **Step 3: 修 loadImage 返回类型（解决 img unknown）**

把 line 133-141 改成：

```ts
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
```

显式 `Promise<HTMLImageElement>` 返回类型解决 line 46-50 的 `img is of type 'unknown'` 错误。

- [ ] **Step 4: 修 roundRect 参数类型**

把 line 143 改成：

```ts
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
```

- [ ] **Step 5: 修 rarityColors / rarityLabels 索引类型（解决 TS7053）**

把 line 83-85 改成：

```ts
  const rarityColors: Record<string, string> = { ssr: '#F2D58A', rare: '#D4AF6A', common: '#8A8A8A' }
  const rarityLabels: Record<string, string> = { ssr: '传说', rare: '稀有', common: '普通' }
  const rarityText = rarityLabels[pattern.rarity] || '普通'
```

`Record<string, string>` 让任意字符串索引合法。

- [ ] **Step 6: 跑 tsc 验证 shareCard.ts 错误降到 0**

```bash
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "shareCard.ts" | wc -l
```

预期：0（原 ~70）。

```bash
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "error TS" | wc -l
```

预期：总错误从 83 降到 ~13（剩其他 7 个文件的错误）。

- [ ] **Step 7: 跑测试确认无运行时回归**

```bash
npx vitest run
```

预期：126/126 pass。

- [ ] **Step 8: Commit**

```bash
git add src/utils/shareCard.ts
git commit -m "$(cat <<'EOF'
fix(plan-5/t2): type shareCard.ts — null check + typed helpers (~70 errors)

- Add ShareCardPattern/ShareCardSeriesInfo interfaces
- ctx null check at function top (return null): resolves ~50 TS18047
- loadImage: Promise<HTMLImageElement> return type
- roundRect: explicit ctx/x/y/w/h/r parameter types
- rarityColors/rarityLabels: Record<string, string> index types

shareCard.ts errors: ~70 → 0. Total: 83 → ~13.
Runtime behavior unchanged: null ctx now returns null (was silently
throwing on null.createLinearGradient, now exits early).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: gesture-cards/* 修复（5 错误，2 文件）

**Files:**
- Modify: `src/gesture-cards/GestureCardView.tsx:197-198`（canvas null check）
- Modify: `src/gesture-cards/HandSwipeDetector.ts:190,226,245`（swipeDirections 字段声明）

**Why:** 同 Class 1 null check + Class 2 缺字段声明。

- [ ] **Step 1: 读两个文件确认上下文**

```bash
cat src/gesture-cards/GestureCardView.tsx
cat src/gesture-cards/HandSwipeDetector.ts
```

- [ ] **Step 2: GestureCardView.tsx 加 canvas null check**

定位 line 197-198 附近（`canvas.something`）。在 canvas 取得后、第一次使用前加：

```tsx
if (!canvas) return
```

具体位置：读文件后定位 `const canvas = ...` 行的下一行。如果是 `useRef` 取值，则改成：

```tsx
const canvas = canvasRef.current
if (!canvas) return
```

- [ ] **Step 3: HandSwipeDetector.ts 加 swipeDirections 字段声明**

读 line 190 / 226 / 245 附近的 `this.swipeDirections` 用法。判断是 getter 还是属性。在 class 顶部字段区加：

```ts
private swipeDirections: SwipeDirection[] = []
```

如果 `SwipeDirection` 类型未定义，看上下文是 `'left' | 'right' | 'up' | 'down'` 或类似 union，定义成：

```ts
type SwipeDirection = 'left' | 'right' | 'up' | 'down'

class HandSwipeDetector {
  private swipeDirections: SwipeDirection[] = []
  // ...
}
```

如果该字段实际从未被赋值（只读），改为 getter：

```ts
private get swipeDirections(): SwipeDirection[] {
  // ...
}
```

读代码逻辑决定哪种修法。

- [ ] **Step 4: tsc 验证**

```bash
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "gesture-cards" | wc -l
```

预期：0（原 5）。

```bash
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "error TS" | wc -l
```

预期：~8（gesture-cards 5 + 其他文件 ~3）。

- [ ] **Step 5: 跑测试**

```bash
npx vitest run
```

预期：126/126。

- [ ] **Step 6: Commit**

```bash
git add src/gesture-cards/GestureCardView.tsx src/gesture-cards/HandSwipeDetector.ts
git commit -m "$(cat <<'EOF'
fix(plan-5/t3): type gesture-cards — canvas null check + swipeDirections field

GestureCardView.tsx: canvas null check before .getContext / .drawImage
HandSwipeDetector.ts: declare private swipeDirections field (was used but undeclared)

gesture-cards errors: 5 → 0.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: engine/* 修复（6 错误，2 文件）

**Files:**
- Modify: `src/engine/proceduralPatterns.ts:315,320,325,330,335`（5 处函数签名 mismatch）
- Modify: `src/engine/puzzleSnap.ts:1`（SNAP_STRENGTH_VAL typo）

**Why:** proceduralPatterns 5 个生成器函数签名 `(size?, unit?, turns?) => SVGSVGElement` 不匹配目标 `Record<string, number> => SVGSVGElement`。puzzleSnap 导入了不存在的 `SNAP_STRENGTH_VAL`（应该是 `SNAP_STRENGTH`）。

- [ ] **Step 1: 读 proceduralPatterns.ts 找目标类型定义**

```bash
grep -n "Record<string, number>" src/engine/proceduralPatterns.ts
grep -n "=> SVGSVGElement" src/engine/proceduralPatterns.ts
```

定位目标类型（可能是 `type GeneratorFn = (params: Record<string, number>) => SVGSVGElement`）。

- [ ] **Step 2: 读 puzzleSnap.ts 确认 SNAP_STRENGTH 存在**

```bash
grep -n "SNAP_STRENGTH" src/constants.ts src/engine/puzzleSnap.ts
```

预期：`src/constants.ts` 导出 `SNAP_STRENGTH`（无 `_VAL` 后缀）。`puzzleSnap.ts:1` 错误导入 `SNAP_STRENGTH_VAL`。

- [ ] **Step 3: 修 puzzleSnap.ts 导入 typo**

把 `src/engine/puzzleSnap.ts:1` 改成正确的导入名：

```ts
import { SNAP_STRENGTH } from '../constants'
```

后续使用 `SNAP_STRENGTH_VAL` 的位置全替换为 `SNAP_STRENGTH`：

```bash
grep -n "SNAP_STRENGTH_VAL" src/engine/puzzleSnap.ts
```

逐行替换。

- [ ] **Step 4: 修 proceduralPatterns.ts 目标类型（用 union 兼容多签名）**

读 line 315 / 320 / 325 / 330 / 335 附近的 5 个生成器函数，看每个的参数。预期形如：

```ts
{ size?: number, unit?: number, turns?: number }  // generator A
{ size?: number, unit?: number }                  // generator B
{ size?: number, density?: number }               // generator C
{ size?: number, turns?: number }                 // generator D
{ size?: number, strands?: number }               // generator E
```

把目标类型（通常是某个 map 的 value 类型）改成 union：

```ts
type GeneratorParams = { size?: number } & Record<string, number | undefined>
type GeneratorFn = (params: GeneratorParams) => SVGSVGElement
```

或者用 overloads。如果 union 不可行，最后的兜底是 cast：

```ts
const generators: Record<string, GeneratorFn> = {
  cloud: cloudGenerator as unknown as GeneratorFn,
  // ...
}
```

但优先 union（更干净）。

- [ ] **Step 5: tsc 验证**

```bash
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "engine/" | wc -l
```

预期：0（原 6）。

- [ ] **Step 6: 跑测试**

```bash
npx vitest run
```

预期：126/126。

- [ ] **Step 7: Commit**

```bash
git add src/engine/proceduralPatterns.ts src/engine/puzzleSnap.ts
git commit -m "$(cat <<'EOF'
fix(plan-5/t4): type engine — union generator signature + fix SNAP_STRENGTH typo

proceduralPatterns.ts: GeneratorParams union accepts {size?,unit?,turns?,...}
  (was: strict Record<string, number> rejected optional typed params)
puzzleSnap.ts: SNAP_STRENGTH_VAL → SNAP_STRENGTH (import typo since commit 43b3adc)

engine errors: 6 → 0.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: store/* 修复（2 错误，2 文件）

**Files:**
- Modify: `src/store/gameStore.ts:158`（string | null → string）
- Modify: `src/store/patternData.ts:209`（string → ProceduralPatternType）

**Why:** gameStore 传 `string | null` 给要求 `string` 的函数。patternData 传任意 `string` 给 `ProceduralPatternType` 枚举。

- [ ] **Step 1: 读 gameStore.ts:158 上下文**

```bash
sed -n '150,165p' src/store/gameStore.ts
```

定位 line 158 的具体调用。判断 null 应该兜底成什么默认值（空字符串？某个特殊 marker？）。

- [ ] **Step 2: 修 gameStore.ts null 兜底**

把 line 158 改成（假设默认空字符串）：

```ts
someFunction(arg ?? '')
```

或类型守卫：

```ts
if (arg === null) return
someFunction(arg)
```

读上下文决定哪种。优先 `?? ''`（最小改动）。

- [ ] **Step 3: 读 patternData.ts:209 + ProceduralPatternType 定义**

```bash
sed -n '200,215p' src/store/patternData.ts
grep -n "ProceduralPatternType" src/store/patternData.ts src/types/*.ts
```

定位 line 209 的字符串来源（是用户输入？硬编码？数据驱动？）和 `ProceduralPatternType` 的合法值集合。

- [ ] **Step 4: 修 patternData.ts 类型**

如果 string 来自可信源（硬编码枚举值），cast：

```ts
const t = typeString as unknown as ProceduralPatternType
```

如果 string 可能不合法，加守卫：

```ts
const VALID_TYPES: ProceduralPatternType[] = ['cloud', 'wave', '...']
function isProceduralPatternType(s: string): s is ProceduralPatternType {
  return VALID_TYPES.includes(s as ProceduralPatternType)
}

if (!isProceduralPatternType(typeString)) return null
// 后续 typeString 已收窄为 ProceduralPatternType
```

读代码决定哪种。优先 cast（如果 string 真的是合法值）。

- [ ] **Step 5: tsc 验证**

```bash
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "store/" | wc -l
```

预期：0（原 2）。

- [ ] **Step 6: 跑测试**

```bash
npx vitest run
```

预期：126/126。

- [ ] **Step 7: Commit**

```bash
git add src/store/gameStore.ts src/store/patternData.ts
git commit -m "$(cat <<'EOF'
fix(plan-5/t5): type store — null fallback + ProceduralPatternType guard

gameStore.ts:158: arg ?? '' fallback (string | null → string)
patternData.ts:209: cast/guard string to ProceduralPatternType

store errors: 2 → 0. All TS errors now: 83 → 0 (T2-T5 combined).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: utils/shareOrDownload.ts 修复（2 错误）

**Files:**
- Modify: `src/utils/shareOrDownload.ts:4`（blob 参数类型）
- Modify: `src/utils/shareOrDownload.ts:12`（e 参数类型）

**Why:** 同 Class 3 implicit any。

- [ ] **Step 1: 读文件**

```bash
cat src/utils/shareOrDownload.ts
```

确认 line 4 和 12 的函数签名。

- [ ] **Step 2: 加参数类型**

预期 line 4 形如 `async function shareOrDownload(blob) {`，改成：

```ts
async function shareOrDownload(blob: Blob) {
```

预期 line 12 形如 `.catch(e => ...)` 或 `catch (e) {`，改成：

```ts
.catch((e: unknown) => { ... })
// 或
} catch (e: unknown) { ... }
```

- [ ] **Step 3: tsc 验证总错误**

```bash
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "error TS" | wc -l
```

预期：0（Plan 4 启动时 85，T2-T6 后清零）。

如果还有 > 0 错误，列出来评估：
- 如果是新出现的（之前 tsc 没跑到），按 Class 1-3 模式修
- 如果是 ≤ 5 处难修的，加 `// @ts-expect-error <reason>`（spec §3 允许 ≤ 5 处）

- [ ] **Step 4: 跑测试**

```bash
npx vitest run
```

预期：126/126。

- [ ] **Step 5: Commit**

```bash
git add src/utils/shareOrDownload.ts
git commit -m "$(cat <<'EOF'
fix(plan-5/t6): type utils/shareOrDownload — explicit Blob + unknown err

shareOrDownload.ts:4: blob: Blob (was implicit any)
shareOrDownload.ts:12: (e: unknown) (was implicit any, OK since only logged)

TS strict total: 83 → 0 (or ≤ 5 with documented @ts-expect-error for hard cases).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: GoldBackground 从 App.tsx 移除

**Files:**
- Modify: `src/app/App.tsx:11`（删 lazy import）
- Modify: `src/app/App.tsx:44-46`（删 Suspense 块）

**Why:** spec §3.6 明确写"GoldBackground 待 Plan 5 弃用"。`SeriesSkinLayer`（line 47）已包裹所有路由接管背景，GoldBackground 是冗余的全局背景层。

**保留** `src/components/common/GoldBackground.tsx` 文件本身——Plan 6+ 决定是否彻底删（避免 Plan 5 破坏性改动）。

- [ ] **Step 1: 读 App.tsx 确认行号**

```bash
cat src/app/App.tsx
```

确认 `GoldBackground` 在第 11 行（lazy import）和第 44-46 行（Suspense 块）。

- [ ] **Step 2: 删 lazy import（第 11 行）**

删除：

```tsx
const GoldBackground = lazy(() => import('../components/common/GoldBackground'))
```

如果 `lazy` import 删除后导致 `lazy` 不再被使用，同时清理 `lazy` 的 import：

```tsx
import { lazy, Suspense } from 'react'
```

改成：

```tsx
import { Suspense } from 'react'
```

或如果 `Suspense` 也不再使用（看是否有其他 Suspense 块），改成：

```tsx
// 无 import
```

读代码确认。如果有其他 Suspense 块就保留 Suspense import。

- [ ] **Step 3: 删 Suspense 块（第 44-46 行）**

定位并删除：

```tsx
      <Suspense fallback={null}>
        <GoldBackground />
      </Suspense>
```

确认删完后 JSX 仍然闭合合法。

- [ ] **Step 4: 跑 dev 服务器验证视觉**

```bash
npm run dev
```

打开浏览器依次访问：
- `/`（Splash）
- `/home`
- `/pattern/qh-1`（pattern 详情，应显示 qinghua 系列背景）
- `/create`

每个路由确认：
- 没有金色背景渲染（之前 GoldBackground 的金线/金色渐变）
- SeriesSkinLayer 的 neutral 背景正常显示（跨系列页面）
- 系列专属背景正常显示（pattern 详情页）

如果有路由显示空白或异常，说明 SeriesSkinLayer 没真覆盖——回滚此 commit 并记 Plan 6+ follow-up。

- [ ] **Step 5: 跑 build + 测试**

```bash
npm run build
npx vitest run
```

预期：build 成功（index chunk 可能再降几 kB 因为 GoldBackground lazy chunk 消失）；测试 126/126。

- [ ] **Step 6: Commit**

```bash
git add src/app/App.tsx
git commit -m "$(cat <<'EOF'
refactor(plan-5/t7): drop GoldBackground from App.tsx

spec §3.6: GoldBackground 待 Plan 5 弃用. SeriesSkinLayer (line 47)
already wraps all routes and provides neutral background for cross-series
pages + per-series backgrounds for pattern detail.

Removed:
- line 11: lazy(() => import('../components/common/GoldBackground'))
- line 44-46: <Suspense fallback={null}><GoldBackground /></Suspense>

Kept: src/components/common/GoldBackground.tsx file itself (Plan 6+
decides whether to fully delete).

Verified visually: /, /home, /pattern/qh-1, /create all render correctly
with SeriesSkinLayer backgrounds only.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: R3F v9 intrinsic 元素全量清理

**Files:**
- Modify: `src/**//*.tsx`（grep 确定，预期仅 0-3 处真 R3F 用法）

**Why:** @react-three/fiber@9.6.1 重命名 4 个 SVG 冲突 intrinsic（`<line>` / `<path>` / `<audio>` / `<source>`）为 three 前缀（`<threeLine>` 等）。运行时自动 strip 前缀行为一致，但 TS 类型只识别新名字。Plan 4 T19 只修了 `ShatterScene.tsx` 3 处。

**关键判断：** 大量 `<line>` / `<path>` 是合法 SVG（在 `<svg>` 元素内），不是 R3F。**不能**无脑全替换。只在 `<Canvas>` (from @react-three/fiber) 内的才是 R3F 用法。

- [ ] **Step 1: 全量 grep，带上下文**

```bash
grep -rn -B 3 '<line\b\|<path\b\|<audio\b\|<source\b' src/ --include='*.tsx' > /tmp/r3f-grep.txt
cat /tmp/r3f-grep.txt
```

- [ ] **Step 2: 逐个判断是否 R3F**

对每条 grep 结果，看 `-B 3` 上下文：
- 如果上下文里能看到 `<svg` 或父组件是 SVG 图标组件（如 `BottomNav.tsx`, `GoldDecorations.tsx`, `OrnateFrame.tsx`, `AuthPage.tsx`, design-system `*Decoration.tsx`）→ **SVG，保留**
- 如果上下文里能看到 `<Canvas` 或文件是 R3F 组件（如 `ShatterScene.tsx`, `Relief.tsx`, `FragmentMesh.tsx`, `GossamerThread.tsx`）→ **R3F，替换**

预期 R3F 用法：ShatterScene 已在 T19 修过；其他基本是 SVG。

- [ ] **Step 3: 替换 R3F 用法**

对每处确认是 R3F 的：
- `<line>` → `<threeLine>`
- `<path>` → `<threePath>`
- `<audio>` → `<threeAudio>`
- `<source>` → `<threeSource>`

对应的闭合标签也要改：`</line>` → `</threeLine>` 等。

- [ ] **Step 4: tsc 验证**

```bash
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep -i "intrinsic\|JSX.IntrinsicElements\|threeLine\|threePath"
```

预期：0 行（无 intrinsic 元素错误）。

如果 Step 2 判断结果是 "0 处 R3F 残留"（全是 SVG），跳过此 task 的 commit，直接在 final commit 里记"T8: 全量 grep 确认 R3F 残留 0 处，Plan 4 T19 已清完"。

- [ ] **Step 5: 跑 dev 验证 shatter/relief 渲染**

```bash
npm run dev
```

浏览器访问 `/create?mode=preview&sub=shatter` 和 `/create?mode=preview&sub=relief`，确认 3D 场景渲染正常（如果有 Step 3 改动）。

- [ ] **Step 6: 跑 build + 测试**

```bash
npm run build
npx vitest run
```

预期：build 成功，测试 126/126。

- [ ] **Step 7: Commit（如果有改动）**

```bash
git add <changed-files>
git commit -m "$(cat <<'EOF'
fix(plan-5/t8): replace R3F v9 intrinsic elements with three* prefix

@react-three/fiber@9.6.1 renamed SVG-colliding intrinsics:
<line> → <threeLine>
<path> → <threePath>
<audio> → <threeAudio>
<source> → <threeSource>

Runtime strips prefix automatically (no behavior change), but TS types
only recognize the prefixed names. Plan 4 T19 fixed ShatterScene.tsx
(3 occurrences); this task catches the remaining <N> occurrences in:
- <file:line>
- <file:line>

SVG <path>/<line> (BottomNav, AuthPage, decorations) intentionally left alone.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

把 `<N>` 和 `<file:line>` 替换成实测数字。

---

## Task 9: Final regression — Lighthouse + 18 路由 UI 回归 + 完成报告

**Files:**
- Modify: `C:\Users\lenovo\.claude\projects\D--desktop\memory\project_wenmai-v3-plan4.md`（更新进度：Plan 5 完成）
- Create: empty commit with full numbers + Plan 6/7 deferred 项清单

**Why:** spec §11 完成判定要求——bundle 数字 + Lighthouse + UI 表全过 + Plan 6/7 deferred 清单写入 final commit。

- [ ] **Step 1: 准备 Lighthouse 记录表**

创建临时文件 `docs/superpowers/_plan5-lighthouse-results.md`（不入 commit）：

```markdown
# Plan 5 Lighthouse Mobile Results

| 路由 | Performance | Accessibility | Best Practices |
|---|---|---|---|
| `/` | TBD | TBD | TBD |
| `/home` | TBD | TBD | TBD |
| `/library` | TBD | TBD | TBD |
| `/create` | TBD | TBD | TBD |
```

- [ ] **Step 2: 用户跑 Lighthouse**

提示用户：

```bash
npm run preview
# 打开 Chrome DevTools → Lighthouse → Mobile → Performance
# 依次访问 http://localhost:4173/, /home, /library, /create
# 把 Performance / Accessibility / Best Practices 三列数字填到上面表格
```

等待用户反馈数字。验收门槛（spec §6）：
- Performance ≥ 60（4 个里至少 3 个达到）
- Accessibility ≥ 80
- Best Practices ≥ 90

- [ ] **Step 3: 准备 18 路由 UI 回归 checklist**

创建临时文件 `docs/superpowers/_plan5-ui-regression.md`（不入 commit）：

```markdown
# Plan 5 UI Regression Checklist

| # | 路由 | 验证点 | 结果 |
|---|---|---|---|
| 1 | `/` | Splash 动画、点击进入 | ☐ |
| 2 | `/auth` | 登录/注册、提交后跳 `/home` | ☐ |
| 3 | `/home` | 4 章节、抽卡 banner、系列入口、最近作品、删除作品 | ☐ |
| 4 | `/library` | 我的/全部 tab、系列筛选、点击卡片进详情 | ☐ |
| 5 | `/pattern/qh-1` | 详情、`SeriesSkin` qinghua 全强度背景 | ☐ |
| 6 | `/create` | FreeMode：拖拽、旋转、缩放、模板、完成、发布 | ☐ |
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
```

- [ ] **Step 4: 用户跑 UI 回归**

```bash
npm run dev
# 按上表 18 行依次访问，每行打 ✓ 或 ✗
# 如有 ✗，记录路由 + 验证点 + 现象描述
```

等待用户反馈。

- [ ] **Step 5: 验证最终硬指标**

```bash
# 1. 0 .js/.jsx 文件
find src -name "*.jsx" -o -name "*.js" | grep -v "vite-env.d.ts\|test-setup.ts"
# 预期：空

# 2. tsc 0 错误
npx tsc --noEmit --ignoreDeprecations 6.0 2>&1 | grep "error TS" | wc -l
# 预期：0 或 ≤ 5（spec §3 允许少量 @ts-expect-error）

# 3. 测试全过
npx vitest run
# 预期：126/126

# 4. build 成功
npm run build
# 预期：index chunk gzip ≤ 180 kB
# 所有路由 chunk gzip ≤ 200 kB
```

把 build 输出的关键数字记下来：
- index chunk gzip: TBD kB
- supabase chunk gzip: TBD kB
- motion chunk gzip: TBD kB
- lottie chunk gzip: TBD kB
- 各路由 chunk gzip: TBD kB

- [ ] **Step 6: 更新 project memory**

修改 `C:\Users\lenovo\.claude\projects\D--desktop\memory\project_wenmai-v3-plan4.md`：

把 Plan 4 的"Plan 5 留下尾巴"5 项标记为 ✅ 完成（T1-T9 + commit SHAs），更新 description 字段为"Plan 5 已完成，Plan 6/7 待启动"。

或者新建 `project_wenmai-v3-plan5.md` memory（如果 plan4.md 已经太长）。

- [ ] **Step 7: 写 Plan 5 final regression commit**

```bash
git commit --allow-empty -m "$(cat <<'EOF'
chore(plan-5): final regression — bundle/lighthouse/UI numbers and completion

== Bundle (gzip, post-T1 manualChunks) ==

Entry chunk:
- index: <TBD> kB (was 278, target ≤180) <PASS/FAIL>

Split chunks (new):
- supabase: <TBD> kB
- motion: <TBD> kB
- lottie: <TBD> kB

All 17 route chunks ≤ 200 kB: ✅

== TypeScript strict ==
npx tsc --noEmit → <TBD> errors (was 83, target ≤20) <PASS/FAIL>
Files cleared: shareCard / gesture-cards/* / engine/* / store/* / shareOrDownload

== Lighthouse Mobile ==
| Route | Perf | A11y | BP |
|---|---|---|---|
| / | <TBD> | <TBD> | <TBD> |
| /home | <TBD> | <TBD> | <TBD> |
| /library | <TBD> | <TBD> | <TBD> |
| /create | <TBD> | <TBD> | <TBD> |

Thresholds: Perf ≥60 (3/4), A11y ≥80, BP ≥90.

== UI regression ==
18 routes: <N>/18 passed. <list any ✗ with reason>

== Migration verification ==
find src -name "*.jsx" -o -name "*.js" → 0 (excluding vite-env.d.ts + test-setup.ts)
npx vitest run → 126/126 pass

== Plan 5 deliverables ==
- T1 ✅ vite.config.js manualChunks (supabase + motion + lottie)
- T2 ✅ shareCard.ts (~70 errors fixed)
- T3 ✅ gesture-cards/* (5 errors fixed)
- T4 ✅ engine/* (6 errors fixed)
- T5 ✅ store/* (2 errors fixed)
- T6 ✅ utils/shareOrDownload.ts (2 errors fixed)
- T7 ✅ GoldBackground dropped from App.tsx
- T8 ✅ R3F v9 intrinsic cleanup (<N> occurrences)
- T9 ✅ this final regression commit

== Deferred to Plan 6/7 ==
- Plan 6: zustand 5 store 拆分 + AppState Context 干掉 + gameStore.ts 合并
- Plan 7: features/ 完整化 (store.ts + utils.ts 入驻每个 feature)
- Follow-up: GoldBackground.tsx 文件彻底删 / supabase dynamic import /
  @ts-expect-error known issues

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

把所有 `<TBD>` / `<N>` / `<PASS/FAIL>` 替换成实测数字。

- [ ] **Step 8: Push commits（如用户要求）**

```bash
git log --oneline ecd90e2..HEAD
# 确认 Plan 5 全部 commit 都在
git push
```

仅在用户明确说"push"时执行（按 system 提示，push 是 visible action 需用户授权）。

---

## Self-Review Checklist

**Spec coverage**（对照 spec §1-§12）：

- [x] §1 验收标准 index ≤ 180 kB：T1 ✅
- [x] §1 验收标准 TS ≤ 20：T2-T6 ✅
- [x] §1 验收标准 Lighthouse：T9 Step 2 ✅
- [x] §1 验收标准 UI 回归：T9 Step 4 ✅
- [x] §2 bundle 拆分：T1 ✅
- [x] §3 TS strict 清零 5 个 Class：T2（Class 1 shareCard）+ T3（Class 1+2 gesture-cards）+ T4（Class 2+3 engine）+ T5（Class 2 store）+ T6（Class 3 shareOrDownload）✅
- [x] §4 GoldBackground 移除：T7 ✅
- [x] §5 R3F v9 清理：T8 ✅
- [x] §6 Lighthouse + UI 回归流程：T9 Step 1-4 ✅
- [x] §7 18 路由表：T9 Step 3 ✅
- [x] §8 任务依赖（T1-T8 互相独立，T9 最后）：plan task 顺序体现 ✅
- [x] §9 deferred 项：T9 final commit message 列出 ✅
- [x] §10 风险与回退：每个 task 都是独立 commit ✅
- [x] §11 完成判定 8 条：T9 Step 5 + Step 7 验证 ✅
- [x] §12 工时估算 ~7-8h：9 task 总工时匹配 ✅

**Placeholder scan：** 0 TBD/TODO/...（final commit message 的 `<TBD>` 是执行时填的实测数字，不是 plan 占位）

**Type consistency：**
- `ShareCardPattern` interface 在 T2 定义，T2 内部使用 ✅
- `SwipeDirection` type 在 T3 定义（如果需要），T3 内部使用 ✅
- `GeneratorParams` / `GeneratorFn` 在 T4 定义，T4 内部使用 ✅
- 所有 task 内部类型不跨 task 共享（避免命名冲突）

**文件路径一致性：**
- 8 个 TS 错误文件路径与 spec §3 一致 ✅
- App.tsx 在 `src/app/App.tsx`（非 `src/App.tsx`）✅
- vite.config 是 `.js` 不是 `.ts`（Plan 4 未迁，Plan 5 也不迁）✅

---

## Execution Handoff

Plan 5 共 9 task，建议 **Subagent-Driven Development** 执行（fresh subagent per task + 两阶段 review：spec compliance → code quality）。

预估工时：
- T1 vite config：~30 分钟（含 build + 验证）
- T2 shareCard.ts：~45 分钟（最复杂的单文件）
- T3 gesture-cards：~30 分钟
- T4 engine：~45 分钟（union 类型设计需要思考）
- T5 store：~30 分钟
- T6 shareOrDownload：~15 分钟
- T7 GoldBackground：~30 分钟（含 dev 验证）
- T8 R3F grep：~30 分钟（grep + 上下文判断）
- T9 final + 用户跑回归：~2-3 小时（用户跑 Lighthouse + UI 表是主要瓶颈）

**总计 ~7-8 小时**（不含用户跑回归等待时间）。可一天内完成。

执行选项：
1. **Subagent-Driven（推荐）** —— 我每个 task 派一个新子代理，两阶段 review
2. **Inline Execution** —— 在当前 session 顺序执行，批量 checkpoint

Model selection per task（按 subagent-driven-development 指导）：
- T1 / T6 / T7：mechanical，cheap model
- T2 / T3 / T5：standard model
- T4：integration judgment，standard model
- T8：grep + 判断，standard model
- T9：coordination，standard model
