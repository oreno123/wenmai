import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import App from '../App'

// Stub all lazy-loaded pages so Suspense doesn't suspend in tests.
vi.mock('../../pages/SplashPage', () => ({ default: () => <div data-testid="splash">Splash</div> }))
vi.mock('../../pages/Home', () => ({ default: () => <div data-testid="home">Home</div> }))
vi.mock('../../pages/AuthPage', () => ({ default: () => <div data-testid="auth">Auth</div> }))
vi.mock('../../pages/Library', () => ({ default: () => <div data-testid="library">Library</div> }))
vi.mock('../../pages/PuzzlePage', () => ({ default: () => <div data-testid="create">Create</div> }))
vi.mock('../../pages/GalleryPage', () => ({ default: () => <div data-testid="gallery">Gallery</div> }))

// Stub AppProvider's underlying store hook so we don't need Supabase.
vi.mock('../../store/AppState', async () => {
  const actual = await vi.importActual<typeof import('../../store/AppState')>('../../store/AppState')
  return {
    ...actual,
    AppProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useApp: () => ({
      syncFromCloud: vi.fn(),
      resetLocalData: vi.fn(),
    }),
  }
})

// Stub SmoothScrollProvider so Lenis doesn't try to attach.
vi.mock('../SmoothScrollProvider', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

// Stub auth hook to avoid Supabase calls.
vi.mock('../../lib/auth', () => ({
  useAuth: () => ({ user: null }),
}))

// Stub setSyncUser import used by CloudSync.
vi.mock('../../store/gameStore', () => ({
  setSyncUser: vi.fn(),
}))

// Stub GoldBackground to a plain div (Three.js doesn't run in jsdom).
vi.mock('../../components/common/GoldBackground', () => ({
  default: () => <div data-testid="gold-bg" />,
}))

describe('App', () => {
  it('renders SplashPage at / without BottomNav', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(await screen.findByTestId('splash')).toBeTruthy()
    expect(screen.queryByText('首页')).toBeNull()
  })

  it('shows BottomNav on /home', async () => {
    window.history.pushState({}, '', '/home')
    render(<App />)
    expect(await screen.findByTestId('home')).toBeTruthy()
    expect(screen.getByText('首页')).toBeTruthy()
  })

  it('hides BottomNav on /auth', async () => {
    window.history.pushState({}, '', '/auth')
    render(<App />)
    expect(await screen.findByTestId('auth')).toBeTruthy()
    expect(screen.queryByText('首页')).toBeNull()
  })
})
