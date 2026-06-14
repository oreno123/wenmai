import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { generateNormalMap } from '../../utils/generateNormalMap'

function ReliefMesh({ image, metalness = 0.7, roughness = 0.35, baseColor = '#C4A265', normalScale = 1.6, porcelain = false }) {
  const meshRef = useRef()
  const [materials, setMaterials] = useState({ map: null, normalMap: null })

  useEffect(() => {
    if (!image) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return

      // For porcelain mode, composite the image onto a white background.
      // QH WebPs may have transparent regions where RGB is (0,0,0); with
      // meshStandardMaterial.transparent=false those render as solid black,
      // turning the white-on-blue porcelain into blue-on-black garbage.
      let tex
      if (porcelain) {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        tex = new THREE.CanvasTexture(canvas)
      } else {
        tex = new THREE.Texture(img)
      }
      tex.colorSpace = THREE.SRGBColorSpace
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = false
      tex.needsUpdate = true

      // Porcelain patterns don't need a normal map — skip the work.
      if (!porcelain) {
        const normalCanvas = generateNormalMap(img, 2.0)
        const ntex = new THREE.CanvasTexture(normalCanvas)
        ntex.colorSpace = THREE.NoColorSpace
        ntex.wrapS = THREE.ClampToEdgeWrapping
        ntex.wrapT = THREE.ClampToEdgeWrapping
        ntex.needsUpdate = true
        setMaterials({ map: tex, normalMap: ntex })
      } else {
        setMaterials({ map: tex, normalMap: null })
      }
    }
    img.src = image
    return () => { cancelled = true }
  }, [image, porcelain])

  useFrame(({ clock }) => {
    const m = meshRef.current
    if (m) m.rotation.z = Math.sin(clock.elapsedTime * 0.15) * 0.05
  })

  if (!materials.map) return null
  if (!porcelain && !materials.normalMap) return null

  if (porcelain) {
    // Real porcelain look: meshPhysicalMaterial with clearcoat simulates
    // the transparent glaze layer over the painted body. The base shows
    // the blue-on-white pattern; the clearcoat adds the glossy specular
    // highlights that read as fired ceramic.
    return (
      <group ref={meshRef}>
        {/* Outer unglazed foot ring — slightly warmer, matte */}
        <mesh>
          <circleGeometry args={[2.0, 96]} />
          <meshPhysicalMaterial
            color="#EFE7D2"
            roughness={0.85}
            metalness={0.0}
            clearcoat={0.3}
            clearcoatRoughness={0.6}
          />
        </mesh>
        {/* Gold rim — antique plate accent */}
        <mesh position={[0, 0, 0.001]}>
          <ringGeometry args={[1.85, 1.92, 96]} />
          <meshStandardMaterial color="#C9A23C" metalness={0.65} roughness={0.3} />
        </mesh>
        {/* Glazed pattern face */}
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[1.82, 96]} />
          <meshPhysicalMaterial
            map={materials.map}
            roughness={0.35}
            metalness={0.0}
            clearcoat={1.0}
            clearcoatRoughness={0.12}
            reflectivity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    )
  }

  return (
    <mesh ref={meshRef}>
      <circleGeometry args={[1.85, 96]} />
      <meshStandardMaterial
        map={materials.map}
        normalMap={materials.normalMap}
        normalScale={[normalScale, normalScale]}
        metalness={metalness}
        roughness={roughness}
        color={baseColor}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function Lights({ porcelain = false }) {
  const mainRef = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (mainRef.current) {
      mainRef.current.position.x = Math.sin(t * 0.4) * 4
      mainRef.current.position.z = Math.cos(t * 0.4) * 4
      mainRef.current.position.y = 2 + Math.sin(t * 0.3) * 0.5
    }
  })
  // Porcelain: soft, diffuse light so the white glaze doesn't blow out —
  // we want to see the blue pattern clearly, not a blinding white disc.
  // Gold relief: punchy angled light to drag highlights across the lines.
  const ambient = porcelain ? 0.38 : 0.18
  const main = porcelain ? 1.35 : 3.0
  const mainColor = porcelain ? '#F5EAD0' : '#F2D58A'
  return (
    <>
      <ambientLight intensity={ambient} />
      <pointLight ref={mainRef} position={[4, 2, 4]} intensity={main} color={mainColor} />
      <pointLight position={[0, -3, 2]} intensity={porcelain ? 0.35 : 0.6} color="#D4AF6A" />
      <pointLight position={[-2, 0, -3]} intensity={porcelain ? 0.5 : 1.0} color="#F5E6C8" />
    </>
  )
}

export default function ReliefScene({ image, metalness, roughness, baseColor, normalScale, porcelain }) {
  // Gold relief reads best on near-black; porcelain needs a warm cream backdrop
  // so the white glaze doesn't clash with a black void.
  const bgColor = porcelain ? '#E8DCC2' : '#0A0807'
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[bgColor]} />
      <Lights porcelain={porcelain} />
      <ReliefMesh
        image={image}
        metalness={metalness}
        roughness={roughness}
        baseColor={baseColor}
        normalScale={normalScale}
        porcelain={porcelain}
      />
      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={6}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </Canvas>
  )
}
