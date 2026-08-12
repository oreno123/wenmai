import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion } from './useReducedMotion'

export function useCloudFlow(
  ref: RefObject<SVGGElement | null>,
  opts: { duration?: number; offsetX?: number } = {}
): void {
  const reduced = useReducedMotion()
  const { duration = 20, offsetX = 100 } = opts

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const tween = gsap.to(el, {
      attr: { transform: `translateX(${offsetX})` },
      duration,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
    return () => {
      tween.kill()
    }
  }, [ref, duration, offsetX, reduced])
}
