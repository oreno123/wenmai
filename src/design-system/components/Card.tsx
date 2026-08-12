import type { ReactNode } from 'react'
import './Card.css'

type Variant = 'flat' | 'elevated' | 'glass'

export interface CardProps {
  variant?: Variant
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}

export default function Card({
  variant = 'flat',
  header,
  footer,
  children,
  className = '',
}: CardProps) {
  const cls = ['ds-card', `card-variant-${variant}`, className]
    .filter(Boolean).join(' ')
  const hasChrome = Boolean(header || footer)
  return (
    <div className={cls}>
      {header && <div className="ds-card-header">{header}</div>}
      {hasChrome
        ? <div className="ds-card-body">{children}</div>
        : children}
      {footer && <div className="ds-card-footer">{footer}</div>}
    </div>
  )
}
