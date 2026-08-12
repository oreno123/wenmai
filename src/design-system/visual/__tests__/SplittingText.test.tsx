import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SplittingText from '../SplittingText'

vi.mock('splitting', () => ({
  default: vi.fn(() => [{ chars: [] }]),
}))

describe('SplittingText', () => {
  it('renders text content', () => {
    render(<SplittingText text="青花瓷" />)
    expect(screen.getByText('青花瓷')).toBeInTheDocument()
  })

  it('applies data-splitting attribute', () => {
    render(<SplittingText text="龍" />)
    expect(screen.getByText('龍').closest('[data-splitting]')).toBeTruthy()
  })
})
