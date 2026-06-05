/**
 * 对称生成引擎
 * 支持旋转对称、镜像、四方连续
 */

export const SYMMETRY_MODES = {
  ROTATE_4: { id: 'rotate-4', name: '4次旋转', folds: 4, type: 'rotate' },
  ROTATE_6: { id: 'rotate-6', name: '6次旋转', folds: 6, type: 'rotate' },
  ROTATE_8: { id: 'rotate-8', name: '8次旋转', folds: 8, type: 'rotate' },
  MIRROR_H: { id: 'mirror-h', name: '左右镜像', axis: 'vertical', type: 'mirror' },
  MIRROR_V: { id: 'mirror-v', name: '上下镜像', axis: 'horizontal', type: 'mirror' },
  MIRROR_4: { id: 'mirror-4', name: '四向镜像', type: 'mirror4' },
  TILE: { id: 'tile', name: '四方连续', cols: 3, rows: 3, type: 'tile' },
}

/**
 * 在 Canvas 上绘制对称纹样
 */
export function drawSymmetric(ctx, drawFn, mode, canvasSize = 512) {
  const cx = canvasSize / 2
  const cy = canvasSize / 2

  ctx.clearRect(0, 0, canvasSize, canvasSize)
  ctx.save()

  if (mode.type === 'rotate') {
    drawRotational(ctx, drawFn, mode.folds, cx, cy, canvasSize)
  } else if (mode.type === 'mirror') {
    drawMirror(ctx, drawFn, mode.axis, cx, cy, canvasSize)
  } else if (mode.type === 'mirror4') {
    drawMirror4(ctx, drawFn, cx, cy, canvasSize)
  } else if (mode.type === 'tile') {
    drawTile(ctx, drawFn, mode.cols, mode.rows, canvasSize)
  }

  ctx.restore()
}

function drawRotational(ctx, drawFn, folds, cx, cy, size) {
  const angleStep = (Math.PI * 2) / folds
  for (let i = 0; i < folds; i++) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angleStep * i)
    ctx.translate(-cx, -cy)
    drawFn(ctx, cx, cy, size)
    ctx.restore()
  }
}

function drawMirror(ctx, drawFn, axis, cx, cy, size) {
  // 原始
  drawFn(ctx, cx, cy, size)

  // 镜像
  ctx.save()
  if (axis === 'vertical') {
    ctx.translate(size, 0)
    ctx.scale(-1, 1)
  } else {
    ctx.translate(0, size)
    ctx.scale(1, -1)
  }
  drawFn(ctx, cx, cy, size)
  ctx.restore()
}

function drawMirror4(ctx, drawFn, cx, cy, size) {
  // 四个象限：原始 + 水平翻转 + 垂直翻转 + 双翻转
  const transforms = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]

  for (const [sx, sy] of transforms) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(sx, sy)
    ctx.translate(-cx, -cy)
    drawFn(ctx, cx, cy, size)
    ctx.restore()
  }
}

function drawTile(ctx, drawFn, cols, rows, canvasSize) {
  const tileW = canvasSize / cols
  const tileH = canvasSize / rows

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.save()
      ctx.translate(c * tileW, r * tileH)
      ctx.beginPath()
      ctx.rect(0, 0, tileW, tileH)
      ctx.clip()
      drawFn(ctx, tileW / 2, tileH / 2, tileW)
      ctx.restore()
    }
  }
}

/**
 * 从 SVG 元素创建可绘制的函数
 */
export function createDrawFromSVG(svgElement) {
  return (ctx, cx, cy, size) => {
    const img = new Image()
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    img.onload = () => {
      const scale = size * 0.3
      ctx.drawImage(img, cx - scale / 2, cy - scale / 2, scale, scale)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }
}

/**
 * Canvas 转 PNG blob
 */
export function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}
