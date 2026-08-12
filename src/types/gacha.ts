// src/types/gacha.ts
import type { Pattern } from './pattern'

export type GachaTier = 'common' | 'rare' | 'ssr'

export interface PullResult {
  id: string
  pattern: Pattern
  tier: GachaTier
  isNew: boolean
  pulledAt: string
}

export interface GachaHistory {
  totalPulls: number
  pityCounter: number  // 自上次 SSR 起计数
  lastPullAt?: string
}
