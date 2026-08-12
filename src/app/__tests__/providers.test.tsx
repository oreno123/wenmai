import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// AppProviders composes AppProvider, which pulls in gameStore → lib/supabase.js.
// supabase.js eagerly calls createClient at module load and throws when
// VITE_SUPABASE_URL is unset (test env). Mock it so the provider stack can
// be imported without real Supabase credentials.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) })),
      upsert: vi.fn(() => ({ error: null })),
    })),
    auth: { signInAnonymously: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: null })) },
  },
  isSupabaseConfigured: false,
}))

// AppProviders composes SmoothScrollProvider, whose useSmoothScroll hook
// instantiates Lenis in an effect. Lenis' constructor calls window.matchMedia,
// which jsdom does not implement. Mock lenis (same pattern as
// SmoothScrollProvider.test.tsx).
vi.mock('lenis', () => ({
  default: vi.fn(() => ({
    raf: vi.fn(),
    destroy: vi.fn(),
  })),
}))

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
