import { useState, useEffect } from 'react'
import ELEMENT_MANIFEST from '../../public/elements/manifest.json'
import APPROVED_DEFAULT from '../../public/elements/approved.json'

const STORAGE_KEY = 'wenmai_approved_elements'

const SOURCE_NAMES = {
  tuanlong: '团龙', yunlei: '云雷', huiwen: '回纹',
  lianhua: '莲花', juanco2: '卷草',
}

export default function CuratePage() {
  const [approved, setApproved] = useState(new Set())
  const [sourceFilter, setSourceFilter] = useState('all')
  const [loadedImages, setLoadedImages] = useState({})

  // Load approved set from localStorage or default file
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setApproved(new Set(JSON.parse(saved)))
      } catch {
        setApproved(new Set(APPROVED_DEFAULT))
      }
    } else {
      setApproved(new Set(APPROVED_DEFAULT))
    }

    // Preload images
    ELEMENT_MANIFEST.elements.forEach(el => {
      const img = new Image()
      img.src = `/elements/${el.file}`
      img.onload = () => setLoadedImages(prev => ({ ...prev, [el.id]: true }))
    })
  }, [])

  function save(list) {
    setApproved(list)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list]))
  }

  const toggle = (id) => {
    const next = new Set(approved)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    save(next)
  }

  const approveAll = () => save(new Set(ELEMENT_MANIFEST.elements.map(e => e.id)))
  const clearAll = () => save(new Set())

  const exportJSON = () => {
    const json = JSON.stringify([...approved].sort(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'approved.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const [saveStatus, setSaveStatus] = useState('')

  const saveToProject = async () => {
    try {
      const json = JSON.stringify([...approved].sort(), null, 2)
      const res = await fetch('/__write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: 'public/elements/approved.json', data: json }),
      })
      setSaveStatus(res.ok ? '已保存到项目!' : '保存失败: ' + res.status)
    } catch (e) {
      setSaveStatus('保存失败: ' + e.message)
    }
    setTimeout(() => setSaveStatus(''), 2000)
  }

  const filtered = sourceFilter === 'all'
    ? ELEMENT_MANIFEST.elements
    : ELEMENT_MANIFEST.elements.filter(e => e.source === sourceFilter)

  const approvedCount = ELEMENT_MANIFEST.elements.filter(e => approved.has(e.id)).length
  const totalCount = ELEMENT_MANIFEST.elements.length

  return (
    <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>元素筛选</span>
        <span style={{ fontSize: 12, color: '#6A6A6A', marginLeft: 8 }}>
          {approvedCount}/{totalCount} 已通过
        </span>
      </div>

      {/* Progress */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(approvedCount / totalCount) * 100}%`,
            background: 'linear-gradient(90deg, #8B6914, #F2D58A)', borderRadius: 2, transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={approveAll} style={btnStyle}>全部通过</button>
        <button onClick={clearAll} style={btnStyle}>全部拒绝</button>
        <button onClick={saveToProject} style={{ ...btnStyle, background: 'linear-gradient(145deg, #BC6B2F, #8A4A20)', color: '#F5F1E8' }}>
          保存到项目
        </button>
        {saveStatus && <span style={{ fontSize: 12, color: '#81C784' }}>{saveStatus}</span>}
      </div>

      {/* Source filter */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 16px 10px', overflowX: 'auto' }}>
        <button onClick={() => setSourceFilter('all')} style={pillStyle(sourceFilter === 'all')}>全部</button>
        {ELEMENT_MANIFEST.sources.map(s => (
          <button key={s} onClick={() => setSourceFilter(s)} style={pillStyle(sourceFilter === s)}>
            {SOURCE_NAMES[s] || s}
          </button>
        ))}
      </div>

      {/* Element grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10, padding: '0 16px',
      }}>
        {filtered.map(el => {
          const isApproved = approved.has(el.id)
          return (
            <div
              key={el.id}
              onClick={() => toggle(el.id)}
              style={{
                background: isApproved ? 'rgba(76,175,80,0.08)' : 'rgba(255,255,255,0.02)',
                border: isApproved
                  ? '1px solid rgba(76,175,80,0.35)'
                  : '1px solid rgba(255,255,255,0.05)',
                borderRadius: 10, padding: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                opacity: isApproved ? 1 : 0.5,
                transition: 'all 0.2s',
              }}
            >
              {/* Status badge */}
              <div style={{
                alignSelf: 'flex-end', fontSize: 10, padding: '1px 6px',
                borderRadius: 4, fontWeight: 600,
                background: isApproved ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)',
                color: isApproved ? '#81C784' : '#6A6A6A',
              }}>
                {isApproved ? '✓' : '✗'}
              </div>

              <div style={{
                width: 72, height: 72,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.02)', borderRadius: 6,
              }}>
                <img
                  src={`/elements/${el.file}`}
                  alt={el.id}
                  style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                  loading="lazy"
                  draggable={false}
                />
              </div>

              <span style={{ fontSize: 9, color: '#9A9A9A', textAlign: 'center', lineHeight: 1.2 }}>
                {SOURCE_NAMES[el.source] || el.source}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function pillStyle(active) {
  return {
    padding: '4px 12px', borderRadius: 12, fontSize: 11, whiteSpace: 'nowrap',
    background: active ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#F2D58A' : '#6A6A6A',
    border: active ? '1px solid rgba(212,175,106,0.2)' : '1px solid transparent',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

const btnStyle = {
  padding: '5px 14px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.04)',
  color: '#D4AF6A', border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer', fontFamily: 'inherit',
}
