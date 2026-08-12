import { useEffect, useRef } from 'react'
import Splitting from 'splitting'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './SplittingText.css'

export interface SplittingTextProps {
  text: string
  className?: string
}

// Splitting ships without TypeScript types; declare a minimal shape.
type SplittingResult = { chars: HTMLElement[] }

export default function SplittingText({ text, className = '' }: SplittingTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!ref.current || reduced) return
    const results = (Splitting as unknown as (opts: { target: HTMLElement; by: string }) => SplittingResult[])({
      target: ref.current,
      by: 'chars',
    })
    if (results[0]?.chars) {
      results[0].chars.forEach((char, i) => {
        char.style.setProperty('--char-index', String(i))
        char.style.animationDelay = `${i * 0.08}s`
      })
    }
  }, [text, reduced])

  return (
    <span ref={ref} className={`ds-splitting-text ${className}`} data-splitting="chars">
      {text}
    </span>
  )
}
