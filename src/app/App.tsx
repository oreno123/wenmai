import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AppProviders } from './providers'
import AppRoutes from './Routes'
import BottomNav from './BottomNav'
import { SeriesSkinLayer } from './SeriesSkinLayer'
import { useApp } from '../store/AppState'
import { useAuth } from '../lib/auth'
import { setSyncUser } from '../store/gameStore'

const GoldBackground = lazy(() => import('../components/common/GoldBackground'))

/**
 * Bridge Supabase auth state to the zustand game store. Must live inside
 * AppProvider so it can call useApp().
 */
function CloudSync() {
  const { user } = useAuth()
  const { syncFromCloud, resetLocalData } = useApp()

  useEffect(() => {
    if (user) {
      // Always reset local before syncing so a previous user's data
      // (library, creations, points) can't leak into the new session.
      resetLocalData()
      syncFromCloud(user.id)
    } else {
      setSyncUser(null)
    }
  }, [user, syncFromCloud, resetLocalData])

  return null
}

const HIDE_NAV_PATHS = new Set(['/', '/auth'])

function Layout() {
  const { pathname } = useLocation()
  const showNav = !HIDE_NAV_PATHS.has(pathname)

  return (
    <>
      <CloudSync />
      <Suspense fallback={null}>
        <GoldBackground />
      </Suspense>
      <SeriesSkinLayer>
        <AppRoutes />
      </SeriesSkinLayer>
      {showNav && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <AppProviders>
      <Layout />
    </AppProviders>
  )
}
