import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '../components/common/Router'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'

/* ------------------------------------------------------------------ */
/* 资产                                                                */
/* ------------------------------------------------------------------ */

const RELIC = '/relic/gui_lite_vc.glb?v=2'

interface ElemInfo {
  id: number
  level?: 'main' | 'ground'
  bbox: [number, number, number, number]
  area: number
  uv: { u0: number; v0: number; u1: number; v1: number }
}

function useManifest(): ElemInfo[] {
  const [elems, setElems] = useState<ElemInfo[]>([])
  useEffect(() => {
    let alive = true
    fetch('/relic/manifest.json')
      .then((r) => r.json())
      .then((d: { elements: ElemInfo[] }) => {
        if (alive) {
          // 点击命中优先级: 主纹(bbox 小而准)在前
          const sorted = [...d.elements].sort((a, b) => {
            const am = a.level === 'main' ? 0 : 1
            const bm = b.level === 'main' ? 0 : 1
            return am - bm
          })
          setElems(sorted)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return elems
}

/* ------------------------------------------------------------------ */
/* 3D 场景                                                             */
/* ------------------------------------------------------------------ */

interface VesselProps {
  elems: ElemInfo[]
  picked: Set<number>
  hovered: number | null
  onPick: (id: number) => void
  onHover: (id: number | null) => void
}

function pickElem(uv: THREE.Vector2 | undefined, elems: ElemInfo[]): number | null {
  if (!uv) return null
  const imgV = 1 - uv.y
  for (const e of elems) {
    const { u0, v0, u1, v1 } = e.uv
    if (uv.x >= u0 && uv.x <= u1 && imgV >= v0 && imgV <= v1) return e.id
  }
  return null
}

function Vessel({ elems, picked, hovered, onPick, onHover }: VesselProps) {
  const { scene } = useGLTF(RELIC)
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial | null>(null)
  const opRef = useRef<number[]>(new Array(24).fill(0.95))

  const body = useMemo(() => {
    const root = scene.clone(true)
    root.rotation.set(0, 0, 0)
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const s = 2.4 / Math.max(size.x, size.y, size.z)
    root.scale.setScalar(s)
    root.position.set(-center.x * s, -center.y * s, -center.z * s)
    return root
  }, [scene])

  const bodyMesh = useMemo(() => {
    let found: THREE.Mesh | null = null
    body.traverse((c) => {
      if (!found && (c as THREE.Mesh).isMesh) found = c as THREE.Mesh
    })
    return found
  }, [body])

  const { bronzeGeo, baseMat } = useMemo(() => {
    const geo = bodyMesh ? (bodyMesh.geometry as THREE.BufferGeometry) : null
    const mat = new THREE.MeshStandardMaterial({
      color: '#c99a5f',
      metalness: 0.72,
      roughness: 0.42,
      emissive: new THREE.Color('#3a2a12'),
      emissiveIntensity: 0.55,
      map: (bodyMesh?.material as THREE.MeshStandardMaterial)?.map ?? undefined,
    })
    return { bronzeGeo: geo, baseMat: mat }
  }, [bodyMesh])

  // 纹样信息烘焙在 GLB 顶点色 (R=id+1, G=描边), 逐元素淡出用 uniform 数组。
  // 不走纹理链路: 本机 headless ANGLE 下 HTTP 来源纹理 texImage2D 上传全黑。
  const overlayMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOp: { value: new Array(24).fill(0.95) },
        uMainColor: { value: new THREE.Color('#ffd060') },
        uGroundColor: { value: new THREE.Color('#48daba') },
        uEdgeColor: { value: new THREE.Color('#ffffe6') },
        uNMain: { value: 16 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 color;
        varying vec4 vColor;
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOp[24];
        uniform vec3 uMainColor;
        uniform vec3 uGroundColor;
        uniform vec3 uEdgeColor;
        uniform float uNMain;
        varying vec4 vColor;
        void main() {
          float cr = vColor.r > 1.0 ? vColor.r / 255.0 : vColor.r;   // COLOR_0 未归一化兼容
          float id = floor(cr * 255.0 + 0.5) - 1.0;
          if (id < -0.5) discard;
          int idx = int(id + 0.5);
          float op = 0.0;
          for (int i = 0; i < 24; i++) {
            if (i == idx) op = uOp[i];
          }
          if (op < 0.01) discard;
          vec3 base = id < uNMain - 0.5 ? uMainColor : uGroundColor;
          vec3 c = vColor.g > 0.5 ? mix(base, uEdgeColor, 0.85) : base;
          gl_FragColor = vec4(c, op);
        }`,
      transparent: true,
      depthWrite: false,
    })
    return mat
  }, [])

  matRef.current = overlayMat

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 6)
    let dirty = false
    for (const e of elems) {
      if (e.id > 23) continue
      const target = picked.has(e.id) ? 0 : hovered === e.id ? 1 : 0.95
      const cur = opRef.current[e.id]
      if (Math.abs(target - cur) > 0.002) {
        opRef.current[e.id] = cur + (target - cur) * k
        dirty = true
      }
    }
    if (dirty && matRef.current) {
      ;(matRef.current.uniforms.uOp.value as number[]).splice(0, 24, ...opRef.current)
    }
    if (groupRef.current && hovered === null) {
      groupRef.current.rotation.y += dt * 0.12
    }
  })

  const handleClick = (ev: ThreeEvent<MouseEvent>) => {
    ev.stopPropagation()
    const id = pickElem(ev.uv, elems)
    if (id !== null) onPick(id)
  }
  const handleMove = (ev: ThreeEvent<PointerEvent>) => {
    const id = pickElem(ev.uv, elems)
    onHover(id)
    document.body.style.cursor = id !== null && !picked.has(id) ? 'pointer' : 'default'
  }

  return (
    <group ref={groupRef}>
      {bronzeGeo && (
        <mesh
          geometry={bronzeGeo}
          material={baseMat}
          onClick={handleClick}
          onPointerMove={handleMove}
          onPointerOut={() => {
            onHover(null)
            document.body.style.cursor = 'default'
          }}
        />
      )}
      {bronzeGeo && (
        <mesh
          geometry={bronzeGeo}
          material={overlayMat}
          renderOrder={2}
          onClick={handleClick}
          onPointerMove={handleMove}
        />
      )}
    </group>
  )
}

function Rig() {
  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[4, 6, 3]} intensity={3.2} color="#fff0d0" />
      <directionalLight position={[-5, 3, -4]} intensity={1.0} color="#9ed8e8" />
      <directionalLight position={[0, -4, 4]} intensity={0.6} color="#ffd98a" />
      <pointLight position={[0, 0, 4]} intensity={0.5} color="#ffffff" />
      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={6}
        minPolarAngle={0.4}
        maxPolarAngle={2.4}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */

export default function RelicPage() {
  const navigate = useNavigate()
  const elems = useManifest()
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [hovered, setHovered] = useState<number | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const handlePick = (id: number) => {
    if (picked.has(id)) return
    setPicked((prev) => new Set(prev).add(id))
    const e = elems.find((x) => x.id === id)
    const name = e?.level === 'ground' ? '地纹云雷' : '主纹元素'
    setFlash(`已提取：${name} · 元素 #${String(id).padStart(2, '0')}`)
    window.setTimeout(() => setFlash(null), 1800)
  }

  const extractAll = () => {
    elems.forEach((e, i) => window.setTimeout(() => handlePick(e.id), i * 240))
  }

  const reset = () => {
    setPicked(new Set())
    setHovered(null)
  }

  const done = picked.size === elems.length

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(1200px 800px at 40% 20%, #2b2317 0%, #171208 65%)',
        color: '#e8dcc0',
        fontFamily: 'inherit',
      }}
    >
      {/* 顶栏 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
          padding: '22px 32px 10px',
          borderBottom: '1px solid rgba(201,162,60,0.18)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 4, color: '#d4af37' }}>
          3D 文物纹样提取
        </h1>
        <span style={{ fontSize: 12.5, opacity: 0.65, letterSpacing: 1 }}>
          数字文物资产 · 曲面展开 · 基因拆解 —— 沉睡在器身上的纹样，一键唤醒
        </span>
        <button
          onClick={() => navigate('/home')}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: '1px solid rgba(201,162,60,0.4)',
            color: '#d4af37',
            borderRadius: 999,
            padding: '5px 16px',
            cursor: 'pointer',
            fontSize: 12.5,
          }}
        >
          返回首页
        </button>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 68px)' }}>
        {/* 3D 视口 */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <Canvas
            camera={{ position: [2.6, 0.9, 3.2], fov: 42 }}
            dpr={[1, 2]}
            gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 2.2 }}
          >
            <color attach="background" args={['#241d13']} />
            <fog attach="fog" args={['#241d13', 8, 16]} />
            <Suspense fallback={null}>
              <Vessel
                elems={elems}
                picked={picked}
                hovered={hovered}
                onPick={handlePick}
                onHover={setHovered}
              />
            </Suspense>
            <Rig />
          </Canvas>

          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(20,16,8,0.85)',
                  border: '1px solid rgba(212,175,55,0.5)',
                  color: '#ffe6a8',
                  padding: '8px 22px',
                  borderRadius: 8,
                  fontSize: 14,
                  letterSpacing: 1,
                  pointerEvents: 'none',
                }}
              >
                {flash}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 操作提示 */}
          <div
            style={{
              position: 'absolute',
              bottom: 84,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 12,
              color: 'rgba(232,220,192,0.5)',
              letterSpacing: 1,
              pointerEvents: 'none',
            }}
          >
            拖动旋转 · 滚轮缩放 · 点击曲面上发光的纹样提取
          </div>

          <div style={{ position: 'absolute', bottom: 84, right: 22, display: 'flex', gap: 10 }}>
            <button
              onClick={extractAll}
              disabled={done}
              style={{
                background: done ? 'rgba(201,162,60,0.15)' : 'linear-gradient(135deg,#d4af37,#a8862f)',
                color: done ? 'rgba(232,220,192,0.4)' : '#1a1408',
                border: 'none',
                borderRadius: 8,
                padding: '10px 22px',
                fontWeight: 700,
                cursor: done ? 'default' : 'pointer',
                fontSize: 13.5,
                letterSpacing: 1,
              }}
            >
              {done ? '已全部提取' : `一键提取全部 (${picked.size}/${elems.length})`}
            </button>
            {picked.size > 0 && (
              <button
                onClick={reset}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(201,162,60,0.35)',
                  color: '#d4af37',
                  borderRadius: 8,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                重置
              </button>
            )}
          </div>
        </div>

        {/* 元素栏 */}
        <aside
          style={{
            width: 320,
            borderLeft: '1px solid rgba(201,162,60,0.18)',
            padding: '20px 22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 14.5, letterSpacing: 2, color: '#d4af37' }}>纹样基因库</span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>{picked.size} / {elems.length}</span>
          </div>

          <AnimatePresence>
            {elems.map((e) =>
              picked.has(e.id) ? (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: 60, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  whileHover={{ scale: 1.04, rotate: -1 }}
                  style={{
                    background: 'rgba(24,19,10,0.7)',
                    border: `1px solid ${
                      e.level === 'ground' ? 'rgba(110,190,170,0.45)' : 'rgba(201,162,60,0.45)'
                    }`,
                    borderRadius: 12,
                    padding: 14,
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/puzzle')}
                >
                  <img
                    src={`/relic/elem_${String(e.id).padStart(2, '0')}.png`}
                    alt={`元素 ${e.id}`}
                    style={{
                      width: 84,
                      height: 84,
                      objectFit: 'contain',
                      filter: `drop-shadow(0 0 10px ${
                        e.level === 'ground'
                          ? 'rgba(110,190,170,0.5)'
                          : 'rgba(212,175,55,0.5)'
                      })`,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, color: '#ffe6a8', display: 'flex', gap: 8, alignItems: 'center' }}>
                      元素 #{String(e.id).padStart(2, '0')}
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: `1px solid ${
                            e.level === 'ground' ? 'rgba(110,190,170,0.5)' : 'rgba(212,175,55,0.5)'
                          }`,
                          color: e.level === 'ground' ? '#8fd8c4' : '#e8c264',
                          letterSpacing: 1,
                        }}
                      >
                        {e.level === 'ground' ? '地纹' : '主纹'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 4, lineHeight: 1.6 }}>
                      面积 {e.area.toLocaleString()} px · 曲面 UV 定位
                      <br />
                      点击送往拼贴画布 →
                    </div>
                  </div>
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>

          {picked.size === 0 && (
            <div
              style={{
                border: '1px dashed rgba(201,162,60,0.3)',
                borderRadius: 12,
                padding: '28px 18px',
                textAlign: 'center',
                fontSize: 12.5,
                opacity: 0.55,
                lineHeight: 2,
              }}
            >
              点击 3D 曲面上发光的纹样
              <br />
              或使用「一键提取全部」
              <br />
              提取的元素将在此列示
            </div>
          )}

          <div
            style={{
              marginTop: 'auto',
              fontSize: 11,
              opacity: 0.4,
              lineHeight: 1.8,
              borderTop: '1px solid rgba(201,162,60,0.15)',
              paddingTop: 12,
            }}
          >
            流水线：圆柱展开 (θ,y) → 形态学开运算分离器型背景 → 残差浮雕 → 连通域拆件。
            演示资产由纹样基因库程序生成，流水线可直接接入博物馆 3D 数字化资产。
          </div>
        </aside>
      </div>
    </div>
  )
}
