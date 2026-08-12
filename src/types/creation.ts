// src/types/creation.ts
export type CreationMode = 'free' | 'guided' | 'preview'
export type GuidedSubMode = 'symmetry' | 'jigsaw'
export type PreviewSubMode = 'relief' | 'shatter'

export interface Placement {
  id: string
  patternId: string
  x: number
  y: number
  rotation: number
  scale: number
  zIndex: number
}

export interface CanvasState {
  width: number
  height: number
  placements: Placement[]
  background?: string
}

// ── PuzzlePage-specific types ─────────────────────────
// NOTE: PuzzlePlacement is intentionally separate from `Placement` above
// (which is used by useCreationStore with a different shape). The puzzle
// canvas treats each placement as { id (=patternId), x, y, size, ... }
// and supports empty template slots, scale deformation, and a transient
// `_temp` flag used during tray-drag collision preview.
export interface PuzzlePlacement {
  id: string
  x: number
  y: number
  size: number
  rotation?: number
  scale?: number
  scaleX?: number
  scaleY?: number
  slotId?: string
  slotLabel?: string
  isEmpty?: boolean
  _temp?: boolean
}

// Cached per-pattern shape data for collision/snapping/deformation.
// `mask` is a MASK_DIM × MASK_DIM binary bitmap (1 = occupied).
// `contour` is the angular-sampled silhouette used by edge snapping.
// `flexible` marks patterns (云纹/几何/四方连续) that should stretch
// toward nearby fixed blocks during drag.
export interface ShapeData {
  mask: Uint8Array
  size: number
  boundingRadius: number
  contour: { x: number; y: number }[]
  flexible: boolean
}

// A pre-rendered shape-following "stamp" canvas (transparent outside
// the silhouette, dark backing + warm outline + original image inside).
export type OutlineBlock = HTMLCanvasElement
