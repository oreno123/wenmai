import { useLocation, useNavigate } from './Router'

const TABS = [
  { path: '/library', label: '图鉴', icon: 'book' },
  { path: '/relic', label: '立体', icon: 'cube' },
  { path: '/photo-match', label: '拍照', icon: 'camera', center: true },
  { path: '/puzzle', label: '创作', icon: 'compose' },
  { path: '/gallery', label: '广场', icon: 'gallery' },
]

const ICONS = {
  home: (color, active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" /><path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
    </svg>
  ),
  book: (color, active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.92">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  camera: (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  cube: (color, active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.92">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" /><path d="M12 22.08V12" />
    </svg>
  ),
  card: (color, active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" />
    </svg>
  ),
  gallery: (color, active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.92">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
  compose: (color, active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.92">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  vase: (color, active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6" /><path d="M10 3c0 2-1 3-2 4-1.5 1.5-2 3.5-2 6 0 3 1.5 5 3 6.5.5.5 1 1 1 1.5h-4" /><path d="M14 3c0 2 1 3 2 4 1.5 1.5 2 3.5 2 6 0 3-1.5 5-3 6.5-.5.5-1 1-1 1.5" />
    </svg>
  ),
}

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-16 flex items-end justify-around z-[100]"
      style={{
        background: 'rgba(10,10,10,0.95)',
        borderTop: '1px solid rgba(212,175,106,0.12)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      {TABS.map(tab => {
        const active = pathname === tab.path
        // 非选中也从纯装饰灰提到次级文字灰，Tab 标签满足 AA 对比度
        const color = active ? '#F2D58A' : 'var(--color-text-secondary)'

        if (tab.center) {
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)}
              className="bg-transparent border-none cursor-pointer flex flex-col items-center relative bottom-2 font-serif">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, var(--color-accent-transient), var(--color-accent-transient-deep))',
                  boxShadow: '0 0 24px rgba(212,129,58,0.45)',
                }}>
                {ICONS[tab.icon]('#F5F1E8')}
              </div>
              <span className={`text-[10px] mt-0.5 ${active ? 'text-gold-bright' : 'text-text-secondary'}`}>
                {tab.label}
              </span>
            </button>
          )
        }

        return (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className="bg-transparent border-none cursor-pointer flex flex-col items-center gap-0.5 py-1.5 font-serif relative">
            {ICONS[tab.icon](color, active)}
            <span className="text-[10px]" style={{ color }}>
              {tab.label}
            </span>
            {active && (
              <div className="w-2.5 h-[3px] bg-gold-bright rounded-full absolute bottom-1" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
