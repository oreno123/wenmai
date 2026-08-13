import { useState } from 'react'
import type { CSSProperties, ImgHTMLAttributes } from 'react'

export interface PatternImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'style'> {
  src?: string
  alt: string
  style?: CSSProperties
  fallbackSize?: number
}

export default function PatternImage({ src, alt, style, fallbackSize = 36, ...props }: PatternImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: fallbackSize,
        color: 'rgba(201,162,60,0.3)',
        ...style,
      }}>
        ☯
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={style}
      {...props}
    />
  )
}
