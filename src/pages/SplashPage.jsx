import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../shaders/cloudTrain'
import { useNavigate } from '../components/common/Router'

export default function SplashPage() {
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const dpr = renderer.getPixelRatio()
    const uniforms = {
      u_resolution: { value: new THREE.Vector3(window.innerWidth * dpr, window.innerHeight * dpr, 1.0) },
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

    // Load noise texture
    fetch('/shaders/noise_base64.txt')
      .then(r => r.text())
      .then(b64 => {
        if (disposed) return
        const img = new Image()
        img.onload = () => {
          const tex = new THREE.Texture(img)
          tex.wrapS = THREE.RepeatWrapping
          tex.wrapT = THREE.RepeatWrapping
          tex.minFilter = THREE.NearestFilter
          tex.magFilter = THREE.NearestFilter
          tex.needsUpdate = true
          uniforms.u_noiseTexture.value = tex
          uniforms.u_noiseSize.value.set(img.width, img.height)
        }
        img.src = b64.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`
      })

    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight
      renderer.setSize(w, h)
      uniforms.u_resolution.value.set(w * dpr, h * dpr, 1.0)
    }
    window.addEventListener('resize', onResize)

    let raf
    const animate = () => {
      if (disposed) return
      raf = requestAnimationFrame(animate)
      uniforms.u_time.value += 0.016
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      if (uniforms.u_noiseTexture.value) uniforms.u_noiseTexture.value.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  const enter = () => {
    setFading(true)
    setTimeout(() => navigate('/landing'), 800)
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

      {/* Dark overlay for readability */}
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
