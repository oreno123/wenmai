import { useMemo } from 'react'
import * as THREE from 'three'
import useProductTexture from './useProductTexture'

interface ScarfGeometryProps {
  texture: THREE.CanvasTexture | null
}

function ScarfGeometry({ texture }: ScarfGeometryProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3, 3, 48, 48)
    const pos = geo.attributes.position as THREE.BufferAttribute
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
        map={texture ?? undefined}
        side={THREE.DoubleSide}
        metalness={0.0}
        roughness={0.92}
        color={texture ? '#ffffff' : '#D4AF6A'}
      />
    </mesh>
  )
}

interface ScarfProps {
  texture: HTMLCanvasElement | null
}

export default function Scarf({ texture }: ScarfProps) {
  const canvasTexture = useProductTexture(texture, {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    repeat: [2, 2],
  })

  return <ScarfGeometry texture={canvasTexture} />
}
