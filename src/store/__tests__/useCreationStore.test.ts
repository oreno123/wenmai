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
