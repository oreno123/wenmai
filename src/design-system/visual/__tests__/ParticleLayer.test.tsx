import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ParticleLayer from '../ParticleLayer'

vi.mock('@tsparticles/react', () => ({
  default: ({ id }: { id: string }) => <div data-testid="mock-particles" data-id={id} />,
}))

describe('ParticleLayer', () => {
  it('renders nothing when type is none', () => {
    const { container } = render(<ParticleLayer type="none" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders particles container when type is set', () => {
    render(<ParticleLayer type="sparkle" />)
    expect(screen.getByTestId('mock-particles')).toBeInTheDocument()
  })

  it('passes unique id based on type', () => {
    render(<ParticleLayer type="mist" />)
    expect(screen.getByTestId('mock-particles').getAttribute('data-id')).toContain('mist')
  })
})
