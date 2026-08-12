import { memo } from 'react'
import type { DecorationType } from '../../types/series-theme'
import CloudDecoration from './decorations/CloudDecoration'
import SealDecoration from './decorations/SealDecoration'
import BronzeDecoration from './decorations/BronzeDecoration'
import VineDecoration from './decorations/VineDecoration'
import SplashDecoration from './decorations/SplashDecoration'
import './DecorationLayer.css'

export interface DecorationLayerProps {
  type: DecorationType
  className?: string
}

function DecorationLayerImpl({ type, className = '' }: DecorationLayerProps) {
  if (type === 'none') return null

  return (
    <div className={`ds-decoration-layer ${className}`} aria-hidden>
      {type === 'cloud' && (
        <svg className="deco-cloud-svg" viewBox="0 0 300 100" preserveAspectRatio="none">
          <CloudDecoration />
        </svg>
      )}
      {type === 'seal' && (
        <svg className="deco-seal-svg" viewBox="0 0 60 60">
          <SealDecoration />
        </svg>
      )}
      {type === 'bronze' && (
        <svg className="deco-bronze-svg" viewBox="0 0 120 160">
          <BronzeDecoration />
        </svg>
      )}
      {type === 'vine' && <VineDecoration />}
      {type === 'splash' && <SplashDecoration />}
    </div>
  )
}

export const DecorationLayer = memo(DecorationLayerImpl)
export default DecorationLayer
