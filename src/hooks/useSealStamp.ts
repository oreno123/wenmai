import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { useReducedMotion } from './useReducedMotion'

export interface SealStampOptions {
  delay?: number
  scale?: number
}

export function useSealStamp(
  ref: RefObject<SVGGElement | null>,
  opts: SealStampOptions = {}
): void {
  const reduced = useReducedMotion()
  const { delay = 0, scale = 1 } = opts

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (reduced) {
      gsap.set(el, { opacity: 1, scale })
      return
    }

    gsap.set(el, { opacity: 0, scale: scale * 2.4 })
    const tween = gsap.to(el, {
      opacity: 1,
      scale,
      duration: 0.35,
      delay,
      ease: 'back.out(2)',
    })
    return () => {
      tween.kill()
    }
  }, [ref, delay, scale, reduced])
}
