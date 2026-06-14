import { useState, useEffect, useRef, useCallback } from 'react'
import type { GestureState, SwipeEvent, ScaleEvent, HandData } from './types'
import { HandSwipeDetector } from './HandSwipeDetector'
import { ParticleRenderer } from './ParticleRenderer'
import type { Pattern, Rarity } from '../store/patternData'
import { getPatternImage, getRarityLabel } from '../store/patternData'
import { PATTERN_DESCRIPTIONS } from '../data/patternDescriptions'

// ── Types ──────────────────────────────────────────────

interface Props {
  patterns: Pattern[]
  onClose: () => void
}

// ── Sub-components ──────────────────────────────────────

function CardImage({ pattern }: { pattern: Pattern }) {
  const isSSR = pattern.rarity === 'ssr'
  return (
    <div
      style={{
        width: '100%',
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '8px 8px 0 0',
      }}
    >
      <img
        src={getPatternImage(pattern)}
        alt={pattern.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: isSSR ? 'drop-shadow(0 0 12px rgba(201,162,60,0.6))' : undefined,
        }}
      />
    </div>
  )
}

const RARITY_COLORS: Record<Rarity, string> = {
  ssr: '#C9A23C',
  rare: '#8B6914',
  common: '#666',
}

function CardInfo({ pattern }: { pattern: Pattern }) {
  const desc = PATTERN_DESCRIPTIONS[pattern.id]

  return (
    <div style={{ padding: '12px 16px' }}>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          fontWeight: 600,
          color: '#2A2016',
          marginBottom: 4,
        }}
      >
        {pattern.name}
      </div>

      {desc ? (
        <>
          <div style={{ fontSize: 11, color: '#7A6A50', marginBottom: 6, letterSpacing: '0.05em' }}>
            {desc.dynasty} · {desc.period}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: '#4A3A20',
              lineHeight: 1.55,
              marginBottom: 10,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {desc.history}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: '#7A6A50', marginBottom: 10, letterSpacing: '0.03em' }}>
          {pattern.type}
          {pattern.tags.length > 0 && ` · ${pattern.tags.slice(0, 4).join('、')}`}
        </div>
      )}

      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          color: '#fff',
          background: RARITY_COLORS[pattern.rarity],
        }}
      >
        {getRarityLabel(pattern.rarity)}
      </span>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────

export default function GestureCardView({ patterns, onClose }: Props) {
  // State
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardScale, setCardScale] = useState(1.0)
  const [gestureState, setGestureState] = useState<GestureState>('IDLE')
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noHandHint, setNoHandHint] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectorRef = useRef<HandSwipeDetector | null>(null)
  const rendererRef = useRef<ParticleRenderer | null>(null)
  const noHandTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % patterns.length)
  }, [patterns.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + patterns.length) % patterns.length)
  }, [patterns.length])

  // Single lifecycle useEffect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 1. Create ParticleRenderer
    const renderer = new ParticleRenderer(canvas)
    rendererRef.current = renderer

    // 2. Create HandSwipeDetector
    const detector = new HandSwipeDetector({
      onSwipe: (event: SwipeEvent) => {
        if (event.direction === 'left') {
          goNext()
        } else {
          goPrev()
        }
        renderer.triggerSwipeArc(event)
      },
      onScale: (event: ScaleEvent) => {
        setCardScale(prev => Math.max(0.5, Math.min(2.0, prev * event.scale)))
      },
      onStateChange: (state: GestureState) => {
        setGestureState(state)
        setNoHandHint(false)
      },
      onHandsUpdate: (hands: HandData[]) => {
        renderer.updateHands(hands)
      },
    })
    detectorRef.current = detector

    // 3. Initialize detector
    detector.init()
      .then(() => {
        setIsReady(true)
        // Attach video source to visible element
        const src = detector.getVideoElement()
        if (src && videoRef.current) {
          videoRef.current.srcObject = src.srcObject
          videoRef.current.play().catch(() => {})
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : '摄像头不可用'))

    // 4. Start particle render loop
    let lastTime = performance.now()
    let rafId = requestAnimationFrame(function loop(now: number) {
      const dt = (now - lastTime) / 1000
      lastTime = now
      renderer.render(dt)
      rafId = requestAnimationFrame(loop)
    })

    // 5. Resize handler
    function onResize() {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w
      canvas.height = h
      renderer.resize(w, h)
    }
    onResize()
    window.addEventListener('resize', onResize)

    // 6. No-hand hint timer
    noHandTimerRef.current = setInterval(() => {
      setGestureState((prev) => {
        if (prev === 'IDLE') {
          setNoHandHint(true)
        }
        return prev
      })
    }, 3000)

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      if (noHandTimerRef.current) {
        clearInterval(noHandTimerRef.current)
        noHandTimerRef.current = null
      }
      detector.dispose()
      renderer.dispose()
      detectorRef.current = null
      rendererRef.current = null
    }
  }, [patterns.length, goNext, goPrev])

  // Card carousel helpers
  const len = patterns.length
  const prevIndex = (currentIndex - 1 + len) % len
  const nextIndex = (currentIndex + 1) % len

  function cardStyle(position: 'prev' | 'current' | 'next') {
    const isSSR = patterns[position === 'prev' ? prevIndex : position === 'next' ? nextIndex : currentIndex].rarity === 'ssr'
    const base: React.CSSProperties = {
      position: 'absolute',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'all 0.4s ease-out',
      background: isSSR
        ? 'rgba(255,248,240,0.95)'
        : 'rgba(255,248,240,0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }

    if (isSSR) {
      base.border = '2px solid #C9A23C'
      base.boxShadow = '0 0 20px rgba(201,162,60,0.4), 0 8px 32px rgba(0,0,0,0.3)'
    } else {
      base.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'
    }

    if (position === 'current') {
      base.width = 280
      base.height = 380
      base.left = '50%'
      base.top = '50%'
      base.marginLeft = -140
      base.marginTop = -190
      base.transform = `scale(${cardScale})`
      base.zIndex = 3
      base.opacity = 1
    } else if (position === 'prev') {
      base.width = 220
      base.height = 300
      base.left = '50%'
      base.top = '50%'
      base.marginLeft = -110 - 280
      base.marginTop = -150
      base.transform = 'translateX(0) rotateY(25deg) scale(0.7)'
      base.zIndex = 2
      base.opacity = 0.5
    } else {
      base.width = 220
      base.height = 300
      base.left = '50%'
      base.top = '50%'
      base.marginLeft = -110 + 280
      base.marginTop = -150
      base.transform = 'translateX(0) rotateY(-25deg) scale(0.7)'
      base.zIndex = 2
      base.opacity = 0.5
    }

    return base
  }

  // Status bar text
  function getStatusText(): string {
    if (error) return '摄像头不可用'
    if (!isReady) return '正在启动摄像头...'
    if (noHandHint) return '未检测到手势，请伸出手掌'
    if (gestureState === 'SWIPING') return '翻页中'
    if (gestureState === 'SCALING') return '缩放中'
    return '左右滑动翻页 / 双手缩放'
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Layer 1: Video background */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          filter: 'brightness(0.6)',
        }}
      />
      {/* Vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Layer 2: Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Layer 3: Card carousel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 1200,
        }}
      >
        {/* Prev card */}
        <div style={cardStyle('prev')}>
          <CardImage pattern={patterns[prevIndex]} />
          <CardInfo pattern={patterns[prevIndex]} />
        </div>

        {/* Current card */}
        <div style={cardStyle('current')}>
          <CardImage pattern={patterns[currentIndex]} />
          <CardInfo pattern={patterns[currentIndex]} />
        </div>

        {/* Next card */}
        <div style={cardStyle('next')}>
          <CardImage pattern={patterns[nextIndex]} />
          <CardInfo pattern={patterns[nextIndex]} />
        </div>
      </div>

      {/* UI Overlays */}

      {/* Top center: counter */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          fontWeight: 600,
          color: '#C9A23C',
          textShadow: '0 0 10px rgba(201,162,60,0.4)',
          zIndex: 10,
        }}
      >
        {currentIndex + 1} / {patterns.length}
      </div>

      {/* Top right: close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          zIndex: 10,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '8px 20px',
          color: 'rgba(255,255,255,0.9)',
          fontFamily: 'var(--font-serif)',
          fontSize: 14,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
        }}
      >
        关闭
      </button>

      {/* Bottom center: status bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-serif)',
          fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        {getStatusText()}
      </div>
    </div>
  )
}
