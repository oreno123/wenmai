import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { getPatternById, getAllSeries, getPatternImage, getRarityLabel } from '../store/patternData'
import { PATTERN_DESCRIPTIONS } from '../data/patternDescriptions'
import { useAuth } from '../lib/auth'
import PatternImage from '../components/common/PatternImage'
import SealStamp from '../components/common/SealStamp'
import HomeHero3D from '../components/common/HomeHero3D'

const stagger = { animate: { transition: { staggerChildren: 0.1 } } }
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ── 故事旅程 4 章节 ──
const STORY_CHAPTERS = [
  {
    key: 'see', num: '壹', cn: '看 见', en: 'SEE',
    desc: '千年纹样触手可及',
    cta: '进入图鉴', path: '/library',
    deco: (
      <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="#F2D58A" strokeWidth="0.6">
        <circle cx="24" cy="24" r="18" />
        <circle cx="24" cy="24" r="11" />
        <circle cx="24" cy="24" r="5" />
      </svg>
    ),
  },
  {
    key: 'hear', num: '贰', cn: '听 见', en: 'HEAR',
    desc: '每条纹样都在低语',
    cta: '听 故 事', path: '/library',
    deco: (
      <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="#F2D58A" strokeWidth="0.6">
        <path d="M14 18a10 10 0 0 1 20 0v8a10 10 0 0 1-20 0z" />
        <path d="M10 26a4 4 0 0 0 4 4M38 26a4 4 0 0 1-4 4" />
      </svg>
    ),
  },
  {
    key: 'create', num: '叁', cn: '创 作', en: 'CREATE',
    desc: '拼出属于你的纹样',
    cta: '开始创作', path: '/puzzle',
    deco: (
      <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="#F2D58A" strokeWidth="0.6">
        <path d="M14 6l4 4-8 8 8 8-4 4-8-8 8-8z" />
        <path d="M34 6l8 8-8 8M30 42l-4-4 8-8-8-8 4-4 8 8-8 8z" />
      </svg>
    ),
  },
  {
    key: 'own', num: '肆', cn: '拥 有', en: 'OWN',
    desc: '把它变成实物',
    cta: '看浮雕预览', path: '/editor',
    deco: (
      <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="#F2D58A" strokeWidth="0.6">
        <path d="M10 18l14-8 14 8v18l-14 8-14-8z" />
        <path d="M10 18l14 8 14-8M24 26v18" />
      </svg>
    ),
  },
]

/* ── 每日一纹 · 掀卡 ──
   掀日历式仪式：正面今日日期（镂空数字），点击 3D 掀开见今日纹样。
   今日纹样按"年内第几天"从抽卡池确定性轮换，每天一个、人人相同。 */
const CN_MONTHS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
const CN_WEEKS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function DailyFlipCard({ navigate, freePulls }) {
  const [open, setOpen] = useState(false)
  const now = new Date()
  const month = `${CN_MONTHS[now.getMonth()]} 月`
  const week = CN_WEEKS[now.getDay()]

  // 年内第几天 → 池内确定性取一件（ai 系列是免费素材不在抽卡池，排除）
  const pool = getAllSeries().filter(s => s.id !== 'ai').flatMap(s => s.patterns)
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const today = pool[dayOfYear % pool.length]
  const desc = today ? PATTERN_DESCRIPTIONS[today.id] : undefined
  const dynasty = desc?.dynasty || today?.tags.find(t => t.endsWith('代'))

  return (
    <div className="wm-flip-scene">
      <div
        className={`wm-flip-card${open ? ' wm-open' : ''}`}
        style={{ height: 356, cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        {/* 正面：今日日期 */}
        <div className="wm-flip-face" style={{
          background: 'radial-gradient(ellipse at 50% 18%, rgba(242,213,138,0.14), transparent 55%), linear-gradient(165deg, #201A0E 0%, #0E0C06 100%)',
          border: '1px solid rgba(212,175,106,0.4)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* 角线：右上为主装饰（最长最粗），左下短细呼应，左上/右下留白 */}
          <div style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderTop: '1.5px solid rgba(212,175,106,0.55)', borderRight: '1.5px solid rgba(212,175,106,0.55)' }} />
          <div style={{ position: 'absolute', bottom: 14, left: 14, width: 20, height: 20, borderBottom: '0.75px solid rgba(212,175,106,0.35)', borderLeft: '0.75px solid rgba(212,175,106,0.35)' }} />
          <div style={{ fontSize: 12, letterSpacing: '0.55em', textIndent: '0.55em', color: '#8A6A30' }}>{month}</div>
          <div
            className="wm-hollow wm-hollow-num"
            style={{ '--wm-tex': `url(${today ? getPatternImage(today) : ''})`, fontSize: 128, fontWeight: 900, lineHeight: 1.1, margin: '4px 0 2px' }}
          >{now.getDate()}</div>
          <div style={{ fontSize: 12, letterSpacing: '0.5em', textIndent: '0.5em', color: 'var(--color-text-secondary)' }}>{week} · 今 日 一 纹</div>
          <motion.div
            animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
            style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: '#D4AF6A', letterSpacing: '0.3em', textIndent: '0.3em' }}
          >轻 触 掀 开</motion.div>
        </div>

        {/* 背面：今日纹样（底部留出底部导航凸起相机的侵入区） */}
        <div className="wm-flip-face wm-flip-back" style={{
          background: 'linear-gradient(165deg, #1E1910 0%, #0D0B06 100%)',
          border: '1px solid rgba(212,175,106,0.4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 18px 88px',
        }}>
          <div style={{
            marginTop: 2, fontSize: 10, letterSpacing: '0.3em', color: '#F2D58A',
            padding: '3px 12px', border: '1px solid rgba(242,213,138,0.35)', borderRadius: 10,
            background: 'rgba(242,213,138,0.08)',
          }}>{today ? getRarityLabel(today.rarity) : ''}</div>
          <div style={{
            flex: 1, width: '100%', marginTop: 12, borderRadius: 12,
            minHeight: 0, overflow: 'hidden',
            background: 'radial-gradient(circle, rgba(242,213,138,0.07), transparent 70%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PatternImage
              src={today ? getPatternImage(today) : ''}
              alt={today?.name}
              fallbackSize={48}
              style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', filter: 'drop-shadow(0 4px 24px rgba(201,162,60,0.3))' }}
            />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.2em', color: '#F2D58A', marginTop: 12 }}>
            {today?.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: '0.25em', marginTop: 5 }}>
            {dynasty || today?.type}
          </div>
          <div style={{
            width: '100%', marginTop: 14, paddingTop: 10, textAlign: 'center',
            borderTop: '1px solid rgba(212,175,106,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 11, color: '#8A6A30', letterSpacing: '0.15em' }}>
              今日免费 {freePulls > 0 ? freePulls : 0} 次
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/gacha') }}
              style={{
                background: '#BC1F28', color: '#F5F1E8', border: 'none', borderRadius: 4,
                padding: '8px 22px', fontSize: 13, letterSpacing: '0.35em', textIndent: '0.35em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >去 抽 卡</button>
          </div>
        </div>
      </div>
    </div>
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
    ink: (
      <>
        <path d="M20 4c-4 1-9 5-12 9l3 3c4-3 8-8 9-12z" />
        <path d="M8 13c-2 .5-4 2.5-4 5 1.5 0 2.5.5 3 2 2.5-.5 4-2.5 4-4" />
      </>
    ),
    hand: (
      <>
        <path d="M9 11V5a1.8 1.8 0 1 1 3.6 0v5" />
        <path d="M12.6 9V4a1.8 1.8 0 1 1 3.6 0v6" />
        <path d="M16.2 11V6a1.8 1.8 0 1 1 3.6 0v8a8 8 0 0 1-8 8h-1c-3 0-4.5-1-6.5-3l-3-3c-1-1 0-2.5 1.5-2l3 2V9a1.8 1.8 0 1 1 3.6 0v3" />
      </>
    ),
    gallery: (
      <>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
      </>
    ),
    vase: (
      <>
        <path d="M9 3h6" />
        <path d="M10 3c0 2-1 3-2 4-1.5 1.5-2 3.5-2 6 0 3 1.5 5 3 6.5.5.5 1 1 1 1.5h-4" />
        <path d="M14 3c0 2 1 3 2 4 1.5 1.5 2 3.5 2 6 0 3-1.5 5-3 6.5-.5.5-1 1-1 1.5" />
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
  const { data, deleteCreation } = useApp()
  const { user } = useAuth()
  const series = getAllSeries()
  const myPatterns = data.library.map(id => getPatternById(id)).filter(Boolean)
  const creationsRef = useRef(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  // 红章首访逻辑：第一次见完整「识纹第一步」，之后降级为小角章
  const [sealSeen] = useState(() => {
    try { return localStorage.getItem('wm.seal.seen') === '1' } catch { return false }
  })
  useEffect(() => { try { localStorage.setItem('wm.seal.seen', '1') } catch {} }, [])
  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0]

  const scrollToCreations = () => {
    creationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="wm-vignette" style={{ background: 'transparent', minHeight: '100vh', paddingBottom: '80px', position: 'relative' }}>
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
                background: 'rgba(212,175,106,0.04)',
                border: '1px solid rgba(212,175,106,0.12)',
                color: '#F2D58A', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 500,
                letterSpacing: '0.08em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212,175,106,0.12)'
                e.currentTarget.style.borderColor = 'rgba(212,175,106,0.35)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(212,175,106,0.04)'
                e.currentTarget.style.borderColor = 'rgba(212,175,106,0.12)'
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
              display: 'flex', alignItems: 'baseline', gap: 4,
              padding: '6px 12px', borderRadius: 18,
              background: 'rgba(212,175,106,0.08)',
              border: '1px solid rgba(212,175,106,0.22)',
            }}>
              <span style={{
                color: '#F2D58A', fontSize: 13, fontWeight: 600,
                fontFamily: 'Noto Serif SC, serif',
              }}>
                {data.points}
              </span>
              <span style={{ fontSize: 10, color: '#F2D58A', opacity: 0.7 }}>积分</span>
            </div>
            {/* Account button — shows avatar chip when logged in, plain text "登录" otherwise */}
            <button
              onClick={() => navigate('/auth')}
              title={user ? displayName : '登录账号'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: user ? '4px 6px 4px 4px' : '4px 2px',
                background: 'transparent',
                border: 'none',
                color: user ? '#F2D58A' : 'var(--color-text-secondary)', fontSize: user ? 12 : 12,
                cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 400,
                letterSpacing: '0.08em',
                transition: 'color 0.2s',
                boxShadow: 'none',
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
                <span style={{ borderBottom: '1px solid rgba(138,138,138,0.4)', paddingBottom: 1 }}>登录</span>
              )}
            </button>
          </div>
        </motion.div>

        <div style={{ padding: '0 16px' }}>
          {/* ── 拍照识纹（第一入口）· 巨字镂空透云纹 ── */}
          <motion.div variants={stagger} initial="initial" animate="animate">
            <motion.div variants={fadeUp}>
              <HomeHero3D
                navigate={navigate}
                fallback={
                  <motion.div
                    onClick={() => navigate('/photo-match')}
                    style={{
                      background: 'linear-gradient(150deg, #221C10 0%, #100D07 100%)',
                      border: '1.5px solid rgba(212,175,106,0.5)',
                      borderRadius: 18, padding: '24px 20px 22px', position: 'relative', overflow: 'hidden',
                      boxShadow: '0 0 46px rgba(212,175,106,0.13)', cursor: 'pointer',
                    }}
                  >
                    {/* 底纹：云雷纹 5% 平铺（降低浓度，避免与镂空字叠纹） */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: 'url(/patterns/yunlei.webp)',
                      backgroundSize: 300, backgroundRepeat: 'repeat',
                      opacity: 0.05, pointerEvents: 'none',
                    }} />
                    {/* 红章：首访完整钤印，之后降级小角章 */}
                    <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 1 }}>
                      {sealSeen
                        ? <SealStamp text="识纹" fontSize={8} style={{ padding: '6px 4px' }} />
                        : <SealStamp text="识纹第一步" fontSize={9} />}
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 14 }}>
                      <span
                        className="wm-hollow"
                        style={{ '--wm-tex': 'url(/patterns/xiangyun.webp)', fontSize: 84, fontWeight: 900, lineHeight: 1, letterSpacing: '0.06em', display: 'inline-block' }}
                      >拍</span>
                      <div style={{ paddingBottom: 10 }}>
                        <div style={{ fontSize: 11, letterSpacing: '0.4em', color: '#8A6A30' }}>拍 照 识 纹</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.9, marginTop: 10 }}>
                          逛博物馆时拍一张<br />立刻认出它、听它说话
                        </div>
                      </div>
                    </div>

                    {/* 相机入口收口：唯一的相机图形符号在底部 FAB，卡内只留文字 CTA */}
                    <div style={{ position: 'relative', marginTop: 22 }}>
                      <motion.button
                        whileHover={{ filter: 'brightness(1.15)' }}
                        style={{
                          background: 'transparent', color: '#F2D58A',
                          border: '1px solid rgba(212,175,106,0.5)',
                          borderRadius: 3, padding: '9px 26px',
                          fontSize: 14, letterSpacing: '0.5em', textIndent: '0.5em', cursor: 'pointer', fontFamily: 'inherit',
                          display: 'inline-flex', alignItems: 'center', gap: 10,
                        }}
                      >
                        拍 照
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                }
              />
            </motion.div>
          </motion.div>

          {/* ── 每日一纹 · 掀卡（点击掀开见今日纹样）── */}
          <motion.div variants={stagger} initial="initial" animate="animate" style={{ marginTop: 16 }}>
            <motion.div variants={fadeUp}>
              <DailyFlipCard navigate={navigate} freePulls={data.freePulls} />
            </motion.div>
          </motion.div>

          {/* ── 故事旅程（壹看见 → 贰听见 → 叁创作 → 肆拥有）── */}
          <motion.div variants={stagger} initial="initial" animate="animate" style={{ marginTop: 28 }}>
            <motion.div variants={fadeUp} style={{
              textAlign: 'center',
              padding: '12px 16px 18px',
              marginBottom: 4,
            }}>
              <div style={{
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 19, fontWeight: 500,
                color: '#F2D58A', letterSpacing: '0.18em',
                lineHeight: 1.6,
              }}>
                每一道纹样，都是某个人的呼吸
              </div>
              <div style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontStyle: 'italic',
                fontSize: 12, color: '#8A6A30',
                marginTop: 4, letterSpacing: '0.1em',
              }}>
                千年纹样在此复活，等你接续
              </div>
            </motion.div>

            <motion.div variants={fadeUp} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}>
              {STORY_CHAPTERS.map((ch, i) => (
                <motion.div key={ch.key} variants={fadeUp}
                  onClick={() => navigate(ch.path)}
                  style={{
                    position: 'relative',
                    background: 'linear-gradient(155deg, #1A1812 0%, #0E0C08 100%)',
                    border: '1px solid rgba(212,175,106,0.22)',
                    borderRadius: 14,
                    padding: '14px 10px 12px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.borderColor = 'rgba(212,175,106,0.55)'
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.45), 0 0 18px rgba(212,175,106,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'rgba(212,175,106,0.22)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* 顶部红章 + 章节号 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#BC1F28',
                      color: '#F5F1E8',
                      fontFamily: 'Noto Serif SC, serif',
                      fontWeight: 600,
                      padding: '1px 6px',
                      fontSize: 9, letterSpacing: '0.18em',
                      borderRadius: 2,
                    }}>{ch.num}</span>
                    <span style={{
                      fontFamily: 'Cormorant Garamond, serif',
                      fontStyle: 'italic',
                      fontSize: 9, color: '#8A6A30',
                      letterSpacing: '0.18em',
                    }}>{ch.en}</span>
                  </div>

                  {/* 中文标题 */}
                  <div style={{
                    fontFamily: 'Noto Serif SC, serif',
                    fontSize: 18, fontWeight: 500,
                    color: '#F2D58A', letterSpacing: '0.15em',
                    marginBottom: 6,
                  }}>{ch.cn}</div>

                  {/* 描述 */}
                  <div style={{
                    fontFamily: 'Noto Serif SC, serif',
                    fontSize: 10, color: 'var(--color-text-secondary)',
                    lineHeight: 1.7, marginBottom: 10,
                    fontWeight: 300,
                  }}>{ch.desc}</div>

                  {/* CTA */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: 'Noto Serif SC, serif',
                    fontSize: 10, color: '#D4AF37',
                    letterSpacing: '0.15em',
                    fontWeight: 500,
                  }}>
                    {ch.cta}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* 装饰小纹样（左下角淡） */}
                  <div style={{
                    position: 'absolute', bottom: -6, right: -6,
                    width: 38, height: 38, opacity: 0.08,
                    pointerEvents: 'none',
                  }}>
                    {ch.deco}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* 广场副 CTA */}
            <motion.div variants={fadeUp}
              onClick={() => navigate('/gallery')}
              style={{
                marginTop: 10,
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: 'rgba(188,31,40,0.06)',
                border: '1px solid rgba(188,31,40,0.28)',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(188,31,40,0.12)'
                e.currentTarget.style.borderColor = 'rgba(188,31,40,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(188,31,40,0.06)'
                e.currentTarget.style.borderColor = 'rgba(188,31,40,0.28)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F2D58A" strokeWidth="1.5">
                <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
              </svg>
              <span style={{
                fontFamily: 'Noto Serif SC, serif',
                fontSize: 12, color: '#F2D58A',
                letterSpacing: '0.15em',
              }}>
                或看看别人怎么做的 · 进入广场
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F2D58A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </motion.div>
          </motion.div>

          {/* ── 更多工具（折叠的次要入口）── */}
          <motion.div variants={stagger} initial="initial" animate="animate"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginTop: 14 }}
          >
            {[
              { icon: 'camera', label: '找相似', path: '/photo-match' },
              { icon: 'vase', label: '青花总览', path: '/qinghua' },
              { icon: 'hand', label: '手势展示', path: '/showcase' },
              { icon: 'compose', label: '自由拼', path: '/puzzle' },
              { icon: 'puzzle', label: '经典拼图', path: '/jigsaw' },
              { icon: 'ink', label: 'AI 纹样库', path: '/ai-patterns' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} onClick={() => item.path && navigate(item.path)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, cursor: item.path ? 'pointer' : 'default' }}>
                <div style={{
                  width: 44, height: 44,
                  background: 'linear-gradient(145deg, #1A1812, #0F0D08)',
                  border: '1px solid rgba(212,175,106,0.15)',
                  borderRadius: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.borderColor = 'rgba(212,175,106,0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'rgba(212,175,106,0.15)'
                  }}
                >
                  <FeatureIcon name={item.icon} size={18} color="#A09682" />
                </div>
                <span style={{
                  fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 6,
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
            <motion.div variants={fadeUp} style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
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
                    position: 'relative',
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
                    {/* Delete button — top-right × ; stops propagation so the
                        card's "open in Showcase" click doesn't fire */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(c)
                      }}
                      title="删除作品"
                      style={{
                        position: 'absolute', top: 5, right: 5,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(8,6,4,0.72)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        border: '1px solid rgba(232,128,128,0.25)',
                        color: '#E88080',
                        fontSize: 14, lineHeight: '20px',
                        cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'inherit',
                        opacity: 0.7,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
                    >×</button>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Delete-confirmation modal */}
            {deleteTarget && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setDeleteTarget(null)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 200,
                  background: 'rgba(8,6,4,0.78)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 24,
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%', maxWidth: 280,
                    padding: '22px 22px 18px',
                    borderRadius: 14,
                    background: 'linear-gradient(145deg, #1F1D17, #14120D)',
                    border: '1px solid rgba(212,175,106,0.22)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(232,128,128,0.1)',
                    border: '1px solid rgba(232,128,128,0.25)',
                    margin: '0 auto 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E88080" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                    </svg>
                  </div>
                  <div style={{
                    fontFamily: 'Noto Serif SC, serif', fontSize: 16, fontWeight: 600,
                    color: '#F2D58A', letterSpacing: '0.1em', marginBottom: 6,
                  }}>
                    删除这幅作品？
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 18,
                  }}>
                    删除后无法恢复<br />云端账号会同步删除
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setDeleteTarget(null)}
                      style={{
                        flex: 1, padding: '10px',
                        borderRadius: 10, fontSize: 12,
                        fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.15em',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#A09682',
                        border: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                      }}
                    >取消</button>
                    <button
                      onClick={() => {
                        if (deleteTarget) deleteCreation(deleteTarget.id)
                        setDeleteTarget(null)
                      }}
                      style={{
                        flex: 1, padding: '10px',
                        borderRadius: 10, fontSize: 12, fontWeight: 600,
                        fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.15em',
                        background: 'linear-gradient(145deg, #C0392B, #8B2A1F)',
                        color: '#F5F1E8',
                        border: '1px solid rgba(192,57,43,0.4)',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(192,57,43,0.25)',
                      }}
                    >删除</button>
                  </div>
                </motion.div>
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
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{collected}/{total}</span>
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
          fontSize: 11, color: 'var(--color-text-secondary)',
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
                fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 5,
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
