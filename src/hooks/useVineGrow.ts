import { type RefObject } from 'react'
import { useDrawPath, type DrawPathOptions } from './useDrawPath'

export function useVineGrow(
  ref: RefObject<SVGPathElement | null>,
  opts: DrawPathOptions = {}
): void {
  useDrawPath(ref, { duration: 3, ease: 'power2.inOut', ...opts })
}
