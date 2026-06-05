import { useLocation, useNavigate } from './Router'

const TABS = [
  { path: '/home', label: '首页', icon: '🏠' },
  { path: '/library', label: '纹样', icon: '📚' },
  { path: '/puzzle', label: '拼图', icon: '🧩', center: true },
  { path: '/gacha', label: '抽卡', icon: '🎴' },
  { path: '/editor', label: '编辑', icon: '✏️' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'fixed', bottom: 0,
      left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px', height: 64,
      background: 'rgba(10,10,10,0.95)',
      borderTop: '1px solid rgba(212,175,106,0.12)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end',
      justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {TABS.map(tab => {
        const active = pathname === tab.path
        const isCenter = tab.center

        if (isCenter) {
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              position: 'relative', bottom: 8,
              fontFamily: 'inherit',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(145deg, #BC6B2F, #8A4A20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: '#F5F1E8',
                boxShadow: '0 0 20px rgba(188,107,47,0.4)',
              }}>
                {tab.icon}
              </div>
              <span style={{ fontSize: 10, color: active ? '#F2D58A' : '#4A4A4A', marginTop: 2 }}>
                {tab.label}
              </span>
            </button>
          )
        }

        return (
          <button key={tab.path} onClick={() => navigate(tab.path)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '6px 0', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 20, color: active ? '#F2D58A' : '#4A4A4A' }}>
              {tab.icon}
            </span>
            <span style={{ fontSize: 10, color: active ? '#F2D58A' : '#4A4A4A' }}>
              {tab.label}
            </span>
            {active && (
              <div style={{
                width: 16, height: 2, background: '#F2D58A', borderRadius: 1,
                position: 'absolute', bottom: 8,
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
