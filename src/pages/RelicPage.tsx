import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '../components/common/Router'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'

/* ------------------------------------------------------------------ */
/* 资产                                                                */
/* ------------------------------------------------------------------ */

const DEFAULT_MODEL: ModelInfo = {
  id: 'shang_gui',
  name: '青铜簋',
  zh: '簋',
  dynasty: '商 · 公元前12–11世纪',
  glb: '/relic/shang_gui.glb?v=2',
  manifest: '/relic/manifest.json',
}
const MAX_ELEMS = 32
/** 器物底面落点 (世界 y), 接触阴影放这附近 */
const REST_Y = -1.02

interface ElemInfo {
  id: number
  label?: string
  level?: 'main' | 'ground'
  bbox: [number, number, number, number]
  area: number
  uv: { u0: number; v0: number; u1: number; v1: number }
}

interface ModelInfo {
  id: string
  name: string
  zh?: string
  dynasty?: string
  glb: string
  manifest: string
  thumb?: string | null
}

function useModelIndex(): ModelInfo[] {
  const [models, setModels] = useState<ModelInfo[]>([DEFAULT_MODEL])
  useEffect(() => {
    fetch('/relic/index.json')
      .then((r) => r.json())
      .then((d: { models: ModelInfo[] }) => {
        if (Array.isArray(d.models) && d.models.length > 0) setModels(d.models)
      })
      .catch(() => {})
  }, [])
  return models
}

function useManifest(url: string): ElemInfo[] {
  const [elems, setElems] = useState<ElemInfo[]>([])
  useEffect(() => {
    let alive = true
    setElems([])
    fetch(url)
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
  }, [url])
  return elems
}

/* ------------------------------------------------------------------ */
/* 3D 场景                                                             */
/* ------------------------------------------------------------------ */

interface VesselProps {
  glb: string
  elems: ElemInfo[]
  picked: Set<number>
  hovered: number | null
  onPick: (id: number) => void
  onHover: (id: number | null) => void
}

function pickElem(
  ev: { uv?: THREE.Vector2; face?: { a: number } | null },
  elems: ElemInfo[],
  geo: THREE.BufferGeometry | null,
): number | null {
  // 首选: 命中面顶点色里的元素 ID (摄影测量 UV 岛拥挤, UV 矩形会误触)
  if (ev.face && geo) {
    const col = geo.getAttribute('color')
    if (col) {
      const r = col.getX(ev.face.a)
      const cr = r > 1 ? r / 255 : r
      const id = Math.floor(cr * 255 + 0.5) - 1
      if (id >= 0) return id
      return null
    }
  }
  // 兜底: UV 矩形包含
  if (!ev.uv) return null
  const imgV = 1 - ev.uv.y
  for (const e of elems) {
    const { u0, v0, u1, v1 } = e.uv
    if (ev.uv.x >= u0 && ev.uv.x <= u1 && imgV >= v0 && imgV <= v1) return e.id
  }
  return null
}

function Vessel({ glb, elems, picked, hovered, onPick, onHover }: VesselProps) {
  const { scene } = useGLTF(glb)
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial | null>(null)
  const opRef = useRef<number[]>(new Array(MAX_ELEMS).fill(1))

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
    root.updateMatrixWorld(true)
    return { root, halfH: (size.y * s) / 2 }
  }, [scene])

  const bodyMesh = useMemo(() => {
    let found: THREE.Mesh | null = null
    body.root.traverse((c) => {
      if (!found && (c as THREE.Mesh).isMesh) found = c as THREE.Mesh
    })
    return found
  }, [body])

  const { bronzeGeo, baseMat } = useMemo(() => {
    // body 里算好的归一化矩阵 (缩放至 2.4 + 居中) 烘进几何, JSX mesh 不再复用原始小尺寸几何
    let geo: THREE.BufferGeometry | null = null
    if (bodyMesh) {
      geo = bodyMesh.geometry.clone()
      geo.applyMatrix4(bodyMesh.matrixWorld)
    }
    const src = bodyMesh?.material as THREE.MeshStandardMaterial | undefined
    const photo = Boolean(src?.map)
    // 铜锈包浆是介质表面: 低金属度 + 中粗糙度, 靠环境贴图出反射而不是直射高光
    const mat = new THREE.MeshStandardMaterial({
      color: photo ? '#ffffff' : '#c99a5f',
      metalness: photo ? 0.24 : 0.72,
      roughness: photo ? 0.52 : 0.42,
      emissive: new THREE.Color(photo ? '#1a1208' : '#3a2a12'),
      emissiveIntensity: photo ? 0.12 : 0.55,
      map: src?.map ?? undefined,
      normalMap: src?.normalMap ?? undefined,
    })
    mat.envMapIntensity = 0.85
    return { bronzeGeo: geo, baseMat: mat }
  }, [bodyMesh])

  // 纹样信息烘焙在 GLB 顶点色 (R=id+1, G=描边), 逐元素淡出用 uniform 数组。
  // 视觉走「错金银」: 常态只留金线 + 极淡填充随呼吸脉动, hover 亮起, 提取后淡出。
  const overlayMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOp: { value: new Array(MAX_ELEMS).fill(1) },
        uMainColor: { value: new THREE.Color('#f0c060') },
        uGroundColor: { value: new THREE.Color('#5ec8ae') },
        uEdgeColor: { value: new THREE.Color('#fff3c9') },
        uNMain: { value: MAX_ELEMS },
        uTime: { value: 0 },
        uHoverId: { value: -1 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 color;
        varying vec4 vColor;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vColor = color;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOp[${MAX_ELEMS}];
        uniform vec3 uMainColor;
        uniform vec3 uGroundColor;
        uniform vec3 uEdgeColor;
        uniform float uNMain;
        uniform float uTime;
        uniform float uHoverId;
        varying vec4 vColor;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float cr = vColor.r > 1.0 ? vColor.r / 255.0 : vColor.r;   // COLOR_0 未归一化兼容
          float id = floor(cr * 255.0 + 0.5) - 1.0;
          if (id < -0.5) discard;
          int idx = int(id + 0.5);
          float op = 0.0;
          for (int i = 0; i < ${MAX_ELEMS}; i++) {
            if (i == idx) op = uOp[i];
          }
          if (op < 0.01) discard;

          float line = smoothstep(0.10, 0.90, vColor.g);
          bool isMain = id < uNMain - 0.5;
          vec3 base = isMain ? uMainColor : uGroundColor;

          float pulse = 0.5 + 0.5 * sin(uTime * 1.5 + id * 0.9);
          float hov = abs(id - uHoverId) < 0.25 ? 1.0 : 0.0;

          float fillA = (isMain ? 0.085 : 0.05) * (0.72 + 0.28 * pulse);
          fillA = mix(fillA, 0.45, hov);
          float lineA = mix(0.46 + 0.20 * pulse, 0.95, hov);

          float a = max(fillA * (1.0 - line), line * lineA) * op;

          float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.5);
          a = min(a + fr * 0.16 * op, 1.0);

          vec3 c = mix(base, uEdgeColor, 0.22 + 0.45 * line + 0.25 * fr);
          gl_FragColor = vec4(c, a);
        }`,
      transparent: true,
      depthWrite: false,
    })
    return mat
  }, [])

  matRef.current = overlayMat

  useEffect(() => {
    // main 元素排在前 (manifest 已按此序), shader 按 id<uNMain 区分主纹/地纹色
    const nMain = elems.filter((e) => e.level !== 'ground').length
    if (matRef.current) matRef.current.uniforms.uNMain.value = nMain
  }, [elems])

  useFrame((state, dt) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
      const k = Math.min(1, dt * 5)
      let dirty = false
      for (const e of elems) {
        if (e.id >= MAX_ELEMS) continue
        const target = picked.has(e.id) ? 0 : 1
        const cur = opRef.current[e.id]
        if (Math.abs(target - cur) > 0.002) {
          opRef.current[e.id] = cur + (target - cur) * k
          dirty = true
        }
      }
      if (dirty) {
        ;(matRef.current.uniforms.uOp.value as number[]).splice(0, MAX_ELEMS, ...opRef.current)
      }
      matRef.current.uniforms.uHoverId.value = hovered ?? -1
    }
    if (groupRef.current && hovered === null) {
      groupRef.current.rotation.y += dt * 0.1
    }
  })

  const handleClick = (ev: ThreeEvent<MouseEvent>) => {
    ev.stopPropagation()
    const id = pickElem(ev, elems, bronzeGeo)
    if (id !== null) onPick(id)
  }
  const handleMove = (ev: ThreeEvent<PointerEvent>) => {
    const id = pickElem(ev, elems, bronzeGeo)
    onHover(id)
    document.body.style.cursor = id !== null && !picked.has(id) ? 'pointer' : 'default'
  }

  return (
    <group ref={groupRef} position={[0, REST_Y + body.halfH, 0]}>
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

/** 程序化环境反射 (RoomEnvironment, 无网络请求 — headless/离线安全) */
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

function Rig() {
  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight position={[4, 6, 3]} intensity={1.5} color="#fff0d0" />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#9ed8e8" />
      <directionalLight position={[-2, 4, -5]} intensity={0.7} color="#ffd9a0" />
      <pointLight position={[0, 0.4, 4]} intensity={0.3} color="#ffffff" />
      <ContactShadows
        position={[0, REST_Y - 0.01, 0]}
        opacity={0.62}
        scale={7.5}
        blur={2.6}
        far={3.2}
        resolution={512}
        color="#050302"
      />
      <OrbitControls
        enablePan={false}
        target={[0, REST_Y + 0.85, 0]}
        minDistance={2.2}
        maxDistance={6}
        minPolarAngle={0.4}
        maxPolarAngle={2.0}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */

const GOLD = '#e0b95c'
const JADE = '#5ec8ae'

export default function RelicPage() {
  const navigate = useNavigate()
  const models = useModelIndex()
  const [modelId, setModelId] = useState<string>(() => {
    const h = window.location.hash
    const q = h.indexOf('?')
    return (new URLSearchParams(q >= 0 ? h.slice(q + 1) : '')).get('m') ?? DEFAULT_MODEL.id
  })
  const model = models.find((m) => m.id === modelId) ?? models[0]
  const elems = useManifest(model.manifest)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [hovered, setHovered] = useState<number | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const switchModel = (id: string) => {
    if (id === modelId) {
      setSwitcherOpen(false)
      return
    }
    setModelId(id)
    window.location.hash = `#/relic?m=${id}`
    setPicked(new Set())
    setHovered(null)
    setFlash(null)
    setSwitcherOpen(false)
  }

  const handlePick = (id: number) => {
    if (picked.has(id)) return
    setPicked((prev) => new Set(prev).add(id))
    const e = elems.find((x) => x.id === id)
    const name = e?.label ?? (e?.level === 'ground' ? '地纹云雷' : '主纹元素')
    setFlash(`已提取：${name} · 元素 #${String(id).padStart(2, '0')}`)
    window.setTimeout(() => setFlash(null), 1800)
  }

  const extractAll = () => {
    elems.forEach((e, i) => window.setTimeout(() => handlePick(e.id), i * 240))
  }

  // 截图/测试钩子: #/relic-autoextract
  useEffect(() => {
    if (!location.hash.includes('autoextract') || elems.length === 0) return
    const timers = elems.map((e, i) =>
      window.setTimeout(() => handlePick(e.id), 1500 + i * 150),
    )
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elems])

  const reset = () => {
    setPicked(new Set())
    setHovered(null)
  }

  const done = elems.length > 0 && picked.size === elems.length
  const pct = elems.length ? Math.round((picked.size / elems.length) * 100) : 0

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
        <span style={{ fontSize: 12.5, opacity: 0.7, letterSpacing: 1 }}>
          {model.name}{model.dynasty ? ` · ${model.dynasty}` : ''} · 真实扫描 · 纹样基因拆解 ——
          金线所至，皆是沉睡的纹样
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
            camera={{ position: [2.6, 0.55, 3.2], fov: 42 }}
            dpr={[1, 2]}
            gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.12 }}
          >
            <color attach="background" args={['#1d160d']} />
            <fog attach="fog" args={['#1d160d', 9, 18]} />
            <Suspense fallback={null}>
              <Vessel
                key={model.id}
                glb={model.glb}
                elems={elems}
                picked={picked}
                hovered={hovered}
                onPick={handlePick}
                onHover={setHovered}
              />
            </Suspense>
            <EnvLight />
            <Rig />
          </Canvas>

          {/* 器物切换器 */}
          {models.length > 1 && (
            <div style={{ position: 'absolute', top: 18, left: 22 }}>
              <button
                onClick={() => setSwitcherOpen((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: switcherOpen ? 'rgba(28,22,12,0.92)' : 'rgba(20,16,8,0.72)',
                  border: '1px solid rgba(212,175,55,0.42)',
                  color: '#ffe6a8',
                  borderRadius: 10,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  letterSpacing: 1,
                  backdropFilter: 'blur(6px)',
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: 'linear-gradient(160deg,#efe6d0,#e2d4b6)',
                    color: '#5a4318',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {model.zh ?? model.name.slice(0, 1)}
                </span>
                {model.name}
                <span style={{ opacity: 0.5, fontSize: 11 }}>{models.length} 件器物 {switcherOpen ? '▴' : '▾'}</span>
              </button>
              {switcherOpen && (
                <div
                  style={{
                    marginTop: 8,
                    width: 316,
                    maxHeight: '52vh',
                    overflowY: 'auto',
                    background: 'rgba(24,18,10,0.94)',
                    border: '1px solid rgba(212,175,55,0.32)',
                    borderRadius: 12,
                    padding: 10,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => switchModel(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '7px 8px',
                        background:
                          m.id === model.id ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${
                          m.id === model.id ? 'rgba(212,175,55,0.55)' : 'rgba(255,255,255,0.07)'
                        }`,
                        borderRadius: 9,
                        cursor: 'pointer',
                        color: '#e8dcc0',
                        textAlign: 'left',
                      }}
                    >
                      {m.thumb ? (
                        <img
                          src={m.thumb}
                          alt={m.name}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: 'linear-gradient(160deg,#efe6d0,#e2d4b6)',
                            color: '#5a4318',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 17,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {m.zh ?? m.name.slice(0, 1)}
                        </span>
                      )}
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          {m.name}
                        </span>
                        <span style={{ display: 'block', fontSize: 10, opacity: 0.55 }}>
                          {m.dynasty ?? ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
                  background: 'rgba(20,16,8,0.88)',
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

          {/* 图例 + 操作提示 */}
          <div
            style={{
              position: 'absolute',
              bottom: 84,
              left: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
              color: 'rgba(232,220,192,0.62)',
              letterSpacing: 1,
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <i style={{ width: 14, height: 3, background: GOLD, borderRadius: 2, display: 'inline-block' }} />
                主纹
              </span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <i style={{ width: 14, height: 3, background: JADE, borderRadius: 2, display: 'inline-block' }} />
                地纹
              </span>
            </div>
            <div>拖动旋转 · 滚轮缩放 · 点击金线纹样提取</div>
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
                boxShadow: done ? 'none' : '0 4px 18px rgba(212,175,55,0.35)',
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
            width: 330,
            background: 'rgba(24,18,10,0.55)',
            borderLeft: '1px solid rgba(201,162,60,0.28)',
            padding: '20px 22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 14.5, letterSpacing: 2, color: '#d4af37' }}>纹样基因库</span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                {picked.size} / {elems.length} · {pct}%
              </span>
            </div>
            <div
              style={{
                marginTop: 10,
                height: 3,
                borderRadius: 2,
                background: 'rgba(201,162,60,0.15)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg,#a8862f,#e8c264)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <AnimatePresence>
            {elems.map((e) =>
              picked.has(e.id) ? (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: 60, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  whileHover={{ scale: 1.03 }}
                  style={{
                    background: 'rgba(16,12,6,0.78)',
                    border: `1px solid ${
                      e.level === 'ground' ? 'rgba(94,200,174,0.4)' : 'rgba(224,185,92,0.42)'
                    }`,
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    gap: 13,
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/puzzle')}
                >
                  {/* 浅色衬底: 锈色纹样在米色底上更清晰 */}
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      flexShrink: 0,
                      borderRadius: 10,
                      background:
                        'linear-gradient(160deg,#efe6d0 0%,#e2d4b6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={`${model.manifest.replace(/[^/]*$/, '')}elem_${String(e.id).padStart(2, '0')}.png`}
                      alt={`元素 ${e.id}`}
                      style={{
                        maxWidth: 78,
                        maxHeight: 78,
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: '#ffe6a8', display: 'flex', gap: 8, alignItems: 'center' }}>
                      {e.label ?? `元素 #${String(e.id).padStart(2, '0')}`}
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: `1px solid ${
                            e.level === 'ground' ? 'rgba(94,200,174,0.5)' : 'rgba(224,185,92,0.5)'
                          }`,
                          color: e.level === 'ground' ? '#8fd8c4' : '#e8c264',
                          letterSpacing: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {e.level === 'ground' ? '地纹' : '主纹'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 4, lineHeight: 1.6 }}>
                      元素 #{String(e.id).padStart(2, '0')}
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
                opacity: 0.6,
                lineHeight: 2,
              }}
            >
              点击 3D 曲面上的金线纹样
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
              opacity: 0.42,
              lineHeight: 1.8,
              borderTop: '1px solid rgba(201,162,60,0.15)',
              paddingTop: 12,
            }}
          >
            流水线：柱面展开 (θ,y) → 浮雕残差定位扉棱 → 三面板纹带分割 → 顶点色烘焙。
            几何与贴图：明尼阿波利斯艺术博物馆藏商代青铜簋摄影测量扫描件（CC0）。
          </div>
        </aside>
      </div>
    </div>
  )
}
