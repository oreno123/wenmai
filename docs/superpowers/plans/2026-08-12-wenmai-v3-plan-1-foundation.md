# 纹脉 v3 重构 Plan 1: 地基 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立纹脉 v3 重构的基础设施——新依赖、TS strict、design-system 骨架、5 个 zustand store、共享类型定义、新目录结构占位。本 plan 不动现有代码，所有新代码在新目录。

**Architecture:** 并行策略——旧代码（src/pages, src/store, src/components）保留运行；新基础设施在 src/design-system/, src/store/, src/types/, src/hooks/ 等新目录建立。后续 Plan 2-5 把旧代码逐步迁入新结构。

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind 4, zustand（新增）, vitest

**Spec reference:** `docs/superpowers/specs/2026-08-12-wenmai-v3-refactor-design.md` §5/§6/§8

---

## File Structure

**Create:**
- `tsconfig.json`（修改，strict: true）
- `package.json`（修改，加 deps）
- `src/index.css`（修改，import tokens）
- `src/design-system/tokens/colors.css`
- `src/design-system/tokens/typography.css`
- `src/design-system/tokens/spacing.css`
- `src/design-system/tokens/shadows.css`
- `src/design-system/components/Button.tsx`
- `src/design-system/components/Card.tsx`
- `src/design-system/components/Modal.tsx`
- `src/design-system/components/PatternImage.tsx`
- `src/design-system/components/SeriesSkin.tsx`
- `src/design-system/series/themes.ts`
- `src/design-system/index.ts`
- `src/store/useUserStore.ts`
- `src/store/useLibraryStore.ts`
- `src/store/useGachaStore.ts`
- `src/store/useCreationStore.ts`
- `src/store/useGalleryStore.ts`
- `src/store/index.ts`
- `src/types/pattern.ts`
- `src/types/creation.ts`
- `src/types/gallery.ts`
- `src/types/user.ts`
- `src/types/gacha.ts`
- `src/types/series-theme.ts`
- `src/types/index.ts`
- `src/hooks/useImagePreload.ts`
- `src/hooks/index.ts`
- `src/app/.gitkeep`（占位）
- `src/features/.gitkeep`
- `src/lib/.gitkeep`

**Test:**
- `src/design-system/components/__tests__/Button.test.tsx`
- `src/design-system/components/__tests__/Card.test.tsx`
- `src/design-system/components/__tests__/Modal.test.tsx`
- `src/design-system/components/__tests__/SeriesSkin.test.tsx`
- `src/store/__tests__/useUserStore.test.ts`
- `src/store/__tests__/useLibraryStore.test.ts`
- `src/store/__tests__/useGachaStore.test.ts`
- `src/store/__tests__/useCreationStore.test.ts`
- `src/store/__tests__/useGalleryStore.test.ts`

**Don't touch:**
- `src/pages/**`（Plan 3-4 处理）
- `src/store/AppState.tsx` `gameStore.ts` `patternData.ts`（Plan 4 逐页迁移时再删）
- `src/components/**`（Plan 2 视觉系统处理）

---

## Task 1: 安装新依赖

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`（npm 自动）

- [ ] **Step 1: 检查现有 deps 不冲突**

Run:
```bash
cd "D:/desktop/纹脉/wenmai" && npm ls react react-dom typescript 2>&1 | head -10
```
Expected: react 19.2.x, typescript 6.x（无冲突）

- [ ] **Step 2: 安装运行时依赖**

Run:
```bash
cd "D:/desktop/纹脉/wenmai" && npm install zustand@^5 react-router-dom@^7
```
Expected: package.json 增加 `zustand` 和 `react-router-dom`

- [ ] **Step 3: 验证版本写入**

Run:
```bash
cd "D:/desktop/纹脉/wenmai" && node -e "console.log(require('./package.json').dependencies)"
```
Expected output 包含: `'zustand': '^5.x.x'`, `'react-router-dom': '^7.x.x'`

- [ ] **Step 4: 验证 import 可用**

Create `src/_tmp_verify.ts`:
```ts
import { create } from 'zustand'
import { BrowserRouter } from 'react-router-dom'
console.log(create, BrowserRouter)
```
Run: `cd "D:/desktop/纹脉/wenmai" && npx tsc --noEmit src/_tmp_verify.ts`
Expected: 无错误
Delete: `src/_tmp_verify.ts`

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add package.json package-lock.json && git commit -m "chore: add zustand and react-router-dom for v3 foundation"
```

---

## Task 2: 升级 TS strict 配置

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: 看当前 tsconfig**

Run:
```bash
cd "D:/desktop/纹脉/wenmai" && cat tsconfig.json
```
Note 当前 strict 状态（可能是 false 或未设）

- [ ] **Step 2: 不动 strict 主开关，先在新文件 strict**

由于现有 `.jsx/.js` 未 TS 化，全局开 strict 会爆错。改策略：**为 src/design-system, src/store, src/types, src/hooks 等新目录单独开 strict**。

Modify `tsconfig.json` 加 `paths` + `include` 不变，新增子 config:

Create `src/design-system/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- [ ] **Step 3: 同样建 src/store, src/types, src/hooks 的 tsconfig**

Create `src/store/tsconfig.json`, `src/types/tsconfig.json`, `src/hooks/tsconfig.json` 同上内容。

- [ ] **Step 4: 验证子 tsconfig 生效**

Create `src/store/_tmp_strict_check.ts`:
```ts
function add(a: number, b: number) {
  return a + b
}
add(1, '2' as any)  // 应该报错 if strict
```
Run: `cd "D:/desktop/纹脉/wenmai" && npx tsc --noEmit -p src/store/tsconfig.json`
Expected: 报错 `Argument of type 'string' is not assignable to parameter of type 'number'`
Delete: `src/store/_tmp_strict_check.ts`

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add tsconfig.json src/design-system/tsconfig.json src/store/tsconfig.json src/types/tsconfig.json src/hooks/tsconfig.json && git commit -m "chore: enable TS strict in new v3 directories"
```

---

## Task 3: 共享类型定义

**Files:**
- Create: `src/types/pattern.ts`
- Create: `src/types/creation.ts`
- Create: `src/types/gallery.ts`
- Create: `src/types/user.ts`
- Create: `src/types/gacha.ts`
- Create: `src/types/series-theme.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: 写 pattern.ts**

```ts
// src/types/pattern.ts
export type Rarity = 'common' | 'rare' | 'ssr'

export type PatternType =
  | '云纹' | '兽面纹' | '龙纹' | '卷草纹' | '花卉纹' | '几何纹'
  | '角花' | '四方连续' | '山海经' | '青花瓷'

export type SeriesId =
  | 'cloud' | 'taotie' | 'dragon' | 'scroll' | 'floral' | 'geometric'
  | 'corner' | 'tile' | 'shanjing' | 'qinghua' | 'ai' | 'neutral'

export interface Pattern {
  id: string
  name: string
  type: PatternType
  series: SeriesId
  rarity: Rarity
  tags: string[]
  image: string
}

export interface SeriesInfo {
  id: SeriesId
  name: string
  description: string
  color: string
}
```

- [ ] **Step 2: 写 creation.ts**

```ts
// src/types/creation.ts
export type CreationMode = 'free' | 'guided' | 'preview'
export type GuidedSubMode = 'symmetry' | 'jigsaw'
export type PreviewSubMode = 'relief' | 'shatter'

export interface Placement {
  id: string
  patternId: string
  x: number
  y: number
  rotation: number
  scale: number
  zIndex: number
}

export interface CanvasState {
  width: number
  height: number
  placements: Placement[]
  background?: string
}
```

- [ ] **Step 3: 写 gallery.ts**

```ts
// src/types/gallery.ts
export type WorkStatus = 'pending' | 'approved' | 'rejected'

export interface Work {
  id: string
  authorId: string
  authorName: string
  title: string
  description?: string
  coverUrl: string
  placements: string  // JSON
  status: WorkStatus
  rejectReason?: string
  likesCount: number
  reuseCount: number
  forkedFrom?: string
  createdAt: string
  updatedAt: string
}

export interface Like {
  workId: string
  userId: string
  createdAt: string
}
```

- [ ] **Step 4: 写 user.ts**

```ts
// src/types/user.ts
export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  isAdmin: boolean
  createdAt: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error?: string
}
```

- [ ] **Step 5: 写 gacha.ts**

```ts
// src/types/gacha.ts
import type { Pattern } from './pattern'

export type GachaTier = 'common' | 'rare' | 'ssr'

export interface PullResult {
  id: string
  pattern: Pattern
  tier: GachaTier
  isNew: boolean
  pulledAt: string
}

export interface GachaHistory {
  totalPulls: number
  pityCounter: number  // 自上次 SSR 起计数
  lastPullAt?: string
}
```

- [ ] **Step 6: 写 series-theme.ts**

```ts
// src/types/series-theme.ts
import type { SeriesId } from './pattern'

export type ParticleType = 'sparkle' | 'mist' | 'cloud' | 'rust' | 'growth' | 'none'
export type DecorationType = 'cloud' | 'seal' | 'bronze' | 'vine' | 'splash' | 'none'
export type CardBorderStyle = 'soft' | 'gold-line' | 'ink-line' | 'splash'
export type SeriesIntensity = 'full' | 'subtle' | 'minimal'

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
}
```

- [ ] **Step 7: 写 index.ts barrel**

```ts
// src/types/index.ts
export * from './pattern'
export * from './creation'
export * from './gallery'
export * from './user'
export * from './gacha'
export * from './series-theme'
```

- [ ] **Step 8: 类型检查**

Run: `cd "D:/desktop/纹脉/wenmai" && npx tsc --noEmit -p src/types/tsconfig.json`
Expected: 无错误

- [ ] **Step 9: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/types/ && git commit -m "feat(types): add v3 shared type definitions"
```

---

## Task 4: Design tokens CSS

**Files:**
- Create: `src/design-system/tokens/colors.css`
- Create: `src/design-system/tokens/typography.css`
- Create: `src/design-system/tokens/spacing.css`
- Create: `src/design-system/tokens/shadows.css`
- Modify: `src/index.css`

- [ ] **Step 1: 写 colors.css**

```css
/* src/design-system/tokens/colors.css */
:root {
  /* 基座 */
  --color-bg-base: #0F0F10;
  --color-bg-elevated: #1A1A1C;
  --color-bg-card: #1F1F22;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.16);

  /* 文字 */
  --color-text-primary: #F5F1E8;
  --color-text-secondary: #8A8A8A;
  --color-text-dim: #4A4A4A;

  /* 强调（由 SeriesSkin 注入） */
  --color-accent: #D4AF6A;
  --color-accent-soft: rgba(212, 175, 106, 0.2);
  --color-accent-text: #F5E7B8;

  /* 状态 */
  --color-success: #98FB98;
  --color-warning: #FFD700;
  --color-danger: #C41E3A;
}
```

- [ ] **Step 2: 写 typography.css**

```css
/* src/design-system/tokens/typography.css */
:root {
  --font-serif: 'Noto Serif SC', 'STSong', Georgia, serif;
  --font-display: 'Noto Serif SC', 'STSong', Georgia, serif;
  --font-mono: 'IBM Plex Mono', 'Courier New', monospace;
  --font-seal: 'Ma Shan Zheng', 'STKaiti', cursive;

  --text-xs: 10px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 28px;
  --text-display: 56px;

  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-loose: 1.8;

  --tracking-tight: -0.01em;
  --tracking-normal: 0;
  --tracking-wide: 0.08em;
  --tracking-wider: 0.2em;
}
```

- [ ] **Step 3: 写 spacing.css**

```css
/* src/design-system/tokens/spacing.css */
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-full: 9999px;
}
```

- [ ] **Step 4: 写 shadows.css**

```css
/* src/design-system/tokens/shadows.css */
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-elevated: 0 8px 32px rgba(0, 0, 0, 0.6);
  --shadow-glow: 0 0 16px var(--color-accent-soft);
}
```

- [ ] **Step 5: 改 src/index.css 引入 tokens**

Read 当前 `src/index.css` 前 5 行（保留 @import "tailwindcss" 等），在 `@theme {}` 块**之前**加：

```css
@import "./design-system/tokens/colors.css";
@import "./design-system/tokens/typography.css";
@import "./design-system/tokens/spacing.css";
@import "./design-system/tokens/shadows.css";
```

放在 `@import "tailwindcss";` 之后、`@import "./styles/gacha-animations.css";` 之前。

- [ ] **Step 6: 验证 token 在浏览器生效**

Run dev server: `cd "D:/desktop/纹脉/wenmai" && npm run dev`
浏览器打开 http://localhost:5173/，DevTools Console 输入：
```js
getComputedStyle(document.documentElement).getPropertyValue('--color-bg-base')
```
Expected: `#0F0F10`（或 ` #0F0F10` 带空格）

输入：
```js
getComputedStyle(document.documentElement).getPropertyValue('--text-display')
```
Expected: `56px`

- [ ] **Step 7: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/design-system/tokens/ src/index.css && git commit -m "feat(design-system): add CSS tokens (colors/typography/spacing/shadows)"
```

---

## Task 5: 基础组件 Button

**Files:**
- Create: `src/design-system/components/Button.tsx`
- Test: `src/design-system/components/__tests__/Button.test.tsx`

- [ ] **Step 1: 写 Button 测试**

```tsx
// src/design-system/components/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from '../Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick} disabled>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies variant class', () => {
    render(<Button variant="primary">Click</Button>)
    expect(screen.getByText('Click').closest('button')).toHaveClass('btn-variant-primary')
  })
})
```

注意：测试需要 `@testing-library/react`。检查是否已装：
```bash
cd "D:/desktop/纹脉/wenmai" && npm ls @testing-library/react 2>&1
```
如未装：`npm install -D @testing-library/react @testing-library/jest-dom`

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/Button.test.tsx`
Expected: FAIL（Button 模块不存在）

- [ ] **Step 3: 写 Button 实现**

```tsx
// src/design-system/components/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const sizeClass: Record<Size, string> = {
  sm: 'btn-size-sm',
  md: 'btn-size-md',
  lg: 'btn-size-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = ['ds-btn', `btn-variant-${variant}`, sizeClass[size], className]
    .filter(Boolean).join(' ')
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
```

- [ ] **Step 4: 加 Button 样式（与 token 联动）**

Create `src/design-system/components/Button.css`:
```css
.ds-btn {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  letter-spacing: var(--tracking-wide);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  color: var(--color-text-primary);
}
.ds-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ds-btn:not(:disabled):hover { transform: translateY(-1px); }

.btn-variant-primary {
  background: var(--color-accent);
  color: var(--color-bg-base);
  border-color: var(--color-accent);
}
.btn-variant-secondary {
  background: transparent;
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.btn-variant-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
.btn-variant-danger {
  background: var(--color-danger);
  color: var(--color-text-primary);
  border-color: var(--color-danger);
}

.btn-size-sm { font-size: var(--text-sm); padding: var(--space-1) var(--space-3); }
.btn-size-md { font-size: var(--text-base); padding: var(--space-2) var(--space-4); }
.btn-size-lg { font-size: var(--text-lg); padding: var(--space-3) var(--space-6); }
```

在 `src/design-system/components/Button.tsx` 顶部加：
```tsx
import './Button.css'
```

- [ ] **Step 5: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/Button.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 6: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/design-system/components/Button.tsx src/design-system/components/Button.css src/design-system/components/__tests__/ && git commit -m "feat(design-system): add Button component with variants and sizes"
```

---

## Task 6: 基础组件 Card

**Files:**
- Create: `src/design-system/components/Card.tsx`
- Create: `src/design-system/components/Card.css`
- Test: `src/design-system/components/__tests__/Card.test.tsx`

- [ ] **Step 1: 写 Card 测试**

```tsx
// src/design-system/components/__tests__/Card.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from '../Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies variant class', () => {
    render(<Card variant="elevated">Content</Card>)
    expect(screen.getByText('Content').closest('div')).toHaveClass('ds-card', 'card-variant-elevated')
  })

  it('renders header and footer when provided', () => {
    render(
      <Card header={<div>Title</div>} footer={<div>Foot</div>}>
        Body
      </Card>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Foot')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/Card.test.tsx`
Expected: FAIL

- [ ] **Step 3: 写 Card 实现**

```tsx
// src/design-system/components/Card.tsx
import type { ReactNode } from 'react'
import './Card.css'

type Variant = 'flat' | 'elevated' | 'glass'

export interface CardProps {
  variant?: Variant
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}

export default function Card({
  variant = 'flat',
  header,
  footer,
  children,
  className = '',
}: CardProps) {
  const cls = ['ds-card', `card-variant-${variant}`, className]
    .filter(Boolean).join(' ')
  return (
    <div className={cls}>
      {header && <div className="ds-card-header">{header}</div>}
      <div className="ds-card-body">{children}</div>
      {footer && <div className="ds-card-footer">{footer}</div>}
    </div>
  )
}
```

- [ ] **Step 4: 写 Card.css**

```css
.ds-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.card-variant-flat { background: var(--color-bg-card); }
.card-variant-elevated {
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-card);
}
.card-variant-glass {
  background: rgba(31, 31, 34, 0.6);
  backdrop-filter: blur(8px);
}
.ds-card-header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.ds-card-body { padding: var(--space-4); }
.ds-card-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}
```

- [ ] **Step 5: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/Card.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 6: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/design-system/components/Card.tsx src/design-system/components/Card.css src/design-system/components/__tests__/Card.test.tsx && git commit -m "feat(design-system): add Card component with variants"
```

---

## Task 7: 基础组件 Modal

**Files:**
- Create: `src/design-system/components/Modal.tsx`
- Create: `src/design-system/components/Modal.css`
- Test: `src/design-system/components/__tests__/Modal.test.tsx`

- [ ] **Step 1: 写 Modal 测试**

```tsx
// src/design-system/components/__tests__/Modal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal'

describe('Modal', () => {
  it('does not render when open is false', () => {
    render(<Modal open={false}>Content</Modal>)
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders children when open', () => {
    render(<Modal open>Content</Modal>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onClose when backdrop clicked', () => {
    const handleClose = vi.fn()
    render(<Modal open onClose={handleClose}>Content</Modal>)
    fireEvent.click(document.querySelector('.ds-modal-backdrop')!)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when content clicked', () => {
    const handleClose = vi.fn()
    render(<Modal open onClose={handleClose}><div>Inner</div></Modal>)
    fireEvent.click(screen.getByText('Inner'))
    expect(handleClose).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/Modal.test.tsx`
Expected: FAIL

- [ ] **Step 3: 写 Modal 实现**

```tsx
// src/design-system/components/Modal.tsx
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import './Modal.css'

export interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  title?: string
}

export default function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="ds-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div className="ds-modal-content">
        {title && <div className="ds-modal-title">{title}</div>}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 写 Modal.css**

```css
.ds-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}
.ds-modal-content {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  box-shadow: var(--shadow-elevated);
}
.ds-modal-title {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-primary);
}
```

- [ ] **Step 5: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/Modal.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 6: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/design-system/components/Modal.tsx src/design-system/components/Modal.css src/design-system/components/__tests__/Modal.test.tsx && git commit -m "feat(design-system): add Modal component with backdrop and ESC handling"
```

---

## Task 8: 11 个系列皮肤定义

**Files:**
- Create: `src/design-system/series/themes.ts`

- [ ] **Step 1: 写 themes.ts（11 系列 + neutral）**

```ts
// src/design-system/series/themes.ts
import type { SeriesTheme } from '../../types/series-theme'

export const SERIES_THEMES: Record<string, SeriesTheme> = {
  qinghua: {
    id: 'qinghua',
    name: '青花瓷',
    primary: '#87CEEB',
    soft: 'rgba(135, 206, 235, 0.2)',
    bgGradient: 'linear-gradient(180deg, #0a1f3d 0%, #1E4D8C 50%, #0a1f3d 100%)',
    particle: 'sparkle',
    decoration: 'splash',
    cardBorder: 'soft',
    textGlow: true,
  },
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
  },
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
  },
  taotie: {
    id: 'taotie',
    name: '饕餮',
    primary: '#8B7355',
    soft: 'rgba(139, 115, 85, 0.2)',
    bgGradient: 'radial-gradient(ellipse at center, #1a2818 0%, #0a0f08 100%)',
    particle: 'rust',
    decoration: 'bronze',
    cardBorder: 'soft',
    textGlow: false,
  },
  scroll: {
    id: 'scroll',
    name: '唐草',
    primary: '#98FB98',
    soft: 'rgba(152, 251, 152, 0.2)',
    bgGradient: 'linear-gradient(135deg, #0f1a08 0%, #1f2a10 50%, #0f1a08 100%)',
    particle: 'growth',
    decoration: 'vine',
    cardBorder: 'soft',
    textGlow: false,
  },
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
  },
  floral: {
    id: 'floral',
    name: '花卉',
    primary: '#FFB6C1',
    soft: 'rgba(255, 182, 193, 0.2)',
    bgGradient: 'linear-gradient(180deg, #2a1a1f 0%, #1a0f10 100%)',
    particle: 'sparkle',
    decoration: 'splash',
    cardBorder: 'soft',
    textGlow: false,
  },
  geometric: {
    id: 'geometric',
    name: '几何',
    primary: '#DDA0DD',
    soft: 'rgba(221, 160, 221, 0.2)',
    bgGradient: 'linear-gradient(180deg, #1a0f1f 0%, #0f0810 100%)',
    particle: 'none',
    decoration: 'none',
    cardBorder: 'ink-line',
    textGlow: false,
  },
  corner: {
    id: 'corner',
    name: '角花',
    primary: '#F0E68C',
    soft: 'rgba(240, 230, 140, 0.2)',
    bgGradient: 'linear-gradient(180deg, #1f1f0a 0%, #0f0f08 100%)',
    particle: 'none',
    decoration: 'splash',
    cardBorder: 'gold-line',
    textGlow: false,
  },
  tile: {
    id: 'tile',
    name: '四方连续',
    primary: '#B0C4DE',
    soft: 'rgba(176, 196, 222, 0.2)',
    bgGradient: 'linear-gradient(180deg, #0a0f1a 0%, #1a1f2a 100%)',
    particle: 'none',
    decoration: 'none',
    cardBorder: 'soft',
    textGlow: false,
  },
  ai: {
    id: 'ai',
    name: 'AI 元素库',
    primary: '#9b59b6',
    soft: 'rgba(155, 89, 182, 0.2)',
    bgGradient: 'linear-gradient(180deg, #1a0a2a 0%, #0f051a 100%)',
    particle: 'sparkle',
    decoration: 'none',
    cardBorder: 'soft',
    textGlow: true,
  },
  neutral: {
    id: 'neutral',
    name: '中性',
    primary: '#D4AF6A',
    soft: 'rgba(212, 175, 106, 0.15)',
    bgGradient: 'var(--color-bg-base)',
    particle: 'none',
    decoration: 'none',
    cardBorder: 'soft',
    textGlow: false,
  },
}

export function getSeriesTheme(id: string): SeriesTheme {
  return SERIES_THEMES[id] ?? SERIES_THEMES.neutral
}
```

- [ ] **Step 2: 类型检查**

Run: `cd "D:/desktop/纹脉/wenmai" && npx tsc --noEmit -p src/design-system/tsconfig.json`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/design-system/series/themes.ts && git commit -m "feat(design-system): define 11 series themes + neutral"
```

---

## Task 9: SeriesSkin 组件（v1，无动效）

**Files:**
- Create: `src/design-system/components/SeriesSkin.tsx`
- Create: `src/design-system/components/SeriesSkin.css`
- Test: `src/design-system/components/__tests__/SeriesSkin.test.tsx`

- [ ] **Step 1: 写 SeriesSkin 测试**

```tsx
// src/design-system/components/__tests__/SeriesSkin.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SeriesSkin from '../SeriesSkin'

describe('SeriesSkin', () => {
  it('renders children', () => {
    render(<SeriesSkin series="qinghua"><div>Content</div></SeriesSkin>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies series CSS variables to wrapper', () => {
    render(<SeriesSkin series="qinghua"><div>Content</div></SeriesSkin>)
    const wrapper = screen.getByText('Content').parentElement!
    expect(wrapper.style.getPropertyValue('--series-primary')).toBe('#87CEEB')
  })

  it('falls back to neutral for unknown series', () => {
    render(<SeriesSkin series="unknown"><div>Content</div></SeriesSkin>)
    const wrapper = screen.getByText('Content').parentElement!
    expect(wrapper.className).toContain('series-neutral')
  })

  it('applies intensity class', () => {
    render(<SeriesSkin series="qinghua" intensity="subtle"><div>Content</div></SeriesSkin>)
    const wrapper = screen.getByText('Content').parentElement!
    expect(wrapper.className).toContain('intensity-subtle')
  })
})
```

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/SeriesSkin.test.tsx`
Expected: FAIL

- [ ] **Step 3: 写 SeriesSkin 实现**

```tsx
// src/design-system/components/SeriesSkin.tsx
import type { ReactNode } from 'react'
import type { SeriesIntensity } from '../../types/series-theme'
import { getSeriesTheme } from '../series/themes'
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
  const wrapperStyle = {
    '--series-primary': theme.primary,
    '--series-soft': theme.soft,
    '--series-bg': theme.bgGradient,
    '--series-text': theme.textGlow ? theme.primary : 'var(--color-text-primary)',
  } as React.CSSProperties

  const cls = [
    'ds-series-skin',
    `series-${theme.id}`,
    `intensity-${intensity}`,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} style={wrapperStyle}>
      {intensity === 'full' && (
        <div className="series-bg-layer" aria-hidden />
      )}
      <div className="series-content">{children}</div>
    </div>
  )
}
```

- [ ] **Step 4: 写 SeriesSkin.css**

```css
.ds-series-skin {
  position: relative;
  background: var(--color-bg-base);
  color: var(--series-text);
}
.ds-series-skin.intensity-full {
  background: var(--series-bg);
}
.ds-series-skin.intensity-subtle {
  background: var(--series-bg);
  opacity: 0.5;
}
.ds-series-skin.intensity-minimal {
  /* 仅 CSS variables，背景由父控制 */
}
.series-bg-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.series-content {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 5: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/SeriesSkin.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 6: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/design-system/components/SeriesSkin.tsx src/design-system/components/SeriesSkin.css src/design-system/components/__tests__/SeriesSkin.test.tsx && git commit -m "feat(design-system): add SeriesSkin component (CSS variables + bg layer, no animation yet)"
```

---

## Task 10: 基础组件 PatternImage

**Files:**
- Create: `src/design-system/components/PatternImage.tsx`
- Create: `src/design-system/components/PatternImage.css`
- Test: `src/design-system/components/__tests__/PatternImage.test.tsx`

- [ ] **Step 1: 写 PatternImage 测试**

```tsx
// src/design-system/components/__tests__/PatternImage.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PatternImage from '../PatternImage'

describe('PatternImage', () => {
  it('renders img with src', () => {
    render(<PatternImage src="/test.webp" alt="test" />)
    const img = screen.getByAltText('test') as HTMLImageElement
    expect(img.src).toContain('/test.webp')
  })

  it('applies size class', () => {
    render(<PatternImage src="/test.webp" alt="test" size="lg" />)
    expect(screen.getByAltText('test')).toHaveClass('pi-size-lg')
  })

  it('shows fallback on error', () => {
    render(<PatternImage src="/test.webp" alt="test" fallback={<div>FB</div>} />)
    const img = screen.getByAltText('test')
    fireEvent.error(img)
    expect(screen.getByText('FB')).toBeInTheDocument()
  })
})
```

注意：上面用 fireEvent，需 import。

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/PatternImage.test.tsx`
Expected: FAIL

- [ ] **Step 3: 写 PatternImage 实现**

```tsx
// src/design-system/components/PatternImage.tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import './PatternImage.css'

type Size = 'sm' | 'md' | 'lg' | 'full'

export interface PatternImageProps {
  src: string
  alt: string
  size?: Size
  fallback?: ReactNode
  className?: string
}

export default function PatternImage({
  src,
  alt,
  size = 'md',
  fallback,
  className = '',
}: PatternImageProps) {
  const [errored, setErrored] = useState(false)

  if (errored && fallback) {
    return <div className={`pi-fallback pi-size-${size} ${className}`}>{fallback}</div>
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`ds-pattern-image pi-size-${size} ${className}`}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )
}
```

- [ ] **Step 4: 写 PatternImage.css**

```css
.ds-pattern-image {
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 0 8px var(--series-soft, transparent));
}
.pi-size-sm { width: 40px; height: 40px; }
.pi-size-md { width: 80px; height: 80px; }
.pi-size-lg { width: 160px; height: 160px; }
.pi-size-full { width: 100%; height: auto; }
.pi-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
}
```

- [ ] **Step 5: 修测试加 fireEvent import**

测试文件第 2 行改：
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
```

- [ ] **Step 6: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/design-system/components/__tests__/PatternImage.test.tsx`
Expected: PASS（3 tests）

- [ ] **Step 7: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/design-system/components/PatternImage.tsx src/design-system/components/PatternImage.css src/design-system/components/__tests__/PatternImage.test.tsx && git commit -m "feat(design-system): add PatternImage component with size variants and error fallback"
```

---

## Task 11: design-system barrel export

**Files:**
- Create: `src/design-system/index.ts`

- [ ] **Step 1: 写 index.ts**

```ts
// src/design-system/index.ts
export { default as Button } from './components/Button'
export type { ButtonProps } from './components/Button'
export { default as Card } from './components/Card'
export type { CardProps } from './components/Card'
export { default as Modal } from './components/Modal'
export type { ModalProps } from './components/Modal'
export { default as PatternImage } from './components/PatternImage'
export type { PatternImageProps } from './components/PatternImage'
export { default as SeriesSkin } from './components/SeriesSkin'
export type { SeriesSkinProps } from './components/SeriesSkin'
export { SERIES_THEMES, getSeriesTheme } from './series/themes'
```

- [ ] **Step 2: 类型检查 + 全量测试**

Run:
```bash
cd "D:/desktop/纹脉/wenmai" && npx tsc --noEmit -p src/design-system/tsconfig.json && npx vitest run src/design-system/
```
Expected: 无 TS 错；所有 design-system 测试 PASS

- [ ] **Step 3: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/design-system/index.ts && git commit -m "feat(design-system): add barrel export"
```

---

## Task 12: zustand useUserStore

**Files:**
- Create: `src/store/useUserStore.ts`
- Test: `src/store/__tests__/useUserStore.test.ts`

- [ ] **Step 1: 写 store 测试**

```ts
// src/store/__tests__/useUserStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore } from '../useUserStore'

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.getState().reset()
  })

  it('starts with null user', () => {
    expect(useUserStore.getState().user).toBeNull()
  })

  it('sets user', () => {
    const user = {
      id: 'u1', email: 'a@b.c', displayName: 'A',
      isAdmin: false, createdAt: '2026-01-01',
    }
    useUserStore.getState().setUser(user)
    expect(useUserStore.getState().user?.id).toBe('u1')
  })

  it('clears user on logout', () => {
    useUserStore.getState().setUser({
      id: 'u1', email: 'a@b.c', displayName: 'A',
      isAdmin: false, createdAt: '2026-01-01',
    })
    useUserStore.getState().logout()
    expect(useUserStore.getState().user).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useUserStore.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 store 实现**

```ts
// src/store/useUserStore.ts
import { create } from 'zustand'
import type { User } from '../types/user'

interface UserState {
  user: User | null
  loading: boolean
  error?: string
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
  logout: () => void
  reset: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  error: undefined,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, error: undefined }),
  reset: () => set({ user: null, loading: false, error: undefined }),
}))
```

- [ ] **Step 4: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useUserStore.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/store/useUserStore.ts src/store/__tests__/useUserStore.test.ts && git commit -m "feat(store): add useUserStore (zustand)"
```

---

## Task 13: zustand useLibraryStore

**Files:**
- Create: `src/store/useLibraryStore.ts`
- Test: `src/store/__tests__/useLibraryStore.test.ts`

- [ ] **Step 1: 写 store 测试**

```ts
// src/store/__tests__/useLibraryStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLibraryStore } from '../useLibraryStore'

describe('useLibraryStore', () => {
  beforeEach(() => {
    useLibraryStore.getState().reset()
  })

  it('starts empty', () => {
    const s = useLibraryStore.getState()
    expect(s.ownedPatternIds).toEqual([])
    expect(s.currentSeriesFilter).toBe('all')
  })

  it('adds owned pattern', () => {
    useLibraryStore.getState().addOwned('p1')
    useLibraryStore.getState().addOwned('p1')  // dup
    useLibraryStore.getState().addOwned('p2')
    expect(useLibraryStore.getState().ownedPatternIds).toEqual(['p1', 'p2'])
  })

  it('sets series filter', () => {
    useLibraryStore.getState().setSeriesFilter('qinghua')
    expect(useLibraryStore.getState().currentSeriesFilter).toBe('qinghua')
  })

  it('removes owned', () => {
    useLibraryStore.getState().addOwned('p1')
    useLibraryStore.getState().addOwned('p2')
    useLibraryStore.getState().removeOwned('p1')
    expect(useLibraryStore.getState().ownedPatternIds).toEqual(['p2'])
  })
})
```

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useLibraryStore.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 store 实现**

```ts
// src/store/useLibraryStore.ts
import { create } from 'zustand'
import type { SeriesId } from '../types/pattern'

interface LibraryState {
  ownedPatternIds: string[]
  currentSeriesFilter: SeriesId | 'all'
  addOwned: (id: string) => void
  removeOwned: (id: string) => void
  setSeriesFilter: (s: SeriesId | 'all') => void
  reset: () => void
}

export const useLibraryStore = create<LibraryState>((set) => ({
  ownedPatternIds: [],
  currentSeriesFilter: 'all',
  addOwned: (id) => set((s) => ({
    ownedPatternIds: s.ownedPatternIds.includes(id)
      ? s.ownedPatternIds
      : [...s.ownedPatternIds, id],
  })),
  removeOwned: (id) => set((s) => ({
    ownedPatternIds: s.ownedPatternIds.filter((p) => p !== id),
  })),
  setSeriesFilter: (filter) => set({ currentSeriesFilter: filter }),
  reset: () => set({ ownedPatternIds: [], currentSeriesFilter: 'all' }),
}))
```

- [ ] **Step 4: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useLibraryStore.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/store/useLibraryStore.ts src/store/__tests__/useLibraryStore.test.ts && git commit -m "feat(store): add useLibraryStore (zustand)"
```

---

## Task 14: zustand useGachaStore

**Files:**
- Create: `src/store/useGachaStore.ts`
- Test: `src/store/__tests__/useGachaStore.test.ts`

- [ ] **Step 1: 写 store 测试**

```ts
// src/store/__tests__/useGachaStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGachaStore } from '../useGachaStore'

describe('useGachaStore', () => {
  beforeEach(() => {
    useGachaStore.getState().reset()
  })

  it('starts with 0 pulls and pity 0', () => {
    const s = useGachaStore.getState()
    expect(s.history.totalPulls).toBe(0)
    expect(s.history.pityCounter).toBe(0)
  })

  it('records pull increments total', () => {
    useGachaStore.getState().recordPull({ id: 'r1', pattern: {} as any, tier: 'common', isNew: true, pulledAt: '2026-01-01' })
    expect(useGachaStore.getState().history.totalPulls).toBe(1)
  })

  it('ssr resets pity counter', () => {
    useGachaStore.getState().recordPull({ id: 'r1', pattern: {} as any, tier: 'common', isNew: true, pulledAt: 't1' })
    useGachaStore.getState().recordPull({ id: 'r2', pattern: {} as any, tier: 'rare', isNew: true, pulledAt: 't2' })
    expect(useGachaStore.getState().history.pityCounter).toBe(2)
    useGachaStore.getState().recordPull({ id: 'r3', pattern: {} as any, tier: 'ssr', isNew: true, pulledAt: 't3' })
    expect(useGachaStore.getState().history.pityCounter).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useGachaStore.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 store 实现**

```ts
// src/store/useGachaStore.ts
import { create } from 'zustand'
import type { PullResult, GachaHistory } from '../types/gacha'

interface GachaState {
  history: GachaHistory
  lastPull?: PullResult
  recordPull: (r: PullResult) => void
  reset: () => void
}

export const useGachaStore = create<GachaState>((set) => ({
  history: { totalPulls: 0, pityCounter: 0 },
  lastPull: undefined,
  recordPull: (r) => set((s) => {
    const isSsr = r.tier === 'ssr'
    return {
      lastPull: r,
      history: {
        totalPulls: s.history.totalPulls + 1,
        pityCounter: isSsr ? 0 : s.history.pityCounter + 1,
        lastPullAt: r.pulledAt,
      },
    }
  }),
  reset: () => set({ history: { totalPulls: 0, pityCounter: 0 }, lastPull: undefined }),
}))
```

- [ ] **Step 4: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useGachaStore.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/store/useGachaStore.ts src/store/__tests__/useGachaStore.test.ts && git commit -m "feat(store): add useGachaStore with pity counter"
```

---

## Task 15: zustand useCreationStore

**Files:**
- Create: `src/store/useCreationStore.ts`
- Test: `src/store/__tests__/useCreationStore.test.ts`

- [ ] **Step 1: 写 store 测试**

```ts
// src/store/__tests__/useCreationStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCreationStore } from '../useCreationStore'

describe('useCreationStore', () => {
  beforeEach(() => {
    useCreationStore.getState().reset()
  })

  it('starts in free mode', () => {
    expect(useCreationStore.getState().mode).toBe('free')
  })

  it('sets mode', () => {
    useCreationStore.getState().setMode('guided')
    expect(useCreationStore.getState().mode).toBe('guided')
  })

  it('adds placement', () => {
    const placement = { id: 'pl1', patternId: 'p1', x: 100, y: 200, rotation: 0, scale: 1, zIndex: 0 }
    useCreationStore.getState().addPlacement(placement)
    expect(useCreationStore.getState().placements).toHaveLength(1)
  })

  it('removes placement', () => {
    const placement = { id: 'pl1', patternId: 'p1', x: 100, y: 200, rotation: 0, scale: 1, zIndex: 0 }
    useCreationStore.getState().addPlacement(placement)
    useCreationStore.getState().removePlacement('pl1')
    expect(useCreationStore.getState().placements).toHaveLength(0)
  })

  it('clears canvas', () => {
    useCreationStore.getState().addPlacement({ id: 'pl1', patternId: 'p1', x: 0, y: 0, rotation: 0, scale: 1, zIndex: 0 })
    useCreationStore.getState().clearCanvas()
    expect(useCreationStore.getState().placements).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useCreationStore.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 store 实现**

```ts
// src/store/useCreationStore.ts
import { create } from 'zustand'
import type { Placement, CreationMode } from '../types/creation'

interface CreationState {
  mode: CreationMode
  placements: Placement[]
  canvasWidth: number
  canvasHeight: number
  setMode: (m: CreationMode) => void
  addPlacement: (p: Placement) => void
  updatePlacement: (id: string, patch: Partial<Placement>) => void
  removePlacement: (id: string) => void
  clearCanvas: () => void
  reset: () => void
}

export const useCreationStore = create<CreationState>((set) => ({
  mode: 'free',
  placements: [],
  canvasWidth: 1080,
  canvasHeight: 1080,
  setMode: (mode) => set({ mode }),
  addPlacement: (p) => set((s) => ({ placements: [...s.placements, p] })),
  updatePlacement: (id, patch) => set((s) => ({
    placements: s.placements.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  })),
  removePlacement: (id) => set((s) => ({
    placements: s.placements.filter((p) => p.id !== id),
  })),
  clearCanvas: () => set({ placements: [] }),
  reset: () => set({ mode: 'free', placements: [], canvasWidth: 1080, canvasHeight: 1080 }),
}))
```

- [ ] **Step 4: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useCreationStore.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/store/useCreationStore.ts src/store/__tests__/useCreationStore.test.ts && git commit -m "feat(store): add useCreationStore with placements CRUD"
```

---

## Task 16: zustand useGalleryStore

**Files:**
- Create: `src/store/useGalleryStore.ts`
- Test: `src/store/__tests__/useGalleryStore.test.ts`

- [ ] **Step 1: 写 store 测试**

```ts
// src/store/__tests__/useGalleryStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGalleryStore } from '../useGalleryStore'
import type { Work } from '../../types/gallery'

const mockWork = (id: string): Work => ({
  id, authorId: 'u1', authorName: 'A', title: 'T',
  coverUrl: '/c.webp', placements: '[]', status: 'approved',
  likesCount: 0, reuseCount: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01',
})

describe('useGalleryStore', () => {
  beforeEach(() => {
    useGalleryStore.getState().reset()
  })

  it('starts empty', () => {
    expect(useGalleryStore.getState().works).toEqual([])
    expect(useGalleryStore.getState().loading).toBe(false)
  })

  it('sets works', () => {
    useGalleryStore.getState().setWorks([mockWork('w1'), mockWork('w2')])
    expect(useGalleryStore.getState().works).toHaveLength(2)
  })

  it('toggles like', () => {
    useGalleryStore.getState().setWorks([mockWork('w1')])
    useGalleryStore.getState().toggleLike('w1')
    expect(useGalleryStore.getState().likedWorkIds).toContain('w1')
    expect(useGalleryStore.getState().works[0].likesCount).toBe(1)
    useGalleryStore.getState().toggleLike('w1')
    expect(useGalleryStore.getState().likedWorkIds).not.toContain('w1')
    expect(useGalleryStore.getState().works[0].likesCount).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试确认 fail**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useGalleryStore.test.ts`
Expected: FAIL

- [ ] **Step 3: 写 store 实现**

```ts
// src/store/useGalleryStore.ts
import { create } from 'zustand'
import type { Work } from '../types/gallery'

interface GalleryState {
  works: Work[]
  loading: boolean
  likedWorkIds: string[]
  setWorks: (w: Work[]) => void
  setLoading: (b: boolean) => void
  toggleLike: (id: string) => void
  reset: () => void
}

export const useGalleryStore = create<GalleryState>((set) => ({
  works: [],
  loading: false,
  likedWorkIds: [],
  setWorks: (works) => set({ works }),
  setLoading: (loading) => set({ loading }),
  toggleLike: (id) => set((s) => {
    const liked = s.likedWorkIds.includes(id)
    return {
      likedWorkIds: liked
        ? s.likedWorkIds.filter((i) => i !== id)
        : [...s.likedWorkIds, id],
      works: s.works.map((w) => w.id === id
        ? { ...w, likesCount: Math.max(0, w.likesCount + (liked ? -1 : 1)) }
        : w),
    }
  }),
  reset: () => set({ works: [], loading: false, likedWorkIds: [] }),
}))
```

- [ ] **Step 4: 运行测试确认 pass**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run src/store/__tests__/useGalleryStore.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/store/useGalleryStore.ts src/store/__tests__/useGalleryStore.test.ts && git commit -m "feat(store): add useGalleryStore with like toggle"
```

---

## Task 17: store barrel export + 全量测试

**Files:**
- Create: `src/store/index.ts`

- [ ] **Step 1: 写 index.ts**

```ts
// src/store/index.ts
export { useUserStore } from './useUserStore'
export { useLibraryStore } from './useLibraryStore'
export { useGachaStore } from './useGachaStore'
export { useCreationStore } from './useCreationStore'
export { useGalleryStore } from './useGalleryStore'
```

- [ ] **Step 2: 全量 store 测试 + TS 检查**

Run:
```bash
cd "D:/desktop/纹脉/wenmai" && npx tsc --noEmit -p src/store/tsconfig.json && npx vitest run src/store/
```
Expected: 无 TS 错；全部 18 store 测试 PASS（3+4+3+5+3=18）

- [ ] **Step 3: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/store/index.ts && git commit -m "feat(store): add barrel export for all 5 zustand stores"
```

---

## Task 18: 新目录结构占位

**Files:**
- Create: `src/app/.gitkeep`
- Create: `src/features/.gitkeep`
- Create: `src/lib/.gitkeep`
- Create: `src/hooks/useImagePreload.ts`
- Create: `src/hooks/index.ts`

- [ ] **Step 1: 创建占位文件**

```bash
cd "D:/desktop/纹脉/wenmai" && mkdir -p src/app src/features src/lib && touch src/app/.gitkeep src/features/.gitkeep src/lib/.gitkeep
```

- [ ] **Step 2: 写通用 hook useImagePreload**

```ts
// src/hooks/useImagePreload.ts
import { useEffect, useState } from 'react'

export function useImagePreload(urls: string[]): Record<string, boolean> {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    urls.forEach((url) => {
      if (loaded[url]) return
      const img = new Image()
      img.onload = () => {
        if (!cancelled) setLoaded((prev) => ({ ...prev, [url]: true }))
      }
      img.src = url
    })
    return () => { cancelled = true }
  }, [urls.join(',')])

  return loaded
}
```

- [ ] **Step 3: 写 hooks/index.ts**

```ts
// src/hooks/index.ts
export { useImagePreload } from './useImagePreload'
```

- [ ] **Step 4: 类型检查**

Run: `cd "D:/desktop/纹脉/wenmai" && npx tsc --noEmit -p src/hooks/tsconfig.json`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
cd "D:/desktop/纹脉/wenmai" && git add src/app/ src/features/ src/lib/ src/hooks/ && git commit -m "feat: add v3 directory structure placeholders (app/features/lib/hooks)"
```

---

## Task 19: 验证全量测试 + dev server + build

- [ ] **Step 1: 全量 vitest**

Run: `cd "D:/desktop/纹脉/wenmai" && npx vitest run`
Expected: 所有测试 PASS（含原 vlmMatch.test.ts 等 + 新增 25 测试）

- [ ] **Step 2: 启动 dev server 验证不破坏现有功能**

Run: `cd "D:/desktop/纹脉/wenmai" && npm run dev`（后台）
浏览器打开 http://localhost:5173/
Expected: 首页正常加载，无 console error，能导航到 Library/Gacha 等现有页面

- [ ] **Step 3: 验证 build 不破坏**

Run: `cd "D:/desktop/纹脉/wenmai" && npm run build`
Expected: build 成功，dist/ 生成

- [ ] **Step 4: 检查 bundle 大小变化**

Run:
```bash
cd "D:/desktop/纹脉/wenmai" && du -sh dist/ && ls -lh dist/assets/*.js | head -5
```
Note 当前总大小（Plan 5 验收时对比，新增应 ≤ 200KB gzipped）

- [ ] **Step 5: 关 dev server**

如果 dev server 在后台运行，stop it.

- [ ] **Step 6: 最终 commit（如果上面任何文件改动）**

如果上面 step 1-5 没有产生新改动，跳过此 step。否则：
```bash
cd "D:/desktop/纹脉/wenmai" && git add -A && git commit -m "chore: verify v3 foundation doesn't break existing build"
```

---

## Plan 1 完成验收

- [ ] 所有 19 task 完成
- [ ] design-system 5 基础组件 + 11 系列主题就绪（实际渲染在 Plan 2）
- [ ] 5 个 zustand store 全部单元测试 PASS
- [ ] 新目录结构占位
- [ ] TS strict 在新目录开启
- [ ] 现有功能（dev + build）不破坏
- [ ] 新增依赖总包体记录（Plan 5 验收对照）

完成后即可进入 Plan 2: 视觉系统（动效库接入 + SeriesSkin 完整渲染 + 11 系列皮肤的实际视觉/动效实现）。

---

## Self-Review 记录

- ✅ Spec coverage: §5 (zustand) → Task 12-17；§6 (TS) → Task 2；§8 (目录) → Task 18；§3.2 (tokens) → Task 4；§3.3 (系列主题) → Task 8；§3.4 (SeriesSkin) → Task 9
- ✅ Placeholder scan: 无 TBD/TODO，所有代码完整
- ✅ Type consistency: SeriesTheme 字段在 §8/§9/§10 一致；Button variant/size 在 Task 5 一致；zustand store API 在 Task 12-17 一致
