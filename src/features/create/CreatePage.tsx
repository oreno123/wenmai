import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import ModeTabs, { normalizeMode } from './ModeTabs'

const FreeMode = lazy(() => import('./modes/FreeMode'))
const GuidedMode = lazy(() => import('./modes/GuidedMode'))
const PreviewMode = lazy(() => import('./modes/PreviewMode'))

export default function CreatePage() {
  const [searchParams] = useSearchParams()
  const mode = normalizeMode(searchParams.get('mode'))

  return (
    <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
      <ModeTabs />
      <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#7A7060' }}>载入中</div>}>
        {mode === 'free' && <FreeMode />}
        {mode === 'guided' && <GuidedMode />}
        {mode === 'preview' && <PreviewMode />}
      </Suspense>
    </div>
  )
}
