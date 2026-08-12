import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const sizeClass: Record<Size, string> = {
  sm: 'btn-size-sm',
  md: 'btn-size-md',
  lg: 'btn-size-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = ['ds-btn', `btn-variant-${variant}`, sizeClass[size], className]
    .filter(Boolean).join(' ')
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
