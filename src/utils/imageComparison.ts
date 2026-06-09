/**
 * Client-side color histogram comparison for pattern matching
 * Uses 32x32 downscaled images with 48-bin RGB histograms (16 bins per channel)
 */

const IMG_SIZE = 32
const BINS = 16

/**
 * Extract a 48-dim color histogram from an image source
 */
export function extractHistogram(imageSource): number[] {
  const canvas = document.createElement('canvas')
  canvas.width = IMG_SIZE
  canvas.height = IMG_SIZE
  const ctx = canvas.getContext('2d')

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageSource

  // Draw scaled down
  ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE)
  const data = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data

  const hist = new Array(BINS * 3).fill(0)
  const totalPixels = IMG_SIZE * IMG_SIZE

  for (let i = 0; i < data.length; i += 4) {
    const r = Math.floor((data[i] / 256) * BINS)
    const g = Math.floor((data[i + 1] / 256) * BINS)
    const b = Math.floor((data[i + 2] / 256) * BINS)
    hist[r]++
    hist[BINS + g]++
    hist[BINS * 2 + b]++
  }

  // Normalize
  for (let i = 0; i < hist.length; i++) {
    hist[i] /= totalPixels
  }

  return hist
}

/**
 * Extract histogram from a File/Blob (user upload)
 */
export function extractHistogramFromFile(file: File): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = IMG_SIZE
      canvas.height = IMG_SIZE
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE)
      const data = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data

      const hist = new Array(BINS * 3).fill(0)
      const totalPixels = IMG_SIZE * IMG_SIZE

      for (let i = 0; i < data.length; i += 4) {
        const r = Math.floor((data[i] / 256) * BINS)
        const g = Math.floor((data[i + 1] / 256) * BINS)
        const b = Math.floor((data[i + 2] / 256) * BINS)
        hist[r]++
        hist[BINS + g]++
        hist[BINS * 2 + b]++
      }

      for (let i = 0; i < hist.length; i++) {
        hist[i] /= totalPixels
      }

      URL.revokeObjectURL(img.src)
      resolve(hist)
    }
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Failed to load image')) }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Cosine similarity between two histograms
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Find top N matching patterns from library
 */
export function findTopMatches(
  userHist: number[],
  libraryHistograms: Map<string, number[]>,
  count: number = 3,
): { patternId: string; score: number }[] {
  const scores: { patternId: string; score: number }[] = []

  for (const [id, libHist] of libraryHistograms) {
    scores.push({ patternId: id, score: cosineSimilarity(userHist, libHist) })
  }

  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, count)
}

/**
 * Build histogram map for all patterns in the library (lazy, cached)
 */
let histogramCache: Map<string, number[]> | null = null

export async function buildLibraryHistograms(patterns: { id: string; image: string }[]): Promise<Map<string, number[]>> {
  if (histogramCache) return histogramCache

  const map = new Map<string, number[]>()
  const loads = patterns.map(p => {
    return new Promise<void>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = IMG_SIZE
        canvas.height = IMG_SIZE
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE)
        const data = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data

        const hist = new Array(BINS * 3).fill(0)
        const total = IMG_SIZE * IMG_SIZE
        for (let i = 0; i < data.length; i += 4) {
          const r = Math.floor((data[i] / 256) * BINS)
          const g = Math.floor((data[i + 1] / 256) * BINS)
          const b = Math.floor((data[i + 2] / 256) * BINS)
          hist[r]++
          hist[BINS + g]++
          hist[BINS * 2 + b]++
        }
        for (let i = 0; i < hist.length; i++) hist[i] /= total

        map.set(p.id, hist)
        resolve()
      }
      img.onerror = () => resolve() // skip failed images
      img.src = p.image
    })
  })

  await Promise.all(loads)
  histogramCache = map
  return map
}
