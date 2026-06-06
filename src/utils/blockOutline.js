const OUTLINE_SIZE = 256

/**
 * Pre-render an element image with flood-fill outline + dark backing.
 * Returns an offscreen canvas. Draw with ctx.drawImage(canvas, ...).
 */
export function createOutlinedBlock(img) {
  const size = OUTLINE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const scale = size / Math.max(img.width, img.height)
  const w = img.width * scale, h = img.height * scale
  const ox = (size - w) / 2, oy = (size - h) / 2
  ctx.drawImage(img, ox, oy, w, h)

  // Extract + clean alpha (blur + threshold)
  const data = ctx.getImageData(0, 0, size, size).data
  const raw = new Uint8Array(size * size)
  for (let i = 0; i < raw.length; i++) raw[i] = data[i * 4 + 3]
  const alpha = new Uint8Array(size * size)
  const r = 2
  for (let y = r; y < size - r; y++)
    for (let x = r; x < size - r; x++) {
      let sum = 0
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          sum += raw[(y+dy) * size + (x+dx)]
      alpha[y * size + x] = (sum / 25) > 35 ? 255 : 0
    }

  // Flood-fill from edges → outside region
  const outside = new Uint8Array(size * size)
  const queue = []
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if ((y === 0 || y === size-1 || x === 0 || x === size-1) && !alpha[y*size+x]) {
        outside[y*size+x] = 1
        queue.push(y * size + x)
      }
  let head = 0
  while (head < queue.length) {
    const i = queue[head++]
    const x = i % size, y = (i - x) / size
    for (const ni of [i-1, i+1, i-size, i+size]) {
      const nx = ni % size, ny = (ni - nx) / size
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !outside[ni] && !alpha[ni]) {
        outside[ni] = 1
        queue.push(ni)
      }
    }
  }

  // Solid = NOT outside
  const solid = new Uint8Array(size * size)
  for (let i = 0; i < solid.length; i++) solid[i] = outside[i] ? 0 : 1

  // Dilate solid for outline band (circular kernel, ~4px)
  const pad = 4
  const dilated = new Uint8Array(size * size)
  for (let y = pad; y < size - pad; y++)
    for (let x = pad; x < size - pad; x++)
      if (solid[y * size + x])
        for (let dy = -pad; dy <= pad; dy++)
          for (let dx = -pad; dx <= pad; dx++)
            if (dx*dx + dy*dy <= pad*pad + 2) dilated[(y+dy) * size + (x+dx)] = 1

  // Render: outline + backing in one pass, then original image on top
  ctx.clearRect(0, 0, size, size)
  const imgData = ctx.createImageData(size, size)
  const d = imgData.data
  for (let i = 0; i < dilated.length; i++) {
    if (dilated[i] && !solid[i]) {
      d[i*4] = 235; d[i*4+1] = 225; d[i*4+2] = 200; d[i*4+3] = 255
    } else if (solid[i]) {
      d[i*4] = 18; d[i*4+1] = 16; d[i*4+2] = 14; d[i*4+3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)
  ctx.drawImage(img, ox, oy, w, h)

  return canvas
}
