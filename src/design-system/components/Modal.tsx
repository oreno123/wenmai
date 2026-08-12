import type { ReactNode } from 'react'
import { useEffect } from 'react'
import './Modal.css'

export interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  title?: string
}

export default function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="ds-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div className="ds-modal-content">
        {title && <div className="ds-modal-title">{title}</div>}
        {children}
      </div>
    </div>
  )
}
