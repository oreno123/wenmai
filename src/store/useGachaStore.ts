import { create } from 'zustand'
import type { PullResult, GachaHistory } from '../types/gacha'

interface GachaState {
  history: GachaHistory
  lastPull?: PullResult
  recordPull: (r: PullResult) => void
  reset: () => void
}

export const useGachaStore = create<GachaState>((set) => ({
  history: { totalPulls: 0, pityCounter: 0 },
  lastPull: undefined,
  recordPull: (r) => set((s) => {
    const isSsr = r.tier === 'ssr'
    return {
      lastPull: r,
      history: {
        totalPulls: s.history.totalPulls + 1,
        pityCounter: isSsr ? 0 : s.history.pityCounter + 1,
        lastPullAt: r.pulledAt,
      },
    }
  }),
  reset: () => set({ history: { totalPulls: 0, pityCounter: 0 }, lastPull: undefined }),
}))
