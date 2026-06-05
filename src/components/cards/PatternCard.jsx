import { getRarityLabel, getPatternImage } from '../../store/patternData'

export default function PatternCard({ pattern, onClick, compact = false }) {
  const isSSR = pattern.rarity === 'ssr'
  const isRare = pattern.rarity === 'rare'
  const imgSrc = getPatternImage(pattern)

  return (
    <div
      onClick={onClick}
      className={`glass-card rarity-${pattern.rarity}`}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        animation: isSSR ? 'pulse-glow 3s ease-in-out infinite' : 'none',
        border: `1px solid ${
          isSSR ? 'rgba(201,162,60,0.35)'
          : isRare ? 'rgba(201,162,60,0.15)'
          : 'var(--border-glass)'
        }`,
      }}
    >
      {/* SSR 内发光 */}
      {isSSR && (
        <div style={{
          position: 'absolute', top: '-20%', left: '10%', right: '10%',
          height: '50%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(201,162,60,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* 纹样区 */}
      <div style={{
        height: compact ? '80px' : '130px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {/* 祥云纹底纹 SVG */}
        <svg width="70%" height="70%" viewBox="0 0 100 100" style={{
          position: 'absolute', opacity: isSSR ? 0.12 : isRare ? 0.06 : 0.03,
        }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#C9A23C" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="#C9A23C" strokeWidth="0.3" />
          {[0,60,120,180,240,300].map(a => {
            const r = a * Math.PI / 180
            return <line key={a} x1={50+Math.cos(r)*25} y1={50+Math.sin(r)*25}
              x2={50+Math.cos(r)*40} y2={50+Math.sin(r)*40}
              stroke="#C9A23C" strokeWidth="0.3" />
          })}
        </svg>

        {imgSrc ? (
          <img
            src={imgSrc}
            alt={pattern.name}
            style={{
              maxWidth: '80%', maxHeight: '80%', objectFit: 'contain',
              position: 'relative',
              filter: isSSR ? 'drop-shadow(0 0 12px rgba(201,162,60,0.35))' : isRare ? 'drop-shadow(0 0 6px rgba(201,162,60,0.15))' : 'none',
              animation: isSSR ? 'breathe 2.5s ease-in-out infinite' : 'none',
            }}
          />
        ) : (
          <div style={{
            fontSize: compact ? '24px' : '36px',
            position: 'relative',
            color: isSSR ? 'var(--gold-bright)' : isRare ? 'var(--gold-main)' : 'rgba(201,162,60,0.3)',
            filter: isSSR ? 'drop-shadow(0 0 12px rgba(201,162,60,0.35))' : isRare ? 'drop-shadow(0 0 6px rgba(201,162,60,0.15))' : 'none',
            animation: isSSR ? 'breathe 2.5s ease-in-out infinite' : 'none',
          }}>
            ☯
          </div>
        )}
      </div>

      {/* 分隔 */}
      <div style={{
        height: '1px', margin: '0 12px',
        background: `linear-gradient(90deg, transparent, rgba(201,162,60,${isSSR ? 0.15 : 0.05}), transparent)`,
      }} />

      {/* 信息 */}
      <div style={{ padding: compact ? '6px 10px' : '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
          <span style={{
            fontSize: compact ? '11px' : '13px', fontWeight: 600, letterSpacing: '0.5px',
            color: isSSR ? 'var(--gold-light)' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
          }}>
            {pattern.name}
          </span>
          <span className={`rarity-badge rarity-${pattern.rarity}`}>
            {getRarityLabel(pattern.rarity)}
          </span>
        </div>
        {!compact && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            {pattern.type}
          </div>
        )}
      </div>
    </div>
  )
}
