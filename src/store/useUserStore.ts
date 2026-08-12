import { create } from 'zustand'
import type { User } from '../types/user'

interface UserState {
  user: User | null
  loading: boolean
  error?: string
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
  logout: () => void
  reset: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  error: undefined,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, error: undefined }),
  reset: () => set({ user: null, loading: false, error: undefined }),
}))
