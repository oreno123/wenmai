import { useEffect, useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getWork, listForksOf, toggleLike, hasLiked } from '../lib/galleryApi'
import type { GalleryWork } from '../types/gallery'

// ──────────────────────────────────────────────────────────
// WorkDetailPage — /work/:id
// 展示一件作品 + fork 链 + 复用按钮
// ──────────────────────────────────────────────────────────

export default function WorkDetailPage() {
  const navigate = useNavigate()
  const { id: workId } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [work, setWork] = useState<GalleryWork | null>(null)
  const [forks, setForks] = useState<GalleryWork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [likeDelta, setLikeDelta] = useState(0)

  useEffect(() => {
    if (!workId) return
    setLoading(true)
    getWork(workId).then(({ data, error }) => {
      if (error || !data) {
        setError(error?.message || '作品不存在')
        setWork(null)
      } else {
        setWork(data as unknown as GalleryWork)
        // 拉 fork 列表
        listForksOf(workId).then(({ data: forks }) => setForks((forks as unknown as GalleryWork[]) || []))
        // 拉是否已点赞
        if (user) hasLiked(workId, user.id).then(setLiked)
      }
      setLoading(false)
    })
  }, [workId, user])

  const handleLike = useCallback(async () => {
    if (!user) { navigate('/auth'); return }
    if (!work) return
    const { liked: nowLiked } = await toggleLike(work.id, user.id)
    setLiked(nowLiked)
    setLikeDelta(d => d + (nowLiked ? 1 : -1))
  }, [user, work, navigate])

  const handleReuse = useCallback(() => {
    if (!user) { navigate('/auth'); return }
    if (!work) return
    navigate(`/create?fork=${work.id}`)
  }, [user, work, navigate])

  if (loading) {
    return <div style={centerMsgStyle}>载入中</div>
  }
  if (error) {
    return <div style={centerMsgStyle}>
      <div style={{ color: '#C41E3A', marginBottom: 16 }}>{error}</div>
      <button style={backBtnStyle} onClick={() => navigate('/gallery')}>返回广场</button>
    </div>
  }
  if (!work) return null

  const isFork = Boolean(work.forked_from)
  const sourceWork = work.source // 关联查询带来的源作品（来自 getWork select）
  const totalLikes = (work.likes_count || 0) + likeDelta

  return (
    <div style={pageStyle}>
      <div style={backBarStyle}>
        <button style={backBtnStyle} onClick={() => navigate('/gallery')}>← 返回广场</button>
      </div>

      <div style={containerStyle}>
        <div style={leftColStyle}>
          <div style={coverWrapStyle}>
            {work.cover_path ? (
              <img src={work.cover_path} alt={work.title} crossOrigin="anonymous" style={coverImgStyle} />
            ) : (
              <div style={coverFallbackStyle}>{work.title?.charAt(0)}</div>
            )}
            <span style={rarityTagStyle}>{isFork ? '复 用 作 品' : '原 创 作 品'}</span>
            {work.series && <span style={seriesTagStyle}>{work.series}</span>}
          </div>

          <div style={actionsStyle}>
            <button style={reuseBtnStyle} onClick={handleReuse}>
              {isFork ? '再 次 复 用' : '复 用 这 件'}
            </button>
            <button style={likeBtnStyle(liked)} onClick={handleLike}>
              {liked ? '♥ 已 点 赞' : '♡ 点 赞'}
              <span style={{ marginLeft: 8, opacity: 0.7 }}>{totalLikes}</span>
            </button>
          </div>
        </div>

        <div style={rightColStyle}>
          <h1 style={titleStyle}>{work.title}</h1>
          <div style={metaStyle}>
            <span style={metaItemStyle}>模板：{work.template || '自由创作'}</span>
            <span style={metaDotStyle}>·</span>
            <span style={metaItemStyle}>系列：{work.series || '综合'}</span>
          </div>

          <div style={authorCardStyle}>
            <div style={avatarStyle}>{work.author?.username?.charAt(0).toUpperCase() || '?'}</div>
            <div>
              <div style={authorNameStyle}>{work.author?.username || '匿名创作者'}</div>
              <div style={authorMetaStyle}>
                发布于 {new Date(work.created_at).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>

          <div style={statsRowStyle}>
            <StatCell num={totalLikes} label="点赞" />
            <StatCell num={work.reuse_count} label="被复用" />
            <StatCell num={forks.length} label="衍生作品" />
          </div>

          {isFork && sourceWork && (
            <div style={forkSourceStyle}>
              <div style={forkSourceLabelStyle}>复 用 自</div>
              <div
                style={forkSourceCardStyle}
                onClick={() => navigate(`/work/${sourceWork.id}`)}
              >
                <div style={{ flex: 1 }}>
                  <div style={forkSourceTitleStyle}>{sourceWork.title}</div>
                  <div style={forkSourceAuthorStyle}>by {sourceWork.author?.username || '匿名'}</div>
                </div>
                <span style={arrowStyle}>→</span>
              </div>
            </div>
          )}

          {work.status === 'rejected' && work.rejected_reason && (
            <div style={rejectStyle}>
              <div style={rejectLabelStyle}>审 核 未 通 过</div>
              <div style={rejectReasonStyle}>{work.rejected_reason}</div>
              <div style={rejectHintStyle}>修改后可重新发布</div>
            </div>
          )}

          {forks.length > 0 && (
            <div style={forkListStyle}>
              <div style={forkListTitleStyle}>这 件 作 品 启 发 了</div>
              <div style={forkGridStyle}>
                {forks.map(f => (
                  <div
                    key={f.id}
                    style={forkItemStyle}
                    onClick={() => navigate(`/work/${f.id}`)}
                  >
                    {f.cover_path ? (
                      <img src={f.cover_path} alt={f.title} crossOrigin="anonymous" style={forkItemImgStyle} />
                    ) : (
                      <div style={forkItemFallbackStyle}>{f.title?.charAt(0)}</div>
                    )}
                    <div style={forkItemTitleStyle}>{f.title}</div>
                    <div style={forkItemAuthorStyle}>by {f.author?.username || '匿名'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 子组件 ────────────────────────────────────────────────

interface StatCellProps { num: number; label: string }
function StatCell({ num, label }: StatCellProps) {
  return (
    <div style={statCellStyle}>
      <div style={statNumStyle}>{(num || 0).toLocaleString()}</div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  )
}

// ── 样式 ──────────────────────────────────────────────────

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: '#0A0806',
  color: '#F2EBDB',
  fontFamily: "'Noto Sans SC', sans-serif",
  fontWeight: 300,
  paddingTop: 80,
}

const backBarStyle: CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  padding: '0 48px 24px',
}

const backBtnStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  background: 'transparent',
  color: '#A89580',
  border: '1px solid rgba(212,175,55,0.18)',
  padding: '8px 18px',
  cursor: 'pointer',
  letterSpacing: '0.1em',
}

const containerStyle: CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  padding: '0 48px 80px',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 64,
}

const leftColStyle: CSSProperties = {
  position: 'sticky',
  top: 100,
  alignSelf: 'start',
}

const coverWrapStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '1/1',
  background: 'radial-gradient(ellipse at center, #F2EBDB 0%, #E8DCC2 100%)',
  overflow: 'hidden',
  boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
}

const coverImgStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const coverFallbackStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 120,
  color: '#8B6F1F',
}

const rarityTagStyle: CSSProperties = {
  position: 'absolute',
  top: 14, left: 14,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 11,
  padding: '4px 10px',
  background: 'rgba(10,8,6,0.78)',
  border: '1px solid rgba(212,175,55,0.4)',
  color: '#D4AF37',
  letterSpacing: '0.15em',
}

const seriesTagStyle: CSSProperties = {
  position: 'absolute',
  top: 14, right: 14,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 11,
  padding: '4px 10px',
  background: '#C41E3A',
  color: '#F2EBDB',
  letterSpacing: '0.15em',
}

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 24,
}

const reuseBtnStyle: CSSProperties = {
  flex: 2,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 16,
  background: 'linear-gradient(135deg, #D4AF37 0%, #BC6B2F 100%)',
  color: '#0A0806',
  border: 'none',
  padding: '16px 32px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
  fontWeight: 500,
  transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
}

const likeBtnStyle = (liked: boolean): CSSProperties => ({
  flex: 1,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  background: liked ? 'rgba(196,30,58,0.12)' : 'transparent',
  color: liked ? '#C41E3A' : '#A89580',
  border: `1px solid ${liked ? '#C41E3A' : 'rgba(212,175,55,0.18)'}`,
  padding: '16px 24px',
  cursor: 'pointer',
  letterSpacing: '0.15em',
  fontWeight: 400,
})

const rightColStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const titleStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 'clamp(32px, 4vw, 48px)',
  fontWeight: 500,
  color: '#F2EBDB',
  letterSpacing: '0.04em',
  lineHeight: 1.3,
  marginBottom: 16,
  marginTop: 0,
}

const metaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 32,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  color: '#A89580',
}

const metaItemStyle: CSSProperties = {}
const metaDotStyle: CSSProperties = { color: '#6B5C45' }

const authorCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: 20,
  background: 'rgba(31,24,18,0.6)',
  border: '1px solid rgba(212,175,55,0.18)',
  marginBottom: 32,
}

const avatarStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #8B6F1F, #BC6B2F)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 20,
  color: '#0A0806',
  fontWeight: 500,
}

const authorNameStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 18,
  color: '#F2EBDB',
  fontWeight: 500,
  letterSpacing: '0.05em',
}

const authorMetaStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 12,
  color: '#6B5C45',
  marginTop: 4,
}

const statsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 0,
  borderTop: '1px solid rgba(212,175,55,0.18)',
  borderBottom: '1px solid rgba(212,175,55,0.18)',
  marginBottom: 32,
}

// 原 .jsx 中含 `':last-child'` 伪类键，CSSProperties 不允许，但运行时无害。
// 用 cast 把这个特殊键保留，避免破坏既有视觉。
const statCellStyle = {
  flex: 1,
  padding: '20px 0',
  textAlign: 'center',
  borderRight: '1px solid rgba(212,175,55,0.18)',
  ':last-child': { borderRight: 'none' },
} as CSSProperties

const statNumStyle: CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 32,
  fontWeight: 300,
  color: '#D4AF37',
  lineHeight: 1,
}

const statLabelStyle: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 10,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: '#6B5C45',
  marginTop: 8,
}

const forkSourceStyle: CSSProperties = {
  marginBottom: 32,
}

const forkSourceLabelStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 11,
  letterSpacing: '0.3em',
  color: '#6B5C45',
  marginBottom: 12,
}

const forkSourceCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: 20,
  background: 'rgba(196,30,58,0.06)',
  border: '1px solid rgba(196,30,58,0.3)',
  cursor: 'pointer',
  transition: 'all 0.3s',
}

const forkSourceTitleStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 17,
  color: '#F2EBDB',
  fontWeight: 500,
  letterSpacing: '0.05em',
}

const forkSourceAuthorStyle: CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontStyle: 'italic',
  fontSize: 13,
  color: '#A89580',
  marginTop: 4,
}

const arrowStyle: CSSProperties = {
  fontSize: 20,
  color: '#D4AF37',
}

const rejectStyle: CSSProperties = {
  padding: 24,
  background: 'rgba(196,30,58,0.1)',
  border: '1px solid rgba(196,30,58,0.4)',
  marginBottom: 32,
}

const rejectLabelStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  fontWeight: 500,
  color: '#C41E3A',
  letterSpacing: '0.2em',
  marginBottom: 12,
}

const rejectReasonStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 15,
  color: '#F2EBDB',
  lineHeight: 1.8,
  marginBottom: 8,
}

const rejectHintStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 12,
  color: '#6B5C45',
}

const forkListStyle: CSSProperties = {
  marginTop: 32,
}

const forkListTitleStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  color: '#A89580',
  letterSpacing: '0.15em',
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: '1px solid rgba(212,175,55,0.18)',
}

const forkGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 16,
}

const forkItemStyle: CSSProperties = {
  cursor: 'pointer',
  transition: 'all 0.3s',
}

const forkItemImgStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '1/1',
  objectFit: 'cover',
  marginBottom: 8,
}

const forkItemFallbackStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '1/1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at center, #F2EBDB 0%, #E8DCC2 100%)',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 36,
  color: '#8B6F1F',
  marginBottom: 8,
}

const forkItemTitleStyle: CSSProperties = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  color: '#F2EBDB',
  fontWeight: 500,
}

const forkItemAuthorStyle: CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontStyle: 'italic',
  fontSize: 11,
  color: '#6B5C45',
  marginTop: 2,
}

const centerMsgStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0A0806',
  color: '#6B5C45',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 16,
}
