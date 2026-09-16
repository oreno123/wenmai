import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, useGLTF } from '@react-three/drei'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'

/* ── 镇馆五鼎（全本地 rawfile，秒开）── */
/* tune：摄影测量 GLB 材质缺 metal/rough（glTF 默认 1.0/1.0=全金属全粗糙→贴图变黑绿），
   必须显式覆盖。绿锈=矿物非金属，低 metal 让贴图漫反射出来；错金银鼎保金属度让金银纹闪 */
/* 重资产走 CDN（服务器出口 ~3Mbps，7MB GLB 同源冷载 20s+）；本地预览与鸿蒙 rawfile 走同源 */
const CDN_BASE = location.hostname === 'wenmai.ruoziqing.cn' ? 'https://wmstatic.ruoziqing.cn' : ''
const DINGS = [
  { id: 'ding_warring', name: '错金银鼎', dynasty: '战国 · 前5世纪', glb: `${CDN_BASE}/relic/m/ding_warring/model.glb`, thumb: `${CDN_BASE}/relic/m/ding_warring/thumb.png`, tune: { metal: 0.55, rough: 0.5 } },
  { id: 'ding_shang', name: '兽纹鼎', dynasty: '商 · 前12世纪', glb: `${CDN_BASE}/relic/m/ding_shang/model.glb`, thumb: `${CDN_BASE}/relic/m/ding_shang/thumb.png`, tune: { metal: 0.3, rough: 0.62 } },
  { id: 'ding_west_zhou', name: '大克鼎', dynasty: '西周中期 · 孝王时期', glb: `${CDN_BASE}/relic/m/ding_west_zhou/model.glb`, thumb: `${CDN_BASE}/relic/m/ding_west_zhou/thumb.png`, tune: { metal: 0.3, rough: 0.62 } },
  { id: 'liding', name: '大盂鼎', dynasty: '西周早期 · 康王时期', glb: `${CDN_BASE}/relic/m/liding/model.glb`, thumb: `${CDN_BASE}/relic/m/liding/thumb.png`, tune: { metal: 0.25, rough: 0.65 } },
  { id: 'shengding', name: '升鼎', dynasty: '春秋 · 约前575年', glb: `${CDN_BASE}/relic/m/shengding/model.glb`, thumb: `${CDN_BASE}/relic/m/shengding/thumb.png`, tune: { metal: 0.3, rough: 0.62 } },
]

/* WebGL 一次性检测：模拟器/无 GPU 环境走降级静态卡 */
let webglOK = null
function hasWebGL() {
  if (webglOK !== null) return webglOK
  try {
    const c = document.createElement('canvas')
    webglOK = Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { webglOK = false }
  return webglOK
}

/* 手势状态桥：DOM 层手势写，Canvas 内自转帧读 */
const gesture = { active: false, dragRotY: 0, tilt: 0 }

function Ding({ glb, tune, onReady, onTap }) {
  const { scene } = useGLTF(glb)
  const groupRef = useRef(null)
  const autoRef = useRef(0)
  const bornRef = useRef(0)

  const obj = useMemo(() => {
    const root = scene.clone(true)
    root.rotation.set(0, 0, 0)
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const s = 2.4 / Math.max(size.x, size.y, size.z)
    root.scale.setScalar(s)
    root.position.set(-center.x * s, -center.y * s, -center.z * s)
    return { root, halfH: (size.y * s) / 2 }
  }, [scene])

  useEffect(() => {
    obj.root.traverse(c => {
      if (!c.isMesh) return
      const src = c.material
      const photo = Boolean(src?.map)
      // GLB 自带材质直接用（保留全部 PBR 通道）；无贴图扫描件才兜底铜色材质
      if (photo) {
        if (src.isMeshStandardMaterial || src.isMeshPhysicalMaterial) {
          // 摄影测量贴图普遍偏暗（黑漆古底色+高roughness），反射环境拉高才不沉底
          src.envMapIntensity = 1.35
          if (tune) {
            src.metalness = tune.metal
            src.roughness = tune.rough
          }
          return
        }
        const mat = new THREE.MeshStandardMaterial({
          map: src.map, normalMap: src.normalMap ?? undefined,
          metalness: 0.24, roughness: 0.52,
        })
        mat.envMapIntensity = 0.85
        c.material = mat
      } else {
        const mat = new THREE.MeshStandardMaterial({
          color: '#c99a5f', metalness: 0.72, roughness: 0.42,
          emissive: new THREE.Color('#3a2a12'), emissiveIntensity: 0.55,
        })
        mat.envMapIntensity = 0.85
        c.material = mat
      }
    })
    // 等两帧让 Canvas 真正画出首帧，再撤 thumb——避免"加载完就切但画面还空着"的空窗
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => onReady?.())
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [obj, onReady])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    // 入场：前 0.8s 从微下方 easeOut 升到位（揭幕感）
    if (bornRef.current < 1) {
      bornRef.current = Math.min(1, bornRef.current + dt / 0.8)
      const t = bornRef.current
      const e = 1 - Math.pow(1 - t, 3)
      g.position.y = (obj.halfH - 1.05) - 0.18 * (1 - e)
    }
    // 无手势时缓慢自转；拖拽期间冻结自转让手感跟手
    if (!gesture.active) autoRef.current += dt * 0.16
    g.rotation.y = autoRef.current + gesture.dragRotY
    // 俯仰轻弹回正
    gesture.tilt *= gesture.active ? 1 : 0.88
    g.rotation.x = gesture.tilt
  })

  return (
    <group ref={groupRef} position={[0, obj.halfH - 1.05, 0]}>
      <primitive
        object={obj.root}
        onPointerUp={(e) => {
          e.stopPropagation()
          if (!gesture.moved) onTap?.()
        }}
      />
    </group>
  )
}

/** 程序化环境反射（RoomEnvironment，无网络请求） */
function EnvLight() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.06)
    scene.environment = env.texture
    return () => {
      env.dispose()
      pmrem.dispose()
      scene.environment = null
    }
  }, [gl, scene])
  return null
}

function EnvRig() {
  return (
    <>
      <ambientLight intensity={0.24} />
      <directionalLight position={[4, 6, 3]} intensity={1.4} color="#fff0d0" />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#9ed8e8" />
      {/* 轮廓光：后侧暖白勾边，把深色器从黑底里拉出来 */}
      <directionalLight position={[-2, 4, -5]} intensity={1.4} color="#ffe8c0" />
      <pointLight position={[0, -0.2, 4]} intensity={0.5} color="#ffffff" />
      <ContactShadows
        position={[0, -1.06, 0]}
        opacity={0.62}
        scale={7}
        blur={2.6}
        far={3.2}
        resolution={512}
        color="#050302"
      />
    </>
  )
}

export default function HomeHero3D({ navigate, fallback }) {
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const firstLoadRef = useRef(true)
  const ding = DINGS[idx]

  // 后台预载下一尊：等首件就绪后再启动，不与首载抢主线程
  useEffect(() => {
    if (!loaded) return
    useGLTF.preload(DINGS[(idx + 1) % DINGS.length].glb)
  }, [idx, loaded])

  // 首载完成后再允许换鼎时用 thumb 过渡；首屏自己不显示 thumb（空舞台揭幕）
  const markLoaded = useCallback(() => {
    firstLoadRef.current = false
    setLoaded(true)
  }, [])

  if (!hasWebGL()) return fallback

  const onPointerDown = (e) => {
    gesture.active = true
    gesture.moved = false
    gesture.x0 = e.clientX
    gesture.y0 = e.clientY
    gesture.t0 = performance.now()
    gesture.rotY0 = gesture.dragRotY
    gesture.tilt0 = gesture.tilt
    gesture.axis = null
  }
  const onPointerMove = (e) => {
    if (!gesture.active) return
    const dx = e.clientX - gesture.x0
    const dy = e.clientY - gesture.y0
    if (!gesture.axis) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      return
    }
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) gesture.moved = true
    if (gesture.axis === 'h') {
      gesture.dragRotY = gesture.rotY0 + dx * 0.008
    } else {
      gesture.tilt = Math.max(-0.35, Math.min(0.35, gesture.tilt0 + dy * 0.004))
    }
  }
  const finish = (e, cancelled) => {
    if (!gesture.active) return
    const dt = performance.now() - gesture.t0
    const dx = e.clientX - gesture.x0
    const dy = e.clientY - gesture.y0
    gesture.active = false
    if (cancelled) return
    // 快甩水平 → 换器
    if (gesture.axis === 'h' && dt < 280 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
      go(dx < 0 ? 1 : -1)
    }
  }

  const go = (delta) => {
    gesture.dragRotY = 0
    setLoaded(false)
    setIdx(i => (i + delta + DINGS.length) % DINGS.length)
  }

  return (
    <div
      style={{ position: 'relative', height: '62vh', minHeight: 420, touchAction: 'pan-y', userSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
    >
      {/* 底色：暖黑到页面底渐隐 + 鎏金微光 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 42%, rgba(242,213,138,0.10), transparent 55%), linear-gradient(180deg, #171208 0%, #0F0F10 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/patterns/yunlei.webp)',
        backgroundSize: 300, backgroundRepeat: 'repeat',
        opacity: 0.05, pointerEvents: 'none',
      }} />

      {/* 换鼎过渡时才显示 thumb 占位；首屏走空舞台揭幕，不放图 */}
      <AnimatePresence>
        {!loaded && !firstLoadRef.current && (
          <motion.div
            key={ding.id + '-thumb'}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.45 } }}
            style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <img src={ding.thumb} alt={ding.name}
              style={{ height: '58%', objectFit: 'contain', filter: 'brightness(0.8) saturate(0.9)' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 加载指示：空舞台/换鼎时呼吸字 */}
      {!loaded && (
        <motion.div
          animate={{ opacity: [0.3, 0.85, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: '34%', left: 0, right: 0, textAlign: 'center',
            fontSize: 10, letterSpacing: '0.4em', textIndent: '0.4em', color: 'rgba(212,175,106,0.9)',
            pointerEvents: 'none', zIndex: 2,
          }}
        >
          鼎 然 入 场
        </motion.div>
      )}

      <Canvas
        camera={{ position: [0, 0.5, 3.6], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.22, alpha: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <Ding key={ding.id} glb={ding.glb} tune={ding.tune} onReady={markLoaded} onTap={() => navigate('/relic')} />
        </Suspense>
        <EnvLight />
        <EnvRig />
      </Canvas>

      {/* 顶部衔接遮罩 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 70,
        background: 'linear-gradient(180deg, rgba(15,15,16,0.9), transparent)',
        pointerEvents: 'none',
      }} />

      {/* 竖排题签 */}
      <div style={{
        position: 'absolute', top: 84, right: 22, zIndex: 2,
        writingMode: 'vertical-rl', display: 'flex', flexDirection: 'column', alignItems: 'center',
        textShadow: '0 2px 18px rgba(0,0,0,0.85)', pointerEvents: 'none',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={ding.id}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.3em', color: '#F2D58A' }}>
              {ding.name}
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.24em', color: 'var(--color-text-secondary)', marginTop: 10 }}>
              {ding.dynasty}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 两侧换鼎箭头（大命中区） */}
      {([['left', -1, 'M15 18l-6-6 6-6'], ['right', 1, 'M9 18l6-6-6-6']].map(([side, delta, path]) => (
        <motion.button
          key={side}
          whileTap={{ scale: 0.9 }}
          onClick={() => go(delta)}
          aria-label={delta < 0 ? '上一尊' : '下一尊'}
          style={{
            position: 'absolute', top: '46%', [side]: 12, zIndex: 3,
            width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,15,16,0.35)', color: '#F2D58A',
            border: '1px solid rgba(212,175,106,0.35)',
            backdropFilter: 'blur(4px)', cursor: 'pointer', padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={path} />
          </svg>
        </motion.button>
      )))}

      {/* 底部：滑动提示 + 分页点 + 拍照 CTA */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: '0 20px 18px',
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(212,175,106,0.55)' }}>
          ‹ 滑动换鼎 · 上手转它 ›
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {DINGS.map((d, i) => (
            <button key={d.id} onClick={() => { if (i !== idx) go(i - idx) }}
              aria-label={d.name}
              style={{
                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              }}>
              <span style={{
                display: 'block', width: i === idx ? 16 : 5, height: 5, borderRadius: 3,
                background: i === idx ? '#F2D58A' : 'rgba(212,175,106,0.45)',
                transition: 'all 0.3s',
              }} />
            </button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/photo-match')}
          style={{
            background: 'rgba(15,15,16,0.4)', color: '#F2D58A',
            border: '1px solid rgba(212,175,106,0.5)',
            borderRadius: 3, padding: '10px 30px',
            fontSize: 14, letterSpacing: '0.5em', textIndent: '0.5em',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            backdropFilter: 'blur(4px)',
          }}
        >
          拍 照 识 纹
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
