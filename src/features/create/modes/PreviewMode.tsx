import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import SubModeTabs from '../SubModeTabs'

const Relief = lazy(() => import('./Relief'))
const Shatter = lazy(() => import('./Shatter'))

const OPTIONS = [
  { sub: 'relief', cn: '3D 浮雕' },
  { sub: 'shatter', cn: '碎裂沉浸' },
]

export default function PreviewMode() {
  const [searchParams] = useSearchParams()
  const sub = searchParams.get('sub') ?? 'relief'

  return (
    <div>
      <SubModeTabs mode="preview" options={OPTIONS} />
      <Suspense fallback={null}>
        {sub === 'relief' && <Relief />}
        {sub === 'shatter' && <Shatter />}
      </Suspense>
    </div>
  )
}
