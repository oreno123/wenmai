import './SplashDecoration.css'

export default function SplashDecoration() {
  return (
    <svg className="deco-splash" aria-hidden viewBox="0 0 200 200" preserveAspectRatio="none">
      <path
        d="M100,20 Q140,40 160,80 Q180,120 160,160 Q120,180 80,160 Q40,140 20,100 Q40,60 100,20 Z"
        fill="none"
        stroke="var(--series-primary)"
        strokeWidth="1.5"
        opacity="0.25"
      />
    </svg>
  )
}
