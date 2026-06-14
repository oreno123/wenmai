const OUTLINE_SIZE = 256

/**
 * Pre-render an element/pattern image as a shape-following "stamp":
 * the canvas itself is square, but every pixel OUTSIDE the pattern's
 * silhouette is fully transparent (alpha=0), so when drawn on a backing
 * canvas only the pattern shape shows up — no more square tiles.
 *
 * Inside the silhouette: dark backing fills any internal holes (so the
 * piece reads as a solid chip), warm cream outline traces the edge, then
 * the original image is composited on top.
 *
 * Options:
 *   clearCorners (default true) — fill the four corners with the sampled
 *   background color to erase AI-generator watermarks. Pass false for
 *   series that are photographic (qinghua — porcelain photos have no
 *   watermark and overpainting corners shows up as visible squares).
 */
export function createOutlinedBlock(img, { clearCorners = true } = {}) {
  const size = OUTLINE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const scale = size / Math.max(img.width, img.height)
  const w = img.width * scale, h = img.height * scale
  const ox = (size - w) / 2, oy = (size - h) / 2
  ctx.drawImage(img, ox, oy, w, h)

  // Sample background color from edge midpoints (not corners — corners
  // often hold AI-generator watermarks that would pollute the sample).
  const preData = ctx.getImageData(0, 0, size, size).data
  const midPts = [
    [Math.floor(size * 0.5), 0],
    [Math.floor(size * 0.5), size - 1],
    [0, Math.floor(size * 0.5)],
    [size - 1, Math.floor(size * 0.5)],
  ]
  let bgR = 0, bgG = 0, bgB = 0
  for (const [x, y] of midPts) {
    const i = (y * size + x) * 4
    bgR += preData[i]
    bgG += preData[i + 1]
    bgB += preData[i + 2]
  }
  bgR /= 4; bgG /= 4; bgB /= 4

  // Overpaint AI-watermark corners with the sampled background color so
  // the white watermark text doesn't get picked up as "pattern" later.
  // Skip for photographic series (qinghua) where there's no watermark
  // and corner-filling shows up as visible squares.
  if (clearCorners) {
    const watermarkSize = size * 0.13
    ctx.fillStyle = `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`
    ctx.fillRect(0, 0, watermarkSize, watermarkSize)
    ctx.fillRect(size - watermarkSize, 0, watermarkSize, watermarkSize)
    ctx.fillRect(0, size - watermarkSize, watermarkSize, watermarkSize)
    ctx.fillRect(size - watermarkSize, size - watermarkSize, watermarkSize, watermarkSize)
  }

  const data = ctx.getImageData(0, 0, size, size).data

  // Build a height field. Prefer alpha when the image actually uses it
  // (gold-line PNGs). Otherwise use background-color distance.
  let alphaSum = 0
  for (let i = 0; i < size * size; i++) alphaSum += data[i * 4 + 3] / 255
  const alphaMean = alphaSum / (size * size)
  const hasAlpha = alphaMean < 0.95

  const raw = new Uint8Array(size * size)
  if (hasAlpha) {
    const tmp = new Uint8Array(size * size)
    for (let i = 0; i < tmp.length; i++) tmp[i] = data[i * 4 + 3]
    const r = 2
    for (let y = r; y < size - r; y++)
      for (let x = r; x < size - r; x++) {
        let sum = 0
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++)
            sum += tmp[(y+dy) * size + (x+dx)]
        raw[y * size + x] = (sum / 25) > 35 ? 1 : 0
      }
  } else {
    const DIST = 32
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const dr = data[i] - bgR
        const dg = data[i+1] - bgG
        const db = data[i+2] - bgB
        const dist = Math.sqrt(dr*dr + dg*dg + db*db)
        raw[y * size + x] = dist > DIST ? 1 : 0
      }
    }
  }

  // Decide between two strategies based on background coverage:
  //   - Background-heavy patterns (回纹/万字 etc — continuous geometric line art
  //     where the lines tile the whole canvas): use a plain alpha mask. Trying
  //     to flood-fill "outside" fails because the line art cuts the background
  //     into isolated islands, and the resulting solid mask fills the whole
  //     square with the dark backing.
  //   - Single-subject patterns (团龙/莲花/角花 — one centered motif on a flat
  //     background): keep the flood-fill + outline + backing logic so internal
  //     holes get bridged and the piece reads as a solid chip.
  let bgCount = 0
  for (let i = 0; i < raw.length; i++) if (!raw[i]) bgCount++
  const bgRatio = bgCount / raw.length

  ctx.clearRect(0, 0, size, size)

  if (bgRatio > 0.55) {
    // ── Continuous-pattern mode: pure alpha mask, no backing, no outline.
    // Pattern pixels show the original image; background pixels are transparent.
    const imgData = ctx.createImageData(size, size)
    const d = imgData.data
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]) {
        d[i*4]   = data[i*4]
        d[i*4+1] = data[i*4+1]
        d[i*4+2] = data[i*4+2]
        d[i*4+3] = 255
      }
      // else: leave alpha=0 (transparent)
    }
    ctx.putImageData(imgData, 0, 0)
    // Strip AI watermarks in corners — they'd otherwise show through on
    // patterns that touch the edges.
    const cornerSize = size * 0.18
    ctx.clearRect(0, 0, cornerSize, cornerSize)
    ctx.clearRect(size - cornerSize, 0, cornerSize, cornerSize)
    ctx.clearRect(0, size - cornerSize, cornerSize, cornerSize)
    ctx.clearRect(size - cornerSize, size - cornerSize, cornerSize, cornerSize)
    return canvas
  }

  // ── Single-subject mode: flood-fill + outline + dark backing.
  const outside = new Uint8Array(size * size)
  const queue = []
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if ((y === 0 || y === size-1 || x === 0 || x === size-1) && !raw[y*size+x]) {
        outside[y*size+x] = 1
        queue.push(y * size + x)
      }
  let head = 0
  while (head < queue.length) {
    const i = queue[head++]
    const x = i % size, y = (i - x) / size
    for (const ni of [i-1, i+1, i-size, i+size]) {
      const nx = ni % size, ny = (ni - nx) / size
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !outside[ni] && !raw[ni]) {
        outside[ni] = 1
        queue.push(ni)
      }
    }
  }

  const solid = new Uint8Array(size * size)
  for (let i = 0; i < solid.length; i++) solid[i] = outside[i] ? 0 : 1

  const pad = 4
  const dilated = new Uint8Array(size * size)
  for (let y = pad; y < size - pad; y++)
    for (let x = pad; x < size - pad; x++)
      if (solid[y * size + x])
        for (let dy = -pad; dy <= pad; dy++)
          for (let dx = -pad; dx <= pad; dx++)
            if (dx*dx + dy*dy <= pad*pad + 2) dilated[(y+dy) * size + (x+dx)] = 1

  const imgData = ctx.createImageData(size, size)
  const d = imgData.data
  for (let i = 0; i < dilated.length; i++) {
    if (outside[i]) continue
    if (dilated[i] && !solid[i]) {
      d[i*4] = 235; d[i*4+1] = 225; d[i*4+2] = 200; d[i*4+3] = 255
    } else if (solid[i]) {
      d[i*4] = 18; d[i*4+1] = 16; d[i*4+2] = 14; d[i*4+3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  // Composite the original image only on top of existing pixels, with the
  // AI-watermark corners cleared first.
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = size
  srcCanvas.height = size
  const srcCtx = srcCanvas.getContext('2d')
  srcCtx.drawImage(img, ox, oy, w, h)
  const cornerSize = size * 0.18
  srcCtx.clearRect(0, 0, cornerSize, cornerSize)
  srcCtx.clearRect(size - cornerSize, 0, cornerSize, cornerSize)
  srcCtx.clearRect(0, size - cornerSize, cornerSize, cornerSize)
  srcCtx.clearRect(size - cornerSize, size - cornerSize, cornerSize, cornerSize)

  ctx.globalCompositeOperation = 'source-atop'
  ctx.drawImage(srcCanvas, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  return canvas
}

