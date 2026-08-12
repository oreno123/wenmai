import { useRef } from 'react'
import type { RefObject } from 'react'
import { useDrawPath } from '../../../hooks/useDrawPath'
import './BronzeDecoration.css'

export default function BronzeDecoration() {
  const ref1 = useRef<SVGPathElement>(null)
  const ref2 = useRef<SVGPathElement>(null)
  useDrawPath(ref1 as RefObject<SVGPathElement | null>, { duration: 4, delay: 0.3 })
  useDrawPath(ref2 as RefObject<SVGPathElement | null>, { duration: 4, delay: 0.8 })

  return (
    <g className="deco-bronze" aria-hidden>
      <path
        ref={ref1}
        d="M40,40 L80,40 L100,80 L80,120 L40,120 L20,80 Z"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        ref={ref2}
        d="M60,60 L60,100 M40,80 L80,80"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1"
        opacity="0.3"
      />
    </g>
  )
}
