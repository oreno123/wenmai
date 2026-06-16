// Shape-level interaction helpers for the puzzle canvas.
//
// Three concerns live here:
//   - contour extraction from a binary mask
//   - edge snapping (dragged block attracts to a static block's edge)
//   -柔性变形 (flexible blocks stretch toward fixed blocks)
//
// Mask is 64x64 Uint8Array, 1 = pattern cell, 0 = empty.
// All coordinates in functions below are world (canvas) space unless noted.

export interface ShapeData {
  mask: Uint8Array
  boundingRadius: number // normalized [0, 1] of half-mask-size
  size: number // mask dimension (64)
  centroid?: { x: number; y: number } // normalized [0, 1]
}

export interface ShapeWithContour extends ShapeData {
  contour: ContourPoint[] // normalized [0, 1]
}

export interface Placement {
  x: number
  y: number
  size: number
  rotation?: number
  scaleX?: number
  scaleY?: number
}

export interface ContourPoint { x: number; y: number }

export interface SnapResult {
  dx: number
  dy: number
  distance: number
}

// ── Contour extraction ─────────────────────────────────

/**
 * Extract contour points from a 64x64 binary mask by finding edge cells
 * (mask=1 with at least one empty 4-neighbor), then uniformly sampling
 * `sampleCount` of them by angle around the centroid. Returns normalized
 * [0, 1] coordinates. Suitable for convex / near-convex silhouettes; for
 * highly concave shapes (e.g. 饕餮) the angular sampling loses concavity
 * but the result is still usable for snapping.
 */
export function extractContour(shape: ShapeData, sampleCount = 32): ContourPoint[] {
  const N = shape.size
  const mask = shape.mask
  const cx = (shape.centroid?.x ?? 0.5) * N
  const cy = (shape.centroid?.y ?? 0.5) * N

  // Collect edge cells
  const edges: Array<{ x: number; y: number; angle: number }> = []
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      if (!mask[y * N + x]) continue
      if (!mask[(y - 1) * N + x] || !mask[(y + 1) * N + x] ||
          !mask[y * N + x - 1] || !mask[y * N + x + 1]) {
        const ax = x - cx
        const ay = y - cy
        edges.push({ x, y, angle: Math.atan2(ay, ax) })
      }
    }
  }
  if (edges.length === 0) return []

  // Sort by angle, then uniformly sample sampleCount points
  edges.sort((a, b) => a.angle - b.angle)
  const contour: ContourPoint[] = []
  for (let i = 0; i < sampleCount; i++) {
    const idx = Math.floor((i / sampleCount) * edges.length)
    contour.push({ x: edges[idx].x / N, y: edges[idx].y / N })
  }
  return contour
}

// ── Coordinate transforms ──────────────────────────────

/**
 * Transform a placement's normalized contour points to world coordinates.
 * scaleX/scaleY stretch the block along its local axes before rotation.
 */
export function transformContourPoints(
  contour: ContourPoint[],
  placement: Placement,
): Array<{ x: number; y: number }> {
  const { x, y, size, rotation = 0, scaleX = 1, scaleY = 1 } = placement
  const rad = rotation * Math.PI / 180
  const cosR = Math.cos(rad)
  const sinR = Math.sin(rad)

  return contour.map(p => {
    const lx = (p.x - 0.5) * size * scaleX
    const ly = (p.y - 0.5) * size * scaleY
    return {
      x: x + lx * cosR - ly * sinR,
      y: y + lx * sinR + ly * cosR,
    }
  })
}

// ── Edge snapping ──────────────────────────────────────

/**
 * Find the best snap target for `moving` placement against any of
 * `statics`. Returns the world-space snap offset to apply to `moving`,
 * or null if no snap target is within threshold.
 *
 * Algorithm: brute-force contour-point-pair distance with bounding-circle
 * pre-filter. Within threshold, snap strength scales inversely with
 * distance (closer = stronger pull).
 */
export function findContourSnap(
  movingContour: ContourPoint[],
  movingPlace: Placement,
  movingBoundingRadius: number,
  statics: Array<{ contour: ContourPoint[]; place: Placement; boundingRadius: number; idx: number }>,
  snapThreshold: number,
  snapStrength: number,
  excludeIdx: number = -1,
): SnapResult | null {
  const mPts = transformContourPoints(movingContour, movingPlace)
  const mRadius = movingBoundingRadius * movingPlace.size * 0.5

  let bestDist = snapThreshold
  let bestDx = 0
  let bestDy = 0
  const thresholdSq = snapThreshold * snapThreshold

  for (const s of statics) {
    if (s.idx === excludeIdx) continue
    // Bounding circle pre-filter
    const sRadius = s.boundingRadius * s.place.size * 0.5
    const cdx = movingPlace.x - s.place.x
    const cdy = movingPlace.y - s.place.y
    const centerDist = Math.sqrt(cdx * cdx + cdy * cdy)
    if (centerDist > mRadius + sRadius + snapThreshold) continue

    const sPts = transformContourPoints(s.contour, s.place)
    for (const mp of mPts) {
      for (const sp of sPts) {
        const dx = mp.x - sp.x
        const dy = mp.y - sp.y
        const distSq = dx * dx + dy * dy
        if (distSq < thresholdSq && distSq < bestDist * bestDist) {
          const dist = Math.sqrt(distSq)
          bestDist = dist
          const factor = 1 - Math.min(dist / snapThreshold, 1)
          bestDx = -dx * snapStrength * factor
          bestDy = -dy * snapStrength * factor
        }
      }
    }
  }

  if (bestDist < snapThreshold) {
    return { dx: bestDx, dy: bestDy, distance: bestDist }
  }
  return null
}

// ── 柔性变形 ─────────────────────────────────────────────

const FLEXIBLE_TYPES = new Set(['云纹', '几何纹', '四方连续'])

export function isFlexiblePattern(type: string | undefined): boolean {
  return !!type && FLEXIBLE_TYPES.has(type)
}

// ── 推荐位置（用于拖拽时的虚影提示） ───────────────────

export interface SuggestedPosition {
  x: number // canvas space
  y: number
  rotation: number // degrees, suggested orientation
  role: 'corner' | 'center' | 'edge' | 'border'
}

/**
 * Return suggested positions for a pattern of the given type on a canvas
 * of `canvasSize`. Used to draw ghost guides while dragging — purely
 * advisory, does not constrain placement.
 *
 * Conventions:
 *   角花        → 4 corners, each rotated to point inward
 *   龙纹/兽面/山海经/花卉/卷草(主体) → center
 *   云纹        → 4 edge midpoints, oriented along the edge
 *   几何/四方连续 → no suggestions (tile fill)
 */
export function getSuggestedPositions(
  type: string | undefined,
  canvasSize: number,
): SuggestedPosition[] {
  if (!type) return []
  const c = canvasSize / 2
  const m = canvasSize * 0.22 // corner offset from edge
  switch (type) {
    case '角花':
      return [
        { x: m, y: m, rotation: 0, role: 'corner' },
        { x: canvasSize - m, y: m, rotation: 90, role: 'corner' },
        { x: m, y: canvasSize - m, rotation: -90, role: 'corner' },
        { x: canvasSize - m, y: canvasSize - m, rotation: 180, role: 'corner' },
      ]
    case '龙纹':
    case '兽面纹':
    case '山海经':
    case '花卉纹':
      return [{ x: c, y: c, rotation: 0, role: 'center' }]
    case '云纹':
      return [
        { x: c, y: m, rotation: 180, role: 'edge' },
        { x: c, y: canvasSize - m, rotation: 0, role: 'edge' },
        { x: m, y: c, rotation: 90, role: 'edge' },
        { x: canvasSize - m, y: c, rotation: -90, role: 'edge' },
      ]
    case '卷草纹':
      // Border decoration: 4 edge midpoints
      return [
        { x: c, y: m, rotation: 180, role: 'border' },
        { x: c, y: canvasSize - m, rotation: 0, role: 'border' },
        { x: m, y: c, rotation: 90, role: 'border' },
        { x: canvasSize - m, y: c, rotation: -90, role: 'border' },
      ]
    default:
      return []
  }
}

/**
 * Compute deformation (scaleX, scaleY) for a flexible block based on
 * proximity to a fixed block. Stretches up to `maxStretch` along the
 * connection axis. Returns identity if blocks are too far apart.
 */
export function computeDeformation(
  flexPlace: Placement,
  fixedPlace: Placement,
  flexBoundingRadius: number,
  fixedBoundingRadius: number,
  maxStretch = 1.6,
): { scaleX: number; scaleY: number } {
  const dx = fixedPlace.x - flexPlace.x
  const dy = fixedPlace.y - flexPlace.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return { scaleX: 1, scaleY: 1 }

  const angle = Math.atan2(dy, dx)
  const relAngle = angle - (flexPlace.rotation || 0) * Math.PI / 180

  const minDist = (flexBoundingRadius + fixedBoundingRadius) * flexPlace.size * 0.5
  const proximity = Math.max(0, 1 - dist / minDist)
  const stretch = 1 + proximity * (maxStretch - 1)

  const cosA = Math.abs(Math.cos(relAngle))
  const sinA = Math.abs(Math.sin(relAngle))
  const total = cosA + sinA || 1

  return {
    scaleX: 1 + (stretch - 1) * (cosA / total),
    scaleY: 1 + (stretch - 1) * (sinA / total),
  }
}

/**
 * Find the nearest fixed placement to `flexPlace` and return deformation
 * toward it. If no fixed placement is within reach, returns identity.
 */
export function computeDeformationTowards(
  flexPlace: Placement,
  flexBoundingRadius: number,
  fixeds: Array<{ place: Placement; boundingRadius: number }>,
): { scaleX: number; scaleY: number } {
  let bestDist = Infinity
  let bestFixed: { place: Placement; boundingRadius: number } | null = null

  for (const f of fixeds) {
    const dx = f.place.x - flexPlace.x
    const dy = f.place.y - flexPlace.y
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      bestFixed = f
    }
  }
  if (!bestFixed) return { scaleX: 1, scaleY: 1 }

  return computeDeformation(
    flexPlace,
    bestFixed.place,
    flexBoundingRadius,
    bestFixed.boundingRadius,
  )
}
