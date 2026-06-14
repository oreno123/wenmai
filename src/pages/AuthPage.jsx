import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from '../components/common/Router'
import { signInWithEmail, signUpWithEmail, signOut } from '../lib/auth'
import { useAuth } from '../lib/auth'

export default function AuthPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

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

  // ── Logged-in state ──
  if (user) {
    const displayName = user.user_metadata?.username || user.email?.split('@')[0] || '已登录'
    return (
      <div style={{
        padding: '32px 20px 100px',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          {/* Avatar */}
          <div style={{
            width: 84, height: 84, borderRadius: '50%',
            background: 'linear-gradient(145deg, #C9943A, #8B6914)',
            border: '2px solid rgba(242,213,138,0.5)',
            boxShadow: '0 0 32px rgba(201,148,58,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            fontFamily: 'Noto Serif SC, serif', fontSize: 32, color: '#F5F1E8', fontWeight: 600,
          }}>
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div style={{
            fontFamily: 'Noto Serif SC, serif', fontSize: 22, fontWeight: 600,
            color: '#F2D58A', letterSpacing: '0.15em',
          }}>
            {displayName}
          </div>
          <div style={{
            fontSize: 11, color: '#6A6A6A', marginTop: 6, letterSpacing: '0.05em',
          }}>
            {user.email}
          </div>

          <div style={{
            fontSize: 11, color: '#8A6A30', marginTop: 16,
            padding: '8px 14px', borderRadius: 12,
            background: 'rgba(212,175,106,0.06)',
            border: '1px solid rgba(212,175,106,0.12)',
            textAlign: 'center',
            fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.1em',
          }}>
            已登录 · 数据已同步至云端
          </div>

          <button
            onClick={handleSignOut}
            style={{
              marginTop: 28, padding: '12px 32px',
              borderRadius: 12, fontSize: 13,
              fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.15em',
              background: 'rgba(188,31,40,0.08)',
              color: '#E88080',
              border: '1px solid rgba(232,128,128,0.2)',
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
      padding: '40px 20px 100px', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 340 }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontFamily: 'Noto Serif SC, serif', fontSize: 28, fontWeight: 700,
            color: '#F2D58A', letterSpacing: '0.25em',
          }}>
            {mode === 'login' ? '登录' : '注册'}
          </div>
          <div style={{
            fontSize: 10, color: '#8A6A30', letterSpacing: '0.3em',
            textTransform: 'uppercase', marginTop: 6,
          }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div style={{
              fontSize: 12, color: '#E88080',
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(232,128,128,0.06)',
              border: '1px solid rgba(232,128,128,0.15)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              padding: '14px',
              borderRadius: 12, fontSize: 14,
              fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.2em',
              background: loading
                ? 'rgba(212,175,106,0.08)'
                : 'linear-gradient(145deg, #C9943A, #8B6914)',
              color: '#F5F1E8',
              border: '1px solid rgba(201,148,58,0.4)',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 2px 12px rgba(201,148,58,0.18)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '处理中...' : (mode === 'login' ? '登 录' : '注 册')}
          </button>
        </form>

        {/* Switch mode */}
        <div style={{
          textAlign: 'center', marginTop: 18, fontSize: 12, color: '#7A7060',
          fontFamily: 'Noto Serif SC, serif', letterSpacing: '0.05em',
        }}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <span
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
            style={{
              color: '#F2D58A', cursor: 'pointer', marginLeft: 6,
              borderBottom: '1px solid rgba(242,213,138,0.3)',
              paddingBottom: 1,
            }}
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

const inputStyle = {
  padding: '12px 14px', borderRadius: 10,
  background: 'rgba(15,15,16,0.5)',
  border: '1px solid rgba(212,175,106,0.15)',
  color: '#F5F1E8', fontSize: 14,
  fontFamily: 'inherit', letterSpacing: '0.05em',
  outline: 'none',
  transition: 'border-color 0.2s',
}
