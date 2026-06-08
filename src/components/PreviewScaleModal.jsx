import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from './common/Router'
import { motion, AnimatePresence } from 'framer-motion'

const MIN_SCALE = 0.3
const MAX_SCALE = 3.0
const FRAME_SIZE = 320

export default function PreviewScaleModal({ imageUrl, onClose }) {
  const navigate = useNavigate()
  const frameRef = useRef(null)
  const [scale, setScale] = useState(1.0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [dragging, setDragging] = useState(null)
  const [showRotation, setShowRotation] = useState(false)

  const clampScale = useCallback((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)), [])
  const clampOffset = useCallback((ox, oy, s) => {
    const frame = frameRef.current
    const size = frame ? frame.offsetWidth : FRAME_SIZE
    const limit = size * s * 0.5
    return {
      x: Math.max(-limit, Math.min(limit, ox)),
      y: Math.max(-limit, Math.min(limit, oy)),
    }
  }, [])

  // Attach non-passive wheel listener for zoom/pan
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onWheel = (e) => {
      e.preventDefault()
      // Wheel = zoom
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      setScale(prev => clampScale(prev + delta * prev))
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [clampScale, clampOffset, scale])

  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('.controls-area')) return
    e.preventDefault()
    setDragging({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }, [offset])

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return
    const ox = e.clientX - dragging.x
    const oy = e.clientY - dragging.y
    setOffset(clampOffset(ox, oy, scale))
  }, [dragging, scale, clampOffset])

  const handlePointerUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragging, handlePointerMove, handlePointerUp])

  const goToShowcase = useCallback(() => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const size = 1024
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#F5F0E6'
          ctx.fillRect(0, 0, size, size)
          ctx.save()
          ctx.translate(size / 2, size / 2)
          ctx.rotate(rotation * Math.PI / 180)
          ctx.scale(scale, scale)
          ctx.drawImage(img, -img.width / 2, -img.height / 2)
          ctx.restore()
          sessionStorage.setItem('showcase_image', canvas.toDataURL('image/png'))
        } catch {}
        navigate('/showcase')
      }
      img.onerror = () => navigate('/showcase')
      img.src = imageUrl
    } catch {
      navigate('/showcase')
    }
  }, [imageUrl, scale, rotation, navigate])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(8,6,4,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '6px 16px',
              color: '#D4AF6A', fontSize: 14, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>←</span> 返回编辑
          </button>
          <span style={{
            fontSize: 15, fontWeight: 600, color: '#F2D58A',
            letterSpacing: 2,
          }}>
            纹样预览
          </span>
          <div style={{ width: 80 }} />
        </div>

        {/* Frame */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div
              ref={frameRef}
              onPointerDown={handlePointerDown}
              style={{
                width: 'min(320px, 80vmin)', height: 'min(320px, 80vmin)',
                maxWidth: '100%', maxHeight: '60vh',
                background: '#F5F0E6',
                borderRadius: 16,
                border: '2px solid rgba(180,155,100,0.35)',
                boxShadow: `
                  0 0 0 1px rgba(180,155,100,0.1),
                  0 4px 24px rgba(0,0,0,0.4),
                  0 0 80px rgba(201,148,58,0.08),
                  inset 0 0 60px rgba(180,155,100,0.06)
                `,
                overflow: 'hidden',
                position: 'relative',
                cursor: dragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img
                  src={imageUrl}
                  alt="纹样预览"
                  draggable={false}
                  style={{
                    maxWidth: '100%', maxHeight: '100%',
                    objectFit: 'contain',
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: dragging ? 'none' : 'transform 0.15s ease-out',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
              </div>
              {/* Subtle corner decorations */}
              {[
                { top: 8, left: 8, border: 'border-top, border-left' },
                { top: 8, right: 8, border: 'border-top, border-right' },
                { bottom: 8, left: 8, border: 'border-bottom, border-left' },
                { bottom: 8, right: 8, border: 'border-bottom, border-right' },
              ].map((pos, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  ...pos,
                  width: 20, height: 20,
                  borderColor: 'rgba(180,155,100,0.25)',
                  borderStyle: 'solid',
                  borderWidth: 0,
                  borderTopWidth: pos.border.includes('top') ? 1.5 : 0,
                  borderBottomWidth: pos.border.includes('bottom') ? 1.5 : 0,
                  borderLeftWidth: pos.border.includes('left') ? 1.5 : 0,
                  borderRightWidth: pos.border.includes('right') ? 1.5 : 0,
                }} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="controls-area" style={{
          padding: '0 24px 80px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          {/* Scale slider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', maxWidth: 300,
          }}>
            <span style={{ fontSize: 11, color: '#8A7A5A', minWidth: 32 }}>
              {Math.round(scale * 100)}%
            </span>
            <div style={{ flex: 1, position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 3,
                background: 'rgba(180,155,100,0.15)', borderRadius: 2,
              }} />
              <div style={{
                position: 'absolute', left: 0,
                width: `${((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%`,
                height: 3,
                background: 'linear-gradient(90deg, #C9943A, #F2D58A)',
                borderRadius: 2,
                boxShadow: '0 0 8px rgba(201,148,58,0.3)',
              }} />
              <input
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.01}
                value={scale}
                onChange={(e) => {
                  const s = parseFloat(e.target.value)
                  setScale(s)
                  setOffset(prev => clampOffset(prev.x, prev.y, s))
                }}
                style={{
                  width: '100%', position: 'relative', zIndex: 2,
                  appearance: 'none', WebkitAppearance: 'none',
                  background: 'transparent', cursor: 'pointer',
                  height: 28,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: '#6A6A5A' }}>缩放</span>
          </div>

          {/* Rotation toggle + slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 300 }}>
            <button
              onClick={() => setShowRotation(!showRotation)}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: showRotation ? 'rgba(201,148,58,0.2)' : 'rgba(255,255,255,0.04)',
                border: showRotation ? '1px solid rgba(201,148,58,0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: showRotation ? '#F2D58A' : '#6A6A6A',
                fontSize: 13, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >↻</button>
            {showRotation && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(parseFloat(e.target.value))}
                  style={{
                    flex: 1,
                    appearance: 'none', WebkitAppearance: 'none',
                    background: 'transparent', cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: 11, color: '#8A7A5A', minWidth: 36 }}>
                  {rotation}°
                </span>
              </div>
            )}
          </div>

          {/* Hint */}
          <p style={{
            fontSize: 11, color: '#6A6A5A', margin: 0,
            textAlign: 'center',
          }}>
            滚轮缩放 · 拖拽移动 · 调整后点击下方按钮
          </p>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(201,148,58,0.4)' }}
            whileTap={{ scale: 0.97 }}
            onClick={goToShowcase}
            style={{
              marginTop: 4,
              padding: '12px 48px',
              borderRadius: 14,
              background: 'linear-gradient(145deg, #C9943A, #8B6914)',
              border: '1px solid rgba(201,148,58,0.4)',
              color: '#F5F1E8',
              fontSize: 16, fontWeight: 600,
              letterSpacing: 2,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 16px rgba(201,148,58,0.2)',
              transition: 'box-shadow 0.3s',
            }}
          >
            前往展示 →
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
