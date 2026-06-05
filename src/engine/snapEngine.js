/**
 * 磁力吸附引擎
 * 检测组件锚点距离，自动吸附对齐
 */

// 吸附阈值（画布像素距离）
const SNAP_THRESHOLD = 160
const SNAP_STRENGTH = 0.4 // 0~1，越大吸附越猛

/**
 * 计算组件在世界坐标下的锚点位置
 * @param {Object} component - 组件数据（含 anchors）
 * @param {Object} placement - 放置信息 { x, y, size, rotation }
 * @returns {Array} 世界坐标锚点数组
 */
export function getWorldAnchors(component, placement) {
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
 * @param {Object} movingAnchors - 正在拖拽组件的锚点
 * @param {Array} staticPlacements - 画布上已有组件的锚点列表
 * @param {number} threshold - 吸附阈值
 * @returns {Object|null} { snapTo, offset, distance }
 */
export function findSnapTarget(movingAnchors, staticAnchors, threshold = SNAP_THRESHOLD) {
  let best = null
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
 * @param {Object} snap - findSnapTarget 的结果
 * @returns {{ dx: number, dy: number }}
 */
export function getSnapOffset(snap) {
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
 * @param {number} centerX - 画布中心 X
 * @param {number} centerY - 画布中心 Y
 * @param {number} radius - 排列半径
 * @param {number} count - 组件数量
 * @param {number} index - 当前组件索引
 * @returns {{ x, y, rotation }}
 */
export function getArcPosition(centerX, centerY, radius, count, index) {
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
 * @param {number} canvasSize - 画布尺寸
 * @param {number} margin - 距离边缘的距离
 * @param {string} position - 角件位置 'top-right'
 * @returns {{ x, y, rotation }}
 */
export function getCornerPosition(canvasSize, margin, position = 'top-right') {
  const positions = {
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
export function centerPlacement(canvasSize) {
  return { x: canvasSize / 2, y: canvasSize / 2, size: canvasSize * 0.35, rotation: 0 }
}

/**
 * 收集画布上所有已放置组件的锚点
 * @param {Array} placements - [{ component, x, y, size, rotation }]
 * @param {number} excludeIndex - 排除的索引（正在拖拽的）
 */
export function collectStaticAnchors(placements, excludeIndex = -1) {
  const anchors = []
  placements.forEach((p, i) => {
    if (i === excludeIndex) return
    const worldAnchors = getWorldAnchors(p.component, p)
    worldAnchors.forEach(a => {
      anchors.push({ ...a, placementIndex: i })
    })
  })
  return anchors
}
