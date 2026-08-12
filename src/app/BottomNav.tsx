import type { ReactElement } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface TabDef {
  path: string
  label: string
  icon: (color: string) => ReactElement
  center?: boolean
}

const ICONS = {
  home: (color: string): ReactElement => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
    </svg>
  ),
  book: (color: string): ReactElement => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  compose: (color: string): ReactElement => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  gallery: (color: string): ReactElement => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
}

const TABS: TabDef[] = [
  { path: '/home', label: '首页', icon: ICONS.home },
  { path: '/library', label: '图鉴', icon: ICONS.book },
  { path: '/create', label: '创作', icon: ICONS.compose, center: true },
  { path: '/gallery', label: '广场', icon: ICONS.gallery },
]

export default function BottomNav(): ReactElement {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-16 flex items-end justify-around z-[100]"
      style={{
        background: 'rgba(10,10,10,0.95)',
        borderTop: '1px solid rgba(212,175,106,0.12)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.path
        const color = active ? '#F2D58A' : '#4A4A4A'

        if (tab.center) {
          return (
            <button
              key={tab.path}
              data-center="true"
              data-active={active ? 'true' : 'false'}
              onClick={() => navigate(tab.path)}
              className="bg-transparent border-none cursor-pointer flex flex-col items-center relative bottom-2 font-serif"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #BC6B2F, #8A4A20)',
                  boxShadow: '0 0 20px rgba(188,107,47,0.4)',
                }}
              >
                {tab.icon('#F5F1E8')}
              </div>
              <span
                className="text-[10px] mt-0.5"
                style={{ color: active ? '#F2D58A' : '#4A4A4A' }}
              >
                {tab.label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={tab.path}
            data-active={active ? 'true' : 'false'}
            onClick={() => navigate(tab.path)}
            className="bg-transparent border-none cursor-pointer flex flex-col items-center gap-0.5 py-1.5 font-serif relative"
          >
            {tab.icon(color)}
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
