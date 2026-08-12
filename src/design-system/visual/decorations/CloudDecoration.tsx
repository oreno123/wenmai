import { useRef } from 'react'
import type { RefObject } from 'react'
import { useCloudFlow } from '../../../hooks/useCloudFlow'
import './CloudDecoration.css'

export default function CloudDecoration() {
  const ref = useRef<SVGGElement>(null)
  useCloudFlow(ref as RefObject<SVGGElement | null>, { duration: 24, offsetX: 60 })

  return (
    <g ref={ref} className="deco-cloud" aria-hidden>
      <path
        d="M0,40 Q30,20 60,40 T120,40 T180,40 T240,40"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d="M0,80 Q40,60 80,80 T160,80 T240,80"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1"
        opacity="0.2"
      />
    </g>
  )
}
