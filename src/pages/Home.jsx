import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { getPatternById, getAllSeries, getPatternImage } from '../store/patternData'
import { useAuth } from '../lib/auth'
import PatternImage from '../components/common/PatternImage'

const stagger = { animate: { transition: { staggerChildren: 0.1 } } }
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

/* 云雷纹简化 SVG */
function CloudPattern({ size = 44, opacity = 0.85 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ opacity }}>
      <circle cx="24" cy="24" r="18" stroke="#D4AF6A" strokeWidth="0.8" />
      <circle cx="24" cy="24" r="11" stroke="#D4AF6A" strokeWidth="0.5" />
      <path d="M24 6 L24 42 M6 24 L42 24 M11.5 11.5 L36.5 36.5 M36.5 11.5 L11.5 36.5" stroke="#D4AF6A" strokeWidth="0.3" />
      {[0,45,90,135,180,225,270,315].map(a => {
        const r = a * Math.PI / 180
        return <circle key={a} cx={24 + Math.cos(r) * 15} cy={24 + Math.sin(r) * 15} r="1.5" fill="#D4AF6A" opacity="0.6" />
      })}
      <circle cx="24" cy="24" r="4" stroke="#F2D58A" strokeWidth="0.5" />
    </svg>
  )
}

/* 五入口图标 — 线条 SVG，统一风格 */
function FeatureIcon({ name, size = 22, color = '#F2D58A' }) {
  const icons = {
    camera: (
      <>
        <path d="M3 7h3l2-3h8l2 3h3v12H3V7z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    compose: (
      <>
        <path d="M14 4l6 6L8 22H2v-6L14 4z" />
        <path d="M12 6l6 6" />
      </>
    ),
    puzzle: (
      <>
        <path d="M5 5h6v2c0 1 1 2 2 2s2-1 2-2V5h4v6h-2c-1 0-2 1-2 2s1 2 2 2h2v6h-6v-2c0-1-1-2-2-2s-2 1-2 2v2H5v-6h2c1 0 2-1 2-2s-1-2-2-2H5V5z" />
      </>
    ),
    cube: (
      <>
        <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
        <path d="M12 22V12M3 7l9 5 9-5" />
      </>
    ),
    hand: (
      <>
        <path d="M9 11V5a1.8 1.8 0 1 1 3.6 0v5" />
        <path d="M12.6 9V4a1.8 1.8 0 1 1 3.6 0v6" />
        <path d="M16.2 11V6a1.8 1.8 0 1 1 3.6 0v8a8 8 0 0 1-8 8h-1c-3 0-4.5-1-6.5-3l-3-3c-1-1 0-2.5 1.5-2l3 2V9a1.8 1.8 0 1 1 3.6 0v3" />
      </>
    ),
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { data } = useApp()
  const { user } = useAuth()
  const series = getAllSeries()
  const myPatterns = data.library.map(id => getPatternById(id)).filter(Boolean)
  const creationsRef = useRef(null)
  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0]

  const scrollToCreations = () => {
    creationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ background: 'transparent', minHeight: '100vh', paddingBottom: '80px', position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── 顶栏 ── */}
        <motion.div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: 'transparent',
        }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }}
            onClick={() => navigate('/landing')} title="回到首页">
            <span style={{
              fontFamily: 'Noto Serif SC, serif', fontSize: 24, fontWeight: 600,
              color: '#F2D58A', letterSpacing: '0.2em',
            }}>
              纹脉
            </span>
            <span style={{
              fontSize: 9, color: '#8A6A30', letterSpacing: '0.35em',
              textTransform: 'uppercase', fontWeight: 500,
            }}>
              Pattern Veins
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={scrollToCreations}
              title="作品集"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 18,
                background: 'rgba(212,175,106,0.08)',
                border: '1px solid rgba(212,175,106,0.22)',
                color: '#F2D58A', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 500,
                letterSpacing: '0.08em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212,175,106,0.15)'
                e.currentTarget.style.borderColor = 'rgba(212,175,106,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(212,175,106,0.08)'
                e.currentTarget.style.borderColor = 'rgba(212,175,106,0.22)'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" opacity="0.5" />
              </svg>
              <span>作品</span>
              {data.creations && data.creations.length > 0 && (
                <span style={{
                  background: '#BC1F28', color: '#F5F1E8',
                  fontSize: 10, fontWeight: 700,
                  padding: '1px 7px', borderRadius: 9,
                  minWidth: 18, textAlign: 'center', lineHeight: '14px',
                }}>
                  {data.creations.length}
                </span>
              )}
            </button>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 18,
              background: 'rgba(212,175,106,0.04)',
              border: '1px solid rgba(212,175,106,0.12)',
            }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="#D4AF6A" strokeWidth="1" />
                <path d="M10 5 L10 15 M5 10 L15 10" stroke="#D4AF6A" strokeWidth="0.6" />
              </svg>
              <span style={{
                color: '#F2D58A', fontSize: 13, fontWeight: 600,
                fontFamily: 'Noto Serif SC, serif',
              }}>
                {data.points}
              </span>
            </div>
            {/* Account button — shows avatar chip when logged in, "登录" otherwise */}
            <button
              onClick={() => navigate('/auth')}
              title={user ? displayName : '登录账号'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: user ? '4px 6px 4px 4px' : '6px 14px',
                borderRadius: 18,
                background: user
                  ? 'linear-gradient(145deg, rgba(201,148,58,0.18), rgba(201,148,58,0.06))'
                  : 'rgba(212,175,106,0.08)',
                border: user
                  ? '1px solid rgba(201,148,58,0.4)'
                  : '1px solid rgba(212,175,106,0.22)',
                color: '#F2D58A', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 500,
                letterSpacing: '0.08em',
                transition: 'all 0.2s',
                boxShadow: user ? '0 0 12px rgba(201,148,58,0.15)' : 'none',
              }}
            >
              {user ? (
                <>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'linear-gradient(145deg, #C9943A, #8B6914)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Noto Serif SC, serif', fontSize: 12,
                    color: '#F5F1E8', fontWeight: 700,
                  }}>
                    {(displayName || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>登录</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        <div style={{ padding: '0 16px' }}>
          {/* ── 每日抽卡 Banner ── */}
          <motion.div variants={stagger} initial="initial" animate="animate">
            <motion.div variants={fadeUp}
              onClick={() => navigate('/gacha')}
              style={{
                background: 'linear-gradient(135deg, #1C1A14 0%, #0F0E0A 100%)',
                border: '1px solid rgba(212,175,106,0.25)',
                borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden',
                boxShadow: '0 0 40px rgba(212,175,106,0.08)', cursor: 'pointer',
              }}
            >
              {/* 右上角光晕 */}
              <div style={{
                position: 'absolute', top: -20, right: -20, width: 120, height: 120,
                background: 'radial-gradient(circle, rgba(242,213,138,0.15), transparent)', pointerEvents: 'none',
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                {/* 左侧内容 */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'serif', fontSize: 18, color: '#F2D58A' }}>每日抽卡</span>
                  <span style={{ fontSize: 12, color: '#8A8A8A', marginTop: 4 }}>
                    今日剩余 {data.freePulls > 0 ? data.freePulls : 0} 次
                  </span>
                  <span style={{ fontSize: 11, color: '#BC6B2F', marginTop: 2 }}>首抽免费</span>
                  <motion.button
                    whileHover={{ filter: 'brightness(1.15)', boxShadow: '0 0 16px rgba(188,31,40,0.4)' }}
                    style={{
                      background: '#BC1F28', color: '#F5F1E8', border: 'none',
                      borderRadius: 6, padding: '8px 24px', marginTop: 12,
                      fontSize: 14, letterSpacing: '0.3em', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    抽 卡
                  </motion.button>
                </div>

                {/* 右侧卡牌缩略图 */}
                <motion.div
                  animate={{ rotate: [-3, 3, -3] }}
                  transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                  style={{
                    width: 72, height: 96, flexShrink: 0,
                    background: 'linear-gradient(160deg, #2A2418, #1A1610)',
                    border: '1px solid rgba(212,175,106,0.35)', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <CloudPattern size={36} opacity={0.7} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── 五个功能入口 ── */}
          <motion.div variants={stagger} initial="initial" animate="animate"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 28 }}
          >
            {[
              { icon: 'camera', label: '拍照识别', path: '/photo-match' },
              { icon: 'compose', label: '创 作', path: '/puzzle' },
              { icon: 'puzzle', label: '经典拼图', path: '/jigsaw' },
              { icon: 'cube', label: '纹样浮雕', path: '/editor' },
              { icon: 'hand', label: '手势展示', path: '/showcase' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} onClick={() => item.path && navigate(item.path)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: item.path ? 'pointer' : 'default' }}>
                <div style={{
                  width: 54, height: 54,
                  background: 'linear-gradient(145deg, #1F1D17, #14120D)',
                  border: '1px solid rgba(212,175,106,0.2)',
                  borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(212,175,106,0.05)',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.borderColor = 'rgba(212,175,106,0.45)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4), 0 0 16px rgba(212,175,106,0.12), inset 0 1px 0 rgba(212,175,106,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'rgba(212,175,106,0.2)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(212,175,106,0.05)'
                  }}
                >
                  <FeatureIcon name={item.icon} size={22} color="#F2D58A" />
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 3, height: 3, borderRadius: '50%',
                    background: '#BC1F28', opacity: 0.55,
                  }} />
                </div>
                <span style={{
                  fontSize: 11, color: '#A09682', marginTop: 8,
                  fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.05em',
                }}>
                  {item.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* ── 按系列轮播 ── */}
          {series.map(s => (
            <SeriesCarousel key={s.id} series={s} navigate={navigate} />
          ))}

          {/* ── 我的作品集 ── */}
          <motion.div ref={creationsRef} variants={stagger} initial="initial" animate="animate" style={{ marginTop: 28, scrollMarginTop: 70 }}>
            <motion.div variants={fadeUp} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 4,
              paddingBottom: 6,
              borderBottom: '1px solid rgba(212,175,106,0.15)',
            }}>
              <span style={{
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 19, fontWeight: 600,
                color: '#F2D58A', letterSpacing: '0.1em',
              }}>
                我的作品集
              </span>
              {data.creations && data.creations.length > 0 && (
                <span style={{
                  fontSize: 11, color: '#8A6A30',
                  padding: '2px 10px', borderRadius: 10,
                  background: 'rgba(212,175,106,0.06)',
                }}>
                  共 {data.creations.length} 件
                </span>
              )}
            </motion.div>
            <motion.div variants={fadeUp} style={{ fontSize: 11, color: '#6A6A6A', marginBottom: 12 }}>
              {data.creations && data.creations.length > 0
                ? '点击作品进入手势展示'
                : '完成创作后保存，作品会出现在这里'}
            </motion.div>

            {data.creations && data.creations.length > 0 && (
              <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                {[...data.creations].reverse().map(c => (
                  <div key={c.id} onClick={() => {
                    try {
                      if (c.placements && c.placements.length > 0) {
                        sessionStorage.setItem('showcase_placements', JSON.stringify(c.placements))
                        sessionStorage.removeItem('showcase_image')
                      } else {
                        sessionStorage.setItem('showcase_image', c.image)
                        sessionStorage.removeItem('showcase_placements')
                      }
                      navigate('/showcase')
                    } catch {}
                  }} style={{
                    aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                    border: '1px solid rgba(212,175,106,0.18)',
                    background: 'linear-gradient(145deg, #1E1C16, #14120E)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, border-color 0.2s',
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.03)'
                      e.currentTarget.style.borderColor = 'rgba(212,175,106,0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.borderColor = 'rgba(212,175,106,0.18)'
                    }}
                  >
                    <img src={c.image} alt="创作" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* ── 系列收集进度 ── */}
          <motion.div variants={stagger} initial="initial" animate="animate" style={{ marginTop: 28 }}>
            <motion.div variants={fadeUp}>
              <span style={{ fontFamily: 'serif', fontSize: 16, color: '#F5F1E8' }}>系列收集进度</span>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
              {series.map((s, i) => {
                const collected = s.patterns.filter(p => data.library.includes(p.id)).length
                const total = s.patterns.length
                const progress = total > 0 ? (collected / total) * 100 : 0
                return (
                  <motion.div key={s.id} variants={fadeUp} style={{
                    background: 'linear-gradient(135deg, #1A1814, #0F0E0A)',
                    border: '1px solid rgba(212,175,106,0.15)', borderRadius: 12, padding: 14,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'serif', fontSize: 14, color: '#F2D58A' }}>{s.name}</span>
                      <span style={{ fontSize: 12, color: '#8A8A8A' }}>{collected}/{total}</span>
                    </div>
                    <div style={{ height: 3, background: '#2A2A2A', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{
                        width: `${progress}%`, height: '100%',
                        background: 'linear-gradient(90deg, #BC6B2F, #F2D58A)',
                        borderRadius: 2,
                        boxShadow: '0 0 6px #F2D58A',
                      }} />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function SeriesCarousel({ series, navigate }) {
  const ref = useRef(null)
  const [paused, setPaused] = useState(false)

  // Auto-scroll loop — duplicates the items enough times to fill ≥2 screens
  // so we can scroll forever by wrapping back by half when we pass it.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf
    const speed = 0.4
    const tick = () => {
      if (!paused) {
        el.scrollLeft += speed
        const half = el.scrollWidth / 2
        if (el.scrollLeft >= half) el.scrollLeft -= half
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused])

  if (!series.patterns.length) return null

  // Duplicate patterns so the carousel can scroll seamlessly.
  const copies = Math.max(2, Math.ceil(20 / Math.max(series.patterns.length, 1)))
  const items = Array.from({ length: copies }, () => series.patterns).flat()

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{
          fontFamily: 'Noto Serif SC, serif', fontSize: 15, fontWeight: 600,
          color: series.color || '#F2D58A', letterSpacing: '0.1em',
        }}>
          {series.name}
        </span>
        <span style={{
          fontSize: 11, color: '#7A7060',
          fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.05em',
        }}>
          {series.patterns.length} 款
        </span>
      </div>
      <div
        ref={ref}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        style={{
          display: 'flex', gap: 10,
          overflowX: 'auto', paddingBottom: 8,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingLeft: 16, paddingRight: 16,
          marginLeft: -16, marginRight: -16,
        }}
      >
        {items.map((p, i) => {
          const imgSrc = getPatternImage(p)
          return (
            <div key={`${p.id}-${i}`} onClick={() => navigate('/pattern/' + p.id)}
              style={{
                flex: '0 0 auto', width: 96, cursor: 'pointer',
              }}>
              <div style={{
                aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                background: '#111',
                border: `1px solid ${series.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor = series.color + '55'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = series.color + '22'
                }}
              >
                <PatternImage src={imgSrc} alt={p.name} fallbackSize={28}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{
                fontSize: 10, color: '#999', marginTop: 5,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontFamily: 'Noto Serif SC, serif',
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
