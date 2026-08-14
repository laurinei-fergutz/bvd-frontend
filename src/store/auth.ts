import { create } from 'zustand'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
    set({ token })
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))
