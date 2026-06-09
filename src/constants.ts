/**
 * 纹脉项目全局常量
 * 所有散布在各文件的魔法数字集中到这里
 */

// ── 游戏经济 ─────────────────────────────────────────────
export const DAILY_FREE_PULLS = 10
export const PULL_COST = 10            // 非免费单次抽卡积分消耗
export const TEN_PULL_COST = 90        // 十连抽积分（九折）
export const INITIAL_POINTS = 1000
export const MAX_CREATIONS = 20

// ── 抽卡保底 ─────────────────────────────────────────────
export const PITY_THRESHOLD = 90      // 硬保底：90 抽必出 SSR
export const SOFT_PITY_START = 75     // 软保底起始

// ── 稀有度权重 ──────────────────────────────────────────
export const RARITY_WEIGHTS = {
  common: 60,
  rare: 30,
  ssr: 10,
}

// ── Canvas 尺寸 ─────────────────────────────────────────
export const CANVAS_SIZE = 512
export const CANVAS_LARGE = 1024

// ── 拼图吸附 ────────────────────────────────────────────
export const SNAP_THRESHOLD = 50      // puzzleSnap 吸附阈值（画布像素）
export const SNAP_STRENGTH = 0.4      // 吸附力度 0~1
export const PUZZLE_DISPLAY = 380     // 拼图页面显示尺寸

// ── 存储 ────────────────────────────────────────────────
export const STORAGE_KEY = 'wenmai_data'
export const MAX_STORAGE_BYTES = 4 * 1024 * 1024  // 4MB 安全上限
