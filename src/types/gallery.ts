// src/types/gallery.ts
export type WorkStatus = 'pending' | 'approved' | 'rejected'

export interface Work {
  id: string
  authorId: string
  authorName: string
  title: string
  description?: string
  coverUrl: string
  placements: string  // JSON
  status: WorkStatus
  rejectReason?: string
  likesCount: number
  reuseCount: number
  forkedFrom?: string
  createdAt: string
  updatedAt: string
}

export interface Like {
  workId: string
  userId: string
  createdAt: string
}
