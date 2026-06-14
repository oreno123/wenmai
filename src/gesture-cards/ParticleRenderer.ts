import type { Particle, HandData, SwipeEvent } from './types'

const GOLD_COLORS = ['#F2D58A', '#D4AF6A', '#FFE9B8']
const CORE_COLOR = '#FFF8E0'
const SILK_COLOR = 'rgba(242,213,138,0.55)'
const SILK_GLOW_COLOR = 'rgba(242,213,138,0.15)'

// MediaPipe hand landmark indices for fingertips
const FINGERTIPS = [4, 8, 12, 16, 20]
// Index fingertip — used as silk thread endpoint
const INDEX_TIP = 8

export class ParticleRenderer {
  private ctx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private particles: Particle[] = []
  private hands: HandData[] = []
  private colorIndex = 0

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2d context')
    this.ctx = ctx
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  updateHands(hands: HandData[]): void {
    this.hands = hands
    for (const hand of hands) {
      // Emit one particle from each fingertip — feels like flicking gold dust off the fingers
      for (const idx of FINGERTIPS) {
        const lm = hand.landmarks[idx]
        if (!lm) continue
        // Mirror x: camera feed is mirrored for the user
        const px = (1 - lm.x) * this.width
        const py = lm.y * this.height

        const color = GOLD_COLORS[this.colorIndex % GOLD_COLORS.length]
        this.colorIndex++
        this.particles.push({
          x: px + (Math.random() - 0.5) * 3,
          y: py + (Math.random() - 0.5) * 3,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8 - 0.2, // slight upward drift
          life: 0.8,
          maxLife: 0.8,
          radius: 1.2 + Math.random() * 1.4,
          color,
          alpha: 1,
        })
      }
    }
  }

  triggerSwipeArc(swipe: SwipeEvent): void {
    // Emit 18 particles from screen center in the swipe direction
    const cx = this.width / 2
    const cy = this.height / 2
    const baseAngle = swipe.direction === 'right' ? 0 : Math.PI
    const spreadAngle = Math.PI / 4 // 45 degrees spread

    for (let i = 0; i < 18; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spreadAngle * 2
      const speed = 3 + Math.random() * 5
      const color = GOLD_COLORS[i % GOLD_COLORS.length]
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7,
        maxLife: 0.7,
        radius: 1.5 + Math.random() * 2,
        color,
        alpha: 1,
      })
    }
  }

  render(dt: number): void {
    const { ctx } = this
    ctx.clearRect(0, 0, this.width, this.height)

    // Draw silk thread first (behind particles) if 2+ hands detected
    if (this.hands.length >= 2) {
      this.drawSilkThread()
    }

    // Use additive blending for a luminous gold-dust look
    ctx.globalCompositeOperation = 'lighter'

    // Persistent fingertip markers — makes it visually obvious that tracking follows fingertips
    for (const hand of this.hands) {
      for (const idx of FINGERTIPS) {
        const lm = hand.landmarks[idx]
        if (!lm) continue
        const x = (1 - lm.x) * this.width
        const y = lm.y * this.height

        // Outer halo
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.fillStyle = '#F2D58A'
        ctx.globalAlpha = 0.12
        ctx.fill()

        // Mid glow
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#FFE9B8'
        ctx.globalAlpha = 0.4
        ctx.fill()

        // Bright core
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = CORE_COLOR
        ctx.globalAlpha = 0.95
        ctx.fill()
      }
    }

    const alive: Particle[] = []
    for (const p of this.particles) {
      p.life -= dt
      if (p.life <= 0) continue

      p.x += p.vx
      p.y += p.vy

      // Fade based on remaining life ratio
      p.alpha = p.life / p.maxLife

      // Outer glow halo — wide, low-alpha gold
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha * 0.18
      ctx.fill()

      // Mid glow — medium gold
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * 1.6, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha * 0.5
      ctx.fill()

      // Bright core — small white-gold dot
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = CORE_COLOR
      ctx.globalAlpha = p.alpha * 0.95
      ctx.fill()

      alive.push(p)
    }
    this.particles = alive

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  private drawSilkThread(): void {
    const h0 = this.hands[0]
    const h1 = this.hands[1]
    const lm0 = h0.landmarks[INDEX_TIP]
    const lm1 = h1.landmarks[INDEX_TIP]
    if (!lm0 || !lm1) return

    const x0 = (1 - lm0.x) * this.width
    const y0 = lm0.y * this.height
    const x1 = (1 - lm1.x) * this.width
    const y1 = lm1.y * this.height

    // Control point: midpoint with subtle sag
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2 + 18

    const { ctx } = this

    // Glow stroke (wider, more transparent)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(mx, my, x1, y1)
    ctx.strokeStyle = SILK_GLOW_COLOR
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.stroke()

    // Core silk stroke
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(mx, my, x1, y1)
    ctx.strokeStyle = SILK_COLOR
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  dispose(): void {
    this.particles = []
    this.hands = []
  }
}
