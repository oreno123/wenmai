/**
 * 纹样组件库 — 纹脉 LEGO
 * 每个组件由数学公式生成 SVG path，无位图依赖
 *
 * 组件类型：
 * - center: 中心主体件
 * - border: 边饰件（沿圆/方边缘排列）
 * - corner: 角件
 */

// ── 工具 ──────────────────────────────────────────

function arc(cx, cy, r, startDeg, endDeg, segments = 32) {
  const s = startDeg * Math.PI / 180
  const e = endDeg * Math.PI / 180
  let d = ''
  for (let i = 0; i <= segments; i++) {
    const a = s + (e - s) * (i / segments)
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

function spiralPath(cx, cy, startR, endR, turns, startAngle = 0) {
  const steps = turns * 36
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = startAngle + t * turns * Math.PI * 2
    const r = startR + (endR - startR) * t
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

function curveBetween(x1, y1, x2, y2, bulge = 0.3) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const cx1 = mx - dy * bulge
  const cy1 = my + dx * bulge
  return `M ${x1} ${y1} Q ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${x2} ${y2}`
}

// ── 组件数据 ──────────────────────────────────────

export const COMPONENT_LIBRARY = [
  // ═══════════ 中心件 (center) ═══════════

  {
    id: 'center-lotus-heart',
    name: '莲花心',
    type: 'center',
    category: '花卉',
    rarity: 'common',
    viewBox: '0 0 200 200',
    anchors: [],
    generatePath: () => {
      const cx = 100, cy = 100, petals = 8
      let d = ''
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 - Math.PI / 2
        const na = ((i + 1) / petals) * Math.PI * 2 - Math.PI / 2
        const outerR = 70
        const innerR = 25
        const ox = cx + Math.cos(a) * outerR
        const oy = cy + Math.sin(a) * outerR
        const nox = cx + Math.cos(na) * outerR
        const noy = cy + Math.sin(na) * outerR
        const ma = (a + na) / 2
        const midR = 45
        d += `M ${cx + Math.cos(a) * innerR} ${cy + Math.sin(a) * innerR} `
        d += `Q ${cx + Math.cos(a - 0.2) * outerR} ${cy + Math.sin(a - 0.2) * outerR} ${ox} ${oy} `
        d += `Q ${cx + Math.cos(ma) * (outerR + 10)} ${cy + Math.sin(ma) * (outerR + 10)} ${nox} ${noy} `
        d += `Q ${cx + Math.cos(na + 0.2) * outerR} ${cy + Math.sin(na + 0.2) * outerR} ${cx + Math.cos(na) * innerR} ${cy + Math.sin(na) * innerR} `
      }
      // 中心圆
      d += `M ${cx} ${cy - 12} A 12 12 0 1 1 ${cx} ${cy + 12} A 12 12 0 1 1 ${cx} ${cy - 12}`
      return d
    },
  },

  {
    id: 'center-baoxiang',
    name: '宝相花心',
    type: 'center',
    category: '花卉',
    rarity: 'rare',
    viewBox: '0 0 200 200',
    anchors: [],
    generatePath: () => {
      const cx = 100, cy = 100
      let d = ''
      // 外层大花瓣
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2
        const tipX = cx + Math.cos(a) * 80
        const tipY = cy + Math.sin(a) * 80
        const la = a - 0.35
        const ra = a + 0.35
        d += `M ${cx + Math.cos(la) * 20} ${cy + Math.sin(la) * 20} Q ${cx + Math.cos(la) * 65} ${cy + Math.sin(la) * 65} ${tipX} ${tipY} Q ${cx + Math.cos(ra) * 65} ${cy + Math.sin(ra) * 65} ${cx + Math.cos(ra) * 20} ${cy + Math.sin(ra) * 20} `
      }
      // 内层小花瓣
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const tipX = cx + Math.cos(a) * 38
        const tipY = cy + Math.sin(a) * 38
        const la = a - 0.4
        const ra = a + 0.4
        d += `M ${cx + Math.cos(la) * 10} ${cy + Math.sin(la) * 10} Q ${cx + Math.cos(la) * 30} ${cy + Math.sin(la) * 30} ${tipX} ${tipY} Q ${cx + Math.cos(ra) * 30} ${cy + Math.sin(ra) * 30} ${cx + Math.cos(ra) * 10} ${cy + Math.sin(ra) * 10} `
      }
      d += `M ${cx} ${cy - 8} A 8 8 0 1 1 ${cx} ${cy + 8} A 8 8 0 1 1 ${cx} ${cy - 8}`
      return d
    },
  },

  {
    id: 'center-taotie',
    name: '饕餮面',
    type: 'center',
    category: '兽面',
    rarity: 'ssr',
    viewBox: '0 0 200 200',
    anchors: [],
    generatePath: () => {
      const cx = 100, cy = 100
      let d = ''
      // 外框
      d += arc(cx, cy, 85, 0, 360)
      // 左眼
      d += ` M 65 75 A 18 22 0 1 1 65 77`
      // 右眼
      d += ` M 135 75 A 18 22 0 1 1 135 77`
      // 鼻梁
      d += ` M 100 60 L 95 95 Q 100 100 105 95 L 100 60`
      // 嘴
      d += ` M 70 125 Q 85 145 100 130 Q 115 145 130 125`
      // 左角
      d += ` M 40 55 Q 25 20 50 40 Q 60 55 55 65`
      // 右角
      d += ` M 160 55 Q 175 20 150 40 Q 140 55 145 65`
      // 左獠牙
      d += ` M 75 120 L 70 140 L 82 125`
      // 右獠牙
      d += ` M 125 120 L 130 140 L 118 125`
      return d
    },
  },

  {
    id: 'center-tuanlong',
    name: '团龙面',
    type: 'center',
    category: '龙纹',
    rarity: 'ssr',
    viewBox: '0 0 200 200',
    anchors: [],
    generatePath: () => {
      const cx = 100, cy = 100
      let d = ''
      // 外圈
      d += arc(cx, cy, 85, 0, 360)
      // 内圈
      d += arc(cx, cy, 60, 0, 360)
      // 龙眼（两个对称圆）
      d += ` M 78 85 A 8 10 0 1 1 78 87`
      d += ` M 122 85 A 8 10 0 1 1 122 87`
      // 龙鼻
      d += ` M 100 75 L 93 90 Q 96 95 100 92 Q 104 95 107 90 L 100 75`
      // 龙须左
      d += ` M 60 80 Q 40 60 50 45 Q 55 50 52 65 Q 48 70 58 82`
      // 龙须右
      d += ` M 140 80 Q 160 60 150 45 Q 145 50 148 65 Q 152 70 142 82`
      // 龙角左
      d += ` M 70 65 Q 50 30 65 50`
      // 龙角右
      d += ` M 130 65 Q 150 30 135 50`
      // 龙鳞纹
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        d += arc(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48, 8, a * 180 / Math.PI, a * 180 / Math.PI + 180, 12)
      }
      return d
    },
  },

  {
    id: 'center-gemoetric-star',
    name: '八角星',
    type: 'center',
    category: '几何',
    rarity: 'common',
    viewBox: '0 0 200 200',
    anchors: [],
    generatePath: () => {
      const cx = 100, cy = 100
      let d = ''
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2
        const r = i % 2 === 0 ? 80 : 40
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
      }
      d += ' Z'
      // 内圆
      d += ` M ${cx} ${cy - 20} A 20 20 0 1 1 ${cx} ${cy + 20} A 20 20 0 1 1 ${cx} ${cy - 20}`
      return d
    },
  },

  // ═══════════ 边饰件 (border) ═══════════

  {
    id: 'border-ruyi-head',
    name: '如意云头',
    type: 'border',
    category: '云纹',
    rarity: 'common',
    viewBox: '0 0 120 80',
    anchors: [
      { x: 0, y: 40, angle: 180, type: 'input' },
      { x: 120, y: 40, angle: 0, type: 'output' },
    ],
    fitAngle: 15,
    generatePath: () => {
      let d = ''
      // 云头（如意形）
      d += 'M 30 40 Q 30 10 60 10 Q 90 10 90 40 Q 90 65 60 70 Q 45 72 30 60'
      // 茎
      d += ' M 30 50 Q 20 50 10 45 Q 0 40 10 35 Q 20 30 30 40'
      // 装饰螺旋
      d += ' M 60 25 Q 70 20 75 30 Q 80 40 70 45 Q 60 50 55 40'
      return d
    },
  },

  {
    id: 'border-cloud-scroll',
    name: '卷云',
    type: 'border',
    category: '云纹',
    rarity: 'common',
    viewBox: '0 0 100 60',
    anchors: [
      { x: 0, y: 30, angle: 180, type: 'input' },
      { x: 100, y: 30, angle: 0, type: 'output' },
    ],
    fitAngle: 12,
    generatePath: () => {
      let d = ''
      // 卷云主体
      d += 'M 10 30 Q 10 15 30 10 Q 50 5 60 15 Q 70 25 65 35 Q 55 50 40 45 Q 25 40 20 30'
      // 内螺旋
      d += ' M 45 20 Q 55 18 58 28 Q 60 38 50 38 Q 42 38 42 30'
      // 尾部延伸
      d += ' M 65 35 Q 75 40 85 38 Q 95 35 100 30'
      return d
    },
  },

  {
    id: 'border-lianhua-petal',
    name: '莲瓣',
    type: 'border',
    category: '花卉',
    rarity: 'common',
    viewBox: '0 0 60 100',
    anchors: [
      { x: 30, y: 0, angle: -90, type: 'input' },
      { x: 30, y: 100, angle: 90, type: 'output' },
    ],
    fitAngle: 12,
    generatePath: () => {
      let d = ''
      d += 'M 30 5 Q 55 30 50 60 Q 45 90 30 95 Q 15 90 10 60 Q 5 30 30 5'
      // 内纹
      d += ' M 30 20 Q 45 40 42 60 Q 38 80 30 85 Q 22 80 18 60 Q 15 40 30 20'
      return d
    },
  },

  {
    id: 'border-juancao-vine',
    name: '卷草藤',
    type: 'border',
    category: '卷草',
    rarity: 'common',
    viewBox: '0 0 140 50',
    anchors: [
      { x: 0, y: 25, angle: 180, type: 'input' },
      { x: 140, y: 25, angle: 0, type: 'output' },
    ],
    fitAngle: 20,
    generatePath: () => {
      let d = ''
      // 主藤蔓 S 曲线
      d += 'M 0 25 Q 20 10 35 20 Q 50 30 70 25 Q 90 20 105 30 Q 120 40 140 25'
      // 上方卷草
      d += ' M 35 15 Q 40 5 50 8 Q 55 12 48 18'
      d += ' M 70 20 Q 75 8 85 12 Q 88 18 80 22'
      // 下方卷草
      d += ' M 55 30 Q 60 42 70 38 Q 72 32 65 28'
      d += ' M 100 32 Q 105 44 115 40 Q 118 35 110 30'
      return d
    },
  },

  {
    id: 'border-juancao-terminal',
    name: '卷草终端',
    type: 'border',
    category: '卷草',
    rarity: 'rare',
    viewBox: '0 0 80 80',
    anchors: [
      { x: 0, y: 40, angle: 180, type: 'input' },
    ],
    fitAngle: 15,
    generatePath: () => {
      let d = ''
      // 螺旋终端
      d += 'M 5 40 Q 15 35 25 30 Q 40 20 50 25 Q 60 32 55 42 Q 48 52 38 48 Q 30 44 35 38'
      // 花蕾
      d += ' M 50 25 Q 55 15 65 18 Q 72 22 68 30 Q 62 35 55 30'
      return d
    },
  },

  {
    id: 'border-huiwen-unit',
    name: '回纹单元',
    type: 'border',
    category: '几何',
    rarity: 'common',
    viewBox: '0 0 40 60',
    anchors: [
      { x: 20, y: 0, angle: -90, type: 'input' },
      { x: 20, y: 60, angle: 90, type: 'output' },
    ],
    fitAngle: 8,
    generatePath: () => {
      let d = ''
      // 方折回纹
      d += 'M 35 0 L 35 45 L 10 45 L 10 15 L 25 15 L 25 35 L 20 35 L 20 20'
      d += ' M 5 0 L 5 50 L 30 50 L 30 55 L 0 55 L 0 0 Z'
      return d
    },
  },

  {
    id: 'border-huiwen-band',
    name: '回纹带',
    type: 'border',
    category: '几何',
    rarity: 'common',
    viewBox: '0 0 120 30',
    anchors: [
      { x: 0, y: 15, angle: 180, type: 'input' },
      { x: 120, y: 15, angle: 0, type: 'output' },
    ],
    fitAngle: 25,
    generatePath: () => {
      let d = ''
      const w = 20, h = 25
      for (let i = 0; i < 4; i++) {
        const ox = i * 30
        d += ` M ${ox} ${h} L ${ox + w} ${h} L ${ox + w} 5 L ${ox + 10} 5 L ${ox + 10} ${h - 8} L ${ox + w - 5} ${h - 8} L ${ox + w - 5} 12`
      }
      return d
    },
  },

  {
    id: 'border-leiwen-unit',
    name: '雷纹单元',
    type: 'border',
    category: '几何',
    rarity: 'common',
    viewBox: '0 0 50 50',
    anchors: [
      { x: 0, y: 25, angle: 180, type: 'input' },
      { x: 50, y: 25, angle: 0, type: 'output' },
    ],
    fitAngle: 10,
    generatePath: () => {
      let d = ''
      // 方折螺旋
      d += 'M 0 15 L 35 15 L 35 40 L 15 40 L 15 25 L 25 25 L 25 35'
      d += ' M 5 10 L 40 10 L 40 45 L 10 45 L 10 20'
      return d
    },
  },

  {
    id: 'border-wanzi-unit',
    name: '万字单元',
    type: 'border',
    category: '几何',
    rarity: 'common',
    viewBox: '0 0 60 60',
    anchors: [
      { x: 0, y: 30, angle: 180, type: 'input' },
      { x: 60, y: 30, angle: 0, type: 'output' },
    ],
    fitAngle: 12,
    generatePath: () => {
      const cx = 30, cy = 30, arm = 22, t = 6
      let d = ''
      // 十字
      d += `M ${cx - t} ${cy - t} L ${cx + t} ${cy - t} L ${cx + t} ${cy + t} L ${cx - t} ${cy + t} Z`
      // 右臂
      d += ` M ${cx + t} ${cy - t} L ${cx + arm} ${cy - t} L ${cx + arm} ${cy - arm} L ${cx + arm + 5} ${cy - t}`
      // 上臂
      d += ` M ${cx - t} ${cy - t} L ${cx - t} ${cy - arm} L ${cx - arm} ${cy - arm} L ${cx - t} ${cy - arm - 5}`
      // 左臂
      d += ` M ${cx - t} ${cy + t} L ${cx - arm} ${cy + t} L ${cx - arm} ${cy + arm} L ${cx - arm - 5} ${cy + t}`
      // 下臂
      d += ` M ${cx + t} ${cy + t} L ${cx + t} ${cy + arm} L ${cx + arm} ${cy + arm} L ${cx + t} ${cy + arm + 5}`
      return d
    },
  },

  {
    id: 'border-wave',
    name: '水波纹',
    type: 'border',
    category: '几何',
    rarity: 'common',
    viewBox: '0 0 120 30',
    anchors: [
      { x: 0, y: 15, angle: 180, type: 'input' },
      { x: 120, y: 15, angle: 0, type: 'output' },
    ],
    fitAngle: 25,
    generatePath: () => {
      let d = 'M 0 15'
      for (let i = 0; i < 4; i++) {
        const x = i * 30
        d += ` Q ${x + 8} 0 ${x + 15} 15 Q ${x + 22} 30 ${x + 30} 15`
      }
      // 第二层
      d += ' M 0 20'
      for (let i = 0; i < 4; i++) {
        const x = i * 30
        d += ` Q ${x + 8} 8 ${x + 15} 20 Q ${x + 22} 32 ${x + 30} 20`
      }
      return d
    },
  },

  {
    id: 'border-scale',
    name: '鳞片',
    type: 'border',
    category: '龙纹',
    rarity: 'common',
    viewBox: '0 0 30 30',
    anchors: [
      { x: 0, y: 15, angle: 180, type: 'input' },
      { x: 30, y: 15, angle: 0, type: 'output' },
    ],
    fitAngle: 6,
    generatePath: () => {
      let d = ''
      d += 'M 15 2 Q 28 8 28 18 Q 28 28 15 28 Q 2 28 2 18 Q 2 8 15 2'
      // 内纹
      d += ' M 15 8 Q 22 12 22 18 Q 22 24 15 24 Q 8 24 8 18 Q 8 12 15 8'
      return d
    },
  },

  {
    id: 'border-tendril',
    name: '藤蔓小卷',
    type: 'border',
    category: '卷草',
    rarity: 'common',
    viewBox: '0 0 50 50',
    anchors: [
      { x: 0, y: 25, angle: 180, type: 'input' },
      { x: 50, y: 25, angle: 0, type: 'output' },
    ],
    fitAngle: 10,
    generatePath: () => {
      let d = ''
      d += 'M 0 25 Q 10 15 20 20 Q 30 25 35 15 Q 40 5 38 12 Q 35 22 28 25'
      d += ' M 35 15 Q 42 10 45 18 Q 46 25 40 28'
      return d
    },
  },

  {
    id: 'border-dot-band',
    name: '连珠纹',
    type: 'border',
    category: '几何',
    rarity: 'common',
    viewBox: '0 0 120 20',
    anchors: [
      { x: 0, y: 10, angle: 180, type: 'input' },
      { x: 120, y: 10, angle: 0, type: 'output' },
    ],
    fitAngle: 25,
    generatePath: () => {
      let d = ''
      for (let i = 0; i < 8; i++) {
        const cx = 8 + i * 14
        d += ` M ${cx + 6} 10 A 6 6 0 1 1 ${cx + 6 - 0.01} 10`
      }
      return d
    },
  },

  {
    id: 'border-flame',
    name: '火焰纹',
    type: 'border',
    category: '花卉',
    rarity: 'rare',
    viewBox: '0 0 40 80',
    anchors: [
      { x: 20, y: 0, angle: -90, type: 'input' },
      { x: 20, y: 80, angle: 90, type: 'output' },
    ],
    fitAngle: 8,
    generatePath: () => {
      let d = ''
      d += 'M 20 0 Q 35 15 32 30 Q 38 40 30 55 Q 25 65 20 80 Q 15 65 10 55 Q 2 40 8 30 Q 5 15 20 0'
      d += ' M 20 15 Q 28 25 26 35 Q 30 42 25 52 Q 22 58 20 65 Q 18 58 15 52 Q 10 42 14 35 Q 12 25 20 15'
      return d
    },
  },

  // ═══════════ 角件 (corner) ═══════════

  {
    id: 'corner-ruyi',
    name: '如意角花',
    type: 'corner',
    category: '角花',
    rarity: 'common',
    viewBox: '0 0 100 100',
    anchors: [
      { x: 100, y: 0, angle: 0, type: 'input' },
      { x: 0, y: 100, angle: 90, type: 'output' },
    ],
    position: 'top-right',
    generatePath: () => {
      let d = ''
      // 如意头
      d += 'M 100 0 Q 85 5 75 15 Q 60 30 55 45 Q 50 55 40 55 Q 30 55 30 45'
      d += ' Q 30 35 40 30 Q 55 25 65 15 Q 80 0 100 0'
      // 装饰线
      d += ' M 70 20 Q 65 30 55 38'
      d += ' M 40 55 L 45 60 Q 50 55 55 50'
      // 对称边
      d += ' M 0 100 Q 5 85 15 75 Q 30 60 45 55 Q 55 50 55 40 Q 55 30 45 30'
      d += ' Q 35 30 30 40 Q 25 55 15 65 Q 0 80 0 100'
      return d
    },
  },

  {
    id: 'corner-cloud',
    name: '云头角花',
    type: 'corner',
    category: '角花',
    rarity: 'common',
    viewBox: '0 0 100 100',
    anchors: [
      { x: 100, y: 0, angle: 0, type: 'input' },
      { x: 0, y: 100, angle: 90, type: 'output' },
    ],
    position: 'top-right',
    generatePath: () => {
      let d = ''
      // 云头卷曲
      d += 'M 100 0 Q 80 5 70 20 Q 60 35 50 40 Q 35 48 30 38 Q 25 28 35 22'
      d += ' Q 50 15 60 5 Q 75 -5 100 0'
      // 下半
      d += ' M 0 100 Q 5 80 20 70 Q 35 60 40 50 Q 48 35 38 30 Q 28 25 22 35'
      d += ' Q 15 50 5 60 Q -5 75 0 100'
      // 连接线
      d += ' M 50 40 Q 45 45 40 50'
      return d
    },
  },

  {
    id: 'corner-geometric',
    name: '几何角花',
    type: 'corner',
    category: '角花',
    rarity: 'common',
    viewBox: '0 0 100 100',
    anchors: [
      { x: 100, y: 0, angle: 0, type: 'input' },
      { x: 0, y: 100, angle: 90, type: 'output' },
    ],
    position: 'top-right',
    generatePath: () => {
      let d = ''
      // 方折角
      d += 'M 100 0 L 60 0 L 60 10 L 90 10 L 90 40 L 100 40 Z'
      d += ' M 75 10 L 75 25 L 90 25'
      // 对称方折
      d += ' M 0 100 L 0 60 L 10 60 L 10 90 L 40 90 L 40 100 Z'
      d += ' M 10 75 L 25 75 L 25 90'
      // 连接弧
      d += ' M 60 40 Q 50 50 40 60'
      return d
    },
  },
]

// ── 工具函数 ──────────────────────────────────────

export function getComponentById(id) {
  return COMPONENT_LIBRARY.find(c => c.id === id)
}

export function getComponentsByType(type) {
  return COMPONENT_LIBRARY.filter(c => c.type === type)
}

export function getComponentsByCategory(category) {
  return COMPONENT_LIBRARY.filter(c => c.category === category)
}

export function getCategories() {
  return [...new Set(COMPONENT_LIBRARY.map(c => c.category))]
}

/**
 * 获取组件的完整 SVG 字符串（带实体质感）
 */
export function getComponentSVG(component, stroke = '#C9A84C', strokeWidth = 2, fill = '#1A1612') {
  const path = component.generatePath()
  const vb = component.viewBox.split(' ')
  const w = vb[2], h = vb[3]
  const uid = component.id.replace(/[^a-z0-9]/g, '')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${component.viewBox}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="gold-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F2D58A"/>
      <stop offset="50%" stop-color="#C9A84C"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </linearGradient>
    <filter id="shadow-${uid}">
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <g filter="url(#shadow-${uid})">
    <path d="${path}" fill="${fill}" stroke="url(#gold-${uid})" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <path d="${path}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.5,-0.5)"/>
</svg>`
}

/**
 * 获取组件的 data URL
 */
export function getComponentDataURL(component, stroke = '#C9A84C', strokeWidth = 1.5) {
  const svg = getComponentSVG(component, stroke, strokeWidth)
  const encoded = btoa(unescape(encodeURIComponent(svg)))
  return `data:image/svg+xml;base64,${encoded}`
}

/**
 * 在 Canvas 上绘制组件（纹样自身形状就是实体，无底板）
 */
export function drawComponentOnCanvas(ctx, component, x, y, size, rotation = 0, stroke = '#C9A84C', strokeWidth = 2.5) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation * Math.PI / 180)

  const vb = component.viewBox.split(' ').map(Number)
  const scale = size / Math.max(vb[2], vb[3])
  ctx.scale(scale, scale)
  ctx.translate(-vb[0] - vb[2] / 2, -vb[1] - vb[3] / 2)

  const path = new Path2D(component.generatePath())

  // 1) 投影（偏移右下，模拟实体浮起）
  ctx.save()
  ctx.translate(2.5, 2.5)
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fill(path)
  ctx.restore()

  // 2) 填充（深漆底色，让金色线条有底）
  ctx.fillStyle = '#181410'
  ctx.fill(path)

  // 3) 金色描边（主体线条，有宽度 = 实体金线的厚度）
  ctx.strokeStyle = stroke
  ctx.lineWidth = strokeWidth / scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(path)

  // 4) 高光（微偏左上，模拟金线反光）
  ctx.save()
  ctx.translate(-0.8, -0.8)
  ctx.strokeStyle = 'rgba(255,245,200,0.18)'
  ctx.lineWidth = (strokeWidth * 0.5) / scale
  ctx.stroke(path)
  ctx.restore()

  ctx.restore()
}
