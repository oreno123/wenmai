import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import SubModeTabs from '../SubModeTabs'

const Composer = lazy(() => import('./Composer'))
const Jigsaw = lazy(() => import('./Jigsaw'))

const OPTIONS = [
  { sub: 'symmetry', cn: '对称构图' },
  { sub: 'jigsaw', cn: '经典拼图' },
]

export default function GuidedMode() {
  const [searchParams] = useSearchParams()
  const sub = searchParams.get('sub') ?? 'symmetry'

  return (
    <div>
      <SubModeTabs mode="guided" options={OPTIONS} />
      <Suspense fallback={null}>
        {sub === 'symmetry' && <Composer />}
        {sub === 'jigsaw' && <Jigsaw />}
      </Suspense>
    </div>
  )
}
