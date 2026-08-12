import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal'

describe('Modal', () => {
  it('does not render when open is false', () => {
    render(<Modal open={false}>Content</Modal>)
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders children when open', () => {
    render(<Modal open>Content</Modal>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onClose when backdrop clicked', () => {
    const handleClose = vi.fn()
    render(<Modal open onClose={handleClose}>Content</Modal>)
    fireEvent.click(document.querySelector('.ds-modal-backdrop')!)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when content clicked', () => {
    const handleClose = vi.fn()
    render(<Modal open onClose={handleClose}><div>Inner</div></Modal>)
    fireEvent.click(screen.getByText('Inner'))
    expect(handleClose).not.toHaveBeenCalled()
  })
})
