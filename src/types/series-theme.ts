// src/types/series-theme.ts
import type { SeriesId } from './pattern'

export type ParticleType = 'sparkle' | 'mist' | 'cloud' | 'rust' | 'growth' | 'none'
export type DecorationType = 'cloud' | 'seal' | 'bronze' | 'vine' | 'splash' | 'none'
export type CardBorderStyle = 'soft' | 'gold-line' | 'ink-line' | 'splash'
export type SeriesIntensity = 'full' | 'subtle' | 'minimal'

export type ShaderKind = 'cloud' | 'fluid' | 'none'

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
  /** 系列专用 shader 背景（迁移自旧 CloudShader/FluidShader），默认 'none' */
  shader?: ShaderKind
  /** 团龙系列专用 silk canvas 装饰，默认 false */
  silkCanvas?: boolean
}
