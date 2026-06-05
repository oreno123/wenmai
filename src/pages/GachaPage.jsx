import { useState, useCallback } from 'react'
import { useApp } from '../store/AppState'
import { getRandomPattern, getRarityLabel, getPatternImage } from '../store/patternData'

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
  const { data, doPull, addToLibrary, addPoints } = useApp()
  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [showBurst, setShowBurst] = useState(false)

  const cost = data.freePulls > 0 ? 0 : 10
  const canAfford = true

  const handlePull = useCallback(() => {
    if (state !== 'idle') return
    // 扣积分，不够就自动补
    if (!doPull()) {
      addPoints(30)
      doPull()
    }
    setState('pulling')
    const p = getRandomPattern()
    setResult(p)
    setTimeout(() => {
      addToLibrary(p.id)
      setState('revealed')
      if (p.rarity === 'ssr') { setShowBurst(true); setTimeout(() => setShowBurst(false), 2500) }
    }, 2200)
  }, [doPull, addToLibrary, addPoints, state])

  const handleReset = () => { setState('idle'); setResult(null); setShowBurst(false) }

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

          <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
            <span style={{ color: 'var(--gold-bright)' }}>SSR 10%</span> · <span style={{ color: 'var(--gold)' }}>稀有 30%</span> · 普通 60%
          </div>
        </div>
      )}

      {/* ===== 翻牌 ===== */}
      {state === 'pulling' && result && (
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
                {getPatternImage(result) ? (
                  <img src={getPatternImage(result)} alt={result.name} style={{ maxWidth: '85%', maxHeight: '65%', objectFit: 'contain' }} />
                ) : (
                  <YinYangSymbol size={120} bloom />
                )}
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

      {/* ===== 揭示 ===== */}
      {state === 'revealed' && result && (
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
                {getPatternImage(result) ? (
                  <img
                    src={getPatternImage(result)}
                    alt={result.name}
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
                ) : (
                  <YinYangSymbol
                    size={result.rarity === 'ssr' ? 160 : 130}
                    bloom={result.rarity !== 'common'}
                  />
                )}
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
