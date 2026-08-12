import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ParticleLayer from '../ParticleLayer'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

vi.mock('@tsparticles/react', () => ({
  default: ({ id }: { id: string }) => <div data-testid="mock-particles" data-id={id} />,
}))

vi.mock('../../../hooks/useReducedMotion')

describe('ParticleLayer', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

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

  it('renders nothing when user prefers reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { container } = render(<ParticleLayer type="sparkle" />)
    expect(container.firstChild).toBeNull()
  })
})
