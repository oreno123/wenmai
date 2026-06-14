import React, { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { updateSpring } from './springPhysics'
import { voronoiShatter } from './voronoiShatter'
import { SHATTER_SPRING, ASSEMBLE_SPRING, ROTATION_SPRING, GOLD_COLOR, BREAK_DISTANCE, FRAGMENT_COUNT } from './constants'
import { getPatternById, getPatternImage } from '../store/patternData'
import { createOutlinedBlock } from '../utils/blockOutline'

// Module-level cache: same element file is processed once across all Showcase sessions.
const _outlinedTextureCache = new Map()

function loadOutlinedTexture(path) {
  if (_outlinedTextureCache.has(path)) {
    const cached = _outlinedTextureCache.get(path)
    return cached instanceof Promise ? cached : Promise.resolve(cached)
  }
  const promise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = createOutlinedBlock(img)
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        _outlinedTextureCache.set(path, tex)
        resolve(tex)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = reject
    img.src = path
  })
  _outlinedTextureCache.set(path, promise)
  return promise
}

// ── Classic mode: 8 pre-defined blocks ──

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

function ClassicScene({ isOpen, isFist }) {
  const textures = useLoader(THREE.TextureLoader, BLOCK_PATHS)
  const meshRefs = useRef([])
  const state = useRef(null)
  const isShattered = useRef(false)
  const prevOpen = useRef(false)
  const prevFist = useRef(false)
  const lightRef = useRef()

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

  useFrame((state3d, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state3d.clock.elapsedTime

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
      <pointLight ref={lightRef} position={[0, 0, 5]} intensity={1.5} color="#F2D58A" />

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

// ── User creation mode: voronoi shatter on single texture ──

function UserCreationScene({ imageUrl, isOpen, isFist }) {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(imageUrl)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    return tex
  }, [imageUrl])

  const fragments = useMemo(() =>
    voronoiShatter(1024, 1024, FRAGMENT_COUNT, 42),
  [])

  const meshRefs = useRef([])
  const state = useRef(null)
  const isShattered = useRef(false)
  const prevOpen = useRef(false)
  const prevFist = useRef(false)
  const lightRef = useRef()

  const aspect = 1.0
  const TOTAL_SIZE = 2.8

  if (!state.current) {
    state.current = fragments.map((frag) => {
      const sx = (frag.seed[0] - 0.5) * TOTAL_SIZE
      const sy = (0.5 - frag.seed[1]) * TOTAL_SIZE
      const home = { x: sx, y: sy, z: 0 }
      const angle = Math.atan2(sy, sx) + (Math.random() - 0.5) * 0.8
      const dist = 2.2 + Math.random() * 1.5
      return {
        home,
        position: { ...home },
        target: { ...home },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        rotVelocity: { x: 0, y: 0, z: 0 },
        shatterPos: {
          x: Math.cos(angle) * dist + (Math.random() - 0.5) * 0.6,
          y: Math.sin(angle) * dist + (Math.random() - 0.5) * 0.6,
          z: (Math.random() - 0.5) * 1.0,
        },
        shatterRot: {
          x: (Math.random() - 0.5) * 0.6,
          y: (Math.random() - 0.5) * 0.5,
          z: (Math.random() - 0.5) * 0.4,
        },
        isAssembling: true,
      }
    })
  }

  // Build neighbor pairs for threads
  const neighborPairs = useMemo(() => {
    const seen = new Set()
    const pairs = []
    for (const frag of fragments) {
      for (const ni of frag.neighbors) {
        const key = Math.min(frag.id, ni) + '-' + Math.max(frag.id, ni)
        if (!seen.has(key)) {
          seen.add(key)
          pairs.push([frag.id, ni])
        }
      }
    }
    return pairs
  }, [fragments])

  const threadGeos = useMemo(() =>
    neighborPairs.map(() => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3))
      return g
    }),
  [neighborPairs])

  useFrame((state3d, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state3d.clock.elapsedTime

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
    }

    // Threads
    for (let ti = 0; ti < neighborPairs.length; ti++) {
      const [a, b] = neighborPairs[ti]
      const geo = threadGeos[ti]
      if (!geo || !pieces[a] || !pieces[b]) continue
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
      <pointLight ref={lightRef} position={[0, 0, 5]} intensity={1.5} color="#F2D58A" />

      {fragments.map((frag, i) => (
        <VoronoiMesh
          key={frag.id}
          fragment={frag}
          texture={texture}
          animState={state.current[i]}
          aspectRatio={aspect}
          ref={(el) => meshRefs.current[i] = el}
        />
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

// ── Voronoi fragment mesh (inline, self-animating) ──

const VoronoiMesh = React.forwardRef(function VoronoiMesh({ fragment, texture, animState, aspectRatio }, ref) {
  const internalRef = useRef()

  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const poly = fragment.polygon
    shape.moveTo((poly[0][0] - 0.5) * aspectRatio, (0.5 - poly[0][1]))
    for (let i = 1; i < poly.length; i++) {
      shape.lineTo((poly[i][0] - 0.5) * aspectRatio, (0.5 - poly[i][1]))
    }
    shape.closePath()
    const geo = new THREE.ShapeGeometry(shape)

    const uvAttr = geo.attributes.uv
    const posAttr = geo.attributes.position
    for (let i = 0; i < uvAttr.count; i++) {
      const px = posAttr.getX(i)
      const py = posAttr.getY(i)
      uvAttr.setXY(i, (px / aspectRatio) + 0.5, 0.5 - py)
    }
    uvAttr.needsUpdate = true
    return geo
  }, [fragment, aspectRatio])

  useFrame(() => {
    const mesh = internalRef.current
    if (!mesh || !animState) return
    mesh.position.set(animState.position.x, animState.position.y, animState.position.z)
    mesh.rotation.set(animState.rotation.x, animState.rotation.y, animState.rotation.z)
  })

  return (
    <mesh
      ref={(el) => {
        internalRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      geometry={geometry}
    >
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
        opacity={0.95}
      />
    </mesh>
  )
})

// ── Main export: dispatches to classic or user creation ──

export default function ShatterScene({ isOpen, isFist, imageUrl, placements }) {
  if (placements && placements.length > 0) {
    return <UserPlacementScene placements={placements} isOpen={isOpen} isFist={isFist} />
  }
  if (imageUrl) {
    return <UserCreationScene imageUrl={imageUrl} isOpen={isOpen} isFist={isFist} />
  }
  return <ClassicScene isOpen={isOpen} isFist={isFist} />
}

// ── User placement mode: each placed element is its own fragment ──

const PLACEMENT_TOTAL_SIZE = 2.8

function UserPlacementScene({ placements, isOpen, isFist }) {
  // Resolve each placement's pattern image URL via the pattern store.
  // Placements now reference pattern IDs (cloud-4, qh-50, etc.) rather than
  // element IDs, so we can pull from the full PATTERN_LIBRARY.
  const elementFiles = useMemo(() => {
    const seen = new Set()
    const files = []
    for (const p of placements) {
      const pat = getPatternById(p.id)
      if (!pat) continue
      const path = getPatternImage(pat)
      if (!path || seen.has(path)) continue
      seen.add(path)
      files.push(path)
    }
    return files
  }, [placements])

  const [textureByPath, setTextureByPath] = useState(() => {
    // Seed from cache so already-processed textures (re-visits) show instantly
    const m = new Map()
    for (const path of elementFiles) {
      const cached = _outlinedTextureCache.get(path)
      if (cached && !(cached instanceof Promise)) m.set(path, cached)
    }
    return m
  })

  useEffect(() => {
    if (elementFiles.length === 0) return
    let cancelled = false
    Promise.all(elementFiles.map(path => loadOutlinedTexture(path).then(tex => [path, tex])))
      .then(entries => {
        if (cancelled) return
        setTextureByPath(new Map(entries))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [elementFiles])

  const items = useMemo(() => {
    return placements.map((p) => {
      const pat = getPatternById(p.id)
      const path = pat ? getPatternImage(pat) : null
      const texture = path ? textureByPath.get(path) : null
      const sx = ((p.x ?? 512) / 1024 - 0.5) * PLACEMENT_TOTAL_SIZE
      const sy = (0.5 - (p.y ?? 512) / 1024) * PLACEMENT_TOTAL_SIZE
      const baseSize = ((p.scale ?? 1) * (p.size ?? 100)) / 1024 * PLACEMENT_TOTAL_SIZE
      return {
        texture,
        home: { x: sx, y: sy, z: 0 },
        size: baseSize,
        rotation: p.rotation ?? 0,
      }
    })
  }, [placements, textureByPath])

  // Spring state per fragment
  const stateRef = useRef(null)
  const isShattered = useRef(false)
  const prevOpen = useRef(false)
  const prevFist = useRef(false)
  const lightRef = useRef()

  if (!stateRef.current) {
    stateRef.current = items.map((item) => {
      const angle = Math.atan2(item.home.y, item.home.x) + (Math.random() - 0.5) * 0.8
      const dist = 2.2 + Math.random() * 1.5
      return {
        home: { ...item.home },
        homeRotationZ: item.rotation,
        position: { ...item.home },
        target: { ...item.home },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: item.rotation },
        targetRotation: { x: 0, y: 0, z: item.rotation },
        rotVelocity: { x: 0, y: 0, z: 0 },
        shatterPos: {
          x: Math.cos(angle) * dist + (Math.random() - 0.5) * 0.6,
          y: Math.sin(angle) * dist + (Math.random() - 0.5) * 0.6,
          z: (Math.random() - 0.5) * 1.0,
        },
        shatterRot: {
          x: (Math.random() - 0.5) * 0.6,
          y: (Math.random() - 0.5) * 0.5,
          z: item.rotation + (Math.random() - 0.5) * 0.4,
        },
        isAssembling: true,
      }
    })
  }

  // Threads: connect each fragment to its 2 nearest home-position neighbors
  const neighborPairs = useMemo(() => {
    if (items.length < 2) return []
    const pairs = []
    const seen = new Set()
    for (let i = 0; i < items.length; i++) {
      const candidates = items
        .map((it, j) => ({ j, d: Math.hypot(it.home.x - items[i].home.x, it.home.y - items[i].home.y) }))
        .filter(x => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
      for (const { j } of candidates) {
        const key = Math.min(i, j) + '-' + Math.max(i, j)
        if (!seen.has(key)) {
          seen.add(key)
          pairs.push([i, j])
        }
      }
    }
    return pairs
  }, [items])

  const threadGeos = useMemo(() =>
    neighborPairs.map(() => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3))
      return g
    }),
  [neighborPairs])

  useFrame((state3d, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state3d.clock.elapsedTime

    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(t * 0.3) * 3
      lightRef.current.position.y = Math.cos(t * 0.2) * 2
      lightRef.current.position.z = 3 + Math.sin(t * 0.4) * 0.5
    }

    const pieces = stateRef.current
    if (!pieces) return

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
        st.targetRotation = { x: 0, y: 0, z: st.homeRotationZ }
        st.isAssembling = true
      }
    }
    prevOpen.current = isOpen
    prevFist.current = isFist

    for (const st of pieces) {
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
    }

    // Threads between neighbor pairs
    for (let ti = 0; ti < neighborPairs.length; ti++) {
      const [a, b] = neighborPairs[ti]
      const geo = threadGeos[ti]
      if (!geo || !pieces[a] || !pieces[b]) continue
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
      if (e.code !== 'Space') return
      e.preventDefault()
      const pieces = stateRef.current
      if (!pieces) return
      if (isShattered.current) {
        isShattered.current = false
        for (const st of pieces) {
          st.target = { ...st.home }
          st.targetRotation = { x: 0, y: 0, z: st.homeRotationZ }
          st.isAssembling = true
        }
      } else {
        isShattered.current = true
        for (const st of pieces) {
          st.target = { ...st.shatterPos }
          st.targetRotation = { ...st.shatterRot }
          st.isAssembling = false
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <group>
      <ambientLight intensity={0.8} />
      <pointLight ref={lightRef} position={[0, 0, 5]} intensity={1.5} color="#F2D58A" />

      {items.map((item, i) => (
        <PlacementMesh
          key={i}
          texture={item.texture}
          size={item.size}
          animState={stateRef.current[i]}
        />
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

const PlacementMesh = React.forwardRef(function PlacementMesh({ texture, size, animState }, ref) {
  const internalRef = useRef()
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), [size])

  useFrame(() => {
    const mesh = internalRef.current
    if (!mesh || !animState) return
    mesh.position.set(animState.position.x, animState.position.y, animState.position.z)
    mesh.rotation.set(animState.rotation.x, animState.rotation.y, animState.rotation.z)
  })

  return (
    <mesh
      ref={(el) => {
        internalRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      geometry={geometry}
    >
      <meshBasicMaterial
        map={texture || undefined}
        transparent
        side={THREE.DoubleSide}
        opacity={0.95}
      />
    </mesh>
  )
})
