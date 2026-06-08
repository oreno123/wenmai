import { createContext, useContext } from 'react'
import { useGameStore } from './gameStore'
import type { GameStore } from './gameStore'

const AppContext = createContext<GameStore | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const store = useGameStore()
  return <AppContext.Provider value={store}>{children}</AppContext.Provider>
}

export function useApp(): GameStore {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return ctx
}
