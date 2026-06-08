import { useState } from 'react'

export default function PatternImage({ src, alt, style, fallbackSize = 36, ...props }) {
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
