// src/types/pattern.ts
export type Rarity = 'common' | 'rare' | 'ssr'

export type PatternType =
  | '云纹' | '兽面纹' | '龙纹' | '卷草纹' | '花卉纹' | '几何纹'
  | '角花' | '四方连续' | '山海经' | '青花瓷'

export type SeriesId =
  | 'cloud' | 'taotie' | 'dragon' | 'scroll' | 'floral' | 'geometric'
  | 'corner' | 'tile' | 'shanjing' | 'qinghua' | 'ai' | 'neutral'

export interface Pattern {
  id: string
  name: string
  type: PatternType
  series: SeriesId
  rarity: Rarity
  tags: string[]
  image: string
}

export interface SeriesInfo {
  id: SeriesId
  name: string
  description: string
  color: string
}
