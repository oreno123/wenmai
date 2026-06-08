/**
 * Jigsaw Puzzle Engine
 *
 * Generates interlocking jigsaw pieces from a source image.
 * Each piece has classic tab/blank edges that mesh with neighbors.
 */

// ── Types ─────────────────────────────────────────────

type SeededRandomFn = () => number;

interface Point2D {
  x: number;
  y: number;
}

interface LineCommand {
  cmd: 'L';
  x: number;
  y: number;
}

interface CurveCommand {
  cmd: 'C';
  c1: Point2D;
  c2: Point2D;
  end: Point2D;
}

type EdgeCommand = LineCommand | CurveCommand;

interface EdgeSignatures {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Corners {
  tl: Point2D;
  tr: Point2D;
  br: Point2D;
  bl: Point2D;
}

export interface Piece {
  id: string;
  row: number;
  col: number;
  edges: EdgeSignatures;
  corners: Corners;
  pathCommands: EdgeCommand[][];
  correctX: number;
  correctY: number;
  cellW: number;
  cellH: number;
  boundsPad: number;
}

export interface Puzzle {
  pieces: Piece[];
  rows: number;
  cols: number;
  cellW: number;
  cellH: number;
  imgW: number;
  imgH: number;
}

export interface SnapResult {
  snapX: number;
  snapY: number;
  targetId: string;
  distance: number;
}

// ── Seeded Random ─────────────────────────────────────

function seededRandom(seed: number): SeededRandomFn {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Edge Generation ───────────────────────────────────

/**
 * Generate bezier path commands for one jigsaw edge.
 *
 * Convention for clockwise piece path:
 *   +sign → bump goes to RIGHT of travel direction = OUTWARD (tab)
 *   -sign → bump goes to LEFT  of travel direction = INWARD  (blank)
 *    0    → straight (border)
 */
function generateEdge(x1: number, y1: number, x2: number, y2: number, sign: number): EdgeCommand[] {
  if (sign === 0) {
    return [{ cmd: 'L', x: x2, y: y2 }]
  }

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ex = dx / len, ey = dy / len
  // Right-hand perpendicular (outward for CW path when sign > 0)
  const nx = ey * sign, ny = -ex * sign

  const h = len * 0.22 // tab height

  // Point at fraction t along edge + perpendicular offset d
  function p(t: number, d: number): Point2D {
    return {
      x: x1 + dx * t + nx * d,
      y: y1 + dy * t + ny * d,
    }
  }

  return [
    { cmd: 'L', ...p(0.34, 0) },
    // Neck opening
    { cmd: 'C', c1: p(0.34, h * 0.06), c2: p(0.28, h * 0.42), end: p(0.38, h * 0.62) },
    // Tab head left
    { cmd: 'C', c1: p(0.42, h * 0.88), c2: p(0.46, h * 1.02), end: p(0.50, h * 1.02) },
    // Tab head right
    { cmd: 'C', c1: p(0.54, h * 1.02), c2: p(0.58, h * 0.88), end: p(0.62, h * 0.62) },
    // Neck closing
    { cmd: 'C', c1: p(0.72, h * 0.42), c2: p(0.66, h * 0.06), end: p(0.66, 0) },
    { cmd: 'L', x: x2, y: y2 },
  ]
}

/**
 * Trace edge commands onto a Canvas context (expects ctx.beginPath() already called).
 */
export function traceEdge(ctx: CanvasRenderingContext2D, commands: EdgeCommand[]): void {
  for (const c of commands) {
    if (c.cmd === 'L') ctx.lineTo(c.x, c.y)
    else if (c.cmd === 'C') ctx.bezierCurveTo(c.c1.x, c.c1.y, c.c2.x, c.c2.y, c.end.x, c.end.y)
  }
}

/**
 * Convert piece path commands to SVG path d string (for thumbnails / clip-path).
 */
export function pieceToSVGPath(piece: Piece): string {
  let d = `M ${piece.corners.tl.x.toFixed(1)} ${piece.corners.tl.y.toFixed(1)}`
  for (const edge of piece.pathCommands) {
    for (const c of edge) {
      if (c.cmd === 'L') d += ` L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`
      else if (c.cmd === 'C') d += ` C ${c.c1.x.toFixed(1)} ${c.c1.y.toFixed(1)} ${c.c2.x.toFixed(1)} ${c.c2.y.toFixed(1)} ${c.end.x.toFixed(1)} ${c.end.y.toFixed(1)}`
    }
  }
  return d + ' Z'
}

// ── Puzzle Generation ─────────────────────────────────

/**
 * Generate a complete jigsaw puzzle definition.
 */
export function generatePuzzle(
  imgW: number,
  imgH: number,
  rows: number,
  cols: number,
  seed: number = 42,
): Puzzle {
  const rng = seededRandom(seed)
  const cellW = imgW / cols
  const cellH = imgH / rows

  // Horizontal edge signatures: (rows+1) x cols
  const hEdges: number[][] = []
  for (let r = 0; r <= rows; r++) {
    hEdges[r] = []
    for (let c = 0; c < cols; c++) {
      hEdges[r][c] = (r === 0 || r === rows) ? 0 : (rng() > 0.5 ? 1 : -1)
    }
  }

  // Vertical edge signatures: rows x (cols+1)
  const vEdges: number[][] = []
  for (let r = 0; r < rows; r++) {
    vEdges[r] = []
    for (let c = 0; c <= cols; c++) {
      vEdges[r][c] = (c === 0 || c === cols) ? 0 : (rng() > 0.5 ? 1 : -1)
    }
  }

  const pieces: Piece[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl: Point2D = { x: c * cellW, y: r * cellH }
      const tr: Point2D = { x: (c + 1) * cellW, y: r * cellH }
      const br: Point2D = { x: (c + 1) * cellW, y: (r + 1) * cellH }
      const bl: Point2D = { x: c * cellW, y: (r + 1) * cellH }

      // Tab sign for each edge:
      // +1 = tab sticks OUT from piece, -1 = blank goes IN, 0 = flat border
      const topSign = -hEdges[r][c]
      const rightSign = vEdges[r][c + 1]
      const bottomSign = hEdges[r + 1][c]
      const leftSign = -vEdges[r][c]

      const topEdge = generateEdge(tl.x, tl.y, tr.x, tr.y, topSign)
      const rightEdge = generateEdge(tr.x, tr.y, br.x, br.y, rightSign)
      const bottomEdge = generateEdge(br.x, br.y, bl.x, bl.y, bottomSign)
      const leftEdge = generateEdge(bl.x, bl.y, tl.x, tl.y, leftSign)

      pieces.push({
        id: `p${r}_${c}`,
        row: r,
        col: c,
        edges: { top: topSign, right: rightSign, bottom: bottomSign, left: leftSign },
        corners: { tl, tr, br, bl },
        pathCommands: [topEdge, rightEdge, bottomEdge, leftEdge],
        correctX: c * cellW,
        correctY: r * cellH,
        cellW,
        cellH,
        boundsPad: Math.max(cellW, cellH) * 0.25,
      })
    }
  }

  return { pieces, rows, cols, cellW, cellH, imgW, imgH }
}

// ── Rendering ─────────────────────────────────────────

/**
 * Draw a single puzzle piece on a Canvas context.
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  img: HTMLImageElement,
  x: number,
  y: number,
  scale: number = 1,
  isSelected: boolean = false,
  isSnapped: boolean = false,
): void {
  const { tl } = piece.corners

  ctx.save()
  // Offset so piece visual top-left appears at (x, y) on canvas
  ctx.translate(x - piece.correctX, y - piece.correctY)
  ctx.scale(scale, scale)

  // Build clip path
  ctx.beginPath()
  ctx.moveTo(tl.x, tl.y)
  for (const edge of piece.pathCommands) traceEdge(ctx, edge)
  ctx.closePath()

  // Shadow
  ctx.shadowColor = isSelected ? 'rgba(201,168,76,0.45)' : 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = isSelected ? 20 : 10
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 3

  // Clip + draw image
  ctx.save()
  ctx.clip()
  ctx.drawImage(img, 0, 0)
  ctx.restore()

  // Clear shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Stroke outline
  ctx.beginPath()
  ctx.moveTo(tl.x, tl.y)
  for (const edge of piece.pathCommands) traceEdge(ctx, edge)
  ctx.closePath()
  ctx.strokeStyle = isSelected
    ? 'rgba(242,213,138,0.75)'
    : isSnapped
      ? 'rgba(201,168,76,0.25)'
      : 'rgba(255,255,255,0.12)'
  ctx.lineWidth = isSelected ? 2.5 : 1.5
  ctx.stroke()

  ctx.restore()
}

// ── Snap Detection ────────────────────────────────────

/**
 * Find if a dragged piece should snap to any already-placed piece.
 */
export function findSnap(
  piece: Piece,
  px: number,
  py: number,
  placements: Record<string, { x: number; y: number }>,
  pieces: Piece[],
  threshold: number = 45,
): SnapResult | null {
  const { cellW, cellH } = piece

  for (const [id, pl] of Object.entries(placements)) {
    if (id === piece.id) continue
    const target = pieces.find(p => p.id === id)
    if (!target) continue

    // Check grid adjacency
    const dr = piece.row - target.row
    const dc = piece.col - target.col
    if (Math.abs(dr) + Math.abs(dc) !== 1) continue

    // Expected relative position (piece relative to target)
    const expDx = dc * cellW
    const expDy = dr * cellH

    // Actual relative position
    const actDx = px - pl.x
    const actDy = py - pl.y

    const errX = actDx - expDx
    const errY = actDy - expDy
    const err = Math.sqrt(errX * errX + errY * errY)

    if (err < threshold) {
      return {
        snapX: pl.x + expDx,
        snapY: pl.y + expDy,
        targetId: id,
        distance: err,
      }
    }
  }

  return null
}

/**
 * Quick hit test — is point (px, py) within the piece at position (x, y)?
 */
export function hitTestPiece(
  piece: Piece,
  x: number,
  y: number,
  px: number,
  py: number,
  scale: number = 1,
): boolean {
  const lx = (px - x) / scale
  const ly = (py - y) / scale
  const pad = piece.boundsPad
  return lx >= -pad && lx <= piece.cellW + pad && ly >= -pad && ly <= piece.cellH + pad
}

/**
 * Generate a thumbnail data URL for a piece.
 */
export function generateThumbnail(
  piece: Piece,
  img: HTMLImageElement,
  size: number = 56,
): string {
  const pad = piece.boundsPad
  const tw = piece.cellW + pad * 2
  const th = piece.cellH + pad * 2
  const thumbScale = size / Math.max(tw, th)

  const c = document.createElement('canvas')
  c.width = Math.ceil(tw * thumbScale)
  c.height = Math.ceil(th * thumbScale)
  const ctx = c.getContext('2d')!

  ctx.scale(thumbScale, thumbScale)
  drawPiece(ctx, piece, img, pad, pad, 1, false, false)

  return c.toDataURL()
}
