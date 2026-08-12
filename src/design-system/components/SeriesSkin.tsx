import type { CSSProperties, ReactNode } from 'react'
import type { SeriesIntensity } from '../../types/series-theme'
import { getSeriesTheme } from '../series/themes'
import './SeriesSkin.css'

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
      {children}
    </div>
  )
}
