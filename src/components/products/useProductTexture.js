import { useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function useProductTexture(canvasEl, opts = {}) {
  const tex = useMemo(() => {
    if (!canvasEl) return null
    const t = new THREE.CanvasTexture(canvasEl)
    if (opts.wrapS != null) t.wrapS = opts.wrapS
    if (opts.wrapT != null) t.wrapT = opts.wrapT
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1])
    return t
  }, [canvasEl])

  useEffect(() => {
    return () => { if (tex) tex.dispose() }
  }, [tex])

  useFrame(() => { if (tex) tex.needsUpdate = true })

  return tex
}
