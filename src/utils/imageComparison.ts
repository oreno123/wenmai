/**
 * Perceptual hash image matching for pattern recognition.
 *
 * Replaces the original 48-bin RGB color histogram, which scored 0% accuracy
 * because every pattern in the library shares the same palette family
 * (gold-on-black / red-on-white / qinghua-blue-on-white). Color histograms
 * cannot tell apart two gold-on-black patterns.
 *
 * pHash (DCT-based, frequency domain) + dHash (horizontal gradient) together
 * capture line structure and texture rhythm, which is what actually defines
 * a pattern. Compared via Hamming distance; converted to a 0..1 similarity.
 *
 * Alpha-transparent regions are pre-flattened onto white before hashing,
 * so transparent PNGs don't pollute the histogram with synthetic black.
 */

const DCT_SIZE = 8 // 8×8 output = 64 bits
const DCT_INPUT = 32 // 32×32 input before DCT
const DHASH_W = 9
const DHASH_H = 8

export interface PatternHash {
  /** 8 bytes = 64 bits, DCT-based */
  phash: Uint8Array
  /** 8 bytes = 64 bits, horizontal gradient */
  dhash: Uint8Array
}

// Precomputed cosine matrix for DCT-II: COS[k][n] = cos(π/N · (n+0.5) · k)
const COS: Float64Array[] = (() => {
  const N = DCT_INPUT
  const m: Float64Array[] = []
  for (let k = 0; k < N; k++) {
    const row = new Float64Array(N)
    for (let n = 0; n < N; n++) {
      row[n] = Math.cos((Math.PI / N) * (n + 0.5) * k)
    }
    m.push(row)
  }
  return m
})()

export type CropRect = { x: number; y: number; w: number; h: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed: ' + src))
    img.src = src
  })
}

/**
 * Draw image (or a crop of it) onto a w×h canvas, return Rec.601 luma.
 * When `crop` is provided (in image-natural pixels), the crop rect is
 * letterboxed (preserving aspect ratio) onto the canvas with white padding.
 * Transparent source pixels flatten onto white.
 */
function imageToGray(
  img: HTMLImageElement,
  w: number,
  h: number,
  crop: CropRect | null = null,
): Uint8Array {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  if (crop && crop.w > 0 && crop.h > 0) {
    const scale = Math.min(w / crop.w, h / crop.h)
    const dw = crop.w * scale
    const dh = crop.h * scale
    const dx = (w - dw) / 2
    const dy = (h - dh) / 2
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, dx, dy, dw, dh)
  } else {
    ctx.drawImage(img, 0, 0, w, h)
  }
  const { data } = ctx.getImageData(0, 0, w, h)
  const gray = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = ((data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000) | 0
  }
  return gray
}

/** 2D DCT-II via separable 1D passes (rows then columns). */
function dct2D(gray: Uint8Array): Float64Array {
  const N = DCT_INPUT
  const rowPass = new Float64Array(N * N)
  for (let i = 0; i < N; i++) {
    const base = i * N
    for (let k = 0; k < N; k++) {
      const cosK = COS[k]
      let sum = 0
      for (let n = 0; n < N; n++) sum += gray[base + n] * cosK[n]
      rowPass[base + k] = sum
    }
  }
  const out = new Float64Array(N * N)
  const col = new Float64Array(N)
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) col[i] = rowPass[i * N + j]
    for (let k = 0; k < N; k++) {
      const cosK = COS[k]
      let sum = 0
      for (let n = 0; n < N; n++) sum += col[n] * cosK[n]
      out[k * N + j] = sum
    }
  }
  return out
}

function bitsToBytes(bits: number[]): Uint8Array {
  const bytes = new Uint8Array(8)
  for (let i = 0; i < 64; i++) {
    if (bits[i]) bytes[i >> 3] |= 0x80 >> (i & 7)
  }
  return bytes
}

function popcountByte(x: number): number {
  x = x - ((x >>> 1) & 0x55)
  x = (x & 0x33) + ((x >>> 2) & 0x33)
  x = (x + (x >>> 4)) & 0x0f
  return x
}

export function hamming(a: Uint8Array, b: Uint8Array): number {
  let d = 0
  for (let i = 0; i < a.length; i++) d += popcountByte(a[i] ^ b[i])
  return d
}

function pHash(img: HTMLImageElement, crop: CropRect | null = null): Uint8Array {
  const gray = imageToGray(img, DCT_INPUT, DCT_INPUT, crop)
  const dct = dct2D(gray)
  // Top-left 8×8 low-frequency block.
  const low: number[] = []
  for (let i = 0; i < DCT_SIZE; i++) {
    for (let j = 0; j < DCT_SIZE; j++) low.push(dct[i * DCT_INPUT + j])
  }
  // Median excluding DC (low[0]) — DC is luminance, ignore for threshold.
  const forMedian = low.slice(1).slice().sort((a, b) => a - b)
  const median = forMedian[Math.floor(forMedian.length / 2)]
  const bits = low.map(v => (v > median ? 1 : 0))
  return bitsToBytes(bits)
}

function dHash(img: HTMLImageElement, crop: CropRect | null = null): Uint8Array {
  const gray = imageToGray(img, DHASH_W, DHASH_H, crop)
  const bits: number[] = []
  for (let r = 0; r < DHASH_H; r++) {
    for (let c = 0; c < DHASH_W - 1; c++) {
      bits.push(gray[r * DHASH_W + c] > gray[r * DHASH_W + c + 1] ? 1 : 0)
    }
  }
  return bitsToBytes(bits)
}

function hashFromImage(img: HTMLImageElement, crop: CropRect | null = null): PatternHash {
  return { phash: pHash(img, crop), dhash: dHash(img, crop) }
}

export async function extractHashFromFileWithCrop(
  file: File,
  crop: CropRect | null,
): Promise<PatternHash> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    return hashFromImage(img, crop)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function extractHashFromFile(file: File): Promise<PatternHash> {
  return extractHashFromFileWithCrop(file, null)
}

export async function extractHashFromUrl(url: string): Promise<PatternHash> {
  const img = await loadImage(url)
  return await hashFromImage(img)
}

/**
 * Combined similarity. pHash gets 0.6 weight (frequency-domain structure),
 * dHash gets 0.4 (gradient, cheaper and complementary).
 */
export function compareHashes(a: PatternHash, b: PatternHash): {
  distance: number
  similarity: number
} {
  const pd = hamming(a.phash, b.phash)
  const dd = hamming(a.dhash, b.dhash)
  const distance = pd * 0.6 + dd * 0.4
  return { distance, similarity: Math.max(0, 1 - distance / 64) }
}

let hashCache: Map<string, PatternHash> | null = null

export async function buildLibraryHashes(
  patterns: { id: string; image: string }[],
): Promise<Map<string, PatternHash>> {
  if (hashCache && hashCache.size >= patterns.length) return hashCache
  const map = new Map<string, PatternHash>()
  await Promise.all(
    patterns.map(async p => {
      try {
        map.set(p.id, await extractHashFromUrl(p.image))
      } catch {
        // skip unreadable images
      }
    }),
  )
  hashCache = map
  return map
}

export function findTopMatches(
  userHash: PatternHash,
  libraryHashes: Map<string, PatternHash>,
  count = 3,
): { patternId: string; score: number; phashDist: number; dhashDist: number }[] {
  const scores: { patternId: string; score: number; phashDist: number; dhashDist: number }[] = []
  for (const [id, h] of libraryHashes) {
    const pd = hamming(userHash.phash, h.phash)
    const dd = hamming(userHash.dhash, h.dhash)
    const distance = pd * 0.6 + dd * 0.4
    scores.push({
      patternId: id,
      score: Math.max(0, 1 - distance / 64),
      phashDist: pd,
      dhashDist: dd,
    })
  }
  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, count)
}

/** Debug helper: dump hash as hex string */
export function hashToHex(hash: PatternHash): { phash: string; dhash: string } {
  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return { phash: toHex(hash.phash), dhash: toHex(hash.dhash) }
}

export { extractHashFromUrl as extractHashFromUrlDebug }
