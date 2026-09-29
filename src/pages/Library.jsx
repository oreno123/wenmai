import { lazy, Suspense, useState } from 'react'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import PatternCard from '../components/cards/PatternCard'
import { getPatternById, PATTERN_LIBRARY, getAllSeries, getRarityLabel } from '../store/patternData'

const GestureCardView = lazy(() => import('../gesture-cards/GestureCardView'))

const TABS = [
  { id: 'mine', label: '我的' },
  { id: 'all', label: '全部' },
]

const RARITY_ORDER = { ssr: 0, rare: 1, common: 2 }

export default function Library() {
  const { data } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('mine')
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [showGestureView, setShowGestureView] = useState(false)

  const myPatterns = data.library.map(id => getPatternById(id)).filter(Boolean)
  const base = tab === 'mine' ? myPatterns : PATTERN_LIBRARY
  const seriesList = getAllSeries()

  const displayPatterns = seriesFilter === 'all'
    ? base
    : base.filter(p => p.series === seriesFilter)

  const collected = data.library.length
  const total = PATTERN_LIBRARY.length
  const nextSeries = seriesList
    .map(series => {
      const inSeries = PATTERN_LIBRARY.filter(pattern => pattern.series === series.id)
      const owned = inSeries.filter(pattern => data.library.includes(pattern.id)).length
      return { ...series, owned, total: inSeries.length, rate: inSeries.length ? owned / inSeries.length : 1 }
    })
    .filter(series => series.owned < series.total)
    .sort((a, b) => a.rate - b.rate)[0]

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 标题区 */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h1 style={{
              fontFamily: 'Noto Serif SC, serif', fontSize: 22, fontWeight: 600,
              color: 'var(--color-gold-bright)', letterSpacing: '0.15em', margin: 0,
            }}>
              图鉴
            </h1>
            <span style={{
              fontSize: 9, color: 'var(--color-gold-dim)', letterSpacing: '0.35em',
              textTransform: 'uppercase', fontWeight: 500,
            }}>
              Collection
            </span>
          </div>
          <button
            onClick={() => setShowGestureView(true)}
            disabled={myPatterns.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, padding: '5px 12px', borderRadius: 14,
              background: myPatterns.length === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(201,162,75,0.1)',
              color: myPatterns.length === 0 ? 'var(--color-text-dim)' : 'var(--color-gold-bright)',
              border: myPatterns.length === 0 ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(201,162,75,0.25)',
              cursor: myPatterns.length === 0 ? 'default' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.08em',
              transition: 'all 0.2s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11V5a1.8 1.8 0 1 1 3.6 0v5" />
              <path d="M12.6 9V4a1.8 1.8 0 1 1 3.6 0v6" />
              <path d="M16.2 11V6a1.8 1.8 0 1 1 3.6 0v8a8 8 0 0 1-8 8h-1c-3 0-4.5-1-6.5-3l-3-3c-1-1 0-2.5 1.5-2l3 2V9a1.8 1.8 0 1 1 3.6 0v3" />
            </svg>
            手势浏览
          </button>
        </div>

        {/* 进度条 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, height: 4,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 2, overflow: 'hidden',
            border: '1px solid rgba(201,162,75,0.06)',
          }}>
            <div style={{
              height: '100%', width: `${(collected / total) * 100}%`,
              background: 'linear-gradient(90deg, var(--color-gold-main), var(--color-gold-bright))',
              borderRadius: 2,
              boxShadow: '0 0 8px rgba(227,192,121,0.4)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{
            fontSize: 11, color: 'var(--color-gold-dim)',
            fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.05em',
            minWidth: 56, textAlign: 'right',
          }}>
            {collected} / {total}
          </span>
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'rgba(201,162,75,0.06)', border: '1px solid rgba(201,162,75,0.14)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-gold-bright)', letterSpacing: '0.08em' }}>下一段收集：{nextSeries ? nextSeries.name : '图鉴已齐'}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 3 }}>{nextSeries ? `${nextSeries.owned} / ${nextSeries.total}，补齐它让系列完整` : '继续用照片发现新的纹样'}</div>
          </div>
          <button onClick={() => navigate('/gacha')} style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(201,162,75,0.35)', background: 'transparent', color: 'var(--color-gold-bright)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>继续收集</button>
        </div>
      </div>

      {/* Tab */}
      <div style={{
        display: 'flex', marginBottom: 14,
        background: 'rgba(23,21,19,0.5)',
        border: '1px solid rgba(201,162,75,0.08)',
        borderRadius: 12, padding: 4,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 9,
              background: tab === t.id ? 'linear-gradient(145deg, rgba(201,162,75,0.18), rgba(201,162,75,0.06))' : 'transparent',
              color: tab === t.id ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.1em',
              border: tab === t.id ? '1px solid rgba(201,162,75,0.25)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
            {t.id === 'mine' && ` ${myPatterns.length}`}
          </button>
        ))}
      </div>

      {/* 系列筛选 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setSeriesFilter('all')}
          style={pillStyle(seriesFilter === 'all')}
        >全部</button>
        {seriesList.map(s => (
          <button key={s.id} onClick={() => setSeriesFilter(s.id)} style={pillStyle(seriesFilter === s.id, s.color)}>
            {s.name}
          </button>
        ))}
      </div>

      {/* 纹样网格 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {displayPatterns
          .sort((a, b) => (RARITY_ORDER[a.rarity] || 2) - (RARITY_ORDER[b.rarity] || 2))
          .map(p => {
            const owned = data.library.includes(p.id)
            return (
              <div key={p.id} style={{ position: 'relative' }}>
                <PatternCard pattern={p} onClick={() => navigate('/pattern/' + p.id)} />
                {!owned && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(23,21,19,0.7)',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                    borderRadius: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-gold-main)" strokeWidth="1.2" opacity="0.55"
                      strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })
        }
      </div>

      {displayPatterns.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          color: '#5A4A30', fontSize: 13,
          fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.1em',
        }}>
          {tab === 'mine' ? '尚未收集纹样，去抽卡吧' : '没有匹配的纹样'}
        </div>
      )}

      {showGestureView && (
        <Suspense fallback={null}>
          <GestureCardView
            patterns={myPatterns}
            onClose={() => setShowGestureView(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

function pillStyle(active, accent) {
  const c = accent || 'var(--color-gold-bright)'
  return {
    padding: '5px 14px', borderRadius: 14, fontSize: 12, whiteSpace: 'nowrap',
    background: active ? `${c === 'var(--color-gold-bright)' ? 'rgba(201,162,75,0.15)' : 'rgba(201,162,75,0.12)'}` : 'rgba(255,255,255,0.02)',
    color: active ? c : 'var(--color-text-dim)',
    border: active
      ? `1px solid ${c === 'var(--color-gold-bright)' ? 'rgba(201,162,75,0.3)' : c + '40'}`
      : '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
    fontFamily: 'Noto Serif SC, serif',
    letterSpacing: '0.05em',
    fontWeight: active ? 500 : 400,
    transition: 'all 0.2s',
  }
}
