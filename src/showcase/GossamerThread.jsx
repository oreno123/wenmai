import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { GOLD_COLOR, BREAK_DISTANCE } from './constants'

export default function GossamerThread({ pieceA, pieceB, originalDist }) {
  const groupRef = useRef()
  const breakThreshold = BREAK_DISTANCE

  const defaultPoints = useMemo(() => [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ], [])

  useFrame(() => {
    if (!groupRef.current) return
    const dx = pieceA.position.x - pieceB.position.x
    const dy = pieceA.position.y - pieceB.position.y
    const dz = pieceA.position.z - pieceB.position.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist > breakThreshold || dist < 0.01) {
      groupRef.current.visible = false
      return
    }
    groupRef.current.visible = true

    const opacity = Math.max(0, 1 - dist / breakThreshold)
    const midX = (pieceA.position.x + pieceB.position.x) / 2
    const midY = (pieceA.position.y + pieceB.position.y) / 2
    const midZ = (pieceA.position.z + pieceB.position.z) / 2
    const sag = dist * 0.15

    const pts = defaultPoints
    pts[0].set(pieceA.position.x, pieceA.position.y, pieceA.position.z)
    pts[1].set(midX, midY - sag, midZ)
    pts[2].set(pieceB.position.x, pieceB.position.y, pieceB.position.z)

    const coreLine = groupRef.current.children[0]
    const glowLine = groupRef.current.children[1]
    if (coreLine?.material) {
      coreLine.material.opacity = opacity
      coreLine.material.linewidth = Math.max(0.5, 2 * opacity)
    }
    if (glowLine?.material) {
      glowLine.material.opacity = opacity * 0.3
      glowLine.material.linewidth = Math.max(1, 8 * opacity)
    }
  })

  return (
    <group ref={groupRef}>
      <Line
        points={defaultPoints}
        color={GOLD_COLOR}
        lineWidth={2}
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
      />
      <Line
        points={defaultPoints}
        color={GOLD_COLOR}
        lineWidth={8}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
      />
    </group>
  )
}
