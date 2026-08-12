import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from '../Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies variant class', () => {
    render(<Card variant="elevated">Content</Card>)
    expect(screen.getByText('Content').closest('div')).toHaveClass('ds-card', 'card-variant-elevated')
  })

  it('renders header and footer when provided', () => {
    render(
      <Card header={<div>Title</div>} footer={<div>Foot</div>}>
        Body
      </Card>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Foot')).toBeInTheDocument()
  })
})
