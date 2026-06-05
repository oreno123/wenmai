export function updateSpring(current, target, velocity, stiffness, damping, dt) {
  const force = stiffness * (target - current) - damping * velocity
  const newVelocity = velocity + force * dt
  const newPosition = current + newVelocity * dt
  return { position: newPosition, velocity: newVelocity }
}
