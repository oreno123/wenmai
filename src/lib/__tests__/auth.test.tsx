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
