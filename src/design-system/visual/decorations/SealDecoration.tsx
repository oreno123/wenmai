import { useRef } from 'react'
import type { RefObject } from 'react'
import { useSealStamp } from '../../../hooks/useSealStamp'
import './SealDecoration.css'

export default function SealDecoration({ char = '神' }: { char?: string }) {
  const ref = useRef<SVGGElement>(null)
  useSealStamp(ref as RefObject<SVGGElement | null>, { delay: 0.3 })

  return (
    <g ref={ref} className="deco-seal" aria-hidden>
      <rect
        x="0"
        y="0"
        width="60"
        height="60"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="2"
        opacity="0.5"
      />
      <text
        x="30"
        y="42"
        textAnchor="middle"
        fontFamily="var(--font-seal)"
        fontSize="36"
        fill="var(--series-primary)"
        opacity="0.7"
      >
        {char}
      </text>
    </g>
  )
}
