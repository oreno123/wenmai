import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from '../components/common/Router'
import { useAuth } from '../lib/auth'
import { listWorks, toggleLike, hasLiked } from '../lib/galleryApi'
import WorkCard from '../components/gallery/WorkCard'

// ──────────────────────────────────────────────────────────
// GalleryPage — /gallery 广场首页
// 瀑布流 + sticky 筛选 + 编辑精选横幅 + 发布 CTA
// ──────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'newest', label: '最新' },
  { key: 'hottest', label: '最热' },
  { key: 'curated', label: '编辑精选' },
]

const SERIES_OPTIONS = [
  { key: null, label: '全部' },
  { key: '青花瓷', label: '青花瓷' },
  { key: '山海经', label: '山海经' },
  { key: '青铜器', label: '青铜器' },
  { key: '唐草', label: '唐草' },
]

const TEMPLATE_OPTIONS = [
  { key: null, label: '全部模板' },
  { key: '团龙献瑞', label: '团龙献瑞' },
  { key: '莲池清韵', label: '莲池清韵' },
  { key: '双龙戏珠', label: '双龙戏珠' },
  { key: '青铜威仪', label: '青铜威仪' },
  { key: '青花缠枝', label: '青花缠枝' },
  { key: '山海异兽', label: '山海异兽' },
]

export default function GalleryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sort, setSort] = useState('newest')
  const [series, setSeries] = useState(null)
  const [template, setTemplate] = useState(null)
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [likedIds, setLikedIds] = useState(new Set())
  const [curated, setCurated] = useState(null)

  // 拉作品列表
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await listWorks({ sort, series, template, limit: 24 })
    if (error) {
      setError(error.message)
      setWorks([])
    } else {
      setWorks(data)
    }
    setLoading(false)
  }, [sort, series, template])

  useEffect(() => { reload() }, [reload])

  // 拉编辑精选（独立查询：reuse_count + likes_count 最高的 1 件）
  useEffect(() => {
    listWorks({ sort: 'curated', limit: 1 }).then(({ data }) => {
      setCurated(data?.[0] || null)
    })
  }, [])

  // 拉当前用户已点赞的 work id（前 24 件中的）
  useEffect(() => {
    if (!user || works.length === 0) return
    Promise.all(works.map(w => hasLiked(w.id, user.id))).then(results => {
      const liked = new Set()
      results.forEach((ok, i) => { if (ok) liked.add(works[i].id) })
      setLikedIds(liked)
    })
  }, [user, works])

  const handleReuse = useCallback((work) => {
    if (!user) {
      navigate('/auth')
      return
    }
    navigate(`/puzzle?fork=${work.id}`)
  }, [user, navigate])

  const handleLike = useCallback(async (work) => {
    if (!user) {
      navigate('/auth')
      return
    }
    const { liked } = await toggleLike(work.id, user.id)
    setLikedIds(prev => {
      const next = new Set(prev)
      if (liked) next.add(work.id); else next.delete(work.id)
      return next
    })
    setWorks(prev => prev.map(w => w.id === work.id
      ? { ...w, likes_count: Math.max(0, w.likes_count + (liked ? 1 : -1)) }
      : w))
  }, [user, navigate])

  return (
    <div style={pageStyle}>
      <GalleryHero worksCount={works.length} />
      <FilterBar
        sort={sort} setSort={setSort}
        series={series} setSeries={setSeries}
        template={template} setTemplate={setTemplate}
      />

      {curated && (
        <CuratedBanner
          work={curated}
          onReuse={() => handleReuse(curated)}
          onClick={() => navigate(`/work/${curated.id}`)}
        />
      )}

      <div style={gridWrapStyle}>
        {loading && <div style={loadingStyle}>载入中</div>}
        {error && <div style={errorStyle}>加载失败：{error}</div>}
        {!loading && !error && works.length === 0 && (
          <div style={emptyStyle}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>空</div>
            <div>广场还没有这类作品，<br/>不如你来发第一件？</div>
          </div>
        )}
        {!loading && !error && works.length > 0 && (
          <div style={gridStyle}>
            {works.map(w => (
              <WorkCard
                key={w.id}
                work={w}
                author={w.author}
                liked={likedIds.has(w.id)}
                onReuse={() => handleReuse(w)}
                onLike={() => handleLike(w)}
                onClick={() => navigate(`/work/${w.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <PublishCTA onPublish={() => user ? navigate('/puzzle') : navigate('/auth')} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// 子组件
// ──────────────────────────────────────────────────────────

function GalleryHero({ worksCount }) {
  return (
    <section style={heroStyle}>
      <div style={sealTagStyle}>广 场</div>
      <h1 style={h1Style}>千人千纹<br/>看见<em style={emStyle}>同好</em></h1>
      <p style={ledeStyle}>
        每个用纹脉创作的人，都把作品留在了这里。<br/>
        看见别人的呼吸，复用它接续你自己的故事。
      </p>
      <div style={metaRowStyle}>
        <MetaCell num={worksCount || 0} label="Works Live" />
        <MetaCell num={386} label="Creators" />
        <MetaCell num={9402} label="Reuse Count" />
      </div>
    </section>
  )
}

function MetaCell({ num, label }) {
  return (
    <div style={metaCellStyle}>
      <div style={numStyle}>{(num || 0).toLocaleString()}</div>
      <div style={labelStyle}>{label}</div>
    </div>
  )
}

function FilterBar({ sort, setSort, series, setSeries, template, setTemplate }) {
  return (
    <div style={filterBarStyle}>
      <FilterGroup label="Sort" options={SORT_OPTIONS} value={sort} onChange={setSort} />
      <div style={dividerStyle} />
      <FilterGroup label="Series" options={SERIES_OPTIONS} value={series} onChange={setSeries} />
      <div style={dividerStyle} />
      <FilterGroup label="Template" options={TEMPLATE_OPTIONS} value={template} onChange={setTemplate} />
    </div>
  )
}

function FilterGroup({ label, options, value, onChange }) {
  return (
    <div style={filterGroupStyle}>
      <span style={filterLabelStyle}>{label}</span>
      {options.map(opt => (
        <button
          key={String(opt.key)}
          onClick={() => onChange(opt.key)}
          style={value === opt.key ? chipActiveStyle : chipStyle}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function CuratedBanner({ work, onReuse, onClick }) {
  return (
    <div style={curatedWrapStyle}>
      <div style={curatedCardStyle} onClick={onClick}>
        <span style={curatedTagStyle}>本 周 精 选</span>
        <h3 style={curatedTitleStyle}>
          {work.title}<br/>
          <em style={emStyle}>by {(work.author?.username) || '匿名'}</em>
        </h3>
        <p style={curatedDescStyle}>
          {work.template || '自由创作'} · {work.series || '综合'} 系列<br/>
          本周被复用 {work.reuse_count} 次，点赞 {work.likes_count} 次。
        </p>
        <div style={curatedMetaStyle}>
          <CuratedStat label="Reuses" value={work.reuse_count} />
          <CuratedStat label="Likes" value={work.likes_count} />
          <CuratedStat label="Series" value={work.series} />
        </div>
        <button
          style={curatedActionStyle}
          onClick={(e) => { e.stopPropagation(); onReuse() }}
        >
          复 用 这 件
        </button>
      </div>
    </div>
  )
}

function CuratedStat({ label, value }) {
  return (
    <div>
      {label}
      <strong style={curatedStrongStyle}>{value}</strong>
    </div>
  )
}

function PublishCTA({ onPublish }) {
  return (
    <div style={ctaWrapStyle}>
      <div style={ctaCardStyle}>
        <span style={ctaSealStyle}>召 集</span>
        <h2 style={ctaTitleStyle}>把你的<em style={emStyle}>那一道纹样</em><br/>留在广场上</h2>
        <p style={ctaDescStyle}>
          完成一件作品只需 5 分钟。<br/>
          从拼图页或浮雕页一键发布，可设置允许他人复用。<br/>
          每一件被复用的作品，都是你的呼吸被另一个人接住。
        </p>
        <button style={ctaBtnStyle} onClick={onPublish}>
          发 布 我 的 作 品
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// 样式
// ──────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: '100vh',
  background: '#0A0806',
  color: '#F2EBDB',
  fontFamily: "'Noto Sans SC', sans-serif",
  fontWeight: 300,
  paddingTop: 0,
}

const heroStyle = {
  position: 'relative',
  padding: '160px 64px 60px',
  textAlign: 'center',
  borderBottom: '1px solid rgba(212,175,55,0.18)',
}

const sealTagStyle = {
  display: 'inline-block',
  background: '#C41E3A',
  color: '#F2EBDB',
  fontFamily: "'Noto Serif SC', serif",
  fontWeight: 500,
  padding: '5px 14px',
  letterSpacing: '0.2em',
  fontSize: 13,
  marginBottom: 24,
}

const h1Style = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 'clamp(40px, 5.5vw, 68px)',
  fontWeight: 500,
  lineHeight: 1.25,
  color: '#F2EBDB',
  marginBottom: 24,
  letterSpacing: '0.04em',
  margin: '0 0 24px',
}

const emStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontStyle: 'italic',
  color: '#D4AF37',
  fontWeight: 400,
}

const ledeStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontWeight: 300,
  fontSize: 17,
  color: '#A89580',
  maxWidth: 560,
  margin: '0 auto',
  lineHeight: 1.95,
}

const metaRowStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: 48,
  marginTop: 36,
  paddingTop: 32,
  borderTop: '1px solid rgba(212,175,55,0.18)',
  maxWidth: 560,
  marginLeft: 'auto',
  marginRight: 'auto',
}

const metaCellStyle = { textAlign: 'center' }

const numStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 32,
  fontWeight: 300,
  color: '#D4AF37',
  lineHeight: 1,
}

const labelStyle = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 10,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: '#6B5C45',
  marginTop: 6,
}

const filterBarStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  background: 'rgba(10,8,6,0.92)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderTop: '1px solid rgba(212,175,55,0.18)',
  borderBottom: '1px solid rgba(212,175,55,0.18)',
  padding: '18px 48px',
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  flexWrap: 'wrap',
}

const filterGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
}

const filterLabelStyle = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 10,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: '#6B5C45',
  marginRight: 4,
}

const chipStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  padding: '7px 16px',
  background: 'transparent',
  border: '1px solid rgba(212,175,55,0.18)',
  color: '#A89580',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
  letterSpacing: '0.1em',
}

const chipActiveStyle = {
  ...chipStyle,
  borderColor: '#D4AF37',
  color: '#D4AF37',
  background: 'rgba(212,175,55,0.08)',
}

const dividerStyle = {
  width: 1,
  height: 18,
  background: 'rgba(212,175,55,0.18)',
  margin: '0 8px',
}

const curatedWrapStyle = {
  maxWidth: 1400,
  margin: '48px auto 0',
  padding: '0 48px',
}

const curatedCardStyle = {
  position: 'relative',
  background: 'linear-gradient(135deg, rgba(31,24,18,0.95) 0%, rgba(45,34,24,0.9) 100%)',
  border: '1px solid #5C4A1A',
  padding: 48,
  overflow: 'hidden',
  cursor: 'pointer',
}

const curatedTagStyle = {
  display: 'inline-block',
  background: '#C41E3A',
  color: '#F2EBDB',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 12,
  fontWeight: 500,
  padding: '4px 12px',
  letterSpacing: '0.2em',
  marginBottom: 18,
}

const curatedTitleStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 32,
  fontWeight: 500,
  color: '#F2EBDB',
  marginBottom: 14,
  letterSpacing: '0.05em',
  lineHeight: 1.3,
}

const curatedDescStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 15,
  color: '#A89580',
  lineHeight: 1.85,
  marginBottom: 24,
  fontWeight: 300,
}

const curatedMetaStyle = {
  display: 'flex',
  gap: 24,
  paddingTop: 18,
  borderTop: '1px solid rgba(212,175,55,0.18)',
  fontFamily: "'Outfit', sans-serif",
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#6B5C45',
}

const curatedStrongStyle = {
  color: '#D4AF37',
  fontFamily: "'Cormorant Garamond', serif",
  fontStyle: 'italic',
  fontSize: 18,
  fontWeight: 400,
  letterSpacing: 0,
  textTransform: 'none',
  display: 'block',
  marginTop: 4,
}

const curatedActionStyle = {
  marginTop: 24,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  background: 'linear-gradient(135deg, #D4AF37 0%, #BC6B2F 100%)',
  color: '#0A0806',
  border: 'none',
  padding: '12px 32px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
  fontWeight: 500,
}

const gridWrapStyle = {
  maxWidth: 1400,
  margin: '0 auto',
  padding: '48px 48px 80px',
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 24,
}

const loadingStyle = {
  padding: 80,
  textAlign: 'center',
  color: '#6B5C45',
  fontFamily: "'Noto Serif SC', serif",
}

const errorStyle = {
  ...loadingStyle,
  color: '#C41E3A',
}

const emptyStyle = {
  padding: 80,
  textAlign: 'center',
  color: '#6B5C45',
  fontFamily: "'Noto Serif SC', serif",
  lineHeight: 2,
}

const ctaWrapStyle = {
  maxWidth: 1400,
  margin: '0 auto 80px',
  padding: '0 48px',
}

const ctaCardStyle = {
  background: 'linear-gradient(135deg, rgba(196,30,58,0.08) 0%, rgba(212,175,55,0.04) 100%)',
  border: '1px solid #5C4A1A',
  padding: '56px 48px',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
}

const ctaSealStyle = {
  display: 'inline-block',
  background: '#C41E3A',
  color: '#F2EBDB',
  fontFamily: "'Noto Serif SC', serif",
  fontWeight: 500,
  padding: '6px 16px',
  letterSpacing: '0.2em',
  fontSize: 13,
  marginBottom: 24,
}

const ctaTitleStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 38,
  fontWeight: 500,
  color: '#F2EBDB',
  marginBottom: 18,
  letterSpacing: '0.05em',
  lineHeight: 1.3,
}

const ctaDescStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 16,
  color: '#A89580',
  marginBottom: 32,
  fontWeight: 300,
  lineHeight: 1.95,
}

const ctaBtnStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 16,
  background: 'linear-gradient(135deg, #D4AF37 0%, #BC6B2F 100%)',
  color: '#0A0806',
  border: 'none',
  padding: '16px 44px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
  fontWeight: 500,
}

// 响应式：内联@media 不生效，需要全局 CSS。在 main.jsx 或 App.jsx 已有全局样式时，
// 这里依赖外部 CSS 处理移动端。否则可加 useEffect 注入。
