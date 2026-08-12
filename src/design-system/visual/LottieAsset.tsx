import type { ReactNode } from 'react'
import Lottie from 'lottie-react'

export interface LottieAssetProps {
  data: Record<string, unknown> | null
  fallback?: ReactNode
  loop?: boolean
  autoplay?: boolean
  className?: string
}

export default function LottieAsset({
  data,
  fallback = null,
  loop = true,
  autoplay = true,
  className = '',
}: LottieAssetProps) {
  if (!data) return <>{fallback}</>
  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      className={className}
    />
  )
}
