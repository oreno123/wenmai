import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from '../components/common/Router'
import { useAuth } from '../lib/auth'
import { listPendingReviews, approveWork, rejectWork } from '../lib/galleryApi'
import AdminOnlyRoute from '../components/gallery/AdminOnlyRoute'

// ──────────────────────────────────────────────────────────
// AdminReviewPage — /admin 审核队列
// 待审作品列表 + 通过/驳回（驳回必填理由）
// ──────────────────────────────────────────────────────────

export default function AdminReviewPage() {
  return (
    <AdminOnlyRoute>
      <AdminContent />
    </AdminOnlyRoute>
  )
}

function AdminContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error } = await listPendingReviews()
    if (error) {
      setToast(`加载失败：${error.message}`)
    } else {
      setPending(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleApprove = async (workId) => {
    const { error } = await approveWork(workId, user.id)
    if (error) {
      setToast(`通过失败：${error.message}`)
      return
    }
    setToast(`已通过审核`)
    setPending(prev => prev.filter(w => w.id !== workId))
  }

  const startReject = (workId) => {
    setRejectingId(workId)
    setRejectReason('')
  }

  const cancelReject = () => {
    setRejectingId(null)
    setRejectReason('')
  }

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      setToast('驳回必填理由')
      return
    }
    const { error } = await rejectWork(rejectingId, user.id, rejectReason)
    if (error) {
      setToast(`驳回失败：${error.message}`)
      return
    }
    setToast(`已驳回`)
    setPending(prev => prev.filter(w => w.id !== rejectingId))
    cancelReject()
  }

  // 3 秒后清除 toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={() => navigate('/home')}>← 返回</button>
        <div>
          <span style={sealStyle}>管 理</span>
          <h1 style={h1Style}>审核队列</h1>
          <p style={subStyle}>
            {pending.length} 件作品待审 · 通常 24 小时内处理完毕
          </p>
        </div>
      </div>

      {loading && <div style={emptyStyle}>载入中</div>}
      {!loading && pending.length === 0 && (
        <div style={emptyStyle}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>空</div>
          <div>队列清空了，去广场逛逛。</div>
        </div>
      )}

      <div style={listStyle}>
        {pending.map(work => (
          <div key={work.id} style={cardStyle}>
            <div style={coverWrapStyle}>
              {work.cover_path ? (
                <img src={work.cover_path} alt={work.title} crossOrigin="anonymous" style={coverStyle} />
              ) : (
                <div style={coverFallbackStyle}>{work.title?.charAt(0)}</div>
              )}
            </div>

            <div style={bodyStyle}>
              <div style={titleStyle}>{work.title}</div>
              <div style={metaStyle}>
                <span>by {work.author?.username || '匿名'}</span>
                <span style={dotStyle}>·</span>
                <span>{work.template || '自由创作'}</span>
                {work.series && (
                  <>
                    <span style={dotStyle}>·</span>
                    <span>{work.series}</span>
                  </>
                )}
                <span style={dotStyle}>·</span>
                <span>{new Date(work.created_at).toLocaleString('zh-CN')}</span>
              </div>

              {rejectingId === work.id ? (
                <div style={rejectFormStyle}>
                  <textarea
                    style={textareaStyle}
                    placeholder="请填写驳回理由（必填，将展示给作者）"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                  <div style={rejectActionsStyle}>
                    <button style={cancelBtnStyle} onClick={cancelReject}>取消</button>
                    <button style={confirmRejectBtnStyle} onClick={confirmReject}>
                      确认驳回
                    </button>
                  </div>
                </div>
              ) : (
                <div style={actionsStyle}>
                  <button
                    style={approveBtnStyle}
                    onClick={() => handleApprove(work.id)}
                  >
                    通 过 审 核
                  </button>
                  <button
                    style={rejectBtnStyle}
                    onClick={() => startReject(work.id)}
                  >
                    驳 回
                  </button>
                  <button
                    style={detailBtnStyle}
                    onClick={() => navigate(`/work/${work.id}`)}
                  >
                    查看详情
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  )
}

// ── 样式 ──────────────────────────────────────────────────

const pageStyle = {
  minHeight: '100vh',
  background: '#0A0806',
  color: '#F2EBDB',
  fontFamily: "'Noto Sans SC', sans-serif",
  fontWeight: 300,
  paddingTop: 60,
  paddingBottom: 80,
}

const headerStyle = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '40px 48px 32px',
  display: 'flex',
  gap: 32,
  alignItems: 'flex-start',
}

const backBtnStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  background: 'transparent',
  color: '#A89580',
  border: '1px solid rgba(212,175,55,0.18)',
  padding: '8px 18px',
  cursor: 'pointer',
  letterSpacing: '0.1em',
}

const sealStyle = {
  display: 'inline-block',
  background: '#C41E3A',
  color: '#F2EBDB',
  fontFamily: "'Noto Serif SC', serif",
  fontWeight: 500,
  padding: '4px 12px',
  letterSpacing: '0.2em',
  fontSize: 11,
  marginBottom: 12,
}

const h1Style = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 36,
  fontWeight: 500,
  color: '#F2EBDB',
  margin: '0 0 8px',
  letterSpacing: '0.05em',
}

const subStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  color: '#6B5C45',
}

const emptyStyle = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: 80,
  textAlign: 'center',
  color: '#6B5C45',
  fontFamily: "'Noto Serif SC', serif",
  lineHeight: 2,
}

const listStyle = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '0 48px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}

const cardStyle = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: 24,
  padding: 24,
  background: 'rgba(31,24,18,0.6)',
  border: '1px solid rgba(212,175,55,0.18)',
}

const coverWrapStyle = {
  width: 160,
  height: 160,
  background: 'radial-gradient(ellipse at center, #F2EBDB 0%, #E8DCC2 100%)',
  overflow: 'hidden',
}

const coverStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const coverFallbackStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 56,
  color: '#8B6F1F',
}

const bodyStyle = {
  display: 'flex',
  flexDirection: 'column',
}

const titleStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 22,
  fontWeight: 500,
  color: '#F2EBDB',
  letterSpacing: '0.05em',
  marginBottom: 8,
}

const metaStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 12,
  color: '#A89580',
  marginBottom: 16,
}

const dotStyle = { color: '#6B5C45' }

const actionsStyle = {
  display: 'flex',
  gap: 12,
  marginTop: 'auto',
}

const approveBtnStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  background: 'linear-gradient(135deg, #D4AF37 0%, #BC6B2F 100%)',
  color: '#0A0806',
  border: 'none',
  padding: '10px 24px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
  fontWeight: 500,
}

const rejectBtnStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  background: 'transparent',
  color: '#C41E3A',
  border: '1px solid #C41E3A',
  padding: '10px 24px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
}

const detailBtnStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  background: 'transparent',
  color: '#A89580',
  border: '1px solid rgba(212,175,55,0.18)',
  padding: '10px 24px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
  marginLeft: 'auto',
}

const rejectFormStyle = {
  marginTop: 'auto',
}

const textareaStyle = {
  width: '100%',
  background: 'rgba(10,8,6,0.5)',
  border: '1px solid rgba(196,30,58,0.4)',
  color: '#F2EBDB',
  padding: '12px 14px',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  outline: 'none',
  resize: 'vertical',
  marginBottom: 12,
}

const rejectActionsStyle = {
  display: 'flex',
  gap: 12,
}

const cancelBtnStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  background: 'transparent',
  color: '#A89580',
  border: '1px solid rgba(212,175,55,0.18)',
  padding: '10px 24px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
}

const confirmRejectBtnStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  background: '#C41E3A',
  color: '#F2EBDB',
  border: 'none',
  padding: '10px 24px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
  fontWeight: 500,
}

const toastStyle = {
  position: 'fixed',
  bottom: 100,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(31,24,18,0.95)',
  border: '1px solid rgba(212,175,55,0.4)',
  color: '#D4AF37',
  padding: '12px 32px',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  letterSpacing: '0.15em',
  zIndex: 300,
  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
}
