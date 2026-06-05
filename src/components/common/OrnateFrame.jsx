/**
 * 传统纹样装饰组件
 * 回纹角花、卷草纹边框、缠枝装饰
 */

/* 回纹角花 SVG */
export function MeanderCorner({ size = 32, opacity = 0.35 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block' }}>
      <path
        d="M2 2 L2 38 L38 38"
        fill="none"
        stroke="#D4A843"
        strokeWidth="1.2"
        opacity={opacity}
      />
      {/* 回纹 */}
      <path
        d="M2 8 L8 8 L8 2"
        fill="none"
        stroke="#D4A843"
        strokeWidth="0.8"
        opacity={opacity}
      />
      <path
        d="M2 14 L14 14 L14 2"
        fill="none"
        stroke="#D4A843"
        strokeWidth="0.6"
        opacity={opacity * 0.7}
      />
      <path
        d="M8 38 L8 20 L20 20 L20 8 L38 8"
        fill="none"
        stroke="#D4A843"
        strokeWidth="0.5"
        opacity={opacity * 0.5}
      />
    </svg>
  )
}

/* 卷草纹装饰条 */
export function ScrollBorder({ width = '100%', height = 16, flip = false }) {
  return (
    <svg
      width={width} height={height}
      viewBox="0 0 400 16"
      preserveAspectRatio="none"
      style={{ display: 'block', transform: flip ? 'scaleY(-1)' : 'none' }}
    >
      <defs>
        <linearGradient id="scroll-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5A420E" stopOpacity="0" />
          <stop offset="15%" stopColor="#8B6914" />
          <stop offset="35%" stopColor="#D4A843" />
          <stop offset="50%" stopColor="#F5D870" />
          <stop offset="65%" stopColor="#D4A843" />
          <stop offset="85%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#5A420E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 中心线 */}
      <line x1="0" y1="8" x2="400" y2="8" stroke="url(#scroll-gold)" strokeWidth="0.5" opacity="0.4" />
      {/* 卷草纹 */}
      <path
        d="M20,8 Q35,2 50,8 Q65,14 80,8 Q95,2 110,8 Q125,14 140,8 Q155,2 170,8 Q185,14 200,8 Q215,2 230,8 Q245,14 260,8 Q275,2 290,8 Q305,14 320,8 Q335,2 350,8 Q365,14 380,8"
        fill="none"
        stroke="url(#scroll-gold)"
        strokeWidth="0.8"
        opacity="0.3"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="8s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="50 150" />
      </path>
    </svg>
  )
}

/* 圆形纹样装饰（用于抽卡卡面中心） */
export function CirclePattern({ size = 120, opacity = 0.2 }) {
  return (
    <svg width={size} height={size} viewBox="-60 -60 120 120" style={{ display: 'block' }}>
      {/* 外圈 */}
      <circle cx="0" cy="0" r="55" fill="none" stroke="#D4A843" strokeWidth="0.5" opacity={opacity} />
      {/* 中圈 */}
      <circle cx="0" cy="0" r="40" fill="none" stroke="#D4A843" strokeWidth="0.3" opacity={opacity * 0.7} />
      {/* 内圈 */}
      <circle cx="0" cy="0" r="25" fill="none" stroke="#F5D870" strokeWidth="0.4" opacity={opacity * 0.5}>
        <animate attributeName="r" values="23;27;23" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* 八方位金点 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const rad = a * Math.PI / 180
        const x = Math.cos(rad) * 48
        const y = Math.sin(rad) * 48
        return <circle key={i} cx={x} cy={y} r="1.5" fill="#D4A843" opacity={opacity * 0.8} />
      })}
      {/* 卷草曲线 */}
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const rad = a * Math.PI / 180
        const x1 = Math.cos(rad) * 20
        const y1 = Math.sin(rad) * 20
        const x2 = Math.cos(rad) * 50
        const y2 = Math.sin(rad) * 50
        const cx1 = Math.cos(rad + 0.3) * 35
        const cy1 = Math.sin(rad + 0.3) * 35
        return (
          <path
            key={i}
            d={`M${x1},${y1} Q${cx1},${cy1} ${x2},${y2}`}
            fill="none"
            stroke={i % 2 === 0 ? '#D4A843' : '#F5D870'}
            strokeWidth="0.4"
            opacity={opacity * 0.6}
          />
        )
      })}
    </svg>
  )
}

/* 完整装饰框（卡片用） */
export function OrnateFrame({ children, style, ssr = false }) {
  const cornerOpacity = ssr ? 0.6 : 0.25
  const borderOpacity = ssr ? 0.35 : 0.12

  return (
    <div style={{ position: 'relative', borderRadius: '16px', ...style }}>
      {/* SVG 流动边框 */}
      <svg style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 2,
      }}>
        {/* 外框 */}
        <rect
          x="1" y="1"
          width="calc(100% - 2px)" height="calc(100% - 2px)"
          rx="14" ry="14"
          fill="none"
          stroke={ssr ? '#F5D870' : '#D4A843'}
          strokeWidth={ssr ? 1 : 0.5}
          opacity={borderOpacity}
        />
        {/* 内框装饰线 */}
        <rect
          x="6" y="6"
          width="calc(100% - 12px)" height="calc(100% - 12px)"
          rx="10" ry="10"
          fill="none"
          stroke="#D4A843"
          strokeWidth="0.3"
          strokeDasharray="8 4 2 4"
          opacity={borderOpacity * 0.5}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0" to="-36"
            dur="10s"
            repeatCount="indefinite"
          />
        </rect>
        {/* 流动金丝 */}
        <rect
          x="1" y="1"
          width="calc(100% - 2px)" height="calc(100% - 2px)"
          rx="14" ry="14"
          fill="none"
          stroke="#F5D870"
          strokeWidth="0.3"
          strokeDasharray={ssr ? '60 20 30 40 80 20' : '40 80'}
          opacity={borderOpacity * 0.8}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0" to={ssr ? '-500' : '-240'}
            dur={ssr ? '6s' : '12s'}
            repeatCount="indefinite"
          />
        </rect>
      </svg>

      {/* 四角回纹 */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => {
        const transforms = {
          'top-left': '',
          'top-right': 'scaleX(-1)',
          'bottom-left': 'scaleY(-1)',
          'bottom-right': 'scale(-1)',
        }
        const positions = {
          'top-left': { top: '4px', left: '4px' },
          'top-right': { top: '4px', right: '4px' },
          'bottom-left': { bottom: '4px', left: '4px' },
          'bottom-right': { bottom: '4px', right: '4px' },
        }
        return (
          <div key={pos} style={{
            position: 'absolute',
            ...positions[pos],
            zIndex: 3,
            transform: transforms[pos],
            pointerEvents: 'none',
          }}>
            <MeanderCorner size={ssr ? 36 : 24} opacity={cornerOpacity} />
          </div>
        )
      })}

      {children}
    </div>
  )
}
