import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LottieAsset from '../LottieAsset'

vi.mock('lottie-react', () => ({
  default: ({ animationData }: { animationData: unknown }) => (
    <div data-testid="mock-lottie">{Object.keys(animationData as object).length} keys</div>
  ),
}))

describe('LottieAsset', () => {
  it('renders lottie player when data is provided', () => {
    render(<LottieAsset data={{ v: '5.0.0', layers: [] }} />)
    expect(screen.getByTestId('mock-lottie')).toBeInTheDocument()
  })

  it('renders fallback when data is null', () => {
    render(<LottieAsset data={null} fallback={<div>No AE</div>} />)
    expect(screen.getByText('No AE')).toBeInTheDocument()
  })
})
