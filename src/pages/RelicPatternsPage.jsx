import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '../components/common/Router'
import { motion, AnimatePresence } from 'framer-motion'
import { RELIC_PATTERNS } from '../data/relicPatterns'

/* 文物纹样库: 把已提取的纹样集中展示。
   曲面提取 = 模型几何展开后按配方人工核对切出的元素（可送拼贴）
   AI 精选 = 博物馆 3D 扫描几何提取 + AI 精修（可下载，不入拼贴池）
   青铜区域 = 声明了但未渲染成图，只给入口，不造假卡片 */

const BASE = import.meta.env.BASE_URL

export default function RelicPatternsPage() {
  const navigate = useNavigate()
  const [models, setModels] = useState([])
  const [vessels, setVessels] = useState([])
  const [status, setStatus] = useState('loading')
  const [source, setSource] = useState('all')
  const [q, setQ] = useState('')
  const [pick, setPick] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const get = (path) => fetch(`${BASE}${path}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
    Promise.all([get('relic/index.json'), get('relic/ai/manifest.json')])
      .then(([idx, ai]) => {
        setModels(idx.models || [])
        setVessels(ai || [])
        setStatus('ready')
      })
      .catch(err => { if (err.name !== 'AbortError') setStatus('error') })
    return () => controller.abort()
  }, [])

  const modelById = useMemo(
    () => Object.fromEntries(models.map(m => [m.id, m])), [models])

  const groups = useMemo(() => {
    const map = new Map()
    for (const p of RELIC_PATTERNS) {
      const m = /^relic_(.+)_(\d+)$/.exec(p.id)
      const mid = m ? m[1] : 'other'
      if (!map.has(mid)) map.set(mid, [])
      map.get(mid).push(p)
    }
    return [...map].map(([id, items]) => ({ id, model: modelById[id] || null, items }))
  }, [modelById])

  const aiCards = useMemo(
    () => vessels.flatMap(v => v.cards.map(c => ({ ...c, vessel: v }))), [vessels])

  const ql = q.trim().toLowerCase()
  const hit = (...parts) => !ql || parts.filter(Boolean).join(' ').toLowerCase().includes(ql)

  const shownGroups = groups
    .map(g => ({
      ...g,
      items: g.items.filter(p => hit(p.name, p.type, g.model?.name, g.model?.dynasty, p.series)),
    }))
    .filter(g => g.items.length)
  const shownAi = source === 'extract' ? [] : aiCards.filter(c =>
    hit(c.name, c.sub, c.desc, c.vessel.name, c.vessel.dynasty))

  const extractCount = groups.reduce((s, g) => s + g.items.length, 0)
  const total = source === 'extract' ? extractCount : source === 'ai' ? aiCards.length : extractCount + aiCards.length

  const chip = (id, label, n) => (
    <button key={id} type="button" onClick={() => setSource(id)}
      style={{
        border: `1px solid ${source === id ? 'var(--color-gold-main)' : 'rgba(201,162,75,0.28)'}`,
        background: source === id ? 'rgba(201,162,75,0.14)' : 'transparent',
        color: source === id ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
        borderRadius: 6, padding: '6px 13px', fontSize: 12.5, letterSpacing: '0.1em',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>{label}{n != null ? ` ${n}` : ''}</button>
  )

  const cardBox = {
    background: 'var(--color-bg-card)', borderRadius: 8, padding: 8, cursor: 'pointer',
    border: '1px solid var(--color-border-gold)',
  }
  const actionLink = {
    fontSize: 12, color: 'var(--color-text-primary)', background: 'var(--color-bg-raised)',
    border: '1px solid var(--color-border-gold)', borderRadius: 6, padding: '7px 12px',
    textDecoration: 'none', letterSpacing: '0.05em', fontFamily: 'inherit', cursor: 'pointer',
  }

  return (
    <div style={{ padding: '14px 16px', paddingBottom: '80px', maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span onClick={() => navigate('/home')}
          style={{ color: 'var(--color-text-dim)', fontSize: 13, cursor: 'pointer', letterSpacing: '0.1em' }}>‹ 返回</span>
        <h1 style={{
          fontFamily: 'Noto Serif SC, serif', fontSize: 22, fontWeight: 600,
          color: 'var(--color-gold-bright)', letterSpacing: '0.15em', margin: 0,
        }}>文物纹样库</h1>
        <button type="button" onClick={() => navigate('/ai-patterns?view=xinghe')}
          style={{
            marginLeft: 'auto', alignSelf: 'center', border: '1px solid rgba(201,162,75,0.45)',
            borderRadius: 6, padding: '6px 14px', background: 'transparent', color: 'var(--color-gold-bright)',
            fontSize: 12.5, letterSpacing: '0.12em', cursor: 'pointer', fontFamily: 'inherit',
          }}>星河</button>
      </div>
      <p style={{ color: 'var(--color-text-dim)', fontSize: 12, margin: '0 0 18px', letterSpacing: '0.05em' }}>
        {status === 'ready'
          ? `${extractCount} 张曲面提取 · ${aiCards.length} 张 AI 精选 · 博物馆器物三维扫描`
          : '博物馆器物三维扫描'}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {chip('all', '全部', extractCount + aiCards.length)}
        {chip('extract', '曲面提取', extractCount)}
        {chip('ai', 'AI 精选', aiCards.length)}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索纹样 / 器物 / 朝代"
          style={{
            flex: 1, minWidth: 180, background: 'transparent', color: 'var(--color-text-primary)',
            border: '1px solid rgba(201,162,75,0.22)', borderRadius: 6, padding: '6px 12px',
            fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
          }} />
      </div>
      <div style={{ color: 'var(--color-text-dim)', fontSize: 11, marginBottom: 20, letterSpacing: '0.08em' }}>
        {status === 'ready' ? `${total} 项` : ''}
      </div>

      {status === 'loading' && (
        <div style={{ padding: '42px 20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          正在载入纹样库…
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '42px 20px', textAlign: 'center', border: '1px solid rgba(201,162,75,0.2)', borderRadius: 12 }}>
          <div style={{ color: '#E8D9B0', fontSize: 14, marginBottom: 8 }}>未能加载纹样库</div>
          <div style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>请检查网络连接后重试</div>
        </div>
      )}

      {status === 'ready' && source !== 'ai' && shownGroups.map(g => (
        <section key={g.id} style={{ marginBottom: 30 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            borderBottom: '1px solid var(--color-border-gold)', paddingBottom: 7, marginBottom: 12,
          }}>
            <h2 style={{
              fontFamily: 'Noto Serif SC, serif', fontSize: 16, fontWeight: 600,
              color: '#E8D9B0', letterSpacing: '0.12em', margin: 0,
            }}>{g.model?.name || g.id}</h2>
            <span style={{ color: '#5C5445', fontSize: 11, letterSpacing: '0.08em' }}>{g.model?.dynasty}</span>
            <span style={{ marginLeft: 'auto', color: '#5C5445', fontSize: 11 }}>{g.items.length} 张</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {g.items.map(p => (
              <motion.div key={p.id} whileHover={{ y: -3 }}
                onClick={() => setPick({ kind: 'extract', img: p.image, title: p.name, sub: `${g.model?.name || ''} · ${p.type}`, pattern: p })}>
                <div style={cardBox}>
                  <img src={p.image} alt={p.name} loading="lazy"
                    style={{ width: '100%', display: 'block', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
                  <div style={{ color: 'var(--color-text-primary)', fontSize: 11, fontFamily: 'Noto Serif SC, serif', fontWeight: 600, marginTop: 6 }}>
                    {p.name}
                  </div>
                  <div style={{ color: '#8A7D68', fontSize: 9.5, marginTop: 2 }}>{p.type}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ))}

      {status === 'ready' && source !== 'extract' && vessels
        .map(v => ({ v, cards: v.cards.filter(c => hit(c.name, c.sub, c.desc, v.name, v.dynasty)) }))
        .filter(({ cards }) => cards.length)
        .map(({ v, cards }) => (
          <section key={v.slug} style={{ marginBottom: 30 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              borderBottom: '1px solid var(--color-border-gold)', paddingBottom: 7, marginBottom: 12,
            }}>
              <h2 style={{
                fontFamily: 'Noto Serif SC, serif', fontSize: 16, fontWeight: 600,
                color: '#E8D9B0', letterSpacing: '0.12em', margin: 0,
              }}>{v.name}</h2>
              <span style={{ color: '#5C5445', fontSize: 11, letterSpacing: '0.08em' }}>{v.dynasty}</span>
              <span style={{ marginLeft: 'auto', color: '#5C5445', fontSize: 11 }}>{cards.length} 张</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {cards.map(c => (
                <motion.div key={c.id} whileHover={{ y: -3 }}
                  onClick={() => setPick({ kind: 'ai', img: `/relic/ai/${c.webp}`, title: c.name || c.id, sub: `${v.name} · ${v.dynasty}`, desc: c.desc, webp: c.webp, svg: c.svg, score: c.score })}>
                  <div style={cardBox}>
                    <img src={`/relic/ai/${c.webp}`} alt={c.name || c.id} loading="lazy"
                      style={{ width: '100%', display: 'block', borderRadius: 4 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 6 }}>
                      <span style={{ color: 'var(--color-text-primary)', fontSize: 11, fontFamily: 'Noto Serif SC, serif', fontWeight: 600 }}>
                        {c.name || c.id}
                      </span>
                      <span style={{ color: '#C0392B', fontSize: 10, letterSpacing: -1, whiteSpace: 'nowrap' }}>{'★'.repeat(c.score)}</span>
                    </div>
                    <div style={{ color: '#8A7D68', fontSize: 9.5, marginTop: 2 }}>
                      {c.id === 'band' ? '整带纹样' : c.id.startsWith('v') ? `视角 ${c.id.slice(1)}` : `兽面 ${c.id.replace('face', '')}`}
                      {c.sub ? ` · ${c.sub}衬地` : ''}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ))}

      {status === 'ready' && source === 'all' && (
        <section style={{
          border: '1px dashed rgba(201,162,75,0.28)', borderRadius: 12, padding: '18px 20px', marginBottom: 30,
        }}>
          <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 15, color: '#E8D9B0', letterSpacing: '0.12em', marginBottom: 6 }}>
            青铜纹样区域
          </div>
          <div style={{ color: 'var(--color-text-dim)', fontSize: 12, lineHeight: 1.8, marginBottom: 12 }}>
            青铜器的纹样区域按语义顶点色与 UV 掩膜划分，目前只在三维器物上进行命中与讲解，
            尚未渲染成独立图版，因此不在这里列卡。
          </div>
          <button type="button" onClick={() => navigate('/relic')} style={actionLink}>前往 3D 提取页</button>
        </section>
      )}

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
              style={{ background: 'var(--color-bg-card)', borderRadius: 12, padding: 16, maxWidth: 'min(680px, 92vw)', maxHeight: '88vh', overflow: 'auto' }}>
              <img src={pick.img} alt={pick.title}
                style={{ width: '100%', display: 'block', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {pick.title}
                    {pick.score ? <span style={{ color: '#C0392B', fontSize: 11, letterSpacing: -1, marginLeft: 8 }}>{'★'.repeat(pick.score)}</span> : null}
                  </div>
                  <div style={{ fontSize: 11, color: '#8A7D68', marginTop: 2 }}>{pick.sub}</div>
                  {pick.desc && <div style={{ fontSize: 11, color: '#6B5F4D', marginTop: 4 }}>{pick.desc}</div>}
                </div>
                {pick.kind === 'extract' && (
                  <>
                    <button type="button" onClick={() => navigate(`/puzzle?pattern=${encodeURIComponent(pick.pattern.id)}`)}
                      style={actionLink}>送往拼贴</button>
                    <a href={pick.img} download style={actionLink}>下载 PNG</a>
                  </>
                )}
                {pick.kind === 'ai' && (
                  <>
                    <a href={`/relic/ai/${pick.webp}`} download style={actionLink}>下载 PNG</a>
                    {pick.svg && <a href={`/relic/ai/${pick.svg}`} download style={actionLink}>下载 SVG</a>}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
