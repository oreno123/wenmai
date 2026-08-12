import { useState } from 'react'
import type { ReactNode } from 'react'
import './PatternImage.css'

type Size = 'sm' | 'md' | 'lg' | 'full'

export interface PatternImageProps {
  src: string
  alt: string
  size?: Size
  fallback?: ReactNode
  className?: string
}

export default function PatternImage({
  src,
  alt,
  size = 'md',
  fallback,
  className = '',
}: PatternImageProps) {
  const [errored, setErrored] = useState(false)

  if (errored && fallback) {
    return <div className={`pi-fallback pi-size-${size} ${className}`}>{fallback}</div>
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`ds-pattern-image pi-size-${size} ${className}`}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )
}
