import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion } from './useReducedMotion'

export interface DrawPathOptions {
  duration?: number
  delay?: number
  repeat?: number
  yoyo?: boolean
  ease?: string
}

export function useDrawPath(
  ref: RefObject<SVGPathElement | null>,
  opts: DrawPathOptions = {}
): void {
  const reduced = useReducedMotion()
  const { duration = 2, delay = 0, repeat = 0, yoyo = false, ease = 'none' } = opts

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const length = el.getTotalLength()
    if (!length || !isFinite(length)) return

    gsap.set(el, {
      strokeDasharray: length,
      strokeDashoffset: length,
    })
    const tween = gsap.to(el, {
      strokeDashoffset: 0,
      duration,
      delay,
      repeat,
      yoyo,
      ease,
    })
    return () => {
      tween.kill()
    }
  }, [ref, duration, delay, repeat, yoyo, ease, reduced])
}
