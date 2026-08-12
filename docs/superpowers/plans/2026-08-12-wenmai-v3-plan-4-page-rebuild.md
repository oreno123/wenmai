# 纹脉 v3 重构 Plan 4: 页面重做 + TS 化 + SeriesSkin 挂载 + CreatePage 3 模式 + features/ 打包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 3 把路由切换到 React Router v7、搭好 `src/app/` shell，但所有页面与组件还是 `.jsx`、`/create` 路由直接挂 `PuzzlePage`、`SeriesSkin` 只在 `/demo/series/:id` 用过、6 处过时 `navigate('/editor')` / `navigate('/showcase')` 还在、`auth.js` 仍是 `.js`、`src/features/` 是空 `.gitkeep`。Plan 4 一次性把这些做完：清理 + `auth.ts` + `SeriesSkin` 全站挂载 + `CreatePage` 3 模式切换 + 13 页面 + ~25 组件全部 `.jsx → .tsx` + `features/gallery|gacha|create/` 目录打包 + bundle 预算验证。

**Architecture:** Plan 4 分 6 phase 共 19 task。Phase 1 清理与 `auth.ts` 是机械改动，先做完腾出干净地基；Phase 2 把 `SeriesSkin` 在 `Layout` 层按路由驱动挂上、`CreatePage` 做成 3 模式 shell（`mode=free|guided|preview`）+ `sub=symmetry|jigsaw` / `sub=relief|shatter` 二级；Phase 3 13 页面分批 `.jsx → .tsx`，按文件大小与依赖密度分组（PuzzlePage/Home/GachaPage 各单独一组，三个最大文件不挤一个任务）；Phase 4 ~25 组件按目录分组 TS 化；Phase 5 `features/` 打包只搬位置 + 改 import path，不动内部逻辑（避免和 TS 化同时改两层）；Phase 6 跑 Lighthouse 校验每路由初始加载 ≤ 200 kB gzip。

**Tech Stack:** React 19.2、react-router-dom 7.18、TypeScript 6.0.3（`strict: true`、`noUnusedLocals: true`、`noUnusedParameters: true`、`ignoreDeprecations: "6.0"`）、Vitest 2.1、React Testing Library 16.3、Vite 8、Three.js 0.184、framer-motion 12、zustand 5。

**Spec reference:** `docs/superpowers/specs/2026-08-12-wenmai-v3-refactor-design.md` §2.2 创作台 3 模式、§3.4 SeriesSkin API、§3.5 跨系列页面 neutral、§3.6 5 个背景组件处理、§6 TS 化、§8.1 目录结构、§9 页面重做优先级、§14 验收标准。

**决策日志（Plan 4 偏离 spec 的几点）：**
- **`features/` 打包机械搬，不重写** —— spec §8.1 把 `features/` 描绘成完整业务模块（含 components/store/utils）。Plan 4 只做"文件归位 + import path 更新"，store 仍留 `src/store/`，组件归位后旧的 `src/components/` 留空指针或删除。理由：一轮同时改文件位置 + 类型 + 内部逻辑容易乱；先把归位和 TS 化分别一轮做，后续 Plan 5+ 才动 store 拆分。
- **`auth.ts` 保留 hook 签名向后兼容** —— `useAuth()` 当前返回 `{ user, loading, configured }`，全站 8 处调用。`auth.js → auth.ts` 只加类型，不改 API。`App.tsx:20` 的 `as { user: { id: string } | null }` 断言顺势删掉。
- **`CreatePage` 用 query string 而非嵌套路由** —— spec §2.2 写的是 `/create?mode=free|guided|preview`。如果改成嵌套 `<Route>`（如 `/create/free`）会破坏 Plan 3 刚落地的 LegacyRedirects（`/puzzle → /create?mode=free` 等 8 条）。保留 query string，`mode` + `sub` 双层。Jigsaw/Composer/Editor/Showcase 不再单独挂在路由表，但保留组件文件供 `CreatePage` 内部 render。
- **`SeriesSkin` 在 Layout 层挂，不让每个页面自己包** —— spec §3.4 是"每页包 `<SeriesSkin>`"。实际操作 13 个页面分别改 wrapper 太散。Plan 4 把映射放到 `Layout`（基于 `useLocation().pathname`），页面本身不动。`PatternDetailPage` 是唯一例外，它需要根据纹样的 `series` 字段动态切换皮肤（不是路由驱动），Plan 4 让 `Layout` 对 `/pattern/:id` 路径跳过 SeriesSkin，由页面自己挂。
- **大文件单独成 task** —— PuzzlePage（1424 行）、Home（900+ 行）、GachaPage（大型）各自一个 task。机械规则"按目录批量"会让一个 task 同时改 3000+ 行，子代理容易超时。
- **bundle 预算改"每路由 ≤ 200 kB gzip"** —— Plan 3 实测 SplashPage 因为直接 `import * as THREE` 导致初始路由 ~325 kB gzip。Plan 4 不强制把 SplashPage 砍到 200 kB（那是 Plan 5 性能优化），但 Lighthouse 度量要给出数字、列出最大依赖。
- **`Composer / Editor / Showcase / JigsawPage` 路由表里删除，但文件保留** —— Plan 3 在 `Routes.tsx` 已没有这 4 个独立路由（它们之前是 `/composer` `/editor` 等，已重定向到 `/create?mode=*`）。Plan 4 Task 5 把它们的内容接入 `CreatePage` 子模式后，文件被新位置 import，原 `src/pages/X.jsx` 删除。

---

## File Structure

**Create (TS):**
- `src/lib/auth.ts` —— 替代 `src/lib/auth.js`
- `src/features/create/CreatePage.tsx` —— 3 模式 shell
- `src/features/create/modes/FreeMode.tsx` —— 包 PuzzlePage
- `src/features/create/modes/GuidedMode.tsx` —— 包 Composer + JigsawPage
- `src/features/create/modes/PreviewMode.tsx` —— 包 Editor + Showcase
- `src/features/create/ModeTabs.tsx` —— 3 tab 切换条
- `src/app/SeriesSkinLayer.tsx` —— 路由驱动 SeriesSkin 包装层
- `src/app/seriesRouteMap.ts` —— 路径 → 系列映射表
- `src/features/gallery/GalleryPage.tsx` —— 替代 `src/pages/GalleryPage.jsx`（Phase 5 搬位置）
- `src/features/gallery/WorkDetailPage.tsx`
- `src/features/gallery/AdminReviewPage.tsx`
- `src/features/gallery/components/WorkCard.tsx`
- `src/features/gallery/components/PublishModal.tsx`
- `src/features/gallery/components/AdminOnlyRoute.tsx`
- `src/features/gacha/GachaPage.tsx`
- `src/features/gacha/components/GachaPull.tsx`
- 其余页面/组件按 task 注明的目标路径创建

**Modify:**
- `src/app/App.tsx` —— 删 `as { user: ... }` 断言；`<AppRoutes>` 外面包 `<SeriesSkinLayer>`；`/create` 路由 element 改成 `<CreatePage>`
- `src/app/Routes.tsx` —— 删 `/create` 对 `PuzzlePage` 的直接挂载（由 `CreatePage` 接管）；删 `/landing` 路由（spec §2.1"隐"，Plan 4 正式下线，加 legacy redirect `→ /auth`）
- `src/app/LegacyRedirects.tsx` —— 加 `/landing → /auth` 一条
- `src/pages/Home.jsx` —— 改 `navigate('/showcase')` 等 6 处
- `src/components/PreviewScaleModal.jsx` —— 改 `navigate('/editor')` `navigate('/showcase')` 共 4 处
- 13 个 `.jsx` 页面 → `.tsx`（按 task 分批）
- ~25 个 `.jsx` 组件 → `.tsx`（按目录分批）

**Delete:**
- `src/lib/auth.js`（被 `auth.ts` 替代）
- `src/pages/Composer.jsx` `Editor.jsx` `JigsawPage.jsx` `Showcase.jsx` —— 内容移入 `features/create/modes/` 后删除
- `src/features/.gitkeep`
- `src/pages/QinghuaBrowser.jsx` —— Plan 3 重定向已把它合并进 `LibraryPage`，文件还在但未被 import。Plan 4 删除
- `src/pages/Landing.jsx` —— `/landing` 下线后没人 import，删

**Don't touch:**
- `src/design-system/**` —— Plan 2 已成型
- `src/store/**` —— spec §5 的 zustand 5 store 拆分是 Plan 5
- `src/engine/**`、`src/shaders/**`、`src/utils/**` —— 纯算法/工具，类型已在 Plan 2/3 处理
- `src/types/**` —— Plan 2 已建好
- `src/data/**` —— 静态数据
- `src/hooks/**`、`src/gesture-cards/**` —— 已是 TS

---

## Task 1: 清理 6 处过时 navigate 调用

**Files:**
- Modify: `src/pages/Home.jsx`
- Modify: `src/components/PreviewScaleModal.jsx`

**Why:** Plan 3 路由表里 `/editor` `/showcase` 都重定向到 `/create?mode=preview`。Home.jsx:573 还在 `navigate('/showcase')`、PreviewScaleModal.jsx 有 4 处 `navigate('/editor'/'/showcase')`。用户走过去会被 LegacyRedirects 弹到 `/create`，丢掉 `?sub=relief` / `?sub=shatter` 子模式信息。直接改成规范路径，方便 Task 5 在 `CreatePage` 内部根据 `sub` 切换。

- [ ] **Step 1: 修 Home.jsx:573**

打开 `src/pages/Home.jsx`，定位到 line 573（约）。该处原代码：

```jsx
navigate('/showcase')
```

替换为：

```jsx
navigate('/create?mode=preview&sub=shatter')
```

- [ ] **Step 2: 修 PreviewScaleModal.jsx:91（goToRelief）**

`goToRelief` callback 内 line 91 原：

```jsx
navigate('/editor')
```

替换为：

```jsx
navigate('/create?mode=preview&sub=relief')
```

- [ ] **Step 3: 修 PreviewScaleModal.jsx:143, 145, 148（goToShowcase 三处）**

`goToShowcase` callback 内三处 `navigate('/showcase')`（line 143 在 img.onload 里、line 145 在 img.onerror 里、line 148 在 catch 里），全部替换为：

```jsx
navigate('/create?mode=preview&sub=shatter')
```

- [ ] **Step 4: 手动回归**

Run: `npm run dev`

浏览器打开 `http://localhost:5173/home`，登录，完成一件作品，在预览 modal 里点"浮雕预览"和"碎裂展示"。两个按钮都应跳到 `/create?mode=preview&sub=relief` 或 `&sub=shatter`（Task 5 之前会显示 PuzzlePage 因为 `CreatePage` 还没建，但 URL 正确即可）。

- [ ] **Step 5: tsc 通过**

Run: `npx tsc --noEmit`
Expected: 0 errors（`.jsx` 不被 `tsconfig` 严格检查，但修改本身不应引入新 .ts 文件错误）。

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.jsx src/components/PreviewScaleModal.jsx
git commit -m "$(cat <<'EOF'
fix(create): replace 6 stale /editor and /showcase navigations with /create?mode=preview URLs

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: auth.js → auth.ts（移除 App.tsx 类型断言）

**Files:**
- Create: `src/lib/auth.ts`
- Delete: `src/lib/auth.js`
- Modify: `src/app/App.tsx`（删 line 20 的 `as { user: ... }`）

**Why:** `src/lib/auth.js` 因 `checkJs: false` 导致 `useAuth()` 推断返回 `{ user: null }`，`App.tsx` 不得不写 `as { user: { id: string } | null }` 断言。Plan 4 把 auth 改 `.ts`，给 Supabase `User` 类型补齐，断言删除。

- [ ] **Step 1: 写失败的测试**

Create `src/lib/__tests__/auth.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { useAuth } from '../auth'

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
  isSupabaseConfigured: false,
}))

function Consumer() {
  const { user, loading, configured } = useAuth()
  return (
    <div>
      <span data-testid="user">{user === null ? 'null' : 'user'}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="configured">{String(configured)}</span>
    </div>
  )
}

describe('useAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns typed null user when supabase is not configured', () => {
    const { getByTestId } = render(<Consumer />)
    expect(getByTestId('user').textContent).toBe('null')
    expect(getByTestId('loading').textContent).toBe('false')
    expect(getByTestId('configured').textContent).toBe('false')
  })
})
```

- [ ] **Step 2: 运行测试验证它失败**

Run: `npx vitest run src/lib/__tests__/auth.test.tsx`
Expected: FAIL with "Failed to resolve import '../auth'"（因为 `auth.ts` 还没建）。

- [ ] **Step 3: 创建 `src/lib/auth.ts`**

```ts
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'

export interface AuthState {
  user: User | null
  loading: boolean
  configured: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, loading, configured: isSupabaseConfigured }
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) return { data, error }

  if (data.user) {
    await supabase.from('profiles').upsert({
      user_id: data.user.id,
      username,
      library: [
        'basic-1', 'basic-2', 'basic-3',
        'dragon-4', 'cloud-4', 'taotie-3', 'scroll-3',
        'sj-7', 'sj-12',
      ],
      updated_at: new Date().toISOString(),
    })
  }
  return { data, error }
}

export async function signOut() {
  return supabase.auth.signOut()
}
```

- [ ] **Step 4: 删 `src/lib/auth.js`**

```bash
git rm src/lib/auth.js
```

- [ ] **Step 5: 修 `src/app/App.tsx:20`**

定位 `CloudSync` 内 line 20：

```tsx
const { user } = useAuth() as { user: { id: string } | null }
```

替换为：

```tsx
const { user } = useAuth()
```

- [ ] **Step 6: 跑测试**

Run: `npx vitest run src/lib/__tests__/auth.test.tsx`
Expected: PASS。

Run: `npx vitest run`
Expected: 全套通过（102 + 1 = 103 个测试）。

- [ ] **Step 7: tsc 通过**

Run: `npx tsc --noEmit`
Expected: 0 errors。如果报 `User` 类型 import 失败，确认 `@supabase/supabase-js` 已装（`package.json` 已有 `^2.108.1`）。

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/lib/__tests__/auth.test.tsx src/app/App.tsx
git commit -m "$(cat <<'EOF'
refactor(auth): migrate auth.js to auth.ts with typed User, drop App.tsx cast

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SeriesSkin 路由驱动挂载

**Files:**
- Create: `src/app/seriesRouteMap.ts`
- Create: `src/app/SeriesSkinLayer.tsx`
- Modify: `src/app/App.tsx`（`Layout` 内挂 `<SeriesSkinLayer>`）

**Why:** spec §3.5 / §3.4 要每页都套 `SeriesSkin`，13 页分别加 wrapper 太散。Plan 4 在 `Layout` 层加一个 `SeriesSkinLayer`，根据 `useLocation().pathname` 查 `seriesRouteMap` 得 series id，把 children 包进对应皮肤。`/pattern/:id` 路径特殊处理：`PatternDetailPage` 自己根据纹样 `series` 字段挂皮肤，`SeriesSkinLayer` 跳过该路径。

- [ ] **Step 1: 写失败的测试**

Create `src/app/__tests__/SeriesSkinLayer.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SeriesSkinLayer } from '../SeriesSkinLayer'
import { SERIES_ROUTE_MAP } from '../seriesRouteMap'

describe('SERIES_ROUTE_MAP', () => {
  it('maps /library to neutral', () => {
    expect(SERIES_ROUTE_MAP['/library']).toBe('neutral')
  })
  it('maps /create to neutral', () => {
    expect(SERIES_ROUTE_MAP['/create']).toBe('neutral')
  })
  it('maps /gallery to neutral', () => {
    expect(SERIES_ROUTE_MAP['/gallery']).toBe('neutral')
  })
  it('maps /gacha to dragon', () => {
    expect(SERIES_ROUTE_MAP['/gacha']).toBe('dragon')
  })
})

describe('SeriesSkinLayer', () => {
  it('renders children inside a SeriesSkin wrapper at /library', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/library']}>
        <Routes>
          <Route
            path="/library"
            element={
              <SeriesSkinLayer>
                <div data-testid="child">Library content</div>
              </SeriesSkinLayer>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    const skin = container.querySelector('.ds-series-skin')
    expect(skin).not.toBeNull()
    expect(skin?.classList.contains('series-neutral')).toBe(true)
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull()
  })

  it('skips skin wrapper at /pattern/:id (page mounts its own skin)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/pattern/qh-1']}>
        <Routes>
          <Route
            path="/pattern/:id"
            element={
              <SeriesSkinLayer>
                <div data-testid="child">Detail</div>
              </SeriesSkinLayer>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.querySelector('.ds-series-skin')).toBeNull()
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull()
  })

  it('renders skin at /gacha with dragon series', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/gacha']}>
        <Routes>
          <Route
            path="/gacha"
            element={
              <SeriesSkinLayer>
                <div>gacha</div>
              </SeriesSkinLayer>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    const skin = container.querySelector('.ds-series-skin')
    expect(skin?.classList.contains('series-dragon')).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试验证它失败**

Run: `npx vitest run src/app/__tests__/SeriesSkinLayer.test.tsx`
Expected: FAIL with "Failed to resolve import '../SeriesSkinLayer'" 和 "'SERIES_ROUTE_MAP' is not exported"。

- [ ] **Step 3: 创建 `src/app/seriesRouteMap.ts`**

```ts
import type { SeriesId } from '../types/pattern'

/**
 * 路径前缀 → 系列映射。Layout 用 useLocation().pathname 查这张表，
 * 把 children 包进对应 SeriesSkin。
 *
 * - 主 tab（/home, /library, /create, /gallery）和 /auth 用 neutral 基座。
 * - /gacha 抽卡沉浸感强，用 dragon 系列（金云纹 + 印章装饰）。
 * - /pattern/:id 不在此表，PatternDetailPage 自己根据纹样 series 字段挂皮肤。
 * - /admin /tools/curate /demo/* 不挂皮肤（工具页保持中性）。
 */
export const SERIES_ROUTE_MAP: Record<string, SeriesId> = {
  '/home': 'neutral',
  '/library': 'neutral',
  '/create': 'neutral',
  '/gallery': 'neutral',
  '/work': 'neutral',
  '/auth': 'neutral',
  '/photo-match': 'neutral',
  '/gacha': 'dragon',
}

/** 路径是否应由 SeriesSkinLayer 跳过皮肤包装（页面自己挂或保持基座）。 */
export function shouldSkipSkin(pathname: string): boolean {
  if (pathname === '/' || pathname === '/auth') return true
  if (pathname.startsWith('/pattern/')) return true
  if (pathname.startsWith('/admin')) return true
  if (pathname.startsWith('/tools/')) return true
  if (pathname.startsWith('/demo/')) return true
  return false
}

/** 从 pathname 解析最长匹配的 series id，未匹配返回 'neutral'。 */
export function resolveSeriesForPath(pathname: string): SeriesId {
  if (shouldSkipSkin(pathname)) return 'neutral'
  const sortedKeys = Object.keys(SERIES_ROUTE_MAP).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (pathname === key || pathname.startsWith(key + '/') || pathname.startsWith(key)) {
      return SERIES_ROUTE_MAP[key]
    }
  }
  return 'neutral'
}
```

- [ ] **Step 4: 创建 `src/app/SeriesSkinLayer.tsx`**

```tsx
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { SeriesSkin } from '../design-system'
import { resolveSeriesForPath, shouldSkipSkin } from './seriesRouteMap'

export interface SeriesSkinLayerProps {
  children: ReactNode
}

export function SeriesSkinLayer({ children }: SeriesSkinLayerProps) {
  const { pathname } = useLocation()

  if (shouldSkipSkin(pathname)) {
    return <>{children}</>
  }

  const series = resolveSeriesForPath(pathname)
  return (
    <SeriesSkin series={series} intensity="subtle" style={{ minHeight: '100vh' }}>
      {children}
    </SeriesSkin>
  )
}
```

- [ ] **Step 5: 修 `src/app/App.tsx`**

定位 `Layout` 组件内 `<AppRoutes />`（约 line 49），改为：

```tsx
return (
  <>
    <CloudSync />
    <Suspense fallback={null}>
      <GoldBackground />
    </Suspense>
    <SeriesSkinLayer>
      <AppRoutes />
    </SeriesSkinLayer>
    {showNav && <BottomNav />}
  </>
)
```

文件顶部加 import：

```tsx
import { SeriesSkinLayer } from './SeriesSkinLayer'
```

- [ ] **Step 6: 跑测试**

Run: `npx vitest run src/app/__tests__/SeriesSkinLayer.test.tsx`
Expected: PASS。

Run: `npx vitest run`
Expected: 全套通过。

- [ ] **Step 7: tsc 通过**

Run: `npx tsc --noEmit`
Expected: 0 errors。

- [ ] **Step 8: 手动回归**

Run: `npm run dev`

浏览器打开 `/home` `/library` `/gacha` `/create`，确认背景层从 SeriesSkin 来（每个系列有底色 + 装饰 + 粒子）。打开 `/pattern/qh-1`（qinghua 系列），`PatternDetailPage` 当前没挂 SeriesSkin，应显示之前的 GoldBackground 基座（Task 12 改 PatternDetailPage 时会补上）。

- [ ] **Step 9: Commit**

```bash
git add src/app/seriesRouteMap.ts src/app/SeriesSkinLayer.tsx src/app/__tests__/SeriesSkinLayer.test.tsx src/app/App.tsx
git commit -m "$(cat <<'EOF'
feat(app): mount SeriesSkin in Layout by pathname for all main routes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: CreatePage 3 模式 shell

**Files:**
- Create: `src/features/create/CreatePage.tsx`
- Create: `src/features/create/ModeTabs.tsx`
- Create: `src/features/create/__tests__/CreatePage.test.tsx`
- Modify: `src/app/Routes.tsx`（`/create` 改挂 `<CreatePage>`）
- Modify: `src/app/LegacyRedirects.tsx`（加 `/landing → /auth`）
- Delete: `src/pages/Landing.jsx`
- Modify: `src/app/Routes.tsx`（删 `/landing` 路由）

**Why:** spec §2.2 创作台 3 模式（free/guided/preview），Plan 3 只把 PuzzlePage 挂上。Plan 4 建一个 `CreatePage` shell：解析 `?mode=` + `?sub=`，顶部一个 3 tab 切换条，下面 lazy 加载对应 mode 组件。Task 4 只建 shell（默认 render FreeMode = PuzzlePage），Task 5 才把 Composer/Jigsaw/Editor/Showcase 接进 Guided/Preview。

- [ ] **Step 1: 写失败的测试**

Create `src/features/create/__tests__/CreatePage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CreatePage from '../CreatePage'

vi.mock('../../pages/PuzzlePage', () => ({
  __esModule: true,
  default: () => <div data-testid="free-mode">FreeMode</div>,
}))
vi.mock('../modes/GuidedMode', () => ({
  __esModule: true,
  default: () => <div data-testid="guided-mode">GuidedMode</div>,
}))
vi.mock('../modes/PreviewMode', () => ({
  __esModule: true,
  default: () => <div data-testid="preview-mode">PreviewMode</div>,
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/create" element={<CreatePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CreatePage', () => {
  it('renders FreeMode by default when no mode query', async () => {
    const { findByTestId } = renderAt('/create')
    expect(await findByTestId('free-mode')).toBeTruthy()
  })

  it('renders FreeMode when mode=free', async () => {
    const { findByTestId } = renderAt('/create?mode=free')
    expect(await findByTestId('free-mode')).toBeTruthy()
  })

  it('renders GuidedMode when mode=guided', async () => {
    const { findByTestId } = renderAt('/create?mode=guided')
    expect(await findByTestId('guided-mode')).toBeTruthy()
  })

  it('renders PreviewMode when mode=preview', async () => {
    const { findByTestId } = renderAt('/create?mode=preview')
    expect(await findByTestId('preview-mode')).toBeTruthy()
  })

  it('renders 3 mode tabs', () => {
    const { getAllByRole } = renderAt('/create')
    const tabs = getAllByRole('button').filter((b) =>
      ['自由', '引导', '预览'].some((t) => b.textContent?.includes(t)),
    )
    expect(tabs.length).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: 运行测试验证它失败**

Run: `npx vitest run src/features/create/__tests__/CreatePage.test.tsx`
Expected: FAIL with "Failed to resolve import '../CreatePage'"。

- [ ] **Step 3: 创建 `src/features/create/ModeTabs.tsx`**

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom'

export type CreateMode = 'free' | 'guided' | 'preview'

const TABS: { mode: CreateMode; cn: string; en: string }[] = [
  { mode: 'free', cn: '自 由', en: 'FREE' },
  { mode: 'guided', cn: '引 导', en: 'GUIDED' },
  { mode: 'preview', cn: '预 览', en: 'PREVIEW' },
]

export default function ModeTabs() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const current = (searchParams.get('mode') as CreateMode | null) ?? 'free'

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '8px 16px',
        borderBottom: '1px solid rgba(212,175,106,0.08)',
      }}
    >
      {TABS.map((t) => {
        const active = current === t.mode
        return (
          <button
            key={t.mode}
            onClick={() => navigate(`/create?mode=${t.mode}`)}
            data-active={active}
            style={{
              padding: '6px 16px',
              borderRadius: 14,
              fontSize: 12,
              fontFamily: 'Noto Serif SC, serif',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              background: active ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.02)',
              color: active ? '#F2D58A' : '#7A7060',
              border: active
                ? '1px solid rgba(212,175,106,0.3)'
                : '1px solid rgba(255,255,255,0.04)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontWeight: 600 }}>{t.cn}</span>
            <span
              style={{
                fontSize: 9,
                marginLeft: 6,
                letterSpacing: '0.3em',
                opacity: 0.7,
              }}
            >
              {t.en}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 创建 `src/features/create/modes/FreeMode.tsx`（薄壳）**

```tsx
import { lazy, Suspense } from 'react'

const PuzzlePage = lazy(() => import('../../../pages/PuzzlePage'))

export default function FreeMode() {
  return (
    <Suspense fallback={null}>
      <PuzzlePage />
    </Suspense>
  )
}
```

- [ ] **Step 5: 创建 `src/features/create/modes/GuidedMode.tsx`（占位，Task 5 填实）**

```tsx
export default function GuidedMode() {
  return (
    <div
      style={{
        padding: 24,
        textAlign: 'center',
        color: '#7A7060',
        fontFamily: 'Noto Serif SC, serif',
      }}
    >
      引导模式（Task 5 接入）
    </div>
  )
}
```

- [ ] **Step 6: 创建 `src/features/create/modes/PreviewMode.tsx`（占位，Task 5 填实）**

```tsx
export default function PreviewMode() {
  return (
    <div
      style={{
        padding: 24,
        textAlign: 'center',
        color: '#7A7060',
        fontFamily: 'Noto Serif SC, serif',
      }}
    >
      预览模式（Task 5 接入）
    </div>
  )
}
```

- [ ] **Step 7: 创建 `src/features/create/CreatePage.tsx`**

```tsx
import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import ModeTabs from './ModeTabs'

const FreeMode = lazy(() => import('./modes/FreeMode'))
const GuidedMode = lazy(() => import('./modes/GuidedMode'))
const PreviewMode = lazy(() => import('./modes/PreviewMode'))

export default function CreatePage() {
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') ?? 'free'

  return (
    <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
      <ModeTabs />
      <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#7A7060' }}>载入中</div>}>
        {mode === 'free' && <FreeMode />}
        {mode === 'guided' && <GuidedMode />}
        {mode === 'preview' && <PreviewMode />}
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 8: 改 `src/app/Routes.tsx`**

定位 line 10：

```tsx
const PuzzlePage = lazy(() => import('../pages/PuzzlePage'))
```

删除（CreatePage 内部 lazy load）。

定位 line 58：

```tsx
<Route path="/create" element={<PuzzlePage />} />
```

改为：

```tsx
<Route path="/create" element={<CreatePage />} />
```

并在 lazy import 区添加：

```tsx
const CreatePage = lazy(() => import('../features/create/CreatePage'))
```

同时删除：

```tsx
const Landing = lazy(() => import('../pages/Landing'))
```

与对应路由：

```tsx
<Route path="/landing" element={<Landing />} />
```

- [ ] **Step 9: 改 `src/app/LegacyRedirects.tsx`**

在 `LEGACY_REDIRECTS` 数组添加一条：

```ts
{ from: '/landing', to: '/auth' },
```

- [ ] **Step 10: 删 `src/pages/Landing.jsx`**

```bash
git rm src/pages/Landing.jsx
```

- [ ] **Step 11: 跑测试**

Run: `npx vitest run src/features/create/__tests__/CreatePage.test.tsx`
Expected: PASS（4 个 mode 渲染 + 1 个 tab 数量测试）。

Run: `npx vitest run`
Expected: 全套通过（之前 Plan 3 的 Routes.test.tsx 如果测了 `/landing` 路由，需要确认；如有失败，更新测试断言 `/landing → /auth` 重定向）。

- [ ] **Step 12: tsc 通过**

Run: `npx tsc --noEmit`
Expected: 0 errors。

- [ ] **Step 13: 手动回归**

Run: `npm run dev`

浏览器打开 `/create` `/create?mode=guided` `/create?mode=preview`，确认 3 个 tab 切换正常。FreeMode 应显示完整的 PuzzlePage（包括 tray、canvas、操作按钮）。GuidedMode/PreviewMode 显示占位文字。

- [ ] **Step 14: Commit**

```bash
git add src/features/create src/app/Routes.tsx src/app/LegacyRedirects.tsx
git commit -m "$(cat <<'EOF'
feat(create): add CreatePage shell with 3 mode tabs (free/guided/preview)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git rm src/pages/Landing.jsx
git commit -m "$(cat <<'EOF'
chore(routes): remove /landing route, redirect to /auth (spec §2.1)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 把 Composer/Jigsaw/Editor/Showcase 接入 CreatePage 子模式

**Files:**
- Modify: `src/features/create/modes/GuidedMode.tsx`
- Modify: `src/features/create/modes/PreviewMode.tsx`
- Create: `src/features/create/SubModeTabs.tsx`
- Delete: `src/pages/Composer.jsx`、`src/pages/JigsawPage.jsx`、`src/pages/Editor.jsx`、`src/pages/Showcase.jsx`（内容移入 modes）
- Modify: `src/features/create/__tests__/CreatePage.test.tsx`（补充 sub mode 测试）

**Why:** Task 4 留了 Guided/Preview 占位。Plan 4 把 4 个旧页面的内容搬进对应 mode 组件，按 `?sub=` 切换：guided 下 `sub=symmetry`（Composer）或 `sub=jigsaw`（JigsawPage），preview 下 `sub=relief`（Editor）或 `sub=shatter`（Showcase）。

- [ ] **Step 1: 创建 `src/features/create/SubModeTabs.tsx`**

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom'

export interface SubModeTabsProps {
  mode: 'guided' | 'preview'
  options: { sub: string; cn: string }[]
}

export default function SubModeTabs({ mode, options }: SubModeTabsProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const current = searchParams.get('sub') ?? options[0].sub

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '6px 16px',
        background: 'rgba(15,15,16,0.4)',
      }}
    >
      {options.map((o) => {
        const active = current === o.sub
        return (
          <button
            key={o.sub}
            onClick={() => navigate(`/create?mode=${mode}&sub=${o.sub}`)}
            style={{
              padding: '4px 12px',
              borderRadius: 10,
              fontSize: 11,
              fontFamily: 'Noto Serif SC, serif',
              cursor: 'pointer',
              background: active ? 'rgba(212,175,106,0.12)' : 'transparent',
              color: active ? '#F2D58A' : '#6A6A6A',
              border: active
                ? '1px solid rgba(212,175,106,0.25)'
                : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {o.cn}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 重写 `src/features/create/modes/GuidedMode.tsx`**

```tsx
import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import SubModeTabs from '../SubModeTabs'

const Composer = lazy(() => import('./Composer'))
const Jigsaw = lazy(() => import('./Jigsaw'))

const OPTIONS = [
  { sub: 'symmetry', cn: '对称构图' },
  { sub: 'jigsaw', cn: '经典拼图' },
]

export default function GuidedMode() {
  const [searchParams] = useSearchParams()
  const sub = searchParams.get('sub') ?? 'symmetry'

  return (
    <div>
      <SubModeTabs mode="guided" options={OPTIONS} />
      <Suspense fallback={null}>
        {sub === 'symmetry' && <Composer />}
        {sub === 'jigsaw' && <Jigsaw />}
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 3: 重写 `src/features/create/modes/PreviewMode.tsx`**

```tsx
import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import SubModeTabs from '../SubModeTabs'

const Relief = lazy(() => import('./Relief'))
const Shatter = lazy(() => import('./Shatter'))

const OPTIONS = [
  { sub: 'relief', cn: '3D 浮雕' },
  { sub: 'shatter', cn: '碎裂沉浸' },
]

export default function PreviewMode() {
  const [searchParams] = useSearchParams()
  const sub = searchParams.get('sub') ?? 'relief'

  return (
    <div>
      <SubModeTabs mode="preview" options={OPTIONS} />
      <Suspense fallback={null}>
        {sub === 'relief' && <Relief />}
        {sub === 'shatter' && <Shatter />}
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 4: 把 4 个旧页面内容搬到 modes**

```bash
git mv src/pages/Composer.jsx src/features/create/modes/Composer.jsx
git mv src/pages/JigsawPage.jsx src/features/create/modes/Jigsaw.jsx
git mv src/pages/Editor.jsx src/features/create/modes/Relief.jsx
git mv src/pages/Showcase.jsx src/features/create/modes/Shatter.jsx
```

每个搬过去的文件需要改 import 路径（`../` → `../../../`）和 export 名（`JigsawPage`/`Editor`/`Showcase` → 默认导出 `Jigsaw`/`Relief`/`Shatter`）。

对 `src/features/create/modes/Composer.jsx`：

```bash
# 用 sed 或 IDE 替换所有 ../ 为 ../../../
```

具体地，每个文件需要：

**`Composer.jsx`（原 `src/pages/Composer.jsx`）：**
- import path 全部从 `'../` 改成 `'../../../`
- 例如 `from '../engine/componentLibrary'` → `from '../../../engine/componentLibrary'`
- `from '../../public/elements/manifest.json'` → `from '../../../../public/elements/manifest.json'`
- 默认导出名保留 `Composer` 即可（已是 default）

**`Jigsaw.jsx`（原 `JigsawPage.jsx`）：**
- 同样 import path 改 `../../../`
- 默认导出改名 `JigsawPage` → `Jigsaw`

**`Relief.jsx`（原 `Editor.jsx`）：**
- 同样改 path
- 默认导出改名 `Editor` → `Relief`

**`Shatter.jsx`（原 `Showcase.jsx`）：**
- 同样改 path
- 默认导出改名 `Showcase` → `Shatter`

- [ ] **Step 5: 更新 CreatePage.test.tsx，加 sub mode 测试**

在 `src/features/create/__tests__/CreatePage.test.tsx` 顶部 vi.mock 区，把 GuidedMode / PreviewMode 的 mock 改为导出可识别的 sub-mode 标记，并加 sub-mode 测试。

完整替换 vi.mock 段：

```tsx
vi.mock('../modes/GuidedMode', () => ({
  __esModule: true,
  default: () => {
    const sp = new URLSearchParams(window.location.search).get('sub')
    return (
      <div data-testid={`guided-${sp ?? 'symmetry'}`}>
        GuidedMode ({sp ?? 'symmetry'})
      </div>
    )
  },
}))
vi.mock('../modes/PreviewMode', () => ({
  __esModule: true,
  default: () => {
    const sp = new URLSearchParams(window.location.search).get('sub')
    return (
      <div data-testid={`preview-${sp ?? 'relief'}`}>
        PreviewMode ({sp ?? 'relief'})
      </div>
    )
  },
}))
```

在文件末尾加：

```tsx
describe('CreatePage sub-modes', () => {
  it('guided mode defaults to symmetry when no sub', async () => {
    const { findByTestId } = renderAt('/create?mode=guided')
    expect(await findByTestId('guided-symmetry')).toBeTruthy()
  })

  it('guided mode switches to jigsaw when sub=jigsaw', async () => {
    const { findByTestId } = renderAt('/create?mode=guided&sub=jigsaw')
    expect(await findByTestId('guided-jigsaw')).toBeTruthy()
  })

  it('preview mode defaults to relief when no sub', async () => {
    const { findByTestId } = renderAt('/create?mode=preview')
    expect(await findByTestId('preview-relief')).toBeTruthy()
  })

  it('preview mode switches to shatter when sub=shatter', async () => {
    const { findByTestId } = renderAt('/create?mode=preview&sub=shatter')
    expect(await findByTestId('preview-shatter')).toBeTruthy()
  })
})
```

- [ ] **Step 6: 跑测试**

Run: `npx vitest run`
Expected: 全套通过。

- [ ] **Step 7: tsc 通过**

Run: `npx tsc --noEmit`
Expected: 0 errors（这 4 个文件还是 `.jsx`，tsc 不严格检查；TS 化在 Task 13 做）。

- [ ] **Step 8: 手动回归**

Run: `npm run dev`

浏览器依次打开：
- `/create?mode=guided&sub=symmetry` —— Composer（4 角对称几何拼图）
- `/create?mode=guided&sub=jigsaw` —— Jigsaw（4×4 拼图）
- `/create?mode=preview&sub=relief` —— Editor（3D 浮雕）
- `/create?mode=preview&sub=shatter` —— Showcase（手势碎裂）

每页都能正常 render，sub tab 切换流畅。

- [ ] **Step 9: Commit**

```bash
git add src/features/create/modes src/features/create/SubModeTabs.tsx src/features/create/__tests__/CreatePage.test.tsx
git commit -m "$(cat <<'EOF'
feat(create): wire Composer/Jigsaw/Editor/Showcase into Guided/Preview modes

Moves 4 legacy pages into features/create/modes/ as Composer/Jigsaw/Relief/Shatter.
Sub-mode query (?sub=symmetry|jigsaw|relief|shatter) switches content.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: SplashPage.jsx → SplashPage.tsx

**Files:**
- Create: `src/pages/SplashPage.tsx`
- Delete: `src/pages/SplashPage.jsx`

**Why:** SplashPage 178 行，是页面里最小的，先拿它练手建立 TS 化模板：定义 props、补 useRef 类型、`useEffect` 清理。

- [ ] **Step 1: 创建 `src/pages/SplashPage.tsx`**

完整内容（基于现有 `SplashPage.jsx` 加类型）：

```tsx
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../shaders/cloudTrain'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

interface Uniforms {
  u_resolution: { value: THREE.Vector3 }
  u_time: { value: number }
  u_noiseTexture: { value: THREE.Texture }
  u_noiseSize: { value: THREE.Vector2 }
  u_noiseStrength: { value: number }
}

export default function SplashPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false

    const RENDER_SCALE = 0.25
    const W = Math.round(window.innerWidth * RENDER_SCALE)
    const H = Math.round(window.innerHeight * RENDER_SCALE)

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(1)
    renderer.setSize(W, H, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const canvas = renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.filter = 'blur(1.5px)'
    container.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const uniforms: Uniforms = {
      u_resolution: { value: new THREE.Vector3(W, H, 1.0) },
      u_time: { value: 0.0 },
      u_noiseTexture: { value: new THREE.Texture() },
      u_noiseSize: { value: new THREE.Vector2(1.0, 1.0) },
      u_noiseStrength: { value: 1.9 },
    }

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })
    scene.add(new THREE.Mesh(geometry, material))

    const cleanup = () => {
      geometry.dispose()
      material.dispose()
      try {
        if (uniforms.u_noiseTexture.value && uniforms.u_noiseTexture.value.dispose) {
          uniforms.u_noiseTexture.value.dispose()
        }
      } catch {
        // ignore
      }
      renderer.dispose()
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }

    fetch('/shaders/noise_base64.txt')
      .then((r) => r.text())
      .then((b64) => {
        if (disposed) return
        const img = new Image()
        img.onload = () => {
          if (disposed) return
          const tex = new THREE.Texture(img)
          tex.wrapS = THREE.RepeatWrapping
          tex.wrapT = THREE.RepeatWrapping
          tex.minFilter = THREE.NearestFilter
          tex.magFilter = THREE.NearestFilter
          tex.needsUpdate = true
          uniforms.u_noiseTexture.value = tex
          uniforms.u_noiseSize.value.set(img.width, img.height)

          let frame = 0
          const TOTAL_FRAMES = 90
          const FRAME_INTERVAL = 1000 / 30
          let lastTime = 0

          const animate = (now: number) => {
            if (disposed) return
            if (now - lastTime < FRAME_INTERVAL) {
              requestAnimationFrame(animate)
              return
            }
            lastTime = now
            uniforms.u_time.value += 0.016
            renderer.render(scene, camera)
            frame++
            if (frame < TOTAL_FRAMES) {
              requestAnimationFrame(animate)
            } else {
              const dataURL = canvas.toDataURL('image/jpeg', 0.85)
              container.style.backgroundImage = `url(${dataURL})`
              container.style.backgroundSize = 'cover'
              container.style.backgroundPosition = 'center'
              cleanup()
            }
          }
          requestAnimationFrame(animate)
        }
        img.src = b64.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`
      })

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  const enter = () => {
    setFading(true)
    setTimeout(() => navigate(user ? '/home' : '/auth'), 800)
  }

  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    cursor: 'pointer',
    overflow: 'hidden',
    background: '#1a0a05',
  }

  return (
    <div onClick={enter} style={containerStyle}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.4) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.8s ease',
          opacity: fading ? 0 : 1,
        }}
      >
        <div
          style={{
            fontFamily: 'Noto Serif SC, STSong, Georgia, serif',
            fontSize: 64,
            color: '#F2D58A',
            fontWeight: 700,
            letterSpacing: '0.3em',
            textShadow: '0 2px 20px rgba(0,0,0,0.6)',
          }}
        >
          纹脉
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'rgba(242,213,138,0.6)',
            letterSpacing: '0.2em',
            marginTop: 8,
            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          }}
        >
          PATTERN VEINS
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 40,
            letterSpacing: '0.1em',
            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          点击任意处进入
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: 删 `src/pages/SplashPage.jsx`**

```bash
git rm src/pages/SplashPage.jsx
```

- [ ] **Step 3: tsc 通过**

Run: `npx tsc --noEmit`
Expected: 0 errors。如有 `'THREE' is declared but never used` 之类的，按提示修。

- [ ] **Step 4: 跑测试 + 手动**

Run: `npx vitest run`
Expected: 全套通过。

Run: `npm run dev`，打开 `/`，确认 Splash 动画正常，点击进入下一页。

- [ ] **Step 5: Commit**

```bash
git add src/pages/SplashPage.tsx
git commit -m "$(cat <<'EOF'
refactor(splash): migrate SplashPage.jsx to .tsx with typed refs/uniforms

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Home.jsx → Home.tsx

**Files:**
- Create: `src/pages/Home.tsx`
- Delete: `src/pages/Home.jsx`

**Why:** Home 900+ 行，包含故事旅程、抽卡 banner、系列入口、最近作品、删除作品 modal 等。TS 化的核心是给 `data` (`GameStore` return type)、`Pattern[]`、`Creation[]`、`User` 加类型。**逻辑与视觉不动**。

- [ ] **Step 1: 创建 `src/pages/Home.tsx`**

把 `Home.jsx` 整文件复制到 `Home.tsx`，做以下类型修正：

a. 顶部 `import { useApp } from '../store/AppState'` 保留（`useApp` 已返回 `GameStore` typed 接口）。

b. `const { data, deleteCreation } = useApp()` —— `data` 已是 typed `GameData`，无需改。

c. `const { user } = useAuth()` —— `user` 现在是 `User | null`（Task 2 之后）。

d. `user?.user_metadata?.username` —— Supabase `User` 类型里有 `user_metadata: { [key: string]: any }`，TS 不报错。

e. `user?.email?.split('@')[0]` —— 同上。

f. `STORY_CHAPTERS` 数组 —— 没有显式类型，TS 推断为对象字面量数组，OK。如果要严格，加：

```tsx
interface StoryChapter {
  key: string
  num: string
  cn: string
  en: string
  desc: string
  cta: string
  path: string
  deco: React.ReactNode
}
const STORY_CHAPTERS: StoryChapter[] = [ ... ]
```

g. `FeatureIcon` 组件 props：

```tsx
function FeatureIcon({
  name,
  size = 22,
  color = '#F2D58A',
}: {
  name: 'camera' | 'compose' | 'puzzle' | 'cube' | 'hand' | 'gallery'
  size?: number
  color?: string
}) {
  // ...
}
```

h. `setDeleteTarget(null)` 调用处的 modal —— 给 `deleteTarget` 显式 `Creation | null` 类型：

```tsx
const [deleteTarget, setDeleteTarget] = useState<Creation | null>(null)
```

如果 `Creation` 类型不在 `src/types/`，从 `src/store/gameStore.ts` 导入：

```tsx
import type { Creation } from '../store/gameStore'
```

i. `CloudPattern` `CrestMark` `YinYangSymbol` 等 SVG helper 组件 —— props 加 `{ size?: number; opacity?: number }`。

j. `creationsRef`:

```tsx
const creationsRef = useRef<HTMLDivElement>(null)
```

k. 任何 `useRef<HTMLCanvasElement>(null)` 之类按 DOM 节点实际类型。

l. 任何 event handler 参数加 `React.MouseEvent` / `React.PointerEvent` 等。

- [ ] **Step 2: 删 `src/pages/Home.jsx`**

```bash
git rm src/pages/Home.jsx
```

- [ ] **Step 3: tsc 通过**

Run: `npx tsc --noEmit`
Expected: 0 errors。可能遇到的：未使用的 import（删之）、`any` 推断（加显式类型）。

- [ ] **Step 4: 跑测试**

Run: `npx vitest run`
Expected: 全套通过。

- [ ] **Step 5: 手动回归**

Run: `npm run dev`，打开 `/home`：
- 4 章节故事旅程动画正常
- 抽卡 banner 显示
- 系列入口点击进入 `/library`
- 作品列表点击删除按钮，modal 弹出，确认删除

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "$(cat <<'EOF'
refactor(home): migrate Home.jsx to .tsx, add typed refs/handlers/chapters

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: PuzzlePage.jsx → PuzzlePage.tsx

**Files:**
- Create: `src/pages/PuzzlePage.tsx`
- Delete: `src/pages/PuzzlePage.jsx`

**Why:** PuzzlePage 1424 行，是项目里最大的单文件。包含 canvas 绘图、shape mask 碰撞检测、模板填充、AI 元素筛选、fork 入口、导出/发布。TS 化核心难点是 `placements` 状态的 union type（有 `_temp`/`isEmpty` 等可选字段）和 `shapeCache.current` 的 `Uint8Array` mask。

- [ ] **Step 1: 在 `src/types/creation.ts` 补类型**

打开 `src/types/creation.ts`，检查/补：

```ts
export interface Placement {
  id: string
  x: number
  y: number
  size: number
  rotation?: number
  scale?: number
  scaleX?: number
  scaleY?: number
  slotId?: string
  slotLabel?: string
  isEmpty?: boolean
  _temp?: boolean
}

export interface ShapeData {
  mask: Uint8Array
  size: number
  boundingRadius: number
  contour: { x: number; y: number }[]
  flexible: boolean
}

export interface OutlineBlock {
  toDataURL: (type?: string, quality?: number) => string
  width: number
  height: number
} & HTMLCanvasElement
```

如果 `OutlineBlock` extends `HTMLCanvasElement` 报错，简化为：

```ts
export type OutlineBlock = HTMLCanvasElement
```

- [ ] **Step 2: 创建 `src/pages/PuzzlePage.tsx`**

把 `PuzzlePage.jsx` 复制到 `.tsx`，类型修正：

a. 顶部 imports 加：

```tsx
import type { Placement, ShapeData } from '../types/creation'
import type { Pattern } from '../types/pattern'
import type { Template } from '../data/templates'
```

b. State 类型：

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null)
const [placements, setPlacements] = useState<Placement[]>([])
const [selectedIdx, setSelectedIdx] = useState<number>(-1)
const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement | HTMLCanvasElement>>({})
const [outlinedBlocks, setOutlinedBlocks] = useState<Record<string, HTMLCanvasElement>>({})
const [outlinedUrls, setOutlinedUrls] = useState<Record<string, string>>({})
const shapeCache = useRef<Record<string, ShapeData>>({})
const [extraPatterns, setExtraPatterns] = useState<Pattern[]>([])
```

c. Event handler 参数：

```tsx
const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => { ... }, [])
const handleCanvasPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => { ... }, [])
```

d. `canvasCoords(e)`:

```tsx
function canvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
  const rect = canvasRef.current!.getBoundingClientRect()
  return { x: (e.clientX - rect.left) / SCALE, y: (e.clientY - rect.top) / SCALE }
}
```

e. `masksCollide`、`resolveMove`、`placementMaskRadius`、`sliceTopLeftQuadrant` 等辅助函数参数：

```tsx
function masksCollide(
  shapeA: ShapeData | undefined,
  placeA: Placement,
  shapeB: ShapeData | undefined,
  placeB: Placement,
): boolean { ... }

function resolveMove(
  moved: Placement,
  placements: Placement[],
  draggingIdx: number,
  shapeCacheRef: React.MutableRefObject<Record<string, ShapeData>>,
): Placement { ... }

function sliceTopLeftQuadrant(img: HTMLImageElement): HTMLCanvasElement { ... }

function placementMaskRadius(shape: ShapeData | undefined, place: Placement): number { ... }
```

f. `ExportSizeModal` `TemplatePickerModal` 内部组件 props 加 interface：

```tsx
interface ExportSizeModalProps {
  currentSize: number
  recommendedSize: number
  placementCount: number
  onSelect: (size: number) => void
  onCancel: () => void
  onConfirm: () => void
}
function ExportSizeModal({ currentSize, recommendedSize, placementCount, onSelect, onCancel, onConfirm }: ExportSizeModalProps) { ... }
```

g. `rafIdRef` `pendingEvtRef`:

```tsx
const rafIdRef = useRef<number | null>(null)
const pendingEvtRef = useRef<React.PointerEvent<HTMLCanvasElement> | null>(null)
```

h. `handleCanvasPointerMove` 内 RAF callback：

```tsx
rafIdRef.current = requestAnimationFrame(() => {
  rafIdRef.current = null
  // ...
})
```

i. `applyTemplate` `template` 参数：

```tsx
const applyTemplate = useCallback((template: Template) => { ... }, [myPatterns])
```

j. `e` catch 块参数类型 `unknown`：

```tsx
} catch (e) {
  // ignore
}
```

不能写 `e: any`，TS 6 严格模式建议 `unknown` 或省略类型。

k. `getWork(forkId).then(({ data: src }) => { ... })` —— `src` 是 `Work | null`，按 supabase 返回推断。

- [ ] **Step 3: 删 `src/pages/PuzzlePage.jsx`**

```bash
git rm src/pages/PuzzlePage.jsx
```

- [ ] **Step 4: tsc 通过**

Run: `npx tsc --noEmit`
Expected: 0 errors。常见问题：
- `'block' is possibly null` → 加 `if (!block) return` 或 `block!`
- `placement.scale` 可能 undefined → 已在 `Placement` 接口里加 `?`
- `template.slots` 类型 → 检查 `src/data/templates.ts` 导出的 `Template` 类型

- [ ] **Step 5: 跑测试**

Run: `npx vitest run`
Expected: 全套通过。

- [ ] **Step 6: 手动回归**

Run: `npm run dev`，打开 `/create`：
- 默认 FreeMode 显示 PuzzlePage
- Tray 显示 library + AI 元素
- 拖一个纹样到 canvas，能放下、拖动、旋转、缩放、删除
- 选模板，应用，slots 自动填充
- 完成创作，进预览 modal
- 点"发布到广场"，能拉起 PublishModal

- [ ] **Step 7: Commit**

```bash
git add src/pages/PuzzlePage.tsx src/types/creation.ts
git commit -m "$(cat <<'EOF'
refactor(puzzle): migrate PuzzlePage.jsx (1424 lines) to .tsx with typed placements/shape cache/modals

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: GachaPage.jsx → GachaPage.tsx

**Files:**
- Create: `src/pages/GachaPage.tsx`
- Delete: `src/pages/GachaPage.jsx`

**Why:** GachaPage 大型，包含单抽/十连动画、概率展示、分享卡片生成。TS 化重点是 `result` / `tenResults` 的 `PullResult` 类型。

- [ ] **Step 1: 检查 `src/types/gacha.ts`**

确认有 `PullResult` `GachaHistory` 类型。如缺，补：

```ts
export interface PullResult {
  pattern: Pattern
  rarity: Rarity
  isNew: boolean
}

export interface GachaHistory {
  pulls: PullResult[]
  pity: number
  lastPullAt: string
}
```

- [ ] **Step 2: 创建 `src/pages/GachaPage.tsx`**

复制 `.jsx` → `.tsx`，类型修正：

```tsx
const [state, setState] = useState<'idle' | 'pulling' | 'result'>('idle')
const [result, setResult] = useState<PullResult | null>(null)
const [tenResults, setTenResults] = useState<PullResult[] | null>(null)
```

`handleShare` 的 `pattern` 参数：`Pattern`。

`YinYangSymbol` props: `{ size?: number; bloom?: boolean }`。

- [ ] **Step 3: 删 .jsx + tsc + 测试 + 手动**

```bash
git rm src/pages/GachaPage.jsx
npx tsc --noEmit
npx vitest run
npm run dev   # 打开 /gacha，确认抽卡动画 + 分享卡
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/GachaPage.tsx src/types/gacha.ts
git commit -m "$(cat <<'EOF'
refactor(gacha): migrate GachaPage.jsx to .tsx with typed PullResult state

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: GalleryPage.jsx + WorkDetailPage.jsx → .tsx

**Files:**
- Create: `src/pages/GalleryPage.tsx`
- Create: `src/pages/WorkDetailPage.tsx`
- Delete: `src/pages/GalleryPage.jsx`、`src/pages/WorkDetailPage.jsx`

**Why:** 两个 gallery 相关页面，共享 `Work` `Like` 类型。一起做避免类型重复。

- [ ] **Step 1: 检查 `src/types/gallery.ts`**

确认有 `Work` `WorkListQuery` `GallerySortKey` 等。如缺，从 `src/lib/galleryApi.js` 反推并补：

```ts
export interface Work {
  id: string
  title: string
  cover_path: string
  placements: Placement[]
  template?: string
  series?: string
  author: { id: string; username: string }
  forked_from?: string | null
  source?: Work | null
  likes_count: number
  reuse_count: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export type GallerySortKey = 'newest' | 'hottest' | 'curated'

export interface ListWorksParams {
  sort?: GallerySortKey
  series?: string | null
  template?: string | null
  limit?: number
}
```

- [ ] **Step 2: 同时迁两个文件**

对 `GalleryPage.tsx`：

```tsx
const [works, setWorks] = useState<Work[]>([])
const [error, setError] = useState<string | null>(null)
const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
const [curated, setCurated] = useState<Work | null>(null)
const [sort, setSort] = useState<GallerySortKey>('newest')
const [series, setSeries] = useState<string | null>(null)
const [template, setTemplate] = useState<string | null>(null)
```

对 `WorkDetailPage.tsx`：

```tsx
const [work, setWork] = useState<Work | null>(null)
const [forks, setForks] = useState<Work[]>([])
const [error, setError] = useState<string | null>(null)
const { id: workId } = useParams<{ id: string }>()
```

`listWorks` `toggleLike` `hasLiked` `getWork` `listForksOf` 来自 `src/lib/galleryApi.js` —— 该文件 Task 13 之前还是 `.js`，TS 6 会按 `allowJs: true` 推断类型；如果推断不精确，临时 `as` 断言。

- [ ] **Step 3: 删 .jsx + tsc + 测试 + 手动**

```bash
git rm src/pages/GalleryPage.jsx src/pages/WorkDetailPage.jsx
npx tsc --noEmit
npx vitest run
npm run dev   # 打开 /gallery，确认列表加载、点赞、fork 跳转到 /create
# 打开 /work/<id>，确认详情页
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/GalleryPage.tsx src/pages/WorkDetailPage.tsx src/types/gallery.ts
git commit -m "$(cat <<'EOF'
refactor(gallery): migrate GalleryPage and WorkDetailPage to .tsx with typed Work state

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: AuthPage + Landing（已删） + Library + PatternDetailPage + QinghuaBrowser → .tsx

**Files:**
- Create: `src/pages/AuthPage.tsx`
- Create: `src/pages/Library.tsx`
- Create: `src/pages/PatternDetailPage.tsx`
- Delete: 对应 `.jsx` 文件 + `src/pages/QinghuaBrowser.jsx`（合并进 Library）

**Why:** 这 4 个文件结构相似（中等大小、列表 + 详情），合并到一个 task。Landing.jsx 在 Task 4 已删。QinghuaBrowser 在 Plan 3 已被 `/qinghua → /library?series=qinghua` 重定向接管，文件没人 import，删掉。

- [ ] **Step 1: 创建 `src/pages/AuthPage.tsx`**

类型修正：

```tsx
const [mode, setMode] = useState<'login' | 'signup'>('login')
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
const [visible, setVisible] = useState(false)

const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => { ... }, [...])
```

`features` 数组、`ink` palette 等纯数据无需类型注解，TS 推断即可。

- [ ] **Step 2: 创建 `src/pages/Library.tsx`**

类型修正：

```tsx
const [tab, setTab] = useState<'mine' | 'all'>('mine')
const [seriesFilter, setSeriesFilter] = useState<string>('all')

const myPatterns: Pattern[] = data.library.map((id) => getPatternById(id)).filter((p): p is Pattern => Boolean(p))
```

注意 `getPatternById` 返回 `Pattern | undefined`，需要 typeguard `.filter((p): p is Pattern => Boolean(p))`。

- [ ] **Step 3: 创建 `src/pages/PatternDetailPage.tsx`**

类型修正：

```tsx
const { id: patternId } = useParams<{ id: string }>()
const pattern: Pattern | undefined = patternId ? getPatternById(patternId) : undefined

if (!pattern) {
  return <div>...</div>
}

const Section: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({ icon, label, children }) => ( ... )
```

注意：`PatternDetailPage` 在 Task 3 是 `SeriesSkinLayer` 跳过 `/pattern/:id` 路径的例外。本任务在 `PatternDetailPage.tsx` 顶层加 `SeriesSkin` 包装，根据 `pattern.series` 切换皮肤：

```tsx
return (
  <SeriesSkin series={pattern.series} intensity="full" style={{ minHeight: '100vh' }}>
    {/* 原内容 */}
  </SeriesSkin>
)
```

import 加：

```tsx
import { SeriesSkin } from '../design-system'
```

- [ ] **Step 4: 删 .jsx + QinghuaBrowser.jsx**

```bash
git rm src/pages/AuthPage.jsx src/pages/Library.jsx src/pages/PatternDetailPage.jsx src/pages/QinghuaBrowser.jsx
```

- [ ] **Step 5: tsc + 测试 + 手动**

```bash
npx tsc --noEmit
npx vitest run
npm run dev   # 打开 /auth 登录、/library 浏览、/pattern/qh-1 详情（SeriesSkin 切换为 qinghua）
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/AuthPage.tsx src/pages/Library.tsx src/pages/PatternDetailPage.tsx
git commit -m "$(cat <<'EOF'
refactor(pages): migrate AuthPage, Library, PatternDetailPage to .tsx; delete QinghuaBrowser

PatternDetailPage now mounts SeriesSkin based on pattern.series (full intensity).
QinghuaBrowser deleted (superseded by /library?series=qinghua redirect in Plan 3).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: 4 个 create mode 组件 + PhotoMatchPage + AdminReviewPage + CuratePage → .tsx

**Files:**
- Modify: `src/features/create/modes/Composer.jsx → .tsx`
- Modify: `src/features/create/modes/Jigsaw.jsx → .tsx`
- Modify: `src/features/create/modes/Relief.jsx → .tsx`
- Modify: `src/features/create/modes/Shatter.jsx → .tsx`
- Create: `src/pages/PhotoMatchPage.tsx`
- Create: `src/pages/AdminReviewPage.tsx`
- Create: `src/pages/CuratePage.tsx`
- Delete: 对应 `.jsx` 文件

**Why:** 4 个 create mode 组件在 Task 5 已搬到 `features/create/modes/`，但仍是 `.jsx`。PhotoMatchPage / AdminReviewPage / CuratePage 是次要页面，一起做。

- [ ] **Step 1: 4 个 mode 文件改扩展名 + 加类型**

```bash
git mv src/features/create/modes/Composer.jsx src/features/create/modes/Composer.tsx
git mv src/features/create/modes/Jigsaw.jsx src/features/create/modes/Jigsaw.tsx
git mv src/features/create/modes/Relief.jsx src/features/create/modes/Relief.tsx
git mv src/features/create/modes/Shatter.jsx src/features/create/modes/Shatter.tsx
```

每个文件按之前规则加类型：
- `useRef<HTMLCanvasElement>(null)`
- `useState<Placement[]>([])`
- event handler `React.PointerEvent<HTMLCanvasElement>`
- `handleSave` `applyTemplate` 等 callback 参数

- [ ] **Step 2: PhotoMatchPage.jsx → .tsx**

```bash
git mv src/pages/PhotoMatchPage.jsx src/pages/PhotoMatchPage.tsx
```

加类型。该页用 VLM API（`callStepFunVision`）+ 三段式匹配。state 类型：

```tsx
const [file, setFile] = useState<File | null>(null)
const [preview, setPreview] = useState<string | null>(null)
const [matches, setMatches] = useState<Pattern[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

- [ ] **Step 3: AdminReviewPage.jsx → .tsx**

```bash
git mv src/pages/AdminReviewPage.jsx src/pages/AdminReviewPage.tsx
```

state：

```tsx
const [pending, setPending] = useState<Work[]>([])
const [rejectingId, setRejectingId] = useState<string | null>(null)
const [rejectReason, setRejectReason] = useState<string>('')
const [toast, setToast] = useState<string | null>(null)
```

- [ ] **Step 4: CuratePage.jsx → .tsx**

```bash
git mv src/pages/CuratePage.jsx src/pages/CuratePage.tsx
```

state：

```tsx
const [approved, setApproved] = useState<Set<string>>(new Set())
const [sourceFilter, setSourceFilter] = useState<string>('all')
const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})
const [saveStatus, setSaveStatus] = useState<string>('')
```

`ELEMENT_MANIFEST.elements` 来自 JSON，TS 推断为 `any`，可显式定义：

```tsx
interface ElementItem {
  id: string
  file: string
  source: string
}
```

- [ ] **Step 5: tsc + 测试 + 手动**

```bash
npx tsc --noEmit
npx vitest run
npm run dev
# 打开 /create?mode=guided&sub=symmetry（Composer）
# 打开 /create?mode=guided&sub=jigsaw（Jigsaw）
# 打开 /create?mode=preview&sub=relief（Relief）
# 打开 /create?mode=preview&sub=shatter（Shatter）
# 打开 /photo-match（拍照识别）
# 用管理员账号打开 /admin（审核队列）
# 打开 /tools/curate（元素筛选）
```

- [ ] **Step 6: Commit**

```bash
git add src/features/create/modes src/pages/PhotoMatchPage.tsx src/pages/AdminReviewPage.tsx src/pages/CuratePage.tsx
git commit -m "$(cat <<'EOF'
refactor(pages): migrate 4 create modes + PhotoMatch/Admin/Curate to .tsx

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: galleryApi.js → .ts + 业务大组件 .jsx → .tsx

**Files:**
- Create: `src/lib/galleryApi.ts`
- Delete: `src/lib/galleryApi.js`
- Create: `src/components/PreviewScaleModal.tsx`
- Delete: `src/components/PreviewScaleModal.jsx`
- Create: `src/components/gallery/PublishModal.tsx`
- Create: `src/components/gallery/WorkCard.tsx`
- Create: `src/components/gallery/AdminOnlyRoute.tsx`
- Delete: 对应 `.jsx` 文件
- Create: `src/components/gacha/GachaPull.tsx`
- Delete: `src/components/gacha/GachaPull.jsx`

**Why:** `galleryApi.js` 是 `Work` 类型的源头，先 TS 化它，下游 `Work` 类型可用。然后业务最大的 4 个组件 TS 化。

- [ ] **Step 1: galleryApi.js → galleryApi.ts**

```bash
git mv src/lib/galleryApi.js src/lib/galleryApi.ts
```

补类型：

```ts
import { supabase } from './supabase'
import type { Work, ListWorksParams } from '../types/gallery'

export async function listWorks(params: ListWorksParams = {}): Promise<{ data: Work[]; error: Error | null }> {
  const { sort = 'newest', series = null, template = null, limit = 24 } = params
  let query = supabase.from('works').select('*, author:profiles(*)')
  if (sort === 'newest') query = query.order('created_at', { ascending: false })
  if (sort === 'hottest') query = query.order('likes_count', { ascending: false })
  if (series) query = query.eq('series', series)
  if (template) query = query.eq('template', template)
  query = query.limit(limit)
  const { data, error } = await query
  return { data: (data as Work[]) ?? [], error: error as Error | null }
}

export async function getWork(id: string): Promise<{ data: Work | null; error: Error | null }> { ... }
export async function listPendingReviews(): Promise<{ data: Work[]; error: Error | null }> { ... }
export async function approveWork(workId: string, reviewerId: string): Promise<{ error: Error | null }> { ... }
export async function rejectWork(workId: string, reviewerId: string, reason: string): Promise<{ error: Error | null }> { ... }
export async function toggleLike(workId: string, userId: string): Promise<{ liked: boolean; error: Error | null }> { ... }
export async function hasLiked(workId: string, userId: string): Promise<boolean> { ... }
export async function listForksOf(workId: string): Promise<{ data: Work[]; error: Error | null }> { ... }
```

- [ ] **Step 2: PreviewScaleModal.jsx → .tsx**

```bash
git mv src/components/PreviewScaleModal.jsx src/components/PreviewScaleModal.tsx
```

补类型：

```tsx
interface PreviewScaleModalProps {
  imageUrl: string
  placements: Placement[]
  onClose: () => void
}

export default function PreviewScaleModal({ imageUrl, placements, onClose }: PreviewScaleModalProps) {
  const navigate = useNavigate()
  // ...
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number>(1.0)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null)
}
```

- [ ] **Step 3: PublishModal.jsx → .tsx**

```bash
git mv src/components/gallery/PublishModal.jsx src/components/gallery/PublishModal.tsx
```

props：

```tsx
interface PublishModalProps {
  open: boolean
  onClose: () => void
  userId: string | undefined
  placements: Placement[]
  coverBlob: Blob | null
  forkedFrom: string | null
  defaultTemplate: string
  onPublished: () => void
}
```

- [ ] **Step 4: WorkCard.jsx → .tsx**

```bash
git mv src/components/gallery/WorkCard.jsx src/components/gallery/WorkCard.tsx
```

props:

```tsx
interface WorkCardProps {
  work: Work
  liked: boolean
  onLike: () => void
  onReuse: () => void
}
```

- [ ] **Step 5: AdminOnlyRoute.jsx → .tsx**

```bash
git mv src/components/gallery/AdminOnlyRoute.jsx src/components/gallery/AdminOnlyRoute.tsx
```

props:

```tsx
import type { ReactNode } from 'react'
interface AdminOnlyRouteProps { children: ReactNode }
export default function AdminOnlyRoute({ children }: AdminOnlyRouteProps) { ... }
```

- [ ] **Step 6: GachaPull.jsx → .tsx**

```bash
git mv src/components/gacha/GachaPull.jsx src/components/gacha/GachaPull.tsx
```

props:

```tsx
interface GachaPullProps {
  result: PullResult | null
  tenResults: PullResult[] | null
  onComplete: () => void
}
```

- [ ] **Step 7: tsc + 测试 + 手动**

```bash
npx tsc --noEmit
npx vitest run
npm run dev
# 打开 /create，完成创作后点预览，PreviewScaleModal 正常
# 点发布，PublishModal 正常
# /gallery 列表卡片点赞、fork
# /admin 审核页（管理员账号）
# /gacha 抽卡动画
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/galleryApi.ts src/components/PreviewScaleModal.tsx src/components/gallery src/components/gacha/GachaPull.tsx
git commit -m "$(cat <<'EOF'
refactor(lib,components): migrate galleryApi + PreviewScaleModal + PublishModal + WorkCard + AdminOnlyRoute + GachaPull to .tsx

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: common 组件 + cards + products + relief TS 化

**Files:**
- `src/components/common/ErrorBoundary.jsx → .tsx`
- `src/components/common/CloudShaderBackground.jsx → .tsx`
- `src/components/common/FluidShaderBackground.jsx → .tsx`
- `src/components/common/GoldBackground.jsx → .tsx`
- `src/components/common/GoldDecorations.jsx → .tsx`
- `src/components/common/GoldSilkCanvas.jsx → .tsx`
- `src/components/common/OrnateFrame.jsx → .tsx`
- `src/components/common/PatternImage.jsx → .tsx`（删除，已有 `design-system/components/PatternImage.tsx`）
- `src/components/cards/PatternCard.jsx → .tsx`
- `src/components/products/Mug.jsx → .tsx`
- `src/components/products/PhoneCase.jsx → .tsx`
- `src/components/products/Plate.jsx → .tsx`
- `src/components/products/Scarf.jsx → .tsx`
- `src/components/products/ProductScene.jsx → .tsx`
- `src/components/products/ProductSwitcher.jsx → .tsx`
- `src/components/products/GLBModel.jsx → .tsx`
- `src/components/products/useProductTexture.js → .ts`
- `src/components/relief/ReliefScene.jsx → .tsx`

**Why:** 剩余 ~17 个组件文件 TS 化。批量做。PatternImage 在 design-system 已有 TS 版，删除旧 `.jsx` 版，更新所有 import。

- [ ] **Step 1: 批量改扩展名**

```bash
git mv src/components/common/ErrorBoundary.jsx src/components/common/ErrorBoundary.tsx
git mv src/components/common/CloudShaderBackground.jsx src/components/common/CloudShaderBackground.tsx
git mv src/components/common/FluidShaderBackground.jsx src/components/common/FluidShaderBackground.tsx
git mv src/components/common/GoldBackground.jsx src/components/common/GoldBackground.tsx
git mv src/components/common/GoldDecorations.jsx src/components/common/GoldDecorations.tsx
git mv src/components/common/GoldSilkCanvas.jsx src/components/common/GoldSilkCanvas.tsx
git mv src/components/common/OrnateFrame.jsx src/components/common/OrnateFrame.tsx
git mv src/components/cards/PatternCard.jsx src/components/cards/PatternCard.tsx
git mv src/components/products/Mug.jsx src/components/products/Mug.tsx
git mv src/components/products/PhoneCase.jsx src/components/products/PhoneCase.tsx
git mv src/components/products/Plate.jsx src/components/products/Plate.tsx
git mv src/components/products/Scarf.jsx src/components/products/Scarf.tsx
git mv src/components/products/ProductScene.jsx src/components/products/ProductScene.tsx
git mv src/components/products/ProductSwitcher.jsx src/components/products/ProductSwitcher.tsx
git mv src/components/products/GLBModel.jsx src/components/products/GLBModel.tsx
git mv src/components/products/useProductTexture.js src/components/products/useProductTexture.ts
git mv src/components/relief/ReliefScene.jsx src/components/relief/ReliefScene.tsx
```

- [ ] **Step 2: 删旧 PatternImage.jsx**

```bash
git rm src/components/common/PatternImage.jsx
```

检查所有 import：

```bash
grep -rn "from '../components/common/PatternImage'" src/ 2>/dev/null
grep -rn "from '../../components/common/PatternImage'" src/ 2>/dev/null
```

每处改成从 design-system 导入：

```tsx
// 旧:
import PatternImage from '../components/common/PatternImage'
// 新:
import { PatternImage } from '../design-system'
```

- [ ] **Step 3: 给每个文件加类型**

具体修改要点（按文件）：

**`ErrorBoundary.tsx`**：

```tsx
import { Component, ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  // ...
}
```

**`CloudShaderBackground.tsx` / `FluidShaderBackground.tsx`**：参照 SplashPage 加 `useRef<HTMLDivElement>(null)`、Uniforms interface、`animate = (now: number) =>` 等。

**`GoldBackground.tsx` / `GoldDecorations.tsx` / `GoldSilkCanvas.tsx`**：主要是 props 类型 `{ opacity?: number; intensity?: 'full' | 'subtle' }`。

**`OrnateFrame.tsx`**：

```tsx
interface OrnateFrameProps {
  children: ReactNode
  variant?: 'simple' | 'ornate'
  color?: string
}
```

**`PatternCard.tsx`**：

```tsx
import type { Pattern } from '../../types/pattern'
interface PatternCardProps {
  pattern: Pattern
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}
```

**products 组件**：用 R3F 的 `<Canvas>` children，TS 推断 JSX.Element。可能需要 `useProductTexture.ts` 返回 `{ texture: THREE.Texture | null }`。

**`ReliefScene.tsx`**：R3F + drei，props `{ pattern: Pattern; compositionImage?: string | null }`。

- [ ] **Step 4: tsc + 测试 + 手动**

```bash
npx tsc --noEmit
npx vitest run
npm run dev
# 手动跑：/home, /library, /pattern/<id>, /create?mode=preview&sub=relief, /create?mode=preview&sub=shatter
```

- [ ] **Step 5: Commit**

```bash
git add src/components/common src/components/cards src/components/products src/components/relief
git commit -m "$(cat <<'EOF'
refactor(components): migrate 17 common/cards/products/relief components to .tsx, drop legacy PatternImage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: features/gallery/ 打包

**Files:**
- Move: `src/pages/GalleryPage.tsx` → `src/features/gallery/GalleryPage.tsx`
- Move: `src/pages/WorkDetailPage.tsx` → `src/features/gallery/WorkDetailPage.tsx`
- Move: `src/pages/AdminReviewPage.tsx` → `src/features/gallery/AdminReviewPage.tsx`
- Move: `src/components/gallery/WorkCard.tsx` → `src/features/gallery/components/WorkCard.tsx`
- Move: `src/components/gallery/PublishModal.tsx` → `src/features/gallery/components/PublishModal.tsx`
- Move: `src/components/gallery/AdminOnlyRoute.tsx` → `src/features/gallery/components/AdminOnlyRoute.tsx`
- Modify: `src/app/Routes.tsx`（更新 import 路径）
- Modify: `src/pages/PuzzlePage.tsx`（`PublishModal` import 路径）
- Modify: `src/features/create/modes/Relief.tsx`（如有 gallery import）
- Delete: `src/components/gallery/`（空目录）

**Why:** spec §8.1 features/ 目录打包。先把 gallery 模块归位，建立"页面 + 该模块专属组件"同住一个目录的模式。后续 gacha / create 同样模式。

- [ ] **Step 1: 移文件**

```bash
mkdir -p src/features/gallery/components
git mv src/pages/GalleryPage.tsx src/features/gallery/GalleryPage.tsx
git mv src/pages/WorkDetailPage.tsx src/features/gallery/WorkDetailPage.tsx
git mv src/pages/AdminReviewPage.tsx src/features/gallery/AdminReviewPage.tsx
git mv src/components/gallery/WorkCard.tsx src/features/gallery/components/WorkCard.tsx
git mv src/components/gallery/PublishModal.tsx src/features/gallery/components/PublishModal.tsx
git mv src/components/gallery/AdminOnlyRoute.tsx src/features/gallery/components/AdminOnlyRoute.tsx
```

- [ ] **Step 2: 改 import 路径**

每个移过去的文件，把 `'../../lib/...'` `'../../store/...'` 等深度 +1（因为目录深了一层）。

具体地：

**`src/features/gallery/GalleryPage.tsx`**：
- `'../lib/auth'` → `'../../lib/auth'`
- `'../lib/galleryApi'` → `'../../lib/galleryApi'`
- `'../store/AppState'` → `'../../store/AppState'`
- `'./WorkCard'` → `'./components/WorkCard'`

**`src/features/gallery/WorkDetailPage.tsx`**：同上 +1。

**`src/features/gallery/AdminReviewPage.tsx`**：
- `'../components/gallery/AdminOnlyRoute'` → `'./components/AdminOnlyRoute'`
- 其余 `'../lib/...'` → `'../../lib/...'`

**`src/features/gallery/components/AdminOnlyRoute.tsx`**：
- `'../../lib/auth'` → `'../../../lib/auth'`

- [ ] **Step 3: 改外部 import**

`src/app/Routes.tsx`：

```tsx
const GalleryPage = lazy(() => import('../features/gallery/GalleryPage'))
const WorkDetailPage = lazy(() => import('../features/gallery/WorkDetailPage'))
const AdminReviewPage = lazy(() => import('../features/gallery/AdminReviewPage'))
```

`src/pages/PuzzlePage.tsx`（如仍在 pages/，Task 8 完成后是）：

```tsx
// 旧:
import PublishModal from '../components/gallery/PublishModal'
// 新:
import PublishModal from '../features/gallery/components/PublishModal'
```

- [ ] **Step 4: 删空目录**

```bash
rmdir src/components/gallery
```

- [ ] **Step 5: tsc + 测试 + 手动**

```bash
npx tsc --noEmit
npx vitest run
npm run dev
# 打开 /gallery /work/<id> /admin 确认加载
# /create 完成创作 → 点发布，PublishModal 正常
```

- [ ] **Step 6: Commit**

```bash
git add src/features/gallery src/app/Routes.tsx src/pages/PuzzlePage.tsx
git commit -m "$(cat <<'EOF'
refactor(gallery): package gallery pages + components into features/gallery/

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: features/gacha/ 打包

**Files:**
- Move: `src/pages/GachaPage.tsx` → `src/features/gacha/GachaPage.tsx`
- Move: `src/components/gacha/GachaPull.tsx` → `src/features/gacha/components/GachaPull.tsx`
- Modify: `src/app/Routes.tsx`
- Modify: `src/pages/Home.tsx`（如有 `/gacha` 入口按钮，确认 navigate 路径不变）
- Delete: `src/components/gacha/`（空目录）

**Why:** 同 Task 15 模式，gacha 模块归位。

- [ ] **Step 1: 移文件 + 改 import**

```bash
mkdir -p src/features/gacha/components
git mv src/pages/GachaPage.tsx src/features/gacha/GachaPage.tsx
git mv src/components/gacha/GachaPull.tsx src/features/gacha/components/GachaPull.tsx
```

**`src/features/gacha/GachaPage.tsx`**：所有 `'../X'` → `'../../X'`；`'../components/gacha/GachaPull'` → `'./components/GachaPull'`。

**`src/features/gacha/components/GachaPull.tsx`**：`'../X'` → `'../../../X'`。

- [ ] **Step 2: `src/app/Routes.tsx` 更新**

```tsx
const GachaPage = lazy(() => import('../features/gacha/GachaPage'))
```

- [ ] **Step 3: 删空目录 + tsc + 测试 + 手动**

```bash
rmdir src/components/gacha
npx tsc --noEmit
npx vitest run
npm run dev   # /gacha 抽卡
```

- [ ] **Step 4: Commit**

```bash
git add src/features/gacha src/app/Routes.tsx
git commit -m "$(cat <<'EOF'
refactor(gacha): package GachaPage + GachaPull into features/gacha/

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: features/create/ 打包

**Files:**
- Move: `src/pages/PuzzlePage.tsx` → `src/features/create/modes/FreeMode.tsx`（替换原占位 FreeMode.tsx）
- Modify: `src/features/create/CreatePage.tsx`（更新 FreeMode import）
- Modify: `src/features/create/modes/FreeMode.tsx`（直接 import 同目录 PuzzlePage 改为内联渲染）
- Delete: `src/pages/PuzzlePage.tsx`（移到 features 后）

实际操作：把 `src/features/create/modes/FreeMode.tsx` 的内容（原 lazy import PuzzlePage）直接换成 PuzzlePage 的全部内容；删除 `src/pages/PuzzlePage.tsx`。

**Why:** spec §8.1 features/create/ 包含 modes/ 子目录。原 `PuzzlePage.tsx` 是 free mode 的实现，直接搬过去重命名为 `FreeMode.tsx`。

- [ ] **Step 1: 合并 FreeMode 与 PuzzlePage**

```bash
# 把 PuzzlePage.tsx 的内容覆盖到 FreeMode.tsx，并改默认导出名
git mv src/pages/PuzzlePage.tsx src/features/create/modes/FreeMode.tsx
```

`FreeMode.tsx` 内部：
- `export default function PuzzlePage()` → `export default function FreeMode()`
- import 路径 `'../X'` → `'../../../X'`（多下 2 层）
- `from '../lib/auth'` → `from '../../../lib/auth'`
- `from '../store/AppState'` → `from '../../../store/AppState'`
- `from '../components/PreviewScaleModal'` → `from '../../../components/PreviewScaleModal'`
- `from '../features/gallery/components/PublishModal'` → `from '../../gallery/components/PublishModal'`
- `from '../engine/shapeInteraction'` → `from '../../../engine/shapeInteraction'`
- `from '../utils/blockOutline'` → `from '../../../utils/blockOutline'`
- `from '../data/templates'` → `from '../../../data/templates'`
- `from '../constants'` → `from '../../../constants'`

- [ ] **Step 2: `CreatePage.tsx` 更新 lazy import**

```tsx
const FreeMode = lazy(() => import('./modes/FreeMode'))
```

已经是这种写法，无需改。

- [ ] **Step 3: tsc + 测试 + 手动**

```bash
npx tsc --noEmit
npx vitest run
npm run dev
# /create（FreeMode 默认）—— 完整 PuzzlePage 功能
# /create?mode=guided&sub=symmetry —— Composer
# /create?mode=guided&sub=jigsaw —— Jigsaw
# /create?mode=preview&sub=relief —— Relief
# /create?mode=preview&sub=shatter —— Shatter
```

- [ ] **Step 4: Commit**

```bash
git add src/features/create src/pages/PuzzlePage.tsx
git commit -m "$(cat <<'EOF'
refactor(create): inline PuzzlePage as FreeMode in features/create/modes/

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: 其余页面归位 + 路由表清理

**Files:**
- Move: `src/pages/Home.tsx` → `src/features/home/Home.tsx`（spec §8.1 没写 features/home，但 Home 单独成模块更清晰）
- Move: `src/pages/Library.tsx` → `src/features/library/Library.tsx`
- Move: `src/pages/PatternDetailPage.tsx` → `src/features/library/PatternDetailPage.tsx`
- Move: `src/pages/AuthPage.tsx` → `src/features/auth/AuthPage.tsx`
- Move: `src/pages/SplashPage.tsx` → `src/features/splash/SplashPage.tsx`
- Move: `src/pages/PhotoMatchPage.tsx` → `src/features/photo-match/PhotoMatchPage.tsx`
- Move: `src/pages/CuratePage.tsx` → `src/features/tools/CuratePage.tsx`
- Modify: `src/app/Routes.tsx`（所有 import 路径更新）

**Why:** 完成 spec §8.1 目录结构。每个 feature 一个目录，便于后续团队协作。

- [ ] **Step 1: 批量移文件**

```bash
mkdir -p src/features/home src/features/library src/features/auth src/features/splash src/features/photo-match src/features/tools
git mv src/pages/Home.tsx src/features/home/Home.tsx
git mv src/pages/Library.tsx src/features/library/Library.tsx
git mv src/pages/PatternDetailPage.tsx src/features/library/PatternDetailPage.tsx
git mv src/pages/AuthPage.tsx src/features/auth/AuthPage.tsx
git mv src/pages/SplashPage.tsx src/features/splash/SplashPage.tsx
git mv src/pages/PhotoMatchPage.tsx src/features/photo-match/PhotoMatchPage.tsx
git mv src/pages/CuratePage.tsx src/features/tools/CuratePage.tsx
```

- [ ] **Step 2: 改每个文件的 import 路径**

每个移过去的文件 `'../X'` → `'../../X'`。例外：
- `PatternDetailPage.tsx`：`'../design-system'` → `'../../design-system'`
- `AuthPage.tsx`：`'../components/common/FluidShaderBackground'` → `'../../components/common/FluidShaderBackground'`

- [ ] **Step 3: 改 `Routes.tsx`**

```tsx
const SplashPage = lazy(() => import('../features/splash/SplashPage'))
const AuthPage = lazy(() => import('../features/auth/AuthPage'))
const Home = lazy(() => import('../features/home/Home'))
const Library = lazy(() => import('../features/library/Library'))
const PatternDetailPage = lazy(() => import('../features/library/PatternDetailPage'))
const PhotoMatchPage = lazy(() => import('../features/photo-match/PhotoMatchPage'))
const CuratePage = lazy(() => import('../features/tools/CuratePage'))

// 已在 Task 15-17 移好:
const GalleryPage = lazy(() => import('../features/gallery/GalleryPage'))
const WorkDetailPage = lazy(() => import('../features/gallery/WorkDetailPage'))
const AdminReviewPage = lazy(() => import('../features/gallery/AdminReviewPage'))
const GachaPage = lazy(() => import('../features/gacha/GachaPage'))
const CreatePage = lazy(() => import('../features/create/CreatePage'))
```

- [ ] **Step 4: 删空目录 + `src/pages/`（除了 `demo/` 与 `tsconfig.json`）**

```bash
ls src/pages/
# 应只剩 demo/ 和 tsconfig.json
```

- [ ] **Step 5: tsc + 测试 + 手动**

```bash
npx tsc --noEmit
npx vitest run
npm run dev
# 跑所有路由：/ /auth /home /library /pattern/<id> /create /create?mode=... /gacha /gallery /work/<id> /photo-match /admin /tools/curate /demo/series/qinghua
```

- [ ] **Step 6: Commit**

```bash
git add src/features src/app/Routes.tsx
git commit -m "$(cat <<'EOF'
refactor(features): relocate remaining pages into features/ modules

Final features/ layout matches spec §8.1:
- features/home/Home.tsx
- features/library/Library.tsx + PatternDetailPage.tsx
- features/auth/AuthPage.tsx
- features/splash/SplashPage.tsx
- features/photo-match/PhotoMatchPage.tsx
- features/tools/CuratePage.tsx

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: bundle 预算验证 + 全站回归

**Files:**
- Verify: `dist/` (build output)
- Modify: `package.json`（如需加 `analyze` script）

**Why:** spec §14 要求"每路由初始加载 ≤ 200 kB gzip"。Plan 4 是大量重构的收尾，要确认重构本身没把 bundle 撑爆。

- [ ] **Step 1: 跑生产构建**

```bash
npm run build
```

预期：构建成功，输出 `dist/`。

- [ ] **Step 2: 检查 bundle size**

```bash
ls -lh dist/assets/
# 关注 .js 文件大小
```

每个路由 chunk 的 gzip 大小：
- 入口 chunk (`index-XXXX.js`)：包含 React、Router、zustand —— 应 ≤ 80 kB gzip
- 首屏路由 (Splash): 之前 ~325 kB（three.js），Plan 4 没动 Splash 内部代码，预期不变
- `/home` Home chunk：~30-50 kB
- `/create` FreeMode chunk：~50-80 kB（PuzzlePage canvas 逻辑）
- `/create?mode=preview&sub=relief` Relief chunk：~150-200 kB（R3F + drei）
- `/create?mode=preview&sub=shatter` Shatter chunk：~150-200 kB（R3F + MediaPipe）
- `/gacha` Gacha chunk：~20-40 kB

如果某路由 > 200 kB gzip 且包含可拆分依赖，记下来留给 Plan 5 性能优化。

- [ ] **Step 3: Lighthouse 移动端跑分**

```bash
npm run preview
# 浏览器 Lighthouse → Mobile → Performance
# 跑 4 个关键路径：/、/home、/library、/create
```

记录数字。预期：
- Performance ≥ 60（Plan 4 不优化性能，留 Plan 5）
- Accessibility ≥ 80
- Best Practices ≥ 90

- [ ] **Step 4: 全站手动回归**

```bash
npm run dev
```

依次跑：

| 路由 | 验证点 |
|---|---|
| `/` | Splash 动画、点击进入 |
| `/auth` | 登录/注册、提交后跳 /home |
| `/home` | 4 章节故事、抽卡 banner、系列入口、最近作品、删除作品 |
| `/library` | 我的/全部 tab、系列筛选、点击卡片进详情 |
| `/pattern/qh-1` | 详情、`SeriesSkin` qinghua 全强度背景 |
| `/create` | FreeMode（PuzzlePage）：拖拽、旋转、缩放、模板、完成、发布 |
| `/create?mode=guided&sub=symmetry` | Composer 4 角对称 |
| `/create?mode=guided&sub=jigsaw` | Jigsaw 拼图 |
| `/create?mode=preview&sub=relief` | Relief 3D 浮雕 |
| `/create?mode=preview&sub=shatter` | Shatter 手势碎裂 |
| `/gacha` | 单抽/十连、概率显示、分享 |
| `/gallery` | 列表加载、点赞、fork 跳转 |
| `/work/<id>` | 作品详情、fork 链、点赞 |
| `/photo-match` | 上传图片、VLM 识别、三段式匹配 |
| `/admin`（管理员账号） | 审核队列、通过、驳回 |
| `/tools/curate` | 元素筛选、保存到项目 |
| `/demo/series/qinghua` | 完整 SeriesSkin |
| `/demo/series/dragon` | 完整 SeriesSkin |
| `/puzzle` `/editor` `/showcase` `/composer` `/jigsaw` `/qinghua` `/landing` `/curate` `/splash` | 旧 URL 应 301 重定向到新路径 |

- [ ] **Step 5: 跑测试**

```bash
npx vitest run
```

预期：全部通过（Plan 3 是 102 个测试，Plan 4 新增 CreatePage、SeriesSkinLayer、auth 等测试，总数应 ≥ 110）。

- [ ] **Step 6: tsc 全量通过**

```bash
npx tsc --noEmit
```

预期：0 errors。`src/` 下不应再有 `.jsx` 或 `.js`（除了 `vite-env.d.ts` 和 `test-setup.ts`）。

```bash
find src -name "*.jsx" -o -name "*.js" | grep -v "vite-env.d.ts\|test-setup.ts"
# 应该空
```

- [ ] **Step 7: 写 Plan 4 完成报告**

把 bundle 数字、Lighthouse 分数、回归结果写到 commit message。

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "$(cat <<'EOF'
chore(plan-4): final regression — bundle/lighthouse numbers and full route coverage

Bundle (gzip):
- index chunk: <TBD> kB
- Splash route: <TBD> kB
- Home route: <TBD> kB
- Create/FreeMode: <TBD> kB
- Gacha: <TBD> kB
- Gallery: <TBD> kB

Lighthouse Mobile:
- / : <TBD>
- /home : <TBD>
- /library : <TBD>
- /create : <TBD>

Plan 4 完成：13 页面 + 25 组件全 TS 化、features/ 目录打包完成、CreatePage 3 模式上线、SeriesSkin 全站挂载、auth.ts 类型化、6 处 stale navigate 清理。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Checklist（写完 plan 自查）

**Spec coverage（对照 spec §1-14）：**

- [x] §2.2 创作台 3 模式：Task 4-5 ✅
- [x] §3.4 SeriesSkin API（每页挂皮肤）：Task 3（路由驱动）+ Task 11（PatternDetailPage 详情驱动）✅
- [x] §3.5 跨系列页面 neutral：Task 3 seriesRouteMap 里 `/home /library /create /gallery` 都映射到 neutral ✅
- [x] §3.6 5 个背景组件处理：GoldBackground 仍在 App.tsx（待 Plan 5 弃用）；其他背景已在 SeriesSkin 内部
- [x] §6 TS 化：Task 6-14 ✅
- [x] §8.1 目录重划（features/）：Task 15-18 ✅
- [x] §9 页面重做优先级：核心 5 页（Home/Library/PatternDetail/Create/Gacha）+ 支持 4 页都覆盖
- [x] §14 验收标准：Task 19 验证

**Placeholder scan：** 0 个 TBD/TODO/...（Task 19 的 `<TBD>` 是执行时填的实测数字，不是占位）

**Type consistency：**
- `Placement` interface 在 Task 8 定义于 `src/types/creation.ts`，Task 12/13 复用 ✅
- `Work` interface 在 Task 10 定义于 `src/types/gallery.ts`，Task 13/15 复用 ✅
- `CreateMode` `SubMode` 字符串字面量在 Task 4/5 一致 ✅
- `SeriesId` 在 seriesRouteMap.ts 用 `import type { SeriesId } from '../types/pattern'` ✅

**文件路径一致性：**
- `features/create/modes/` 路径在 Task 4/5/12/17 一致 ✅
- `features/gallery/components/` 在 Task 13/15 一致 ✅

---

## Execution Handoff

Plan 4 共 19 task，建议 **Subagent-Driven Development** 执行（fresh subagent per task + 两阶段 review）。每个 task 的 TDD 步骤完整，子代理可独立执行。

预估工时（按 Plan 3 节奏）：
- Phase 1（Task 1-2）：~ 1 小时
- Phase 2（Task 3-5）：~ 3 小时
- Phase 3（Task 6-12）：~ 6 小时（13 页面 TS 化）
- Phase 4（Task 13-14）：~ 3 小时（组件 TS 化）
- Phase 5（Task 15-18）：~ 3 小时（features 打包）
- Phase 6（Task 19）：~ 1 小时（验证）

总：~ 17 小时。可拆 2-3 天完成。

执行选项：
1. **Subagent-Driven（推荐）** —— 我每个 task 派一个新子代理，两阶段 review
2. **Inline Execution** —— 在当前 session 直接跑 executing-plans
