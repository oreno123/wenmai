import { useEffect, useState } from 'react'
import { useNavigate } from '../common/Router'
import { fetchIsAdmin } from '../../lib/galleryApi'
import { useAuth } from '../../lib/auth'

// ──────────────────────────────────────────────────────────
// AdminOnlyRoute — 包裹组件，仅 is_admin=true 可访问
// ──────────────────────────────────────────────────────────

export default function AdminOnlyRoute({ children }) {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/auth')
      return
    }
    fetchIsAdmin(user.id).then(ok => {
      setIsAdmin(ok)
      setChecking(false)
      if (!ok) navigate('/home')
    })
  }, [user, authLoading, navigate])

  if (checking || !isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0806',
        color: '#6B5C45',
        fontFamily: "'Noto Serif SC', serif",
      }}>
        验证权限中
      </div>
    )
  }

  return children
}
