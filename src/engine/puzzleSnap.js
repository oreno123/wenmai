/**
 * 拼图块边缘吸附引擎
 * 基于轮廓关键点的暴力距离检测 + 渐进磁吸
 */

const SNAP_THRESHOLD = 50   // 画布像素距离
const SNAP_STRENGTH = 0.4   // 0~1 吸附力度

/**
 * 将块的归一化轮廓点转换为世界坐标
 */
export function transformContourPoints(block, placement) {
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
 * @param {Object} movingBlock - 正在拖拽的块定义
 * @param {Object} movingPlacement - 拖拽块的放置状态
 * @param {Array} staticPlacements - 画布上已有块的放置状态 [{block, placement}]
 * @param {number} excludeIdx - 排除的索引
 * @returns {Object|null} { offset, distance, targetIdx }
 */
export function findContourSnap(movingBlock, movingPlacement, staticPlacements, excludeIdx = -1) {
  const mPts = transformContourPoints(movingBlock, movingPlacement)
  let bestDist = SNAP_THRESHOLD
  let bestOffset = { dx: 0, dy: 0 }
  let bestTarget = -1

  for (let si = 0; si < staticPlacements.length; si++) {
    if (si === excludeIdx) continue
    const { block: sBlock, placement: sPlace } = staticPlacements[si]
    const sPts = transformContourPoints(sBlock, sPlace)

    for (const mp of mPts) {
      for (const sp of sPts) {
        const dx = mp.x - sp.x
        const dy = mp.y - sp.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < bestDist) {
          bestDist = dist
          const factor = 1 - Math.min(dist / SNAP_THRESHOLD, 1)
          bestOffset = {
            dx: -dx * SNAP_STRENGTH * factor,
            dy: -dy * SNAP_STRENGTH * factor,
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
export function computeDeformation(flexBlock, flexPlace, fixedBlock, fixedPlace) {
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
export function hitTest(block, placement, px, py) {
  const dx = px - placement.x
  const dy = py - placement.y
  const r = block.boundingRadius * block.imageSize * (placement.scale || 1) * Math.max(placement.scaleX || 1, placement.scaleY || 1)
  return Math.sqrt(dx * dx + dy * dy) < r
}
