import { useState, useMemo } from 'react'
import { useApp } from '../store/AppState'
import { getPatternById, getPatternImage, getRarityLabel } from '../store/patternData'
import PatternImage from '../components/common/PatternImage'
import ReliefScene from '../components/relief/ReliefScene'

const RARITY_COLOR = {
  ssr: '#C9A23C',
  rare: '#BC6B2F',
  common: '#666',
}

// Group by series (in a defined order), then by rarity inside each group —
// so the selector reads as "all my clouds, then all my dragons, ..." instead
// of "what I pulled most recently first".
const SERIES_ORDER = ['cloud', 'taotie', 'dragon', 'scroll', 'geometric', 'floral', 'corner', 'tile', 'shanjing', 'qinghua']
const RARITY_ORDER = { ssr: 0, rare: 1, common: 2 }

export default function Editor() {
  const { data } = useApp()
  const [selectedPattern, setSelectedPattern] = useState(data.library[0] || null)

  const myPatterns = useMemo(
    () => data.library
      .map(id => getPatternById(id))
      .filter(Boolean)
      .sort((a, b) => {
        const sa = SERIES_ORDER.indexOf(a.series)
        const sb = SERIES_ORDER.indexOf(b.series)
        if (sa !== sb) return (sa === -1 ? 999 : sa) - (sb === -1 ? 999 : sb)
        return (RARITY_ORDER[a.rarity] ?? 2) - (RARITY_ORDER[b.rarity] ?? 2)
      }),
    [data.library]
  )

  const selected = myPatterns.find(p => p.id === selectedPattern)
  const imageUrl = selected ? getPatternImage(selected) : null

  // Pick material preset based on the pattern family:
  //   - qinghua / shanjing are photographic (opaque) — render as glazed porcelain
  //   - everything else (gold-line transparent PNGs) — render as raised metal relief
  const isPorcelain = selected && (selected.series === 'qinghua' || selected.series === 'shanjing')
  const reliefParams = isPorcelain
    ? { porcelain: true, metalness: 0.08, roughness: 0.6, baseColor: '#F5EFE0', normalScale: 1.2 }
    : { porcelain: false, metalness: 0.7, roughness: 0.35, baseColor: '#C4A265', normalScale: 1.6 }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '14px 16px 12px',
        flex: '0 0 auto',
        borderBottom: '1px solid rgba(212,175,106,0.08)',
        background: 'rgba(8,6,4,0.4)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <h1 style={{
            fontFamily: 'Noto Serif SC, serif', fontSize: 20, fontWeight: 600,
            color: '#F2D58A', letterSpacing: '0.15em', margin: 0,
          }}>
            纹样浮雕
          </h1>
          <span style={{
            fontSize: 9, color: '#8A6A30', letterSpacing: '0.3em',
            textTransform: 'uppercase', fontWeight: 500,
          }}>
            Relief
          </span>
        </div>

        {/* Pattern selector */}
        <div>
          <div style={{
            fontFamily: 'Noto Serif SC, serif', fontSize: 11, fontWeight: 600,
            color: '#A09682', marginBottom: 6, letterSpacing: '0.15em',
          }}>
            选择纹样
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {myPatterns.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPattern(p.id)}
                style={{
                  flex: '0 0 auto', width: 56, height: 56, borderRadius: 10,
                  background: 'linear-gradient(145deg, #1F1D17, #14120D)',
                  border: selectedPattern === p.id
                    ? '2px solid rgba(212,175,106,0.55)'
                    : '1px solid rgba(212,175,106,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  boxShadow: selectedPattern === p.id
                    ? '0 0 14px rgba(212,175,106,0.3), inset 0 1px 0 rgba(212,175,106,0.1)'
                    : 'none',
                }}
              >
                <PatternImage src={getPatternImage(p)} alt={p.name} fallbackSize={20}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
            {myPatterns.length === 0 && (
              <div style={{
                fontSize: 12, color: '#5A4A30', padding: '14px 0',
                fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.1em',
              }}>
                请先在抽卡中获得纹样
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3D Relief (full remaining space) ── */}
      <div style={{
        flex: '1 1 auto', minHeight: 0, position: 'relative',
        background: '#0A0807',
      }}>
        {imageUrl ? (
          <ReliefScene image={imageUrl} {...reliefParams} />
        ) : null}

        {/* Floating pattern name chip — bottom center */}
        {selected && (
          <div style={{
            position: 'absolute', bottom: 20, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(8,6,4,0.72)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              padding: '8px 18px 8px 14px', borderRadius: 22,
              border: '1px solid rgba(212,175,106,0.18)',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: RARITY_COLOR[selected.rarity] || '#888',
                boxShadow: `0 0 6px ${RARITY_COLOR[selected.rarity] || '#888'}`,
              }} />
              <span style={{
                fontFamily: 'Noto Serif SC, serif', fontSize: 14,
                color: '#F2D58A', letterSpacing: '0.15em', fontWeight: 500,
              }}>
                {selected.name}
              </span>
              <span style={{
                fontSize: 10, color: '#7A7060',
                fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.1em',
                padding: '2px 8px', borderRadius: 10,
                background: 'rgba(212,175,106,0.06)',
                border: '1px solid rgba(212,175,106,0.1)',
              }}>
                {getRarityLabel(selected.rarity)}
              </span>
            </div>
          </div>
        )}

        {/* Hint — top right corner */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 10, color: '#5A4A30', letterSpacing: '0.15em',
          fontFamily: 'Noto Serif SC, serif',
          background: 'rgba(8,6,4,0.5)',
          padding: '4px 10px', borderRadius: 12,
          border: '1px solid rgba(212,175,106,0.08)',
        }}>
          拖动旋转 · 滚轮缩放
        </div>
      </div>
    </div>
  )
}
