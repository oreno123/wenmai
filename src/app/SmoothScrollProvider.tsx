import type { ReactNode } from 'react'
import { useSmoothScroll } from '../hooks/useSmoothScroll'

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useSmoothScroll()
  return <>{children}</>
}
