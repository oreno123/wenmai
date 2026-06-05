import { useMemo } from 'react'
import * as THREE from 'three'
import useProductTexture from './useProductTexture'

function ScarfGeometry({ texture }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3, 3, 48, 48)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const wave = Math.sin(x * 2.5) * 0.06 + Math.cos(y * 3) * 0.04 + Math.sin((x + y) * 1.5) * 0.03
      pos.setZ(i, wave)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} rotation={[-0.4, 0, 0]}>
      <meshStandardMaterial
        map={texture}
        side={THREE.DoubleSide}
        metalness={0.0}
        roughness={0.92}
        color={texture ? '#ffffff' : '#D4AF6A'}
      />
    </mesh>
  )
}

export default function Scarf({ texture }) {
  const canvasTexture = useProductTexture(texture, {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    repeat: [2, 2],
  })

  return <ScarfGeometry texture={canvasTexture} />
}
