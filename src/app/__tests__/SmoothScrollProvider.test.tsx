import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import SmoothScrollProvider from '../SmoothScrollProvider'

vi.mock('lenis', () => ({
  default: vi.fn(() => ({
    raf: vi.fn(),
    destroy: vi.fn(),
  })),
}))

// Mock useReducedMotion so the hook actually runs (default false from matchMedia in jsdom may be undefined)
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

describe('SmoothScrollProvider', () => {
  it('renders children', () => {
    const { container } = render(
      <SmoothScrollProvider><div>Content</div></SmoothScrollProvider>
    )
    expect(container.textContent).toContain('Content')
  })
})
