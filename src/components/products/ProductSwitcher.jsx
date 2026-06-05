const PRODUCTS = [
  { id: 'mug', label: '杯子' },
  { id: 'case', label: '手机壳' },
  { id: 'plate', label: '圆盘' },
  { id: 'scarf', label: '丝巾' },
]

export default function ProductSwitcher({ active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: '8px', padding: '8px 16px',
      borderTop: '1px solid var(--border-gold)',
      borderBottom: '1px solid var(--border-gold)',
      background: 'rgba(15,15,16,0.9)',
    }}>
      {PRODUCTS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: `1px solid ${active === p.id ? 'var(--gold-main)' : 'var(--border-gold)'}`,
            background: active === p.id ? 'rgba(212,175,106,0.15)' : 'transparent',
            color: active === p.id ? 'var(--gold-main)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: active === p.id ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}