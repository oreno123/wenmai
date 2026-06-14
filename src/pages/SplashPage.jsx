import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../shaders/cloudTrain'
import { useNavigate } from '../components/common/Router'
import { useAuth } from '../lib/auth'

export default function SplashPage() {
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false

    // Render at 25% resolution — clouds are soft, low-res is invisible
    const RENDER_SCALE = 0.25
    const W = Math.round(window.innerWidth * RENDER_SCALE)
    const H = Math.round(window.innerHeight * RENDER_SCALE)

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(1)
    renderer.setSize(W, H, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const canvas = renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.filter = 'blur(1.5px)'
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

    const cleanup = () => {
      geometry.dispose()
      material.dispose()
      try {
        if (uniforms.u_noiseTexture.value && uniforms.u_noiseTexture.value.dispose) {
          uniforms.u_noiseTexture.value.dispose()
        }
      } catch {}
      renderer.dispose()
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }

    fetch('/shaders/noise_base64.txt')
      .then(r => r.text())
      .then(b64 => {
        if (disposed) return
        const img = new Image()
        img.onload = () => {
          if (disposed) return
          const tex = new THREE.Texture(img)
          tex.wrapS = THREE.RepeatWrapping
          tex.wrapT = THREE.RepeatWrapping
          tex.minFilter = THREE.NearestFilter
          tex.magFilter = THREE.NearestFilter
          tex.needsUpdate = true
          uniforms.u_noiseTexture.value = tex
          uniforms.u_noiseSize.value.set(img.width, img.height)

          // Throttle to 30fps, run for 3 seconds, then snapshot
          let frame = 0
          const TOTAL_FRAMES = 90 // 3s @ 30fps
          const FRAME_INTERVAL = 1000 / 30
          let lastTime = 0

          const animate = (now) => {
            if (disposed) return
            if (now - lastTime < FRAME_INTERVAL) {
              requestAnimationFrame(animate)
              return
            }
            lastTime = now
            uniforms.u_time.value += 0.016
            renderer.render(scene, camera)
            frame++
            if (frame < TOTAL_FRAMES) {
              requestAnimationFrame(animate)
            } else {
              // Snapshot last frame as static background
              const dataURL = canvas.toDataURL('image/jpeg', 0.85)
              container.style.backgroundImage = `url(${dataURL})`
              container.style.backgroundSize = 'cover'
              container.style.backgroundPosition = 'center'
              cleanup()
            }
          }
          requestAnimationFrame(animate)
        }
        img.src = b64.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`
      })

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  const enter = () => {
    setFading(true)
    // Send logged-out users to auth first so they understand the project
    // has an account system; logged-in users skip straight to Home.
    setTimeout(() => navigate(user ? '/home' : '/auth'), 800)
  }

  return (
    <div
      onClick={enter}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        cursor: 'pointer', overflow: 'hidden',
        background: '#1a0a05',
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.4) 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.8s ease',
        opacity: fading ? 0 : 1,
      }}>
        <div style={{
          fontFamily: 'Noto Serif SC, STSong, Georgia, serif',
          fontSize: 64, color: '#F2D58A', fontWeight: 700,
          letterSpacing: '0.3em',
          textShadow: '0 2px 20px rgba(0,0,0,0.6)',
        }}>
          纹脉
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(242,213,138,0.6)', letterSpacing: '0.2em',
          marginTop: 8, textShadow: '0 1px 8px rgba(0,0,0,0.5)',
        }}>
          PATTERN VEINS
        </div>
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.5)',
          marginTop: 40, letterSpacing: '0.1em',
          textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          点击任意处进入
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
