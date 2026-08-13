import { useRef, useMemo } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { updateSpring } from './springPhysics'
import { SHATTER_SPRING, ASSEMBLE_SPRING, ROTATION_SPRING } from './constants'
import type { Fragment } from './voronoiShatter'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface FragmentAnimState {
  position: Vec3
  target: Vec3
  velocity: Vec3
  rotation: Vec3
  targetRotation: Vec3
  rotVelocity: Vec3
  isAssembling: boolean
}

interface FragmentMeshProps {
  fragment: Fragment
  texture: THREE.Texture
  animState: FragmentAnimState
  aspectRatio: number
}

export default function FragmentMesh({ fragment, texture, animState, aspectRatio }: FragmentMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

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

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const dt = Math.min(delta, 0.05)
    const st = animState
    const spring = st.isAssembling ? ASSEMBLE_SPRING : SHATTER_SPRING

    for (const axis of ['x', 'y', 'z'] as const) {
      const result = updateSpring(
        st.position[axis], st.target[axis], st.velocity[axis],
        spring.stiffness, spring.damping, dt
      )
      st.position[axis] = result.position
      st.velocity[axis] = result.velocity
    }

    for (const axis of ['x', 'y', 'z'] as const) {
      const result = updateSpring(
        st.rotation[axis], st.targetRotation[axis], st.rotVelocity[axis],
        ROTATION_SPRING.stiffness, ROTATION_SPRING.damping, dt
      )
      st.rotation[axis] = result.position
      st.rotVelocity[axis] = result.velocity
    }

    mesh.position.set(st.position.x, st.position.y, st.position.z)
    mesh.rotation.set(st.rotation.x, st.rotation.y, st.rotation.z)
  })

  return (
    <mesh ref={meshRef as unknown as RefObject<THREE.Mesh>} geometry={geometry}>
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
        opacity={0.95}
      />
    </mesh>
  )
}
