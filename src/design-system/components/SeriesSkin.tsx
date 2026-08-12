import { lazy, Suspense } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { SeriesIntensity } from '../../types/series-theme'
import { getSeriesTheme } from '../series/themes'
import { ParticleLayer } from '../visual/ParticleLayer'
import { DecorationLayer } from '../visual/DecorationLayer'
import SilkCanvasDecoration from '../visual/decorations/SilkCanvasDecoration'
import './SeriesSkin.css'

// Lazy-loaded so Three.js + shader only ship when a shader-themed series renders.
const CloudShader = lazy(() => import('../../shaders/CloudShaderComponent'))
const FluidShader = lazy(() => import('../../shaders/FluidShaderComponent'))

export interface SeriesSkinProps {
  series: string
  intensity?: SeriesIntensity
  children: ReactNode
  className?: string
}

export default function SeriesSkin({
  series,
  intensity = 'full',
  children,
  className = '',
}: SeriesSkinProps) {
  const theme = getSeriesTheme(series)
  const wrapperStyle = {
    '--series-primary': theme.primary,
    '--series-soft': theme.soft,
    '--series-bg': theme.bgGradient,
    '--series-text': theme.textGlow ? theme.primary : 'var(--color-text-primary)',
  } as CSSProperties

  const cls = [
    'ds-series-skin',
    `series-${theme.id}`,
    `intensity-${intensity}`,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} style={wrapperStyle}>
      {intensity === 'full' && (
        <div className="series-bg-layer" aria-hidden />
      )}
      {intensity === 'full' && theme.particle !== 'none' && (
        <ParticleLayer type={theme.particle} />
      )}
      {intensity === 'full' && theme.decoration !== 'none' && (
        <DecorationLayer type={theme.decoration} />
      )}
      {intensity === 'full' && theme.shader === 'cloud' && (
        <Suspense fallback={null}>
          <CloudShader />
        </Suspense>
      )}
      {intensity === 'full' && theme.shader === 'fluid' && (
        <Suspense fallback={null}>
          <FluidShader />
        </Suspense>
      )}
      {intensity === 'full' && theme.silkCanvas && <SilkCanvasDecoration />}
      {children}
    </div>
  )
}
