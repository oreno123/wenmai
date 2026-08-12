import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { SeriesSkin } from '../design-system'
import { resolveSeriesForPath, shouldSkipSkin } from './seriesRouteMap'

export interface SeriesSkinLayerProps {
  children: ReactNode
}

export function SeriesSkinLayer({ children }: SeriesSkinLayerProps) {
  const { pathname } = useLocation()

  if (shouldSkipSkin(pathname)) {
    return <>{children}</>
  }

  const series = resolveSeriesForPath(pathname)
  return (
    <SeriesSkin series={series} intensity="subtle" style={{ minHeight: '100vh' }}>
      {children}
    </SeriesSkin>
  )
}
