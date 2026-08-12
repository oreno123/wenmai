import { create } from 'zustand'
import type { Placement, CreationMode } from '../types/creation'

interface CreationState {
  mode: CreationMode
  placements: Placement[]
  canvasWidth: number
  canvasHeight: number
  setMode: (m: CreationMode) => void
  addPlacement: (p: Placement) => void
  updatePlacement: (id: string, patch: Partial<Placement>) => void
  removePlacement: (id: string) => void
  clearCanvas: () => void
  reset: () => void
}

export const useCreationStore = create<CreationState>((set) => ({
  mode: 'free',
  placements: [],
  canvasWidth: 1080,
  canvasHeight: 1080,
  setMode: (mode) => set({ mode }),
  addPlacement: (p) => set((s) => ({ placements: [...s.placements, p] })),
  updatePlacement: (id, patch) => set((s) => ({
    placements: s.placements.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  })),
  removePlacement: (id) => set((s) => ({
    placements: s.placements.filter((p) => p.id !== id),
  })),
  clearCanvas: () => set({ placements: [] }),
  reset: () => set({ mode: 'free', placements: [], canvasWidth: 1080, canvasHeight: 1080 }),
}))
