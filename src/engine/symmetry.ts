/**
 * 对称生成引擎
 * 支持旋转对称、镜像、四方连续
 */

// ── Types ─────────────────────────────────────────────

/** Callback signature for drawing a pattern segment */
export type DrawFn = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) => void;

interface RotateMode {
  id: string;
  name: string;
  folds: number;
  type: 'rotate';
}

interface MirrorMode {
  id: string;
  name: string;
  axis: 'vertical' | 'horizontal';
  type: 'mirror';
}

interface Mirror4Mode {
  id: string;
  name: string;
  type: 'mirror4';
}

interface TileMode {
  id: string;
  name: string;
  cols: number;
  rows: number;
  type: 'tile';
}

export type SymmetryMode = RotateMode | MirrorMode | Mirror4Mode | TileMode;

export type SymmetryModeKey = keyof typeof SYMMETRY_MODES;

// ── Mode definitions ──────────────────────────────────

export const SYMMETRY_MODES: Record<string, SymmetryMode> = {
  ROTATE_4: { id: 'rotate-4', name: '4次旋转', folds: 4, type: 'rotate' },
  ROTATE_6: { id: 'rotate-6', name: '6次旋转', folds: 6, type: 'rotate' },
  ROTATE_8: { id: 'rotate-8', name: '8次旋转', folds: 8, type: 'rotate' },
  MIRROR_H: { id: 'mirror-h', name: '左右镜像', axis: 'vertical', type: 'mirror' },
  MIRROR_V: { id: 'mirror-v', name: '上下镜像', axis: 'horizontal', type: 'mirror' },
  MIRROR_4: { id: 'mirror-4', name: '四向镜像', type: 'mirror4' },
  TILE: { id: 'tile', name: '四方连续', cols: 3, rows: 3, type: 'tile' },
}

// ── Internal drawing helpers ──────────────────────────

function drawRotational(
  ctx: CanvasRenderingContext2D,
  drawFn: DrawFn,
  folds: number,
  cx: number,
  cy: number,
  size: number,
): void {
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

function drawMirror(
  ctx: CanvasRenderingContext2D,
  drawFn: DrawFn,
  axis: 'vertical' | 'horizontal',
  cx: number,
  cy: number,
  size: number,
): void {
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

function drawMirror4(
  ctx: CanvasRenderingContext2D,
  drawFn: DrawFn,
  cx: number,
  cy: number,
  size: number,
): void {
  // 四个象限：原始 + 水平翻转 + 垂直翻转 + 双翻转
  const transforms: [number, number][] = [
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

function drawTile(
  ctx: CanvasRenderingContext2D,
  drawFn: DrawFn,
  cols: number,
  rows: number,
  canvasSize: number,
): void {
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

// ── Public API ────────────────────────────────────────

/**
 * 在 Canvas 上绘制对称纹样
 */
export function drawSymmetric(
  ctx: CanvasRenderingContext2D,
  drawFn: DrawFn,
  mode: SymmetryMode,
  canvasSize: number = 512,
): void {
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

/**
 * 从 SVG 元素创建可绘制的函数
 */
export function createDrawFromSVG(svgElement: SVGSVGElement): DrawFn {
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
    img.onerror = () => {
      URL.revokeObjectURL(url)
    }
    img.src = url
  }
}

/**
 * Canvas 转 PNG blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}
