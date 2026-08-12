import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const SplashPage = lazy(() => import('../pages/SplashPage'))
const AuthPage = lazy(() => import('../pages/AuthPage'))
const Home = lazy(() => import('../pages/Home'))
const Library = lazy(() => import('../pages/Library'))
const PuzzlePage = lazy(() => import('../pages/PuzzlePage'))
const GachaPage = lazy(() => import('../pages/GachaPage'))
const GalleryPage = lazy(() => import('../pages/GalleryPage'))
const WorkDetailPage = lazy(() => import('../pages/WorkDetailPage'))
const PatternDetailPage = lazy(() => import('../pages/PatternDetailPage'))
const PhotoMatchPage = lazy(() => import('../pages/PhotoMatchPage'))
const AdminReviewPage = lazy(() => import('../pages/AdminReviewPage'))
const CuratePage = lazy(() => import('../pages/CuratePage'))
const Landing = lazy(() => import('../pages/Landing'))
const SeriesDemoPage = lazy(() => import('../pages/demo/SeriesDemoPage'))

function PageLoader() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary, #0C0A0E)',
        color: 'rgba(201,162,60,0.5)',
        fontSize: 24,
      }}
    >
      ☯
    </div>
  )
}

export interface AppRoutesProps {
  /** Optional children rendered above routes — used by App.tsx for GoldBackground etc. */
  children?: ReactNode
}

export default function AppRoutes({ children }: AppRoutesProps = {}) {
  return (
    <>
      {children}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/pattern/:id" element={<PatternDetailPage />} />
          <Route path="/create" element={<PuzzlePage />} />
          <Route path="/gacha" element={<GachaPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/work/:id" element={<WorkDetailPage />} />
          <Route path="/photo-match" element={<PhotoMatchPage />} />
          <Route path="/admin" element={<AdminReviewPage />} />
          <Route path="/tools/curate" element={<CuratePage />} />
          <Route path="/demo/series/:id" element={<SeriesDemoPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
