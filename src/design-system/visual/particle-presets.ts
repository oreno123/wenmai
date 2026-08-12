import type { ParticleType } from '../../types/series-theme'

export interface ParticlePreset {
  particles: {
    number: { value: number }
    color: { value: string | string[] }
    opacity: { value: number; animation: { enable: boolean; speed: number; sync: boolean } }
    size: { value: number; random: boolean }
    move: {
      enable: boolean
      speed: number
      direction: 'none' | 'top' | 'bottom' | 'left' | 'right'
      random: boolean
      straight: boolean
      outModes: { default: 'out' | 'destroy' }
    }
    links: { enable: boolean; distance: number; color: string; opacity: number; width: number }
  }
  fpsLimit: number
  detectRetina: boolean
}

const base = {
  fpsLimit: 60,
  detectRetina: true,
}

export const PARTICLE_PRESETS: Record<Exclude<ParticleType, 'none'>, ParticlePreset> = {
  sparkle: {
    ...base,
    particles: {
      number: { value: 60 },
      color: { value: ['#ffffff', '#87CEEB', '#B0E0E6'] },
      opacity: { value: 0.6, animation: { enable: true, speed: 1.5, sync: false } },
      size: { value: 2, random: true },
      move: {
        enable: true, speed: 0.6, direction: 'top', random: true, straight: false,
        outModes: { default: 'out' },
      },
      links: { enable: false, distance: 0, color: '#fff', opacity: 0, width: 0 },
    },
  },
  mist: {
    ...base,
    particles: {
      number: { value: 30 },
      color: { value: '#C41E3A' },
      opacity: { value: 0.18, animation: { enable: true, speed: 0.8, sync: false } },
      size: { value: 28, random: true },
      move: {
        enable: true, speed: 0.3, direction: 'none', random: true, straight: false,
        outModes: { default: 'out' },
      },
      links: { enable: false, distance: 0, color: '#000', opacity: 0, width: 0 },
    },
  },
  cloud: {
    ...base,
    particles: {
      number: { value: 18 },
      color: { value: '#D4AF6A' },
      opacity: { value: 0.12, animation: { enable: true, speed: 0.4, sync: false } },
      size: { value: 50, random: true },
      move: {
        enable: true, speed: 0.4, direction: 'right', random: false, straight: true,
        outModes: { default: 'out' },
      },
      links: { enable: false, distance: 0, color: '#000', opacity: 0, width: 0 },
    },
  },
  rust: {
    ...base,
    particles: {
      number: { value: 40 },
      color: { value: ['#8B7355', '#556B2F', '#6B8E23'] },
      opacity: { value: 0.4, animation: { enable: false, speed: 0, sync: false } },
      size: { value: 3, random: true },
      move: {
        enable: true, speed: 0.2, direction: 'bottom', random: true, straight: false,
        outModes: { default: 'destroy' },
      },
      links: { enable: false, distance: 0, color: '#000', opacity: 0, width: 0 },
    },
  },
  growth: {
    ...base,
    particles: {
      number: { value: 25 },
      color: { value: '#98FB98' },
      opacity: { value: 0.5, animation: { enable: true, speed: 1, sync: false } },
      size: { value: 4, random: true },
      move: {
        enable: true, speed: 0.5, direction: 'top', random: true, straight: false,
        outModes: { default: 'out' },
      },
      links: { enable: false, distance: 0, color: '#000', opacity: 0, width: 0 },
    },
  },
}
