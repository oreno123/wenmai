import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SeriesSkin from '../SeriesSkin'
import { useReducedMotion } from '../../../hooks/useReducedMotion'

vi.mock('@tsparticles/react', () => ({
  default: ({ id }: { id: string }) => <div data-testid="mock-particles" data-id={id} />,
}))

vi.mock('../../../hooks/useReducedMotion')

describe('SeriesSkin', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('renders children', () => {
    render(<SeriesSkin series="qinghua"><div>Content</div></SeriesSkin>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies series CSS variables to wrapper', () => {
    render(<SeriesSkin series="qinghua"><div>Content</div></SeriesSkin>)
    const wrapper = screen.getByText('Content').parentElement!
    expect(wrapper.style.getPropertyValue('--series-primary')).toBe('#87CEEB')
  })

  it('falls back to neutral for unknown series', () => {
    render(<SeriesSkin series="unknown"><div>Content</div></SeriesSkin>)
    const wrapper = screen.getByText('Content').parentElement!
    expect(wrapper.className).toContain('series-neutral')
  })

  it('applies intensity class', () => {
    render(<SeriesSkin series="qinghua" intensity="subtle"><div>Content</div></SeriesSkin>)
    const wrapper = screen.getByText('Content').parentElement!
    expect(wrapper.className).toContain('intensity-subtle')
  })

  it('renders particle layer when intensity is full and theme has particle', () => {
    render(<SeriesSkin series="qinghua"><div>Content</div></SeriesSkin>)
    expect(screen.getByTestId('mock-particles')).toBeInTheDocument()
  })

  it('does not render particle layer when intensity is minimal', () => {
    render(<SeriesSkin series="qinghua" intensity="minimal"><div>Content</div></SeriesSkin>)
    expect(screen.queryByTestId('mock-particles')).not.toBeInTheDocument()
  })

  it('does not render particle layer for series with particle none', () => {
    render(<SeriesSkin series="geometric"><div>Content</div></SeriesSkin>)
    expect(screen.queryByTestId('mock-particles')).not.toBeInTheDocument()
  })
})
