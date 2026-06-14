import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../../shaders/flowingFluid'

/**
 * Real flowing-fluid background using FBM + domain warping.
 * Renders gold-on-warm-dark swirling dye that moves like ink diffusing
 * in water. Pure programmatic noise — no external textures, no WebGL
 * context conflicts, no mobile GPU compatibility risk.
 */
export default function FluidShaderBackground({ opacity = 0.65, intensity = 1.0 }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let raf = null

    // Match device pixel ratio but cap to keep GPU cost predictable.
    const RENDER_SCALE = 0.5
    const W = Math.round(window.innerWidth * RENDER_SCALE)
    const H = Math.round(window.innerHeight * RENDER_SCALE)

    const renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.setPixelRatio(1)
    renderer.setSize(W, H, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const canvas = renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    container.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.Camera() // ShaderMaterial doesn't actually use it; presence required.

    const uniforms = {
      u_resolution: { value: new THREE.Vector2(W, H) },
      u_time: { value: 0.0 },
      u_intensity: { value: intensity },
      // Gold-on-warm-dark palette — feels traditional Chinese without being literal.
      u_colorBright: { value: new THREE.Color(0.95, 0.83, 0.55) }, // #F2D58A bright gold
      u_colorMid:    { value: new THREE.Color(0.73, 0.42, 0.18) }, // #BC6B2F orange-gold
      u_colorDeep:   { value: new THREE.Color(0.05, 0.03, 0.02) }, // #0A0807 warm near-black
      u_colorAccent: { value: new THREE.Color(0.74, 0.12, 0.16) }, // #BC1F28 red dab
    }

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Throttle to ~30fps for battery friendliness.
    let lastTime = 0
    const FRAME_INTERVAL = 1000 / 30
    const animate = (now) => {
      if (disposed) return
      if (now - lastTime < FRAME_INTERVAL) {
        raf = requestAnimationFrame(animate)
        return
      }
      lastTime = now
      uniforms.u_time.value += 0.05
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
  }, [intensity])

  return (
    <div ref={containerRef} style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity,
      background: '#0A0807',
      zIndex: 0,
    }} />
  )
}
