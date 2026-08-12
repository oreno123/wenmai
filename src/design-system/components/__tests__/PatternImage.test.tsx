import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PatternImage from '../PatternImage'

describe('PatternImage', () => {
  it('renders img with src', () => {
    render(<PatternImage src="/test.webp" alt="test" />)
    const img = screen.getByAltText('test') as HTMLImageElement
    expect(img.src).toContain('/test.webp')
  })

  it('applies size class', () => {
    render(<PatternImage src="/test.webp" alt="test" size="lg" />)
    expect(screen.getByAltText('test')).toHaveClass('pi-size-lg')
  })

  it('shows fallback on error', () => {
    render(<PatternImage src="/test.webp" alt="test" fallback={<div>FB</div>} />)
    const img = screen.getByAltText('test')
    fireEvent.error(img)
    expect(screen.getByText('FB')).toBeInTheDocument()
  })
})
