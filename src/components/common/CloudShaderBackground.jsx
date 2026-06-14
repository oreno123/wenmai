import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../../shaders/cloudTrain'

/**
 * Continuously renders the cloud/fluid shader used by Splash — same warbling
 * dye-in-water feel as xhs-rag's fluid bg, but runs inside the project's
 * existing Three.js setup so there are no WebGL context conflicts.
 *
 * Renders at 40% resolution + CSS blur for a soft, dreamlike quality without
 * burning the GPU. Throttled to 30 fps.
 */
export default function CloudShaderBackground({ opacity = 0.6, blur = 1.2 }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let raf = null

    const RENDER_SCALE = 0.4
    const W = Math.round(window.innerWidth * RENDER_SCALE)
    const H = Math.round(window.innerHeight * RENDER_SCALE)

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(1)
    renderer.setSize(W, H, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const canvas = renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.filter = `blur(${blur}px)`
    container.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const uniforms = {
      u_resolution: { value: new THREE.Vector3(W, H, 1.0) },
      u_time: { value: 0.0 },
      u_noiseTexture: { value: new THREE.Texture() },
      u_noiseSize: { value: new THREE.Vector2(1.0, 1.0) },
      u_noiseStrength: { value: 1.9 },
    }

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })
    scene.add(new THREE.Mesh(geometry, material))

    let lastTime = 0
    const FRAME_INTERVAL = 1000 / 30
    const animate = (now) => {
      if (disposed) return
      if (now - lastTime < FRAME_INTERVAL) {
        raf = requestAnimationFrame(animate)
        return
      }
      lastTime = now
      uniforms.u_time.value += 0.016
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }

    let tex
    fetch('/shaders/noise_base64.txt')
      .then(r => r.text())
      .then(b64 => {
        if (disposed) return
        const img = new Image()
        img.onload = () => {
          if (disposed) return
          tex = new THREE.Texture(img)
          tex.wrapS = THREE.RepeatWrapping
          tex.wrapT = THREE.RepeatWrapping
          tex.minFilter = THREE.NearestFilter
          tex.magFilter = THREE.NearestFilter
          tex.needsUpdate = true
          uniforms.u_noiseTexture.value = tex
          uniforms.u_noiseSize.value.set(img.width, img.height)
          raf = requestAnimationFrame(animate)
        }
        img.src = b64.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`
      })

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      geometry.dispose()
      material.dispose()
      try {
        if (tex?.dispose) tex.dispose()
      } catch {}
      renderer.dispose()
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
  }, [blur])

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
