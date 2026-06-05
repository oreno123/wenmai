import * as THREE from 'three'
import useProductTexture from './useProductTexture'
import GLBModel from './GLBModel'

function PhoneCaseGeometry({ texture }) {
  return (
    <group>
      {/* Back panel - pattern */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[1.6, 3.2, 0.1]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.2}
          roughness={0.7}
          color={texture ? '#ffffff' : '#D4AF6A'}
        />
      </mesh>
      {/* Camera bump */}
      <mesh position={[-0.4, 1.1, -0.2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
        <meshStandardMaterial color="#2A2A2A" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Camera lens */}
      <mesh position={[-0.4, 1.1, -0.24]}>
        <circleGeometry args={[0.12, 32]} />
        <meshStandardMaterial color="#0A0A0A" metalness={0.8} roughness={0.1} />
      </mesh>
      {/* Side frame */}
      <mesh>
        <boxGeometry args={[1.65, 3.25, 0.2]} />
        <meshStandardMaterial color="#1A1A1C" metalness={0.3} roughness={0.6} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

export default function PhoneCase({ texture }) {
  const canvasTexture = useProductTexture(texture, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  })

  return (
    <GLBModel
      url="/models/case.glb"
      texture={canvasTexture}
      fallback={<PhoneCaseGeometry texture={canvasTexture} />}
    />
  )
}
