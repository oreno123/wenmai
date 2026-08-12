import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from './useReducedMotion'

export interface SmoothScrollOptions {
  duration?: number
  easing?: (t: number) => number
}

export function useSmoothScroll(opts: SmoothScrollOptions = {}): RefObject<Lenis | null> {
  const ref = useRef<Lenis | null>(null)
  const reduced = useReducedMotion()
  const { duration = 1.2 } = opts

  useEffect(() => {
    if (reduced || typeof window === 'undefined') return

    const lenis = new Lenis({ duration })
    ref.current = lenis

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      ref.current = null
    }
  }, [duration, reduced])

  return ref
}
