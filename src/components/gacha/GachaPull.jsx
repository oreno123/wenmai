import { useState, useCallback } from 'react'
import { useApp } from '../../store/AppState'
import { getRandomPattern, getRarityLabel } from '../../store/patternData'

export default function GachaPull() {
  const { data, doPull, addToLibrary } = useApp()
  const [state, setState] = useState('idle') // idle | pulling | revealed
  const [result, setResult] = useState(null)

  const cost = data.freePulls > 0 ? 0 : 10

  const handlePull = useCallback(() => {
    if (state === 'pulling') return

    const success = doPull()
    if (!success) return

    setState('pulling')
    const pattern = getRandomPattern()
    setResult(pattern)

    setTimeout(() => {
      addToLibrary(pattern.id)
      setState('revealed')
    }, 1500)
  }, [doPull, addToLibrary, state])

  const handleReset = () => {
    setState('idle')
    setResult(null)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
    }}>
      {/* 积分显示 */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        color: 'var(--gold-main)',
        fontSize: '14px',
      }}>
        积分: {data.points}
        {data.freePulls > 0 && (
          <span style={{ marginLeft: '8px', color: 'var(--gold-light)' }}>
            免抽×{data.freePulls}
          </span>
        )}
      </div>

      {/* 抽卡区域 */}
      {state === 'idle' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '200px',
            height: '280px',
            margin: '0 auto 24px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--gold-glow)',
          }}>
            <span style={{ fontSize: '64px' }}>🎴</span>
          </div>
          <button
            onClick={handlePull}
            disabled={data.points < cost && data.freePulls <= 0}
            className="btn-gacha"
            style={{
              background: data.freePulls > 0 ? 'var(--accent-red)' : 'var(--bg-tertiary)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 48px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: data.points < cost && data.freePulls <= 0 ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--gold-glow)',
              opacity: data.points < cost && data.freePulls <= 0 ? 0.5 : 1,
            }}
          >
            {data.freePulls > 0 ? '免费抽卡' : `抽卡 (${cost}积分)`}
          </button>
        </div>
      )}

      {/* 翻牌动画 */}
      {state === 'pulling' && (
        <div style={{
          width: '200px',
          height: '280px',
          perspective: '800px',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '2px solid var(--gold-main)',
            boxShadow: 'var(--gold-glow)',
            animation: 'flip 1.5s ease-in-out forwards',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '64px' }}>✨</span>
          </div>
        </div>
      )}

      {/* 揭示结果 */}
      {state === 'revealed' && result && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '200px',
            height: '280px',
            margin: '0 auto 16px',
            background: result.rarity === 'ssr'
              ? 'radial-gradient(circle at 50% 30%, rgba(212,175,106,0.2), transparent 60%)'
              : 'var(--bg-secondary)',
            borderRadius: '16px',
            border: `2px solid ${
              result.rarity === 'ssr' ? 'var(--gold-light)'
              : result.rarity === 'rare' ? 'var(--gold-main)'
              : 'var(--border-gold)'
            }`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: result.rarity === 'ssr' ? 'pulse-glow 2s ease-in-out infinite' : 'none',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {result.rarity !== 'common' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--gold-gradient)',
                backgroundSize: '200% 100%',
                animation: 'flow 3s linear infinite',
                opacity: result.rarity === 'ssr' ? 0.15 : 0.08,
              }} />
            )}
            <span style={{ fontSize: '56px', position: 'relative' }}>☯</span>
            <div style={{
              marginTop: '12px',
              fontSize: '18px',
              fontWeight: 600,
              color: result.rarity === 'ssr' ? 'var(--gold-light)' : 'var(--text-primary)',
              position: 'relative',
            }}>
              {result.name}
            </div>
            <div style={{
              marginTop: '4px',
              fontSize: '13px',
              color: 'var(--gold-main)',
              position: 'relative',
            }}>
              {getRarityLabel(result.rarity)} · {result.type}
            </div>
          </div>

          <button
            onClick={handleReset}
            className="btn-primary"
            style={{
              background: 'var(--gold-gradient)',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 36px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            再来一次
          </button>
        </div>
      )}
    </div>
  )
}
