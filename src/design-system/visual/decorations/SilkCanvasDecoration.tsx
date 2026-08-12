// src/design-system/visual/decorations/SilkCanvasDecoration.tsx
// Lightweight silk-canvas decoration for dragon (团龙) series.
// Three flowing gold curves with parallax speeds, using useCloudFlow.
// Plan noted this is a simplified SVG fallback for the full-screen
// Canvas 2D GoldSilkCanvas.jsx, which doesn't fit inside SeriesSkin.

import { useRef } from 'react'
import type { RefObject } from 'react'
import { useCloudFlow } from '../../../hooks/useCloudFlow'
import './SilkCanvasDecoration.css'

export default function SilkCanvasDecoration() {
  const ref1 = useRef<SVGGElement>(null)
  const ref2 = useRef<SVGGElement>(null)
  const ref3 = useRef<SVGGElement>(null)

  // Three layers at different speeds for parallax depth
  useCloudFlow(ref1 as RefObject<SVGGElement | null>, { duration: 28, offsetX: 80 })
  useCloudFlow(ref2 as RefObject<SVGGElement | null>, { duration: 36, offsetX: 50 })
  useCloudFlow(ref3 as RefObject<SVGGElement | null>, { duration: 44, offsetX: 30 })

  return (
    <svg
      className="deco-silk-canvas"
      aria-hidden
      viewBox="0 0 800 200"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="silkGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4AF6A" stopOpacity="0" />
          <stop offset="20%" stopColor="#D4AF6A" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#FFE9A8" stopOpacity="0.5" />
          <stop offset="80%" stopColor="#D4AF6A" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#D4AF6A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="silkGoldCore" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFF0B0" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFF0B0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFF0B0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bloom layer (widest, lowest opacity) */}
      <g ref={ref1} style={{ filter: 'blur(8px)' }}>
        <path
          d="M-50,100 Q200,60 400,100 T850,100"
          fill="none"
          stroke="url(#silkGoldGrad)"
          strokeWidth="20"
          opacity="0.4"
        />
      </g>

      {/* Main ribbon layer */}
      <g ref={ref2} style={{ filter: 'blur(2px)' }}>
        <path
          d="M-50,120 Q200,80 400,120 T850,120"
          fill="none"
          stroke="url(#silkGoldGrad)"
          strokeWidth="6"
          opacity="0.6"
        />
      </g>

      {/* Core bright line */}
      <g ref={ref3}>
        <path
          d="M-50,140 Q200,100 400,140 T850,140"
          fill="none"
          stroke="url(#silkGoldCore)"
          strokeWidth="1.5"
          opacity="0.8"
        />
      </g>
    </svg>
  )
}
