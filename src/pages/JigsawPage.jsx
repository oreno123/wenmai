import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from '../components/common/Router'
import {
  generatePuzzle, drawPiece, findSnap, hitTestPiece, generateThumbnail,
} from '../engine/jigsawEngine'
import { PATTERN_LIBRARY, getPatternImage } from '../store/patternData'

const CANVAS_SIZE = 1024
const DISPLAY_SIZE = 380
const SCALE = DISPLAY_SIZE / CANVAS_SIZE

const GRID_OPTIONS = [
  { rows: 3, cols: 3, label: '3×3' },
  { rows: 4, cols: 4, label: '4×4' },
  { rows: 3, cols: 4, label: '3×4' },
]

export default function JigsawPage() {
  const canvasRef = useRef(null)
  const navigate = useNavigate()
  const offscreenRef = useRef(null) // scaled source image
  const [phase, setPhase] = useState('setup') // setup | playing | complete
  const [gridIdx, setGridIdx] = useState(0)
  const [selectedPattern, setSelectedPattern] = useState(null)
  const [sourceImg, setSourceImg] = useState(null)
  const [puzzle, setPuzzle] = useState(null)
  const [placements, setPlacements] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragFromTray, setDragFromTray] = useState(null)
  const [thumbnails, setThumbnails] = useState({})
  const [placedOnCanvas, setPlacedOnCanvas] = useState(new Set())
  const [showTray, setShowTray] = useState(true)

  const gridSize = GRID_OPTIONS[gridIdx]

  // ── Load source image & create 1024x1024 version ────────

  const startPuzzle = useCallback(() => {
    if (!selectedPattern) return
    const imgSrc = getPatternImage(selectedPattern)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Scale to 1024x1024
      const c = document.createElement('canvas')
      c.width = CANVAS_SIZE
      c.height = CANVAS_SIZE
      const ctx = c.getContext('2d')

      // Center-crop fill
      const scale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height)
      const sw = CANVAS_SIZE / scale
      const sh = CANVAS_SIZE / scale
      const sx = (img.width - sw) / 2
      const sy = (img.height - sh) / 2
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

      offscreenRef.current = c

      // Create HTMLImageElement from offscreen canvas
      const scaledImg = new Image()
      scaledImg.onload = () => {
        setSourceImg(scaledImg)
        initPuzzle(scaledImg)
      }
      scaledImg.src = c.toDataURL()
    }
    img.src = imgSrc
  }, [selectedPattern, gridSize])

  function initPuzzle(img) {
    const p = generatePuzzle(CANVAS_SIZE, CANVAS_SIZE, gridSize.rows, gridSize.cols, Date.now())
    setPuzzle(p)

    // Scatter pieces
    const init = {}
    for (const piece of p.pieces) {
      init[piece.id] = {
        x: 60 + Math.random() * (CANVAS_SIZE - piece.cellW - 120),
        y: 60 + Math.random() * (CANVAS_SIZE - piece.cellH - 120),
        snapped: false,
      }
    }
    setPlacements(init)
    setPlacedOnCanvas(new Set(p.pieces.map(pc => pc.id)))
    setSelectedId(null)
    setPhase('playing')

    // Thumbnails
    const thumbs = {}
    for (const piece of p.pieces) {
      thumbs[piece.id] = generateThumbnail(piece, img)
    }
    setThumbnails(thumbs)
  }

  // ── Drawing ──────────────────────────────────────────

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !puzzle || !sourceImg) return
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#0A0A0B'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Subtle target outline
    if (puzzle) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.setLineDash([8, 8])
      ctx.strokeRect(0, 0, puzzle.imgW, puzzle.imgH)
      ctx.setLineDash([])
    }

    // Draw each placed piece
    for (const piece of puzzle.pieces) {
      const pl = placements[piece.id]
      if (!pl) continue
      if (!placedOnCanvas.has(piece.id)) continue

      drawPiece(
        ctx, piece, sourceImg,
        pl.x, pl.y, 1,
        piece.id === selectedId,
        pl.snapped,
      )
    }
  }, [puzzle, sourceImg, placements, selectedId, placedOnCanvas])

  useEffect(() => { redraw() }, [redraw])

  // ── Check completion ─────────────────────────────────

  useEffect(() => {
    if (!puzzle) return
    const allSnapped = puzzle.pieces.every(p => placements[p.id]?.snapped)
    if (allSnapped && phase === 'playing') setPhase('complete')
  }, [placements, puzzle, phase])

  // ── Canvas coordinates ───────────────────────────────

  function canvasCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / SCALE, y: (e.clientY - rect.top) / SCALE }
  }

  // ── Canvas pointer events ────────────────────────────

  const handleCanvasPointerDown = useCallback((e) => {
    const pos = canvasCoords(e)
    // Hit test (reverse order)
    let hitId = null
    for (let i = puzzle.pieces.length - 1; i >= 0; i--) {
      const piece = puzzle.pieces[i]
      if (!placedOnCanvas.has(piece.id)) continue
      const pl = placements[piece.id]
      if (hitTestPiece(piece, pl.x, pl.y, pos.x, pos.y)) {
        hitId = piece.id
        break
      }
    }

    if (hitId) {
      setSelectedId(hitId)
      const pl = placements[hitId]
      setDragging({
        id: hitId,
        offsetX: pos.x - pl.x,
        offsetY: pos.y - pl.y,
        moved: false,
      })
    } else {
      setSelectedId(null)
    }
  }, [puzzle, placements, placedOnCanvas])

  const handleCanvasPointerMove = useCallback((e) => {
    if (!dragging) return
    const pos = canvasCoords(e)

    setPlacements(prev => {
      const next = { ...prev }
      next[dragging.id] = {
        ...next[dragging.id],
        x: pos.x - dragging.offsetX,
        y: pos.y - dragging.offsetY,
        snapped: false,
      }
      return next
    })
  }, [dragging])

  const handleCanvasPointerUp = useCallback(() => {
    if (dragging && puzzle) {
      const piece = puzzle.pieces.find(p => p.id === dragging.id)
      const pl = placements[piece.id]

      if (piece && pl) {
        const snap = findSnap(piece, pl.x, pl.y, placements, puzzle.pieces, 50)
        if (snap) {
          setPlacements(prev => ({
            ...prev,
            [piece.id]: { ...prev[piece.id], x: snap.snapX, y: snap.snapY, snapped: true },
          }))
        }
      }
    }
    setDragging(null)
  }, [dragging, puzzle, placements])

  // ── Tray drag to canvas ──────────────────────────────

  const handleTrayPointerDown = useCallback((e, piece) => {
    e.preventDefault()
    setDragFromTray({ piece })
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
        const piece = dragFromTray.piece
        if (!placedOnCanvas.has(piece.id)) {
          setPlacedOnCanvas(prev => new Set([...prev, piece.id]))
          setPlacements(prev => ({
            ...prev,
            [piece.id]: {
              x: pos.x - piece.cellW / 2,
              y: pos.y - piece.cellH / 2,
              snapped: false,
            },
          }))
        }
      }
    }
    const onUp = () => setDragFromTray(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragFromTray, placedOnCanvas])

  // ── Actions ──────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setPlacedOnCanvas(prev => { const n = new Set(prev); n.delete(selectedId); return n })
    setSelectedId(null)
  }, [selectedId])

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `wenmai-puzzle-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const resetPuzzle = useCallback(() => {
    setPhase('setup')
    setPuzzle(null)
    setPlacements({})
    setSelectedId(null)
    setPlacedOnCanvas(new Set())
    setThumbnails({})
  }, [])

  const shufflePieces = useCallback(() => {
    if (!puzzle) return
    setPlacements(prev => {
      const next = { ...prev }
      for (const piece of puzzle.pieces) {
        next[piece.id] = {
          ...next[piece.id],
          x: 60 + Math.random() * (CANVAS_SIZE - piece.cellW - 120),
          y: 60 + Math.random() * (CANVAS_SIZE - piece.cellH - 120),
          snapped: false,
        }
      }
      return next
    })
  }, [puzzle])

  // ── Render: Setup Phase ──────────────────────────────

  if (phase === 'setup') {
    const patterns = PATTERN_LIBRARY.filter(p => p.image)

    return (
      <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
        <div style={{ padding: '12px 16px' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>纹样拼图</span>
        </div>

        {/* Grid size */}
        <div style={{ padding: '8px 16px' }}>
          <div style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>难度</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {GRID_OPTIONS.map((g, i) => (
              <button
                key={i}
                onClick={() => setGridIdx(i)}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontFamily: 'inherit',
                  background: gridIdx === i ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.04)',
                  color: gridIdx === i ? '#F2D58A' : '#6A6A6A',
                  border: gridIdx === i ? '1px solid rgba(212,175,106,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                }}
              >
                {g.label}
                <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.5 }}>{g.rows * g.cols}块</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pattern selection */}
        <div style={{ padding: '8px 16px' }}>
          <div style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>选择纹样</div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            maxHeight: '50vh', overflowY: 'auto',
          }}>
            {patterns.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPattern(p)}
                style={{
                  background: selectedPattern?.id === p.id ? 'rgba(212,175,106,0.12)' : 'rgba(255,255,255,0.02)',
                  border: selectedPattern?.id === p.id ? '1px solid rgba(212,175,106,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 10, padding: 8, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <img
                  src={getPatternImage(p)}
                  alt={p.name}
                  style={{ width: 64, height: 64, objectFit: 'contain' }}
                />
                <span style={{ fontSize: 10, color: '#9A9A9A', textAlign: 'center' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <button
            onClick={startPuzzle}
            disabled={!selectedPattern}
            style={{
              padding: '12px 40px', borderRadius: 12, fontSize: 15, fontFamily: 'inherit',
              background: selectedPattern ? 'linear-gradient(145deg, #BC6B2F, #8A4A20)' : 'rgba(255,255,255,0.04)',
              color: selectedPattern ? '#F5F1E8' : '#4A4A4A',
              border: 'none', cursor: selectedPattern ? 'pointer' : 'default',
            }}
          >
            开始拼图
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Playing / Complete ───────────────────────

  const unplacedPieces = puzzle
    ? puzzle.pieces.filter(p => !placedOnCanvas.has(p.id))
    : []
  const placedCount = puzzle ? placedOnCanvas.size : 0
  const totalCount = puzzle ? puzzle.pieces.length : 0
  const snappedCount = puzzle
    ? puzzle.pieces.filter(p => placements[p.id]?.snapped).length
    : 0

  return (
    <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>
            {phase === 'complete' ? '拼图完成!' : '纹样拼图'}
          </span>
          <button
            onClick={() => navigate('/puzzle')}
            style={{ fontSize: 10, color: '#6A6A6A', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            返回创作
          </button>
          <span style={{ fontSize: 11, color: '#6A6A6A', marginLeft: 8 }}>
            {snappedCount}/{totalCount}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={shufflePieces} style={btnStyle}>打乱</button>
          <button onClick={resetPuzzle} style={btnStyle}>重选</button>
          <button onClick={exportPNG} style={btnStyle}>导出</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${(snappedCount / totalCount) * 100}%`,
            background: phase === 'complete'
              ? 'linear-gradient(90deg, #4CAF50, #81C784)'
              : 'linear-gradient(90deg, #8B6914, #F2D58A)',
            borderRadius: 2, transition: 'width 0.3s ease',
          }} />
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

      {/* Selected piece controls */}
      {selectedId && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 16px' }}>
          <button onClick={deleteSelected} style={{ ...btnStyle, color: '#E85D5D' }}>移回托盘</button>
        </div>
      )}

      {/* Tray toggle */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 16px',
      }}>
        <span style={{ fontSize: 12, color: '#6A6A6A' }}>
          碎片托盘 {unplacedPieces.length > 0 && `(${unplacedPieces.length})`}
        </span>
        <button
          onClick={() => setShowTray(prev => !prev)}
          style={{
            background: 'none', border: 'none', color: '#9A9A9A', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', padding: '4px 8px',
          }}
        >
          {showTray ? '收起 ▼' : '展开 ▲'}
        </button>
      </div>

      {/* Piece tray */}
      {showTray && (
        <div style={{
          display: 'flex', gap: 8, padding: '0 16px 8px',
          overflowX: 'auto', minHeight: 80,
        }}>
          {unplacedPieces.map(piece => (
            <div
              key={piece.id}
              onPointerDown={(e) => handleTrayPointerDown(e, piece)}
              style={{
                minWidth: 60, height: 76,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 8, padding: 6, cursor: 'grab',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                touchAction: 'none', flexShrink: 0,
              }}
            >
              {thumbnails[piece.id] && (
                <img
                  src={thumbnails[piece.id]}
                  alt={piece.id}
                  style={{ width: 48, height: 48, objectFit: 'contain', pointerEvents: 'none' }}
                  draggable={false}
                />
              )}
              <span style={{ fontSize: 9, color: '#6A6A6A' }}>
                {piece.row + 1}-{piece.col + 1}
              </span>
            </div>
          ))}
          {unplacedPieces.length === 0 && (
            <div style={{ padding: '16px 0', color: '#4A4A4A', fontSize: 12 }}>
              所有碎片已放置到画布
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const btnStyle = {
  padding: '5px 14px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.04)',
  color: '#D4AF6A', border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer', fontFamily: 'inherit',
}
