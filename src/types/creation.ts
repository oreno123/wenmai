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
