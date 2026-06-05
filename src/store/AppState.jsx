import { createContext, useContext } from 'react'
import { useGameStore } from './gameStore'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const store = useGameStore()
  return <AppContext.Provider value={store}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
