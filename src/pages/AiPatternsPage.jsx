import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '../components/common/Router'
import { motion, AnimatePresence } from 'framer-motion'

/* AI 纹样库: 3D 青铜器扫描 -> 几何提取 -> AI 精修的可上线纹样 (public/relic/ai) */

export default function AiPatternsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [pick, setPick] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}relic/ai/manifest.json`)
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const vessels = useMemo(
    () => [...data].sort((a, b) =>
      Math.max(...b.cards.map(c => c.score)) - Math.max(...a.cards.map(c => c.score))),
    [data])

  return (
    <div style={{ padding: '14px 16px', paddingBottom: '80px', maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span onClick={() => navigate('/home')}
          style={{ color: '#7A7060', fontSize: 13, cursor: 'pointer', letterSpacing: '0.1em' }}>‹ 返回</span>
        <h1 style={{
          fontFamily: 'Noto Serif SC, serif', fontSize: 22, fontWeight: 600,
          color: '#F2D58A', letterSpacing: '0.15em', margin: 0,
        }}>AI 纹样库</h1>
      </div>
      <p style={{ color: '#7A7060', fontSize: 12, margin: '0 0 22px', letterSpacing: '0.05em' }}>
        {vessels.length} 件青铜器 · {vessels.reduce((s, v) => s + v.cards.length, 0)} 张精选纹样 · 博物馆 3D 扫描提取精修
      </p>

      {vessels.map(v => (
        <section key={v.slug} style={{ marginBottom: 30 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            borderBottom: '1px solid rgba(212,175,106,0.18)', paddingBottom: 7, marginBottom: 12,
          }}>
            <h2 style={{
              fontFamily: 'Noto Serif SC, serif', fontSize: 16, fontWeight: 600,
              color: '#E8D9B0', letterSpacing: '0.12em', margin: 0,
            }}>{v.name}</h2>
            <span style={{ color: '#5C5445', fontSize: 11, letterSpacing: '0.08em' }}>{v.dynasty}</span>
            <span style={{ marginLeft: 'auto', color: '#5C5445', fontSize: 11 }}>{v.cards.length} 张</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {v.cards.map(c => (
              <motion.div key={c.id} whileHover={{ y: -3 }} onClick={() => setPick({ ...c, vessel: v })}
                style={{
                  background: '#F7F3EA', borderRadius: 8, padding: 8, cursor: 'pointer',
                  border: '1px solid rgba(212,175,106,0.2)',
                }}>
                <img src={`/relic/ai/${c.webp}`} alt={c.name || c.id} loading="lazy"
                  style={{ width: '100%', display: 'block', borderRadius: 4 }} />
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 6,
                }}>
                  <span style={{ color: '#2B221A', fontSize: 11, fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
                    {c.name || c.id}
                  </span>
                  <span style={{ color: '#C0392B', fontSize: 10, letterSpacing: -1, whiteSpace: 'nowrap' }}>{'★'.repeat(c.score)}</span>
                </div>
                <div style={{ color: '#8A7D68', fontSize: 9.5, marginTop: 2 }}>
                  {c.id === 'band' ? '整带纹样' : c.id.startsWith('v') ? `视角 ${c.id.slice(1)}` : `兽面 ${c.id.replace('face', '')}`}
                  {c.sub ? ` · ${c.sub}衬地` : ''}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ))}

      <AnimatePresence>
        {pick && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPick(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(8,6,3,0.88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 18,
            }}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#F7F3EA', borderRadius: 12, padding: 16, maxWidth: 'min(680px, 92vw)', maxHeight: '88vh', overflow: 'auto' }}>
              <img src={`/relic/ai/${pick.webp}`} alt={pick.name || pick.id}
                style={{ width: '100%', display: 'block', borderRadius: 6 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16, fontWeight: 600, color: '#2B221A' }}>
                    {pick.name || pick.id}
                    <span style={{ color: '#C0392B', fontSize: 11, letterSpacing: -1, marginLeft: 8 }}>{'★'.repeat(pick.score)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8A7D68', marginTop: 2 }}>
                    {pick.vessel.name} · {pick.vessel.dynasty}{pick.sub ? ` · ${pick.sub}衬地` : ''}
                  </div>
                  {pick.desc && (
                    <div style={{ fontSize: 11, color: '#6B5F4D', marginTop: 4 }}>{pick.desc}</div>
                  )}
                </div>
                <a href={`/relic/ai/${pick.webp}`} download
                  style={{
                    fontSize: 12, color: '#F7F3EA', background: '#2B221A', borderRadius: 6,
                    padding: '7px 12px', textDecoration: 'none', letterSpacing: '0.05em',
                  }}>下载 PNG</a>
                {pick.svg && (
                  <a href={`/relic/ai/${pick.svg}`} download
                    style={{
                      fontSize: 12, color: '#2B221A', background: 'transparent',
                      border: '1px solid #2B221A', borderRadius: 6, padding: '6px 12px',
                      textDecoration: 'none', letterSpacing: '0.05em',
                    }}>下载 SVG</a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
