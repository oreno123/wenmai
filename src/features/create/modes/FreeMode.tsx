import { lazy, Suspense } from 'react'

const PuzzlePage = lazy(() => import('../../../pages/PuzzlePage'))

export default function FreeMode() {
  return (
    <Suspense fallback={null}>
      <PuzzlePage />
    </Suspense>
  )
}
