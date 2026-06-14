/**
 * Generate a normal map canvas from an image — used for the relief/emboss effect.
 *
 * Strategy:
 *   - For gold-line pattern PNGs (transparent background, gold lines), use
 *     alpha as the height field — lines stand proud, transparent areas recede.
 *   - For opaque images (photographic patterns like qinghua porcelain), use
 *     luminance as the height field — bright areas stand proud, dark areas recede.
 *
 * Sobel then gives per-pixel surface normals, which a meshStandardMaterial
 * can use as a bump source without needing a real 3D model.
 *
 * Returns an offscreen canvas you can wrap in THREE.CanvasTexture.
 */
export function generateNormalMap(img, strength = 1.5) {
  const w = img.width
  const h = img.height

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = w
  srcCanvas.height = h
  const srcCtx = srcCanvas.getContext('2d')
  srcCtx.drawImage(img, 0, 0)
  const srcData = srcCtx.getImageData(0, 0, w, h).data

  // Detect whether this image actually uses its alpha channel — if alpha is
  // uniformly 1, it's an opaque photo (qinghua/shanjing) and we should fall
  // back to luminance so the relief isn't a flat plane.
  let alphaSum = 0
  for (let i = 0; i < w * h; i++) alphaSum += srcData[i * 4 + 3] / 255
  const alphaMean = alphaSum / (w * h)
  const hasAlpha = alphaMean < 0.95

  const height = new Float32Array(w * h)
  if (hasAlpha) {
    for (let i = 0; i < w * h; i++) {
      const a = srcData[i * 4 + 3] / 255
      const l = (srcData[i * 4] + srcData[i * 4 + 1] + srcData[i * 4 + 2]) / 3 / 255
      height[i] = Math.max(a, l * 0.5)
    }
  } else {
    for (let i = 0; i < w * h; i++) {
      height[i] = (srcData[i * 4] + srcData[i * 4 + 1] + srcData[i * 4 + 2]) / 3 / 255
    }
  }

  const dst = document.createElement('canvas')
  dst.width = w
  dst.height = h
  const dstCtx = dst.getContext('2d')
  const dstImg = dstCtx.createImageData(w, h)
  const d = dstImg.data

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const xl = height[x > 0 ? idx - 1 : idx]
      const xr = height[x < w - 1 ? idx + 1 : idx]
      const yt = height[y > 0 ? idx - w : idx]
      const yb = height[y < h - 1 ? idx + w : idx]

      const dx = (xr - xl) * strength
      const dy = (yb - yt) * strength
      const dz = 1
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz)

      d[idx * 4]     = ((dx / len) * 0.5 + 0.5) * 255
      d[idx * 4 + 1] = ((dy / len) * 0.5 + 0.5) * 255
      d[idx * 4 + 2] = ((dz / len) * 0.5 + 0.5) * 255
      d[idx * 4 + 3] = 255
    }
  }

  dstCtx.putImageData(dstImg, 0, 0)
  return dst
}

