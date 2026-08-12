import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AtroposCard from '../AtroposCard'

vi.mock('atropos/react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-atropos">{children}</div>,
}))

describe('AtroposCard', () => {
  it('renders children inside atropos wrapper', () => {
    render(<AtroposCard>Card content</AtroposCard>)
    expect(screen.getByTestId('mock-atropos')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies stretch className by default', () => {
    render(<AtroposCard>Content</AtroposCard>)
    expect(screen.getByTestId('mock-atropos').parentElement).toHaveClass('atropos-stretch')
  })
})
