import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from '../common/Router'
import { XINGHE_ERAS, XINGHE_RELICS, XINGHE_IMG_BASE } from '../../data/xingheRelics'
import './xinghe.css'

/* 星河视图 —— 自 xinghe-demo/fly.html 移植的纯 canvas 2D 透视飞行。
   HUD 由 React 渲染；相机的逐帧变量留在 effect 闭包里，不触发重渲染。 */

function buildScene() {
  const R = XINGHE_RELICS
  const ERAS = XINGHE_ERAS

  const motifMap = {}
  R.forEach((r, i) => r.motifs.forEach((m) => { (motifMap[m] = motifMap[m] || []).push(i) }))
  const MOTIFS = Object.keys(motifMap).sort((a, b) => motifMap[b].length - motifMap[a].length)
  const isLone = (m) => motifMap[m].length === 1

  const ZLEN = 6400
  const PX = (u) => 520 * Math.sin(u * Math.PI * 1.7) - 190 * Math.sin(u * Math.PI * 3.3)
  const PY = (u) => 220 * Math.sin(u * Math.PI * 1.15 + 0.9) - 95 * Math.sin(u * Math.PI * 2.7)
  const PZ = (u) => u * ZLEN
  const pathAt = (u) => ({ x: PX(u), y: PY(u), z: PZ(u) })

  const U = ERAS.map((_, i) => 0.05 + i * 0.1286)
  const uSpan = { a: -0.03, b: 1.03 }
  const ZONE = 0.0643

  const byEra = {}
  R.forEach((r, i) => { (byEra[r.era] = byEra[r.era] || []).push(i) })

  const nodes = R.map((r, i) => ({
    i, ...r,
    rad: r.score >= 5 ? 74 : 58,
    lone: r.motifs.some(isLone),
    x: 0, y: 0, z: 0, u: 0,
    img: null,
  }))

  Object.keys(byEra).forEach((ek) => {
    const e = +ek, list = byEra[e], n = list.length
    const cr = 52 + 22 * Math.sqrt(n)
    list.forEach((idx, j) => {
      const dz = n > 1 ? (j - (n - 1) / 2) / (n - 1) * 0.115 : 0
      const u = U[e] + dz
      const rr = cr * Math.sqrt((j + 0.5) / n)
      const aa = j * 2.399963 + e * 1.7
      const p = pathAt(u)
      nodes[idx].u = u
      nodes[idx].x = p.x + Math.cos(aa) * rr
      nodes[idx].y = p.y + Math.sin(aa) * rr * 0.8
      nodes[idx].z = p.z
    })
  })

  const eraMotifs = {}
  Object.keys(byEra).forEach((ek) => {
    const e = +ek, ms = {}
    byEra[e].forEach((i) => nodes[i].motifs.forEach((m) => { ms[m] = (ms[m] || 0) + 1 }))
    eraMotifs[e] = Object.keys(ms).sort((a, b) => motifMap[b].length - motifMap[a].length).slice(0, 3)
  })

  const kinOf = (i) => nodes.map((n, k) => k)
    .filter((k) => k !== i && nodes[k].motifs.some((m) => nodes[i].motifs.includes(m)))
  const sharedWith = (a, b) => nodes[a].motifs.filter((m) => nodes[b].motifs.includes(m))

  return { R, ERAS, motifMap, MOTIFS, isLone, pathAt, U, uSpan, ZONE, byEra, nodes, eraMotifs, kinOf, sharedWith, ZLEN }
}

export default function XingheStarRiver({ onBack }) {
  const canvasRef = useRef(null)
  const apiRef = useRef(null)
  const speedRef = useRef(null)
  const railDotRef = useRef(null)
  const railFillRef = useRef(null)
  const st = useRef({ selRelic: -1, selEra: -1, activeMotif: null, flying: true })

  const { search } = useLocation()
  const navigate = useNavigate()
  const searchRef = useRef(search)
  searchRef.current = search
  const initialSearch = useRef(search)

  const [selRelic, setSelRelic] = useState(-1)
  const [selEra, setSelEra] = useState(-1)
  const [activeMotif, setActiveMotif] = useState(null)
  const [flying, setFlying] = useState(true)
  const [caption, setCaption] = useState({ t: '', s: '' })

  const scene = useMemo(() => buildScene(), [])
  const { ERAS, MOTIFS, motifMap, isLone, U, uSpan, byEra, nodes, eraMotifs, kinOf, sharedWith } = scene

  const openRelic = useCallback((i) => {
    st.current.selRelic = i; st.current.selEra = -1
    setSelRelic(i); setSelEra(-1)
  }, [])
  const openEra = useCallback((e) => {
    st.current.selEra = e; st.current.selRelic = -1
    setSelEra(e); setSelRelic(-1)
  }, [])
  const setMotif = useCallback((m) => {
    st.current.activeMotif = m; setActiveMotif(m)
  }, [])
  const clearScene = useCallback(() => {
    st.current.activeMotif = null; st.current.selRelic = -1; st.current.selEra = -1
    setActiveMotif(null); setSelRelic(-1); setSelEra(-1)
  }, [])

  /* ---------------- 引擎 ---------------- */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const TAU = Math.PI * 2
    const VW = 1920, VH = 1080, CX = 960, CY = 540
    const INK = '#171513', GOLD = '#C9A24B', CINNABAR = '#9E3530'
    const FONT = "'Noto Serif SC','Songti SC','SimSun','STSong',serif"

    const hexA = (hex, a) => {
      const h = hex.replace('#', '')
      const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'
    }

    /* --- 相机 --- */
    let camU = uSpan.a
    const LOOK = 0.15
    const CAM_OFF_R = 205, CAM_OFF_U = 120, YAW_L = 0.32, PIT_D = 0.20
    let F = 1000
    const NEAR = 34, FARV = 5600
    let cam = { x: 0, y: 0, z: 0 }
    let cosY = 1, sinY = 0, cosP = 1, sinP = 0

    function updateCam() {
      const c = scene.pathAt(camU), a = scene.pathAt(camU + LOOK)
      let tx = a.x - c.x, ty = a.y - c.y, tz = a.z - c.z
      const L = Math.hypot(tx, ty, tz) || 1
      tx /= L; ty /= L; tz /= L
      let rx = tz, rz = -tx
      const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl
      cam = { x: c.x + rx * CAM_OFF_R, y: c.y + CAM_OFF_U, z: c.z + rz * CAM_OFF_R }
      const yaw = Math.atan2(tx, tz) - YAW_L
      const pit = Math.asin(Math.max(-1, Math.min(1, ty))) - PIT_D
      cosY = Math.cos(yaw); sinY = Math.sin(yaw)
      cosP = Math.cos(pit); sinP = Math.sin(pit)
    }
    function camZ(x, y, z) {
      const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z
      const z1 = dx * sinY + dz * cosY
      return dy * sinP + z1 * cosP
    }
    function project(x, y, z) {
      const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z
      const xc = dx * cosY - dz * sinY
      const z1 = dx * sinY + dz * cosY
      const yc = dy * cosP - z1 * sinP
      const zc = dy * sinP + z1 * cosP
      if (zc <= 1) return null
      const s = F / zc
      return { sx: CX + xc * s, sy: CY - yc * s, d: zc, s }
    }

    const fog = (d) => Math.pow(Math.max(0, 1 - d / FARV), 1.45)
    const nearF = (d) => Math.max(0, Math.min(1, (d - NEAR) / 430))

    /* --- 星尘 / 背景星 / 光斑 --- */
    const rnd = (a, b) => a + Math.random() * (b - a)
    const dust = Array.from({ length: 1500 }, () => ({
      u: Math.random(), a: Math.random() * TAU,
      r: Math.sqrt(Math.random()) * 720 + 24, w: rnd(3.5, 11),
      hot: Math.random() < 0.07,
    }))
    const bgStars = Array.from({ length: 320 }, () => ({
      x: rnd(-2000, 2000), y: rnd(-1200, 1200),
      z: rnd(9000, 16000), w: rnd(6, 22), tw: rnd(0, TAU),
    }))
    const RIVER_R = 72
    const GLOW_C = (() => {
      const mk = (col, core) => {
        const S = 128, c = document.createElement('canvas')
        c.width = c.height = S
        const g = c.getContext('2d')
        const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
        rg.addColorStop(0, hexA(core, 0.95))
        rg.addColorStop(0.22, hexA(col, 0.44))
        rg.addColorStop(0.58, hexA(col, 0.10))
        rg.addColorStop(1, hexA(col, 0))
        g.fillStyle = rg; g.fillRect(0, 0, S, S)
        return c
      }
      return { gold: mk(GOLD, '#F4E6BA'), cin: mk(CINNABAR, '#EBA694') }
    })()

    /* --- 状态 --- */
    let hover = -1
    let speedMul = 1
    let fadeA = 1
    const BASE_SPEED = 0.0096
    let lastEra = -1
    let capKey = ''
    const eraHit = {}
    const visible = []

    const busy = () => st.current.selRelic >= 0 || st.current.selEra >= 0 || !!st.current.activeMotif

    /* --- 视口 --- */
    let W = 0, H = 0, DPR = 1, kFit = 1
    const view = { x: 0, y: 0, k: 1 }
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = cv.clientWidth; H = cv.clientHeight
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR)
      kFit = Math.min(W / VW, H / VH)
      view.k = kFit
      view.x = (W - VW * kFit) / 2
      view.y = (H - VH * kFit) / 2
    }
    const toVirtual = (sx, sy) => ({ x: (sx - view.x) / view.k, y: (sy - view.y) / view.k })
    function hitTest(vx, vy) {
      let best = -1, bd = 1e9
      for (const o of visible) {
        const dd = Math.hypot(o.p.sx - vx, o.p.sy - vy)
        if (dd < o.r * 0.95 && o.p.d < bd) { bd = o.p.d; best = o.n.i }
      }
      return best
    }

    function flyTo(u) {
      camU = Math.max(uSpan.a, Math.min(uSpan.b - 0.02, u))
      updateRail()
    }
    function updateRail() {
      const p = (camU - uSpan.a) / (uSpan.b - uSpan.a) * 100
      if (railDotRef.current) railDotRef.current.style.left = p + '%'
      if (railFillRef.current) railFillRef.current.style.width = Math.max(0, Math.min(100, p)) + '%'
    }
    function updateCaption() {
      let idx = -1
      for (let i = 0; i < ERAS.length; i++) if (Math.abs(camU - U[i]) < scene.ZONE) { idx = i; break }
      if (idx < 0) {
        idx = 0
        for (let i = 1; i < ERAS.length; i++) if (Math.abs(camU - U[i]) < Math.abs(camU - U[idx])) idx = i
      }
      if (idx !== lastEra) {
        lastEra = idx
        const n = (byEra[idx] || []).length
        const ms = (eraMotifs[idx] || []).join('　')
        const key = idx + '|' + n
        if (key !== capKey) { capKey = key; setCaption({ t: ERAS[idx], s: n + ' 器　·　' + ms }) }
      }
    }

    /* --- 指针 --- */
    const onPointerMove = (e) => {
      const v = toVirtual(e.clientX, e.clientY)
      const h = hitTest(v.x, v.y)
      if (h !== hover) { hover = h; cv.style.cursor = h >= 0 ? 'pointer' : 'crosshair' }
    }
    const onPointerUp = (e) => {
      const v = toVirtual(e.clientX, e.clientY)
      const i = hitTest(v.x, v.y)
      if (i >= 0) { setMotif(null); openRelic(i); return }
      for (const k in eraHit) {
        const b = eraHit[k]
        if (Math.abs(v.x - b.x) < b.w / 2 + 16 && Math.abs(v.y - b.y) < b.h / 2 + 12) {
          clearScene(); openEra(+k); return
        }
      }
      if (busy()) clearScene()
    }
    const onPointerLeave = () => { hover = -1; cv.style.cursor = 'crosshair' }
    const onWheel = (e) => {
      e.preventDefault()
      F = Math.max(560, Math.min(1700, F * Math.exp(-e.deltaY * 0.0011)))
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') clearScene()
      if (e.key === ' ') {
        const f = !st.current.flying
        st.current.flying = f; setFlying(f)
        e.preventDefault()
      }
    }

    /* --- 绘制 --- */
    function drawLink(ids, col, bulge) {
      if (ids.length < 2) return
      ctx.globalCompositeOperation = 'lighter'
      for (let k = 0; k < ids.length - 1; k++) {
        const a = nodes[ids[k]], b = nodes[ids[k + 1]]
        const SEG = 46
        let prev = null
        for (let s = 0; s <= SEG; s++) {
          const q = s / SEG, iq = 1 - q
          const x = iq * iq * a.x + 2 * iq * q * ((a.x + b.x) / 2) + q * q * b.x
          let y = iq * iq * a.y + 2 * iq * q * ((a.y + b.y) / 2) + q * q * b.y
          const z = iq * iq * a.z + 2 * iq * q * ((a.z + b.z) / 2) + q * q * b.z
          y += Math.sin(q * Math.PI) * bulge
          const p = project(x, y, z)
          if (!p) { prev = null; continue }
          if (prev) {
            ctx.globalAlpha = 0.85 * fog(p.d)
            ctx.strokeStyle = col; ctx.lineWidth = 1.8
            ctx.beginPath(); ctx.moveTo(prev.sx, prev.sy); ctx.lineTo(p.sx, p.sy); ctx.stroke()
          }
          prev = p
        }
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    function drawTooltip(o, hot) {
      const n = o.n, r = o.p.sx, c = o.p.sy
      const name = n.zh, dyn = n.dynasty, mot = n.motifs.join(' · ')
      ctx.font = '26px ' + FONT; const w1 = ctx.measureText(name).width
      ctx.font = '12.5px ' + FONT
      const w2 = Math.max(ctx.measureText(dyn).width, ctx.measureText(mot).width)
      const w = Math.max(w1, w2) + 44, h = n.lone ? 106 : 78
      let bx = r, by = c - o.r - 24
      bx = Math.max(w / 2 + 10, Math.min(VW - w / 2 - 10, bx))
      by = Math.max(h + 10, Math.min(VH - 10, by))

      ctx.globalAlpha = 0.94
      ctx.fillStyle = 'rgba(18,17,15,.94)'
      ctx.fillRect(bx - w / 2, by - h, w, h)
      ctx.globalAlpha = 1
      ctx.strokeStyle = hexA(n.lone ? CINNABAR : GOLD, 0.62); ctx.lineWidth = 1
      ctx.strokeRect(bx - w / 2, by - h, w, h)
      ctx.fillStyle = n.lone ? CINNABAR : GOLD
      ctx.fillRect(bx - w / 2, by - h, 3, h)

      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = GOLD; ctx.font = '26px ' + FONT
      ctx.fillText(name, bx, by - (n.lone ? 70 : 44))
      ctx.font = '12.5px ' + FONT; ctx.fillStyle = 'rgba(201,162,75,.62)'
      ctx.fillText(dyn, bx, by - (n.lone ? 48 : 26))
      ctx.fillStyle = n.lone ? '#D98678' : 'rgba(201,162,75,.85)'
      ctx.fillText(mot, bx, by - (n.lone ? 26 : 9))
      if (n.lone) {
        ctx.fillStyle = CINNABAR; ctx.font = '11px ' + FONT
        ctx.fillText('全 库 孤 例', bx, by - 6)
      }
    }

    function hotOf(i) {
      const s = st.current
      if (s.selRelic >= 0) return i === s.selRelic || nodes[i].motifs.some((m) => nodes[s.selRelic].motifs.includes(m))
      if (s.selEra >= 0) return nodes[i].era === s.selEra
      if (s.activeMotif) return motifMap[s.activeMotif].includes(i)
      return false
    }

    function draw(t) {
      updateCam()
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H)

      const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.72)
      vg.addColorStop(0, 'rgba(201,162,75,.05)')
      vg.addColorStop(0.6, 'rgba(70,80,71,.02)')
      vg.addColorStop(1, 'rgba(0,0,0,.72)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(view.x, view.y); ctx.scale(view.k, view.k)
      ctx.globalCompositeOperation = 'lighter'

      for (const s of bgStars) {
        const p = project(s.x, s.y, s.z)
        if (!p) continue
        ctx.globalAlpha = 0.16 + 0.14 * Math.sin(t * 0.0011 + s.tw)
        ctx.fillStyle = GOLD
        ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(0.6, p.s * p.w * 0.06), 0, TAU); ctx.fill()
      }

      // 河道光带
      {
        const N = 44, uA = camU + 0.055, uB = camU + 0.70, su = (uB - uA) / N
        const HW = RIVER_R * 1.05
        const Ls = [], Rs = []
        for (let k = 0; k <= N; k++) {
          const u = uA + su * k, w = scene.pathAt(u), w2 = scene.pathAt(u + 0.0015)
          let tx = w2.x - w.x, tz = w2.z - w.z
          const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl
          const rx = tz, rz = -tx
          Ls.push(project(w.x - rx * HW, w.y, w.z - rz * HW))
          Rs.push(project(w.x + rx * HW, w.y, w.z + rz * HW))
        }
        let fi = -1, la = -1
        for (let k = 0; k <= N; k++) if (Ls[k] && Rs[k]) { if (fi < 0) fi = k; la = k }
        if (fi >= 0 && la > fi) {
          const mid = (k) => ({ sx: (Ls[k].sx + Rs[k].sx) / 2, sy: (Ls[k].sy + Rs[k].sy) / 2 })
          const m0 = mid(fi), m1 = mid(la)
          const rg = ctx.createLinearGradient(m0.sx, m0.sy, m1.sx, m1.sy)
          rg.addColorStop(0, hexA(GOLD, 0.06))
          rg.addColorStop(0.14, hexA(GOLD, 0.20))
          rg.addColorStop(0.55, hexA(GOLD, 0.13))
          rg.addColorStop(1, hexA(GOLD, 0.02))
          ctx.fillStyle = rg; ctx.globalAlpha = 1
          for (let k = fi; k < la; k++) {
            const a1 = Ls[k], b1 = Rs[k], a2 = Ls[k + 1], b2 = Rs[k + 1]
            if (!a1 || !b1 || !a2 || !b2) continue
            ctx.beginPath()
            ctx.moveTo(a1.sx, a1.sy); ctx.lineTo(a2.sx, a2.sy)
            ctx.lineTo(b2.sx, b2.sy); ctx.lineTo(b1.sx, b1.sy); ctx.closePath(); ctx.fill()
          }
        }
      }

      // 河道光斑
      const uEnd = camU + 0.72, STEP = 0.0045
      ctx.globalAlpha = 1
      for (let u = camU + 0.019; u < uEnd; u += STEP) {
        const w = scene.pathAt(u)
        const p = project(w.x, w.y, w.z)
        if (!p || p.d < 300) continue
        const fg = fog(p.d) * Math.min(1, (p.d - 300) / 1100); if (fg < 0.012) continue
        const rr = Math.min(p.s * RIVER_R * 2.1, 260)
        ctx.globalAlpha = 0.09 * fg
        ctx.drawImage(GLOW_C.gold, p.sx - rr, p.sy - rr, rr * 2, rr * 2)
        const rc = Math.min(p.s * RIVER_R * 0.42, 60)
        ctx.globalAlpha = 0.26 * fg
        ctx.drawImage(GLOW_C.gold, p.sx - rc, p.sy - rc, rc * 2, rc * 2)
      }

      // 河道亮核
      let prev = null
      ctx.lineWidth = 1.7
      for (let u = camU + 0.012; u < uEnd; u += STEP) {
        const w = scene.pathAt(u)
        const p = project(w.x, w.y, w.z)
        if (!p || p.d < 220) { prev = null; continue }
        if (prev) {
          ctx.globalAlpha = 0.32 * fog(p.d) * Math.min(1, (p.d - 220) / 700)
          ctx.strokeStyle = GOLD
          ctx.beginPath(); ctx.moveTo(prev.sx, prev.sy); ctx.lineTo(p.sx, p.sy); ctx.stroke()
        }
        prev = p
      }

      // 星尘
      for (const d of dust) {
        let du = d.u - camU; if (du < 0) du += 1
        const depth = du * scene.ZLEN
        if (depth < NEAR || depth > FARV) continue
        const w = scene.pathAt(d.u)
        const p = project(w.x + Math.cos(d.a) * d.r, w.y + Math.sin(d.a) * d.r * 0.85, w.z)
        if (!p) continue
        const fg = fog(p.d) * nearF(p.d)
        const a = (d.hot ? 0.9 : 0.42) * fg
        if (a < 0.02) continue
        const rr = Math.max(0.5, p.s * d.w)
        if (d.hot && a > 0.35) {
          ctx.globalAlpha = a * 0.8
          const g2 = rr * 5
          ctx.drawImage(GLOW_C.gold, p.sx - g2, p.sy - g2, g2 * 2, g2 * 2)
        }
        ctx.globalAlpha = a
        ctx.fillStyle = d.hot ? '#F6E9C2' : GOLD
        ctx.beginPath(); ctx.arc(p.sx, p.sy, rr, 0, TAU); ctx.fill()
      }

      // 八朝之门
      for (const k in eraHit) delete eraHit[k]
      for (let i = 0; i < ERAS.length; i++) {
        const u = U[i], c = scene.pathAt(u)
        const cd = camZ(c.x, c.y, c.z)
        if (cd < NEAR) continue
        const fg = fog(cd); if (fg < 0.015) continue
        const isUnk = (ERAS[i] === '待考')
        const col = isUnk ? CINNABAR : GOLD
        for (const [RG, al, lw] of [[470, 0.5, 1.6], [300, 0.24, 1]]) {
          ctx.globalAlpha = al * fg; ctx.strokeStyle = col; ctx.lineWidth = lw
          ctx.beginPath()
          let started = false
          for (let k = 0; k <= 72; k++) {
            const a = k / 72 * TAU
            const p = project(c.x + Math.cos(a) * RG, c.y + Math.sin(a) * RG, c.z)
            if (!p) { started = false; continue }
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true } else ctx.lineTo(p.sx, p.sy)
          }
          ctx.stroke()
        }
        const p = project(c.x, c.y + 560, c.z)
        if (p) {
          const size = Math.max(17, Math.min(158, p.s * 92))
          const txt = ERAS[i].split('').join(' ')
          ctx.globalAlpha = 0.9 * fg
          ctx.fillStyle = col
          ctx.font = size + 'px ' + FONT
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(txt, p.sx, p.sy)
          eraHit[i] = { x: p.sx, y: p.sy, w: ctx.measureText(txt).width, h: size }
        }
      }

      // 共纹链接
      ctx.globalCompositeOperation = 'lighter'
      const s = st.current
      if (s.activeMotif) drawLink(motifMap[s.activeMotif].slice().sort((a, b) => nodes[a].u - nodes[b].u), GOLD, 90)
      else if (s.selRelic >= 0) {
        const kin = kinOf(s.selRelic)
          .sort((a, b) => Math.abs(nodes[a].u - nodes[s.selRelic].u) - Math.abs(nodes[b].u - nodes[s.selRelic].u))
          .slice(0, 6)
        for (const k of kin) drawLink([s.selRelic, k].sort((a, b) => nodes[a].u - nodes[b].u), CINNABAR, 150)
      }

      // 器物
      visible.length = 0
      for (const n of nodes) {
        const p = project(n.x, n.y, n.z)
        if (!p || p.d < NEAR || p.d > FARV) continue
        const a = fog(p.d) * nearF(p.d)
        if (a < 0.012) continue
        visible.push({ n, p, r: Math.max(1.5, p.s * n.rad), a })
      }
      visible.sort((x, y) => y.p.d - x.p.d)

      for (const o of visible) {
        const n = o.n, p = o.p, r = o.r
        const hot = hotOf(n.i)
        const lone = hot && n.lone
        const dim = (busy() && !hot) ? 0.3 : 1
        const a = o.a * dim

        const gg = r * 2.6
        ctx.globalAlpha = a * (hot ? 0.5 : 0.22)
        ctx.drawImage(GLOW_C[n.lone ? 'cin' : 'gold'], p.sx - gg, p.sy - gg, gg * 2, gg * 2)

        ctx.globalCompositeOperation = 'source-over'
        ctx.save()
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, TAU); ctx.clip()
        if (n.img && n.img.complete && n.img.naturalWidth) {
          const sc = Math.max(2 * r / n.img.naturalWidth, 2 * r / n.img.naturalHeight)
          const w = n.img.naturalWidth * sc, h = n.img.naturalHeight * sc
          ctx.globalAlpha = a
          ctx.drawImage(n.img, p.sx - w / 2, p.sy - h / 2, w, h)
        } else {
          ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#241f19'
          ctx.fillRect(p.sx - r, p.sy - r, 2 * r, 2 * r)
        }
        ctx.restore()
        ctx.globalCompositeOperation = 'lighter'

        ctx.globalAlpha = a * (hot ? 1 : 0.7)
        ctx.strokeStyle = n.lone ? CINNABAR : GOLD
        ctx.lineWidth = Math.max(0.7, (n.lone ? 2.6 : 1.4) * Math.min(1.6, p.s * 0.9))
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, TAU); ctx.stroke()
        if (hot && lone) {
          const q = (t * 0.00042) % 1
          ctx.globalAlpha = a * (1 - q) * 0.6
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r + q * r * 2.6, 0, TAU); ctx.stroke()
        }

        if (r > 30 && a > 0.28) {
          ctx.globalAlpha = Math.min(0.95, a * 1.1)
          ctx.fillStyle = GOLD
          ctx.font = Math.min(30, Math.max(11, r * 0.42)) + 'px ' + FONT
          ctx.textAlign = 'center'; ctx.textBaseline = 'top'
          ctx.fillText(n.zh, p.sx, p.sy + r + 6)
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      if (hover >= 0) {
        const o = visible.find((v) => v.n.i === hover)
        if (o) drawTooltip(o, hotOf(hover))
      }

      ctx.restore()
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1

      // 河道两端淡入淡出。选中器物/朝代时相机停住，若仍压遮罩则停在起点会整屏全黑
      const edge = Math.min(camU - uSpan.a, uSpan.b - camU) / 0.05
      const fadeTarget = busy() ? 0 : Math.max(0, 1 - Math.max(0, edge))
      fadeA += (fadeTarget - fadeA) * 0.12
      if (fadeA > 0.002) {
        ctx.fillStyle = 'rgba(23,21,19,' + fadeA + ')'
        ctx.fillRect(0, 0, W, H)
      }
    }

    /* --- 主循环 --- */
    let prevT = 0
    let raf = 0
    function loop(t) {
      const dt = Math.min(0.05, prevT ? (t - prevT) / 1000 : 0.016)
      prevT = t
      const s = st.current
      const target = !s.flying ? 0
        : (s.selRelic >= 0 || s.selEra >= 0) ? 0
          : s.activeMotif ? 0.34
            : (hover >= 0 ? 0.22 : 1)
      speedMul += (target - speedMul) * Math.min(1, dt * 3.2)
      camU += BASE_SPEED * speedMul * dt
      if (camU > uSpan.b) camU = uSpan.a
      updateCaption()
      updateRail()
      if (speedRef.current) speedRef.current.textContent = '流速 ' + Math.round(speedMul * 100) + '%'
      draw(t)
      raf = requestAnimationFrame(loop)
    }

    /* --- 预载纹样 --- */
    nodes.forEach((n) => {
      const im = new Image()
      im.onload = () => { n.img = im }
      im.src = XINGHE_IMG_BASE + n.webp
    })

    /* --- 事件绑定 --- */
    cv.addEventListener('pointermove', onPointerMove)
    cv.addEventListener('pointerup', onPointerUp)
    cv.addEventListener('pointerleave', onPointerLeave)
    cv.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', resize)

    /* --- 对外 API（供 React HUD 调用）--- */
    const pickMotif = (m) => {
      if (st.current.activeMotif === m) clearScene()
      else { clearScene(); setMotif(m); flyTo(nodes[motifMap[m][0]].u - 0.05) }
    }
    apiRef.current = {
      clearScene,
      closePanel: clearScene,
      pickMotif,
      toggleFly: () => {
        const f = !st.current.flying
        st.current.flying = f; setFlying(f)
      },
      reset: () => { camU = uSpan.a; clearScene(); updateRail() },
      jumpEra: (i) => { clearScene(); flyTo(U[i] - 0.12); openEra(i) },
      selectRelic: (k) => { flyTo(nodes[k].u - 0.10); openRelic(k) },
      selectMotif: pickMotif,
    }

    /* --- 深链接（?r= / ?e= / ?m= / ?u=）--- */
    const HS = initialSearch.current || ''
    const getp = (k) => {
      const m = new RegExp('[?&]' + k + '=([^&]+)').exec(HS)
      return m ? decodeURIComponent(m[1]) : null
    }
    const uv = getp('u')
    if (uv != null) {
      const em = /^era:(\d+)$/.exec(uv)
      if (em) camU = Math.max(uSpan.a, U[Math.min(+em[1], 7)] - 0.12)
      else if (/^[\d.]+$/.test(uv)) camU = Math.max(uSpan.a, Math.min(uSpan.b - 0.02, +uv))
    }
    const mv = getp('m')
    if (mv && motifMap[mv]) { setMotif(mv); camU = Math.max(uSpan.a, nodes[motifMap[mv][0]].u - 0.05) }
    const rv = getp('r')
    if (rv != null && nodes[+rv]) { camU = Math.max(uSpan.a, nodes[+rv].u - 0.10); openRelic(+rv) }
    else {
      const ev = getp('e')
      if (ev != null && byEra[+ev]) { camU = Math.max(uSpan.a, U[+ev] - 0.12); openEra(+ev) }
    }

    resize()
    updateRail()
    updateCaption()
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      cv.removeEventListener('pointermove', onPointerMove)
      cv.removeEventListener('pointerup', onPointerUp)
      cv.removeEventListener('pointerleave', onPointerLeave)
      cv.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', resize)
      apiRef.current = null
    }
  }, [scene, motifMap, nodes, byEra, eraMotifs, ERAS, U, uSpan, openRelic, openEra, setMotif, clearScene])

  /* URL 随选择同步（可刷新、可分享）。首次挂载跳过，避免覆盖刚读到的深链接。 */
  const firstSync = useRef(true)
  useEffect(() => {
    if (firstSync.current) { firstSync.current = false; return }
    const parts = []
    if (selRelic >= 0) parts.push('r=' + selRelic)
    else if (selEra >= 0) parts.push('e=' + selEra)
    else if (activeMotif) parts.push('m=' + encodeURIComponent(activeMotif))
    const want = '/ai-patterns?view=xinghe' + (parts.length ? '&' + parts.join('&') : '')
    const cur = '/ai-patterns' + (searchRef.current || '')
    if (want !== cur) navigate(want)
  }, [selRelic, selEra, activeMotif, navigate])

  const pctOf = (u) => (u - uSpan.a) / (uSpan.b - uSpan.a) * 100
  const panelOpen = selRelic >= 0 || selEra >= 0

  return (
    <div className="xr-root">
      <canvas ref={canvasRef} className="xr-cv" />

      <div className="xr-hud">
        <div className="xr-panel">
          <button className="xr-back" onClick={onBack}>‹ 返回列表</button>
          <div className="xr-h1">纹脉<b>·</b>沿河</div>
          <div className="xr-big">三十六器</div>
          <div className="xr-sub">顺流而下 · 商 → 待考</div>
          <div className="xr-chips">
            {MOTIFS.map((m) => (
              <button
                key={m}
                className={'xr-chip' + (isLone(m) ? ' lone' : '') + (activeMotif === m ? ' on' : '')}
                onClick={() => apiRef.current?.pickMotif(m)}
              >
                <span>{m}</span><i>{motifMap[m].length}</i>
              </button>
            ))}
          </div>
          <div className="xr-btns">
            <button className={'xr-btn' + (flying ? ' on' : '')} onClick={() => apiRef.current?.toggleFly()}>飞行</button>
            <button className="xr-btn" onClick={() => apiRef.current?.reset()}>回源</button>
          </div>
        </div>

        <div className={'xr-cap' + (caption.t ? ' show' : '')}>
          <div className="xr-cap-t">{caption.t}</div>
          <div className="xr-cap-s">{caption.s}</div>
        </div>

        <div className="xr-rail">
          <div className="xr-rail-line" />
          <div className="xr-rail-fill" ref={railFillRef} />
          <div className="xr-rail-dot" ref={railDotRef} />
          {ERAS.map((e, i) => (
            <div
              key={e}
              className={'xr-tk' + (e === '待考' ? ' unk' : '')}
              style={{ left: pctOf(U[i]) + '%' }}
              onClick={() => apiRef.current?.jumpEra(i)}
            >
              <div className="xr-tk-bar" />
              <div className="xr-tk-lb">{e}</div>
            </div>
          ))}
        </div>

        <div className={'xr-detail' + (panelOpen ? ' on' : '')}>
          {panelOpen && <button className="xr-close" aria-label="关闭" onClick={() => apiRef.current?.closePanel()}>×</button>}

          {selRelic >= 0 && (() => {
            const n = nodes[selRelic]
            const kin = kinOf(selRelic).sort((a, b) =>
              sharedWith(selRelic, b).length - sharedWith(selRelic, a).length ||
              Math.abs(nodes[a].u - n.u) - Math.abs(nodes[b].u - n.u))
            return (
              <>
                <div className="xr-ttl">{n.zh}</div>
                <div className="xr-dyn">{n.dynasty}</div>
                <div className="xr-mrow">
                  {n.motifs.map((m) => (
                    <button key={m} className={'xr-mc' + (isLone(m) ? ' lone' : '')}
                      onClick={() => apiRef.current?.selectMotif(m)}>{m}</button>
                  ))}
                </div>
                <div className="xr-sect"><i />同纹之器 · {kin.length}</div>
                <div className="xr-rows">
                  {kin.length ? kin.map((k) => (
                    <button key={k} className="xr-row" onClick={() => apiRef.current?.selectRelic(k)}>
                      <span className="xr-row-z">{nodes[k].zh}</span>
                      <span className="xr-row-d">{nodes[k].dynasty}　共 {sharedWith(selRelic, k).join(' ')}</span>
                    </button>
                  )) : <div className="xr-none">全库仅此一器 · 孤例</div>}
                </div>
              </>
            )
          })()}

          {selEra >= 0 && (() => {
            const list = (byEra[selEra] || []).slice().sort((a, b) => nodes[a].u - nodes[b].u)
            return (
              <>
                <div className="xr-ttl">{ERAS[selEra]}</div>
                <div className="xr-dyn">{list.length} 器</div>
                <div className="xr-mrow">
                  {(eraMotifs[selEra] || []).map((m) => (
                    <button key={m} className={'xr-mc' + (isLone(m) ? ' lone' : '')}
                      onClick={() => apiRef.current?.selectMotif(m)}>{m}</button>
                  ))}
                </div>
                <div className="xr-sect"><i />此朝之器 · {list.length}</div>
                <div className="xr-rows">
                  {list.map((k) => (
                    <button key={k} className="xr-row" onClick={() => apiRef.current?.selectRelic(k)}>
                      <span className="xr-row-z">{nodes[k].zh}</span>
                      <span className="xr-row-d">{nodes[k].dynasty}</span>
                    </button>
                  ))}
                </div>
              </>
            )
          })()}
        </div>

        <div className="xr-speed" ref={speedRef} />
        <div className="xr-hint">
          <div><kbd>悬停</kbd> 看器 · <kbd>点器物/朝名</kbd> 展开</div>
          <div><kbd>滚轮</kbd> 调视野 · <kbd>点刻度</kbd> 跳到该朝</div>
        </div>
      </div>
    </div>
  )
}
