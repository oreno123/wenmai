import type { SeriesId } from '../types/pattern'

export const SERIES_ROUTE_MAP: Record<string, SeriesId> = {
  '/home': 'neutral',
  '/library': 'neutral',
  '/create': 'neutral',
  '/gallery': 'neutral',
  '/work': 'neutral',
  '/auth': 'neutral',
  '/photo-match': 'neutral',
  '/gacha': 'dragon',
}

export function shouldSkipSkin(pathname: string): boolean {
  if (pathname === '/' || pathname === '/auth') return true
  if (pathname.startsWith('/pattern/')) return true
  if (pathname.startsWith('/admin')) return true
  if (pathname.startsWith('/tools/')) return true
  if (pathname.startsWith('/demo/')) return true
  return false
}

export function resolveSeriesForPath(pathname: string): SeriesId {
  if (shouldSkipSkin(pathname)) return 'neutral'
  const sortedKeys = Object.keys(SERIES_ROUTE_MAP).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (pathname === key || pathname.startsWith(key + '/') || pathname.startsWith(key)) {
      return SERIES_ROUTE_MAP[key]
    }
  }
  return 'neutral'
}
