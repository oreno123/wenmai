import { useNavigate, useSearchParams } from 'react-router-dom'

export type CreateMode = 'free' | 'guided' | 'preview'

const TABS: { mode: CreateMode; cn: string; en: string }[] = [
  { mode: 'free', cn: '自 由', en: 'FREE' },
  { mode: 'guided', cn: '引 导', en: 'GUIDED' },
  { mode: 'preview', cn: '预 览', en: 'PREVIEW' },
]

export default function ModeTabs() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const current = (searchParams.get('mode') as CreateMode | null) ?? 'free'

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '8px 16px',
        borderBottom: '1px solid rgba(212,175,106,0.08)',
      }}
    >
      {TABS.map((t) => {
        const active = current === t.mode
        return (
          <button
            key={t.mode}
            onClick={() => navigate(`/create?mode=${t.mode}`)}
            data-active={active}
            style={{
              padding: '6px 16px',
              borderRadius: 14,
              fontSize: 12,
              fontFamily: 'Noto Serif SC, serif',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              background: active ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.02)',
              color: active ? '#F2D58A' : '#7A7060',
              border: active
                ? '1px solid rgba(212,175,106,0.3)'
                : '1px solid rgba(255,255,255,0.04)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontWeight: 600 }}>{t.cn}</span>
            <span
              style={{
                fontSize: 9,
                marginLeft: 6,
                letterSpacing: '0.3em',
                opacity: 0.7,
              }}
            >
              {t.en}
            </span>
          </button>
        )
      })}
    </div>
  )
}
