import { useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface UseProductTextureOptions {
  wrapS?: THREE.Wrapping
  wrapT?: THREE.Wrapping
  repeat?: [number, number]
}

export default function useProductTexture(
  canvasEl: HTMLCanvasElement | null,
  opts: UseProductTextureOptions = {}
): THREE.CanvasTexture | null {
  const tex = useMemo(() => {
    if (!canvasEl) return null
    const t = new THREE.CanvasTexture(canvasEl)
    if (opts.wrapS != null) t.wrapS = opts.wrapS
    if (opts.wrapT != null) t.wrapT = opts.wrapT
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1])
    return t
  }, [canvasEl])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (tex) tex.dispose() }
  }, [tex])

  useFrame(() => { if (tex) tex.needsUpdate = true })

  return tex
}
