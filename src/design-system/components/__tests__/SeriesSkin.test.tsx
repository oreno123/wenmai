import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SeriesSkin from '../SeriesSkin'

describe('SeriesSkin', () => {
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
})
