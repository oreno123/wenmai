import type { Particle, HandData, SwipeEvent } from './types'

const GOLD_COLORS = ['#F2D58A', '#D4AF6A']
const SILK_COLOR = 'rgba(242,213,138,0.4)'
const SILK_GLOW_COLOR = 'rgba(242,213,138,0.1)'

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
      // Mirror x: camera is mirrored
      const px = (1 - hand.palmCenter.x) * this.width
      const py = hand.palmCenter.y * this.height

      // Emit 3 particles per hand per frame
      for (let i = 0; i < 3; i++) {
        const color = GOLD_COLORS[this.colorIndex % GOLD_COLORS.length]
        this.colorIndex++
        this.particles.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          life: 0.5,
          maxLife: 0.5,
          radius: 2 + Math.random() * 2,
          color,
          alpha: 1,
        })
      }
    }
  }

  triggerSwipeArc(swipe: SwipeEvent): void {
    // Emit 15 particles from screen center in the swipe direction
    const cx = this.width / 2
    const cy = this.height / 2
    const baseAngle = swipe.direction === 'right' ? 0 : Math.PI
    const spreadAngle = Math.PI / 4 // 45 degrees spread

    for (let i = 0; i < 15; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spreadAngle * 2
      const speed = 3 + Math.random() * 5
      const color = GOLD_COLORS[i % GOLD_COLORS.length]
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        radius: 2 + Math.random() * 2,
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

    // Update and draw particles
    const alive: Particle[] = []
    for (const p of this.particles) {
      p.life -= dt
      if (p.life <= 0) continue

      p.x += p.vx
      p.y += p.vy

      // Gold-to-transparent fade based on remaining life ratio
      p.alpha = p.life / p.maxLife

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha * 0.8
      ctx.fill()
      ctx.globalAlpha = 1

      alive.push(p)
    }
    this.particles = alive
  }

  private drawSilkThread(): void {
    const h0 = this.hands[0]
    const h1 = this.hands[1]

    const x0 = (1 - h0.palmCenter.x) * this.width
    const y0 = h0.palmCenter.y * this.height
    const x1 = (1 - h1.palmCenter.x) * this.width
    const y1 = h1.palmCenter.y * this.height

    // Control point: midpoint with 20px sag
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2 + 20

    const { ctx } = this

    // Glow stroke (wider, more transparent)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(mx, my, x1, y1)
    ctx.strokeStyle = SILK_GLOW_COLOR
    ctx.lineWidth = 8
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
