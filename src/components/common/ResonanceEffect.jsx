const DOTS = Array.from({ length: 18 }, (_, index) => index)

export default function ResonanceEffect({ active, className = '' }) {
  if (!active) return null

  return (
    <div className={`wm-resonance ${className}`.trim()} aria-hidden="true">
      <i className="wm-resonance__ring" />
      <i className="wm-resonance__ring wm-resonance__ring--late" />
      {DOTS.map(index => <i className="wm-resonance__dot" key={index} />)}
    </div>
  )
}
