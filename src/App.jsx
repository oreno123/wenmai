import { RouterProvider, useLocation } from './components/common/Router'
import { AppProvider } from './store/AppState'
import BottomNav from './components/common/BottomNav'
import GoldBackground from './components/common/GoldBackground'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Library from './pages/Library'
import GachaPage from './pages/GachaPage'
import Editor from './pages/Editor'
import Composer from './pages/Composer'
import PuzzlePage from './pages/PuzzlePage'
import JigsawPage from './pages/JigsawPage'
import CuratePage from './pages/CuratePage'
import Showcase from './pages/Showcase'

function Pages() {
  const { pathname } = useLocation()
  if (pathname === '/showcase') return <Showcase />
  if (pathname === '/home') return <Home />
  if (pathname === '/library') return <Library />
  if (pathname === '/gacha') return <GachaPage />
  if (pathname === '/editor') return <Editor />
  if (pathname === '/composer') return <Composer />
  if (pathname === '/puzzle') return <PuzzlePage />
  if (pathname === '/jigsaw') return <JigsawPage />
  if (pathname === '/curate') return <CuratePage />
  return <Landing />
}

function Layout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/' || pathname === ''
  const isShowcase = pathname === '/showcase'

  return (
    <>
      <Pages />
      {!isLanding && !isShowcase && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <AppProvider>
        <GoldBackground />
        <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'transparent', position: 'relative', zIndex: 1 }}>
          <Layout />
        </div>
      </AppProvider>
    </RouterProvider>
  )
}
