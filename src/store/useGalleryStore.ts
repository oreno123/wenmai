import { create } from 'zustand'
import type { Work } from '../types/gallery'

interface GalleryState {
  works: Work[]
  loading: boolean
  likedWorkIds: string[]
  setWorks: (w: Work[]) => void
  setLoading: (b: boolean) => void
  toggleLike: (id: string) => void
  reset: () => void
}

export const useGalleryStore = create<GalleryState>((set) => ({
  works: [],
  loading: false,
  likedWorkIds: [],
  setWorks: (works) => set({ works }),
  setLoading: (loading) => set({ loading }),
  toggleLike: (id) => set((s) => {
    const liked = s.likedWorkIds.includes(id)
    return {
      likedWorkIds: liked
        ? s.likedWorkIds.filter((i) => i !== id)
        : [...s.likedWorkIds, id],
      works: s.works.map((w) => w.id === id
        ? { ...w, likesCount: Math.max(0, w.likesCount + (liked ? -1 : 1)) }
        : w),
    }
  }),
  reset: () => set({ works: [], loading: false, likedWorkIds: [] }),
}))
