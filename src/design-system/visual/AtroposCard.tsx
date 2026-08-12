import type { ReactNode } from 'react'
import Atropos from 'atropos/react'

export interface AtroposCardProps {
  children: ReactNode
  className?: string
  /**
   * Whether the tilt is active. When false, the wrapper still renders
   * but parallax tilt is disabled (handled by callers via conditional mount).
   * Kept on the public API for future flexibility; not forwarded to Atropos v2
   * (which exposes `alwaysActive` for the inverse "always-on" semantics).
   */
  active?: boolean
}

export default function AtroposCard({ children, className = '', active = true }: AtroposCardProps) {
  if (!active) {
    return <div className={`atropos-stretch ${className}`}>{children}</div>
  }

  return (
    <div className={`atropos-stretch ${className}`}>
      <Atropos highlight={false}>{children}</Atropos>
    </div>
  )
}
