import type { ReactElement } from 'react'
import { Navigate, Route } from 'react-router-dom'

export interface LegacyRedirect {
  from: string
  to: string
}

export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  { from: '/splash', to: '/' },
  { from: '/landing', to: '/auth' },
  { from: '/puzzle', to: '/create?mode=free' },
  { from: '/composer', to: '/create?mode=guided' },
  { from: '/jigsaw', to: '/create?mode=guided' },
  { from: '/editor', to: '/create?mode=preview' },
  { from: '/showcase', to: '/create?mode=preview' },
  { from: '/qinghua', to: '/library?series=qinghua' },
  { from: '/curate', to: '/tools/curate' },
]

/**
 * Render the legacy redirect <Route> elements as an array. React Router v7
 * requires every child of <Routes> to be a literal <Route> or <Fragment>;
 * a wrapper component would be rejected, so we return an array of <Route>
 * elements instead (RR flattens array children). Place the result inside the
 * main <Routes>, before the primary routes, so old URLs are caught first.
 */
export function renderLegacyRedirects(): ReactElement[] {
  return LEGACY_REDIRECTS.map(({ from, to }) => (
    <Route key={from} path={from} element={<Navigate to={to} replace />} />
  ))
}
