import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useApp } from '../store/AppState'
import { getPatternById, getPatternImage } from '../store/patternData'
import PatternImage from '../components/common/PatternImage'
import { SYMMETRY_MODES, drawSymmetric } from '../engine/symmetry'
import ProductScene from '../components/products/ProductScene'
import ProductSwitcher from '../components/products/ProductSwitcher'

const MODES = Object.values(SYMMETRY_MODES)

export default function Editor() {
  const { data } = useApp()
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const [textureSource, setTextureSource] = useState(null)
  const [selectedPattern, setSelectedPattern] = useState(data.library[0] || null)
  const [symmetryMode, setSymmetryMode] = useState(SYMMETRY_MODES.ROTATE_4)
  const [activeProduct, setActiveProduct] = useState('mug')

  const myPatterns = useMemo(
    () => data.library.map(id => getPatternById(id)).filter(Boolean),
    [data.library]
  )

  // Create offscreen canvas once
  if (!offscreenRef.current) {
    offscreenRef.current = document.createElement('canvas')
    offscreenRef.current.width = 512
    offscreenRef.current.height = 512
  }

  // Capture canvas DOM element via callback ref
  const canvasCallbackRef = useCallback((node) => {
    canvasRef.current = node
    if (node) setTextureSource(offscreenRef.current)
  }, [])

  // Copy visible canvas → offscreen with circular crop + white fill
  const syncOffscreen = useCallback(() => {
    const src = canvasRef.current
    const off = offscreenRef.current
    if (!src || !off) return
    const ctx = off.getContext('2d')
    const s = off.width
    const cx = s / 2, cy = s / 2

    ctx.clearRect(0, 0, s, s)
    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, s, s)
    // Circular clip — only copy the center pattern
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(src, 0, 0)
    ctx.restore()
  }, [])

  // Auto-generate pattern when params change (debounced)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const timer = setTimeout(() => {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const pat = myPatterns.find(p => p.id === selectedPattern)

      if (getPatternImage(pat)) {
        const img = new Image()
        img.onload = () => {
          const drawFn = (ctx, cx, cy, size) => {
            const s = size * 0.3
            ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s)
          }
          drawSymmetric(ctx, drawFn, symmetryMode, canvas.width)
          syncOffscreen()
        }
        img.src = getPatternImage(pat)
      } else {
        const drawFn = (ctx, cx, cy, size) => {
          ctx.save()
          ctx.fillStyle = '#D4AF6A'
          ctx.beginPath()
          const r = size * 0.12
          ctx.arc(cx - r * 0.5, cy - r * 0.3, r, 0, Math.PI * 2)
          ctx.arc(cx + r * 0.5, cy - r * 0.3, r, 0, Math.PI * 2)
          ctx.arc(cx, cy + r * 0.2, r * 0.8, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
        drawSymmetric(ctx, drawFn, symmetryMode, canvas.width)
        syncOffscreen()
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [symmetryMode, selectedPattern, myPatterns, syncOffscreen])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      overflow: 'hidden',
    }}>
      {/* ── Editor Section (top) ── */}
      <div style={{
        padding: '12px 16px',
        flex: '0 0 auto',
        overflowY: 'auto',
      }}>
        <h1 style={{
          fontSize: '20px', fontWeight: 700,
          color: 'var(--text-primary)', marginBottom: '10px',
        }}>
          创作
        </h1>

        {/* Canvas */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-gold)',
          padding: '8px',
          marginBottom: '10px',
        }}>
          <canvas
            ref={canvasCallbackRef}
            width={512}
            height={512}
            style={{
              width: '100%', maxWidth: '200px',
              height: 'auto', display: 'block', margin: '0 auto',
              borderRadius: '8px', background: '#0F0F10',
            }}
          />
        </div>

        {/* Symmetry mode */}
        <div style={{ marginBottom: '10px' }}>
          <h3 style={{
            fontSize: '12px', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: '4px',
          }}>
            对称模式
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSymmetryMode(mode)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: `1px solid ${symmetryMode.id === mode.id ? 'var(--gold-main)' : 'rgba(255,255,255,0.1)'}`,
                  background: symmetryMode.id === mode.id ? 'rgba(212,175,106,0.15)' : 'var(--bg-secondary)',
                  color: symmetryMode.id === mode.id ? 'var(--gold-main)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {mode.name}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern selector */}
        <div>
          <h3 style={{
            fontSize: '12px', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: '4px',
          }}>
            选择纹样
          </h3>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {myPatterns.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPattern(p.id)}
                style={{
                  minWidth: '48px', height: '48px', borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: `2px solid ${selectedPattern === p.id ? 'var(--gold-main)' : 'transparent'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden',
                }}
              >
                <PatternImage src={getPatternImage(p)} alt={p.name} fallbackSize={20} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product Switcher ── */}
      <ProductSwitcher active={activeProduct} onChange={setActiveProduct} />

      {/* ── 3D Preview Section (bottom) ── */}
      <div style={{
        flex: '1 1 auto',
        minHeight: 0,
        background: '#0F0F10',
      }}>
        <ProductScene texture={textureSource} activeProduct={activeProduct} />
      </div>
    </div>
  )
}
