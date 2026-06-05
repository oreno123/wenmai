import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { updateSpring } from './springPhysics'
import { SHATTER_SPRING, ASSEMBLE_SPRING, ROTATION_SPRING, GOLD_COLOR, BREAK_DISTANCE } from './constants'

const BLOCKS = [
  { id: 'zuoshang',       col: -1, row:  1 },
  { id: 'zhongshang',     col:  0, row:  1 },
  { id: 'youshang',       col:  1, row:  1 },
  { id: 'zhongjian_zuo',  col: -1, row:  0 },
  { id: 'zhongjian_you',  col:  1, row:  0 },
  { id: 'zuoxia',         col: -1, row: -1 },
  { id: 'zhongxin_xia',   col:  0, row: -1 },
  { id: 'youxia',         col:  1, row: -1 },
]

const BLOCK_PATHS = BLOCKS.map(b => `/puzzle/${b.id}_block.png`)

const ADJ = [
  [0,1],[0,3],[0,5],
  [1,2],[1,4],
  [2,4],[2,7],
  [3,5],
  [4,7],
  [5,6],
  [6,7],
]

const CELL = 1.0

function generateNormalMap(sourceTexture) {
  const img = sourceTexture.image
  if (!img) return null

  const w = img.width, h = img.height
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const src = ctx.getImageData(0, 0, w, h).data

  const out = ctx.createImageData(w, h)
  const dst = out.data

  const strength = 2.5

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const getGray = (px, py) => {
        const cx = Math.min(w - 1, Math.max(0, px))
        const cy = Math.min(h - 1, Math.max(0, py))
        const i = (cy * w + cx) * 4
        return (src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11) / 255
      }

      const tl = getGray(x - 1, y - 1), t = getGray(x, y - 1), tr = getGray(x + 1, y - 1)
      const l  = getGray(x - 1, y),                              r  = getGray(x + 1, y)
      const bl = getGray(x - 1, y + 1), b = getGray(x, y + 1), br = getGray(x + 1, y + 1)

      let nx = (tl + 2 * l + bl) - (tr + 2 * r + br)
      let ny = (tl + 2 * t + tr) - (bl + 2 * b + br)
      let nz = 1.0 / strength

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      nx /= len; ny /= len; nz /= len

      const i = (y * w + x) * 4
      dst[i]     = ((nx * 0.5 + 0.5) * 255) | 0
      dst[i + 1] = ((ny * 0.5 + 0.5) * 255) | 0
      dst[i + 2] = ((nz * 0.5 + 0.5) * 255) | 0
      dst[i + 3] = 255
    }
  }

  ctx.putImageData(out, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

export default function ShatterScene({ isOpen, isFist }) {
  const textures = useLoader(THREE.TextureLoader, BLOCK_PATHS)
  const meshRefs = useRef([])
  const state = useRef(null)
  const isShattered = useRef(false)
  const prevOpen = useRef(false)
  const prevFist = useRef(false)
  const lightRef = useRef()

  const normalMaps = useMemo(() =>
    textures.map((t) => {
      t.minFilter = THREE.LinearFilter
      t.magFilter = THREE.LinearFilter
      t.generateMipmaps = false
      return generateNormalMap(t)
    }),
  [textures])

  if (!state.current) {
    state.current = BLOCKS.map((b) => {
      const hx = b.col * CELL
      const hy = b.row * CELL
      const home = { x: hx, y: hy, z: 0 }
      const angle = Math.atan2(hy, hx) + (Math.random() - 0.5) * 0.6
      const dist = 1.8 + Math.random() * 1.0
      return {
        home,
        position: { ...home },
        target: { ...home },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        rotVelocity: { x: 0, y: 0, z: 0 },
        shatterPos: {
          x: Math.cos(angle) * dist + (Math.random() - 0.5) * 0.5,
          y: Math.sin(angle) * dist + (Math.random() - 0.5) * 0.5,
          z: (Math.random() - 0.5) * 0.8,
        },
        shatterRot: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.4,
          z: (Math.random() - 0.5) * 0.3,
        },
        isAssembling: true,
      }
    })
  }

  const threadGeos = useMemo(() =>
    ADJ.map(() => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3))
      return g
    }),
  [])

  // Animate light to show off the relief
  useFrame((state3d, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state3d.clock.elapsedTime

    // Slow orbiting light
    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(t * 0.3) * 3
      lightRef.current.position.y = Math.cos(t * 0.2) * 2
      lightRef.current.position.z = 3 + Math.sin(t * 0.4) * 0.5
    }

    const pieces = state.current

    if (isOpen && !prevOpen.current && !isShattered.current) {
      isShattered.current = true
      for (const st of pieces) {
        st.target = { ...st.shatterPos }
        st.targetRotation = { ...st.shatterRot }
        st.isAssembling = false
      }
    }
    if (isFist && !prevFist.current && isShattered.current) {
      isShattered.current = false
      for (const st of pieces) {
        st.target = { ...st.home }
        st.targetRotation = { x: 0, y: 0, z: 0 }
        st.isAssembling = true
      }
    }
    prevOpen.current = isOpen
    prevFist.current = isFist

    for (let i = 0; i < pieces.length; i++) {
      const st = pieces[i]
      const spring = st.isAssembling ? ASSEMBLE_SPRING : SHATTER_SPRING
      for (const a of ['x', 'y', 'z']) {
        const r = updateSpring(st.position[a], st.target[a], st.velocity[a], spring.stiffness, spring.damping, dt)
        st.position[a] = r.position
        st.velocity[a] = r.velocity
      }
      for (const a of ['x', 'y', 'z']) {
        const r = updateSpring(st.rotation[a], st.targetRotation[a], st.rotVelocity[a], ROTATION_SPRING.stiffness, ROTATION_SPRING.damping, dt)
        st.rotation[a] = r.position
        st.rotVelocity[a] = r.velocity
      }
      const mesh = meshRefs.current[i]
      if (mesh) {
        mesh.position.set(st.position.x, st.position.y, st.position.z)
        mesh.rotation.set(st.rotation.x, st.rotation.y, st.rotation.z)
      }
    }

    // threads
    for (let ti = 0; ti < ADJ.length; ti++) {
      const [a, b] = ADJ[ti]
      const geo = threadGeos[ti]
      if (!geo) continue
      const stA = pieces[a], stB = pieces[b]
      const dx = stA.position.x - stB.position.x
      const dy = stA.position.y - stB.position.y
      const dz = stA.position.z - stB.position.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const pos = geo.attributes.position
      if (dist > BREAK_DISTANCE || dist < 0.05) {
        pos.setXYZ(0, 0, 0, 0); pos.setXYZ(1, 0, 0, 0); pos.setXYZ(2, 0, 0, 0)
        pos.needsUpdate = true
        continue
      }
      const opacity = Math.max(0, 1 - dist / BREAK_DISTANCE)
      const midX = (stA.position.x + stB.position.x) / 2
      const midY = (stA.position.y + stB.position.y) / 2
      const midZ = (stA.position.z + stB.position.z) / 2
      const sag = dist * 0.08
      pos.setXYZ(0, stA.position.x, stA.position.y, stA.position.z)
      pos.setXYZ(1, midX, midY - sag, midZ)
      pos.setXYZ(2, stB.position.x, stB.position.y, stB.position.z)
      pos.needsUpdate = true
      const mat = geo.userData.matRef
      if (mat) mat.opacity = opacity * 0.8
    }
  })

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (isShattered.current) {
          isShattered.current = false
          for (const st of state.current) {
            st.target = { ...st.home }
            st.targetRotation = { x: 0, y: 0, z: 0 }
            st.isAssembling = true
          }
        } else {
          isShattered.current = true
          for (const st of state.current) {
            st.target = { ...st.shatterPos }
            st.targetRotation = { ...st.shatterRot }
            st.isAssembling = false
          }
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <group>
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 0, 5]} intensity={1.5} color="#F2D58A" />

      {BLOCKS.map((block, i) => (
        <mesh key={block.id} ref={(el) => meshRefs.current[i] = el}>
          <planeGeometry args={[1, 1, 32, 32]} />
          <meshBasicMaterial
            map={textures[i]}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <group>
        {threadGeos.map((geo, i) => (
          <line key={i} geometry={geo}>
            <lineBasicMaterial
              ref={(el) => { if (el) geo.userData.matRef = el }}
              color={GOLD_COLOR}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
            />
          </line>
        ))}
      </group>
    </group>
  )
}
