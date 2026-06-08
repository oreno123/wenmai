import { SNAP_THRESHOLD as SNAP_DIST, SNAP_STRENGTH_VAL } from '../constants'

// ── Types ─────────────────────────────────────────────

interface ContourPoint {
  x: number;
  y: number;
}

export interface PuzzleBlock {
  id: string;
  name: string;
  type: 'fixed' | 'flexible';
  image: string;
  imageSize: number;
  contourKeyPoints: ContourPoint[];
  centroid: ContourPoint;
  boundingRadius: number;
  source?: string;
}

export interface PuzzlePlacement {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface ContourSnapResult {
  offset: { dx: number; dy: number };
  distance: number;
  targetIdx: number;
}

export interface DeformationResult {
  scaleX: number;
  scaleY: number;
}

export interface StaticPlacementEntry {
  block: PuzzleBlock;
  placement: PuzzlePlacement;
}

// ── Constants ─────────────────────────────────────────

const SNAP_THRESHOLD = SNAP_DIST   // from constants
const SNAP_STRENGTH_VAL_VAL = SNAP_STRENGTH_VAL

// ── Functions ─────────────────────────────────────────

/**
 * 将块的归一化轮廓点转换为世界坐标
 */
export function transformContourPoints(
  block: PuzzleBlock,
  placement: PuzzlePlacement,
): ContourPoint[] {
  const { x, y, scale = 1, rotation = 0, scaleX = 1, scaleY = 1 } = placement
  const sz = block.imageSize * scale
  const rad = rotation * Math.PI / 180
  const cosR = Math.cos(rad)
  const sinR = Math.sin(rad)

  return block.contourKeyPoints.map(p => {
    const lx = (p.x - 0.5) * sz * scaleX
    const ly = (p.y - 0.5) * sz * scaleY
    return {
      x: x + lx * cosR - ly * sinR,
      y: y + lx * sinR + ly * cosR,
    }
  })
}

/**
 * 查找最近的吸附目标
 * 优化：先用 boundingRadius 快速排除远距离碎片，再做轮廓点匹配
 */
export function findContourSnap(
  movingBlock: PuzzleBlock,
  movingPlacement: PuzzlePlacement,
  staticPlacements: StaticPlacementEntry[],
  excludeIdx: number = -1,
): ContourSnapResult | null {
  const mPts = transformContourPoints(movingBlock, movingPlacement)
  const mRadius = movingBlock.boundingRadius * movingBlock.imageSize * (movingPlacement.scale || 1)
  const mCx = movingPlacement.x
  const mCy = movingPlacement.y

  let bestDist = SNAP_THRESHOLD
  let bestOffset: { dx: number; dy: number } = { dx: 0, dy: 0 }
  let bestTarget = -1

  const thresholdSq = SNAP_THRESHOLD * SNAP_THRESHOLD

  for (let si = 0; si < staticPlacements.length; si++) {
    if (si === excludeIdx) continue
    const { block: sBlock, placement: sPlace } = staticPlacements[si]

    // Bounding circle pre-filter: skip if too far apart
    const sRadius = sBlock.boundingRadius * sBlock.imageSize * (sPlace.scale || 1)
    const cdx = mCx - sPlace.x
    const cdy = mCy - sPlace.y
    const centerDist = Math.sqrt(cdx * cdx + cdy * cdy)
    if (centerDist > mRadius + sRadius + SNAP_THRESHOLD) continue

    const sPts = transformContourPoints(sBlock, sPlace)

    for (const mp of mPts) {
      for (const sp of sPts) {
        const dx = mp.x - sp.x
        const dy = mp.y - sp.y
        const distSq = dx * dx + dy * dy
        if (distSq < thresholdSq && distSq < bestDist * bestDist) {
          const dist = Math.sqrt(distSq)
          bestDist = dist
          const factor = 1 - Math.min(dist / SNAP_THRESHOLD, 1)
          bestOffset = {
            dx: -dx * SNAP_STRENGTH_VAL * factor,
            dy: -dy * SNAP_STRENGTH_VAL * factor,
          }
          bestTarget = si
        }
      }
    }
  }

  return bestDist < SNAP_THRESHOLD
    ? { offset: bestOffset, distance: bestDist, targetIdx: bestTarget }
    : null
}

/**
 * 计算柔性块的变形参数
 * 当柔性块靠近固定块时，沿连接方向拉伸
 */
export function computeDeformation(
  flexBlock: PuzzleBlock,
  flexPlace: PuzzlePlacement,
  fixedBlock: PuzzleBlock,
  fixedPlace: PuzzlePlacement,
): DeformationResult {
  const dx = fixedPlace.x - flexPlace.x
  const dy = fixedPlace.y - flexPlace.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return { scaleX: 1, scaleY: 1 }

  // 连接方向角度
  const angle = Math.atan2(dy, dx)
  // 相对于柔性块自身旋转的角度
  const relAngle = angle - (flexPlace.rotation || 0) * Math.PI / 180

  // 沿连接方向的拉伸量：越近拉伸越大，最大 60%
  const maxStretch = 1.6
  const minDist = (flexBlock.boundingRadius + fixedBlock.boundingRadius) * flexBlock.imageSize * (flexPlace.scale || 1)
  const proximity = Math.max(0, 1 - dist / minDist)
  const stretch = 1 + proximity * (maxStretch - 1)

  // 分配到 X/Y 轴
  const cosA = Math.abs(Math.cos(relAngle))
  const sinA = Math.abs(Math.sin(relAngle))
  const total = cosA + sinA || 1

  return {
    scaleX: 1 + (stretch - 1) * (cosA / total),
    scaleY: 1 + (stretch - 1) * (sinA / total),
  }
}

/**
 * 检测点击是否在某个块内（使用外接圆快速判断）
 */
export function hitTest(
  block: PuzzleBlock,
  placement: PuzzlePlacement,
  px: number,
  py: number,
): boolean {
  const dx = px - placement.x
  const dy = py - placement.y
  const r = block.boundingRadius * block.imageSize * (placement.scale || 1) * Math.max(placement.scaleX || 1, placement.scaleY || 1)
  return Math.sqrt(dx * dx + dy * dy) < r
}
