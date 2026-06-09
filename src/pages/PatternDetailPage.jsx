import { useMemo } from 'react'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { getPatternById, getPatternImage, getRarityLabel, getSeriesInfo } from '../store/patternData'
import { PATTERN_DESCRIPTIONS } from '../data/patternDescriptions'
import PatternImage from '../components/common/PatternImage'

const GOLD_MAIN = '#D4AF6A'
const GOLD_BRIGHT = '#F2D58A'
const TEXT_PRIMARY = '#F5F1E8'
const TEXT_SECONDARY = '#8A8A8A'
const TEXT_DIM = '#4A4A4A'

const RARITY_STYLES = {
  ssr: {
    label: '#F2D58A',
    badgeBg: 'rgba(242,213,138,0.15)',
    badgeBorder: 'rgba(242,213,138,0.3)',
    glow: '0 0 40px rgba(201,162,60,0.25), 0 0 80px rgba(201,162,60,0.1)',
    glowBg: 'radial-gradient(ellipse at 50% 50%, rgba(201,162,60,0.08) 0%, transparent 70%)',
  },
  rare: {
    label: '#D4AF6A',
    badgeBg: 'rgba(212,175,106,0.1)',
    badgeBorder: 'rgba(212,175,106,0.2)',
    glow: '0 0 20px rgba(212,175,106,0.12)',
    glowBg: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,106,0.04) 0%, transparent 70%)',
  },
  common: {
    label: '#8A8A8A',
    badgeBg: 'rgba(138,138,138,0.08)',
    badgeBorder: 'rgba(138,138,138,0.15)',
    glow: 'none',
    glowBg: 'none',
  },
}

export default function PatternDetailPage() {
  const navigate = useNavigate()
  const { data } = useApp()

  // Parse pattern ID from hash: #/pattern/cloud-1 -> "cloud-1"
  const patternId = useMemo(() => {
    const hash = window.location.hash.slice(1) // remove #
    const match = hash.match(/^\/pattern\/(.+)$/)
    return match ? match[1] : null
  }, [])

  const pattern = patternId ? getPatternById(patternId) : undefined
  const description = patternId ? PATTERN_DESCRIPTIONS[patternId] : undefined
  const seriesInfo = pattern ? getSeriesInfo(pattern.series) : undefined
  const imgSrc = pattern ? getPatternImage(pattern) : ''
  const isOwned = pattern ? data.library.includes(pattern.id) : false
  const rarityStyle = pattern ? RARITY_STYLES[pattern.rarity] : RARITY_STYLES.common

  // ── Not found state ──
  if (!pattern) {
    return (
      <div style={{ padding: '16px', paddingBottom: '80px', minHeight: '100vh' }}>
        <button
          onClick={() => navigate('/library')}
          style={{
            background: 'none', border: 'none', color: GOLD_MAIN,
            fontSize: '14px', cursor: 'pointer', padding: '8px 0',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          <span style={{ fontSize: '16px' }}>&#8592;</span> 返回图鉴
        </button>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', color: TEXT_DIM,
        }}>
          <span style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>&#9788;</span>
          <span style={{ fontSize: '16px', color: TEXT_SECONDARY }}>纹样未找到</span>
        </div>
      </div>
    )
  }

  // ── Section helper ──
  const Section = ({ icon, label, children }) => (
    <div>
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(212,175,106,0.15), transparent)',
        marginBottom: '12px',
      }} />
      <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px' }}>{icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: GOLD_MAIN, letterSpacing: '1px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '13px', lineHeight: '1.8', color: TEXT_SECONDARY }}>
        {children}
      </div>
    </div>
  )

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>

      {/* ── Back button ── */}
      <button
        onClick={() => navigate('/library')}
        style={{
          background: 'none', border: 'none', color: GOLD_MAIN,
          fontSize: '14px', cursor: 'pointer', padding: '8px 0',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '16px' }}>&#8592;</span> 返回图鉴
      </button>

      {/* ── Pattern image ── */}
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '240px',
        marginBottom: '20px',
      }}>
        {/* Rarity glow background */}
        {pattern.rarity !== 'common' && (
          <div style={{
            position: 'absolute',
            width: '200px', height: '200px',
            borderRadius: '50%',
            background: rarityStyle.glowBg,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{
          width: '180px', height: '180px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Decorative circle for SSR */}
          {pattern.rarity === 'ssr' && (
            <svg style={{ position: 'absolute', inset: '-10px', opacity: 0.12 }} viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="#C9A23C" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="#C9A23C" strokeWidth="0.3" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
                const r = a * Math.PI / 180
                return (
                  <line key={a}
                    x1={100 + Math.cos(r) * 70} y1={100 + Math.sin(r) * 70}
                    x2={100 + Math.cos(r) * 90} y2={100 + Math.sin(r) * 90}
                    stroke="#C9A23C" strokeWidth="0.3"
                  />
                )
              })}
            </svg>
          )}

          <PatternImage
            src={imgSrc}
            alt={pattern.name}
            fallbackSize={48}
            style={{
              maxWidth: '90%', maxHeight: '90%', objectFit: 'contain',
              filter: pattern.rarity === 'ssr'
                ? 'drop-shadow(0 0 16px rgba(201,162,60,0.35))'
                : pattern.rarity === 'rare'
                  ? 'drop-shadow(0 0 8px rgba(201,162,60,0.15))'
                  : 'none',
            }}
          />
        </div>

        {/* Ownership lock overlay */}
        {!isOwned && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,15,16,0.4)',
            borderRadius: '16px',
          }}>
            <span style={{ fontSize: '40px', opacity: 0.6 }}>&#128274;</span>
          </div>
        )}
      </div>

      {/* ── Name + Rarity badge ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '8px', flexWrap: 'wrap',
      }}>
        <h1 style={{
          fontSize: '22px', fontWeight: 700, letterSpacing: '1px',
          color: pattern.rarity === 'ssr' ? GOLD_BRIGHT : TEXT_PRIMARY,
          fontFamily: 'inherit', lineHeight: 1.3,
        }}>
          {pattern.name}
        </h1>
        <span style={{
          fontSize: '11px', fontWeight: 500,
          padding: '2px 8px', borderRadius: '10px',
          background: rarityStyle.badgeBg,
          border: `1px solid ${rarityStyle.badgeBorder}`,
          color: rarityStyle.label,
          whiteSpace: 'nowrap',
        }}>
          {getRarityLabel(pattern.rarity)}
        </span>
      </div>

      {/* ── Series tag ── */}
      {seriesInfo && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 10px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '20px',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: seriesInfo.color,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '12px', color: TEXT_SECONDARY }}>{seriesInfo.name}</span>
        </div>
      )}

      {/* ── Info sections ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Dynasty */}
        {description && (description.dynasty || description.period) && (
          <Section icon="&#128220;" label="朝代">
            <span style={{ color: TEXT_PRIMARY }}>
              {[description.dynasty, description.period].filter(Boolean).join(' · ')}
            </span>
          </Section>
        )}

        {/* History */}
        {description?.history && (
          <Section icon="&#128214;" label="历史">
            {description.history}
          </Section>
        )}

        {/* Significance */}
        {description?.significance && (
          <Section icon="&#10022;" label="寓意">
            {description.significance}
          </Section>
        )}

        {/* Usage */}
        {description?.usage && (
          <Section icon="&#128296;" label="用途">
            {description.usage}
          </Section>
        )}

        {/* Fun fact */}
        {description?.funFact && (
          <Section icon="&#128161;" label="趣闻">
            {description.funFact}
          </Section>
        )}
      </div>

      {/* ── Tags ── */}
      {pattern.tags && pattern.tags.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(212,175,106,0.12), transparent)',
            marginBottom: '14px',
          }} />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {pattern.tags.map(tag => (
              <span key={tag} style={{
                fontSize: '11px',
                padding: '3px 10px', borderRadius: '12px',
                background: 'rgba(212,175,106,0.08)',
                border: '1px solid rgba(212,175,106,0.12)',
                color: GOLD_MAIN,
                whiteSpace: 'nowrap',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
