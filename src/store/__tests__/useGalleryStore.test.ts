import { describe, it, expect, beforeEach } from 'vitest'
import { useGalleryStore } from '../useGalleryStore'
import type { Work } from '../../types/gallery'

const mockWork = (id: string): Work => ({
  id, authorId: 'u1', authorName: 'A', title: 'T',
  coverUrl: '/c.webp', placements: '[]', status: 'approved',
  likesCount: 0, reuseCount: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01',
})

describe('useGalleryStore', () => {
  beforeEach(() => {
    useGalleryStore.getState().reset()
  })

  it('starts empty', () => {
    expect(useGalleryStore.getState().works).toEqual([])
    expect(useGalleryStore.getState().loading).toBe(false)
  })

  it('sets works', () => {
    useGalleryStore.getState().setWorks([mockWork('w1'), mockWork('w2')])
    expect(useGalleryStore.getState().works).toHaveLength(2)
  })

  it('toggles like', () => {
    useGalleryStore.getState().setWorks([mockWork('w1')])
    useGalleryStore.getState().toggleLike('w1')
    expect(useGalleryStore.getState().likedWorkIds).toContain('w1')
    expect(useGalleryStore.getState().works[0].likesCount).toBe(1)
    useGalleryStore.getState().toggleLike('w1')
    expect(useGalleryStore.getState().likedWorkIds).not.toContain('w1')
    expect(useGalleryStore.getState().works[0].likesCount).toBe(0)
  })
})
