import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { getPatternById, getPatternImage, getAllSeries } from '../store/patternData'
import { createOutlinedBlock } from '../utils/blockOutline'
import PreviewScaleModal from '../components/PreviewScaleModal'

const CANVAS_SIZE = 1024
const DISPLAY_SIZE = 380
const SCALE = DISPLAY_SIZE / CANVAS_SIZE

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
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [showTray, setShowTray] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [completedImage, setCompletedImage] = useState(null)
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
        setLoadedImages(prev => ({ ...prev, [p.id]: img }))
        const block = createOutlinedBlock(img, { clearCorners: p.series !== 'qinghua' })
        setOutlinedBlocks(prev => ({ ...prev, [p.id]: block }))
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
      const block = outlinedBlocks[p.id] || loadedImages[p.id]
      if (!block) return

      const s = (p.scale || 1) * p.size
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation || 0) * Math.PI / 180)

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 3
      ctx.shadowOffsetY = 3

      ctx.drawImage(block, -s / 2, -s / 2, s, s)

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // Selection highlight
      if (idx === selectedIdx) {
        ctx.strokeStyle = 'rgba(201,168,76,0.8)'
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 4])
        ctx.strokeRect(-s / 2 - 4, -s / 2 - 4, s + 8, s + 8)
        ctx.setLineDash([])
      }

      ctx.restore()
    })
  }, [placements, selectedIdx, loadedImages, outlinedBlocks])

  useEffect(() => { redraw() }, [redraw])

  // ── Canvas coordinates ───────────────────────────────

  function canvasCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / SCALE, y: (e.clientY - rect.top) / SCALE }
  }

  // ── Pixel-accurate hit test ────────────────────────────

  function hitTestPixel(pos, p) {
    const img = loadedImages[p.id]
    if (!img) return false
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const s = (p.scale || 1) * p.size
    const rad = (p.rotation || 0) * Math.PI / 180
    // Transform click pos into image-local coords
    const dx = pos.x - p.x
    const dy = pos.y - p.y
    const lx = (dx * Math.cos(-rad) - dy * Math.sin(-rad)) / s * img.width + img.width / 2
    const ly = (dx * Math.sin(-rad) + dy * Math.cos(-rad)) / s * img.height + img.height / 2

    if (lx < 0 || ly < 0 || lx >= img.width || ly >= img.height) return false
    const pixel = ctx.getImageData(Math.floor(lx), Math.floor(ly), 1, 1).data
    return pixel[3] > 30 // alpha threshold
  }

  // ── Canvas pointer events ────────────────────────────

  const handleCanvasPointerDown = useCallback((e) => {
    const pos = canvasCoords(e)
    let hitIdx = -1
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i]
      // Quick bounding box check first
      const s = (p.scale || 1) * p.size
      const dx = pos.x - p.x, dy = pos.y - p.y
      if (Math.abs(dx) > s / 2 || Math.abs(dy) > s / 2) continue
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

  const handleCanvasPointerMove = useCallback((e) => {
    if (!dragging) return
    const pos = canvasCoords(e)
    setPlacements(prev => {
      const next = [...prev]
      const moved = { ...next[dragging.idx], x: pos.x - dragging.offsetX, y: pos.y - dragging.offsetY }

      // Reset other pieces to original positions
      for (let i = 0; i < next.length; i++) {
        if (i !== dragging.idx && next[i]._nudged) {
          const { _nudged, _origX, _origY, ...clean } = next[i]
          next[i] = { ...clean, x: _origX, y: _origY }
        }
      }

      // Soft collision: gently push nearby pieces apart
      for (let i = 0; i < next.length; i++) {
        if (i === dragging.idx) continue
        const other = next[i]
        const dx = moved.x - other.x
        const dy = moved.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = (moved.size + other.size) * 0.45

        if (dist < minDist && dist > 1) {
          const overlap = (minDist - dist) / minDist // 0~1
          const pushStrength = overlap * 12
          const nx = dx / dist, ny = dy / dist

          // Push other piece gently away
          const origX = other._origX ?? other.x
          const origY = other._origY ?? other.y
          next[i] = {
            ...other,
            _nudged: true,
            _origX: origX,
            _origY: origY,
            x: origX - nx * pushStrength,
            y: origY - ny * pushStrength,
          }
        }
      }

      next[dragging.idx] = moved
      return next
    })
  }, [dragging])

  const handleCanvasPointerUp = useCallback(() => {
    // Keep nudged positions, clean up internal flags
    setPlacements(prev => prev.map(p => {
      const { _temp, _nudged, _origX, _origY, ...clean } = p
      return clean
    }))
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
          return [...withoutTemp, { id: el.id, x: pos.x, y: pos.y, size: 280, rotation: 0, _temp: true }]
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
  }, [])

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
            <button onClick={clearCanvas} style={ghostBtnStyle}>清空</button>
            <button onClick={saveToLibrary} disabled={placements.length === 0 || saved} style={{
              ...ghostBtnStyle,
              background: saved ? 'rgba(100,180,100,0.12)' : placements.length === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(212,175,106,0.1)',
              color: saved ? '#8BC387' : placements.length === 0 ? '#4A4A4A' : '#F2D58A',
              border: saved ? '1px solid rgba(100,180,100,0.25)' : placements.length === 0 ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(212,175,106,0.25)',
              opacity: placements.length === 0 ? 0.6 : 1,
            }}>{saved ? '已保存' : '保存'}</button>
            <button onClick={exportPNG} style={ghostBtnStyle}>导出</button>
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
