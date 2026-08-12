# 纹脉 v3 重构 Plan 3: IA 重塑（Router + App Shell + BottomNav）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 React Router v7 替换 `src/components/common/Router.jsx` 手写 hash router；在 `src/app/` 下用 TypeScript 建 5 个新模块（providers / Routes / BottomNav / LegacyRedirects / App）；把 13 个页面 + 3 个组件共 16 个 call site 从旧 router hooks 迁到 `react-router-dom`；删旧 Router.jsx/BottomNav.jsx/App.jsx。Plan 2 留下的 `/demo/series/:id` 顺手接入正式路由表。

**Architecture:** 顶层 Provider 栈（BrowserRouter + AppProvider + ErrorBoundary + SmoothScrollProvider）→ Routes（lazy 加载 18 页 + demo）→ BottomNav（4 tab：Home/Library/Create/Gallery，Create 居中凸起）。旧 hash URL（`/puzzle`、`/qinghua` 等 9 条）用 `<Navigate>` 客户端重定向到新路径，保证过渡期书签不失效。**页面文件保持 `.jsx`**，TS 转换推迟到 Plan 4 与视觉重做一起做（避免一个 PR 同时动文件结构 + 类型 + 视觉三件事）。

**Tech Stack:** React 19.2、react-router-dom 7.18（已装）、TypeScript 6.0.3、Vitest、React Testing Library 16.3。

**Spec reference:** `docs/superpowers/specs/2026-08-12-wenmai-v3-refactor-design.md` §2 IA、§7 Router 替换、§8 目录重划。

**决策日志（Plan 3 偏离 spec 的几点）：**
- **`<BrowserRouter>` + `<Routes>` 而非 `createBrowserRouter`** —— spec §7.1 说"任选"。本项目当前没有 loader/action 需求，传统组件式更简单，测试用 `MemoryRouter` 也更顺手。Plan 4/5 如果引入数据加载再换。
- **页面文件保持 `.jsx`** —— spec §8.1 把页面画成 `.tsx`，但 TS 转换与视觉重做高度耦合（要重写组件树），合并到 Plan 4 一次做完更安全。Plan 3 只动路由 + 顶层 shell。
- **`features/` 目录打包推迟** —— spec §8.1 画了 `features/library/`、`features/create/` 等业务模块目录。当前 `src/features/` 是空的，store 还在 `src/store/`，组件还在 `src/components/`。机械搬运没有视觉重做一起做容易乱，Plan 4 重做每页时顺手搬。
- **`/create` 当前指向 PuzzlePage** —— spec §2.2 把创作台定为 3 模式（free/guided/preview），但实现 3 模式切换是 Plan 4 的事。Plan 3 的 `/create` 路由暂时 mount 现有 `PuzzlePage`，`?mode=` 参数解析但不用。这样老用户 `/puzzle` 重定向到 `/create` 后体验不退化。
- **`LegacyRedirects` 用 `<Navigate>` 客户端重定向** —— SPA 没有 server，301 不适用。`<Navigate replace>` 是 React Router 标准 SPA 重定向，浏览器历史不留旧 URL。

---

## File Structure

**Create (TS):**
- `src/app/providers.tsx` —— Provider 栈
- `src/app/Routes.tsx` —— 路由表（lazy 加载 18 页 + demo + Landing）
- `src/app/BottomNav.tsx` —— 4 tab 底栏（Create 居中凸起）
- `src/app/LegacyRedirects.tsx` —— 9 条旧 URL 重定向
- `src/app/App.tsx` —— 新 app shell（compose providers + Routes + BottomNav + CloudSync bridge）
- `src/app/__tests__/providers.test.tsx`
- `src/app/__tests__/Routes.test.tsx`
- `src/app/__tests__/BottomNav.test.tsx`
- `src/app/__tests__/LegacyRedirects.test.tsx`
- `src/app/__tests__/App.test.tsx`

**Modify（Task 6 cutover，import 源切换 + hash 用法替换）：**
- 13 个页面：`Home.jsx`、`Landing.jsx`、`SplashPage.jsx`、`Library.jsx`、`PuzzlePage.jsx`、`PatternDetailPage.jsx`、`PhotoMatchPage.jsx`、`QinghuaBrowser.jsx`、`AuthPage.jsx`、`GalleryPage.jsx`、`WorkDetailPage.jsx`、`AdminReviewPage.jsx`、`JigsawPage.jsx`
- 3 个组件：`src/components/common/ErrorBoundary.jsx`（`window.location.hash = '/home'` → `window.location.href = '/home'`）、`src/components/gallery/AdminOnlyRoute.jsx`（import 切换）、`src/components/PreviewScaleModal.jsx`（如有 hash 用法）
- `src/main.jsx` —— 入口切到 `src/app/App.tsx`

**Delete:**
- `src/App.jsx`（被 `src/app/App.tsx` 替换）
- `src/components/common/Router.jsx`
- `src/components/common/BottomNav.jsx`

**Don't touch (Plan 4 处理):**
- 任何页面内部组件树、视觉、状态管理
- `src/pages/*.jsx` 文件名 / 扩展名 / 内部代码风格
- `src/store/*`（zustand stores 保持原位）
- `src/design-system/**`（Plan 2 已成型）
- `src/features/`（Plan 4 才开始填）

---

## Task 1: providers.tsx —— 全局 Provider 栈

**Files:**
- Create: `src/app/providers.tsx`
- Create: `src/app/__tests__/providers.test.tsx`

**Why:** 把 BrowserRouter + AppProvider + ErrorBoundary + SmoothScrollProvider 4 层 Provider 收成一个 `<AppProviders>` 组件，避免 App.tsx 嵌套过深。`BrowserRouter` 必须在最外层，所有 router hooks 才能用。

- [ ] **Step 1: 写失败的测试**

Create `src/app/__tests__/providers.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AppProviders } from '../providers'

describe('AppProviders', () => {
  it('renders children inside the provider stack', () => {
    const { container } = render(
      <AppProviders>
        <div data-testid="child">Hello</div>
      </AppProviders>
    )
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull()
    expect(container.textContent).toContain('Hello')
  })
})
```

- [ ] **Step 2: 运行测试验证它失败**

Run: `npx vitest run src/app/__tests__/providers.test.tsx`
Expected: FAIL with "Failed to resolve import '../providers'" 或 "AppProviders is not exported".

- [ ] **Step 3: 写最小实现**

Create `src/app/providers.tsx`:

```tsx
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '../store/AppState'
import ErrorBoundary from '../components/common/ErrorBoundary'
import SmoothScrollProvider from './SmoothScrollProvider'

export interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 4: 运行测试验证它通过**

Run: `npx vitest run src/app/__tests__/providers.test.tsx`
Expected: PASS (1/1).

- [ ] **Step 5: Commit**

```bash
git add src/app/providers.tsx src/app/__tests__/providers.test.tsx
git commit -m "feat(app): add AppProviders composing BrowserRouter + AppProvider + ErrorBoundary + SmoothScroll"
```

---

## Task 2: Routes.tsx —— 路由表

**Files:**
- Create: `src/app/Routes.tsx`
- Create: `src/app/__tests__/Routes.test.tsx`

**Why:** 把 `src/App.jsx` 里 19 个 `if (pathname === '/xxx') Page = ...` 改成声明式 `<Routes>`。同时接入 Plan 2 留下的 `/demo/series/:id`。`CuratePage` 路径从 `/curate` 改为 `/tools/curate`（与 §2.1 IA 一致）。

**重要：lazy import 路径** —— 当前页面在 `src/pages/*.jsx`，lazy 写法是 `lazy(() => import('../pages/Home'))`（无扩展名，Vite 自动解析）。Plan 4 重命名时再改 import。

- [ ] **Step 1: 写失败的测试**

Create `src/app/__tests__/Routes.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes as RRDRoutes, Route } from 'react-router-dom'
import AppRoutes from '../Routes'

// Stub all lazy-loaded pages. Each must `default` export a component.
vi.mock('../pages/SplashPage', () => ({ default: () => <div data-testid="splash">Splash</div> }))
vi.mock('../pages/AuthPage', () => ({ default: () => <div data-testid="auth">Auth</div> }))
vi.mock('../pages/Home', () => ({ default: () => <div data-testid="home">Home</div> }))
vi.mock('../pages/Library', () => ({ default: () => <div data-testid="library">Library</div> }))
vi.mock('../pages/PuzzlePage', () => ({ default: () => <div data-testid="create">Create</div> }))
vi.mock('../pages/GachaPage', () => ({ default: () => <div data-testid="gacha">Gacha</div> }))
vi.mock('../pages/GalleryPage', () => ({ default: () => <div data-testid="gallery">Gallery</div> }))
vi.mock('../pages/WorkDetailPage', () => ({ default: () => <div data-testid="work">Work</div> }))
vi.mock('../pages/PatternDetailPage', () => ({ default: () => <div data-testid="pattern">Pattern</div> }))
vi.mock('../pages/PhotoMatchPage', () => ({ default: () => <div data-testid="photo">PhotoMatch</div> }))
vi.mock('../pages/AdminReviewPage', () => ({ default: () => <div data-testid="admin">Admin</div> }))
vi.mock('../pages/CuratePage', () => ({ default: () => <div data-testid="curate">Curate</div> }))
vi.mock('../pages/Landing', () => ({ default: () => <div data-testid="landing">Landing</div> }))
vi.mock('../pages/demo/SeriesDemoPage', () => ({ default: () => <div data-testid="demo">Demo</div> }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  )
}

describe('AppRoutes', () => {
  it('renders SplashPage at /', () => {
    renderAt('/')
    expect(screen.getByTestId('splash')).toBeTruthy()
  })

  it('renders AuthPage at /auth', () => {
    renderAt('/auth')
    expect(screen.getByTestId('auth')).toBeTruthy()
  })

  it('renders Home at /home', () => {
    renderAt('/home')
    expect(screen.getByTestId('home')).toBeTruthy()
  })

  it('renders Library at /library', () => {
    renderAt('/library')
    expect(screen.getByTestId('library')).toBeTruthy()
  })

  it('renders Create (PuzzlePage) at /create', () => {
    renderAt('/create')
    expect(screen.getByTestId('create')).toBeTruthy()
  })

  it('renders Gallery at /gallery', () => {
    renderAt('/gallery')
    expect(screen.getByTestId('gallery')).toBeTruthy()
  })

  it('renders WorkDetailPage at /work/:id', () => {
    renderAt('/work/abc-123')
    expect(screen.getByTestId('work')).toBeTruthy()
  })

  it('renders PatternDetailPage at /pattern/:id', () => {
    renderAt('/pattern/qinghua-001')
    expect(screen.getByTestId('pattern')).toBeTruthy()
  })

  it('renders CuratePage at /tools/curate (NOT /curate)', () => {
    renderAt('/tools/curate')
    expect(screen.getByTestId('curate')).toBeTruthy()
  })

  it('renders SeriesDemoPage at /demo/series/:id (Plan 2 leftover)', () => {
    renderAt('/demo/series/cloud')
    expect(screen.getByTestId('demo')).toBeTruthy()
  })

  it('falls back to Splash at unknown path', () => {
    renderAt('/this-does-not-exist')
    expect(screen.getByTestId('splash')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 运行测试验证它失败**

Run: `npx vitest run src/app/__tests__/Routes.test.tsx`
Expected: FAIL "Failed to resolve import '../Routes'".

- [ ] **Step 3: 写最小实现**

Create `src/app/Routes.tsx`:

```tsx
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LegacyRedirects from './LegacyRedirects'

const SplashPage = lazy(() => import('../pages/SplashPage'))
const AuthPage = lazy(() => import('../pages/AuthPage'))
const Home = lazy(() => import('../pages/Home'))
const Library = lazy(() => import('../pages/Library'))
const PuzzlePage = lazy(() => import('../pages/PuzzlePage'))
const GachaPage = lazy(() => import('../pages/GachaPage'))
const GalleryPage = lazy(() => import('../pages/GalleryPage'))
const WorkDetailPage = lazy(() => import('../pages/WorkDetailPage'))
const PatternDetailPage = lazy(() => import('../pages/PatternDetailPage'))
const PhotoMatchPage = lazy(() => import('../pages/PhotoMatchPage'))
const AdminReviewPage = lazy(() => import('../pages/AdminReviewPage'))
const CuratePage = lazy(() => import('../pages/CuratePage'))
const Landing = lazy(() => import('../pages/Landing'))
const SeriesDemoPage = lazy(() => import('../pages/demo/SeriesDemoPage'))

function PageLoader() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary, #0C0A0E)',
        color: 'rgba(201,162,60,0.5)',
        fontSize: 24,
      }}
    >
      ☯
    </div>
  )
}

export interface AppRoutesProps {
  /** Optional children rendered above routes — used by App.tsx for GoldBackground etc. */
  children?: ReactNode
}

export default function AppRoutes({ children }: AppRoutesProps = {}) {
  return (
    <>
      {children}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <LegacyRedirects />
          <Route path="/" element={<SplashPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/pattern/:id" element={<PatternDetailPage />} />
          <Route path="/create" element={<PuzzlePage />} />
          <Route path="/gacha" element={<GachaPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/work/:id" element={<WorkDetailPage />} />
          <Route path="/photo-match" element={<PhotoMatchPage />} />
          <Route path="/admin" element={<AdminReviewPage />} />
          <Route path="/tools/curate" element={<CuratePage />} />
          <Route path="/demo/series/:id" element={<SeriesDemoPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
```

- [ ] **Step 4: 运行测试验证它通过**

Run: `npx vitest run src/app/__tests__/Routes.test.tsx`
Expected: PASS (11/11). Task 4 写的 LegacyRedirects 还没存在，但 `<LegacyRedirects />` 不渲染任何 Route 时返回 null，所以这里需要 Task 4 先完成或临时改 `<LegacyRedirects />` 为占位。

**注意：** Task 2 与 Task 4 有循环依赖。Task 2 的 Routes.tsx import 了 LegacyRedirects。两种处理：
- (A) 先做 Task 4 再做 Task 2
- (B) Task 2 先临时用 `<>` 占位，Task 4 写完后改回 `<LegacyRedirects />`

**采用 (B)**：Task 2 Step 3 的 Routes.tsx 暂时把 `<LegacyRedirects />` 一行注释掉或换成空 fragment，让测试能跑过；Task 4 写完后回来恢复 import 并加一条测试验证 `/puzzle` 重定向。

**Task 2 临时版本（Step 3 写入时）：** 把 `<LegacyRedirects />` 这行删掉，task 4 完成后再加回。

- [ ] **Step 5: Commit**

```bash
git add src/app/Routes.tsx src/app/__tests__/Routes.test.tsx
git commit -m "feat(app): add Routes.tsx with lazy-loaded page routes and 404 fallback"
```

---

## Task 3: BottomNav.tsx —— 4 tab 底栏

**Files:**
- Create: `src/app/BottomNav.tsx`
- Create: `src/app/__tests__/BottomNav.test.tsx`

**Why:** spec §2.1 主导航砍成 4 tab：Home / Library / Create（居中凸起，金色按钮）/ Gallery。原 `BottomNav.jsx` 5 tab 含 `/qinghua`（已并入 Library）和 `/puzzle`（已改 `/create`）—— 直接重写而非改造，避免遗留 icon 映射。Create 按钮居中凸起样式（渐变金色圆 + 阴影）保留原版。

- [ ] **Step 1: 写失败的测试**

Create `src/app/__tests__/BottomNav.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import BottomNav from '../BottomNav'

// Helper to capture current location after a click
function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname}</div>
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
      <LocationProbe />
    </MemoryRouter>
  )
}

describe('BottomNav', () => {
  it('renders exactly 4 tabs', () => {
    renderAt('/home')
    expect(screen.getByText('首页')).toBeTruthy()
    expect(screen.getByText('图鉴')).toBeTruthy()
    expect(screen.getByText('创作')).toBeTruthy()
    expect(screen.getByText('广场')).toBeTruthy()
  })

  it('highlights Home tab when at /home', () => {
    renderAt('/home')
    const homeBtn = screen.getByText('首页').closest('button')
    expect(homeBtn?.getAttribute('data-active')).toBe('true')
  })

  it('highlights Library tab when at /library', () => {
    renderAt('/library')
    const libBtn = screen.getByText('图鉴').closest('button')
    expect(libBtn?.getAttribute('data-active')).toBe('true')
  })

  it('clicking 创作 navigates to /create', () => {
    renderAt('/home')
    fireEvent.click(screen.getByText('创作'))
    expect(screen.getByTestId('loc').textContent).toBe('/create')
  })

  it('clicking 广场 navigates to /gallery', () => {
    renderAt('/home')
    fireEvent.click(screen.getByText('广场'))
    expect(screen.getByTestId('loc').textContent).toBe('/gallery')
  })

  it('Create tab is the center elevated button (data-center="true")', () => {
    renderAt('/home')
    const createBtn = screen.getByText('创作').closest('button')
    expect(createBtn?.getAttribute('data-center')).toBe('true')
  })
})
```

- [ ] **Step 2: 运行测试验证它失败**

Run: `npx vitest run src/app/__tests__/BottomNav.test.tsx`
Expected: FAIL "Failed to resolve import '../BottomNav'".

- [ ] **Step 3: 写最小实现**

Create `src/app/BottomNav.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router-dom'

interface TabDef {
  path: string
  label: string
  icon: (color: string) => JSX.Element
  center?: boolean
}

const ICONS = {
  home: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
    </svg>
  ),
  book: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  compose: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  gallery: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
}

const TABS: TabDef[] = [
  { path: '/home', label: '首页', icon: ICONS.home },
  { path: '/library', label: '图鉴', icon: ICONS.book },
  { path: '/create', label: '创作', icon: ICONS.compose, center: true },
  { path: '/gallery', label: '广场', icon: ICONS.gallery },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-16 flex items-end justify-around z-[100]"
      style={{
        background: 'rgba(10,10,10,0.95)',
        borderTop: '1px solid rgba(212,175,106,0.12)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.path
        const color = active ? '#F2D58A' : '#4A4A4A'

        if (tab.center) {
          return (
            <button
              key={tab.path}
              data-center="true"
              data-active={active ? 'true' : 'false'}
              onClick={() => navigate(tab.path)}
              className="bg-transparent border-none cursor-pointer flex flex-col items-center relative bottom-2 font-serif"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #BC6B2F, #8A4A20)',
                  boxShadow: '0 0 20px rgba(188,107,47,0.4)',
                }}
              >
                {tab.icon('#F5F1E8')}
              </div>
              <span
                className="text-[10px] mt-0.5"
                style={{ color: active ? '#F2D58A' : '#4A4A4A' }}
              >
                {tab.label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={tab.path}
            data-active={active ? 'true' : 'false'}
            onClick={() => navigate(tab.path)}
            className="bg-transparent border-none cursor-pointer flex flex-col items-center gap-0.5 py-1.5 font-serif relative"
          >
            {tab.icon(color)}
            <span className="text-[10px]" style={{ color }}>
              {tab.label}
            </span>
            {active && (
              <div className="w-4 h-0.5 bg-gold-bright rounded-sm absolute bottom-2" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: 运行测试验证它通过**

Run: `npx vitest run src/app/__tests__/BottomNav.test.tsx`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add src/app/BottomNav.tsx src/app/__tests__/BottomNav.test.tsx
git commit -m "feat(app): add 4-tab BottomNav (Home/Library/Create/Gallery) with center-elevated create button"
```

---

## Task 4: LegacyRedirects.tsx —— 9 条旧 URL 重定向

**Files:**
- Create: `src/app/LegacyRedirects.tsx`
- Create: `src/app/__tests__/LegacyRedirects.test.tsx`
- Modify: `src/app/Routes.tsx`（恢复 `<LegacyRedirects />` 引用）
- Modify: `src/app/__tests__/Routes.test.tsx`（加 `/puzzle → /create` 验证）

**Why:** spec §2.1 把 5 个创作页合成 `/create`、`/qinghua` 并入 `/library`、`/curate` 移到 `/tools/curate`、`/splash` 收成 `/`。老用户书签、分享链接、内部 history.push 调用都可能含旧 URL，客户端 `<Navigate replace>` 重定向到新路径，浏览器历史不留旧 URL。

**重定向表：**
| 旧路径 | 新路径 |
|---|---|
| `/splash` | `/` |
| `/puzzle` | `/create?mode=free` |
| `/composer` | `/create?mode=guided` |
| `/jigsaw` | `/create?mode=guided` |
| `/editor` | `/create?mode=preview` |
| `/showcase` | `/create?mode=preview` |
| `/qinghua` | `/library?series=qinghua` |
| `/curate` | `/tools/curate` |

8 条（不是 9 条 —— `/splash` 也在内）。`/landing` 暂时保留为正式路由（spec §2.1 标"隐"，但 Landing.jsx 还在用，Plan 4 处理）。

- [ ] **Step 1: 写失败的测试**

Create `src/app/__tests__/LegacyRedirects.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import LegacyRedirects from '../LegacyRedirects'

function CurrentPath() {
  const loc = useLocation()
  return (
    <div>
      <span data-testid="path">{loc.pathname}</span>
      <span data-testid="search">{loc.search}</span>
    </div>
  )
}

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <LegacyRedirects />
      <CurrentPath />
    </MemoryRouter>
  )
}

describe('LegacyRedirects', () => {
  it('redirects /splash to /', () => {
    const { getByTestId } = renderAt('/splash')
    expect(getByTestId('path').textContent).toBe('/')
  })

  it('redirects /puzzle to /create?mode=free', () => {
    const { getByTestId } = renderAt('/puzzle')
    expect(getByTestId('path').textContent).toBe('/create')
    expect(getByTestId('search').textContent).toBe('?mode=free')
  })

  it('redirects /composer to /create?mode=guided', () => {
    const { getByTestId } = renderAt('/composer')
    expect(getByTestId('path').textContent).toBe('/create')
    expect(getByTestId('search').textContent).toBe('?mode=guided')
  })

  it('redirects /jigsaw to /create?mode=guided', () => {
    const { getByTestId } = renderAt('/jigsaw')
    expect(getByTestId('path').textContent).toBe('/create')
    expect(getByTestId('search').textContent).toBe('?mode=guided')
  })

  it('redirects /editor to /create?mode=preview', () => {
    const { getByTestId } = renderAt('/editor')
    expect(getByTestId('path').textContent).toBe('/create')
    expect(getByTestId('search').textContent).toBe('?mode=preview')
  })

  it('redirects /showcase to /create?mode=preview', () => {
    const { getByTestId } = renderAt('/showcase')
    expect(getByTestId('path').textContent).toBe('/create')
    expect(getByTestId('search').textContent).toBe('?mode=preview')
  })

  it('redirects /qinghua to /library?series=qinghua', () => {
    const { getByTestId } = renderAt('/qinghua')
    expect(getByTestId('path').textContent).toBe('/library')
    expect(getByTestId('search').textContent).toBe('?series=qinghua')
  })

  it('redirects /curate to /tools/curate', () => {
    const { getByTestId } = renderAt('/curate')
    expect(getByTestId('path').textContent).toBe('/tools/curate')
  })

  it('does NOT redirect unknown paths (renders null)', () => {
    const { getByTestId } = renderAt('/some-random-path')
    // No redirect happens; CurrentPath still renders the original location.
    expect(getByTestId('path').textContent).toBe('/some-random-path')
  })
})
```

- [ ] **Step 2: 运行测试验证它失败**

Run: `npx vitest run src/app/__tests__/LegacyRedirects.test.tsx`
Expected: FAIL "Failed to resolve import '../LegacyRedirects'".

- [ ] **Step 3: 写最小实现**

Create `src/app/LegacyRedirects.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom'

/**
 * Redirects legacy hash-router URLs to the new IA.
 * Mounted as the first child inside <Routes> in Routes.tsx so it takes
 * precedence over the catch-all `*` fallback.
 *
 * Browser history is replaced (not pushed) so the old URL doesn't linger.
 */
export default function LegacyRedirects() {
  return (
    <Routes>
      <Route path="/splash" element={<Navigate to="/" replace />} />
      <Route path="/puzzle" element={<Navigate to="/create?mode=free" replace />} />
      <Route path="/composer" element={<Navigate to="/create?mode=guided" replace />} />
      <Route path="/jigsaw" element={<Navigate to="/create?mode=guided" replace />} />
      <Route path="/editor" element={<Navigate to="/create?mode=preview" replace />} />
      <Route path="/showcase" element={<Navigate to="/create?mode=preview" replace />} />
      <Route path="/qinghua" element={<Navigate to="/library?series=qinghua" replace />} />
      <Route path="/curate" element={<Navigate to="/tools/curate" replace />} />
    </Routes>
  )
}
```

**重要：** React Router v7 的 `<Routes>` 嵌套时，每个 `<Routes>` 会独立匹配。把 `<LegacyRedirects />` 放在外层 `<Routes>` 第一个子元素位置，旧 URL 优先命中并 `<Navigate>`，新 URL fallthrough 到后续 `<Route>`。具体写法见 Step 4 的 Routes.tsx 修改。

- [ ] **Step 4: 修改 Routes.tsx 接入 LegacyRedirects**

Modify `src/app/Routes.tsx`，把 Task 2 临时占位的 `<LegacyRedirects />`（如果当时注释掉了）恢复成正常 import + JSX。最终 Routes.tsx 的 return 段：

```tsx
return (
  <>
    {children}
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Legacy URL redirects — must be before the catch-all */}
        <Route path="/splash" element={<Navigate to="/" replace />} />
        <Route path="/puzzle" element={<Navigate to="/create?mode=free" replace />} />
        <Route path="/composer" element={<Navigate to="/create?mode=guided" replace />} />
        <Route path="/jigsaw" element={<Navigate to="/create?mode=guided" replace />} />
        <Route path="/editor" element={<Navigate to="/create?mode=preview" replace />} />
        <Route path="/showcase" element={<Navigate to="/create?mode=preview" replace />} />
        <Route path="/qinghua" element={<Navigate to="/library?series=qinghua" replace />} />
        <Route path="/curate" element={<Navigate to="/tools/curate" replace />} />

        {/* Primary routes */}
        <Route path="/" element={<SplashPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/pattern/:id" element={<PatternDetailPage />} />
        <Route path="/create" element={<PuzzlePage />} />
        <Route path="/gacha" element={<GachaPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/work/:id" element={<WorkDetailPage />} />
        <Route path="/photo-match" element={<PhotoMatchPage />} />
        <Route path="/admin" element={<AdminReviewPage />} />
        <Route path="/tools/curate" element={<CuratePage />} />
        <Route path="/demo/series/:id" element={<SeriesDemoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </>
)
```

**注意：** 直接把 LegacyRedirects 的内容内联进 Routes.tsx 比 `<LegacyRedirects />` 子组件更清晰 —— React Router v7 嵌套 `<Routes>` 行为有点反直觉，单层 `<Routes>` 全部 `<Route>` 平铺最稳。所以 **Task 4 最终决策：不抽 LegacyRedirects 子组件，把 8 条 `<Route>` 直接放进 Routes.tsx**。但 LegacyRedirects.tsx 文件仍然保留，导出一个 `LEGACY_REDIRECT_ROUTES` 常量数组，让 Routes.tsx 引用 —— 这样测试可以独立验证常量内容，也避免 Routes.tsx 里塞一大段 JSX。

**最终 LegacyRedirects.tsx 实现（替换 Step 3）：**

```tsx
import type { ReactElement } from 'react'
import { Navigate, Route } from 'react-router-dom'

export interface LegacyRedirect {
  from: string
  to: string
}

export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  { from: '/splash', to: '/' },
  { from: '/puzzle', to: '/create?mode=free' },
  { from: '/composer', to: '/create?mode=guided' },
  { from: '/jigsaw', to: '/create?mode=guided' },
  { from: '/editor', to: '/create?mode=preview' },
  { from: '/showcase', to: '/create?mode=preview' },
  { from: '/qinghua', to: '/library?series=qinghua' },
  { from: '/curate', to: '/tools/curate' },
]

/**
 * Render the legacy redirect <Route> elements. Place inside the main <Routes>,
 * before the primary routes, so old URLs are caught first.
 */
export default function LegacyRedirectRoutes(): ReactElement {
  return (
    <>
      {LEGACY_REDIRECTS.map(({ from, to }) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
    </>
  )
}
```

**Routes.tsx 里的用法：**

```tsx
<Routes>
  <LegacyRedirectRoutes />
  <Route path="/" element={<SplashPage />} />
  {/* ... */}
</Routes>
```

**LegacyRedirects.test.tsx 重写（替换 Step 1）：** 不再渲染独立 `<LegacyRedirects />`，而是直接测 `LEGACY_REDIRECTS` 常量 + 一个组合测试通过 Routes.tsx 间接验证。简化版：

```tsx
import { describe, it, expect } from 'vitest'
import { LEGACY_REDIRECTS } from '../LegacyRedirects'

describe('LEGACY_REDIRECTS', () => {
  it('covers all 8 legacy paths', () => {
    expect(LEGACY_REDIRECTS).toHaveLength(8)
  })

  it('redirects all creation tools to /create with mode', () => {
    const createRedirects = LEGACY_REDIRECTS.filter((r) => r.to.startsWith('/create'))
    expect(createRedirects.map((r) => r.from).sort()).toEqual(
      ['/composer', '/editor', '/jigsaw', '/puzzle', '/showcase'].sort()
    )
    expect(createRedirects.every((r) => r.to.includes('mode=')).toBeTruthy()
  })

  it('redirects /qinghua to /library with series=qinghua', () => {
    const q = LEGACY_REDIRECTS.find((r) => r.from === '/qinghua')
    expect(q?.to).toBe('/library?series=qinghua')
  })

  it('redirects /curate to /tools/curate', () => {
    const c = LEGACY_REDIRECTS.find((r) => r.from === '/curate')
    expect(c?.to).toBe('/tools/curate')
  })

  it('redirects /splash to /', () => {
    const s = LEGACY_REDIRECTS.find((r) => r.from === '/splash')
    expect(s?.to).toBe('/')
  })
})
```

**集成测试（加进 Routes.test.tsx）—— 验证重定向在 Routes.tsx 上下文里生效：**

```tsx
// 在 Routes.test.tsx 末尾追加：

it('redirects /puzzle to /create (legacy)', () => {
  renderAt('/puzzle')
  expect(screen.getByTestId('create')).toBeTruthy()
})

it('redirects /qinghua to /library (legacy)', () => {
  renderAt('/qinghua')
  expect(screen.getByTestId('library')).toBeTruthy()
})
```

- [ ] **Step 5: 运行所有相关测试验证通过**

Run: `npx vitest run src/app/__tests__/LegacyRedirects.test.tsx src/app/__tests__/Routes.test.tsx`
Expected: PASS (5 + 13 = 18 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/LegacyRedirects.tsx src/app/__tests__/LegacyRedirects.test.tsx src/app/Routes.tsx src/app/__tests__/Routes.test.tsx
git commit -m "feat(app): add 8 legacy URL redirects to /create, /library, /tools/curate"
```

---

## Task 5: App.tsx —— 新 app shell

**Files:**
- Create: `src/app/App.tsx`
- Create: `src/app/__tests__/App.test.tsx`

**Why:** 顶层组合：`<AppProviders>` 包 `<CloudSync />` + `<GoldBackground />` + `<AppRoutes>` + `<BottomNav>`（后两者通过 Layout 组件按路径决定是否显示底栏）。`CloudSync` bridge 从旧 App.jsx 复制过来 —— 它把 Supabase auth 状态桥到 zustand store。

- [ ] **Step 1: 写失败的测试**

Create `src/app/__tests__/App.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

// Stub all lazy-loaded pages so Suspense doesn't suspend in tests.
vi.mock('../pages/SplashPage', () => ({ default: () => <div data-testid="splash">Splash</div> }))
vi.mock('../pages/Home', () => ({ default: () => <div data-testid="home">Home</div> }))
vi.mock('../pages/AuthPage', () => ({ default: () => <div data-testid="auth">Auth</div> }))
vi.mock('../pages/Library', () => ({ default: () => <div data-testid="library">Library</div> }))
vi.mock('../pages/PuzzlePage', () => ({ default: () => <div data-testid="create">Create</div> }))
vi.mock('../pages/GalleryPage', () => ({ default: () => <div data-testid="gallery">Gallery</div> }))

// Stub AppProvider's underlying store hook so we don't need Supabase.
vi.mock('../store/AppState', async () => {
  const actual = await vi.importActual<typeof import('../store/AppState')>('../store/AppState')
  return {
    ...actual,
    AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useApp: () => ({
      syncFromCloud: vi.fn(),
      resetLocalData: vi.fn(),
    }),
  }
})

// Stub SmoothScrollProvider so Lenis doesn't try to attach.
vi.mock('../SmoothScrollProvider', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Stub auth hook to avoid Supabase calls.
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ user: null }),
}))

// Stub setSyncUser import used by CloudSync.
vi.mock('../store/gameStore', () => ({
  setSyncUser: vi.fn(),
}))

// Stub GoldBackground to a plain div (Three.js doesn't run in jsdom).
vi.mock('../components/common/GoldBackground', () => ({
  default: () => <div data-testid="gold-bg" />,
}))

describe('App', () => {
  it('renders SplashPage at / without BottomNav', () => {
    render(<App />)
    expect(screen.getByTestId('splash')).toBeTruthy()
    expect(screen.queryByText('首页')).toBeNull()
  })

  it('shows BottomNav on /home', () => {
    // Use jsdom + history pushState since BrowserRouter reads window.location.
    window.history.pushState({}, '', '/home')
    render(<App />)
    expect(screen.getByTestId('home')).toBeTruthy()
    expect(screen.getByText('首页')).toBeTruthy()
  })

  it('hides BottomNav on /auth', () => {
    window.history.pushState({}, '', '/auth')
    render(<App />)
    expect(screen.getByTestId('auth')).toBeTruthy()
    expect(screen.queryByText('首页')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试验证它失败**

Run: `npx vitest run src/app/__tests__/App.test.tsx`
Expected: FAIL "Failed to resolve import '../App'".

- [ ] **Step 3: 写最小实现**

Create `src/app/App.tsx`:

```tsx
import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AppProviders } from './providers'
import AppRoutes from './Routes'
import BottomNav from './BottomNav'
import { useApp } from '../store/AppState'
import { useAuth } from '../lib/auth'
import { setSyncUser } from '../store/gameStore'

const GoldBackground = lazy(() => import('../components/common/GoldBackground'))

/**
 * Bridge Supabase auth state to the zustand game store. Must live inside
 * AppProvider so it can call useApp().
 */
function CloudSync() {
  const { user } = useAuth()
  const { syncFromCloud, resetLocalData } = useApp()

  useEffect(() => {
    if (user) {
      resetLocalData()
      syncFromCloud(user.id)
    } else {
      setSyncUser(null)
    }
  }, [user, syncFromCloud, resetLocalData])

  return null
}

const HIDE_NAV_PATHS = new Set(['/', '/auth'])

function Layout() {
  const { pathname } = useLocation()
  const showNav = !HIDE_NAV_PATHS.has(pathname)

  return (
    <>
      <CloudSync />
      <Suspense fallback={null}>
        <GoldBackground />
      </Suspense>
      <AppRoutes />
      {showNav && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <AppProviders>
      <Layout />
    </AppProviders>
  )
}
```

**注意：** Plan 2 已有 `src/components/common/GoldBackground.jsx` —— 继续用，不重写。它 lazy 加载避免阻塞首屏。Plan 4 视觉重做时会替换成 SeriesSkin neutral 层，但 Plan 3 保持现状。

- [ ] **Step 4: 运行测试验证它通过**

Run: `npx vitest run src/app/__tests__/App.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx src/app/__tests__/App.test.tsx
git commit -m "feat(app): add App.tsx shell composing providers + Routes + BottomNav (hidden on splash/auth)"
```

---

## Task 6: Cutover —— 16 个 call site 迁移 + main.jsx 切换 + 旧文件删除

**Files:**
- Modify (13 pages): `src/pages/{Home,Landing,SplashPage,Library,PuzzlePage,PatternDetailPage,PhotoMatchPage,QinghuaBrowser,AuthPage,GalleryPage,WorkDetailPage,AdminReviewPage,JigsawPage}.jsx`
- Modify (3 components): `src/components/common/ErrorBoundary.jsx`、`src/components/gallery/AdminOnlyRoute.jsx`、`src/components/PreviewScaleModal.jsx`
- Modify: `src/main.jsx`
- Delete: `src/App.jsx`、`src/components/common/Router.jsx`、`src/components/common/BottomNav.jsx`

**Why:** 5 个新模块已经在 `src/app/` 就绪，但旧 App.jsx 仍然 wrap 着所有页用旧 RouterProvider。必须原子切换：所有页面 import 改成 `react-router-dom` → main.jsx 改 import 新 App.tsx → 删旧 Router.jsx/BottomNav.jsx/App.jsx。中间状态会全站白屏。

**迁移模式（适用大多数页面）：**

```jsx
// 旧
import { useNavigate, useLocation } from '../components/common/Router'
const navigate = useNavigate()
const { pathname } = useLocation()

// 新
import { useNavigate, useLocation } from 'react-router-dom'
const navigate = useNavigate()
const { pathname } = useLocation()
```

**特殊处理：**

1. **`PuzzlePage.jsx`** —— 用了 `useLocation` 的 `search` 字段。react-router 的 `useLocation` 也返回 `search`，但语义略不同（含 `?`）。建议改用 `useSearchParams`：
   ```tsx
   // 旧
   const { search } = useLocation()
   // 新（推荐）
   const [searchParams] = useSearchParams()
   const mode = searchParams.get('mode') ?? 'free'
   ```

2. **`PatternDetailPage.jsx`** —— 用 `window.location.hash.slice(1)` 解析 pattern id。改为 `useParams`：
   ```tsx
   // 旧
   const hash = window.location.hash.slice(1) // "/pattern/abc"
   const id = hash.split('/')[2]
   // 新
   const { id } = useParams()
   ```

3. **`ErrorBoundary.jsx`** —— `window.location.hash = '/home'` 改为 `window.location.href = '/home'`。class component 用 router hook 麻烦，直接整页跳转最简单。

4. **`PreviewScaleModal.jsx`** —— 检查实际用法（grep 一下），按同样模式迁。

5. **`AdminOnlyRoute.jsx`** —— import 源切换即可。

- [ ] **Step 1: 全量 grep 确认所有调用点**

Run:
```bash
grep -rn "from '\.\./components/common/Router'\|from '\./Router'" src/ 2>&1
```

Expected: 13 个 page 文件 + `BottomNav.jsx`（待删）+ `App.jsx`（待删）+ `AdminOnlyRoute.jsx`。**任何遗漏都会导致运行时崩溃 —— 这一步是 checklist，不能跳。**

- [ ] **Step 2: 逐个 page 文件迁移 import**

对每个页面文件，把：

```jsx
import { useNavigate, useLocation } from '../components/common/Router'
```

改成：

```jsx
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom'
```

（按需 import，未用的不写。多数页面只用 `useNavigate`。）

**13 个页面清单（按字母序）：**

1. `src/pages/AdminReviewPage.jsx` —— 用 `useNavigate`
2. `src/pages/AuthPage.jsx` —— 用 `useNavigate`
3. `src/pages/GalleryPage.jsx` —— 用 `useNavigate`
4. `src/pages/Home.jsx` —— 用 `useNavigate`，注意 `path: '/puzzle'` 字符串可保留（LegacyRedirects 会处理），但建议改成 `/create`（直接命中，省一次重定向）
5. `src/pages/JigsawPage.jsx` —— 用 `useNavigate`
6. `src/pages/Landing.jsx` —— 用 `useNavigate`
7. `src/pages/Library.jsx` —— 用 `useNavigate`
8. `src/pages/PatternDetailPage.jsx` —— **特殊处理**：见 Step 3
9. `src/pages/PhotoMatchPage.jsx` —— 用 `useNavigate`
10. `src/pages/PuzzlePage.jsx` —— **特殊处理**：见 Step 4
11. `src/pages/QinghuaBrowser.jsx` —— 用 `useNavigate`
12. `src/pages/SplashPage.jsx` —— 用 `useNavigate`
13. `src/pages/WorkDetailPage.jsx` —— 用 `useNavigate` + `useLocation.pathname`

- [ ] **Step 3: PatternDetailPage.jsx 特殊处理 —— useParams**

读 `src/pages/PatternDetailPage.jsx` 第 39-50 行附近的 hash 解析代码，替换：

```jsx
// 旧
const hash = window.location.hash.slice(1) // remove #
const id = hash.split('/')[2] // "/pattern/abc" → "abc"

// 新
import { useParams } from 'react-router-dom'
// ...
const { id } = useParams()
```

**注意：** PatternDetailPage 内部如果有 `navigate('/pattern/xyz')` 调用，路径不变，照旧。只是 `id` 来源换成 useParams。

- [ ] **Step 4: PuzzlePage.jsx 特殊处理 —— useSearchParams**

读 `src/pages/PuzzlePage.jsx` 第 27-28 行：

```jsx
// 旧
const { search } = useLocation()
// 后续可能：new URLSearchParams(search).get('fork')

// 新
import { useSearchParams } from 'react-router-dom'
const [searchParams] = useSearchParams()
const forkId = searchParams.get('fork')
```

- [ ] **Step 5: WorkDetailPage.jsx —— pathname 提取**

WorkDetailPage 用 `useLocation` 解构 `pathname`，类似 PatternDetailPage 改 `useParams` 提取 work id：

```jsx
// 旧
const { pathname } = useLocation()
const id = pathname.split('/')[2] // "/work/abc" → "abc"

// 新
import { useParams } from 'react-router-dom'
const { id } = useParams()
```

- [ ] **Step 6: 迁移 ErrorBoundary.jsx**

Modify `src/components/common/ErrorBoundary.jsx` 第 33 行：

```jsx
// 旧
onClick={() => { this.setState({ hasError: false, error: null }); window.location.hash = '/home' }}

// 新
onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/home' }}
```

- [ ] **Step 7: 迁移 AdminOnlyRoute.jsx**

Modify `src/components/gallery/AdminOnlyRoute.jsx` 第 2 行：

```jsx
// 旧
import { useNavigate } from '../common/Router'

// 新
import { useNavigate } from 'react-router-dom'
```

- [ ] **Step 8: 检查 PreviewScaleModal.jsx**

Run:
```bash
grep -n "Router\|location\.hash\|useNavigate\|useLocation" src/components/PreviewScaleModal.jsx 2>&1
```

如果命中：
- `from '../common/Router'` → `from 'react-router-dom'`
- `window.location.hash = ...` → `window.location.href = ...`

如果不命中，跳过此步。

- [ ] **Step 9: 检查 Home.jsx 内的路径常量**

`src/pages/Home.jsx` 第 43 行有 `path: '/puzzle'` 字符串字面量。改成 `/create`（直接命中新路由，省一次客户端重定向）。同样检查其他页面里硬编码的旧路径：

Run:
```bash
grep -rn "navigate('/puzzle')\|navigate('/composer')\|navigate('/jigsaw')\|navigate('/editor')\|navigate('/showcase')\|navigate('/qinghua')\|navigate('/curate')\|navigate('/splash')" src/pages/ src/components/ 2>&1
```

每条命中改为新路径（推荐）或保留旧路径（依赖 LegacyRedirects 兜底，但有一次客户端跳转开销）。**建议直接改新路径**，把 LegacyRedirects 留给真正的外部书签。

- [ ] **Step 10: 切 main.jsx**

Modify `src/main.jsx`:

```jsx
// 旧
import App from './App.jsx'

// 新
import App from './app/App'
```

完整 main.jsx:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 11: 删除旧文件**

```bash
rm src/App.jsx
rm src/components/common/Router.jsx
rm src/components/common/BottomNav.jsx
```

- [ ] **Step 12: 验证 build + 测试**

Run:
```bash
npx vitest run 2>&1 | tail -20
```
Expected: 全部测试通过（Plan 2 收尾时 74 个 + Plan 3 新增约 25 个 ≈ 99 个）。

Run:
```bash
npm run build 2>&1 | tail -20
```
Expected: 构建成功，bundle gzip 总大小 ≤600 kB（Plan 2 基线 569.77 kB + react-router-dom ~10 kB）。

**如果 build 失败：** 最常见原因是某个文件 import 没改干净。grep 报错文件的 import 行，按上面模式修复。

- [ ] **Step 13: 验证 dev server**

Run（后台）:
```bash
npm run dev
```

打开浏览器访问：
- `http://localhost:5173/` —— 应见 SplashPage
- `http://localhost:5173/home` —— 应见 Home + 底栏 4 tab
- `http://localhost:5173/puzzle` —— 应自动跳到 `/create`，渲染 PuzzlePage
- `http://localhost:5173/qinghua` —— 应自动跳到 `/library?series=qinghua`
- `http://localhost:5173/demo/series/cloud` —— 应见 Plan 2 的云系列 demo 页

每条都正常才能进 Step 14。**dev server 不通过不要commit。**

- [ ] **Step 14: Commit**

```bash
git add -A
git status  # 检查没有意外文件
git commit -m "feat(app): cutover to React Router v7 — migrate 16 call sites, flip main.jsx, delete old Router/BottomNav/App

- 13 pages: import source switched to react-router-dom
- PatternDetailPage / WorkDetailPage: useParams replaces hash parsing
- PuzzlePage: useSearchParams replaces useLocation.search
- ErrorBoundary: window.location.hash → href
- main.jsx: import from ./app/App
- Delete: src/App.jsx, src/components/common/Router.jsx, src/components/common/BottomNav.jsx"
```

**重要：** 不要用 `git add -A`。用 `git add -A` 前先 `git status` 检查 —— 工作树里如果有 `.claude/settings.local.json`、`node_modules/` 等不该提交的东西，必须先确认 `.gitignore` 已覆盖（Plan 2 已加）。

更稳的做法：
```bash
git add src/main.jsx src/pages/ src/components/common/ErrorBoundary.jsx src/components/gallery/AdminOnlyRoute.jsx
git rm src/App.jsx src/components/common/Router.jsx src/components/common/BottomNav.jsx
git status
git commit -m "..."
```

---

## Task 7: 最终验证 —— bundle / 测试 / 类型 / 烟测

**Files:** 无新增。仅运行检查。

**Why:** Plan 3 跨 16 个文件改 import，最容易出错的不是单文件而是连接处。最后跑一遍全量检查再宣告完成。

- [ ] **Step 1: 全量测试**

Run:
```bash
npx vitest run 2>&1 | tail -30
```

Expected:
- 全部 PASS
- 测试数 ≈ 99 个（Plan 2 收尾 74 + Plan 3 新增 25）
- 0 fail

如果有 fail，定位修复 —— 不能进 Step 2。

- [ ] **Step 2: TypeScript 严格检查**

Run:
```bash
npx tsc -p src/app/tsconfig.json --noEmit 2>&1 | tail -20
```

Expected: 0 error。Plan 2 时有一个 `baseUrl` 弃用警告（5.0→6.0 迁移期），保留即可，不算 error。

如果有 error，最常见是：
- 漏写 type import（`import { ReactNode }` 应为 `import type { ReactNode } from 'react'` 或 `import { type ReactNode } from 'react'`）
- JSX.Element 类型在 React 19 + TS 6 下需要 `import type { JSX } from 'react'`，或直接用 `ReactElement`

- [ ] **Step 3: 构建 + bundle 体积**

Run:
```bash
npm run build 2>&1 | tail -30
```

Expected:
- 构建成功
- 总 gzip ≤600 kB
- react-router-dom 单独 chunk 或并入 main，估计 +10 kB gzip

记录数字（写入 commit message 或进度文件）：

```
dist/assets/index-xxxx.js  580.2 kB │ gzip: 180.5 kB
dist/assets/index-xxxx.css  45.2 kB │ gzip:  10.1 kB
...
Total gzip: ~XXX kB
```

- [ ] **Step 4: dev server 全路径烟测**

Run（后台）:
```bash
npm run dev
```

访问下列路径，每条勾选：

- [ ] `/` —— SplashPage 渲染，无底栏
- [ ] `/auth` —— AuthPage 渲染，无底栏
- [ ] `/home` —— Home 渲染，底栏 4 tab，Home tab 高亮
- [ ] `/library` —— Library 渲染，底栏 Library tab 高亮
- [ ] `/create` —— PuzzlePage 渲染（Plan 3 临时指向），Create 居中按钮高亮
- [ ] `/gallery` —— GalleryPage 渲染，Gallery tab 高亮
- [ ] `/gacha` —— GachaPage 渲染，无底栏高亮（不在主 tab）
- [ ] `/pattern/qinghua-001` —— PatternDetailPage 渲染
- [ ] `/work/test-id` —— WorkDetailPage 渲染
- [ ] `/photo-match` —— PhotoMatchPage 渲染
- [ ] `/admin` —— AdminReviewPage 渲染（如未登录可能跳 auth，预期）
- [ ] `/tools/curate` —— CuratePage 渲染
- [ ] `/demo/series/cloud` —— Plan 2 demo 页渲染（云系列皮肤）
- [ ] `/demo/series/dragon` —— Plan 2 demo 页（龙系列丝绸）
- [ ] `/puzzle` —— 自动重定向到 `/create`
- [ ] `/qinghua` —— 自动重定向到 `/library?series=qinghua`
- [ ] `/curate` —— 自动重定向到 `/tools/curate`
- [ ] `/splash` —— 自动重定向到 `/`
- [ ] `/random-garbage` —— 自动重定向到 `/`（fallback）

**任何一条不符，回到 Task 6 修复。**

- [ ] **Step 5: 最终 commit（如果 Task 6 后还有 hotfix）**

如果 Task 7 期间改了任何代码：

```bash
git add src/
git commit -m "fix(app): address review findings from Plan 3 final verification"
```

如果没改，跳过此步。

- [ ] **Step 6: 撰写 Plan 3 完成报告**

在 commit message 或 PR 描述里写：

```
Plan 3 完成:
- 5 个新 TS 模块 (providers/Routes/BottomNav/LegacyRedirects/App)
- 25 个新测试 (累计 99)
- 16 个 call site 迁移到 react-router-dom
- 8 条 legacy URL 重定向
- 删除 Router.jsx / BottomNav.jsx / App.jsx
- Bundle gzip: XXX kB (≤600 预算)
- /demo/series/:id 接入正式路由表

Plan 4 待办:
- 页面 TS 化 (.jsx → .tsx)
- SeriesSkin 挂载到各页
- CreatePage 3 模式切换实现
- features/ 目录打包
- 视觉重做优先级 5 (Home/Library/PatternDetail/Create/Gacha)
```

---

## Self-Review（写完 plan 后跑一遍）

**1. Spec 覆盖：**
- §2 IA 路由结构 → Task 2 Routes.tsx ✓
- §2 旧路径合并 → Task 4 LegacyRedirects ✓
- §7 Router 替换 → Task 1-6 ✓
- §8 目录重划 src/app/ → Task 1-5 ✓
- §8 features/ 打包 → **明确推迟到 Plan 4**（决策日志已记）
- §9 5 必做页面 → **不在 Plan 3 范围**（Plan 3 只迁路径，不动视觉）

**2. 占位符扫描：** 无 TBD / TODO / "fill in" / "similar to Task N"。每个 step 都有具体代码或命令。

**3. 类型一致性：**
- `AppProvidersProps.children: ReactNode` —— 与 design-system 既有组件一致 ✓
- `TabDef.icon: (color: string) => JSX.Element` —— TS 6 下可能需要 `ReactElement`，subagent 实测时调整 ✓
- `LegacyRedirect.from/to: string` —— 一致 ✓
- `useApp()` 返回值 —— 旧 AppState.tsx 已定义，Plan 3 不动 ✓

**4. 任务独立性：**
- Task 1-5 各自有独立测试，互不依赖（Task 2 暂时跳过 LegacyRedirects，Task 4 完成后回来加）
- Task 6 依赖 Task 1-5 完成（main.jsx 切换需要新 App.tsx 存在）
- Task 7 依赖 Task 6 完成

---

## Execution Handoff

**Plan 完成并保存到 `docs/superpowers/plans/2026-08-12-wenmai-v3-plan-3-ia-router.md`。两种执行选项：**

**1. Subagent-Driven（推荐）** —— 每 task 一个新 subagent，task 间两阶段 review（spec 然后代码质量）。Plan 2 走的就是这条路。

**2. Inline Execution** —— 在本 session 直接按 task 执行，batch checkpoint review。

**哪种？**
