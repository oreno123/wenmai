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

// ──────────────────────────────────────────────────────────
// GalleryPage / WorkDetailPage 运行时形状
// 来自 src/lib/galleryApi.js 的 supabase 返回（JSON 字符串/嵌套 author）。
// 与上面 `Work`（被 useGalleryStore 使用）分开，互不干扰。
// ──────────────────────────────────────────────────────────

export interface GalleryWork {
  id: string
  title: string
  cover_path: string | null
  placements: unknown  // 来自 supabase 的 JSON 字符串；页面不深度解析
  template?: string | null
  series?: string | null
  author: { user_id: string; username: string } | null
  forked_from?: string | null
  source?: GalleryWork | null  // fork 详情页用的源作品
  likes_count: number
  reuse_count: number
  status: 'pending' | 'approved' | 'rejected'
  rejected_reason?: string | null
  created_at: string
}

export type GallerySortKey = 'newest' | 'hottest' | 'curated'

export interface ListWorksParams {
  sort?: GallerySortKey
  series?: string | null
  template?: string | null
  limit?: number
}
