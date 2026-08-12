// src/types/user.ts
export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  isAdmin: boolean
  createdAt: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error?: string
}
