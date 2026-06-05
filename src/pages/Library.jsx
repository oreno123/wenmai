import { useState } from 'react'
import { useApp } from '../store/AppState'
import { useNavigate } from '../components/common/Router'
import PatternCard from '../components/cards/PatternCard'
import { getPatternById, PATTERN_LIBRARY } from '../store/patternData'

const TABS = [
  { id: 'mine', label: '个人库' },
  { id: 'all', label: '全部纹样' },
]

export default function Library() {
  const { data } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('mine')

  const myPatterns = data.library.map(id => getPatternById(id)).filter(Boolean)
  const displayPatterns = tab === 'mine' ? myPatterns : PATTERN_LIBRARY

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <h1 style={{
        fontSize: '22px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '16px',
      }}>
        纹样库
      </h1>

      {/* Tab 切换 */}
      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '16px',
        background: 'var(--bg-secondary)',
        borderRadius: '10px',
        padding: '3px',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: tab === t.id ? 'var(--bg-tertiary)' : 'transparent',
              color: tab === t.id ? 'var(--gold-main)' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
            {t.id === 'mine' && ` (${myPatterns.length})`}
          </button>
        ))}
      </div>

      {/* 纹样网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
      }}>
        {displayPatterns.map(p => {
          const owned = data.library.includes(p.id)
          return (
            <div key={p.id} style={{ position: 'relative' }}>
              <PatternCard
                pattern={p}
                onClick={() => owned && navigate('/editor')}
              />
              {!owned && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15,15,16,0.6)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                }}>
                  🔒
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
