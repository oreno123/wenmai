import { useState, useRef, useCallback, useEffect } from 'react'
import { PUZZLE_BLOCKS, getBlockById } from '../engine/puzzleBlocks'
import { transformContourPoints, findContourSnap, computeDeformation, hitTest } from '../engine/puzzleSnap'

const CANVAS_SIZE = 1024
const DISPLAY_SIZE = 380
const SCALE = DISPLAY_SIZE / CANVAS_SIZE

export default function PuzzlePage() {
  const canvasRef = useRef(null)
  const [placements, setPlacements] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [dragging, setDragging] = useState(null)
  const [dragFromPanel, setDragFromPanel] = useState(null)
  const [images, setImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [snapPreview, setSnapPreview] = useState(null)

  // Preload all block images
  useEffect(() => {
    let loaded = 0
    const imgs = {}
    PUZZLE_BLOCKS.forEach(block => {
      const img = new Image()
      img.onload = () => {
        imgs[block.id] = img
        loaded++
        if (loaded === PUZZLE_BLOCKS.length) {
          setImages(imgs)
          setLoading(false)
        }
      }
      img.onerror = () => {
        loaded++
        if (loaded === PUZZLE_BLOCKS.length) {
          setImages(imgs)
          setLoading(false)
        }
      }
      img.src = block.image
    })
  }, [])

  // ── Draw ──────────────────────────────────────────

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || loading) return
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = '#0A0A0B'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)'
    ctx.lineWidth = 1
    for (let i = 0; i < CANVAS_SIZE; i += 64) {
      ctx.beginPath()
      ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i)
      ctx.stroke()
    }

    // Draw each placed block
    placements.forEach((p, idx) => {
      const block = getBlockById(p.blockId)
      if (!block || !images[block.id]) return

      const img = images[block.id]
      const isSelected = idx === selectedIdx

      drawBlock(ctx, block, p, img, isSelected)
    })

    // Snap preview line
    if (snapPreview) {
      ctx.strokeStyle = `rgba(242,213,138,${0.3 + 0.2 * Math.sin(Date.now() / 200)})`
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      const mp = transformContourPoints(getBlockById(placements[snapPreview.movingIdx]?.blockId), placements[snapPreview.movingIdx])
      const sp = transformContourPoints(getBlockById(placements[snapPreview.targetIdx]?.blockId), placements[snapPreview.targetIdx])
      if (mp.length && sp.length) {
        ctx.beginPath()
        ctx.moveTo(mp[0].x, mp[0].y)
        ctx.lineTo(sp[0].x, sp[0].y)
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

  }, [placements, selectedIdx, images, loading, snapPreview])

  useEffect(() => { redraw() }, [redraw])

  // Animate snap preview glow
  useEffect(() => {
    if (!snapPreview) return
    let raf
    const animate = () => {
      redraw()
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [snapPreview, redraw])

  // ── Draw helper ──────────────────────────────────

  function drawBlock(ctx, block, placement, img, isSelected) {
    const { x, y, scale = 1, rotation = 0, scaleX = 1, scaleY = 1 } = placement
    const sz = block.imageSize * scale

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation * Math.PI / 180)
    ctx.scale(scaleX, scaleY)

    // Shadow
    ctx.shadowColor = isSelected ? 'rgba(201,168,76,0.4)' : 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = isSelected ? 20 : 10
    ctx.shadowOffsetX = 4
    ctx.shadowOffsetY = 4
    ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz)

    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Contour outline (always for selected, faint for snapped)
    if (isSelected || placement.snapped) {
      const pts = block.contourKeyPoints
      ctx.beginPath()
      ctx.moveTo((pts[0].x - 0.5) * sz, (pts[0].y - 0.5) * sz)
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo((pts[i].x - 0.5) * sz, (pts[i].y - 0.5) * sz)
      }
      ctx.closePath()
      ctx.strokeStyle = isSelected ? 'rgba(242,213,138,0.6)' : 'rgba(242,213,138,0.2)'
      ctx.lineWidth = isSelected ? 2.5 : 1.5
      ctx.stroke()
    }

    ctx.restore()
  }

  // ── Coordinates ──────────────────────────────────

  function canvasCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / SCALE,
      y: (e.clientY - rect.top) / SCALE,
    }
  }

  // ── Panel drag ──────────────────────────────────

  const handlePanelPointerDown = useCallback((e, block) => {
    e.preventDefault()
    setDragFromPanel({ block })
  }, [])

  // ── Canvas events ──────────────────────────────────

  const handleCanvasPointerDown = useCallback((e) => {
    const pos = canvasCoords(e)

    // Hit test (reverse order for top-first)
    let hitIdx = -1
    for (let i = placements.length - 1; i >= 0; i--) {
      const block = getBlockById(placements[i].blockId)
      if (block && hitTest(block, placements[i], pos.x, pos.y)) {
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

  const handleCanvasPointerMove = useCallback((e) => {
    if (!dragging) return
    const pos = canvasCoords(e)
    const newX = pos.x - dragging.offsetX
    const newY = pos.y - dragging.offsetY

    setPlacements(prev => {
      const next = [...prev]
      const p = { ...next[dragging.idx], x: newX, y: newY, snapped: false }
      const block = getBlockById(p.blockId)

      // Build static placements (excluding current)
      const statics = next.filter((_, i) => i !== dragging.idx).map(pp => ({
        block: getBlockById(pp.blockId),
        placement: pp,
      }))

      // Edge snap
      const snap = findContourSnap(block, p, statics, -1)
      if (snap) {
        p.x += snap.offset.dx
        p.y += snap.offset.dy
        p.snapped = true
        setSnapPreview({ movingIdx: dragging.idx, targetIdx: snap.targetIdx })

        // If flexible block near fixed block, compute deformation
        if (block.type === 'flexible') {
          const target = statics[snap.targetIdx]
          if (target && target.block.type === 'fixed') {
            const deform = computeDeformation(block, p, target.block, target.placement)
            p.scaleX = deform.scaleX
            p.scaleY = deform.scaleY
          }
        }
      } else {
        setSnapPreview(null)
        p.scaleX = 1
        p.scaleY = 1
      }

      next[dragging.idx] = p
      return next
    })
  }, [dragging])

  const handleCanvasPointerUp = useCallback(() => {
    setDragging(null)
    setSnapPreview(null)
    // Don't setDragFromPanel(null) here — the window pointerup handler
    // in the panel-drag effect handles that, and calling it here would
    // remove the listener before it can clear the _temp flag.
  }, [])

  // Global drag from panel to canvas
  useEffect(() => {
    if (!dragFromPanel) return
    const onMove = (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const isOver = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom

      if (isOver) {
        const pos = {
          x: (e.clientX - rect.left) / SCALE,
          y: (e.clientY - rect.top) / SCALE,
        }
        const block = dragFromPanel.block

        setPlacements(prev => {
          const withoutTemp = prev.filter(p => !p._temp)
          return [...withoutTemp, {
            blockId: block.id,
            x: pos.x, y: pos.y,
            scale: 0.8,
            rotation: 0,
            scaleX: 1, scaleY: 1,
            snapped: false,
            _temp: true,
          }]
        })
      }
    }
    const onUp = () => {
      setPlacements(prev => prev.map(p => {
        const { _temp, ...rest } = p
        return rest
      }))
      setDragFromPanel(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, true) // capture phase to fire first
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp, true)
    }
  }, [dragFromPanel])

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
      next[selectedIdx] = { ...next[selectedIdx], scale: Math.max(0.3, next[selectedIdx].scale + delta) }
      return next
    })
  }, [selectedIdx])

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `wenmai-puzzle-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const clearCanvas = useCallback(() => {
    setPlacements([])
    setSelectedIdx(-1)
    setSnapPreview(null)
  }, [])

  // ── Render ──────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#6A6A6A' }}>
        <span style={{ fontSize: 14 }}>Loading blocks...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
      {/* Title */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>纹样拼图</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportPNG} style={btnStyle}>导出</button>
          <button onClick={clearCanvas} style={btnStyle}>清空</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{
          width: DISPLAY_SIZE, height: DISPLAY_SIZE,
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, display: 'block', touchAction: 'none' }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          />
        </div>
      </div>

      {/* Controls */}
      {selectedIdx >= 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '10px 16px' }}>
          <button onClick={() => rotateSelected(-15)} style={btnStyle}>↺</button>
          <button onClick={() => rotateSelected(15)} style={btnStyle}>↻</button>
          <button onClick={() => scaleSelected(-0.1)} style={btnStyle}>−</button>
          <button onClick={() => scaleSelected(0.1)} style={btnStyle}>+</button>
          <button onClick={deleteSelected} style={{ ...btnStyle, color: '#E85D5D' }}>删</button>
        </div>
      )}

      {/* Block type labels */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 16px' }}>
        <span style={{ fontSize: 11, color: '#C9A84C', opacity: 0.6 }}>● 主题块（固定）</span>
        <span style={{ fontSize: 11, color: '#8B6914', opacity: 0.6 }}>● 装饰块（可变形）</span>
      </div>

      {/* Block palette */}
      <div style={{
        display: 'flex', gap: 12, padding: '8px 16px',
        overflowX: 'auto',
      }}>
        {PUZZLE_BLOCKS.map(block => {
          const img = images[block.id]
          return (
            <div
              key={block.id}
              onPointerDown={(e) => handlePanelPointerDown(e, block)}
              style={{
                minWidth: 80, height: 100,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${block.type === 'fixed' ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.15)'}`,
                borderRadius: 10, padding: 8, cursor: 'grab',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                touchAction: 'none',
              }}
            >
              {img && (
                <img
                  src={block.image}
                  style={{ width: 56, height: 56, objectFit: 'contain', pointerEvents: 'none' }}
                  alt={block.name}
                />
              )}
              <span style={{ fontSize: 10, color: '#9A9A9A', textAlign: 'center', lineHeight: 1.2 }}>
                {block.name}
              </span>
              <span style={{
                fontSize: 8,
                color: block.type === 'fixed' ? '#C9A84C' : '#8B6914',
                opacity: 0.6,
              }}>
                {block.type === 'fixed' ? '固定' : '可变'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const btnStyle = {
  padding: '5px 14px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.04)',
  color: '#D4AF6A', border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer', fontFamily: 'inherit',
}
