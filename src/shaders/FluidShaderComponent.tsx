// src/shaders/FluidShaderComponent.tsx
// R3F wrapper rendering a fullscreen fluid shader plane for the 山海经 series.
// Recolored FBM + domain-warping shader (adapted from flowingFluid.js, which is
// kept untouched for legacy compat). useReducedMotion disables uTime animation
// (shader still draws a static fluid field).
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fluidVertexShader, fluidFragmentShader, FLUID_PALETTE } from './fluid-shader'
import { useReducedMotion } from '../hooks/useReducedMotion'

function FluidPlane({ animate }: { animate: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useRef({
    uTime: { value: 0 },
    uResolution: { value: [1, 1] as [number, number] },
    uIntensity: { value: 1.0 },
    uColorBright: { value: FLUID_PALETTE.bright },
    uColorMid: { value: FLUID_PALETTE.mid },
    uColorDeep: { value: FLUID_PALETTE.deep },
    uColorAccent: { value: FLUID_PALETTE.accent },
  })

  useFrame(({ clock, size }) => {
    if (!materialRef.current) return
    const mat = materialRef.current as THREE.ShaderMaterial
    const u = mat.uniforms as Record<string, { value: number | [number, number] }>
    if (animate) {
      ;(u.uTime.value as number) = clock.getElapsedTime()
    }
    u.uResolution.value = [size.width, size.height]
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={fluidVertexShader}
        fragmentShader={fluidFragmentShader}
        uniforms={uniforms.current}
        transparent
      />
    </mesh>
  )
}

export default function FluidShaderComponent() {
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
        <FluidPlane animate={!reduced} />
      </Canvas>
    </div>
  )
}
