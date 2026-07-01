import { useState } from 'react'

// ──────────────────────────────────────────────────────────
// WorkCard — 广场瀑布流卡片
// 复用 gallery-page mock 视觉，改为 React + 真实 cover_path
// ──────────────────────────────────────────────────────────

const SERIES_LABEL = {
  '青花瓷': '青花',
  '山海经': '山海',
  '青铜器': '青铜',
  '唐草': '唐草',
  '团龙': '团龙',
}

function getInitial(name) {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86400000
  if (diff < day) return '今天'
  if (diff < day * 2) return '昨天'
  if (diff < day * 7) return `${Math.floor(diff / day)} 天前`
  if (diff < day * 30) return `${Math.floor(diff / day / 7)} 周前`
  return `${Math.floor(diff / day / 30)} 月前`
}

export default function WorkCard({ work, author, liked, onReuse, onLike, onClick }) {
  const [imgError, setImgError] = useState(false)
  const seriesLabel = SERIES_LABEL[work.series] || work.series || ''
  const isFork = Boolean(work.forked_from)

  return (
    <div className="work-card" onClick={onClick} style={cardStyle}>
      <div className="work-cover" style={coverStyle(work.cover_path, imgError)}>
        {!imgError && work.cover_path && (
          <img
            src={work.cover_path}
            alt={work.title}
            crossOrigin="anonymous"
            onError={() => setImgError(true)}
            style={imgStyle}
          />
        )}
        {imgError && <CoverFallback title={work.title} />}

        <span className="work-rarity" style={rarityBadgeStyle}>
          {isFork ? '复 用' : '原 创'}
        </span>
        {seriesLabel && (
          <span className="work-series" style={seriesBadgeStyle}>{seriesLabel}</span>
        )}

        <button
          className="work-action"
          onClick={(e) => { e.stopPropagation(); onReuse?.() }}
          style={actionStyle}
        >
          复 用
        </button>
      </div>

      <div className="work-body" style={bodyStyle}>
        <div className="work-title-row" style={titleRowStyle}>
          <div>
            <div style={titleStyle}>{work.title}</div>
            <div style={templateStyle}>{work.template || '自由创作'}</div>
          </div>
        </div>

        <div className="work-author" style={authorRowStyle}>
          <div style={avatarStyle}>{getInitial(author?.username)}</div>
          <div style={authorNameStyle}>
            {author?.username || '匿名'}
            <span style={eraStyle}>{timeAgo(work.created_at)}</span>
          </div>
        </div>

        <div className="work-stats" style={statsStyle}>
          <Stat icon="heart" value={work.likes_count} active={liked} onClick={(e) => { e.stopPropagation(); onLike?.() }} />
          <Stat icon="share" value={work.reuse_count} />
          <span style={reuseTagStyle}>· 可复用</span>
        </div>
      </div>
    </div>
  )
}

// ── 子组件 ────────────────────────────────────────────────

function Stat({ icon, value, active, onClick }) {
  return (
    <span onClick={onClick} style={{ ...statStyle, cursor: onClick ? 'pointer' : 'default', color: active ? '#C41E3A' : undefined }}>
      {icon === 'heart' ? <HeartIcon active={active} /> : <ShareIcon />}
      {(value || 0).toLocaleString()}
    </span>
  )
}

function HeartIcon({ active }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24"
      fill={active ? '#C41E3A' : 'none'}
      stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-4.5-9-9.5C1 6.5 5 3 8 5l4 3 4-3c3-2 7 1.5 5 6.5-2 5-9 9.5-9 9.5z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12H3M21 12l-6-6M21 12l-6 6" />
    </svg>
  )
}

function CoverFallback({ title }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Noto Serif SC, serif', fontSize: 28, color: '#8B6F1F',
      background: 'radial-gradient(ellipse at center, #F2EBDB 0%, #E8DCC2 100%)',
    }}>
      {title?.charAt(0) || '?'}
    </div>
  )
}

// ── 样式 ──────────────────────────────────────────────────

const cardStyle = {
  position: 'relative',
  background: '#1A140E',
  border: '1px solid rgba(212,175,55,0.18)',
  display: 'block',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
  borderRadius: 2,
}

const coverStyle = (coverPath, imgError) => ({
  position: 'relative',
  width: '100%',
  aspectRatio: '4/5',
  background: coverPath && !imgError
    ? '#0F0B08'
    : 'radial-gradient(ellipse at center, #F2EBDB 0%, #E8DCC2 100%)',
  overflow: 'hidden',
})

const imgStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
}

const rarityBadgeStyle = {
  position: 'absolute',
  top: 14, left: 14,
  fontFamily: "'Outfit', sans-serif",
  fontSize: 10,
  letterSpacing: '0.2em',
  padding: '4px 9px',
  background: 'rgba(10,8,6,0.78)',
  border: '1px solid rgba(212,175,55,0.4)',
  color: '#D4AF37',
  zIndex: 2,
}

const seriesBadgeStyle = {
  position: 'absolute',
  top: 14, right: 14,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 10,
  letterSpacing: '0.15em',
  padding: '4px 9px',
  background: 'rgba(196,30,58,0.85)',
  color: '#F2EBDB',
  zIndex: 2,
}

const actionStyle = {
  position: 'absolute',
  bottom: 14, right: 14,
  background: 'linear-gradient(135deg, #D4AF37 0%, #BC6B2F 100%)',
  color: '#0A0806',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 12,
  fontWeight: 500,
  padding: '8px 16px',
  letterSpacing: '0.15em',
  cursor: 'pointer',
  opacity: 0,
  transform: 'translateY(8px)',
  transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
  border: 'none',
  zIndex: 3,
}

const bodyStyle = {
  padding: '18px 20px 20px',
  borderTop: '1px solid rgba(212,175,55,0.18)',
}

const titleRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 8,
}

const titleStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 17,
  fontWeight: 500,
  color: '#F2EBDB',
  letterSpacing: '0.08em',
  lineHeight: 1.4,
}

const templateStyle = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#6B5C45',
  marginTop: 4,
}

const authorRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 14,
}

const avatarStyle = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #8B6F1F, #BC6B2F)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  color: '#0A0806',
  fontWeight: 500,
  flexShrink: 0,
}

const authorNameStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  color: '#A89580',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const eraStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontStyle: 'italic',
  fontSize: 11,
  color: '#6B5C45',
}

const statsStyle = {
  display: 'flex',
  gap: 18,
  paddingTop: 14,
  borderTop: '1px dashed rgba(212,175,55,0.18)',
  fontFamily: "'Outfit', sans-serif",
  fontSize: 12,
  color: '#A89580',
  alignItems: 'center',
}

const statStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const reuseTagStyle = {
  marginLeft: 'auto',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 11,
  color: '#D4AF37',
  letterSpacing: '0.1em',
}
