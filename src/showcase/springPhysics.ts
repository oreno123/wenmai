export interface SpringResult {
  position: number
  velocity: number
}

export function updateSpring(
  current: number,
  target: number,
  velocity: number,
  stiffness: number,
  damping: number,
  dt: number,
): SpringResult {
  const force = stiffness * (target - current) - damping * velocity
  const newVelocity = velocity + force * dt
  const newPosition = current + newVelocity * dt
  return { position: newPosition, velocity: newVelocity }
}
