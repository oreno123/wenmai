import { useState, useMemo } from 'react'
import { useNavigate } from '../components/common/Router'
import { PATTERN_LIBRARY, getAllSeries, getPatternImage } from '../store/patternData'
import { QINGHUA_CATEGORIES } from '../data/qinghuaPatterns'

const RARITY_ORDER = { ssr: 0, rare: 1, common: 2 }
const RARITY_COLOR = { ssr: '#C9A23C', rare: '#BC6B2F', common: '#666' }

export default function QinghuaBrowser() {
  const navigate = useNavigate()
  const seriesList = getAllSeries()

  const [seriesFilter, setSeriesFilter] = useState('qinghua')
  const [rarityFilter, setRarityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const isQinghua = seriesFilter === 'qinghua'

  const filtered = useMemo(() => {
    let list = PATTERN_LIBRARY
    if (seriesFilter !== 'all') list = list.filter(p => p.series === seriesFilter)
    if (isQinghua && categoryFilter !== 'all') list = list.filter(p => p.tags.includes(categoryFilter))
    if (rarityFilter !== 'all') list = list.filter(p => p.rarity === rarityFilter)
    return list.sort((a, b) => (RARITY_ORDER[a.rarity] || 2) - (RARITY_ORDER[b.rarity] || 2))
  }, [seriesFilter, rarityFilter, categoryFilter, isQinghua])

  const handleSeriesChange = (s) => {
    setSeriesFilter(s === seriesFilter ? 'all' : s)
    setCategoryFilter('all')
  }

  return (
    <div style={{ padding: '14px 16px', paddingBottom: '80px' }}>
      {/* 标题区 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <h1 style={{
            fontFamily: 'Noto Serif SC, serif', fontSize: 22, fontWeight: 600,
            color: '#F2D58A', letterSpacing: '0.15em', margin: 0,
          }}>
            纹样总览
          </h1>
          <span style={{
            fontSize: 9, color: '#8A6A30', letterSpacing: '0.35em',
            textTransform: 'uppercase', fontWeight: 500,
          }}>
            All Patterns
          </span>
        </div>
        <div style={{
          fontSize: 11, color: '#7A7060',
          fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.05em',
        }}>
          {filtered.length} 张 · 涵盖 {seriesList.length} 个系列
        </div>
      </div>

      {/* Series */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8, overflowX: 'auto', paddingBottom: 3 }}>
        {seriesList.map(s => (
          <button key={s.id} onClick={() => handleSeriesChange(s.id)}
            style={pill(seriesFilter === s.id, s.color)}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Rarity */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8, overflowX: 'auto' }}>
        <button onClick={() => setRarityFilter('all')} style={pill(rarityFilter === 'all')}>全部</button>
        <button onClick={() => setRarityFilter(rarityFilter === 'ssr' ? 'all' : 'ssr')} style={pill(rarityFilter === 'ssr', '#C9A23C')}>传说</button>
        <button onClick={() => setRarityFilter(rarityFilter === 'rare' ? 'all' : 'rare')} style={pill(rarityFilter === 'rare', '#BC6B2F')}>稀有</button>
      </div>

      {/* Category (qinghua only) */}
      {isQinghua && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, overflowX: 'auto' }}>
          {QINGHUA_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategoryFilter(c.id === categoryFilter ? 'all' : c.id)}
              style={pill(categoryFilter === c.id, '#5B8EC9')}>
              {c.name}({c.count})
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>
        {filtered.length} 张
      </div>

      {/* Pure image grid — no locks, no cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {filtered.map(p => {
          const num = p.id.replace('qh-', '')
          return (
            <div key={p.id} onClick={() => navigate('/pattern/' + p.id)}
              style={{
                cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                background: '#111', position: 'relative',
                border: `1px solid ${RARITY_COLOR[p.rarity]}33`,
              }}>
              <img src={getPatternImage(p)} alt={p.name}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', display: 'block' }} />
              <div style={{
                position: 'absolute', top: 3, left: 4,
                fontSize: 10, color: '#aaa', background: 'rgba(0,0,0,0.7)',
                padding: '1px 5px', borderRadius: 4, lineHeight: '14px',
              }}>
                #{num}
              </div>
              <div style={{
                padding: '4px 6px', fontSize: 10, color: '#aaa',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {p.name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function pill(active, color) {
  const c = color || '#F2D58A'
  return {
    padding: '3px 10px', borderRadius: 10, fontSize: 11, whiteSpace: 'nowrap',
    background: active ? `${c}20` : 'rgba(255,255,255,0.03)',
    color: active ? c : '#666',
    border: active ? `1px solid ${c}40` : '1px solid transparent',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
