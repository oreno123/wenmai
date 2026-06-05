import { useRef, useEffect } from 'react'

/**
 * 熔金光轨 - 粗厚版
 * 2条对角线 molten gold trails，bloom 拉满
 */
export default function GoldSilkCanvas() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w, h

    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const trails = [
      { points: makeDiag(w, h, 0.05, 0.55), width: 35, speed: 0.05, phase: 0 },
      { points: makeDiag(w, h, 0.45, 0.9), width: 28, speed: 0.04, phase: 2.5 },
    ]

    function makeDiag(w, h, y0, y1) {
      const n = 8
      return Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1)
        return {
          x: t * w * 1.4 - w * 0.2,
          y: h * y0 + (h * (y1 - y0)) * t + (Math.random() - 0.5) * 50,
        }
      })
    }

    function curve(ctx, pts) {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2
        const yc = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    }

    function animate() {
      const t = Date.now() * 0.001
      ctx.clearRect(0, 0, w, h)

      trails.forEach(tr => {
        tr.points.forEach((p, i) => {
          p.x += Math.sin(t * tr.speed + tr.phase + i * 0.8) * 0.12
          p.y += Math.cos(t * tr.speed * 0.4 + tr.phase + i * 0.6) * 0.08
        })

        // 层1: 大范围 bloom
        ctx.save()
        curve(ctx, tr.points)
        ctx.strokeStyle = 'rgba(201, 162, 60, 0.02)'
        ctx.lineWidth = tr.width * 6
        ctx.lineCap = 'round'
        ctx.filter = `blur(${tr.width * 1.2}px)`
        ctx.stroke()
        ctx.restore()

        // 层2: 主体光带
        ctx.save()
        curve(ctx, tr.points)
        const g = ctx.createLinearGradient(0, 0, w, 0)
        g.addColorStop(0, 'rgba(201, 162, 60, 0)')
        g.addColorStop(0.15, 'rgba(201, 162, 60, 0.05)')
        g.addColorStop(0.4, 'rgba(232, 200, 74, 0.08)')
        g.addColorStop(0.5, 'rgba(255, 240, 176, 0.1)')
        g.addColorStop(0.6, 'rgba(232, 200, 74, 0.08)')
        g.addColorStop(0.85, 'rgba(201, 162, 60, 0.05)')
        g.addColorStop(1, 'rgba(201, 162, 60, 0)')
        ctx.strokeStyle = g
        ctx.lineWidth = tr.width
        ctx.lineCap = 'round'
        ctx.filter = `blur(${tr.width * 0.3}px)`
        ctx.stroke()
        ctx.restore()

        // 层3: 核心亮线
        ctx.save()
        curve(ctx, tr.points)
        ctx.strokeStyle = 'rgba(255, 240, 176, 0.08)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.filter = 'blur(1px)'
        ctx.stroke()
        ctx.restore()
      })

      animRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => { window.removeEventListener('resize', resize); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', inset: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 999,
      mixBlendMode: 'screen',
    }} />
  )
}
