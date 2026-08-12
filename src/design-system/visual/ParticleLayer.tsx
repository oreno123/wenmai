import { memo, useMemo } from 'react'
import Particles from '@tsparticles/react'
import type { ISourceOptions } from '@tsparticles/engine'
import type { ParticleType } from '../../types/series-theme'
import { PARTICLE_PRESETS } from './particle-presets'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './ParticleLayer.css'

export interface ParticleLayerProps {
  type: ParticleType
  className?: string
}

function ParticleLayerImpl({ type, className = '' }: ParticleLayerProps) {
  const reduced = useReducedMotion()

  const options = useMemo<ISourceOptions | null>(() => {
    if (type === 'none' || reduced) return null
    return PARTICLE_PRESETS[type] as unknown as ISourceOptions
  }, [type, reduced])

  if (!options) return null

  return (
    <div className={`ds-particle-layer ${className}`} aria-hidden>
      <Particles id={`particle-${type}`} options={options} />
    </div>
  )
}

export const ParticleLayer = memo(ParticleLayerImpl)
export default ParticleLayer
