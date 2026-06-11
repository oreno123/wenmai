export type GestureState = 'IDLE' | 'TRACKING' | 'SWIPING' | 'SCALING'

export interface PalmCenter {
  x: number
  y: number
  z: number
}

export interface HandData {
  palmCenter: PalmCenter
  handedness: 'left' | 'right' | 'unknown'
  landmarks: { x: number; y: number; z: number }[]
}

export interface SwipeEvent {
  direction: 'left' | 'right'
  velocity: number
}

export interface ScaleEvent {
  scale: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  radius: number
  color: string
  alpha: number
}
