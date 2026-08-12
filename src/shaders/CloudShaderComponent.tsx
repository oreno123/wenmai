// src/shaders/CloudShaderComponent.tsx
// R3F wrapper rendering a fullscreen cloud shader plane. Renders at low opacity
// behind content. useReducedMotion disables uTime animation (shader still draws
// a static cloud field).
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cloudVertexShader, cloudFragmentShader, CLOUD_PALETTE } from './cloud-shader'
import { useReducedMotion } from '../hooks/useReducedMotion'

function CloudPlane({ animate }: { animate: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useRef({
    uTime: { value: 0 },
    uResolution: { value: [1, 1] as [number, number] },
    uColorDeep: { value: CLOUD_PALETTE.deep },
    uColorMid: { value: CLOUD_PALETTE.mid },
    uColorLight: { value: CLOUD_PALETTE.light },
  })

  useFrame(({ clock }) => {
    if (animate && materialRef.current) {
      const u = materialRef.current.uniforms as Record<string, { value: number }>
      u.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms.current}
        transparent
      />
    </mesh>
  )
}

export default function CloudShaderComponent() {
  const reduced = useReducedMotion()
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.7,
      }}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 1] }}
        gl={{ antialias: false, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <CloudPlane animate={!reduced} />
      </Canvas>
    </div>
  )
}
