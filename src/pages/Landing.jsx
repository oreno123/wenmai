import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../shaders/cloudTrain'
import { useNavigate } from '../components/common/Router'
import { PATTERN_LIBRARY, getAllSeries, getPatternImage } from '../store/patternData'

const PATTERNS_WITH_IMAGES = PATTERN_LIBRARY.filter(p => p.image || p.procedural)

const RARITY_STYLE = {
  common: { bg: 'rgba(26,26,26,0.9)', text: '#8A8A8A', label: 'N' },
  rare: { bg: 'rgba(42,38,30,0.9)', text: '#D4AF6A', label: 'SR' },
  ssr: { bg: 'rgba(140,80,20,0.9)', text: '#F2D58A', label: 'SSR' },
}

const FEATURES = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="28" rx="3" stroke="#D4AF6A" strokeWidth="1.2" />
        <rect x="7" y="7" width="14" height="14" rx="1" stroke="#F2D58A" strokeWidth="0.7" />
        <path d="M14 7 L14 21 M7 14 L21 14" stroke="#D4AF6A" strokeWidth="0.3" opacity="0.6" />
      </svg>
    ),
    title: '抽卡收集',
    desc: '每日免费抽卡，收集从商周到明清的传世纹样',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <path d="M14 3 L25 24 L3 24 Z" stroke="#D4AF6A" strokeWidth="1.2" fill="none" />
        <circle cx="14" cy="17" r="4" stroke="#F2D58A" strokeWidth="0.7" fill="none" />
      </svg>
    ),
    title: '创意工坊',
    desc: '将纹样应用到手机壳、丝巾、茶具等文创产品',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <ellipse cx="14" cy="14" rx="11" ry="5" stroke="#F2D58A" strokeWidth="0.7" />
        <ellipse cx="14" cy="14" rx="11" ry="5" stroke="#D4AF6A" strokeWidth="1.2" transform="rotate(60 14 14)" />
        <ellipse cx="14" cy="14" rx="11" ry="5" stroke="#D4AF6A" strokeWidth="1.2" transform="rotate(-60 14 14)" />
      </svg>
    ),
    title: '3D 实时预览',
    desc: '旋转、缩放，预览纹样在真实产品上的效果',
  },
]

const stagger = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.08 } },
  viewport: { once: true, amount: 0.1 },
}

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
}

/* 回纹装饰 */
function HuiWenDecor({ size = 100, opacity = 0.1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ opacity }}>
      <rect x="5" y="5" width="90" height="90" stroke="#D4AF6A" strokeWidth="0.8" />
      <path d="M5 30 L30 30 L30 5" stroke="#D4AF6A" strokeWidth="0.6" fill="none" />
      <path d="M95 30 L70 30 L70 5" stroke="#D4AF6A" strokeWidth="0.6" fill="none" />
      <path d="M5 70 L30 70 L30 95" stroke="#D4AF6A" strokeWidth="0.6" fill="none" />
      <path d="M95 70 L70 70 L70 95" stroke="#D4AF6A" strokeWidth="0.6" fill="none" />
      <rect x="20" y="20" width="60" height="60" stroke="#D4AF6A" strokeWidth="0.5" />
      <rect x="35" y="35" width="30" height="30" stroke="#D4AF6A" strokeWidth="0.4" />
      <circle cx="50" cy="50" r="8" stroke="#F2D58A" strokeWidth="0.4" />
      <circle cx="50" cy="50" r="2" fill="#D4AF6A" opacity="0.5" />
    </svg>
  )
}

/* 金色分割线 */
function GoldDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,106,0.3))' }} />
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#D4AF6A', opacity: 0.4 }} />
      <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg, rgba(212,175,106,0.3), transparent)' }} />
    </div>
  )
}

function useCloudTrainShader(containerRef) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false

    const W = Math.min(window.innerWidth, 960)
    const H = Math.min(window.innerHeight, 540)

    const renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.setPixelRatio(1)
    renderer.setSize(W, H)
    renderer.outputColorSpace = THREE.SRGBColorSpace

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
      glslVersion: THREE.GLSL3, uniforms, vertexShader, fragmentShader,
    })
    scene.add(new THREE.Mesh(geometry, material))

    const cleanup = () => {
      geometry.dispose(); material.dispose()
      if (uniforms.u_noiseTexture.value) uniforms.u_noiseTexture.value.dispose()
      renderer.dispose()
    }

    fetch('/shaders/noise_base64.txt').then(r => r.text()).then(b64 => {
      if (disposed) return
      const img = new Image()
      img.onload = () => {
        if (disposed) return
        const tex = new THREE.Texture(img)
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping
        tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter
        tex.needsUpdate = true
        uniforms.u_noiseTexture.value = tex
        uniforms.u_noiseSize.value.set(img.width, img.height)

        // Render 60 frames (about 1 second of animation), then snapshot to static image
        let frame = 0
        const TOTAL_FRAMES = 60
        const renderLoop = () => {
          if (disposed) return
          uniforms.u_time.value += 0.03
          renderer.render(scene, camera)
          frame++
          if (frame < TOTAL_FRAMES) {
            requestAnimationFrame(renderLoop)
          } else {
            // Snapshot last frame as static background image
            const dataURL = renderer.domElement.toDataURL('image/jpeg', 0.85)
            container.style.backgroundImage = `url(${dataURL})`
            container.style.backgroundSize = 'cover'
            container.style.backgroundPosition = 'center'
            cleanup()
          }
        }
        requestAnimationFrame(renderLoop)
      }
      img.src = b64.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`
    })

    return () => { disposed = true; cleanup() }
  }, [containerRef])
}

export default function Landing() {
  const navigate = useNavigate()
  const series = getAllSeries()
  const shaderRef = useRef(null)
  useCloudTrainShader(shaderRef)

  return (
    <main style={{ background: 'transparent', overflowX: 'hidden' }}>
      {/* ═══ Hero with shader background ═══ */}
      <header style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: '0 24px', textAlign: 'center',
      }}>
        {/* Shader snapshot background */}
        <div ref={shaderRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, background: '#1a0a05' }} />

        {/* Dark overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.5) 100%)',
          zIndex: 1,
        }} />

        <motion.h1
          initial={{ opacity: 0, y: 20, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '0.25em' }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          style={{
            fontFamily: 'Noto Serif SC, STSong, Georgia, serif',
            fontSize: 48, color: '#F2D58A', fontWeight: 700,
            margin: '20px 0 0', lineHeight: 1, position: 'relative', zIndex: 2,
            textShadow: '0 2px 16px rgba(0,0,0,0.5)',
          }}
        >
          纹脉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          style={{
            fontSize: 11, color: '#D4AF6A', letterSpacing: '0.15em',
            marginTop: 8, opacity: 0.6, position: 'relative', zIndex: 2,
          }}
        >
          PATTERN VEINS
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          style={{
            fontSize: 14, color: '#A0A0A0', lineHeight: 1.8,
            marginTop: 28, letterSpacing: '0.05em', position: 'relative', zIndex: 2,
          }}
        >
          你看见的每一道纹样<br />都是某个人的呼吸
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          style={{ position: 'absolute', bottom: 36, zIndex: 2 }}
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 6 L9 12 L15 6" stroke="#D4AF6A" strokeWidth="1" opacity="0.35" />
            </svg>
          </motion.div>
        </motion.div>
      </header>

      {/* ═══ Pattern Gallery ═══ */}
      <section style={{ padding: '48px 16px 60px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,106,0.08), transparent)',
        }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 28 }}
        >
          <GoldDivider />
          <h2 style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 20, color: '#F5F1E8', letterSpacing: '0.1em' }}>
            千年纹样，触手可及
          </h2>
          <p style={{ fontSize: 12, color: '#A0A0A0', marginTop: 6 }}>六大纹样，跨越商周到明清</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.05 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}
        >
          {PATTERNS_WITH_IMAGES.map(p => {
            const rs = RARITY_STYLE[p.rarity]
            const isSSR = p.rarity === 'ssr'
            const dynasty = p.tags.find(t => t.includes('代') || t.includes('周')) || ''
            return (
              <motion.div key={p.id} variants={fadeUp}
                whileHover={{ scale: 1.02, borderColor: 'rgba(212,175,106,0.35)' }}
                transition={{ duration: 0.2 }}
              >
                <div style={{
                  position: 'relative', borderRadius: 12, overflow: 'hidden',
                  background: 'linear-gradient(145deg, #1E1C16, #14120E)',
                  border: `1px solid ${isSSR ? 'rgba(212,175,106,0.4)' : 'rgba(212,175,106,0.15)'}`,
                  boxShadow: isSSR ? '0 0 20px rgba(212,175,106,0.1)' : 'none',
                  aspectRatio: '1 / 1.15',
                  cursor: 'pointer',
                }}>
                  <img src={getPatternImage(p)} alt={p.name} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '20px 10px 10px',
                    background: 'linear-gradient(transparent, rgba(15,15,16,0.92))',
                  }}>
                    <span style={{ fontSize: 13, color: '#F5F1E8', fontFamily: 'Noto Serif SC, serif' }}>{p.name}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: '#A0A0A0' }}>{dynasty}</span>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: rs.bg, color: rs.text }}>
                        {rs.label}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* ═══ Features ═══ */}
      <section style={{ padding: '48px 16px 56px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,106,0.08), transparent)',
        }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 24 }}
        >
          <GoldDivider />
          <h2 style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 20, color: '#F5F1E8', letterSpacing: '0.1em' }}>
            不只是欣赏
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {FEATURES.map((f, i) => (
            <motion.div key={i} variants={fadeUp}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(26,26,28,0.7), rgba(20,18,14,0.5))',
                border: '1px solid rgba(212,175,106,0.1)',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(145deg, #222220, #1A1A18)',
                  border: '1px solid rgba(212,175,106,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, color: '#F2D58A', fontFamily: 'Noto Serif SC, serif', marginBottom: 3 }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#A0A0A0', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ Series ═══ */}
      <section style={{ padding: '48px 16px 56px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,106,0.08), transparent)',
        }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 24 }}
        >
          <GoldDivider />
          <h2 style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 20, color: '#F5F1E8', letterSpacing: '0.1em' }}>
            九大专集
          </h2>
          <p style={{ fontSize: 12, color: '#A0A0A0', marginTop: 6 }}>每一个系列，都是一段纹样史诗</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.05 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}
        >
          {series.map(s => (
            <motion.div key={s.id} variants={fadeUp}
                whileHover={{ scale: 1.02, borderColor: 'rgba(212,175,106,0.25)' }}
                transition={{ duration: 0.2 }}
              >
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'linear-gradient(145deg, rgba(26,24,20,0.5), rgba(15,14,10,0.3))',
                border: '1px solid rgba(212,175,106,0.08)',
                position: 'relative', overflow: 'hidden',
                cursor: 'pointer',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, rgba(212,175,106,0.25), transparent)`,
                }} />
                <div style={{ fontSize: 13, color: '#F2D58A', fontFamily: 'Noto Serif SC, serif', marginBottom: 3 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 10, color: '#A0A0A0', lineHeight: 1.4 }}>{s.description}</div>
                <div style={{ fontSize: 9, color: '#6A6A6A', marginTop: 5 }}>{s.patterns.length} 枚纹样</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ CTA ═══ */}
      <footer style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: '0 24px', textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(212,175,106,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <HuiWenDecor size={56} opacity={0.07} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontFamily: 'Noto Serif SC, serif', fontSize: 24, color: '#F2D58A',
            letterSpacing: '0.2em', marginTop: 20,
          }}
        >
          踏入纹脉
        </motion.h2>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          whileHover={{ boxShadow: '0 0 32px rgba(212,175,106,0.25)', borderColor: 'rgba(212,175,106,0.7)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/home')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(212,175,106,0.45)',
            borderRadius: 8, padding: '13px 44px',
            color: '#F2D58A', fontSize: 15,
            fontFamily: 'Noto Serif SC, serif',
            letterSpacing: '0.3em', cursor: 'pointer',
            marginTop: 28,
          }}
        >
          开始探索
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            fontSize: 12, color: '#6A6A6A', marginTop: 44,
            letterSpacing: '0.05em', lineHeight: 1.8,
          }}
        >
          你看见的每一道纹样，都是某个人的呼吸
        </motion.p>
      </footer>
    </main>
  )
}
