# 纹脉 v3 重构 Plan 2: 视觉系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Plan 1 的 SeriesSkin v1（纯 CSS 变量）升级到 v3（粒子 + 装饰 + 视差 + 滚动 + 文字拆解全接入），让 11 个系列皮肤有真实动效。建内部 demo 路由验收。

**Architecture:** 三层增量：(1) 动效库接入与基础组件（ParticleLayer/DecorationLayer/AtroposCard/SplittingText/LottieAsset/SmoothScroll）；(2) SeriesSkin v2→v3 渐进升级；(3) 旧 shader 组件迁移进 SeriesSkin 背景层。所有动效**按系列懒加载**——首屏只装当前系列需要的库。

**Tech Stack:** tsParticles v3、GSAP 3（免费版 + 手写 stroke-dasharray）、Atropos、Splitting.js、lottie-react、Lenis（**偏离 spec**：用 Lenis 替代 Locomotive Scroll，同作者新品 9KB、维护活跃、TS 友好；决策记录在 §决策日志）

**Spec reference:** `docs/superpowers/specs/2026-08-12-wenmai-v3-refactor-design.md` §3.3 / §3.4 / §3.6 / §4.1 / §4.2

**决策日志（Plan 2 偏离 spec 的两点）：**
- **Lenis 替代 Locomotive Scroll**：spec §4.2 写的是 Locomotive Scroll；改为 Lenis（同作者新品，更轻 9KB vs 30KB，维护活跃）。理由充分。
- **GSAP DrawSVG 手写替代**：spec §4.2 写"GSAP + DrawSVG + MotionPath"；DrawSVG 是 Club 付费插件，改用免费 GSAP 核心 + ScrollTrigger/Flip/Observer/MotionPath（这些免费）+ 手写 stroke-dasharray 动画。MotionPathPlugin 留下（它免费）。

---

## File Structure

**Create:**
- `src/design-system/visual/particle-presets.ts`（5 种粒子模式 tsParticles options）
- `src/design-system/visual/ParticleLayer.tsx`（tsParticles 包装）
- `src/design-system/visual/ParticleLayer.css`
- `src/design-system/visual/DecorationLayer.tsx`（按类型路由到具体装饰组件）
- `src/design-system/visual/decorations/CloudDecoration.tsx` + `.css`
- `src/design-system/visual/decorations/SealDecoration.tsx` + `.css`
- `src/design-system/visual/decorations/BronzeDecoration.tsx` + `.css`
- `src/design-system/visual/decorations/VineDecoration.tsx` + `.css`
- `src/design-system/visual/decorations/SplashDecoration.tsx` + `.css`
- `src/design-system/visual/AtroposCard.tsx`
- `src/design-system/visual/SplittingText.tsx` + `.css`
- `src/design-system/visual/LottieAsset.tsx`
- `src/design-system/visual/index.ts`（barrel）
- `src/hooks/useDrawPath.ts`（GSAP 手写 dasharray 描边）
- `src/hooks/useCloudFlow.ts`
- `src/hooks/useVineGrow.ts`
- `src/hooks/useSealStamp.ts`
- `src/hooks/useSmoothScroll.ts`（Lenis）
- `src/hooks/useReducedMotion.ts`（系统级 prefers-reduced-motion 检测）
- `src/app/SmoothScrollProvider.tsx`
- `src/pages/demo/SeriesDemoPage.tsx`（隐藏的视觉验收页）
- `src/shaders/cloud-shader.ts`（迁移自 CloudShaderBackground.jsx）
- `src/shaders/fluid-shader.ts`（迁移自 FluidShaderBackground.jsx）

**Modify:**
- `src/design-system/components/SeriesSkin.tsx`（v1 → v3：接入 ParticleLayer + DecorationLayer）
- `src/design-system/components/SeriesSkin.css`
- `src/design-system/components/__tests__/SeriesSkin.test.tsx`（v2 测试）
- `src/design-system/index.ts`（导出新组件）
- `src/design-system/series/themes.ts`（cloud/shanjing 加 shader 配置；dragon 加 silkCanvas 配置）
- `src/types/series-theme.ts`（加 ParticleConfig / DecorationConfig 字段）
- `package.json`（6 个新依赖）
- `src/App.tsx`（替换旧 CloudShader/FluidShader 引用为 SeriesSkin；保留入口路由）

**Don't touch (Plan 3-4 处理):**
- `src/pages/**`（demo 页除外）
- `src/components/**`（旧组件，迁移逐个进行）

---

## Task 1: 安装动效库

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`（npm 自动）

- [ ] **Step 1: 安装运行时依赖**

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npm install @tsparticles/react@^3 @tsparticles/slim@^3 gsap@^3 atropos@^3 splitting@^1 lottie-react@^2 lenis@^1
```

Why these versions:
- `@tsparticles/react@3` + `@tsparticles/slim@3`（v3 主版本，slim 版只含核心引擎，省 50KB）
- `gsap@3`（免费版核心）
- `atropos@3`（视差卡片）
- `splitting@1`（文字拆解）
- `lottie-react@2`（AE JSON 播放）
- `lenis@1`（平滑滚动）

不装 `locomotive-scroll`（被 Lenis 替代，决策见 §决策日志）。
不装 GSAP 的 Club 插件（DrawSVG 等，免费版手写替代）。

- [ ] **Step 2: 验证版本写入**

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && node -e "const p=require('./package.json'); ['@tsparticles/react','@tsparticles/slim','gsap','atropos','splitting','lottie-react','lenis'].forEach(k=>console.log(k, p.dependencies[k]))"
```
Expected output: 7 行版本号，全部非 undefined。

- [ ] **Step 3: 验证 import 可用**

Create `src/_tmp_verify.ts`:
```ts
import Particles from '@tsparticles/react'
import { gsap } from 'gsap'
import Atropos from 'atropos'
import Splitting from 'splitting'
import Lottie from 'lottie-react'
import Lenis from 'lenis'
console.log(Particles, gsap, Atropos, Splitting, Lottie, Lenis)
```

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit --ignoreConfig --strict --skipLibCheck src/_tmp_verify.ts
```
Expected: 无错误（可能需要 `--skipLibCheck` 因为部分库自带 .d.ts 不够严格）。

Delete `src/_tmp_verify.ts`.

- [ ] **Step 4: 验证 build 不破坏**

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npm run build 2>&1 | tail -10
```
Expected: build 成功。

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add package.json package-lock.json && git commit -m "chore: install motion libs for v3 visual system (tsparticles/gsap/atropos/splitting/lottie/lenis)"
```

---

## Task 2: 扩展 series-theme 类型

**Files:**
- Modify: `src/types/series-theme.ts`

加可选字段表示该系列是否启用 shader / silkCanvas 装饰。

- [ ] **Step 1: 改 src/types/series-theme.ts**

在现有 SeriesTheme 接口末尾加两个可选字段：

```ts
// src/types/series-theme.ts
import type { SeriesId } from './pattern'

export type ParticleType = 'sparkle' | 'mist' | 'cloud' | 'rust' | 'growth' | 'none'
export type DecorationType = 'cloud' | 'seal' | 'bronze' | 'vine' | 'splash' | 'none'
export type CardBorderStyle = 'soft' | 'gold-line' | 'ink-line' | 'splash'
export type SeriesIntensity = 'full' | 'subtle' | 'minimal'

export type ShaderKind = 'cloud' | 'fluid' | 'none'

export interface SeriesTheme {
  id: SeriesId
  name: string
  primary: string
  soft: string
  bgGradient: string
  particle: ParticleType
  decoration: DecorationType
  cardBorder: CardBorderStyle
  textGlow: boolean
  /** 系列专用 shader 背景（迁移自旧 CloudShader/FluidShader），默认 'none' */
  shader?: ShaderKind
  /** 团龙系列专用 silk canvas 装饰，默认 false */
  silkCanvas?: boolean
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/types/tsconfig.json
```
Expected: 无错误。

- [ ] **Step 3: 更新 themes.ts 让 cloud/shanjing/dragon 用新字段**

Modify `src/design-system/series/themes.ts`：

cloud 主题加 `shader: 'cloud'`：
```ts
cloud: {
  id: 'cloud',
  name: '云纹',
  primary: '#B0E0E6',
  soft: 'rgba(176, 224, 230, 0.2)',
  bgGradient: 'linear-gradient(180deg, #0a1a2a 0%, #1a2f3f 50%, #0a1a2a 100%)',
  particle: 'cloud',
  decoration: 'cloud',
  cardBorder: 'soft',
  textGlow: false,
  shader: 'cloud',
},
```

shanjing 主题加 `shader: 'fluid'`：
```ts
shanjing: {
  id: 'shanjing',
  name: '山海经',
  primary: '#C41E3A',
  soft: 'rgba(196, 30, 58, 0.2)',
  bgGradient: 'radial-gradient(ellipse at center, #2a0a0a 0%, #0a0505 100%)',
  particle: 'mist',
  decoration: 'seal',
  cardBorder: 'ink-line',
  textGlow: true,
  shader: 'fluid',
},
```

dragon 主题加 `silkCanvas: true`：
```ts
dragon: {
  id: 'dragon',
  name: '团龙',
  primary: '#D4AF6A',
  soft: 'rgba(212, 175, 106, 0.2)',
  bgGradient: 'linear-gradient(135deg, #2A0808 0%, #5a1010 50%, #2A0808 100%)',
  particle: 'cloud',
  decoration: 'seal',
  cardBorder: 'gold-line',
  textGlow: true,
  silkCanvas: true,
},
```

其他系列不加新字段（默认 undefined / 'none' / false）。

- [ ] **Step 4: 类型检查 design-system**

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/design-system/tsconfig.json
```
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/types/series-theme.ts src/design-system/series/themes.ts && git commit -m "feat(types): extend SeriesTheme with shader and silkCanvas optional fields"
```

---

## Task 3: useReducedMotion hook

**Files:**
- Create: `src/hooks/useReducedMotion.ts`

很多动效要在用户开启 `prefers-reduced-motion` 时降级。先建这个 hook，后续所有动效组件都消费它。

- [ ] **Step 1: 写 hook**

```ts
// src/hooks/useReducedMotion.ts
import { useEffect, useState } from 'react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}
```

- [ ] **Step 2: 导出**

Modify `src/hooks/index.ts`：
```ts
export { useImagePreload } from './useImagePreload'
export { useReducedMotion } from './useReducedMotion'
```

- [ ] **Step 3: 类型检查**

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/hooks/tsconfig.json
```
Expected: 无错误。

- [ ] **Step 4: Commit**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/hooks/useReducedMotion.ts src/hooks/index.ts && git commit -m "feat(hooks): add useReducedMotion for accessibility"
```

---

## Task 4: ParticleLayer 组件 + 5 种粒子预设

**Files:**
- Create: `src/design-system/visual/particle-presets.ts`
- Create: `src/design-system/visual/ParticleLayer.tsx`
- Create: `src/design-system/visual/ParticleLayer.css`
- Test: `src/design-system/visual/__tests__/ParticleLayer.test.tsx`

- [ ] **Step 1: 写 5 种粒子预设**

Create `src/design-system/visual/particle-presets.ts`:

```ts
import type { ParticleType } from '../../types/series-theme'

export interface ParticlePreset {
  particles: {
    number: { value: number }
    color: { value: string }
    opacity: { value: number; animation: { enable: boolean; speed: number; sync: boolean } }
    size: { value: number; random: boolean }
    move: {
      enable: boolean
      speed: number
      direction: 'none' | 'top' | 'bottom' | 'left' | 'right'
      random: boolean
      straight: boolean
      outModes: { default: 'out' | 'destroy' }
    }
    links: { enable: boolean; distance: number; color: string; opacity: number; width: number }
  }
  fpsLimit: number
  detectRetina: boolean
}

const base = {
  fpsLimit: 60,
  detectRetina: true,
}

export const PARTICLE_PRESETS: Record<Exclude<ParticleType, 'none'>, ParticlePreset> = {
  sparkle: {
    ...base,
    particles: {
      number: { value: 60 },
      color: { value: ['#ffffff', '#87CEEB', '#B0E0E6'] },
      opacity: { value: 0.6, animation: { enable: true, speed: 1.5, sync: false } },
      size: { value: 2, random: true },
      move: {
        enable: true, speed: 0.6, direction: 'top', random: true, straight: false,
        outModes: { default: 'out' },
      },
      links: { enable: false, distance: 0, color: '#fff', opacity: 0, width: 0 },
    },
  },
  mist: {
    ...base,
    particles: {
      number: { value: 30 },
      color: { value: '#C41E3A' },
      opacity: { value: 0.18, animation: { enable: true, speed: 0.8, sync: false } },
      size: { value: 28, random: true },
      move: {
        enable: true, speed: 0.3, direction: 'none', random: true, straight: false,
        outModes: { default: 'out' },
      },
      links: { enable: false, distance: 0, color: '#000', opacity: 0, width: 0 },
    },
  },
  cloud: {
    ...base,
    particles: {
      number: { value: 18 },
      color: { value: '#D4AF6A' },
      opacity: { value: 0.12, animation: { enable: true, speed: 0.4, sync: false } },
      size: { value: 50, random: true },
      move: {
        enable: true, speed: 0.4, direction: 'right', random: false, straight: true,
        outModes: { default: 'out' },
      },
      links: { enable: false, distance: 0, color: '#000', opacity: 0, width: 0 },
    },
  },
  rust: {
    ...base,
    particles: {
      number: { value: 40 },
      color: { value: ['#8B7355', '#556B2F', '#6B8E23'] },
      opacity: { value: 0.4, animation: { enable: false, speed: 0, sync: false } },
      size: { value: 3, random: true },
      move: {
        enable: true, speed: 0.2, direction: 'bottom', random: true, straight: false,
        outModes: { default: 'destroy' },
      },
      links: { enable: false, distance: 0, color: '#000', opacity: 0, width: 0 },
    },
  },
  growth: {
    ...base,
    particles: {
      number: { value: 25 },
      color: { value: '#98FB98' },
      opacity: { value: 0.5, animation: { enable: true, speed: 1, sync: false } },
      size: { value: 4, random: true },
      move: {
        enable: true, speed: 0.5, direction: 'top', random: true, straight: false,
        outModes: { default: 'out' },
      },
      links: { enable: false, distance: 0, color: '#000', opacity: 0, width: 0 },
    },
  },
}
```

- [ ] **Step 2: 写 ParticleLayer 测试**

Create `src/design-system/visual/__tests__/ParticleLayer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ParticleLayer from '../ParticleLayer'

vi.mock('@tsparticles/react', () => ({
  default: ({ id }: { id: string }) => <div data-testid="mock-particles" data-id={id} />,
}))

describe('ParticleLayer', () => {
  it('renders nothing when type is none', () => {
    const { container } = render(<ParticleLayer type="none" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders particles container when type is set', () => {
    render(<ParticleLayer type="sparkle" />)
    expect(screen.getByTestId('mock-particles')).toBeInTheDocument()
  })

  it('passes unique id based on type', () => {
    render(<ParticleLayer type="mist" />)
    expect(screen.getByTestId('mock-particles').getAttribute('data-id')).toContain('mist')
  })
})
```

注意：mock `@tsparticles/react` 避免在 jsdom 里真的初始化 WebGL/canvas（jsdom 不支持）。

- [ ] **Step 3: 运行测试，预期失败 (FAIL)**

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx vitest run src/design-system/visual/__tests__/ParticleLayer.test.tsx
```
Expected: FAIL（模块不存在）。

- [ ] **Step 4: 编写 ParticleLayer 实现**

Create `src/design-system/visual/ParticleLayer.tsx`:

```tsx
import { memo, useMemo } from 'react'
import Particles from '@tsparticles/react'
import type { ISourceOptions } from '@tsparticles/engine'
import type { ParticleType } from '../../types/series-theme'
import { PARTICLE_PRESETS } from './particle-presets'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './ParticleLayer.css'

export interface ParticleLayerProps {
  type: ParticleType
  className?: string
}

function ParticleLayerImpl({ type, className = '' }: ParticleLayerProps) {
  const reduced = useReducedMotion()

  const options = useMemo<ISourceOptions | null>(() => {
    if (type === 'none' || reduced) return null
    return PARTICLE_PRESETS[type] as unknown as ISourceOptions
  }, [type, reduced])

  if (!options) return null

  return (
    <div className={`ds-particle-layer ${className}`} aria-hidden>
      <Particles id={`particle-${type}`} options={options} />
    </div>
  )
}

export const ParticleLayer = memo(ParticleLayerImpl)
export default ParticleLayer
```

- [ ] **Step 5: 编写 ParticleLayer.css**

Create `src/design-system/visual/ParticleLayer.css`:

```css
.ds-particle-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.ds-particle-layer canvas {
  display: block;
}
```

- [ ] **Step 6: 运行测试，预期通过 (PASS)**

Run:
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx vitest run src/design-system/visual/__tests__/ParticleLayer.test.tsx
```
Expected: 3 tests PASS.

- [ ] **Step 7: 类型检查**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/design-system/tsconfig.json
```

如果报 `ISourceOptions` 找不到，需要装 `@tsparticles/engine`（slim 已经包含它，应该作为 dep transitive）。如果 tsc 找不到，改成 `import type { ISourceOptions } from '@tsparticles/slim'` 或直接 `Record<string, unknown>`。如果还是不行，去掉 ISourceOptions 类型，用 `unknown`。

- [ ] **Step 8: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/visual/ && git commit -m "feat(visual): add ParticleLayer with 5 particle presets (sparkle/mist/cloud/rust/growth)"
```

---

## Task 5: SeriesSkin v2（接入 ParticleLayer）

**Files:**
- Modify: `src/design-system/components/SeriesSkin.tsx`
- Modify: `src/design-system/components/SeriesSkin.css`
- Modify: `src/design-system/components/__tests__/SeriesSkin.test.tsx`

- [ ] **Step 1: 更新测试**

打开 `src/design-system/components/__tests__/SeriesSkin.test.tsx`，在文件顶部加 mock：

```tsx
vi.mock('@tsparticles/react', () => ({
  default: () => <div data-testid="mock-particles" />,
}))
```

(import vi: `import { describe, it, expect, vi } from 'vitest'`)

保留原 4 个测试，加新测试：

```tsx
it('renders particle layer when intensity is full and theme has particle', () => {
  render(<SeriesSkin series="qinghua"><div>Content</div></SeriesSkin>)
  expect(screen.getByTestId('mock-particles')).toBeInTheDocument()
})

it('does not render particle layer when intensity is minimal', () => {
  render(<SeriesSkin series="qinghua" intensity="minimal"><div>Content</div></SeriesSkin>)
  expect(screen.queryByTestId('mock-particles')).not.toBeInTheDocument()
})

it('does not render particle layer for series with particle none', () => {
  render(<SeriesSkin series="geometric"><div>Content</div></SeriesSkin>)
  expect(screen.queryByTestId('mock-particles')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试，预期失败 (FAIL)**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx vitest run src/design-system/components/__tests__/SeriesSkin.test.tsx
```
Expected: 3 new tests FAIL。

- [ ] **Step 3: 修改 SeriesSkin.tsx**

替换整个文件：

```tsx
import type { ReactNode } from 'react'
import type { SeriesIntensity } from '../../types/series-theme'
import { getSeriesTheme } from '../series/themes'
import { ParticleLayer } from '../visual/ParticleLayer'
import './SeriesSkin.css'

export interface SeriesSkinProps {
  series: string
  intensity?: SeriesIntensity
  children: ReactNode
  className?: string
}

export default function SeriesSkin({
  series,
  intensity = 'full',
  children,
  className = '',
}: SeriesSkinProps) {
  const theme = getSeriesTheme(series)
  const wrapperStyle: React.CSSProperties = {
    '--series-primary': theme.primary,
    '--series-soft': theme.soft,
    '--series-bg': theme.bgGradient,
    '--series-text': theme.textGlow ? theme.primary : 'var(--color-text-primary)',
  }

  const cls = [
    'ds-series-skin',
    `series-${theme.id}`,
    `intensity-${intensity}`,
    className,
  ].filter(Boolean).join(' ')

  const showAtmosphere = intensity === 'full'

  return (
    <div className={cls} style={wrapperStyle}>
      {showAtmosphere && theme.particle !== 'none' && (
        <ParticleLayer type={theme.particle} />
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 4: 修改 SeriesSkin.css**

追加（保留原内容）：

```css
.ds-series-skin > *:not(.ds-particle-layer) {
  position: relative;
  z-index: 1;
}
```

让所有非粒子层子元素天然在粒子层之上。

- [ ] **Step 5: 运行测试，预期通过 (PASS)**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx vitest run src/design-system/components/__tests__/SeriesSkin.test.tsx
```
Expected: 7 tests PASS（4 原 + 3 新）。

- [ ] **Step 6: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/components/ && git commit -m "feat(SeriesSkin): v2 integrate ParticleLayer for atmosphere"
```

---

## Task 6: GSAP hooks（useDrawPath / useCloudFlow / useVineGrow / useSealStamp）

**Files:**
- Create: `src/hooks/useDrawPath.ts`
- Create: `src/hooks/useCloudFlow.ts`
- Create: `src/hooks/useVineGrow.ts`
- Create: `src/hooks/useSealStamp.ts`

这 4 个 hook 都是 GSAP 驱动的 SVG 路径动效。集中在一个 task。

- [ ] **Step 1: useDrawPath**

```ts
// src/hooks/useDrawPath.ts
import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion } from './useReducedMotion'

export interface DrawPathOptions {
  duration?: number
  delay?: number
  repeat?: number
  yoyo?: boolean
  ease?: string
}

export function useDrawPath(
  ref: RefObject<SVGPathElement | null>,
  opts: DrawPathOptions = {}
): void {
  const reduced = useReducedMotion()
  const { duration = 2, delay = 0, repeat = 0, yoyo = false, ease = 'none' } = opts

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const length = el.getTotalLength()
    if (!length || !isFinite(length)) return

    gsap.set(el, {
      strokeDasharray: length,
      strokeDashoffset: length,
    })
    const tween = gsap.to(el, {
      strokeDashoffset: 0,
      duration,
      delay,
      repeat,
      yoyo,
      ease,
    })
    return () => {
      tween.kill()
    }
  }, [ref, duration, delay, repeat, yoyo, ease, reduced])
}
```

- [ ] **Step 2: useCloudFlow（云纹循环流转）**

```ts
// src/hooks/useCloudFlow.ts
import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion } from './useReducedMotion'

export function useCloudFlow(
  ref: RefObject<SVGGElement | null>,
  opts: { duration?: number; offsetX?: number } = {}
): void {
  const reduced = useReducedMotion()
  const { duration = 20, offsetX = 100 } = opts

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const tween = gsap.to(el, {
      attr: { transform: `translateX(${offsetX})` },
      duration,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
    return () => {
      tween.kill()
    }
  }, [ref, duration, offsetX, reduced])
}
```

- [ ] **Step 3: useVineGrow（卷草生长 = DrawPath 包装）**

```ts
// src/hooks/useVineGrow.ts
import { type RefObject } from 'react'
import { useDrawPath, type DrawPathOptions } from './useDrawPath'

export function useVineGrow(
  ref: RefObject<SVGPathElement | null>,
  opts: DrawPathOptions = {}
): void {
  useDrawPath(ref, { duration: 3, ease: 'power2.inOut', ...opts })
}
```

- [ ] **Step 4: useSealStamp（印章盖下 = scale + opacity）**

```ts
// src/hooks/useSealStamp.ts
import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion } from './useReducedMotion'

export interface SealStampOptions {
  delay?: number
  scale?: number
}

export function useSealStamp(
  ref: RefObject<SVGGElement | null>,
  opts: SealStampOptions = {}
): void {
  const reduced = useReducedMotion()
  const { delay = 0, scale = 1 } = opts

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (reduced) {
      gsap.set(el, { opacity: 1, scale })
      return
    }

    gsap.set(el, { opacity: 0, scale: scale * 2.4 })
    const tween = gsap.to(el, {
      opacity: 1,
      scale,
      duration: 0.35,
      delay,
      ease: 'back.out(2)',
    })
    return () => {
      tween.kill()
    }
  }, [ref, delay, scale, reduced])
}
```

- [ ] **Step 5: 导出 hooks**

修改 `src/hooks/index.ts`：

```ts
export { useImagePreload } from './useImagePreload'
export { useReducedMotion } from './useReducedMotion'
export { useDrawPath, type DrawPathOptions } from './useDrawPath'
export { useCloudFlow } from './useCloudFlow'
export { useVineGrow } from './useVineGrow'
export { useSealStamp, type SealStampOptions } from './useSealStamp'
```

- [ ] **Step 6: 类型检查**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/hooks/tsconfig.json
```

如果报 `gsap` 模块找不到 type 声明，确保 `gsap@3` 已装（Task 1 已装）。GSAP 自带 .d.ts。

- [ ] **Step 7: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/hooks/ && git commit -m "feat(hooks): add 4 GSAP-powered SVG animation hooks (drawPath/cloudFlow/vineGrow/sealStamp)"
```

---

## Task 7: DecorationLayer 组件（按类型路由）

**Files:**
- Create: `src/design-system/visual/decorations/CloudDecoration.tsx` + `.css`
- Create: `src/design-system/visual/decorations/SealDecoration.tsx` + `.css`
- Create: `src/design-system/visual/decorations/BronzeDecoration.tsx` + `.css`
- Create: `src/design-system/visual/decorations/VineDecoration.tsx` + `.css`
- Create: `src/design-system/visual/decorations/SplashDecoration.tsx` + `.css`
- Create: `src/design-system/visual/DecorationLayer.tsx`

每个 decoration 是一个 SVG 装饰组件，DecorationLayer 按 `type` 路由。

- [ ] **Step 1: CloudDecoration**

Create `src/design-system/visual/decorations/CloudDecoration.tsx`:

```tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useCloudFlow } from '../../../hooks/useCloudFlow'
import './CloudDecoration.css'

export default function CloudDecoration() {
  const ref = useRef<SVGGElement>(null)
  useCloudFlow(ref as RefObject<SVGGElement | null>, { duration: 24, offsetX: 60 })

  return (
    <g ref={ref} className="deco-cloud" aria-hidden>
      <path
        d="M0,40 Q30,20 60,40 T120,40 T180,40 T240,40"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d="M0,80 Q40,60 80,80 T160,80 T240,80"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1"
        opacity="0.2"
      />
    </g>
  )
}
```

Create `src/design-system/visual/decorations/CloudDecoration.css`:
```css
.deco-cloud {
  position: absolute;
  top: 20%;
  left: -50px;
  width: calc(100% + 100px);
  height: 100px;
  pointer-events: none;
}
```

- [ ] **Step 2: SealDecoration**

Create `src/design-system/visual/decorations/SealDecoration.tsx`:

```tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useSealStamp } from '../../../hooks/useSealStamp'
import './SealDecoration.css'

export default function SealDecoration({ char = '神' }: { char?: string }) {
  const ref = useRef<SVGGElement>(null)
  useSealStamp(ref as RefObject<SVGGElement | null>, { delay: 0.3 })

  return (
    <g ref={ref} className="deco-seal" aria-hidden>
      <rect
        x="0" y="0" width="60" height="60"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="2"
        opacity="0.5"
      />
      <text
        x="30" y="42"
        textAnchor="middle"
        fontFamily="var(--font-seal)"
        fontSize="36"
        fill="var(--series-primary)"
        opacity="0.7"
      >
        {char}
      </text>
    </g>
  )
}
```

Create `src/design-system/visual/decorations/SealDecoration.css`:
```css
.deco-seal {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  pointer-events: none;
}
```

- [ ] **Step 3: BronzeDecoration**

Create `src/design-system/visual/decorations/BronzeDecoration.tsx`:

```tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useDrawPath } from '../../../hooks/useDrawPath'
import './BronzeDecoration.css'

export default function BronzeDecoration() {
  const ref1 = useRef<SVGPathElement>(null)
  const ref2 = useRef<SVGPathElement>(null)
  useDrawPath(ref1 as RefObject<SVGPathElement | null>, { duration: 4, delay: 0.3 })
  useDrawPath(ref2 as RefObject<SVGPathElement | null>, { duration: 4, delay: 0.8 })

  return (
    <g className="deco-bronze" aria-hidden>
      <path
        ref={ref1}
        d="M40,40 L80,40 L100,80 L80,120 L40,120 L20,80 Z"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        ref={ref2}
        d="M60,60 L60,100 M40,80 L80,80"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1"
        opacity="0.3"
      />
    </g>
  )
}
```

Create `src/design-system/visual/decorations/BronzeDecoration.css`:
```css
.deco-bronze {
  position: absolute;
  bottom: 32px;
  left: 24px;
  width: 120px;
  height: 160px;
  pointer-events: none;
}
```

- [ ] **Step 4: VineDecoration**

Create `src/design-system/visual/decorations/VineDecoration.tsx`:

```tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useVineGrow } from '../../../hooks/useVineGrow'
import './VineDecoration.css'

export default function VineDecoration() {
  const ref = useRef<SVGPathElement>(null)
  useVineGrow(ref as RefObject<SVGPathElement | null>)

  return (
    <svg className="deco-vine" aria-hidden viewBox="0 0 300 200" preserveAspectRatio="none">
      <path
        ref={ref}
        d="M0,100 Q50,60 100,100 Q150,140 200,100 Q250,60 300,100"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="2"
        opacity="0.4"
      />
    </svg>
  )
}
```

Create `src/design-system/visual/decorations/VineDecoration.css`:
```css
.deco-vine {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 200px;
  pointer-events: none;
}
```

- [ ] **Step 5: SplashDecoration**

Create `src/design-system/visual/decorations/SplashDecoration.tsx`:

```tsx
import './SplashDecoration.css'

export default function SplashDecoration() {
  return (
    <svg className="deco-splash" aria-hidden viewBox="0 0 200 200" preserveAspectRatio="none">
      <path
        d="M100,20 Q140,40 160,80 Q180,120 160,160 Q120,180 80,160 Q40,140 20,100 Q40,60 100,20 Z"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1.5"
        opacity="0.25"
      />
    </svg>
  )
}
```

Create `src/design-system/visual/decorations/SplashDecoration.css`:
```css
.deco-splash {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 70%;
  pointer-events: none;
}
```

- [ ] **Step 6: DecorationLayer 路由组件**

Create `src/design-system/visual/DecorationLayer.tsx`:

```tsx
import { memo } from 'react'
import type { DecorationType } from '../../types/series-theme'
import CloudDecoration from './decorations/CloudDecoration'
import SealDecoration from './decorations/SealDecoration'
import BronzeDecoration from './decorations/BronzeDecoration'
import VineDecoration from './decorations/VineDecoration'
import SplashDecoration from './decorations/SplashDecoration'

export interface DecorationLayerProps {
  type: DecorationType
  className?: string
}

function DecorationLayerImpl({ type, className = '' }: DecorationLayerProps) {
  if (type === 'none') return null

  return (
    <div className={`ds-decoration-layer ${className}`} aria-hidden>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        {/* CloudDecoration uses <g>, needs SVG parent — wrap each in its own svg instead */}
      </svg>
      {type === 'cloud' && (
        <svg className="deco-svg" viewBox="0 0 300 100" preserveAspectRatio="none">
          <CloudDecoration />
        </svg>
      )}
      {type === 'seal' && (
        <svg className="deco-svg" viewBox="0 0 60 60">
          <SealDecoration />
        </svg>
      )}
      {type === 'bronze' && (
        <svg className="deco-svg" viewBox="0 0 120 160">
          <BronzeDecoration />
        </svg>
      )}
      {type === 'vine' && <VineDecoration />}
      {type === 'splash' && <SplashDecoration />}
    </div>
  )
}

export const DecorationLayer = memo(DecorationLayerImpl)
export default DecorationLayer
```

注意：CloudDecoration/SealDecoration/BronzeDecoration 返回 `<g>`，必须包在 `<svg>` 里；VineDecoration/SplashDecoration 自己 return `<svg>` 所以直接放。

- [ ] **Step 7: 类型检查**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/design-system/tsconfig.json
```

- [ ] **Step 8: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/visual/ && git commit -m "feat(visual): add DecorationLayer with 5 decoration types (cloud/seal/bronze/vine/splash)"
```

---

## Task 8: SeriesSkin v3（接入 DecorationLayer）

**Files:**
- Modify: `src/design-system/components/SeriesSkin.tsx`
- Modify: `src/design-system/components/__tests__/SeriesSkin.test.tsx`

- [ ] **Step 1: 测试加 mock + 新 assertion**

打开 `src/design-system/components/__tests__/SeriesSkin.test.tsx`，在 vi.mock 块里加（在 tsparticles mock 旁边）：

```tsx
vi.mock('../visual/DecorationLayer', () => ({
  default: ({ type }: { type: string }) =>
    type === 'none' ? null : <div data-testid={`mock-deco-${type}`} />,
}))
```

加新测试：

```tsx
it('renders decoration layer when theme has decoration', () => {
  render(<SeriesSkin series="qinghua"><div>Content</div></SeriesSkin>)
  // qinghua 的 decoration 是 splash
  expect(screen.getByTestId('mock-deco-splash')).toBeInTheDocument()
})

it('does not render decoration layer in subtle intensity', () => {
  render(<SeriesSkin series="qinghua" intensity="subtle"><div>Content</div></SeriesSkin>)
  expect(screen.queryByTestId('mock-deco-splash')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试，预期失败 (FAIL)**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx vitest run src/design-system/components/__tests__/SeriesSkin.test.tsx
```
Expected: 2 new tests FAIL。

- [ ] **Step 3: 修改 SeriesSkin.tsx**

加 import 和渲染：

```tsx
import { DecorationLayer } from '../visual/DecorationLayer'
```

在 `{showAtmosphere && theme.particle !== 'none' && (<ParticleLayer .../>)}` 之后加：

```tsx
{showAtmosphere && theme.decoration !== 'none' && (
  <DecorationLayer type={theme.decoration} />
)}
```

- [ ] **Step 4: 运行测试，预期通过 (PASS)**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx vitest run src/design-system/components/__tests__/SeriesSkin.test.tsx
```
Expected: 9 tests PASS。

- [ ] **Step 5: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/components/ && git commit -m "feat(SeriesSkin): v3 integrate DecorationLayer"
```

---

## Task 9: AtroposCard 视差组件

**Files:**
- Create: `src/design-system/visual/AtroposCard.tsx`
- Test: `src/design-system/visual/__tests__/AtroposCard.test.tsx`

- [ ] **Step 1: 写测试**

```tsx
// src/design-system/visual/__tests__/AtroposCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AtroposCard from '../AtroposCard'

vi.mock('atropos/react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-atropos">{children}</div>,
}))

describe('AtroposCard', () => {
  it('renders children inside atropos wrapper', () => {
    render(<AtroposCard>Card content</AtroposCard>)
    expect(screen.getByTestId('mock-atropos')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies stretch className by default', () => {
    render(<AtroposCard>Content</AtroposCard>)
    expect(screen.getByTestId('mock-atropos').parentElement).toHaveClass('atropos-stretch')
  })
})
```

- [ ] **Step 2: 运行测试，预期失败 (FAIL)**

- [ ] **Step 3: 写实现**

```tsx
// src/design-system/visual/AtroposCard.tsx
import type { ReactNode } from 'react'
import Atropos from 'atropos/react'

export interface AtroposCardProps {
  children: ReactNode
  className?: string
  active?: boolean
}

export default function AtroposCard({ children, className = '', active = true }: AtroposCardProps) {
  return (
    <div className={`atropos-stretch ${className}`}>
      <Atropos active={active} highlight={false}>
        {children}
      </Atropos>
    </div>
  )
}
```

- [ ] **Step 4: 运行测试，预期通过 (PASS)**

- [ ] **Step 5: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/visual/AtroposCard.tsx src/design-system/visual/__tests__/AtroposCard.test.tsx && git commit -m "feat(visual): add AtroposCard parallax wrapper"
```

---

## Task 10: SplittingText 文字拆解

**Files:**
- Create: `src/design-system/visual/SplittingText.tsx`
- Create: `src/design-system/visual/SplittingText.css`
- Test: `src/design-system/visual/__tests__/SplittingText.test.tsx`

- [ ] **Step 1: 写测试**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SplittingText from '../SplittingText'

vi.mock('splitting', () => ({
  default: vi.fn(() => [{ chars: ['青', '花', '瓷'] }]),
}))

describe('SplittingText', () => {
  it('renders text', () => {
    render(<SplittingText text="青花瓷" />)
    expect(screen.getByText('青花瓷')).toBeInTheDocument()
  })

  it('applies data-splitting attribute', () => {
    render(<SplittingText text="龍" />)
    expect(screen.getByText('龍').closest('[data-splitting]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 运行测试，预期失败 (FAIL)**

- [ ] **Step 3: 写实现**

```tsx
// src/design-system/visual/SplittingText.tsx
import { useEffect, useRef } from 'react'
import Splitting from 'splitting'
import type { SplittingResult } from 'splitting'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './SplittingText.css'

export interface SplittingTextProps {
  text: string
  className?: string
}

export default function SplittingText({ text, className = '' }: SplittingTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!ref.current || reduced) return
    const results: SplittingResult[] = Splitting({ target: ref.current, by: 'chars' })
    if (results[0]?.chars) {
      results[0].chars.forEach((char, i) => {
        char.style.setProperty('--char-index', String(i))
        char.style.animationDelay = `${i * 0.08}s`
      })
    }
  }, [text, reduced])

  return (
    <span ref={ref} className={`ds-splitting-text ${className}`} data-splitting="chars">
      {text}
    </span>
  )
}
```

- [ ] **Step 4: 写 CSS**

```css
/* src/design-system/visual/SplittingText.css */
.ds-splitting-text {
  display: inline-block;
}
.ds-splitting-text .char {
  display: inline-block;
  opacity: 0;
  animation: ds-char-rise 0.6s ease forwards;
}
@keyframes ds-char-rise {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .ds-splitting-text .char {
    opacity: 1;
    animation: none;
  }
}
```

- [ ] **Step 5: 运行测试，预期通过 (PASS)**

如果 SplittingResult 类型找不到，tsconfig 加 `"skipLibCheck": true`（已加 ignoreDeprecations），或改成 `any[]`。

- [ ] **Step 6: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/visual/SplittingText.tsx src/design-system/visual/SplittingText.css src/design-system/visual/__tests__/SplittingText.test.tsx && git commit -m "feat(visual): add SplittingText for char-by-char animation"
```

---

## Task 11: LottieAsset 接口

**Files:**
- Create: `src/design-system/visual/LottieAsset.tsx`
- Test: `src/design-system/visual/__tests__/LottieAsset.test.tsx`

暂无 AE 资产，建一个能播放任意 JSON 的通用组件。

- [ ] **Step 1: 写测试**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LottieAsset from '../LottieAsset'

vi.mock('lottie-react', () => ({
  default: ({ animationData }: { animationData: unknown }) => (
    <div data-testid="mock-lottie">{Object.keys(animationData as object).length} keys</div>
  ),
}))

describe('LottieAsset', () => {
  it('renders lottie player when data is provided', () => {
    render(<LottieAsset data={{ v: '5.0.0', layers: [] }} />)
    expect(screen.getByTestId('mock-lottie')).toBeInTheDocument()
  })

  it('renders fallback when data is null', () => {
    render(<LottieAsset data={null} fallback={<div>No AE</div>} />)
    expect(screen.getByText('No AE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试，预期失败 (FAIL)**

- [ ] **Step 3: 写实现**

```tsx
// src/design-system/visual/LottieAsset.tsx
import type { ReactNode } from 'react'
import Lottie from 'lottie-react'

export interface LottieAssetProps {
  data: Record<string, unknown> | null
  fallback?: ReactNode
  loop?: boolean
  autoplay?: boolean
  className?: string
}

export default function LottieAsset({
  data,
  fallback = null,
  loop = true,
  autoplay = true,
  className = '',
}: LottieAssetProps) {
  if (!data) return <>{fallback}</>
  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      className={className}
    />
  )
}
```

- [ ] **Step 4: 运行测试，预期通过 (PASS)**

- [ ] **Step 5: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/visual/LottieAsset.tsx src/design-system/visual/__tests__/LottieAsset.test.tsx && git commit -m "feat(visual): add LottieAsset component (Lottie player with null fallback)"
```

---

## Task 12: useSmoothScroll + SmoothScrollProvider（Lenis）

**Files:**
- Create: `src/hooks/useSmoothScroll.ts`
- Create: `src/app/SmoothScrollProvider.tsx`
- Test: `src/app/__tests__/SmoothScrollProvider.test.tsx`

- [ ] **Step 1: useSmoothScroll hook**

```ts
// src/hooks/useSmoothScroll.ts
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from './useReducedMotion'

export interface SmoothScrollOptions {
  duration?: number
  easing?: (t: number) => number
}

export function useSmoothScroll(opts: SmoothScrollOptions = {}): React.RefObject<Lenis | null> {
  const ref = useRef<Lenis | null>(null)
  const reduced = useReducedMotion()
  const { duration = 1.2 } = opts

  useEffect(() => {
    if (reduced || typeof window === 'undefined') return

    const lenis = new Lenis({ duration })
    ref.current = lenis

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      ref.current = null
    }
  }, [duration, reduced])

  return ref as React.RefObject<Lenis | null>
}
```

- [ ] **Step 2: SmoothScrollProvider**

```tsx
// src/app/SmoothScrollProvider.tsx
import type { ReactNode } from 'react'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useSmoothScroll()
  return <>{children}</>
}
```

- [ ] **Step 3: 写测试**

```tsx
// src/app/__tests__/SmoothScrollProvider.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import SmoothScrollProvider from '../SmoothScrollProvider'

vi.mock('lenis', () => ({
  default: vi.fn(() => ({
    raf: vi.fn(),
    destroy: vi.fn(),
  })),
}))

describe('SmoothScrollProvider', () => {
  it('renders children', () => {
    const { container } = render(
      <SmoothScrollProvider><div>Content</div></SmoothScrollProvider>
    )
    expect(container.textContent).toContain('Content')
  })
})
```

- [ ] **Step 4: 类型检查 + 测试**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/hooks/tsconfig.json && npx vitest run src/app/__tests__/SmoothScrollProvider.test.tsx
```

注意：src/app/tsconfig.json 还不存在，需要建（和 design-system 同结构）。如果 tsc 报错 `app/tsconfig.json 缺`，先建：

Create `src/app/tsconfig.json`（和 src/design-system/tsconfig.json 同内容，路径调整）:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "ignoreDeprecations": "6.0"
  },
  "include": ["./**/*.ts", "./**/*.tsx", "../vite-env.d.ts"]
}
```

- [ ] **Step 5: 导出 hook**

修改 `src/hooks/index.ts` 加：
```ts
export { useSmoothScroll, type SmoothScrollOptions } from './useSmoothScroll'
```

- [ ] **Step 6: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/hooks/ src/app/ && git commit -m "feat(app): add Lenis-based SmoothScrollProvider + useSmoothScroll hook"
```

---

## Task 13: 迁移 CloudShaderBackground → SeriesSkin cloud 背景

**Files:**
- Create: `src/shaders/cloud-shader.ts`
- Modify: `src/design-system/components/SeriesSkin.tsx`
- Read: `src/components/common/CloudShaderBackground.jsx`（参考用）

- [ ] **Step 1: 读原 CloudShaderBackground.jsx**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && cat src/components/common/CloudShaderBackground.jsx
```
理解 shader 逻辑。原文件是 R3F + GLSL。

- [ ] **Step 2: 创建 shader 模块**

把原 .jsx 的核心 shader 抽到纯 .ts 模块：

```ts
// src/shaders/cloud-shader.ts
export const cloudVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
` as const

export const cloudFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uColor2;
  varying vec2 vUv;

  // simplex noise...
  float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.05;
    float n = noise(uv * 3.0 + t);
    vec3 col = mix(uColor, uColor2, n);
    gl_FragColor = vec4(col, 0.4);
  }
` as const

export interface CloudShaderUniforms {
  uTime: { value: number }
  uColor: { value: [number, number, number] }
  uColor2: { value: [number, number, number] }
}
```

(注：具体 shader 内容从原 .jsx 复制；这里是结构示例。如果原文件太复杂，**直接复制原 .jsx 整文件到 .tsx 然后改 JSX namespace** 也接受——但要补类型。)

- [ ] **Step 3: 在 SeriesSkin 加 shader 层**

修改 `src/design-system/components/SeriesSkin.tsx`：

```tsx
import { lazy, Suspense } from 'react'

const CloudShader = lazy(() => import('../../shaders/CloudShaderComponent'))
const FluidShader = lazy(() => import('../../shaders/FluidShaderComponent'))
```

在渲染部分加：
```tsx
{showAtmosphere && theme.shader === 'cloud' && (
  <Suspense fallback={null}>
    <CloudShader />
  </Suspense>
)}
{showAtmosphere && theme.shader === 'fluid' && (
  <Suspense fallback={null}>
    <FluidShader />
  </Suspense>
)}
```

Create `src/shaders/CloudShaderComponent.tsx`（R3F 渲染包装器）：

```tsx
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cloudVertexShader, cloudFragmentShader } from './cloud-shader'

function CloudPlane() {
  const meshRef = useRef<THREE.ShaderMaterial>(null)
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={meshRef}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#0a1a2a') },
          uColor2: { value: new THREE.Color('#1a2f3f') },
        }}
        transparent
      />
    </mesh>
  )
}

export default function CloudShaderComponent() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 1] }}>
        <CloudPlane />
      </Canvas>
    </div>
  )
}
```

(类似地 `src/shaders/FluidShaderComponent.tsx` 在 Task 14 处理。)

- [ ] **Step 4: 类型检查 + build**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/design-system/tsconfig.json && npm run build 2>&1 | tail -5
```

注：shaders/ 目录可能需要自己的 tsconfig。如果 tsc 报错，建 `src/shaders/tsconfig.json`（同 design-system）。

- [ ] **Step 5: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/shaders/ src/design-system/components/SeriesSkin.tsx && git commit -m "feat(SeriesSkin): integrate CloudShader for cloud series background"
```

---

## Task 14: 迁移 FluidShaderBackground → SeriesSkin shanjing 背景

**Files:**
- Create: `src/shaders/fluid-shader.ts`
- Create: `src/shaders/FluidShaderComponent.tsx`
- Read: `src/components/common/FluidShaderBackground.jsx`（参考用）

同 Task 13 流程，针对 shanjing 系列（fluid shader，朱砂色调）。

- [ ] **Step 1: 读原 FluidShaderBackground.jsx**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && cat src/components/common/FluidShaderBackground.jsx
```

- [ ] **Step 2: 创建 fluid-shader.ts**

抽 shader 逻辑，颜色调朱砂红 (`#2a0a0a` / `#C41E3A`)。

- [ ] **Step 3: 创建 FluidShaderComponent.tsx**

参考 CloudShaderComponent，uniforms 颜色改成朱砂。

- [ ] **Step 4: 验证 build**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npm run build 2>&1 | tail -5
```

- [ ] **Step 5: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/shaders/ && git commit -m "feat(SeriesSkin): integrate FluidShader for shanjing series background"
```

---

## Task 15: 迁移 GoldSilkCanvas → SeriesSkin dragon 装饰

**Files:**
- Create: `src/design-system/visual/decorations/SilkCanvasDecoration.tsx`
- Read: `src/components/common/GoldSilkCanvas.jsx`（参考用）

- [ ] **Step 1: 读原 GoldSilkCanvas.jsx**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && cat src/components/common/GoldSilkCanvas.jsx
```

理解它做什么（应该是 R3F 的丝绸质感 canvas，金线 + 朱漆底）。

- [ ] **Step 2: 写 SilkCanvasDecoration.tsx**

把原组件包装成装饰层。如果是 R3F Canvas 类，照搬核心逻辑到 TS。如果是 CSS/SVG 类，转 TSX。

简化版（如果原组件复杂）：
```tsx
// src/design-system/visual/decorations/SilkCanvasDecoration.tsx
import { useRef } from 'react'
import type { RefObject } from 'react'
import { useCloudFlow } from '../../../hooks/useCloudFlow'
import './SilkCanvasDecoration.css'

export default function SilkCanvasDecoration() {
  const ref = useRef<SVGGElement>(null)
  useCloudFlow(ref as RefObject<SVGGElement | null>, { duration: 30, offsetX: 80 })

  return (
    <svg className="deco-silk-canvas" aria-hidden viewBox="0 0 800 200" preserveAspectRatio="none">
      <g ref={ref}>
        <path
          d="M0,100 Q200,60 400,100 T800,100"
          fill="none"
          stroke="#D4AF6A"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M0,140 Q200,100 400,140 T800,140"
          fill="none"
          stroke="#D4AF6A"
          strokeWidth="1"
          opacity="0.2"
        />
      </g>
    </svg>
  )
}
```

Create `SilkCanvasDecoration.css`:
```css
.deco-silk-canvas {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 200px;
  pointer-events: none;
}
```

- [ ] **Step 3: 修改 SeriesSkin 渲染**

```tsx
import SilkCanvasDecoration from '../visual/decorations/SilkCanvasDecoration'
```

在 DecorationLayer 之后加：
```tsx
{showAtmosphere && theme.silkCanvas && <SilkCanvasDecoration />}
```

- [ ] **Step 4: 类型检查 + 测试通过**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/design-system/tsconfig.json && npx vitest run src/design-system/
```

- [ ] **Step 5: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/ && git commit -m "feat(SeriesSkin): add SilkCanvasDecoration for dragon series"
```

---

## Task 16: /demo/series/:id 视觉验收页

**Files:**
- Create: `src/pages/demo/SeriesDemoPage.tsx`

注：现在还不能注册路由（路由替换是 Plan 3）。先建页面组件，Plan 3 再挂到 Router。

- [ ] **Step 1: 写 demo 页**

```tsx
// src/pages/demo/SeriesDemoPage.tsx
import { useParams } from 'react-router-dom'
import { SeriesSkin, Button, Card, PatternImage, SplittingText } from '../../design-system'
import { SERIES_THEMES } from '../../design-system/series/themes'

export default function SeriesDemoPage() {
  const { id = 'neutral' } = useParams<{ id: string }>()
  const theme = SERIES_THEMES[id] ?? SERIES_THEMES.neutral

  return (
    <SeriesSkin series={id} intensity="full" style={{ minHeight: '100vh' }}>
      <div style={{ padding: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display)' }}>
          <SplittingText text={theme.name} />
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
          series id: <code>{theme.id}</code> · primary <code>{theme.primary}</code>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 32 }}>
          <Card header={<div>Sample Card</div>}>
            <PatternImage
              src={`/patterns/${id}-sample.webp`}
              alt="sample"
              size="lg"
              fallback={<div>sample missing</div>}
            />
          </Card>
          <Card>
            <p>Buttons:</p>
            <Button variant="primary" style={{ marginRight: 8 }}>Primary</Button>
            <Button variant="secondary" style={{ marginRight: 8 }}>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </Card>
        </div>

        <div style={{ marginTop: 32 }}>
          <p>Theme dump:</p>
          <pre style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
            {JSON.stringify(theme, null, 2)}
          </pre>
        </div>
      </div>
    </SeriesSkin>
  )
}
```

注：`SeriesSkin` 需要支持 `style` prop。Task 5 的 SeriesSkin 还没有 style prop——加一下：

修改 `src/design-system/components/SeriesSkin.tsx` SeriesSkinProps 加 `style?: React.CSSProperties`，传给最外层 div。

- [ ] **Step 2: 类型检查**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/design-system/tsconfig.json
```

- [ ] **Step 3: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/pages/demo/ src/design-system/components/SeriesSkin.tsx && git commit -m "feat(demo): add /demo/series/:id page for visual verification of 11 series skins"
```

---

## Task 17: design-system barrel 更新

**Files:**
- Modify: `src/design-system/index.ts`
- Create: `src/design-system/visual/index.ts`

- [ ] **Step 1: visual barrel**

```ts
// src/design-system/visual/index.ts
export { default as ParticleLayer } from './ParticleLayer'
export type { ParticleLayerProps } from './ParticleLayer'
export { default as DecorationLayer } from './DecorationLayer'
export type { DecorationLayerProps } from './DecorationLayer'
export { default as AtroposCard } from './AtroposCard'
export type { AtroposCardProps } from './AtroposCard'
export { default as SplittingText } from './SplittingText'
export type { SplittingTextProps } from './SplittingText'
export { default as LottieAsset } from './LottieAsset'
export type { LottieAssetProps } from './LottieAsset'
export { PARTICLE_PRESETS } from './particle-presets'
```

- [ ] **Step 2: 更新 design-system index.ts**

在末尾追加：
```ts
export * from './visual'
```

- [ ] **Step 3: 类型检查 + 全测试**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npx tsc --noEmit -p src/design-system/tsconfig.json && npx vitest run src/design-system/
```

Expected: 全部测试 PASS。

- [ ] **Step 4: 提交代码**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add src/design-system/index.ts src/design-system/visual/index.ts && git commit -m "feat(design-system): barrel export visual components"
```

---

## Task 18: 包体验证 + 懒加载策略

**Files:**
- Modify: 任何需要懒加载的入口

- [ ] **Step 1: 跑 build 看 bundle 分布**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npm run build 2>&1 | tail -20
```

记录新增 chunk 的大小，特别是：
- tsparticles chunk
- gsap chunk
- atropos chunk
- splitting chunk
- lottie-react chunk
- lenis chunk
- three（已有，会变大）

- [ ] **Step 2: 计算 gzipped 增量**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && du -sh dist/
```

对比 Plan 1 完成时的 dist 大小（记录在 Plan 1 Task 19）。新增 gzipped ≤ 200KB 是验收标准。

- [ ] **Step 3: 如果超 200KB，加懒加载**

SeriesSkin 已经用 `lazy()` import shader 组件。如果 tsparticles 仍然撑大首屏，把 ParticleLayer 也改 lazy：

```tsx
const ParticleLayer = lazy(() => import('./visual/ParticleLayer'))
```

并 wrap Suspense fallback null。

- [ ] **Step 4: 验证 dev server 起得来**

```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && npm run dev &
sleep 5
curl -s http://localhost:5173/ | head -20
kill %1
```

- [ ] **Step 5: 提交代码（如有改动）**

如果 step 3 加了 lazy loading：
```bash
cd "D:/desktop/纹脉/wenmai/.claude/worktrees/wenmai-v3" && git add -A && git commit -m "perf(visual): lazy load ParticleLayer and shaders to reduce initial bundle"
```

否则跳过。

---

## Plan 2 完成验收

- [ ] 17 task 完成
- [ ] SeriesSkin 从 v1 升级到 v3（粒子 + 装饰 + shader + 视差能力就绪）
- [ ] 11 系列皮肤配置完整，至少 6 个有真实动效（粒子或装饰或 shader）
- [ ] tsParticles/gsap/atropos/splitting/lottie-react/lenis 全部接入并可消费
- [ ] Lenis 替代 Locomotive Scroll 的决策记录在案
- [ ] 旧 CloudShader/FluidShader/GoldSilkCanvas 已迁移进 shaders/ 或 visual/decorations/
- [ ] design-system barrel 导出全部新组件
- [ ] /demo/series/:id 页面就绪（Plan 3 挂路由）
- [ ] 包体增量 ≤ 200KB gzipped
- [ ] prefers-reduced-motion 全链路支持

完成后进入 Plan 3: IA 重塑（Router 替换 + 目录重划 + BottomNav + 路由表）。

---

## Self-Review 记录

- ✅ Spec coverage: §3.3（系列皮肤）→ Task 2/4/5/7/8；§3.4（SeriesSkin API）→ Task 5/8/15；§3.6（旧背景处理）→ Task 13/14/15；§4.1（已有库）→ 沿用；§4.2（新动效库）→ Task 1/4/6/9/10/11/12
- ✅ Placeholder scan: shader 内容从原 .jsx 复制（Task 13/14/15 标注 "参考原文件"），其他全部完整代码
- ✅ Type consistency: ParticleType/DecorationType 沿用 Plan 1 定义；SeriesTheme 加可选字段不破坏旧调用
- ⚠️ 决策日志记录了 2 处偏离 spec（Lenis / GSAP 免费版），实施时如果出现新偏离需补记
