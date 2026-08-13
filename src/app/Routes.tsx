import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { renderLegacyRedirects } from './LegacyRedirects'

const SplashPage = lazy(() => import('../features/splash/SplashPage'))
const AuthPage = lazy(() => import('../features/auth/AuthPage'))
const Home = lazy(() => import('../features/home/Home'))
const Library = lazy(() => import('../features/library/Library'))
const CreatePage = lazy(() => import('../features/create/CreatePage'))
const GachaPage = lazy(() => import('../features/gacha/GachaPage'))
const GalleryPage = lazy(() => import('../features/gallery/GalleryPage'))
const WorkDetailPage = lazy(() => import('../features/gallery/WorkDetailPage'))
const PatternDetailPage = lazy(() => import('../features/library/PatternDetailPage'))
const PhotoMatchPage = lazy(() => import('../features/photo-match/PhotoMatchPage'))
const AdminReviewPage = lazy(() => import('../features/gallery/AdminReviewPage'))
const CuratePage = lazy(() => import('../features/tools/CuratePage'))
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

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
        <Routes>
          {renderLegacyRedirects()}
          <Route path="/" element={<SplashPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/pattern/:id" element={<PatternDetailPage />} />
          <Route path="/create" element={<CreatePage />} />
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
  )
}
