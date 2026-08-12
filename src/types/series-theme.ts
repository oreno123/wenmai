// src/types/series-theme.ts
import type { SeriesId } from './pattern'

export type ParticleType = 'sparkle' | 'mist' | 'cloud' | 'rust' | 'growth' | 'none'
export type DecorationType = 'cloud' | 'seal' | 'bronze' | 'vine' | 'splash' | 'none'
export type CardBorderStyle = 'soft' | 'gold-line' | 'ink-line' | 'splash'
export type SeriesIntensity = 'full' | 'subtle' | 'minimal'

export interface SeriesTheme {
  id: SeriesId
  name: string
  primary: string
  soft: string
  bgGradient: string
  particle: ParticleType
  decoration: DecorationType
  cardBorder: CardBorderStyle
  textGlow: boolean
}
