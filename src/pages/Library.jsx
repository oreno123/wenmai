import { useState } from 'react'
import { useApp } from '../store/AppState'
import PatternCard from '../components/cards/PatternCard'
import { getPatternById, PATTERN_LIBRARY, getAllSeries, getRarityLabel } from '../store/patternData'

const TABS = [
  { id: 'mine', label: '我的' },
  { id: 'all', label: '全部' },
]

const RARITY_ORDER = { ssr: 0, rare: 1, common: 2 }

export default function Library() {
  const { data } = useApp()
  const [tab, setTab] = useState('mine')
  const [seriesFilter, setSeriesFilter] = useState('all')

  const myPatterns = data.library.map(id => getPatternById(id)).filter(Boolean)
  const base = tab === 'mine' ? myPatterns : PATTERN_LIBRARY
  const seriesList = getAllSeries()

  const displayPatterns = seriesFilter === 'all'
    ? base
    : base.filter(p => p.series === seriesFilter)

  const collected = data.library.length
  const total = PATTERN_LIBRARY.length

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 标题 + 进度 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>图鉴</h1>
        <span style={{ fontSize: 12, color: '#6A6A6A' }}>{collected}/{total}</span>
      </div>

      {/* 收集进度条 */}
      <div style={{
        height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 16, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${(collected / total) * 100}%`,
          background: 'linear-gradient(90deg, #8B6914, #F2D58A)', borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Tab */}
      <div style={{
        display: 'flex', marginBottom: 12,
        background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 3,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: 8,
              background: tab === t.id ? 'rgba(212,175,106,0.12)' : 'transparent',
              color: tab === t.id ? '#F2D58A' : '#6A6A6A',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t.label}
            {t.id === 'mine' && ` (${myPatterns.length})`}
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
          <button key={s.id} onClick={() => setSeriesFilter(s.id)} style={pillStyle(seriesFilter === s.id)}>
            {s.name}
          </button>
        ))}
      </div>

      {/* 纹样网格 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {displayPatterns
          .sort((a, b) => (RARITY_ORDER[a.rarity] || 2) - (RARITY_ORDER[b.rarity] || 2))
          .map(p => {
            const owned = data.library.includes(p.id)
            return (
              <div key={p.id} style={{ position: 'relative' }}>
                <PatternCard pattern={p} />
                {!owned && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(15,15,16,0.6)',
                    borderRadius: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}>
                    🔒
                  </div>
                )}
              </div>
            )
          })
        }
      </div>

      {displayPatterns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#4A4A4A', fontSize: 14 }}>
          {tab === 'mine' ? '还没有收集到纹样，去抽卡吧' : '没有匹配的纹样'}
        </div>
      )}
    </div>
  )
}

function pillStyle(active) {
  return {
    padding: '4px 12px', borderRadius: 12, fontSize: 12, whiteSpace: 'nowrap',
    background: active ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#F2D58A' : '#6A6A6A',
    border: active ? '1px solid rgba(212,175,106,0.2)' : '1px solid transparent',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
