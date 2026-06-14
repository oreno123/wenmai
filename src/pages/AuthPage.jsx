import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from '../components/common/Router'
import { signInWithEmail, signUpWithEmail, signOut } from '../lib/auth'
import { useAuth } from '../lib/auth'
import FluidShaderBackground from '../components/common/FluidShaderBackground'

/* 云雷纹装饰圆 — brand crest */
function CrestMark({ size = 48, opacity = 0.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ opacity }}>
      <circle cx="24" cy="24" r="20" stroke="#D4AF6A" strokeWidth="0.5" />
      <circle cx="24" cy="24" r="14" stroke="#D4AF6A" strokeWidth="0.35" />
      <path d="M24 6 L24 42 M6 24 L42 24 M11.5 11.5 L36.5 36.5 M36.5 11.5 L11.5 36.5"
        stroke="#D4AF6A" strokeWidth="0.25" opacity="0.5" />
      <circle cx="24" cy="24" r="4" stroke="#F2D58A" strokeWidth="0.5" />
      <circle cx="24" cy="24" r="1.4" fill="#F2D58A" />
    </svg>
  )
}

/* Warm ink palette — borrowed from xhs-rag's login page */
const ink = {
  900: '#f0e6d2',
  700: '#c4b49a',
  500: 'rgba(200,180,150,0.45)',
  400: 'rgba(200,180,150,0.30)',
  300: 'rgba(200,180,150,0.22)',
}
const accent = '#F2D58A'
const accentDeep = '#D4AF6A'
const accentRed = '#BC1F28'

const features = [
  { label: '400+ 纹样', desc: '商周到明清，九大系列收藏' },
  { label: '元素拼图', desc: '金线元素自由组合，专属创作' },
  { label: '3D 浮雕', desc: '金线金属浮雕 + 青花瓷釉面' },
]

export default function AuthPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
      } else {
        if (username.trim().length < 1) throw new Error('请输入用户名')
        if (password.length < 8) throw new Error('密码至少 8 位')
        const { error } = await signUpWithEmail(email, password, username.trim())
        if (error) throw error
      }
      navigate('/home')
    } catch (err) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }, [mode, email, password, username, navigate])

  const handleSignOut = useCallback(async () => {
    await signOut()
    setMode('login')
  }, [])

  const reveal = (delay) => ({
    initial: { opacity: 0, y: 16 },
    animate: visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] },
  })

  // ── Logged-in state ──
  if (user) {
    const displayName = user.user_metadata?.username || user.email?.split('@')[0] || '已登录'
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0807',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <FluidShaderBackground opacity={0.5} intensity={0.75} />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ width: '100%', maxWidth: 340, textAlign: 'center', position: 'relative', zIndex: 10 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <CrestMark size={52} opacity={0.7} />
          </div>

          <div style={{
            width: 92, height: 92, borderRadius: '50%',
            background: 'linear-gradient(145deg, #C9943A, #8B6914)',
            border: '2px solid rgba(242,213,138,0.55)',
            boxShadow: '0 0 36px rgba(201,148,58,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            fontFamily: 'Noto Serif SC, serif', fontSize: 38, color: '#F5F1E8', fontWeight: 700,
          }}>
            {displayName.slice(0, 1).toUpperCase()}
          </div>

          <div style={{
            fontFamily: 'Noto Serif SC, serif', fontSize: 22, fontWeight: 600,
            color: ink[900], letterSpacing: '0.2em',
          }}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, color: ink[500], marginTop: 6, letterSpacing: '0.05em' }}>
            {user.email}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 11, color: accentDeep, letterSpacing: '0.15em',
            fontFamily: 'Noto Serif SC, serif', marginTop: 22, marginBottom: 28,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            数据已同步至云端
          </div>

          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.25em',
              background: 'linear-gradient(145deg, #C9943A, #8B6914)',
              color: '#F5F1E8',
              border: '1px solid rgba(201,148,58,0.45)',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(201,148,58,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
              marginBottom: 10,
            }}
          >
            进 入 纹 脉
          </button>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 12, fontSize: 12,
              fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.15em',
              background: 'transparent', color: ink[500],
              border: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer',
            }}
          >
            退出登录
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Login / Register form ──
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0807',
      padding: '48px 24px 40px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <FluidShaderBackground opacity={0.5} intensity={0.75} />
      {/* Dark vignette over the shader — pushes the dye further into the
          background so foreground content reads cleanly. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, transparent 0%, rgba(8,6,4,0.45) 60%, rgba(8,6,4,0.78) 100%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 10 }}>
        {/* ───── HERO ───── */}
        <motion.div {...reveal(0.05)} style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase',
            color: 'rgba(200,180,150,0.32)', fontWeight: 500,
            marginBottom: 14,
          }}>
            Pattern Veins
          </div>
          <div style={{
            display: 'flex', justifyContent: 'center', marginBottom: 14,
          }}>
            <CrestMark size={44} opacity={0.85} />
          </div>
          <h1 style={{
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 'clamp(40px, 12vw, 56px)',
            fontWeight: 700, lineHeight: 1.05,
            letterSpacing: '0.15em',
            color: '#F8F4E8',
            textShadow: '0 2px 24px rgba(0,0,0,0.6), 0 0 1px rgba(0,0,0,0.4)',
            margin: 0,
          }}>
            纹脉
          </h1>
          <p style={{
            fontSize: 13, color: 'rgba(245,241,232,0.7)', lineHeight: 1.7,
            letterSpacing: '0.05em', marginTop: 14, maxWidth: 300, margin: '14px auto 0',
            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          }}>
            中国传统纹样收藏与创作<br />让千年纹样在掌中重生
          </p>
        </motion.div>

        {/* ───── Feature list ───── */}
        <motion.div {...reveal(0.2)} style={{
          marginTop: 28, marginBottom: 28,
          display: 'flex', flexDirection: 'column', gap: 9,
          padding: '12px 14px',
          background: 'rgba(8,6,4,0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 12,
          border: '1px solid rgba(200,180,150,0.06)',
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 12, color: 'rgba(245,241,232,0.55)', letterSpacing: '0.04em',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#F2D58A', opacity: 0.75, flexShrink: 0,
                boxShadow: '0 0 6px rgba(242,213,138,0.4)',
              }} />
              <span style={{ color: '#F8F4E8', fontWeight: 500, minWidth: 78 }}>{f.label}</span>
              <span style={{ opacity: 0.7 }}>{f.desc}</span>
            </div>
          ))}
        </motion.div>

        {/* ───── Glass form card ───── */}
        <motion.div {...reveal(0.35)} style={{
          padding: '24px 22px',
          borderRadius: 18,
          background: 'rgba(8,6,4,0.72)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(200,180,150,0.12)',
          boxShadow: '0 0 0 1px rgba(242,213,138,0.05), 0 12px 48px rgba(0,0,0,0.55)',
        }}>
          <h2 style={{
            fontFamily: 'Noto Serif SC, serif',
            fontSize: 18, fontWeight: 600,
            color: ink[900], letterSpacing: '0.2em',
            textAlign: 'center', margin: 0,
          }}>
            {mode === 'login' ? '登 录' : '注 册'}
          </h2>
          <p style={{
            fontSize: 11, color: ink[500], textAlign: 'center',
            marginTop: 4, marginBottom: 18, letterSpacing: '0.1em',
          }}>
            {mode === 'login' ? '欢迎回到纹脉' : '创建你的纹脉账号'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mode === 'register' && (
              <FieldInput
                icon={<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />}
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(v) => setUsername(v)}
                required
              />
            )}
            <FieldInput
              icon={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>}
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(v) => setEmail(v)}
              required
            />
            <FieldInput
              icon={<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>}
              type="password"
              placeholder={mode === 'register' ? '密码（≥ 8 位）' : '密码'}
              value={password}
              onChange={(v) => setPassword(v)}
              required
              minLength={mode === 'register' ? 8 : 1}
            />

            {error && (
              <div style={{
                fontSize: 12, color: '#E88080',
                padding: '9px 12px', borderRadius: 8,
                background: 'rgba(232,128,128,0.06)',
                border: '1px solid rgba(232,128,128,0.2)',
                fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.05em',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '13px',
                borderRadius: 11, fontSize: 13, fontWeight: 600,
                fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.25em',
                background: loading ? 'rgba(212,175,106,0.08)' : 'linear-gradient(145deg, #C9943A, #8B6914)',
                color: '#F5F1E8',
                border: '1px solid rgba(201,148,58,0.45)',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(201,148,58,0.22), inset 0 1px 0 rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? '处 理 中' : (mode === 'login' ? '登 录' : '注 册')}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: 16, fontSize: 12, color: ink[400],
            fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.05em',
          }}>
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <span
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
              style={{
                color: accent, cursor: 'pointer', marginLeft: 6,
                borderBottom: `1px solid ${accent}55`,
                paddingBottom: 1,
              }}
            >
              {mode === 'login' ? '去注册' : '去登录'}
            </span>
          </div>
        </motion.div>

        {/* ───── Footer hint ───── */}
        <motion.div {...reveal(0.5)} style={{
          marginTop: 18, textAlign: 'center',
          fontSize: 10, color: 'rgba(200,180,150,0.25)',
          letterSpacing: '0.15em',
        }}>
          {mode === 'register' ? '注册后需邮箱验证激活' : '数据加密存储 · 跨设备同步'}
        </motion.div>
      </div>
    </div>
  )
}

/* Input with leading icon — matches the glass card aesthetic */
function FieldInput({ icon, type, placeholder, value, onChange, required, minLength = 1 }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', display: 'flex',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="rgba(74,58,38,0.55)" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        style={{
          width: '100%',
          padding: '12px 14px 12px 40px',
          borderRadius: 10,
          background: 'rgba(245,241,232,0.92)',
          border: '1px solid rgba(200,180,150,0.25)',
          color: '#2A2015', fontSize: 13.5,
          fontFamily: 'inherit', letterSpacing: '0.04em',
          outline: 'none',
          transition: 'all 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'rgba(201,148,58,0.6)'
          e.target.style.background = 'rgba(248,244,235,1)'
          e.target.style.boxShadow = '0 0 0 3px rgba(201,148,58,0.12)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(200,180,150,0.25)'
          e.target.style.background = 'rgba(245,241,232,0.92)'
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
