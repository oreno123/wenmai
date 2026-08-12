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
