import type { ISourceOptions } from '@tsparticles/engine'
import type { ParticleType } from '../../types/series-theme'

const base = {
  fpsLimit: 60,
  detectRetina: true,
} as const

export const PARTICLE_PRESETS: Record<Exclude<ParticleType, 'none'>, ISourceOptions> = {
  sparkle: {
    ...base,
    particles: {
      number: { value: 60 },
      color: { value: ['#ffffff', '#87CEEB', '#B0E0E6'] },
      opacity: { value: 0.6, animation: { enable: true, speed: 1.5, sync: false } },
      size: { value: { min: 1, max: 3 } },
      move: {
        enable: true, speed: 0.6, direction: 'top', random: true, straight: false,
        outModes: { default: 'out' },
      },
    },
  },
  mist: {
    ...base,
    particles: {
      number: { value: 30 },
      color: { value: '#C41E3A' },
      opacity: { value: 0.18, animation: { enable: true, speed: 0.8, sync: false } },
      size: { value: { min: 14, max: 42 } },
      move: {
        enable: true, speed: 0.3, direction: 'none', random: true, straight: false,
        outModes: { default: 'out' },
      },
    },
  },
  cloud: {
    ...base,
    particles: {
      number: { value: 18 },
      color: { value: '#D4AF6A' },
      opacity: { value: 0.12, animation: { enable: true, speed: 0.4, sync: false } },
      size: { value: { min: 25, max: 75 } },
      move: {
        enable: true, speed: 0.4, direction: 'right', random: false, straight: true,
        outModes: { default: 'out' },
      },
    },
  },
  rust: {
    ...base,
    particles: {
      number: { value: 40 },
      color: { value: ['#8B7355', '#556B2F', '#6B8E23'] },
      opacity: { value: 0.4, animation: { enable: false, speed: 0, sync: false } },
      size: { value: { min: 1, max: 5 } },
      move: {
        enable: true, speed: 0.2, direction: 'bottom', random: true, straight: false,
        outModes: { default: 'destroy' },
      },
    },
  },
  growth: {
    ...base,
    particles: {
      number: { value: 25 },
      color: { value: '#98FB98' },
      opacity: { value: 0.5, animation: { enable: true, speed: 1, sync: false } },
      size: { value: { min: 2, max: 6 } },
      move: {
        enable: true, speed: 0.5, direction: 'top', random: true, straight: false,
        outModes: { default: 'out' },
      },
    },
  },
}
