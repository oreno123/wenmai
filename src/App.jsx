import { lazy, Suspense, useEffect } from 'react'
import { RouterProvider, useLocation } from './components/common/Router'
import { AppProvider, useApp } from './store/AppState'
import BottomNav from './components/common/BottomNav'
import GoldBackground from './components/common/GoldBackground'
import ErrorBoundary from './components/common/ErrorBoundary'
import { useAuth } from './lib/auth'
import { setSyncUser } from './store/gameStore'

const SplashPage = lazy(() => import('./pages/SplashPage'))
const Landing = lazy(() => import('./pages/Landing'))
const Home = lazy(() => import('./pages/Home'))
const Library = lazy(() => import('./pages/Library'))
const GachaPage = lazy(() => import('./pages/GachaPage'))
const Editor = lazy(() => import('./pages/Editor'))
const Composer = lazy(() => import('./pages/Composer'))
const PuzzlePage = lazy(() => import('./pages/PuzzlePage'))
const JigsawPage = lazy(() => import('./pages/JigsawPage'))
const CuratePage = lazy(() => import('./pages/CuratePage'))
const Showcase = lazy(() => import('./pages/Showcase'))
const PatternDetailPage = lazy(() => import('./pages/PatternDetailPage'))
const PhotoMatchPage = lazy(() => import('./pages/PhotoMatchPage'))
const QinghuaBrowser = lazy(() => import('./pages/QinghuaBrowser'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const GalleryPage = lazy(() => import('./pages/GalleryPage'))
const WorkDetailPage = lazy(() => import('./pages/WorkDetailPage'))
const AdminReviewPage = lazy(() => import('./pages/AdminReviewPage'))

function PageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary, #0C0A0E)',
      color: 'rgba(201,162,60,0.5)', fontSize: 24,
    }}>
      ☯
    </div>
  )
}

function Pages() {
  const { pathname } = useLocation()
  let Page
  if (pathname === '/showcase') Page = Showcase
  else if (pathname === '/home') Page = Home
  else if (pathname === '/library') Page = Library
  else if (pathname === '/gacha') Page = GachaPage
  else if (pathname === '/editor') Page = Editor
  else if (pathname === '/composer') Page = Composer
  else if (pathname === '/puzzle') Page = PuzzlePage
  else if (pathname === '/jigsaw') Page = JigsawPage
  else if (pathname === '/curate') Page = CuratePage
  else if (pathname.startsWith('/pattern/')) Page = PatternDetailPage
  else if (pathname === '/photo-match') Page = PhotoMatchPage
  else if (pathname === '/qinghua') Page = QinghuaBrowser
  else if (pathname === '/auth') Page = AuthPage
  else if (pathname === '/gallery') Page = GalleryPage
  else if (pathname.startsWith('/work/')) Page = WorkDetailPage
  else if (pathname === '/admin') Page = AdminReviewPage
  else if (pathname === '/landing') Page = Landing
  else Page = SplashPage

  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  )
}

function Layout() {
  const { pathname } = useLocation()
  const isSplash = pathname === '/' || pathname === ''
  const isLanding = pathname === '/landing'
  const isShowcase = pathname === '/showcase'
  const isAuth = pathname === '/auth'

  return (
    <>
      <Pages />
      {!isSplash && !isLanding && !isShowcase && !isAuth && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider>
        <AppProvider>
          <GoldBackground />
          <CloudSync />
          <Layout />
        </AppProvider>
      </RouterProvider>
    </ErrorBoundary>
  )
}

// Bridge Supabase auth to the game store: pull cloud data when a session
// appears, stop pushing when it disappears. Must live inside AppProvider
// so it can call useApp().
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
