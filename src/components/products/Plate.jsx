import * as THREE from 'three'
import { useMemo } from 'react'
import useProductTexture from './useProductTexture'

function PlateGeometry({ texture }) {
  const topRadius = 2.0
  const bottomRadius = 1.6
  const height = 0.3
  const rimRadius = 2.05
  const rimTube = 0.04
  const footRadius = 1.2
  const footHeight = 0.15

  return (
    <group rotation={[-0.3, 0, 0]}>
      {/* Main bowl body */}
      <mesh>
        <cylinderGeometry args={[topRadius, bottomRadius, height, 64]} />
        <meshStandardMaterial color="#F0EBE0" metalness={0.08} roughness={0.88} />
      </mesh>
      {/* Inner cavity */}
      <mesh position={[0, height * 0.15, 0]}>
        <cylinderGeometry args={[topRadius - 0.05, bottomRadius - 0.1, height * 0.8, 64, 1, true]} />
        <meshStandardMaterial color="#F5F0E8" side={THREE.DoubleSide} metalness={0.05} roughness={0.92} />
      </mesh>
      {/* Top surface - pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height / 2 + 0.01, 0]}>
        <circleGeometry args={[topRadius - 0.15, 64]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.12}
          roughness={0.8}
          color={texture ? '#ffffff' : '#F0EBE0'}
        />
      </mesh>
      {/* Gold rim */}
      <mesh position={[0, height / 2, 0]}>
        <torusGeometry args={[rimRadius, rimTube, 12, 64]} />
        <meshStandardMaterial color="#D4AF6A" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Foot ring */}
      <mesh position={[0, -height / 2 - footHeight / 2, 0]}>
        <cylinderGeometry args={[footRadius + 0.1, footRadius, footHeight, 64]} />
        <meshStandardMaterial color="#E0D8CC" metalness={0.1} roughness={0.85} />
      </mesh>
    </group>
  )
}

export default function Plate({ texture }) {
  const canvasTexture = useProductTexture(texture, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  })

  return <PlateGeometry texture={canvasTexture} />
}
