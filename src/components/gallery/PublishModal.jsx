import { useState, useRef, useEffect } from 'react'
import { publishWork, uploadWorkCover } from '../../lib/galleryApi'

// ──────────────────────────────────────────────────────────
// PublishModal — 发布作品到广场
// 步骤：填标题 → 选系列/模板 → 勾选授权 → 提交
// 入参：
//   - open: boolean
//   - onClose: () => void
//   - userId, placements, coverBlob (Blob|File)
//   - forkedFrom?: string (如果是 fork 复用作品)
//   - defaultTemplate?: string
//   - defaultSeries?: string
//   - onPublished?: (work) => void
// ──────────────────────────────────────────────────────────

const SERIES_OPTIONS = ['青花瓷', '山海经', '青铜器', '唐草', '团龙']
const TEMPLATE_OPTIONS = ['团龙献瑞', '莲池清韵', '双龙戏珠', '青铜威仪', '青花缠枝', '山海异兽', '自由创作']

export default function PublishModal({
  open, onClose,
  userId, placements, coverBlob,
  forkedFrom = null,
  defaultTemplate = '自由创作',
  defaultSeries = '',
  onPublished,
}) {
  const [title, setTitle] = useState('')
  const [series, setSeries] = useState(defaultSeries)
  const [template, setTemplate] = useState(defaultTemplate)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const overlayRef = useRef(null)

  // 重置状态：每次打开时
  useEffect(() => {
    if (open) {
      setTitle('')
      setSeries(defaultSeries)
      setTemplate(defaultTemplate)
      setAgreed(false)
      setError(null)
      setDone(null)
    }
  }, [open, defaultSeries, defaultTemplate])

  // 锁定 body 滚动
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async () => {
    setError(null)
    if (!title.trim()) { setError('请填写作品标题'); return }
    if (!userId) { setError('未登录，无法发布'); return }
    if (!placements) { setError('缺少作品数据'); return }
    if (!agreed) { setError('请勾选授权'); return }
    if (!coverBlob) { setError('缺少封面图，请先完成创作导出'); return }

    setSubmitting(true)
    const { data, error } = await publishWork({
      authorId: userId,
      title: title.trim(),
      template: template === '自由创作' ? null : template,
      placements,
      series: series || null,
      forkedFrom,
      coverBlob,
    })
    setSubmitting(false)

    if (error) {
      setError(error.message || '发布失败，请稍后重试')
      return
    }
    setDone(data)
    onPublished?.(data)
  }

  return (
    <div
      ref={overlayRef}
      style={overlayStyle}
      onClick={(e) => { if (e.target === overlayRef.current && !submitting) onClose() }}
    >
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose} disabled={submitting}>×</button>

        {done ? (
          <DoneView work={done} onClose={onClose} />
        ) : (
          <>
            <div style={headerStyle}>
              <span style={sealStyle}>召 集</span>
              <h2 style={h2Style}>发布到广场</h2>
              <p style={subTitleStyle}>
                完成后你的作品将进入审核队列，<br/>
                审核通过后所有人都能看见并复用。
              </p>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>作品标题</label>
              <input
                style={inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给这件作品起个名字（如「团龙献瑞」）"
                maxLength={20}
                disabled={submitting}
              />
              <div style={hintStyle}>{title.length}/20</div>
            </div>

            <div style={fieldRowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>系列</label>
                <select
                  style={selectStyle}
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">不选</option>
                  {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>模板</label>
                <select
                  style={selectStyle}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  disabled={submitting}
                >
                  {TEMPLATE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {forkedFrom && (
              <div style={forkNoteStyle}>
                这件作品是「复用」自其他作品。<br/>
                发布后将以衍生作品形式展示，标注 fork 来源。
              </div>
            )}

            <label style={agreeRowStyle}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={submitting}
                style={checkboxStyle}
              />
              <span style={agreeTextStyle}>
                我授权纹脉平台其他用户复用此作品（基于纹脉素材库的再创作），<br/>
                并确认所用素材均为纹脉提供或我有权使用。<br/>
                <span style={{ color: '#6B5C45', fontSize: 12 }}>
                  商用印刷权仍归原作者所有。
                </span>
              </span>
            </label>

            {error && <div style={errorBoxStyle}>{error}</div>}

            <div style={actionsStyle}>
              <button
                style={cancelBtnStyle}
                onClick={onClose}
                disabled={submitting}
              >
                取 消
              </button>
              <button
                style={submitBtnStyle(!agreed || submitting)}
                onClick={handleSubmit}
                disabled={!agreed || submitting}
              >
                {submitting ? '提 交 中...' : '提 交 审 核'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 完成视图 ──────────────────────────────────────────────

function DoneView({ work, onClose }) {
  return (
    <div style={doneStyle}>
      <div style={doneSealStyle}>已 提 交</div>
      <h2 style={doneTitleStyle}>作品进入审核队列</h2>
      <p style={doneDescStyle}>
        通常 24 小时内审核完成。<br/>
        通过后将在广场显示，<br/>
        你的「呼吸」就被别人接住了。
      </p>
      <button style={doneBtnStyle} onClick={onClose}>完 成</button>
    </div>
  )
}

// ── 样式 ──────────────────────────────────────────────────

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(10,8,6,0.88)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
}

const modalStyle = {
  position: 'relative',
  background: 'linear-gradient(135deg, #14100A 0%, #1F1812 100%)',
  border: '1px solid rgba(212,175,55,0.4)',
  padding: 40,
  maxWidth: 560,
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  color: '#F2EBDB',
  fontFamily: "'Noto Sans SC', sans-serif",
  boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
}

const closeBtnStyle = {
  position: 'absolute',
  top: 16, right: 16,
  width: 32, height: 32,
  background: 'transparent',
  border: 'none',
  color: '#6B5C45',
  fontSize: 24,
  cursor: 'pointer',
  lineHeight: 1,
}

const headerStyle = {
  textAlign: 'center',
  marginBottom: 32,
  paddingTop: 8,
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
  marginBottom: 16,
}

const h2Style = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 26,
  fontWeight: 500,
  color: '#F2EBDB',
  margin: '0 0 12px',
  letterSpacing: '0.05em',
}

const subTitleStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  color: '#6B5C45',
  lineHeight: 1.85,
  fontWeight: 300,
}

const fieldStyle = {
  marginBottom: 20,
  flex: 1,
}

const fieldRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  marginBottom: 20,
}

const labelStyle = {
  display: 'block',
  fontFamily: "'Outfit', sans-serif",
  fontSize: 11,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#A89580',
  marginBottom: 8,
}

const inputStyle = {
  width: '100%',
  background: 'rgba(10,8,6,0.5)',
  border: '1px solid rgba(212,175,55,0.25)',
  color: '#F2EBDB',
  padding: '12px 14px',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 15,
  outline: 'none',
  transition: 'border-color 0.3s',
}

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%23D4AF37\' fill=\'none\' stroke-width=\'1.5\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 36,
}

const hintStyle = {
  textAlign: 'right',
  fontSize: 11,
  color: '#6B5C45',
  marginTop: 4,
  fontFamily: "'Outfit', sans-serif",
}

const forkNoteStyle = {
  padding: 16,
  background: 'rgba(196,30,58,0.08)',
  border: '1px solid rgba(196,30,58,0.3)',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  color: '#A89580',
  lineHeight: 1.8,
  marginBottom: 20,
}

const agreeRowStyle = {
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  padding: 16,
  background: 'rgba(212,175,55,0.05)',
  border: '1px solid rgba(212,175,55,0.2)',
  marginBottom: 24,
  cursor: 'pointer',
}

const checkboxStyle = {
  marginTop: 4,
  width: 16,
  height: 16,
  accentColor: '#D4AF37',
  cursor: 'pointer',
}

const agreeTextStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  color: '#A89580',
  lineHeight: 1.8,
  flex: 1,
}

const errorBoxStyle = {
  padding: 16,
  background: 'rgba(196,30,58,0.1)',
  border: '1px solid rgba(196,30,58,0.4)',
  color: '#C41E3A',
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 13,
  marginBottom: 20,
  textAlign: 'center',
}

const actionsStyle = {
  display: 'flex',
  gap: 12,
}

const cancelBtnStyle = {
  flex: 1,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  background: 'transparent',
  color: '#A89580',
  border: '1px solid rgba(212,175,55,0.18)',
  padding: '14px 24px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
}

const submitBtnStyle = (disabled) => ({
  flex: 2,
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  background: disabled
    ? 'rgba(212,175,55,0.2)'
    : 'linear-gradient(135deg, #D4AF37 0%, #BC6B2F 100%)',
  color: disabled ? '#6B5C45' : '#0A0806',
  border: 'none',
  padding: '14px 24px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  letterSpacing: '0.2em',
  fontWeight: 500,
})

// ── 完成视图样式 ─────────────────────────────────────────

const doneStyle = {
  textAlign: 'center',
  padding: '32px 0',
}

const doneSealStyle = {
  display: 'inline-block',
  background: '#D4AF37',
  color: '#0A0806',
  fontFamily: "'Noto Serif SC', serif",
  fontWeight: 500,
  padding: '6px 16px',
  letterSpacing: '0.25em',
  fontSize: 12,
  marginBottom: 24,
}

const doneTitleStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 24,
  fontWeight: 500,
  color: '#F2EBDB',
  marginBottom: 16,
}

const doneDescStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  color: '#A89580',
  lineHeight: 2,
  marginBottom: 32,
}

const doneBtnStyle = {
  fontFamily: "'Noto Serif SC', serif",
  fontSize: 14,
  background: 'linear-gradient(135deg, #D4AF37 0%, #BC6B2F 100%)',
  color: '#0A0806',
  border: 'none',
  padding: '14px 48px',
  cursor: 'pointer',
  letterSpacing: '0.2em',
  fontWeight: 500,
}
