import { lazy } from 'react'

const PuzzlePage = lazy(() => import('../../../pages/PuzzlePage'))

export default function FreeMode() {
  return <PuzzlePage />
}
