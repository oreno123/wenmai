/* 金丝装饰组件 */

/* 流动金丝线 - 横向 */
export function GoldThreadH({ style }) {
  return (
    <svg width="100%" height="12" style={{ display: 'block', ...style }} viewBox="0 0 400 12" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gold-thread-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5A420E" stopOpacity="0" />
          <stop offset="20%" stopColor="#D4A843" />
          <stop offset="40%" stopColor="#FFF0A0" />
          <stop offset="50%" stopColor="#F5D870" />
          <stop offset="60%" stopColor="#FFF0A0" />
          <stop offset="80%" stopColor="#D4A843" />
          <stop offset="100%" stopColor="#5A420E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="6" x2="400" y2="6" stroke="url(#gold-thread-h)" strokeWidth="0.8" opacity="0.6" />
      <line x1="0" y1="6" x2="400" y2="6" stroke="url(#gold-thread-h)" strokeWidth="0.3" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="400" to="0" dur="3s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="40 360" />
      </line>
    </svg>
  )
}

/* 角花装饰 - 左上 */
export function CornerOrnament({ position = 'top-left', size = 40 }) {
  const transforms = {
    'top-left': '',
    'top-right': 'scale(-1,1)',
    'bottom-left': 'scale(1,-1)',
    'bottom-right': 'scale(-1,-1)',
  }
  const positions = {
    'top-left': { top: 0, left: 0 },
    'top-right': { top: 0, right: 0 },
    'bottom-left': { bottom: 0, left: 0 },
    'bottom-right': { bottom: 0, right: 0 },
  }

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 60 60"
      style={{
        position: 'absolute',
        ...positions[position],
        opacity: 0.35,
        transform: transforms[position],
        pointerEvents: 'none',
      }}
    >
      <path
        d="M2 2 L2 30 Q2 18 14 18 L30 18 Q18 18 18 14 L18 2"
        fill="none"
        stroke="#D4A843"
        strokeWidth="1"
      />
      <path
        d="M2 2 L2 22 Q2 10 12 10 L22 10"
        fill="none"
        stroke="#F5D870"
        strokeWidth="0.5"
        opacity="0.5"
      />
      <circle cx="4" cy="4" r="1.5" fill="#D4A843" opacity="0.6" />
    </svg>
  )
}

/* 旋转金丝纹 */
export function SpinningGoldMandala({ size = 200, opacity = 0.06, speed = 40 }) {
  return (
    <div style={{
      width: size, height: size,
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      opacity,
    }}>
      <svg width="100%" height="100%" viewBox="-100 -100 200 200"
        style={{ animation: `ray-spin ${speed}s linear infinite` }}>
        {/* 外圈 */}
        <circle cx="0" cy="0" r="90" fill="none" stroke="#D4A843" strokeWidth="0.3" opacity="0.4" />
        <circle cx="0" cy="0" r="70" fill="none" stroke="#D4A843" strokeWidth="0.5" opacity="0.3" />
        {/* 金丝线 */}
        {[0, 30, 60, 90, 120, 150].map((angle, i) => (
          <g key={i} transform={`rotate(${angle})`}>
            <path
              d="M0,-85 Q20,-40 0,-20 Q-20,0 0,20 Q20,40 0,85"
              fill="none"
              stroke={i % 2 === 0 ? '#D4A843' : '#F5D870'}
              strokeWidth="0.4"
              opacity="0.5"
            />
          </g>
        ))}
        {/* 内圈 */}
        <circle cx="0" cy="0" r="20" fill="none" stroke="#F5D870" strokeWidth="0.3" opacity="0.5">
          <animate attributeName="r" values="18;22;18" dur="4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

/* 流动金丝 - 垂直装饰线 */
export function GoldThreadV({ x = 0, height = '100%' }) {
  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: 0,
      width: '1px',
      height,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '1px',
        height: '200%',
        background: 'linear-gradient(180deg, transparent 0%, #5A420E 10%, #D4A843 30%, #FFF0A0 50%, #D4A843 70%, #5A420E 90%, transparent 100%)',
        animation: 'flow 4s linear infinite',
        backgroundSize: '100% 200%',
      }} />
    </div>
  )
}

/* 金丝缠绕边框 */
export function GoldWireBorder({ children, style, ssr = false }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {/* SVG 边框 */}
      <svg style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}>
        <rect
          x="0.5" y="0.5"
          width="calc(100% - 1px)" height="calc(100% - 1px)"
          rx="14"
          fill="none"
          stroke="#D4A843"
          strokeWidth={ssr ? 1 : 0.5}
          strokeDasharray={ssr ? "100 20 40 20" : "60 40"}
          opacity={ssr ? 0.5 : 0.2}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0" to={ssr ? "-360" : "-200"}
            dur={ssr ? "8s" : "12s"}
            repeatCount="indefinite"
          />
        </rect>
        {ssr && (
          <rect
            x="2" y="2"
            width="calc(100% - 4px)" height="calc(100% - 4px)"
            rx="12"
            fill="none"
            stroke="#FFF0A0"
            strokeWidth="0.3"
            strokeDasharray="30 50 80 40"
            opacity="0.3"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0" to="400"
              dur="10s"
              repeatCount="indefinite"
            />
          </rect>
        )}
      </svg>
      {children}
    </div>
  )
}
