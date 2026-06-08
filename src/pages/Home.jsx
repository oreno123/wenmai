import { motion } from 'framer-motion'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { getPatternById, getAllSeries, getPatternImage } from '../store/patternData'

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

export default function Home() {
  const navigate = useNavigate()
  const { data } = useApp()
  const series = getAllSeries()
  const myPatterns = data.library.map(id => getPatternById(id)).filter(Boolean)

  return (
    <div style={{ background: 'transparent', minHeight: '100vh', paddingBottom: '80px', position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── 顶栏 ── */}
        <motion.div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: 'transparent',
        }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
            onClick={() => navigate('/landing')} title="回到首页">
            <span style={{ fontFamily: 'serif', fontSize: 22, color: '#F2D58A', letterSpacing: '0.25em' }}>纹脉</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#BC1F28', marginLeft: 2 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="#D4AF6A" strokeWidth="1" />
              <path d="M10 5 L10 15 M5 10 L15 10" stroke="#D4AF6A" strokeWidth="0.6" />
            </svg>
            <span style={{ color: '#F2D58A', fontSize: 15 }}>{data.points}</span>
            <span style={{ color: '#8A8A8A', fontSize: 18, cursor: 'pointer' }}>+</span>
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

          {/* ── 四个功能入口 ── */}
          <motion.div variants={stagger} initial="initial" animate="animate"
            style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}
          >
            {[
              { icon: '📷', label: '拍照识别', path: null },
              { icon: '✏️', label: '创 作', path: '/puzzle' },
              { icon: '⊞', label: '经典拼图', path: '/jigsaw' },
              { icon: '▣', label: '3D预览', path: '/showcase' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} onClick={() => item.path && navigate(item.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: item.path ? 'pointer' : 'default', opacity: item.path ? 1 : 0.5 }}>
                <div style={{
                  width: 48, height: 48,
                  background: 'linear-gradient(145deg, #222220, #1A1A18)',
                  border: '1px solid rgba(212,175,106,0.15)', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#D4AF6A',
                }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 11, color: '#8A8A8A', marginTop: 6 }}>{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* ── 推荐纹样 ── */}
          <motion.div variants={stagger} initial="initial" animate="animate" style={{ marginTop: 28 }}>
            <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'serif', fontSize: 16, color: '#F5F1E8' }}>推荐纹样</span>
              <span style={{ fontSize: 12, color: '#8A6A30' }}>更多 ›</span>
            </motion.div>

            <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 12 }}>
              {myPatterns.map(p => {
                const rarityBg = p.rarity === 'ssr' ? '#BC6B2F'
                  : p.rarity === 'rare' ? '#2A2A2A' : '#1A1A1A'
                const rarityColor = p.rarity === 'ssr' ? '#F2D58A'
                  : p.rarity === 'rare' ? '#D4AF6A' : '#6A6A6A'
                const rarityText = p.rarity === 'ssr' ? 'SSR'
                  : p.rarity === 'rare' ? 'SR' : 'N'
                const imgSrc = getPatternImage(p)
                return (
                  <div key={p.id} onClick={() => navigate('/curate')} style={{ cursor: 'pointer' }}>
                    <div style={{
                      aspectRatio: '1', position: 'relative',
                      background: 'linear-gradient(145deg, #1E1C16, #14120E)',
                      border: '1px solid rgba(212,175,106,0.2)', borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {imgSrc ? (
                        <img src={imgSrc} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <CloudPattern size={38} opacity={0.85} />
                      )}
                      <span style={{
                        position: 'absolute', top: 4, right: 4,
                        background: rarityBg, color: rarityColor, fontSize: 9,
                        padding: '1px 5px', borderRadius: 3,
                      }}>
                        {rarityText}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#C8C0A8', marginTop: 5, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                  </div>
                )
              })}
            </motion.div>
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
