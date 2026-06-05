import Delaunator from 'delaunator'

export function voronoiShatter(width, height, count, seed) {
  const rng = seed ? createRng(seed) : Math.random
  const points = generatePoints(width, height, count, rng)
  const delaunay = new Delaunator(points.flat())
  const cells = computeVoronoiCells(points, delaunay, width, height)
  const neighbors = computeNeighbors(delaunay, count)

  return cells.map((polygon, i) => ({
    id: i,
    seed: [points[i][0] / width, points[i][1] / height],
    polygon: polygon.map(([x, y]) => [x / width, y / height]),
    uvBounds: computeUVBounds(polygon, width, height),
    neighbors: neighbors[i] || [],
  }))
}

function generatePoints(width, height, count, rng) {
  const points = []
  const cx = width / 2, cy = height / 2
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * Math.min(width, height) * 0.48
    points.push([
      Math.max(5, Math.min(width - 5, cx + Math.cos(angle) * r)),
      Math.max(5, Math.min(height - 5, cy + Math.sin(angle) * r)),
    ])
  }
  return points
}

function computeVoronoiCells(points, delaunay, width, height) {
  const { triangles, halfedges } = delaunay
  const n = points.length
  const circumcenters = computeCircumcenters(points, triangles)

  const cells = Array.from({ length: n }, () => [])

  for (let e = 0; e < triangles.length; e++) {
    const t = Math.floor(e / 3)
    const p = triangles[e]
    const prev = triangles[e - (e % 3 === 0 ? -2 : 1)]
    const opp = halfedges[e]
    if (opp === -1 || opp < e) continue

    const tOpp = Math.floor(opp / 3)
    cells[p].push(
      [circumcenters[t][0], circumcenters[t][1]],
      [circumcenters[tOpp][0], circumcenters[tOpp][1]]
    )
  }

  return cells.map((cell) => {
    if (cell.length === 0) return [[0, 0], [width, 0], [width, height], [0, height]]
    const center = [cell.reduce((s, p) => s + p[0], 0) / cell.length,
                    cell.reduce((s, p) => s + p[1], 0) / cell.length]
    const sorted = cell.sort((a, b) => {
      return Math.atan2(a[1] - center[1], a[0] - center[0]) -
             Math.atan2(b[1] - center[1], b[0] - center[0])
    })
    return clipPolygon(sorted, width, height)
  })
}

function computeCircumcenters(points, triangles) {
  const count = triangles.length / 3
  const result = []
  for (let t = 0; t < count; t++) {
    const i = triangles[t * 3], j = triangles[t * 3 + 1], k = triangles[t * 3 + 2]
    const [ax, ay] = points[i], [bx, by] = points[j], [cx, cy] = points[k]
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if (Math.abs(D) < 1e-10) {
      result.push([(ax + bx + cx) / 3, (ay + by + cy) / 3])
      continue
    }
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy
    result.push([
      (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D,
      (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D,
    ])
  }
  return result
}

function clipPolygon(polygon, w, h) {
  if (polygon.length < 3) return [[0, 0], [w, 0], [w, h], [0, h]]
  let output = polygon
  for (const [inside, axis, limit] of [
    [(x) => x >= 0, 0, 0],
    [(x) => x <= w, 0, w],
    [(y) => y >= 0, 1, 0],
    [(y) => y <= h, 1, h],
  ]) {
    if (output.length === 0) break
    const input = output
    output = []
    for (let i = 0, len = input.length; i < len; i++) {
      const curr = input[i], next = input[(i + 1) % len]
      const cIn = inside(curr[axis]), nIn = inside(next[axis])
      if (cIn) output.push(curr)
      if (cIn !== nIn) {
        const t = (limit - curr[axis]) / (next[axis] - curr[axis])
        output.push([curr[0] + t * (next[0] - curr[0]), curr[1] + t * (next[1] - curr[1])])
      }
    }
  }
  return output.length >= 3 ? output : polygon
}

function computeNeighbors(delaunay, count) {
  const { triangles, halfedges } = delaunay
  const neighbors = Array.from({ length: count }, () => new Set())
  for (let e = 0; e < halfedges.length; e++) {
    const opp = halfedges[e]
    if (opp === -1) continue
    const p1 = triangles[e], p2 = triangles[opp]
    neighbors[p1].add(p2)
    neighbors[p2].add(p1)
  }
  return neighbors.map((s) => [...s])
}

function computeUVBounds(polygon, w, h) {
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity
  for (const [x, y] of polygon) {
    minU = Math.min(minU, x); minV = Math.min(minV, y)
    maxU = Math.max(maxU, x); maxV = Math.max(maxV, y)
  }
  return { minU: minU / w, minV: minV / h, maxU: maxU / w, maxV: maxV / h }
}

function createRng(seed) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}
