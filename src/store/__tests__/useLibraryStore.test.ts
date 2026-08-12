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
