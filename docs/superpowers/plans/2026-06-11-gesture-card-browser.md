# Gesture Card Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AR hand-gesture-controlled floating card browser to the 纹脉 Library page, where users swipe left/right with their hand to browse pattern cards and use two-hand pinch to scale them.

**Architecture:** Three-layer overlay (video background → Canvas 2D particles → CSS 3D cards). MediaPipe Hands detects palm position, drives swipe/scale gestures. Activated from Library page via button, renders as `position: fixed` full-screen overlay.

**Tech Stack:** React 19, TypeScript, MediaPipe Tasks Vision (already in deps), Canvas 2D, CSS 3D transforms. No new dependencies.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/gesture-cards/types.ts` | Create | Shared types: gesture state, hand data, particle |
| `src/gesture-cards/HandSwipeDetector.ts` | Create | MediaPipe init, swipe + scale gesture detection |
| `src/gesture-cards/ParticleRenderer.ts` | Create | Canvas 2D particle system (trail, arc, silk) |
| `src/gesture-cards/GestureCardView.tsx` | Create | Main full-screen overlay component (3 layers) |
| `src/pages/Library.jsx` | Modify | Add "手势浏览" button + state toggle |

---

### Task 1: Types

**Files:**
- Create: `src/gesture-cards/types.ts`

- [ ] **Step 1: Create types file**

```typescript
export type GestureState = 'IDLE' | 'TRACKING' | 'SWIPING' | 'SCALING'

export interface PalmCenter {
  x: number
  y: number
  z: number
}

export interface HandData {
  palmCenter: PalmCenter
  handedness: 'left' | 'right' | 'unknown'
  landmarks: { x: number; y: number; z: number }[]
}

export interface SwipeEvent {
  direction: 'left' | 'right'
  velocity: number
}

export interface ScaleEvent {
  scale: number // cumulative scale factor 0.5–2.0
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number // 0–1, decreases each frame
  maxLife: number
  radius: number
  color: string
  alpha: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/gesture-cards/types.ts
git commit -m "feat(gesture-cards): add shared types for gesture detection and particles"
```

---

### Task 2: HandSwipeDetector

**Files:**
- Create: `src/gesture-cards/HandSwipeDetector.ts`

This is a standalone class (not a React hook) that manages MediaPipe lifecycle and exposes detected gesture events via callbacks. Modeled after `src/showcase/useHandGesture.js` but as a reusable class with swipe/scale detection instead of open/fist.

- [ ] **Step 1: Create HandSwipeDetector**

```typescript
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { HandData, SwipeEvent, ScaleEvent, GestureState } from './types'

const SWIPE_THRESHOLD = 0.04 // normalized x delta per frame
const SWIPE_FRAMES = 3
const SWIPE_COOLDOWN_MS = 400
const SCALE_CHANGE_THRESHOLD = 0.15

export interface GestureCallbacks {
  onSwipe: (event: SwipeEvent) => void
  onScale: (event: ScaleEvent) => void
  onStateChange: (state: GestureState) => void
  onHandsUpdate: (hands: HandData[]) => void
}

export class HandSwipeDetector {
  private handLandmarker: HandLandmarker | null = null
  private video: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private callbacks: GestureCallbacks
  private rafId: number = 0
  private lastTimestamp: number = -1
  private cancelled = false

  // Swipe state
  private swipeDirFrames: { dir: 'left' | 'right'; frames: number } = { dir: 'right', frames: 0 }
  private lastSwipeTime = 0
  private prevPalmX: number | null = null

  // Scale state
  private baseDistance: number | null = null
  private currentScale = 1.0

  // Gesture state
  private gestureState: GestureState = 'IDLE'
  private lastHandTime = 0

  constructor(callbacks: GestureCallbacks) {
    this.callbacks = callbacks
  }

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )
    if (this.cancelled) return

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    if (this.cancelled) return

    this.video = document.createElement('video')
    this.video.playsInline = true
    this.video.muted = true
    this.video.style.display = 'none'
    document.body.appendChild(this.video)

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    })
    if (this.cancelled) {
      this.stream.getTracks().forEach(t => t.stop())
      return
    }

    this.video.srcObject = this.stream
    await new Promise<void>(resolve => {
      if (!this.video) return resolve()
      this.video.onloadedmetadata = () => {
        this.video!.play().then(resolve)
      }
    })

    this.detect()
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video
  }

  private detect(): void {
    if (this.cancelled) return
    const hl = this.handLandmarker
    const vid = this.video
    if (!hl || !vid || vid.readyState < 2) {
      this.rafId = requestAnimationFrame(() => this.detect())
      return
    }

    const timestamp = performance.now()
    if (timestamp <= this.lastTimestamp) {
      this.rafId = requestAnimationFrame(() => this.detect())
      return
    }
    this.lastTimestamp = timestamp

    try {
      const result = hl.detectForVideo(vid, timestamp)
      this.processResult(result, timestamp)
    } catch {
      // Swallow detection errors, continue loop
    }

    this.rafId = requestAnimationFrame(() => this.detect())
  }

  private processResult(result: HandLandmarkerResult, timestamp: number): void {
    if (!result.landmarks || result.landmarks.length === 0) {
      // No hands
      this.swipeDirFrames = { dir: 'right', frames: 0 }
      this.prevPalmX = null
      this.baseDistance = null

      if (this.gestureState !== 'IDLE') {
        const timeSinceHand = timestamp - this.lastHandTime
        if (timeSinceHand > 3000) {
          this.setGestureState('IDLE')
        }
      }
      this.callbacks.onHandsUpdate([])
      return
    }

    this.lastHandTime = timestamp
    const hands: HandData[] = result.landmarks.map((landmarks, i) => {
      const wrist = landmarks[0]
      const middleMCP = landmarks[9]
      return {
        palmCenter: {
          x: (wrist.x + middleMCP.x) / 2,
          y: (wrist.y + middleMCP.y) / 2,
          z: (wrist.z + middleMCP.z) / 2,
        },
        handedness: result.handedness?.[i]?.[0]?.categoryName?.toLowerCase() as HandData['handedness'] ?? 'unknown',
        landmarks: landmarks.map(l => ({ x: l.x, y: l.y, z: l.z })),
      }
    })
    this.callbacks.onHandsUpdate(hands)

    if (hands.length >= 2) {
      this.detectScale(hands[0], hands[1], timestamp)
    } else {
      this.baseDistance = null
      this.currentScale = 1.0
      this.detectSwipe(hands[0], timestamp)
    }
  }

  private detectSwipe(hand: HandData, timestamp: number): void {
    const palmX = hand.palmCenter.x

    if (this.prevPalmX !== null) {
      // Mirror: MediaPipe x increases → hand moves LEFT on mirrored display
      const delta = this.prevPalmX - palmX // positive = hand moved right on screen

      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        const dir: 'left' | 'right' = delta > 0 ? 'right' : 'left'
        if (this.swipeDirFrames.dir === dir) {
          this.swipeDirFrames.frames++
        } else {
          this.swipeDirFrames = { dir, frames: 1 }
        }

        if (this.swipeDirFrames.frames >= SWIPE_FRAMES && timestamp - this.lastSwipeTime > SWIPE_COOLDOWN_MS) {
          this.lastSwipeTime = timestamp
          this.swipeDirFrames = { dir: 'right', frames: 0 }
          this.setGestureState('SWIPING')
          this.callbacks.onSwipe({ direction: dir, velocity: Math.abs(delta) })
          // Return to TRACKING after a short delay
          setTimeout(() => {
            if (this.gestureState === 'SWIPING') {
              this.setGestureState('TRACKING')
            }
          }, 300)
        }
      } else {
        this.swipeDirFrames = { dir: this.swipeDirFrames.dir, frames: 0 }
      }
    }

    this.prevPalmX = palmX
    if (this.gestureState === 'IDLE') {
      this.setGestureState('TRACKING')
    }
  }

  private detectScale(hand1: HandData, hand2: HandData, _timestamp: number): void {
    const dx = hand1.palmCenter.x - hand2.palmCenter.x
    const dy = hand1.palmCenter.y - hand2.palmCenter.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (this.baseDistance === null) {
      this.baseDistance = distance
      this.currentScale = 1.0
    } else {
      const ratio = distance / this.baseDistance
      if (Math.abs(ratio - this.currentScale) > SCALE_CHANGE_THRESHOLD) {
        this.currentScale = Math.max(0.5, Math.min(2.0, ratio))
        this.setGestureState('SCALING')
        this.callbacks.onScale({ scale: this.currentScale })
      }
    }

    if (this.gestureState !== 'SCALING') {
      this.setGestureState('TRACKING')
    }
  }

  private setGestureState(state: GestureState): void {
    if (this.gestureState !== state) {
      this.gestureState = state
      this.callbacks.onStateChange(state)
    }
  }

  dispose(): void {
    this.cancelled = true
    if (this.rafId) cancelAnimationFrame(this.rafId)
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }
    if (this.video) {
      this.video.srcObject = null
      this.video.remove()
      this.video = null
    }
    if (this.handLandmarker) {
      this.handLandmarker.close()
      this.handLandmarker = null
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/gesture-cards/HandSwipeDetector.ts
git commit -m "feat(gesture-cards): add HandSwipeDetector with swipe and scale gesture detection"
```

---

### Task 3: ParticleRenderer

**Files:**
- Create: `src/gesture-cards/ParticleRenderer.ts`

Canvas 2D particle system. Renders golden trail particles at hand position, arc burst on swipe, silk thread between two hands during scale.

- [ ] **Step 1: Create ParticleRenderer**

```typescript
import type { Particle, HandData, SwipeEvent } from './types'

const GOLD = '#F2D58A'
const GOLD_DIM = '#D4AF6A'
const TRAIL_RATE = 3
const TRAIL_LIFE = 0.5
const ARC_COUNT = 15
const ARC_LIFE = 0.6

export class ParticleRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private hands: HandData[] = []
  private lastSwipe: SwipeEvent | null = null
  private width = 0
  private height = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
  }

  updateHands(hands: HandData[]): void {
    this.hands = hands
    // Emit trail particles from each hand's palm center
    for (const hand of hands) {
      for (let i = 0; i < TRAIL_RATE; i++) {
        const px = (1 - hand.palmCenter.x) * this.width // mirror x
        const py = hand.palmCenter.y * this.height
        this.particles.push({
          x: px + (Math.random() - 0.5) * 10,
          y: py + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.5,
          life: TRAIL_LIFE,
          maxLife: TRAIL_LIFE,
          radius: 2 + Math.random() * 2,
          color: Math.random() > 0.5 ? GOLD : GOLD_DIM,
          alpha: 1,
        })
      }
    }
  }

  triggerSwipeArc(swipe: SwipeEvent): void {
    this.lastSwipe = swipe
    const cx = this.width / 2
    const cy = this.height / 2
    const dir = swipe.direction === 'left' ? -1 : 1
    for (let i = 0; i < ARC_COUNT; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.6
      const speed = 3 + Math.random() * 5
      this.particles.push({
        x: cx,
        y: cy,
        vx: dir * Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: ARC_LIFE,
        maxLife: ARC_LIFE,
        radius: 2 + Math.random() * 3,
        color: GOLD,
        alpha: 1,
      })
    }
  }

  render(dt: number): void {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    // Draw silk thread between two hands
    if (this.hands.length >= 2) {
      const h1x = (1 - this.hands[0].palmCenter.x) * this.width
      const h1y = this.hands[0].palmCenter.y * this.height
      const h2x = (1 - this.hands[1].palmCenter.x) * this.width
      const h2y = this.hands[1].palmCenter.y * this.height

      ctx.beginPath()
      ctx.moveTo(h1x, h1y)
      // Bezier curve with slight sag
      const midX = (h1x + h2x) / 2
      const midY = (h1y + h2y) / 2 + 20
      ctx.quadraticCurveTo(midX, midY, h2x, h2y)
      ctx.strokeStyle = `rgba(242, 213, 138, 0.4)`
      ctx.lineWidth = 2
      ctx.stroke()

      // Glow
      ctx.strokeStyle = `rgba(242, 213, 138, 0.1)`
      ctx.lineWidth = 6
      ctx.stroke()
    }

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life -= dt
      p.alpha = Math.max(0, p.life / p.maxLife)

      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * p.alpha, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha * 0.8
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  dispose(): void {
    this.particles = []
    this.hands = []
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/gesture-cards/ParticleRenderer.ts
git commit -m "feat(gesture-cards): add ParticleRenderer with trail, arc burst, and silk thread"
```

---

### Task 4: GestureCardView Component

**Files:**
- Create: `src/gesture-cards/GestureCardView.tsx`

The main full-screen overlay. Three layers: video background, particle canvas, card carousel. Manages the HandSwipeDetector and ParticleRenderer lifecycle.

- [ ] **Step 1: Create GestureCardView**

```tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Pattern } from '../store/patternData'
import { getPatternImage, getRarityLabel } from '../store/patternData'
import { HandSwipeDetector } from './HandSwipeDetector'
import { ParticleRenderer } from './ParticleRenderer'
import type { GestureState, HandData, SwipeEvent, ScaleEvent } from './types'

interface Props {
  patterns: Pattern[]
  onClose: () => void
}

export default function GestureCardView({ patterns, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardScale, setCardScale] = useState(1.0)
  const [gestureState, setGestureState] = useState<GestureState>('IDLE')
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noHandHint, setNoHandHint] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<ParticleRenderer | null>(null)
  const rafRef = useRef<number>(0)
  const detectorRef = useRef<HandSwipeDetector | null>(null)
  const lastHandsRef = useRef<HandData[]>([])
  const lastTimeRef = useRef(performance.now())

  const pattern = patterns[currentIndex] ?? null

  // Card navigation
  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % patterns.length)
  }, [patterns.length])
  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + patterns.length) % patterns.length)
  }, [patterns.length])

  // Initialize detector and renderer
  useEffect(() => {
    if (patterns.length === 0) return

    const canvas = particleCanvasRef.current
    if (!canvas) return

    const renderer = new ParticleRenderer(canvas)
    renderer.resize(window.innerWidth, window.innerHeight)
    rendererRef.current = renderer

    const detector = new HandSwipeDetector({
      onSwipe: (e: SwipeEvent) => {
        if (e.direction === 'left') goNext()
        else goPrev()
        renderer.triggerSwipeArc(e)
      },
      onScale: (e: ScaleEvent) => {
        setCardScale(e.scale)
      },
      onStateChange: (s: GestureState) => {
        setGestureState(s)
        if (s === 'TRACKING') setNoHandHint(false)
      },
      onHandsUpdate: (hands: HandData[]) => {
        lastHandsRef.current = hands
      },
    })
    detectorRef.current = detector

    detector.init()
      .then(() => setIsReady(true))
      .catch((err: Error) => setError(err.message))

    // Render loop for particles
    function renderLoop() {
      const now = performance.now()
      const dt = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      renderer.updateHands(lastHandsRef.current)
      renderer.render(dt)
      rafRef.current = requestAnimationFrame(renderLoop)
    }
    renderLoop()

    // Resize handler
    function onResize() {
      renderer.resize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // No-hand hint timer
    const hintTimer = setInterval(() => {
      if (gestureState === 'IDLE' || lastHandsRef.current.length === 0) {
        setNoHandHint(true)
      }
    }, 3000)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      clearInterval(hintTimer)
      detector.dispose()
      renderer.dispose()
    }
  }, [patterns.length, goNext, goPrev]) // eslint-disable-line react-hooks/exhaustive-deps

  // Attach detector's video to our video element
  useEffect(() => {
    if (!isReady || !detectorRef.current) return
    const vid = detectorRef.current.getVideoElement()
    if (vid && videoRef.current) {
      // We display the detector's hidden video via our visible video element
      vid.style.display = 'none'
    }
  }, [isReady])

  if (patterns.length === 0) return null

  // Neighboring cards
  const prevPattern = patterns[(currentIndex - 1 + patterns.length) % patterns.length]
  const nextPattern = patterns[(currentIndex + 1) % patterns.length]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* Layer 1: Video background */}
      <video
        ref={(el) => {
          if (el && detectorRef.current) {
            const src = detectorRef.current.getVideoElement()
            if (src) {
              el.srcObject = src.srcObject
              el.play().catch(() => {})
            }
          }
        }}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          filter: 'brightness(0.6)',
        }}
      />
      {/* Vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Layer 2: Particle canvas */}
      <canvas
        ref={particleCanvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Layer 3: Card carousel */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        perspective: '1200px',
        pointerEvents: 'none',
      }}>
        {/* Previous card */}
        <div style={{
          position: 'absolute',
          width: 220, height: 300,
          transform: 'translateX(-280px) rotateY(25deg) scale(0.7)',
          opacity: 0.5,
          borderRadius: 16,
          background: 'rgba(255,248,240,0.85)',
          backdropFilter: 'blur(8px)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'all 0.4s ease-out',
        }}>
          <CardImage pattern={prevPattern} />
          <CardInfo pattern={prevPattern} />
        </div>

        {/* Current card */}
        <div style={{
          position: 'absolute',
          width: 280, height: 380,
          transform: `scale(${cardScale})`,
          borderRadius: 20,
          background: pattern?.rarity === 'ssr'
            ? 'rgba(255,248,240,0.92)'
            : 'rgba(255,248,240,0.85)',
          backdropFilter: 'blur(8px)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'transform 0.4s ease-out',
          boxShadow: pattern?.rarity === 'ssr'
            ? '0 0 40px rgba(201,162,60,0.3), 0 20px 60px rgba(0,0,0,0.5)'
            : '0 20px 60px rgba(0,0,0,0.5)',
          border: pattern?.rarity === 'ssr'
            ? '1px solid rgba(201,162,60,0.4)'
            : pattern?.rarity === 'rare'
            ? '1px solid rgba(201,162,60,0.2)'
            : '1px solid rgba(255,255,255,0.1)',
        }}>
          <CardImage pattern={pattern} large />
          <CardInfo pattern={pattern} large />
        </div>

        {/* Next card */}
        <div style={{
          position: 'absolute',
          width: 220, height: 300,
          transform: 'translateX(280px) rotateY(-25deg) scale(0.7)',
          opacity: 0.5,
          borderRadius: 16,
          background: 'rgba(255,248,240,0.85)',
          backdropFilter: 'blur(8px)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'all 0.4s ease-out',
        }}>
          <CardImage pattern={nextPattern} />
          <CardInfo pattern={nextPattern} />
        </div>
      </div>

      {/* Counter */}
      <div style={{
        position: 'absolute', top: 20, left: 0, right: 0,
        textAlign: 'center', zIndex: 10,
        color: 'rgba(242,213,138,0.7)', fontSize: 14,
        fontFamily: 'var(--font-serif)',
        pointerEvents: 'none',
      }}>
        {currentIndex + 1} / {patterns.length}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 10,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          color: '#F2D58A',
          fontSize: 14,
          padding: '6px 16px',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-serif)',
        }}
      >
        关闭
      </button>

      {/* Status bar */}
      <div style={{
        position: 'absolute', bottom: 24, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', zIndex: 10,
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          padding: '8px 20px', borderRadius: 20,
          color: '#F2D58A', fontSize: 13, textAlign: 'center',
          fontFamily: 'var(--font-serif)',
        }}>
          {error ? '摄像头不可用' :
           !isReady ? '正在启动摄像头...' :
           noHandHint ? '未检测到手势，请伸出手掌' :
           gestureState === 'SWIPING' ? '翻页中' :
           gestureState === 'SCALING' ? '缩放中' :
           '左右滑动翻页 / 双手缩放'}
        </div>
      </div>
    </div>
  )
}

function CardImage({ pattern, large }: { pattern: Pattern | null; large?: boolean }) {
  if (!pattern) return null
  const imgSrc = getPatternImage(pattern)
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: large ? 16 : 10,
      minHeight: 0,
    }}>
      <img
        src={imgSrc}
        alt={pattern.name}
        style={{
          maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
          filter: pattern.rarity === 'ssr' ? 'drop-shadow(0 0 12px rgba(201,162,60,0.35))' : 'none',
        }}
      />
    </div>
  )
}

function CardInfo({ pattern, large }: { pattern: Pattern | null; large?: boolean }) {
  if (!pattern) return null
  const rarityColor = pattern.rarity === 'ssr' ? '#C9A23C' : pattern.rarity === 'rare' ? '#8B6914' : '#666'
  return (
    <div style={{
      padding: large ? '12px 16px' : '8px 10px',
      borderTop: '1px solid rgba(201,162,60,0.1)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4,
      }}>
        <span style={{
          fontSize: large ? 15 : 12, fontWeight: 600, letterSpacing: '0.5px',
          color: '#1A1A1C',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
        }}>
          {pattern.name}
        </span>
        <span style={{
          fontSize: large ? 11 : 9,
          color: rarityColor,
          border: `1px solid ${rarityColor}`,
          borderRadius: 8,
          padding: '1px 6px',
          whiteSpace: 'nowrap',
        }}>
          {getRarityLabel(pattern.rarity)}
        </span>
      </div>
      {large && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
          {pattern.type}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/gesture-cards/GestureCardView.tsx
git commit -m "feat(gesture-cards): add GestureCardView with 3-layer AR overlay and card carousel"
```

---

### Task 5: Integrate into Library Page

**Files:**
- Modify: `src/pages/Library.jsx`

Add a "手势浏览" button in the Library header. When clicked, set state to show GestureCardView as full-screen overlay. Pass the user's owned patterns as the card data.

- [ ] **Step 1: Add import and state to Library**

At the top of `Library.jsx`, add the lazy import:

```jsx
import { lazy, useState } from 'react'
```

Add the lazy import for GestureCardView (before `export default function Library()`):

```jsx
const GestureCardView = lazy(() => import('../gesture-cards/GestureCardView'))
```

- [ ] **Step 2: Add gesture view state**

Inside the `Library` function, after existing state declarations, add:

```jsx
const [showGestureView, setShowGestureView] = useState(false)
```

- [ ] **Step 3: Add button in the header**

In the header row (the `<div>` with `display: 'flex'` and `justifyContent: 'space-between'`), add a button after the count span. Change the existing header to include the button:

Replace:
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
  <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>图鉴</h1>
  <span style={{ fontSize: 12, color: '#6A6A6A' }}>{collected}/{total}</span>
</div>
```

With:
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
  <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>图鉴</h1>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ fontSize: 12, color: '#6A6A6A' }}>{collected}/{total}</span>
    <button
      onClick={() => setShowGestureView(true)}
      disabled={myPatterns.length === 0}
      style={{
        fontSize: 11, padding: '4px 10px', borderRadius: 12,
        background: myPatterns.length === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(212,175,106,0.15)',
        color: myPatterns.length === 0 ? '#4A4A4A' : '#F2D58A',
        border: myPatterns.length === 0 ? '1px solid transparent' : '1px solid rgba(212,175,106,0.2)',
        cursor: myPatterns.length === 0 ? 'default' : 'pointer',
        fontFamily: 'inherit',
      }}
    >
      手势浏览
    </button>
  </div>
</div>
```

- [ ] **Step 4: Add GestureCardView overlay at the end of the return**

Before the closing `</div>` of the Library component (after the empty state message), add:

```jsx
{showGestureView && (
  <Suspense fallback={null}>
    <GestureCardView
      patterns={myPatterns}
      onClose={() => setShowGestureView(false)}
    />
  </Suspense>
)}
```

Also ensure `Suspense` is imported:

```jsx
import { lazy, Suspense, useState } from 'react'
```

- [ ] **Step 5: Verify the app starts**

Run: `cd D:/desktop/纹脉/wenmai && npm run dev`

Expected: Dev server starts, Library page shows "手势浏览" button next to the count.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Library.jsx
git commit -m "feat(library): add gesture browse button that opens GestureCardView overlay"
```

---

### Task 6: Manual Testing & Polish

- [ ] **Step 1: Start dev server**

Run: `cd D:/desktop/纹脉/wenmai && npm run dev`

- [ ] **Step 2: Test full flow**

1. Open the app in browser
2. Navigate to Library (图鉴) page
3. Click "手势浏览" button
4. Verify: camera permission prompt appears
5. Allow camera → verify: video background shows (mirrored, dimmed)
6. Hold hand in front of camera → verify: golden particles appear around palm
7. Swipe hand left → verify: card advances to next pattern
8. Swipe hand right → verify: card goes back to previous pattern
9. Hold up two hands → verify: golden silk thread appears between hands
10. Move hands apart/together → verify: center card scales up/down
11. Click "关闭" button → verify: returns to Library page
12. Verify: camera stops, resources cleaned up

- [ ] **Step 3: Fix any issues found during testing**

Address edge cases:
- No camera: error message shows
- No patterns: button disabled
- Single pattern: carousel still works (shows same card for prev/next)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix(gesture-cards): polish and edge case fixes from manual testing"
```
