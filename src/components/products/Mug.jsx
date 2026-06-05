import { useMemo } from 'react'
import * as THREE from 'three'
import useProductTexture from './useProductTexture'

function MugGeometry({ texture }) {
  const handleGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.0, 0.95, 0),
      new THREE.Vector3(1.45, 0.75, 0),
      new THREE.Vector3(1.55, 0, 0),
      new THREE.Vector3(1.45, -0.75, 0),
      new THREE.Vector3(1.0, -0.95, 0),
    ])
    return new THREE.TubeGeometry(curve, 32, 0.065, 12, false)
  }, [])

  return (
    <group>
      {/* Front half of outer wall - pattern */}
      <mesh>
        <cylinderGeometry args={[1, 0.9, 2.5, 32, 1, true, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          metalness={0.25}
          roughness={0.55}
          color={texture ? '#ffffff' : '#D4AF6A'}
        />
      </mesh>
      {/* Back half of outer wall - ceramic */}
      <mesh>
        <cylinderGeometry args={[1, 0.9, 2.5, 32, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          color="#E8E0D4"
          side={THREE.DoubleSide}
          metalness={0.15}
          roughness={0.75}
        />
      </mesh>
      {/* Inner wall */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 2.34, 64, 1, true]} />
        <meshStandardMaterial color="#F0EBE0" side={THREE.DoubleSide} metalness={0.1} roughness={0.8} />
      </mesh>
      {/* Rim ring */}
      <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1, 64]} />
        <meshStandardMaterial color="#F0EBE0" metalness={0.15} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -1.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 64]} />
        <meshStandardMaterial color="#E0D8CC" metalness={0.1} roughness={0.8} />
      </mesh>
      {/* Handle */}
      <mesh geometry={handleGeo}>
        <meshStandardMaterial color="#D4AF6A" metalness={0.4} roughness={0.45} />
      </mesh>
    </group>
  )
}

export default function Mug({ texture }) {
  const canvasTexture = useProductTexture(texture, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  })

  return <MugGeometry texture={canvasTexture} />
}
