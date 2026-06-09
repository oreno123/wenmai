import { useState, useCallback } from 'react'
import { useApp } from '../store/AppState'
import { getRandomPattern, getRarityLabel, getPatternImage, getTenPullPatterns, getSeriesInfo } from '../store/patternData'
import { PULL_COST, TEN_PULL_COST } from '../constants'
import { generateShareCard } from '../utils/shareCard'
import { shareImage } from '../utils/shareOrDownload'
import PatternImage from '../components/common/PatternImage'

/* 太极 + 能量环 SVG */
function YinYangSymbol({ size = 120, bloom = false }) {
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      filter: bloom ? 'drop-shadow(0 0 20px rgba(201,162,60,0.4)) drop-shadow(0 0 50px rgba(201,162,60,0.15))' : 'none',
    }}>
      {/* 能量环 */}
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(201,162,60,0.15)" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(201,162,60,0.1)" strokeWidth="0.3"
          style={{ animation: 'energy-ring 3s ease-in-out infinite' }} />
        <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,216,107,0.08)" strokeWidth="0.3"
          style={{ animation: 'energy-ring 3s ease-in-out infinite 0.5s' }} />
        {/* 放射线 */}
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
          const r = a * Math.PI / 180
          return <line key={a}
            x1={60 + Math.cos(r) * 35} y1={60 + Math.sin(r) * 35}
            x2={60 + Math.cos(r) * 55} y2={60 + Math.sin(r) * 55}
            stroke="rgba(201,162,60,0.12)" strokeWidth="0.3"
          />
        })}
      </svg>
      {/* 太极符号 */}
      <div style={{
        position: 'absolute', inset: '18%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.32, color: '#C9A23C',
        animation: 'breathe 3s ease-in-out infinite',
      }}>
        ☯
      </div>
    </div>
  )
}

export default function GachaPage() {
  const { data, doPull, doTenPull, addToLibrary, incrementPity, resetPity } = useApp()
  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [tenResults, setTenResults] = useState(null)
  const [showBurst, setShowBurst] = useState(false)
  const [sharing, setSharing] = useState(false)

  const handleShare = useCallback(async (pattern) => {
    if (sharing) return
    setSharing(true)
    try {
      const series = getSeriesInfo(pattern.series)
      const blob = await generateShareCard(pattern, series)
      await shareImage(blob, `wenmai-${pattern.id}.png`)
    } catch (e) {
      console.error('Share failed:', e)
    }
    setSharing(false)
  }, [sharing])

  const cost = data.freePulls > 0 ? 0 : PULL_COST
  const canAfford = data.freePulls > 0 || data.points >= cost
  const canAffordTen = data.freePulls >= 10 || data.points >= TEN_PULL_COST

  const handlePull = useCallback(() => {
    if (state !== 'idle' || !canAfford) return
    doPull()
    setState('pulling')
    const p = getRandomPattern(data.pityCounter || 0)
    setResult(p)
    setTimeout(() => {
      addToLibrary(p.id)
      if (p.rarity === 'ssr') {
        resetPity()
        setShowBurst(true)
        setTimeout(() => setShowBurst(false), 2500)
      } else {
        incrementPity()
      }
      setState('revealed')
    }, 2200)
  }, [doPull, addToLibrary, incrementPity, resetPity, canAfford, state, data.pityCounter])

  const handleTenPull = useCallback(() => {
    if (state !== 'idle' || !canAffordTen) return
    doTenPull()
    const { patterns, finalPity, ssrHit } = getTenPullPatterns(data.pityCounter || 0)
    setState('pulling')
    setTenResults(patterns)
    setTimeout(() => {
      patterns.forEach(p => addToLibrary(p.id))
      if (ssrHit) {
        resetPity()
        setShowBurst(true)
        setTimeout(() => setShowBurst(false), 2500)
      } else {
        // set pity to the computed final value
        for (let i = 0; i < finalPity - (data.pityCounter || 0); i++) incrementPity()
      }
      setState('revealed')
    }, 2200)
  }, [doTenPull, addToLibrary, incrementPity, resetPity, canAffordTen, state, data.pityCounter])

  const handleReset = () => { setState('idle'); setResult(null); setTenResults(null); setShowBurst(false) }

  return (
    <div style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 35%, #120A0C 0%, #0C0608 65%)',
    }}>
      {/* 体积光 */}
      <div className="light-rays" style={{ opacity: 0.2 }} />

      {/* 大气雾 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 40%, rgba(120,20,20,0.4) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* SSR 爆 */}
      {showBurst && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 100 }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,240,176,0.8) 0%, rgba(201,162,60,0.3) 40%, transparent 60%)', animation: 'ssr-burst 2s ease-out forwards' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '60px', height: '60px', borderRadius: '50%', border: '2px solid rgba(201,162,60,0.5)', animation: 'ssr-ring 1.5s ease-out forwards' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '60px', height: '60px', borderRadius: '50%', border: '1px solid rgba(255,240,176,0.3)', animation: 'ssr-ring 2s ease-out 0.3s forwards' }} />
          <div className="light-rays" style={{ opacity: 0.4 }} />
        </div>
      )}

      {/* 积分 */}
      <div className="glass-card" style={{
        position: 'absolute', top: '20px', right: '20px',
        borderRadius: '999px', padding: '6px 16px', fontSize: '13px', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span className="text-gold" style={{ fontWeight: 700 }}>{data.points}</span>
        <span style={{ color: 'var(--text-dim)' }}>积分</span>
        {data.freePulls > 0 && (
          <span style={{ color: 'var(--gold-bright)', background: 'rgba(201,162,60,0.06)', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: 600, border: '1px solid rgba(201,162,60,0.1)' }}>
            免抽×{data.freePulls}
          </span>
        )}
      </div>

      {/* ===== 待机 ===== */}
      {state === 'idle' && (
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '220px', height: '300px', margin: '0 auto 36px', animation: 'float-y 4s ease-in-out infinite' }}>
            <div className="glass-card" style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(201,162,60,0.12)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(201,162,60,0.04)',
            }}>
              <YinYangSymbol size={140} bloom />
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '4px', marginTop: '16px' }}>
                命运之卡
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {/* 单抽 */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button onClick={handlePull} disabled={!canAfford} style={{
                position: 'relative', borderRadius: '16px', padding: '18px 64px',
                fontSize: '16px', fontWeight: 700, letterSpacing: '4px',
                fontFamily: 'inherit', cursor: canAfford ? 'pointer' : 'not-allowed',
                background: canAfford ? 'var(--red)' : 'rgba(14,16,40,0.6)',
                color: canAfford ? 'var(--gold-light)' : 'var(--text-dim)',
                border: canAfford ? '1px solid rgba(201,162,60,0.2)' : '1px solid var(--border-glass)',
                boxShadow: canAfford ? '0 4px 30px rgba(176,32,48,0.25), 0 0 50px rgba(201,162,60,0.06)' : 'none',
                overflow: 'hidden',
              }}>
                {canAfford && <div style={{
                  position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  animation: 'sweep 2.5s ease-in-out infinite',
                }} />}
                <span style={{ position: 'relative' }}>{data.freePulls > 0 ? '免费抽卡' : `${cost} 积分抽卡`}</span>
              </button>
            </div>

            {/* 十连抽 */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={handleTenPull} disabled={!canAffordTen} style={{
                position: 'relative', borderRadius: '12px', padding: '12px 40px',
                fontSize: '14px', fontWeight: 700, letterSpacing: '3px',
                fontFamily: 'inherit', cursor: canAffordTen ? 'pointer' : 'not-allowed',
                background: canAffordTen
                  ? 'linear-gradient(135deg, rgba(201,162,60,0.15) 0%, rgba(176,32,48,0.2) 100%)'
                  : 'rgba(14,16,40,0.6)',
                color: canAffordTen ? 'var(--gold-light)' : 'var(--text-dim)',
                border: canAffordTen ? '1px solid rgba(201,162,60,0.25)' : '1px solid var(--border-glass)',
                boxShadow: canAffordTen ? '0 4px 24px rgba(201,162,60,0.1), 0 0 40px rgba(201,162,60,0.04)' : 'none',
                overflow: 'hidden',
              }}>
                {canAffordTen && <div style={{
                  position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  animation: 'sweep 3s ease-in-out infinite',
                }} />}
                <span style={{ position: 'relative' }}>
                  {data.freePulls >= 10 ? '免费十连抽' : `${TEN_PULL_COST} 积分十连抽`}
                </span>
              </button>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: 'var(--gold-bright)',
                background: 'rgba(201,162,60,0.08)', borderRadius: '6px',
                padding: '4px 8px', border: '1px solid rgba(201,162,60,0.15)',
                letterSpacing: '1px',
              }}>
                ×10
              </span>
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
            <span style={{ color: 'var(--gold-bright)' }}>SSR 10%</span> · <span style={{ color: 'var(--gold)' }}>稀有 30%</span> · 普通 60%
          </div>
        </div>
      )}

      {/* ===== 翻牌 ===== */}
      {/* 单抽翻牌动画 */}
      {state === 'pulling' && result && !tenResults && (
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '220px', height: '300px', position: 'relative', perspective: '1200px' }}>
            {/* 金色光晕扩散 */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '220px', height: '300px',
              transform: 'translate(-50%, -50%)',
              borderRadius: '24px',
              background: 'radial-gradient(ellipse, rgba(212,175,106,0.5) 0%, rgba(212,175,106,0.15) 40%, transparent 70%)',
              animation: 'gacha-glow-burst 1.2s ease-out 0.3s forwards',
              pointerEvents: 'none',
            }} />

            {/* 3D 翻转卡牌 */}
            <div style={{
              width: '100%', height: '100%',
              transformStyle: 'preserve-3d',
              animation: 'gacha-pull-card 2.2s ease-in-out forwards',
            }}>
              {/* 正面 — 背面（神秘卡） */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                background: 'var(--bg-glass-strong)', backdropFilter: 'blur(24px)',
                borderRadius: '18px',
                border: '1px solid rgba(201,162,60,0.25)',
                boxShadow: '0 0 80px rgba(201,162,60,0.15)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <YinYangSymbol size={100} bloom />
              </div>

              {/* 反面 — 纹样结果 */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: '#0F0F10',
                borderRadius: '18px',
                border: '1px solid rgba(201,162,60,0.3)',
                boxShadow: '0 0 40px rgba(201,162,60,0.1)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '16px',
              }}>
                <PatternImage src={getPatternImage(result)} alt={result.name} fallbackSize={120} style={{ maxWidth: '85%', maxHeight: '65%', objectFit: 'contain' }} />
                <span className={`rarity-badge rarity-${result.rarity}`} style={{ marginTop: '12px', fontSize: '12px', padding: '4px 12px' }}>
                  {getRarityLabel(result.rarity)}
                </span>
              </div>
            </div>

            {/* 金色粒子 */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30) * Math.PI / 180
              const dist = 70 + (i % 3) * 25
              const tx = Math.cos(angle) * dist
              const ty = Math.sin(angle) * dist
              return (
                <div key={i} style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: 4 + (i % 2) * 2, height: 4 + (i % 2) * 2,
                  marginTop: -(2 + (i % 2)), marginLeft: -(2 + (i % 2)),
                  borderRadius: '50%',
                  background: i % 3 === 0 ? '#F2D58A' : '#D4AF6A',
                  boxShadow: '0 0 6px rgba(212,175,106,0.6)',
                  opacity: 0,
                  animation: `gacha-particle-${i} 0.7s ease-out ${0.3 + i * 0.04}s forwards`,
                  pointerEvents: 'none',
                }} />
              )
            })}
          </div>
          <div style={{ marginTop: '28px', fontSize: '14px', letterSpacing: '3px', animation: 'shimmer 1.5s ease-in-out infinite' }} className="text-gold">
            纹样降临中...
          </div>
        </div>
      )}

      {/* 十连抽降临动画 */}
      {state === 'pulling' && tenResults && (
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{
            animation: 'float-y 4s ease-in-out infinite',
          }}>
            <YinYangSymbol size={160} bloom />
          </div>
          <div style={{ marginTop: '32px', fontSize: '16px', letterSpacing: '4px', animation: 'shimmer 1.5s ease-in-out infinite' }} className="text-gold">
            十连降临中...
          </div>
          {/* 环绕粒子 */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i * 18) * Math.PI / 180
            const dist = 90 + (i % 3) * 20
            return (
              <div key={i} style={{
                position: 'absolute',
                top: '40%', left: '50%',
                width: 3 + (i % 2) * 2, height: 3 + (i % 2) * 2,
                marginTop: -(1.5 + (i % 2)), marginLeft: -(1.5 + (i % 2)),
                borderRadius: '50%',
                background: i % 3 === 0 ? '#F2D58A' : '#D4AF6A',
                boxShadow: '0 0 6px rgba(212,175,106,0.6)',
                opacity: 0,
                animation: `gacha-particle-${i % 12} 0.7s ease-out ${0.2 + i * 0.06}s forwards`,
                pointerEvents: 'none',
              }} />
            )
          })}
        </div>
      )}

      {/* ===== 揭示 — 单抽 ===== */}
      {state === 'revealed' && result && !tenResults && (
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{
            width: '240px', height: '330px', margin: '0 auto 28px',
            position: 'relative', animation: 'card-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}>
            {result.rarity === 'ssr' && (
              <div style={{
                position: 'absolute', inset: '-50px', borderRadius: '40px',
                background: 'radial-gradient(ellipse at 50% 30%, rgba(201,162,60,0.08) 0%, transparent 50%)',
                animation: 'pulse-glow 2s ease-in-out infinite', pointerEvents: 'none',
              }} />
            )}

            <div className="glass-card" style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              border: `1px solid ${
                result.rarity === 'ssr' ? 'rgba(201,162,60,0.3)'
                : result.rarity === 'rare' ? 'rgba(201,162,60,0.12)'
                : 'var(--border-glass)'
              }`,
              boxShadow: result.rarity === 'ssr' ? '0 0 50px rgba(201,162,60,0.15), 0 0 100px rgba(201,162,60,0.05)' : 'none',
              animation: result.rarity === 'ssr' ? 'pulse-glow 2s ease-in-out infinite' : 'none',
            }}>
              {/* 纹样区 */}
              <div style={{
                flex: '1 1 auto', minHeight: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px',
              }}>
                <PatternImage
                  src={getPatternImage(result)}
                  alt={result.name}
                  fallbackSize={result.rarity === 'ssr' ? 160 : 130}
                  style={{
                    maxWidth: '90%', maxHeight: '100%', objectFit: 'contain',
                    filter: result.rarity === 'ssr'
                      ? 'drop-shadow(0 0 16px rgba(201,162,60,0.35))'
                      : result.rarity === 'rare'
                      ? 'drop-shadow(0 0 8px rgba(201,162,60,0.15))'
                      : 'none',
                    animation: result.rarity === 'ssr' ? 'breathe 2.5s ease-in-out infinite' : 'none',
                  }}
                />
              </div>

              {/* 分隔 */}
              <div style={{ height: '1px', margin: '0 20px', background: `linear-gradient(90deg, transparent, rgba(201,162,60,${result.rarity === 'ssr' ? 0.12 : 0.04}), transparent)` }} />

              {/* 信息 */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '18px', fontWeight: 700, letterSpacing: '1px',
                    color: result.rarity === 'ssr' ? 'var(--gold-light)' : 'var(--text-primary)',
                    textShadow: result.rarity === 'ssr' ? '0 0 12px rgba(201,162,60,0.3)' : 'none',
                  }}>
                    {result.name}
                  </span>
                  <span className={`rarity-badge rarity-${result.rarity}`}>
                    {getRarityLabel(result.rarity)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  {result.type} · {result.tags[result.tags.length - 1]}
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'inline-flex', gap: 12 }}>
            <button onClick={() => handleShare(result)} disabled={sharing} style={{
              padding: '16px 36px', fontSize: '15px', letterSpacing: '2px',
              background: sharing ? 'rgba(255,255,255,0.04)' : 'rgba(201,162,60,0.12)',
              color: sharing ? '#5A5A5A' : '#D4AF6A',
              border: '1px solid rgba(201,162,60,0.2)', borderRadius: 12,
              cursor: sharing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {sharing ? '生成中...' : '分享'}
            </button>
            <button onClick={handleReset} className="btn-gold" style={{ padding: '16px 52px', fontSize: '15px', letterSpacing: '3px' }}>
              再来一次
            </button>
          </div>
        </div>
      )}

      {/* ===== 揭示 — 十连抽 ===== */}
      {state === 'revealed' && tenResults && (
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10, padding: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
            maxWidth: '600px',
            margin: '0 auto 24px',
            animation: 'card-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}>
            {/* Sort: SSR first, then rare, then common */}
            {[...tenResults].sort((a, b) => {
              const order = { ssr: 0, rare: 1, common: 2 }
              return order[a.rarity] - order[b.rarity]
            }).map((p, i) => (
              <div key={p.id + i} style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#0F0F10',
                border: `1px solid ${
                  p.rarity === 'ssr' ? 'rgba(201,162,60,0.35)'
                  : p.rarity === 'rare' ? 'rgba(201,162,60,0.15)'
                  : 'rgba(201,162,60,0.06)'
                }`,
                boxShadow: p.rarity === 'ssr'
                  ? '0 0 20px rgba(201,162,60,0.2), 0 0 40px rgba(201,162,60,0.06)'
                  : 'none',
                animation: p.rarity === 'ssr' ? 'pulse-glow 2s ease-in-out infinite' : 'none',
              }}>
                {p.rarity === 'ssr' && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at 50% 30%, rgba(201,162,60,0.08) 0%, transparent 60%)',
                    pointerEvents: 'none',
                  }} />
                )}
                <div style={{
                  aspectRatio: '3/4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '6px',
                  position: 'relative',
                }}>
                  <PatternImage
                    src={getPatternImage(p)}
                    alt={p.name}
                    fallbackSize={60}
                    style={{
                      maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                      filter: p.rarity === 'ssr'
                        ? 'drop-shadow(0 0 10px rgba(201,162,60,0.35))'
                        : p.rarity === 'rare'
                        ? 'drop-shadow(0 0 4px rgba(201,162,60,0.12))'
                        : 'none',
                    }}
                  />
                </div>
                <div style={{
                  padding: '4px 6px 6px',
                  textAlign: 'center',
                  borderTop: '1px solid rgba(201,162,60,0.06)',
                }}>
                  <div style={{
                    fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: p.rarity === 'ssr' ? 'var(--gold-light)' : 'var(--text-primary)',
                    textShadow: p.rarity === 'ssr' ? '0 0 8px rgba(201,162,60,0.3)' : 'none',
                  }}>
                    {p.name}
                  </div>
                  <span className={`rarity-badge rarity-${p.rarity}`} style={{
                    fontSize: '9px', padding: '2px 6px', marginTop: '3px',
                    display: 'inline-block',
                  }}>
                    {getRarityLabel(p.rarity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={handleReset} className="btn-gold" style={{ padding: '16px 52px', fontSize: '15px', letterSpacing: '3px' }}>
              再来一次
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
