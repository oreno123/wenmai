/**
 * 程序化纹样生成器
 * 用数学方法生成中国传统几何纹样 SVG，无需 AI 图片
 *
 * 支持的纹样：
 * - 回纹 (huiwen) — 方折螺旋
 * - 万字纹 (wanzi) — 卐/卍 连续
 * - 冰裂纹 (binglie) — 随机冰裂网络
 * - 雷纹 (leiwen) — 方折回旋
 * - 绳纹 (shengwen) — 交织绳索
 */

const NS = 'http://www.w3.org/2000/svg'

// ── 工具函数 ──────────────────────────────────────────

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v)
  }
  return el
}

function createSVG(size, bgColor = 'transparent') {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${size} ${size}`,
    width: size,
    height: size,
    xmlns: NS,
  })
  if (bgColor !== 'transparent') {
    svg.appendChild(svgEl('rect', {
      x: 0, y: 0, width: size, height: size, fill: bgColor,
    }))
  }
  return svg
}

function addPath(svg, d, stroke = '#C9A84C', strokeWidth = 2, fill = 'none') {
  const path = svgEl('path', { d, stroke, 'stroke-width': strokeWidth, fill, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  svg.appendChild(path)
  return path
}

// ── 回纹生成器 ────────────────────────────────────────

/**
 * 回纹 — 方折螺旋
 * @param {number} size - SVG 尺寸
 * @param {number} unit - 基本单位大小
 * @param {number} turns - 螺旋圈数
 */
export function generateHuiwen(size = 512, unit = 40, turns = 4) {
  const svg = createSVG(size)
  const cx = size / 2
  const cy = size / 2

  // 单个回纹单元
  function huiwenUnit(x, y, w) {
    const step = w / (turns * 2)
    let d = `M ${x} ${y}`
    let curX = x
    let curY = y
    let dir = 1 // 1=右/-1=左 for horizontal, toggles

    for (let i = 0; i < turns * 4; i++) {
      const isHorizontal = i % 2 === 0
      if (isHorizontal) {
        curX += step * dir
        d += ` L ${curX} ${curY}`
      } else {
        dir = i % 4 === 1 ? 1 : -1
        curY += step * dir
        d += ` L ${curX} ${curY}`
      }
    }
    return d
  }

  // 生成回纹方阵
  const gap = unit * 1.2
  const count = Math.floor(size / gap)

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      const x = col * gap + gap / 2 - unit / 2
      const y = row * gap + gap / 2 - unit / 2
      const d = spiralHuiwenPath(x, y, unit, turns)
      addPath(svg, d, '#C9A84C', Math.max(1, unit / 20))
    }
  }

  return svg
}

function spiralHuiwenPath(startX, startY, size, turns) {
  const s = size / 2
  let x = startX
  let y = startY
  let w = size
  let h = size
  let d = `M ${x + w} ${y}`

  for (let i = 0; i < turns; i++) {
    const inset = (size / turns / 2) * (i > 0 ? 1 : 0)
    // 右侧向上
    d += ` L ${x + w} ${y + h - inset}`
    // 底部向左
    d += ` L ${x + inset} ${y + h}`
    // 左侧向上
    if (i < turns - 1) {
      d += ` L ${x} ${y + inset}`
      // 顶部向右
      d += ` L ${x + w - inset} ${y}`
      x += inset
      y += inset
      w -= inset * 2
      h -= inset * 2
    }
  }

  return d
}

// ── 万字纹生成器 ──────────────────────────────────────

/**
 * 万字纹 — 卐 连续图案
 * @param {number} size - SVG 尺寸
 * @param {number} unit - 单个万字大小
 */
export function generateWanzi(size = 512, unit = 80) {
  const svg = createSVG(size)
  const gap = unit * 1.5
  const cols = Math.ceil(size / gap) + 1
  const rows = Math.ceil(size / gap) + 1

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * gap + gap / 2
      const cy = row * gap + gap / 2
      const d = wanziPath(cx, cy, unit / 2)
      addPath(svg, d, '#C9A84C', Math.max(1, unit / 25))
    }
  }

  return svg
}

function wanziPath(cx, cy, r) {
  const t = r * 0.3 // 臂宽
  return [
    // 中心十字
    `M ${cx - t} ${cy - t}`,
    `L ${cx + t} ${cy - t}`,
    `L ${cx + t} ${cy + t}`,
    `L ${cx - t} ${cy + t}`,
    `Z`,
    // 右臂（上）
    `M ${cx + t} ${cy - t}`,
    `L ${cx + r} ${cy - t}`,
    `L ${cx + r} ${cy - t - r * 0.4}`,
    `L ${cx + r + r * 0.4} ${cy - t}`,
    // 上臂
    `M ${cx - t} ${cy - t}`,
    `L ${cx - t} ${cy - r}`,
    `L ${cx - t - r * 0.4} ${cy - r}`,
    `L ${cx - t} ${cy - r - r * 0.4}`,
    // 左臂
    `M ${cx - t} ${cy + t}`,
    `L ${cx - r} ${cy + t}`,
    `L ${cx - r} ${cy + t + r * 0.4}`,
    `L ${cx - r - r * 0.4} ${cy + t}`,
    // 下臂
    `M ${cx + t} ${cy + t}`,
    `L ${cx + t} ${cy + r}`,
    `L ${cx + t + r * 0.4} ${cy + r}`,
    `L ${cx + t} ${cy + r + r * 0.4}`,
  ].join(' ')
}

// ── 冰裂纹生成器 ──────────────────────────────────────

/**
 * 冰裂纹 — 随机几何冰裂网络（Voronoi 风格）
 * @param {number} size - SVG 尺寸
 * @param {number} density - 裂纹密度（点数）
 */
export function generateBinglie(size = 512, density = 40) {
  const svg = createSVG(size)

  // 生成随机点
  const points = []
  // 边界点确保边缘有裂纹
  for (let i = 0; i < 20; i++) {
    points.push({ x: 0, y: Math.random() * size })
    points.push({ x: size, y: Math.random() * size })
    points.push({ x: Math.random() * size, y: 0 })
    points.push({ x: Math.random() * size, y: size })
  }
  // 内部随机点
  for (let i = 0; i < density; i++) {
    points.push({ x: Math.random() * size, y: Math.random() * size })
  }

  // 简单 Delaunay 近似：连接近邻点
  const maxDist = size / Math.sqrt(density) * 1.8

  for (let i = 0; i < points.length; i++) {
    // 找最近邻
    const neighbors = []
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue
      const dx = points[i].x - points[j].x
      const dy = points[i].y - points[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < maxDist) {
        neighbors.push({ idx: j, dist })
      }
    }
    neighbors.sort((a, b) => a.dist - b.dist)

    // 连接最近的 2-4 个邻居
    const connectCount = 2 + Math.floor(Math.random() * 3)
    for (let k = 0; k < Math.min(connectCount, neighbors.length); k++) {
      const j = neighbors[k].idx
      if (j > i) { // 避免重复线段
        const p1 = points[i]
        const p2 = points[j]
        addPath(svg, `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`, '#C9A84C', 1 + Math.random() * 1.5)
      }
    }
  }

  return svg
}

// ── 雷纹生成器 ────────────────────────────────────────

/**
 * 雷纹 — 商周青铜器风格方折回旋
 * @param {number} size - SVG 尺寸
 * @param {number} turns - 回旋圈数
 */
export function generateLeiwen(size = 512, turns = 8) {
  const svg = createSVG(size)
  const margin = size * 0.1
  const inner = size - margin * 2
  const step = inner / (turns * 2)

  let x = margin
  let y = margin
  let w = inner
  let h = inner
  let d = `M ${x + w} ${y}`

  for (let i = 0; i < turns; i++) {
    const s = step
    // 向下
    d += ` L ${x + w} ${y + h - s}`
    // 向左
    d += ` L ${x + s} ${y + h}`
    // 向上
    d += ` L ${x} ${y + s}`
    // 向右（下一圈）
    if (i < turns - 1) {
      d += ` L ${x + w - s} ${y}`
      x += s
      y += s
      w -= s * 2
      h -= s * 2
    }
  }

  addPath(svg, d, '#C9A84C', Math.max(1.5, size / 200))
  return svg
}

// ── 绳纹生成器 ────────────────────────────────────────

/**
 * 绳纹 — 交织绳索纹样
 * @param {number} size - SVG 尺寸
 * @param {number} strands - 绳索股数
 */
export function generateShengwen(size = 512, strands = 2) {
  const svg = createSVG(size)
  const amplitude = size * 0.15
  const frequency = 3

  for (let s = 0; s < strands; s++) {
    const offset = (s / strands) * Math.PI * 2
    let d = ''
    const steps = 200

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2 * frequency
      const x = (i / steps) * size
      const y = size / 2 + Math.sin(t + offset) * amplitude

      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
    }

    addPath(svg, d, '#C9A84C', Math.max(2, size / 150))
  }

  return svg
}

// ── 导出注册表 ────────────────────────────────────────

export const PROCEDURAL_GENERATORS = {
  huiwen: {
    name: '回纹',
    generate: generateHuiwen,
    params: { size: 512, unit: 40, turns: 4 },
  },
  wanzi: {
    name: '万字纹',
    generate: generateWanzi,
    params: { size: 512, unit: 80 },
  },
  binglie: {
    name: '冰裂纹',
    generate: generateBinglie,
    params: { size: 512, density: 40 },
  },
  leiwen: {
    name: '雷纹',
    generate: generateLeiwen,
    params: { size: 512, turns: 8 },
  },
  shengwen: {
    name: '绳纹',
    generate: generateShengwen,
    params: { size: 512, strands: 2 },
  },
}

/**
 * 生成纹样 SVG 并返回 SVG 字符串
 */
export function generatePatternSVG(type, params = {}) {
  const gen = PROCEDURAL_GENERATORS[type]
  if (!gen) throw new Error(`未知纹样类型: ${type}`)
  const merged = { ...gen.params, ...params }
  const svg = gen.generate(merged)
  return new XMLSerializer().serializeToString(svg)
}

/**
 * 生成纹样并转为 data URL
 */
export function generatePatternDataURL(type, params = {}) {
  const svgStr = generatePatternSVG(type, params)
  const encoded = btoa(unescape(encodeURIComponent(svgStr)))
  return `data:image/svg+xml;base64,${encoded}`
}
