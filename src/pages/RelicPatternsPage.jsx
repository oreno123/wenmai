import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '../components/common/Router'
import { motion, AnimatePresence } from 'framer-motion'
import { RELIC_PATTERNS, ASSET_BASE } from '../data/relicPatterns'
import { cardNote, vesselNote } from '../data/relicNotes'

/* 文物纹样库: 把已提取的纹样集中展示。
   曲面提取 = 模型几何展开后按配方人工核对切出的元素（可送拼贴）
   AI 精选 = 博物馆 3D 扫描几何提取 + AI 精修（可下载，不入拼贴池） */

const ERA_ORDER = ['商', '西周', '春秋', '战国', '汉', '唐', '宋', '元', '明', '清', '近代', '现代']

// dynasty 字段格式不一（"商 · 前12–11世纪" / "商末周初" / "东汉"…），归一到朝代大类。
const eraOf = (dynasty) => {
  if (!dynasty) return ''
  if (dynasty.startsWith('商末周初')) return '商'
  for (const era of ERA_ORDER) {
    if (dynasty.startsWith(era) || dynasty.includes(era)) return era === '汉' ? '汉' : era
  }
  return ''
}

const BASE = import.meta.env.BASE_URL

export default function RelicPatternsPage() {
  const navigate = useNavigate()
  const [models, setModels] = useState([])
  const [vessels, setVessels] = useState([])
  const [books, setBooks] = useState([])
  const [status, setStatus] = useState('loading')
  const [source, setSource] = useState('all')
  const [era, setEra] = useState('')
  const [q, setQ] = useState('')
  const [pick, setPick] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const get = (path) => fetch(`${BASE}${path}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
    Promise.all([get('relic/index.json'), get('relic/ai/manifest.json'), get('book/index.json')])
      .then(([idx, ai, bk]) => {
        setModels(idx.models || [])
        setVessels(ai || [])
        setBooks(Array.isArray(bk) ? bk : [])
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

  const bookCards = useMemo(
    () => books.flatMap(b => b.cards.map(c => ({ ...c, book: b }))), [books])

  const ql = q.trim().toLowerCase()
  const hit = (...parts) => !ql || parts.filter(Boolean).join(' ').toLowerCase().includes(ql)

  const eraPool = useMemo(() => {
    // chip 数字与列表「项」同口径：按卡计，不按器计
    const counts = new Map()
    for (const g of groups) {
      const e = eraOf(g.model?.dynasty)
      if (e) counts.set(e, (counts.get(e) || 0) + g.items.length)
    }
    for (const v of vessels) {
      const e = eraOf(v.dynasty)
      if (e) counts.set(e, (counts.get(e) || 0) + v.cards.length)
    }
    for (const c of bookCards) {
      const e = eraOf(c.era)
      if (e) counts.set(e, (counts.get(e) || 0) + 1)
    }
    return ERA_ORDER.filter(e => counts.has(e)).map(e => ({ era: e, n: counts.get(e) }))
  }, [groups, vessels, bookCards])

  const shownGroups = groups
    .map(g => ({
      ...g,
      items: g.items.filter(p => hit(p.name, p.type, g.model?.name, g.model?.dynasty, p.series)),
    }))
    .filter(g => g.items.length && (!era || eraOf(g.model?.dynasty) === era))
  const shownAi = source === 'extract' || source === 'book' ? [] : aiCards.filter(c =>
    (!era || eraOf(c.vessel.dynasty) === era) &&
    hit(c.name, c.sub, c.desc, c.vessel.name, c.vessel.dynasty))
  const shownAiVessels = vessels
    .filter(v => !era || eraOf(v.dynasty) === era)

  const shownBooks = (source === 'all' || source === 'book') ? books
    .map(b => ({
      ...b,
      cards: b.cards.filter(c => (!era || eraOf(c.era) === era) &&
        hit(c.name, c.era, c.family, c.carrier, c.note, b.title)),
    }))
    .filter(b => b.cards.length) : []

  const extractCount = groups.reduce((s, g) => s + g.items.length, 0)
  const bronzeCount = groups.filter(g => g.items[0]?.series === 'bronze').reduce((s, g) => s + g.items.length, 0)
  const shownExtract = shownGroups.reduce((s, g) => s + g.items.length, 0)
  const shownBook = shownBooks.reduce((s, b) => s + b.cards.length, 0)
  const total = source === 'extract' ? shownExtract
    : source === 'ai' ? shownAi.length
    : source === 'book' ? shownBook
    : shownExtract + shownAi.length + shownBook

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
          ? `曲面提取 ${extractCount}（青铜 ${bronzeCount} · 瓷器 ${extractCount - bronzeCount}）· 图录提取 ${bookCards.length} · AI 精选 ${aiCards.length} · 博物馆器物三维扫描`
          : '博物馆器物三维扫描'}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {chip('all', '全部', extractCount + bookCards.length + aiCards.length)}
        {chip('extract', '曲面提取', extractCount)}
        {chip('book', '图录提取', bookCards.length)}
        {chip('ai', 'AI 精选', aiCards.length)}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索纹样 / 器物 / 朝代"
          style={{
            flex: 1, minWidth: 180, background: 'transparent', color: 'var(--color-text-primary)',
            border: '1px solid rgba(201,162,75,0.22)', borderRadius: 6, padding: '6px 12px',
            fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
          }} />
      </div>

      {status === 'ready' && eraPool.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <span style={{ color: '#5C5445', fontSize: 11, letterSpacing: '0.08em' }}>朝代</span>
          <button key="era-all" type="button" onClick={() => setEra('')}
            style={{
              border: `1px solid ${era === '' ? 'var(--color-gold-main)' : 'rgba(201,162,75,0.28)'}`,
              background: era === '' ? 'rgba(201,162,75,0.14)' : 'transparent',
              color: era === '' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
              borderRadius: 6, padding: '4px 11px', fontSize: 12, letterSpacing: '0.1em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>不限</button>
          {eraPool.map(({ era: e, n }) => (
            <button key={e} type="button" onClick={() => setEra(era === e ? '' : e)}
              style={{
                border: `1px solid ${era === e ? 'var(--color-gold-main)' : 'rgba(201,162,75,0.28)'}`,
                background: era === e ? 'rgba(201,162,75,0.14)' : 'transparent',
                color: era === e ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                borderRadius: 6, padding: '4px 11px', fontSize: 12, letterSpacing: '0.1em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{e} {n}</button>
          ))}
        </div>
      )}
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

      {status === 'ready' && (source === 'all' || source === 'extract') && shownGroups.map(g => (
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
            {g.items.map(p => {
              const note = cardNote(p.id)
              return (
                <motion.div key={p.id} whileHover={{ y: -3 }}
                  onClick={() => setPick({ kind: 'extract', img: p.image, title: note?.name || p.name, sub: `${g.model?.name || ''} · ${g.model?.dynasty || ''}`, pattern: p })}>
                  <div style={cardBox}>
                    <img src={p.image} alt={p.name} loading="lazy"
                      style={{ width: '100%', display: 'block', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
                    <div style={{ color: 'var(--color-text-primary)', fontSize: 11, fontFamily: 'Noto Serif SC, serif', fontWeight: 600, marginTop: 6 }}>
                      {note?.name || p.name}
                    </div>
                    <div style={{ color: '#8A7D68', fontSize: 9.5, marginTop: 2 }}>
                      {p.type}{note && note.name !== p.name ? ` · 原标注 ${p.name}` : ''}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      ))}

      {status === 'ready' && (source === 'all' || source === 'book') && shownBooks.map(b => (
        <section key={b.key} style={{ marginBottom: 30 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            borderBottom: '1px solid var(--color-border-gold)', paddingBottom: 7, marginBottom: 12,
          }}>
            <h2 style={{
              fontFamily: 'Noto Serif SC, serif', fontSize: 16, fontWeight: 600,
              color: '#E8D9B0', letterSpacing: '0.12em', margin: 0,
            }}>{b.title}</h2>
            <span style={{ color: '#5C5445', fontSize: 11, letterSpacing: '0.08em' }}>纹样图谱</span>
            <span style={{ marginLeft: 'auto', color: '#5C5445', fontSize: 11 }}>{b.cards.length} 张</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {b.cards.map(c => (
              <motion.div key={c.id} whileHover={{ y: -3 }}
                onClick={() => setPick({
                  kind: 'book', img: `${ASSET_BASE}/book/${c.file}`, title: c.name,
                  sub: `${b.title}${c.era ? ` · ${c.era}` : ''}`, desc: c.note,
                  carrier: c.carrier, webp: c.file, svg: c.svg,
                })}>
                <div style={cardBox}>
                  <img src={`${ASSET_BASE}/book/${c.file}`} alt={c.name} loading="lazy"
                    style={{ width: '100%', display: 'block', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
                  <div style={{ color: 'var(--color-text-primary)', fontSize: 11, fontFamily: 'Noto Serif SC, serif', fontWeight: 600, marginTop: 6 }}>
                    {c.name}
                  </div>
                  <div style={{ color: '#8A7D68', fontSize: 9.5, marginTop: 2 }}>
                    {[c.family, c.era].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ))}

      {status === 'ready' && (source === 'all' || source === 'ai') && shownAiVessels
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

      {status === 'ready' && total === 0 && (
        <div style={{ padding: '42px 20px', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: 12.5 }}>
          没有匹配的纹样，换个朝代或关键词试试
        </div>
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
                  {pick.carrier && <div style={{ fontSize: 11, color: '#8A7D68', marginTop: 4 }}>载体 · {pick.carrier}</div>}
                  {pick.kind === 'extract' && (() => {
                    const note = cardNote(pick.pattern.id)
                    if (!note) return null
                    return (
                      <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                        {note.name !== pick.pattern.name && (
                          <div style={{ fontSize: 10.5, color: '#8A7D68' }}>原位置标注 · {pick.pattern.name}</div>
                        )}
                        {note.note && (
                          <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>{note.note}</div>
                        )}
                      </div>
                    )
                  })()}
                  {pick.kind === 'extract' && (() => {
                    const m = /^relic_(.+)_(\d+)$/.exec(pick.pattern.id)
                    const vNote = m ? vesselNote(m[1]) : ''
                    return vNote ? (
                      <div style={{ fontSize: 11, color: '#6B5F4D', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(201,162,75,0.16)', lineHeight: 1.7 }}>
                        {vNote}
                      </div>
                    ) : null
                  })()}
                </div>
                {pick.kind === 'extract' && (
                  <>
                    <button type="button" onClick={() => navigate(`/puzzle?pattern=${encodeURIComponent(pick.pattern.id)}`)}
                      style={actionLink}>送往拼贴</button>
                    <a href={pick.img} download style={actionLink}>下载 PNG</a>
                  </>
                )}
                {pick.kind === 'book' && (
                  <>
                    <a href={pick.img} download style={actionLink}>下载 PNG</a>
                    {pick.svg && <a href={`${ASSET_BASE}/book/${pick.svg}`} download style={actionLink}>下载 SVG</a>}
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
