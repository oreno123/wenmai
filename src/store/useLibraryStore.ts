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
