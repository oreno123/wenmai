import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from '../components/common/Router'
import ELEMENT_MANIFEST from '../../public/elements/manifest.json'
import APPROVED_IDS from '../../public/elements/approved.json'

const STORAGE_KEY = 'wenmai_approved_elements'

function getApprovedSet() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) try { return new Set(JSON.parse(saved)) } catch {}
  return new Set(APPROVED_IDS.length > 0 ? APPROVED_IDS : ELEMENT_MANIFEST.elements.map(e => e.id))
}

const CANVAS_SIZE = 1024
const DISPLAY_SIZE = 380
const SCALE = DISPLAY_SIZE / CANVAS_SIZE

const SOURCE_NAMES = {
  tuanlong: '团龙', yunlei: '云雷', huiwen: '回纹',
  lianhua: '莲花', juanco2: '卷草',
}

export default function PuzzlePage() {
  const canvasRef = useRef(null)
  const navigate = useNavigate()
  const [placements, setPlacements] = useState([]) // { id, x, y, size, rotation }
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [dragging, setDragging] = useState(null)
  const [dragFromTray, setDragFromTray] = useState(null)
  const [loadedImages, setLoadedImages] = useState({})
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showTray, setShowTray] = useState(true)

  const approvedSet = getApprovedSet()
  const allApproved = ELEMENT_MANIFEST.elements.filter(e => approvedSet.has(e.id))
  const filteredElements = sourceFilter === 'all'
    ? allApproved
    : allApproved.filter(e => e.source === sourceFilter)

  // Preload images
  useEffect(() => {
    ELEMENT_MANIFEST.elements.forEach(el => {
      if (loadedImages[el.id]) return
      const img = new Image()
      img.src = `/elements/${el.file}`
      img.onload = () => setLoadedImages(prev => ({ ...prev, [el.id]: img }))
    })
  }, [])

  // ── Drawing ──────────────────────────────────────────

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Background — warm paper-like
    ctx.fillStyle = '#F5F0E6'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Subtle paper texture
    ctx.fillStyle = 'rgba(0,0,0,0.015)'
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * CANVAS_SIZE
      const y = Math.random() * CANVAS_SIZE
      ctx.fillRect(x, y, 2, 2)
    }

    // Border frame
    ctx.strokeStyle = 'rgba(160,140,100,0.3)'
    ctx.lineWidth = 4
    ctx.strokeRect(8, 8, CANVAS_SIZE - 16, CANVAS_SIZE - 16)

    // Draw each placed element
    placements.forEach((p, idx) => {
      const img = loadedImages[p.id]
      if (!img) return

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation || 0) * Math.PI / 180)

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 3
      ctx.shadowOffsetY = 3

      ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size)

      // Selection highlight
      if (idx === selectedIdx) {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(201,168,76,0.8)'
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 4])
        ctx.strokeRect(-p.size / 2 - 4, -p.size / 2 - 4, p.size + 8, p.size + 8)
        ctx.setLineDash([])
      }

      ctx.restore()
    })
  }, [placements, selectedIdx, loadedImages])

  useEffect(() => { redraw() }, [redraw])

  // ── Canvas coordinates ───────────────────────────────

  function canvasCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / SCALE, y: (e.clientY - rect.top) / SCALE }
  }

  // ── Canvas pointer events ────────────────────────────

  const handleCanvasPointerDown = useCallback((e) => {
    const pos = canvasCoords(e)
    let hitIdx = -1
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i]
      const dx = pos.x - p.x, dy = pos.y - p.y
      if (Math.sqrt(dx * dx + dy * dy) < p.size * 0.45) {
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
    setPlacements(prev => {
      const next = [...prev]
      next[dragging.idx] = { ...next[dragging.idx], x: pos.x - dragging.offsetX, y: pos.y - dragging.offsetY }
      return next
    })
  }, [dragging])

  const handleCanvasPointerUp = useCallback(() => {
    setDragging(null)
  }, [])

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
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const pos = {
          x: (e.clientX - rect.left) / SCALE,
          y: (e.clientY - rect.top) / SCALE,
        }
        const el = dragFromTray.element
        setPlacements(prev => {
          const withoutTemp = prev.filter(p => !p._temp)
          return [...withoutTemp, { id: el.id, x: pos.x, y: pos.y, size: 120, rotation: 0, _temp: true }]
        })
      }
    }
    const onUp = () => {
      setPlacements(prev => prev.map(p => { const { _temp, ...rest } = p; return rest }))
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

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `wenmai-create-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const clearCanvas = useCallback(() => {
    setPlacements([])
    setSelectedIdx(-1)
  }, [])

  // ── Render ──────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>纹样创作</span>
          <button
            onClick={() => navigate('/jigsaw')}
            style={{ fontSize: 10, color: '#6A6A6A', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            经典拼图
          </button>
          <button
            onClick={() => navigate('/curate')}
            style={{ fontSize: 10, color: '#6A6A6A', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            筛选元素
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={clearCanvas} style={btnStyle}>清空</button>
          <button onClick={exportPNG} style={{ ...btnStyle, background: 'linear-gradient(145deg, #BC6B2F, #8A4A20)', color: '#F5F1E8' }}>导出</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{
          width: DISPLAY_SIZE, height: DISPLAY_SIZE,
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(160,140,100,0.2)',
          boxShadow: '0 0 30px rgba(0,0,0,0.3)',
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

      {/* Controls for selected */}
      {selectedIdx >= 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 16px' }}>
          <button onClick={() => rotateSelected(-15)} style={btnStyle}>↺</button>
          <button onClick={() => rotateSelected(15)} style={btnStyle}>↻</button>
          <button onClick={() => scaleSelected(-15)} style={btnStyle}>−</button>
          <button onClick={() => scaleSelected(15)} style={btnStyle}>+</button>
          <button onClick={deleteSelected} style={{ ...btnStyle, color: '#E85D5D' }}>删</button>
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

      {/* Source filter */}
      {showTray && (
        <div style={{ display: 'flex', gap: 6, padding: '4px 16px 6px', overflowX: 'auto' }}>
          <button onClick={() => setSourceFilter('all')} style={pillStyle(sourceFilter === 'all')}>全部</button>
          {ELEMENT_MANIFEST.sources.map(s => (
            <button key={s} onClick={() => setSourceFilter(s)} style={pillStyle(sourceFilter === s)}>
              {SOURCE_NAMES[s] || s}
            </button>
          ))}
        </div>
      )}

      {/* Element tray */}
      {showTray && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
          gap: 6, padding: '0 16px 8px', maxHeight: '35vh', overflowY: 'auto',
        }}>
          {filteredElements.map(el => (
            <div
              key={el.id}
              onPointerDown={(e) => handleTrayPointerDown(e, el)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 8, padding: 4, cursor: 'grab',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                touchAction: 'none',
              }}
            >
              <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loadedImages[el.id] ? (
                  <img
                    src={`/elements/${el.file}`}
                    alt={el.id}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span style={{ fontSize: 9, color: '#4A4A4A' }}>...</span>
                )}
              </div>
              <span style={{ fontSize: 8, color: '#6A6A6A', textAlign: 'center' }}>
                {SOURCE_NAMES[el.source] || el.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function pillStyle(active) {
  return {
    padding: '4px 12px', borderRadius: 12, fontSize: 11, whiteSpace: 'nowrap',
    background: active ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#F2D58A' : '#6A6A6A',
    border: active ? '1px solid rgba(212,175,106,0.2)' : '1px solid transparent',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

const btnStyle = {
  padding: '5px 14px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.04)',
  color: '#D4AF6A', border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer', fontFamily: 'inherit',
}
