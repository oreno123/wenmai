/**
 * 磁力吸附引擎
 * 检测组件锚点距离，自动吸附对齐
 */

// ── Types ─────────────────────────────────────────────

interface AnchorDef {
  x: number;
  y: number;
  angle: number;
  type: 'input' | 'output';
}

export interface WorldAnchor extends AnchorDef {
  x: number;
  y: number;
  angle: number;
  type: 'input' | 'output';
}

export interface ComponentLike {
  viewBox: string;
  anchors?: AnchorDef[];
}

export interface Placement {
  x: number;
  y: number;
  size: number;
  rotation?: number;
}

export interface SnapTarget {
  movingAnchor: WorldAnchor;
  staticAnchor: WorldAnchor;
  offsetX: number;
  offsetY: number;
  distance: number;
}

export interface SnapOffset {
  dx: number;
  dy: number;
}

export interface Position2D {
  x: number;
  y: number;
  rotation: number;
}

export interface PlacementWithComponent extends Placement {
  component: ComponentLike;
}

// ── Constants ─────────────────────────────────────────

// 吸附阈值（画布像素距离）
const SNAP_THRESHOLD = 160
const SNAP_STRENGTH = 0.4 // 0~1，越大吸附越猛

// ── Functions ─────────────────────────────────────────

/**
 * 计算组件在世界坐标下的锚点位置
 */
export function getWorldAnchors(component: ComponentLike, placement: Placement): WorldAnchor[] {
  const { x, y, size, rotation = 0 } = placement
  const vb = component.viewBox.split(' ').map(Number)
  const scale = size / Math.max(vb[2], vb[3])

  return (component.anchors || []).map(anchor => {
    // 锚点在 viewBox 中的偏移（相对于中心）
    const ax = anchor.x - vb[0] - vb[2] / 2
    const ay = anchor.y - vb[1] - vb[3] / 2

    // 缩放
    const sx = ax * scale
    const sy = ay * scale

    // 旋转
    const rad = rotation * Math.PI / 180
    const rx = sx * Math.cos(rad) - sy * Math.sin(rad)
    const ry = sx * Math.sin(rad) + sy * Math.cos(rad)

    return {
      x: x + rx,
      y: y + ry,
      angle: (anchor.angle + rotation) % 360,
      type: anchor.type,
    }
  })
}

/**
 * 找到最近的吸附点
 * @returns SnapTarget | null
 */
export function findSnapTarget(
  movingAnchors: WorldAnchor[],
  staticAnchors: WorldAnchor[],
  threshold: number = SNAP_THRESHOLD,
): SnapTarget | null {
  let best: SnapTarget | null = null
  let bestDist = threshold

  for (const ma of movingAnchors) {
    for (const sa of staticAnchors) {
      // 只匹配 input-output 对
      if (ma.type === sa.type) continue

      const dx = ma.x - sa.x
      const dy = ma.y - sa.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < bestDist) {
        bestDist = dist
        best = {
          movingAnchor: ma,
          staticAnchor: sa,
          offsetX: dx,
          offsetY: dy,
          distance: dist,
        }
      }
    }
  }

  return best
}

/**
 * 计算吸附后的组件位置偏移
 */
export function getSnapOffset(snap: SnapTarget | null): SnapOffset {
  if (!snap) return { dx: 0, dy: 0 }
  // 渐进吸附：距离越近偏移越大，不是瞬间跳过去
  const factor = 1 - Math.min(snap.distance / SNAP_THRESHOLD, 1)
  return {
    dx: -snap.offsetX * SNAP_STRENGTH * factor,
    dy: -snap.offsetY * SNAP_STRENGTH * factor,
  }
}

/**
 * 为 border 件计算圆弧排列位置
 */
export function getArcPosition(
  centerX: number,
  centerY: number,
  radius: number,
  count: number,
  index: number,
): Position2D {
  // 从顶部开始顺时针排列
  const startAngle = -Math.PI / 2
  const angleStep = (Math.PI * 2) / count
  const angle = startAngle + angleStep * index

  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
    rotation: (angle * 180 / Math.PI) + 90,
  }
}

/**
 * 计算角件的固定位置
 */
export function getCornerPosition(
  canvasSize: number,
  margin: number,
  position: string = 'top-right',
): Position2D {
  const positions: Record<string, Position2D> = {
    'top-right': { x: canvasSize - margin, y: margin, rotation: 0 },
    'top-left': { x: margin, y: margin, rotation: -90 },
    'bottom-left': { x: margin, y: canvasSize - margin, rotation: 180 },
    'bottom-right': { x: canvasSize - margin, y: canvasSize - margin, rotation: 90 },
  }
  return positions[position] || positions['top-right']
}

/**
 * 中心件自动居中
 */
export function centerPlacement(canvasSize: number): Placement {
  return { x: canvasSize / 2, y: canvasSize / 2, size: canvasSize * 0.35, rotation: 0 }
}

/**
 * 收集画布上所有已放置组件的锚点
 */
export function collectStaticAnchors(
  placements: PlacementWithComponent[],
  excludeIndex: number = -1,
): (WorldAnchor & { placementIndex: number })[] {
  const anchors: (WorldAnchor & { placementIndex: number })[] = []
  placements.forEach((p, i) => {
    if (i === excludeIndex) return
    const worldAnchors = getWorldAnchors(p.component, p)
    worldAnchors.forEach(a => {
      anchors.push({ ...a, placementIndex: i })
    })
  })
  return anchors
}
