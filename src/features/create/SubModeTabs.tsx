import { useNavigate, useSearchParams } from 'react-router-dom'

export interface SubModeTabsProps {
  mode: 'guided' | 'preview'
  options: { sub: string; cn: string }[]
}

export function normalizeSub(options: { sub: string }[], raw: string | null): string {
  return options.some((o) => o.sub === raw) ? (raw as string) : options[0].sub
}

export default function SubModeTabs({ mode, options }: SubModeTabsProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const current = normalizeSub(options, searchParams.get('sub'))

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '6px 16px',
        background: 'rgba(15,15,16,0.4)',
      }}
    >
      {options.map((o) => {
        const active = current === o.sub
        return (
          <button
            key={o.sub}
            onClick={() => navigate(`/create?mode=${mode}&sub=${o.sub}`)}
            style={{
              padding: '4px 12px',
              borderRadius: 10,
              fontSize: 11,
              fontFamily: 'Noto Serif SC, serif',
              cursor: 'pointer',
              background: active ? 'rgba(212,175,106,0.12)' : 'transparent',
              color: active ? '#F2D58A' : '#6A6A6A',
              border: active
                ? '1px solid rgba(212,175,106,0.25)'
                : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {o.cn}
          </button>
        )
      })}
    </div>
  )
}
