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
