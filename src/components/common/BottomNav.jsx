import { useLocation, useNavigate } from './Router'

const TABS = [
  { path: '/home', label: '首页', icon: 'home' },
  { path: '/library', label: '图鉴', icon: 'book' },
  { path: '/puzzle', label: '创作', icon: 'compose', center: true },
  { path: '/gacha', label: '抽卡', icon: 'card' },
  { path: '/jigsaw', label: '拼图', icon: 'puzzle' },
]

const ICONS = {
  home: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" /><path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
    </svg>
  ),
  book: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  puzzle: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568a1.5 1.5 0 010 2.122l-1.568 1.568c-.23.23-.338.556-.289.878l.39 2.334a1.5 1.5 0 01-1.212 1.726l-2.334.39a1.2 1.2 0 00-.878.289l-1.568 1.568a1.5 1.5 0 01-2.122 0l-1.568-1.568a1.2 1.2 0 00-.878-.289l-2.334-.39a1.5 1.5 0 01-1.212-1.726l.39-2.334c.049-.322-.059-.648-.289-.878L3.72 12.418a1.5 1.5 0 010-2.122l1.568-1.568c.23-.23.338-.556.289-.878l-.39-2.334A1.5 1.5 0 016.4 4.358l2.334-.39c.322-.049.648-.338.878-.568L11.18 1.832a1.5 1.5 0 012.122 0l1.568 1.568c.23.23.556.519.878.568l2.334.39a1.5 1.5 0 011.212 1.726z" />
    </svg>
  ),
  card: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" />
    </svg>
  ),
  compose: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
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
        const color = active ? '#F2D58A' : '#4A4A4A'

        if (tab.center) {
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)}
              className="bg-transparent border-none cursor-pointer flex flex-col items-center relative bottom-2 font-serif">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #BC6B2F, #8A4A20)',
                  boxShadow: '0 0 20px rgba(188,107,47,0.4)',
                }}>
                {ICONS[tab.icon]('#F5F1E8')}
              </div>
              <span className={`text-[10px] mt-0.5 ${active ? 'text-gold-bright' : 'text-text-dim'}`}>
                {tab.label}
              </span>
            </button>
          )
        }

        return (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className="bg-transparent border-none cursor-pointer flex flex-col items-center gap-0.5 py-1.5 font-serif relative">
            {ICONS[tab.icon](color)}
            <span className="text-[10px]" style={{ color }}>
              {tab.label}
            </span>
            {active && (
              <div className="w-4 h-0.5 bg-gold-bright rounded-sm absolute bottom-2" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
