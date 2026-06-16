import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { getPatternById, getPatternImage, getAllSeries } from '../store/patternData'
import { createOutlinedBlock, extractShapeData } from '../utils/blockOutline'
import {
  extractContour,
  findContourSnap,
  isFlexiblePattern,
  computeDeformationTowards,
  getSuggestedPositions,
} from '../engine/shapeInteraction'
import { TEMPLATES, getTemplateById } from '../data/templates'
import { SNAP_THRESHOLD, SNAP_STRENGTH } from '../constants'
import PreviewScaleModal from '../components/PreviewScaleModal'

const CANVAS_SIZE = 1024
const DISPLAY_SIZE = 380
const SCALE = DISPLAY_SIZE / CANVAS_SIZE
const MASK_DIM = 32

export default function PuzzlePage() {
  const canvasRef = useRef(null)
  const navigate = useNavigate()
  const { data, saveCreation } = useApp()
  const [placements, setPlacements] = useState([]) // { id, x, y, size, rotation, scale }
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [dragging, setDragging] = useState(null)
  const [dragFromTray, setDragFromTray] = useState(null)
  const [loadedImages, setLoadedImages] = useState({})
  const [outlinedBlocks, setOutlinedBlocks] = useState({})
  const [outlinedUrls, setOutlinedUrls] = useState({})
  const shapeCache = useRef({}) // patternId -> { mask: Uint8Array(64*64), boundingRadius }
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [showTray, setShowTray] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [completedImage, setCompletedImage] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportSize, setExportSize] = useState(2048)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [activeTemplateId, setActiveTemplateId] = useState(null)
  const [saved, setSaved] = useState(false)

  // Only patterns the user actually owns can be used in compositions.
  // Replaces the old ELEMENT_MANIFEST-based tray.
  const myPatterns = useMemo(
    () => data.library.map(id => getPatternById(id)).filter(Boolean),
    [data.library]
  )
  const seriesList = getAllSeries()

  const filteredElements = seriesFilter === 'all'
    ? myPatterns
    : myPatterns.filter(p => p.series === seriesFilter)

  // Preload images + pre-render outlined blocks for owned patterns only
  useEffect(() => {
    myPatterns.forEach(p => {
      if (loadedImages[p.id]) return
      const img = new Image()
      img.src = getPatternImage(p)
      img.onload = () => {
        // For 角花 patterns the source image is a full piece with motifs
        // in two diagonal corners connected by a thin ring. Slice off the
        // top-left quadrant so we get a single corner; the four suggested
        // positions rotate this slice to fill all four corners symmetrically.
        const pat = getPatternById(p.id)
        let processSrc = img
        if (pat?.type === '角花') {
          processSrc = sliceTopLeftQuadrant(img)
        }
        setLoadedImages(prev => ({ ...prev, [p.id]: processSrc }))
        const block = createOutlinedBlock(processSrc, { clearCorners: p.series !== 'qinghua', mode: 'line' })
        setOutlinedBlocks(prev => ({ ...prev, [p.id]: block }))
        // Compute shape mask + contour + flexibility flag for collision/snapping/deformation
        try {
          const shape = extractShapeData(processSrc, { clearCorners: p.series !== 'qinghua' })
          const contour = extractContour(shape, 16)
          const pat = getPatternById(p.id)
          const flexible = pat ? isFlexiblePattern(pat.type) : false
          shapeCache.current[p.id] = { ...shape, contour, flexible }
        } catch (e) {
          // Shape extraction can fail on degenerate images; fall back to no
          // collision data (block will be pass-through for collision tests)
        }
        // Also expose a dataURL so the tray thumbnail (an <img>) can show
        // the shape-stamped version, not the original square image.
        try {
          const url = block.toDataURL('image/png')
          setOutlinedUrls(prev => ({ ...prev, [p.id]: url }))
        } catch {}
      }
    })
  }, [myPatterns, loadedImages])

  // ── Drawing ──────────────────────────────────────────

  // Background prerendered once — paper color + noise texture + frame.
  // Redrawing 200 random fillRects every frame was a hot path during drag.
  const bgCanvasRef = useRef(null)
  const getBackground = useCallback(() => {
    if (bgCanvasRef.current) return bgCanvasRef.current
    const c = document.createElement('canvas')
    c.width = CANVAS_SIZE
    c.height = CANVAS_SIZE
    const cx = c.getContext('2d')
    // 宣纸色 base — slightly cooler than the previous warm cream, reads
    // as paper rather than as parchment. Two-stop radial adds a faint
    // vignette so the center reads as the "page" and the corners recede.
    const grad = cx.createRadialGradient(
      CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.1,
      CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.7,
    )
    grad.addColorStop(0, '#F2EBDB')
    grad.addColorStop(1, '#E8DFC8')
    cx.fillStyle = grad
    cx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    // Subtle paper grain — coarser than before to read as 宣纸 fiber
    cx.fillStyle = 'rgba(120,100,60,0.025)'
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * CANVAS_SIZE
      const y = Math.random() * CANVAS_SIZE
      const s = 1 + Math.random() * 2
      cx.fillRect(x, y, s, s)
    }
    cx.strokeStyle = 'rgba(160,140,100,0.28)'
    cx.lineWidth = 4
    cx.strokeRect(8, 8, CANVAS_SIZE - 16, CANVAS_SIZE - 16)
    bgCanvasRef.current = c
    return c
  }, [])

  // Shared scene renderer. Drawing happens in CANVAS_SIZE (1024) logical
  // space; the caller is responsible for any ctx.scale before calling.
  // Used by both on-screen redraw and high-DPI export.
  const renderScene = useCallback((ctx, { drawSelection = false, drawGhosts = false } = {}) => {
    // Prerendered background (paper + texture + frame)
    ctx.drawImage(getBackground(), 0, 0)

    // Draw each placed element
    placements.forEach((p, idx) => {
      // Empty template slot — dashed outline + label
      if (p.isEmpty) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation || 0) * Math.PI / 180)
        ctx.strokeStyle = 'rgba(212,175,106,0.45)'
        ctx.lineWidth = 2
        ctx.setLineDash([10, 6])
        const half = p.size / 2
        ctx.strokeRect(-half, -half, p.size, p.size)
        ctx.setLineDash([])
        // Inner tint so the slot reads as "intentional empty" not "broken"
        ctx.fillStyle = 'rgba(212,175,106,0.04)'
        ctx.fillRect(-half, -half, p.size, p.size)
        // Centered label
        ctx.fillStyle = 'rgba(212,175,106,0.65)'
        ctx.font = `${Math.max(14, Math.floor(p.size * 0.09))}px "Noto Serif SC", serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.slotLabel || '空位', 0, 0)
        if (drawSelection && idx === selectedIdx) {
          ctx.strokeStyle = 'rgba(201,168,76,0.9)'
          ctx.lineWidth = 2.5
          ctx.setLineDash([6, 4])
          ctx.strokeRect(-half - 4, -half - 4, p.size + 8, p.size + 8)
          ctx.setLineDash([])
        }
        ctx.restore()
        return
      }

      const block = outlinedBlocks[p.id] || loadedImages[p.id]
      if (!block) return

      const sX = (p.scale || 1) * p.size * (p.scaleX || 1)
      const sY = (p.scale || 1) * p.size * (p.scaleY || 1)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation || 0) * Math.PI / 180)

      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 3
      ctx.shadowOffsetY = 3

      ctx.drawImage(block, -sX / 2, -sY / 2, sX, sY)

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      if (drawSelection && idx === selectedIdx) {
        ctx.strokeStyle = 'rgba(201,168,76,0.8)'
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 4])
        ctx.strokeRect(-sX / 2 - 4, -sY / 2 - 4, sX + 8, sY + 8)
        ctx.setLineDash([])
      }

      ctx.restore()
    })

    // Ghost guides: show suggested positions for the dragged pattern's type.
    if (drawGhosts) {
      const dragPatId = dragging ? placements[dragging.idx]?.id : dragFromTray?.element?.id
      const dragPatForGhost = dragPatId ? getPatternById(dragPatId) : dragFromTray?.element
      const dragSize = dragging
        ? (placements[dragging.idx]?.size || 280)
        : (dragPatForGhost?.type === '角花' ? 140 : 280)
      const dragType = dragPatForGhost?.type
      const ghostBlock = dragPatId ? (outlinedBlocks[dragPatId] || loadedImages[dragPatId]) : null

      if (dragType && ghostBlock) {
        const positions = getSuggestedPositions(dragType, CANVAS_SIZE)
        for (const pos of positions) {
          ctx.save()
          ctx.globalAlpha = 0.16
          ctx.translate(pos.x, pos.y)
          ctx.rotate(pos.rotation * Math.PI / 180)
          ctx.drawImage(ghostBlock, -dragSize / 2, -dragSize / 2, dragSize, dragSize)
          ctx.restore()
        }
        ctx.globalAlpha = 1
      }
    }
  }, [placements, selectedIdx, loadedImages, outlinedBlocks, dragging, dragFromTray])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    renderScene(ctx, { drawSelection: true, drawGhosts: true })
  }, [renderScene])

  useEffect(() => { redraw() }, [redraw])

  // ── Canvas coordinates ───────────────────────────────

  function canvasCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / SCALE, y: (e.clientY - rect.top) / SCALE }
  }

  // ── Hit test (uses cached mask, no per-click getImageData) ────

  function hitTestPixel(pos, p) {
    // Prefer the cached shape mask — no canvas readback, no warning.
    const shape = shapeCache.current[p.id]
    if (shape?.mask) {
      const sX = (p.scale || 1) * p.size * (p.scaleX || 1)
      const sY = (p.scale || 1) * p.size * (p.scaleY || 1)
      const rad = -(p.rotation || 0) * Math.PI / 180
      const dx = pos.x - p.x
      const dy = pos.y - p.y
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
      const N = shape.size
      const mx = Math.floor((lx / sX + 0.5) * N)
      const my = Math.floor((ly / sY + 0.5) * N)
      if (mx < 0 || mx >= N || my < 0 || my >= N) return false
      return shape.mask[my * N + mx] === 1
    }
    // Fallback (no shape data yet) — bounding box check
    const sX = (p.scale || 1) * p.size * (p.scaleX || 1)
    const sY = (p.scale || 1) * p.size * (p.scaleY || 1)
    const dx = pos.x - p.x, dy = pos.y - p.y
    return Math.abs(dx) < sX / 2 && Math.abs(dy) < sY / 2
  }

  // ── Canvas pointer events ────────────────────────────

  const handleCanvasPointerDown = useCallback((e) => {
    const pos = canvasCoords(e)
    let hitIdx = -1
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i]
      // Quick bounding box check first (account for deformation)
      const sX = (p.scale || 1) * p.size * (p.scaleX || 1)
      const sY = (p.scale || 1) * p.size * (p.scaleY || 1)
      const dx = pos.x - p.x, dy = pos.y - p.y
      if (Math.abs(dx) > sX / 2 || Math.abs(dy) > sY / 2) continue
      // Pixel-accurate check
      if (hitTestPixel(pos, p)) {
        hitIdx = i
        break
      }
    }

    if (hitIdx >= 0) {
      setSelectedIdx(hitIdx)
      setDragging({
        idx: hitIdx,
        offsetX: pos.x - placements[hitIdx].x,
        offsetY: pos.y - placements[hitIdx].y,
      })
    } else {
      setSelectedIdx(-1)
    }
  }, [placements])

  // RAF throttle: collapse multiple pointermove events per frame into one
  // state update. Without this, high-frequency move events (120Hz on some
  // pointers) each trigger a full React re-render + canvas redraw.
  const rafIdRef = useRef(null)
  const pendingEvtRef = useRef(null)

  useEffect(() => () => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
  }, [])

  const handleCanvasPointerMove = useCallback((e) => {
    if (!dragging) return
    pendingEvtRef.current = e
    if (rafIdRef.current !== null) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      const evt = pendingEvtRef.current
      const drag = dragging
      if (!evt || !drag) return
      const pos = canvasCoords(evt)
      setPlacements(prev => {
        const next = [...prev]
        const target = { ...next[drag.idx], x: pos.x - drag.offsetX, y: pos.y - drag.offsetY }
        // A: hard collision constraint (block self if target overlaps anything)
        let resolved = resolveMove(target, next, drag.idx, shapeCache)

        const movingShape = shapeCache.current[resolved.id]

        // B: edge snapping — attract to nearby static contours
        if (movingShape?.contour && movingShape.contour.length > 0) {
          const statics = []
          const fixeds = []
          for (let i = 0; i < next.length; i++) {
            if (i === drag.idx) continue
            const s = shapeCache.current[next[i].id]
            if (!s?.contour) continue
            statics.push({ contour: s.contour, place: next[i], boundingRadius: s.boundingRadius, idx: i })
            if (!s.flexible) fixeds.push({ place: next[i], boundingRadius: s.boundingRadius })
          }

          const snap = findContourSnap(
            movingShape.contour,
            resolved,
            movingShape.boundingRadius,
            statics,
            SNAP_THRESHOLD,
            SNAP_STRENGTH,
            drag.idx,
          )

          if (snap) {
            const snapped = { ...resolved, x: resolved.x + snap.dx, y: resolved.y + snap.dy }
            // Verify the snap didn't push us into another block
            let collide = false
            for (let i = 0; i < next.length; i++) {
              if (i === drag.idx) continue
              const s = shapeCache.current[next[i].id]
              if (s && masksCollide(movingShape, snapped, s, next[i])) { collide = true; break }
            }
            if (!collide) resolved = snapped
          }

          // C: 柔性变形 — flexible block stretches toward nearest fixed
          if (movingShape.flexible && fixeds.length > 0) {
            const deform = computeDeformationTowards(resolved, movingShape.boundingRadius, fixeds)
            resolved = { ...resolved, scaleX: deform.scaleX, scaleY: deform.scaleY }
          } else {
            resolved = { ...resolved, scaleX: 1, scaleY: 1 }
          }
        }

        // D: 位置语义 snap — if pattern has suggested positions and the
        // current location is near one, snap rotation (only rotation —
        // user keeps control of x,y). Lets 角花 rotate to point inward
        // when you drag it near a corner, 云纹 align with an edge, etc.
        const dragPat = getPatternById(resolved.id)
        const suggestions = getSuggestedPositions(dragPat?.type, CANVAS_SIZE)
        if (suggestions.length > 0) {
          let nearest = suggestions[0]
          let nearestDistSq = Infinity
          for (const s of suggestions) {
            const dx = resolved.x - s.x
            const dy = resolved.y - s.y
            const d = dx * dx + dy * dy
            if (d < nearestDistSq) { nearestDistSq = d; nearest = s }
          }
          const snapRange = resolved.size * 1.4
          if (nearestDistSq < snapRange * snapRange) {
            resolved = { ...resolved, rotation: nearest.rotation }
          }
        }

        next[drag.idx] = resolved
        return next
      })
    })
  }, [dragging])

  const handleCanvasPointerUp = useCallback(() => {
    // Only handle canvas drag end. Tray drags use dragFromTray + window
    // pointerup (onUp) — if we ran here during a tray drag we'd wipe the
    // _temp block before onUp could fan it out into 4 corners.
    if (!dragging) return
    setPlacements(prev => prev.map(p => {
      const { _temp, ...clean } = p
      return clean
    }))
    setDragging(null)
  }, [dragging])

  // ── Tray drag to canvas ──────────────────────────────

  const handleTrayPointerDown = useCallback((e, element) => {
    e.preventDefault()
    setDragFromTray({ element })
  }, [])

  useEffect(() => {
    if (!dragFromTray) return
    const onMove = (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      // Note: do NOT gate on "cursor inside canvas" — the user may release
      // outside the canvas after dragging in from the tray, and we still
      // need a _temp block to exist so onUp can fan out 角花 into 4
      // corners. Positions outside the canvas simply clamp visually.
      const pos = {
        x: (e.clientX - rect.left) / SCALE,
        y: (e.clientY - rect.top) / SCALE,
      }
      const el = dragFromTray.element
      // 角花 source is sliced to a single quadrant, so its placement
      // size is half the default — keeps the four-corner group's total
      // footprint visually proportional to other patterns.
      const baseSize = el.type === '角花' ? 140 : 280
      setPlacements(prev => {
        const withoutTemp = prev.filter(p => !p._temp)
        const target = { id: el.id, x: pos.x, y: pos.y, size: baseSize, rotation: 0, scaleX: 1, scaleY: 1 }
        // Run the same collision+slide logic as canvas drag so the
        // incoming block respects existing placements instead of dropping
        // on top of them. draggingIdx points at the slot we're filling.
        const resolved = resolveMove(target, [...withoutTemp, target], withoutTemp.length, shapeCache)
        return [...withoutTemp, { ...resolved, _temp: true }]
      })
    }
    const onUp = () => {
      // Drop only if the temp block's final position doesn't collide with
      // any existing placement. Otherwise discard it (returns to tray).
      // Special case: 角花 drops as a symmetric 4-corner group — each
      // corner checks collision independently so partially-blocked layouts
      // still produce a sensible result.
      setPlacements(prev => {
        const tempBlock = prev.find(p => p._temp)
        if (!tempBlock) return prev
        const others = prev.filter(p => !p._temp)
        const tempShape = shapeCache.current[tempBlock.id]
        const tempPat = getPatternById(tempBlock.id)
        const isCorner = tempPat?.type === '角花' || tempPat?.series === 'corner'

        // 角花 → fan out into 4 symmetric corners
        if (isCorner) {
          const suggestions = getSuggestedPositions('角花', CANVAS_SIZE)
          const newOnes = []
          for (const s of suggestions) {
            const placement = {
              id: tempBlock.id,
              x: s.x,
              y: s.y,
              size: tempBlock.size,
              rotation: s.rotation,
              scaleX: 1,
              scaleY: 1,
            }
            if (tempShape) {
              let collide = false
              for (const o of others) {
                const oShape = shapeCache.current[o.id]
                if (oShape && masksCollide(tempShape, placement, oShape, o)) {
                  collide = true; break
                }
              }
              if (collide) continue
            }
            newOnes.push(placement)
          }
          return [...others, ...newOnes]
        }

        // Default: single placement
        if (tempShape) {
          for (const o of others) {
            const oShape = shapeCache.current[o.id]
            if (oShape && masksCollide(tempShape, tempBlock, oShape, o)) {
              return others // collision at drop site — reject placement
            }
          }
        }
        return prev.map(p => {
          const { _temp, ...rest } = p
          return rest
        })
      })
      setDragFromTray(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragFromTray])

  // ── Actions ──────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (selectedIdx < 0) return
    setPlacements(prev => prev.filter((_, i) => i !== selectedIdx))
    setSelectedIdx(-1)
  }, [selectedIdx])

  const rotateSelected = useCallback((deg) => {
    if (selectedIdx < 0) return
    setPlacements(prev => {
      const next = [...prev]
      next[selectedIdx] = { ...next[selectedIdx], rotation: (next[selectedIdx].rotation + deg) % 360 }
      return next
    })
  }, [selectedIdx])

  const scaleSelected = useCallback((delta) => {
    if (selectedIdx < 0) return
    setPlacements(prev => {
      const next = [...prev]
      next[selectedIdx] = { ...next[selectedIdx], size: Math.max(30, next[selectedIdx].size + delta) }
      return next
    })
  }, [selectedIdx])

  // Recommended export size based on placement count. More elements
  // → more visual complexity → higher resolution pays off.
  const recommendedExportSize = useMemo(() => {
    if (placements.length >= 6) return 3072
    if (placements.length >= 3) return 2048
    return 1024
  }, [placements.length])

  const exportPNG = useCallback((size) => {
    // Render to an offscreen canvas at the requested size, scaling the
    // logical 1024 scene up. Background bitmap gets stretched (slightly
    // soft texture) which is fine for print.
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = size
    exportCanvas.height = size
    const ctx = exportCanvas.getContext('2d')
    const scaleFactor = size / CANVAS_SIZE
    ctx.scale(scaleFactor, scaleFactor)
    renderScene(ctx, { drawSelection: false, drawGhosts: false })

    const link = document.createElement('a')
    link.download = `wenmai-create-${size}x${size}-${Date.now()}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
    setShowExportModal(false)
  }, [renderScene])

  const finishCreation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (placements.length === 0) return
    setCompletedImage(canvas.toDataURL('image/png'))
    setShowPreview(true)
  }, [placements.length])

  const saveToLibrary = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || placements.length === 0) return
    saveCreation(canvas.toDataURL('image/jpeg', 0.7), 'puzzle')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [placements.length, saveCreation])

  const clearCanvas = useCallback(() => {
    setPlacements([])
    setSelectedIdx(-1)
    setActiveTemplateId(null)
  }, [])

  // Apply a composition template: clear placements, materialize template
  // slots as placements, auto-fill from the user's library by type, mark
  // unmatched slots as empty placeholders.
  const applyTemplate = useCallback((template) => {
    // Group library patterns by type so multiple slots of the same type
    // pull distinct elements when available (e.g. 4 corner slots get 4
    // different 角花 if the user owns that many).
    const patternsByType = new Map()
    for (const p of myPatterns) {
      if (!patternsByType.has(p.type)) patternsByType.set(p.type, [])
      patternsByType.get(p.type).push(p)
    }
    const cursorByType = new Map()

    const newPlacements = template.slots.map(slot => {
      const x = slot.x * CANVAS_SIZE
      const y = slot.y * CANVAS_SIZE
      const list = patternsByType.get(slot.typeConstraint) || []
      const cursor = cursorByType.get(slot.typeConstraint) || 0
      const pattern = list[cursor] || list[0]
      cursorByType.set(slot.typeConstraint, cursor + 1)

      if (pattern) {
        return {
          id: pattern.id,
          x, y,
          size: slot.size,
          rotation: slot.rotation,
          scaleX: 1, scaleY: 1,
          slotId: slot.id,
        }
      }
      // Empty placeholder slot — rendered as a dashed outline + label
      return {
        id: '__empty__',
        x, y,
        size: slot.size,
        rotation: slot.rotation,
        scaleX: 1, scaleY: 1,
        slotId: slot.id,
        isEmpty: true,
        slotLabel: slot.label || slot.typeConstraint,
      }
    })
    setPlacements(newPlacements)
    setSelectedIdx(-1)
    setActiveTemplateId(template.id)
    setShowTemplateModal(false)
  }, [myPatterns])

  // ── Render ──────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(212,175,106,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontFamily: 'Noto Serif SC, serif', fontSize: 20, fontWeight: 600,
              color: '#F2D58A', letterSpacing: '0.15em',
            }}>
              纹样创作
            </span>
            <span style={{
              fontSize: 9, color: '#8A6A30', letterSpacing: '0.3em',
              textTransform: 'uppercase', fontWeight: 500,
            }}>
              Compose
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowTemplateModal(true)}
              style={{
                ...ghostBtnStyle,
                color: activeTemplateId ? '#F2D58A' : '#A09682',
                borderColor: activeTemplateId ? 'rgba(212,175,106,0.3)' : 'rgba(255,255,255,0.05)',
                background: activeTemplateId ? 'rgba(212,175,106,0.1)' : 'rgba(255,255,255,0.02)',
              }}
            >模板{activeTemplateId ? ` · ${getTemplateById(activeTemplateId)?.name}` : ''}</button>
            <button onClick={clearCanvas} style={ghostBtnStyle}>清空</button>
            <button onClick={saveToLibrary} disabled={placements.length === 0 || saved} style={{
              ...ghostBtnStyle,
              background: saved ? 'rgba(100,180,100,0.12)' : placements.length === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(212,175,106,0.1)',
              color: saved ? '#8BC387' : placements.length === 0 ? '#4A4A4A' : '#F2D58A',
              border: saved ? '1px solid rgba(100,180,100,0.25)' : placements.length === 0 ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(212,175,106,0.25)',
              opacity: placements.length === 0 ? 0.6 : 1,
            }}>{saved ? '已保存' : '保存'}</button>
            <button
              onClick={() => {
                setExportSize(recommendedExportSize)
                setShowExportModal(true)
              }}
              style={ghostBtnStyle}
            >导出</button>
            <button
              onClick={finishCreation}
              disabled={placements.length === 0}
              style={{
                padding: '6px 18px', borderRadius: 9, fontSize: 12,
                fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.1em', fontWeight: 500,
                background: placements.length === 0
                  ? 'rgba(255,255,255,0.03)'
                  : 'linear-gradient(145deg, #C9943A, #8B6914)',
                color: placements.length === 0 ? '#4A4A4A' : '#F5F1E8',
                border: placements.length === 0
                  ? '1px solid rgba(255,255,255,0.05)'
                  : '1px solid rgba(201,148,58,0.45)',
                opacity: placements.length === 0 ? 0.7 : 1,
                cursor: placements.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: placements.length === 0 ? 'none' : '0 2px 12px rgba(201,148,58,0.18)',
                transition: 'all 0.2s',
              }}
            >完成创作</button>
          </div>
        </div>

        {/* Secondary nav */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => navigate('/jigsaw')}
            style={navBtnStyle}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5h6v2c0 1 1 2 2 2s2-1 2-2V5h4v6h-2c-1 0-2 1-2 2s1 2 2 2h2v6h-6v-2c0-1-1-2-2-2s-2 1-2 2v2H5v-6h2c1 0 2-1 2-2s-1-2-2-2H5V5z" />
            </svg>
            经典拼图
          </button>
          <button
            onClick={() => navigate('/curate')}
            style={navBtnStyle}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            筛选元素
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 16px' }}>
        <div style={{
          width: '100%', maxWidth: DISPLAY_SIZE, aspectRatio: '1',
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(160,140,100,0.25)',
          boxShadow: '0 0 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(212,175,106,0.05)',
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          />
        </div>
      </div>

      {/* Controls for selected — SVG icons */}
      {selectedIdx >= 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8,
          padding: '6px 16px 10px',
        }}>
          <button onClick={() => rotateSelected(-15)} style={iconBtnStyle} title="逆时针旋转">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
          <button onClick={() => rotateSelected(15)} style={iconBtnStyle} title="顺时针旋转">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
          </button>
          <div style={{ width: 1, background: 'rgba(212,175,106,0.1)', margin: '4px 2px' }} />
          <button onClick={() => scaleSelected(-15)} style={iconBtnStyle} title="缩小">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button onClick={() => scaleSelected(15)} style={iconBtnStyle} title="放大">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <div style={{ width: 1, background: 'rgba(212,175,106,0.1)', margin: '4px 2px' }} />
          <button onClick={deleteSelected} style={{ ...iconBtnStyle, color: '#E85D5D', borderColor: 'rgba(232,93,93,0.2)' }} title="删除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
            </svg>
          </button>
        </div>
      )}

      {/* Tray header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px 4px',
      }}>
        <span style={{ fontSize: 12, color: '#6A6A6A' }}>
          纹样碎片 ({filteredElements.length})
        </span>
        <button
          onClick={() => setShowTray(prev => !prev)}
          style={{ background: 'none', border: 'none', color: '#9A9A9A', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', padding: '2px 8px' }}
        >
          {showTray ? '收起 ▼' : '展开 ▲'}
        </button>
      </div>

      {/* Series filter */}
      {showTray && (
        <div style={{ display: 'flex', gap: 6, padding: '4px 16px 6px', overflowX: 'auto' }}>
          <button onClick={() => setSeriesFilter('all')} style={pillStyle(seriesFilter === 'all')}>全部</button>
          {seriesList.map(s => (
            <button key={s.id} onClick={() => setSeriesFilter(s.id)} style={pillStyle(seriesFilter === s.id, s.color)}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Element tray */}
      {showTray && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: 6, padding: '0 16px 8px', maxHeight: '35vh', overflowY: 'auto',
        }}>
          {filteredElements.map(p => (
            <div
              key={p.id}
              onPointerDown={(e) => handleTrayPointerDown(e, p)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 8, padding: 4, cursor: 'grab',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                touchAction: 'none',
              }}
            >
              <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {outlinedUrls[p.id] ? (
                  <img
                    src={outlinedUrls[p.id]}
                    alt={p.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    draggable={false}
                  />
                ) : (
                  <span style={{ fontSize: 9, color: '#4A4A4A' }}>...</span>
                )}
              </div>
              <span style={{
                fontSize: 8, color: '#6A6A6A', textAlign: 'center',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
                {p.name}
              </span>
            </div>
          ))}
          {filteredElements.length === 0 && (
            <div style={{
              gridColumn: '1 / -1', padding: '32px 12px', textAlign: 'center',
              color: '#5A4A30', fontSize: 12,
              fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.1em',
            }}>
              {myPatterns.length === 0
                ? '尚未收集纹样，去抽卡吧'
                : '该系列下暂无纹样'}
            </div>
          )}
        </div>
      )}

      {showPreview && completedImage && (
        <PreviewScaleModal
          imageUrl={completedImage}
          placements={placements}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showExportModal && (
        <ExportSizeModal
          currentSize={exportSize}
          recommendedSize={recommendedExportSize}
          placementCount={placements.length}
          onSelect={setExportSize}
          onCancel={() => setShowExportModal(false)}
          onConfirm={() => exportPNG(exportSize)}
        />
      )}

      {showTemplateModal && (
        <TemplatePickerModal
          activeId={activeTemplateId}
          library={myPatterns}
          onSelect={applyTemplate}
          onCancel={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  )
}

// ── Export size options ─────────────────────────────────
const EXPORT_SIZES = [
  { size: 1024, label: '标准', useCase: '屏幕分享 · 朋友圈/微信 · ~500KB' },
  { size: 2048, label: '高清', useCase: '小卡片/贴纸/手机壁纸 · ~2MB' },
  { size: 3072, label: '印刷', useCase: '明信片/马克杯/海报 · ~5MB · 300 DPI' },
]

function ExportSizeModal({ currentSize, recommendedSize, placementCount, onSelect, onCancel, onConfirm }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: 'linear-gradient(160deg, #1F1D17, #14120D)',
          border: '1px solid rgba(212,175,106,0.25)',
          borderRadius: 16, padding: 20,
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          fontFamily: 'Noto Serif SC, serif',
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <span style={{
            fontSize: 16, fontWeight: 600, color: '#F2D58A', letterSpacing: '0.12em',
          }}>选择导出规格</span>
          <span style={{
            marginLeft: 8, fontSize: 9, color: '#8A6A30',
            letterSpacing: '0.3em', textTransform: 'uppercase',
          }}>Export</span>
        </div>
        <div style={{ fontSize: 11, color: '#7A7060', marginBottom: 14, fontFamily: 'inherit' }}>
          当前作品 {placementCount} 个元素 · 推荐「{EXPORT_SIZES.find(s => s.size === recommendedSize)?.label}」
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXPORT_SIZES.map(opt => {
            const selected = currentSize === opt.size
            const recommended = recommendedSize === opt.size
            return (
              <div
                key={opt.size}
                onClick={() => onSelect(opt.size)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: selected
                    ? 'rgba(212,175,106,0.12)'
                    : 'rgba(255,255,255,0.02)',
                  border: selected
                    ? '1px solid rgba(212,175,106,0.4)'
                    : '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{
                    fontSize: 13, color: selected ? '#F2D58A' : '#C7B58A',
                    fontFamily: 'inherit', letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {opt.label}
                    <span style={{ fontSize: 10, color: '#7A7060', fontFamily: 'inherit' }}>
                      {opt.size}×{opt.size}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 10, color: '#7A7060', marginTop: 2,
                    fontFamily: 'inherit',
                  }}>
                    {opt.useCase}
                  </div>
                </div>
                {recommended && (
                  <span style={{
                    fontSize: 9, color: '#1A1A1A',
                    background: 'linear-gradient(145deg, #F2D58A, #C9943A)',
                    padding: '2px 8px', borderRadius: 8,
                    fontFamily: 'inherit', letterSpacing: '0.1em', fontWeight: 600,
                  }}>推荐</span>
                )}
              </div>
            )
          })}
        </div>

        <div style={{
          display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end',
        }}>
          <button onClick={onCancel} style={{
            ...ghostBtnStyle,
          }}>取消</button>
          <button onClick={onConfirm} style={{
            padding: '7px 18px', borderRadius: 9, fontSize: 12,
            fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.1em', fontWeight: 500,
            background: 'linear-gradient(145deg, #C9943A, #8B6914)',
            color: '#F5F1E8',
            border: '1px solid rgba(201,148,58,0.45)',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(201,148,58,0.18)',
          }}>导出 {currentSize}×{currentSize}</button>
        </div>
      </div>
    </div>
  )
}

function TemplatePickerModal({ activeId, library, onSelect, onCancel }) {
  // For each template, count how many slots the user's library can fill
  const coverage = (template) => {
    const have = new Map()
    for (const p of library) {
      have.set(p.type, (have.get(p.type) || 0) + 1)
    }
    const need = new Map()
    for (const s of template.slots) {
      need.set(s.typeConstraint, (need.get(s.typeConstraint) || 0) + 1)
    }
    let filled = 0
    let total = 0
    for (const [t, n] of need) {
      total += n
      filled += Math.min(n, have.get(t) || 0)
    }
    return { filled, total }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto',
          background: 'linear-gradient(160deg, #1F1D17, #14120D)',
          border: '1px solid rgba(212,175,106,0.25)',
          borderRadius: 16, padding: 20,
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          fontFamily: 'Noto Serif SC, serif',
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <span style={{
            fontSize: 16, fontWeight: 600, color: '#F2D58A', letterSpacing: '0.12em',
          }}>选择构图模板</span>
          <span style={{
            marginLeft: 8, fontSize: 9, color: '#8A6A30',
            letterSpacing: '0.3em', textTransform: 'uppercase',
          }}>Template</span>
        </div>
        <div style={{ fontSize: 11, color: '#7A7060', marginBottom: 14, fontFamily: 'inherit' }}>
          应用模板后自动从你的图鉴填充元素 · 缺失的位置显示为虚线空位
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TEMPLATES.map(tpl => {
            const c = coverage(tpl)
            const full = c.filled === c.total
            const isActive = activeId === tpl.id
            return (
              <div
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: isActive
                    ? 'rgba(212,175,106,0.15)'
                    : 'rgba(255,255,255,0.02)',
                  border: isActive
                    ? '1px solid rgba(212,175,106,0.45)'
                    : '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 4,
                }}>
                  <span style={{
                    fontSize: 14, color: isActive ? '#F2D58A' : '#E0D4B0',
                    fontFamily: 'inherit', letterSpacing: '0.08em', fontWeight: 500,
                  }}>{tpl.name}</span>
                  <span style={{
                    fontSize: 10,
                    color: full ? '#8BC387' : '#C9943A',
                    fontFamily: 'inherit',
                    background: full ? 'rgba(100,180,100,0.1)' : 'rgba(201,148,58,0.1)',
                    padding: '2px 7px', borderRadius: 8,
                  }}>{c.filled}/{c.total} 可填</span>
                </div>
                <div style={{
                  fontSize: 11, color: '#7A7060', fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}>{tpl.description}</div>
              </div>
            )
          })}
        </div>

        <div style={{
          display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end',
        }}>
          <button onClick={onCancel} style={ghostBtnStyle}>取消</button>
        </div>
      </div>
    </div>
  )
}

function pillStyle(active, accent) {
  const c = accent || '#F2D58A'
  return {
    padding: '5px 14px', borderRadius: 14, fontSize: 12, whiteSpace: 'nowrap',
    background: active ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.02)',
    color: active ? c : '#7A7060',
    border: active
      ? `1px solid ${c === '#F2D58A' ? 'rgba(212,175,106,0.3)' : c + '40'}`
      : '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
    fontFamily: 'Noto Serif SC, serif',
    letterSpacing: '0.05em',
    fontWeight: active ? 500 : 400,
    transition: 'all 0.2s',
  }
}

const btnStyle = {
  padding: '5px 14px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.04)',
  color: '#D4AF6A', border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer', fontFamily: 'inherit',
}

// ── Shape-level collision helpers ─────────────────────
// Mask is 64x64, mask[i] = 1 if pattern occupies that cell.
// Placement in world space: x,y = center, size = side length, rotation in deg.

// 角花 source images contain motifs in two diagonal corners connected by
// a thin ring. Slice off the top-left quadrant so each "corner" pattern
// is just one L-shaped piece; the four suggested positions then rotate
// this piece to fill all four canvas corners symmetrically.
// Returns a 1/2 × 1/2 canvas (not original size) so the resulting mask
// and outline tightly bound the single corner — no dead space.
function sliceTopLeftQuadrant(img) {
  const w = img.width, h = img.height
  const cw = Math.floor(w / 2), ch = Math.floor(h / 2)
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const cx = c.getContext('2d')
  cx.drawImage(img, 0, 0, cw, ch, 0, 0, cw, ch)
  return c
}

function placementMaskRadius(shape, place) {
  if (!shape) return place.size * 0.5 // fallback: full square bbox
  const scaleMax = Math.max(place.scaleX || 1, place.scaleY || 1)
  return shape.boundingRadius * place.size * 0.5 * scaleMax
}

function masksCollide(shapeA, placeA, shapeB, placeB) {
  if (!shapeA || !shapeB) return false // skip if either has no shape data
  // Bounding circle pre-filter
  const rA = placementMaskRadius(shapeA, placeA)
  const rB = placementMaskRadius(shapeB, placeB)
  const cdx = placeA.x - placeB.x
  const cdy = placeA.y - placeB.y
  if (cdx * cdx + cdy * cdy > (rA + rB) * (rA + rB)) return false

  // Iterate over maskA's occupied cells, transform to world, then to maskB local.
  const radA = (placeA.rotation || 0) * Math.PI / 180
  const radB = (-(placeB.rotation || 0)) * Math.PI / 180
  const cosA = Math.cos(radA), sinA = Math.sin(radA)
  const cosB = Math.cos(radB), sinB = Math.sin(radB)
  const sizeAX = placeA.size * (placeA.scaleX || 1)
  const sizeAY = placeA.size * (placeA.scaleY || 1)
  const sizeBX = placeB.size * (placeB.scaleX || 1)
  const sizeBY = placeB.size * (placeB.scaleY || 1)
  const maskA = shapeA.mask
  const maskB = shapeB.mask

  for (let ay = 0; ay < MASK_DIM; ay++) {
    for (let ax = 0; ax < MASK_DIM; ax++) {
      if (!maskA[ay * MASK_DIM + ax]) continue
      // maskA cell → local offset (centered, scaled)
      const lx = (ax / MASK_DIM - 0.5) * sizeAX
      const ly = (ay / MASK_DIM - 0.5) * sizeAY
      // → world
      const wx = placeA.x + lx * cosA - ly * sinA
      const wy = placeA.y + lx * sinA + ly * cosA
      // → maskB local
      const dx = wx - placeB.x
      const dy = wy - placeB.y
      const blx = dx * cosB - dy * sinB
      const bly = dx * sinB + dy * cosB
      const bx = (blx / sizeBX + 0.5) * MASK_DIM
      const by = (bly / sizeBY + 0.5) * MASK_DIM
      const bxi = bx | 0, byi = by | 0
      if (bxi >= 0 && bxi < MASK_DIM && byi >= 0 && byi < MASK_DIM) {
        if (maskB[byi * MASK_DIM + bxi]) return true
      }
    }
  }
  return false
}

// Test if `moved` placement can occupy its position without overlapping
// any other placement (excluding draggingIdx). Tries full move first;
// if blocked, tries X-only slide so the block can glide horizontally
// along another block's edge instead of getting stuck.
function resolveMove(moved, placements, draggingIdx, shapeCacheRef) {
  const shapeOf = (p) => shapeCacheRef.current[p.id]
  const collidesAt = (test) => {
    for (let i = 0; i < placements.length; i++) {
      if (i === draggingIdx) continue
      if (masksCollide(shapeOf(test), test, shapeOf(placements[i]), placements[i])) return true
    }
    return false
  }
  if (!collidesAt(moved)) return moved
  const xOnly = { ...moved, x: moved.x, y: placements[draggingIdx].y }
  if (!collidesAt(xOnly)) return xOnly
  return placements[draggingIdx] // cannot move
}

const ghostBtnStyle = {
  padding: '6px 14px', borderRadius: 9, fontSize: 12,
  background: 'rgba(255,255,255,0.02)',
  color: '#A09682',
  border: '1px solid rgba(255,255,255,0.05)',
  cursor: 'pointer',
  fontFamily: 'Noto Serif SC, serif',
  letterSpacing: '0.08em',
  transition: 'all 0.2s',
}

const navBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '4px 10px', borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  color: '#7A7060',
  border: '1px solid rgba(255,255,255,0.04)',
  fontSize: 10, cursor: 'pointer',
  fontFamily: 'inherit', letterSpacing: '0.05em',
  transition: 'all 0.2s',
}

const iconBtnStyle = {
  width: 34, height: 34, borderRadius: 9,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(145deg, #1F1D17, #14120D)',
  color: '#F2D58A',
  border: '1px solid rgba(212,175,106,0.2)',
  cursor: 'pointer',
  transition: 'all 0.2s',
}
