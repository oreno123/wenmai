import { useRef } from 'react'
import type { RefObject } from 'react'
import { useVineGrow } from '../../../hooks/useVineGrow'
import './VineDecoration.css'

export default function VineDecoration() {
  const ref = useRef<SVGPathElement>(null)
  useVineGrow(ref as RefObject<SVGPathElement | null>)

  return (
    <svg className="deco-vine" aria-hidden viewBox="0 0 300 200" preserveAspectRatio="none">
      <path
        ref={ref}
        d="M0,100 Q50,60 100,100 Q150,140 200,100 Q250,60 300,100"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="2"
        opacity="0.4"
      />
    </svg>
  )
}
