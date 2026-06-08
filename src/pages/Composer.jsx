import { useState, useRef, useCallback, useEffect } from 'react'
import { COMPONENT_LIBRARY, drawComponentOnCanvas, getComponentSVG } from '../engine/componentLibrary'
import { useApp } from '../store/AppState'
import ELEMENT_MANIFEST from '../../public/elements/manifest.json'
import { createOutlinedBlock } from '../utils/blockOutline'

const CANVAS_SIZE = 1024
const DISPLAY_SIZE = 380
const SCALE = DISPLAY_SIZE / CANVAS_SIZE
const CX = CANVAS_SIZE / 2
const CY = CANVAS_SIZE / 2

const SYMMETRY_MODES = [
  { id: 2, label: '二分', desc: '左右对称' },
  { id: 4, label: '四分', desc: '四方对称' },
  { id: 8, label: '八分', desc: '八角对称' },
]

const COLORS = ['#C9A84C', '#8B6914', '#F2D58A', '#FFFFFF', '#E8D5B7', '#5C3D1A']

const PANEL_TABS = [
  { id: 'math', label: '几何组件' },
  { id: 'real', label: '纹样碎片' },
]

const SOURCE_NAMES = {
  tuanlong: '团龙', yunlei: '云雷', huiwen: '回纹',
  lianhua: '莲花', juanco2: '卷草',
}

export default function Composer() {
  const canvasRef = useRef(null)
  const { saveCreation } = useApp()
  const [saved, setSaved] = useState(false)
  const [folds, setFolds] = useState(4)
  const [placements, setPlacements] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [dragging, setDragging] = useState(null)
  const [dragFromPanel, setDragFromPanel] = useState(null)
  const [strokeColor, setStrokeColor] = useState('#C9A84C')
  const [filter, setFilter] = useState('all')
  const [centerComp, setCenterComp] = useState(null)
  const [panelTab, setPanelTab] = useState('math')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [loadedImages, setLoadedImages] = useState({})
  const [outlinedBlocks, setOutlinedBlocks] = useState({})

  const filtered = (filter === 'all'
    ? COMPONENT_LIBRARY
    : COMPONENT_LIBRARY.filter(c => c.type === filter)
  ).filter(c => c.type !== 'corner')

  const realElements = sourceFilter === 'all'
    ? ELEMENT_MANIFEST.elements
    : ELEMENT_MANIFEST.elements.filter(e => e.source === sourceFilter)

  const sliceAngle = (Math.PI * 2) / folds

  // 预加载元素图片 + 预渲染轮廓块
  useEffect(() => {
    realElements.forEach(el => {
      if (loadedImages[el.id]) return
      const img = new Image()
      img.src = `/elements/${el.file}`
      img.onload = () => {
        setLoadedImages(prev => ({ ...prev, [el.id]: img }))
        const block = createOutlinedBlock(img)
        setOutlinedBlocks(prev => ({ ...prev, [el.id]: block }))
      }
    })
  }, [realElements])

  // ── 绘制 ──────────────────────────────────────────

  const drawElementOnCanvas = useCallback((ctx, elementId, x, y, size, rotation = 0) => {
    const block = outlinedBlocks[elementId] || loadedImages[elementId]
    if (!block) return
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation * Math.PI / 180)
    ctx.drawImage(block, -size / 2, -size / 2, size, size)
    ctx.restore()
  }, [loadedImages, outlinedBlocks])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#0A0A0B'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // 参考圆
    ctx.beginPath()
    ctx.arc(CX, CY, CANVAS_SIZE * 0.42, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    ctx.stroke()

    // 对称分割线
    for (let i = 0; i < folds; i++) {
      const a = sliceAngle * i - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(CX, CY)
      ctx.lineTo(CX + Math.cos(a) * CANVAS_SIZE * 0.5, CY + Math.sin(a) * CANVAS_SIZE * 0.5)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // 编辑扇区高亮
    ctx.beginPath()
    ctx.moveTo(CX, CY)
    ctx.arc(CX, CY, CANVAS_SIZE * 0.42, -Math.PI / 2, -Math.PI / 2 + sliceAngle)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.stroke()

    // 中心件
    if (centerComp) {
      drawComponentOnCanvas(ctx, centerComp.component, CX, CY, centerComp.size, 0, centerComp.color || strokeColor)
    }

    // 所有 placement
    placements.forEach((p, idx) => {
      const isSelected = idx === selectedIdx

      for (let f = 0; f < folds; f++) {
        const angle = sliceAngle * f
        const mirror = f % 2 === 1

        ctx.save()
        ctx.translate(CX, CY)
        ctx.rotate(angle)
        if (mirror) ctx.scale(1, -1)

        const rx = p.x - CX
        const ry = p.y - CY

        if (p.elementId) {
          // 真实元素（位图）
          drawElementOnCanvas(ctx, p.elementId, rx, ry, p.size, p.rotation)
        } else if (p.component) {
          // 数学组件（SVG）
          const color = isSelected ? '#F2D58A' : (p.color || strokeColor)
          drawComponentOnCanvas(ctx, p.component, rx, ry, p.size, p.rotation, color)
        }
        ctx.restore()
      }

      if (isSelected) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation * Math.PI / 180)
        const s = p.size * 0.5
        ctx.strokeStyle = 'rgba(242,213,138,0.4)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.strokeRect(-s / 2, -s / 2, s, s)
        ctx.setLineDash([])
        ctx.restore()
      }
    })

  }, [placements, selectedIdx, strokeColor, folds, centerComp, drawElementOnCanvas])

  useEffect(() => { redraw() }, [redraw])

  // ── 坐标转换 ──────────────────────────────────────

  function canvasCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / SCALE, y: (e.clientY - rect.top) / SCALE }
  }

  function inEditSlice(x, y) {
    const dx = x - CX, dy = y - CY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 15 || dist > CANVAS_SIZE * 0.45) return false
    let angle = Math.atan2(dy, dx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2
    return angle < sliceAngle
  }

  // ── 面板拖入 ──────────────────────────────────────

  const handlePanelPointerDown = useCallback((e, component) => {
    e.preventDefault()
    setDragFromPanel({ component })
  }, [])

  const handleElementPointerDown = useCallback((e, element) => {
    e.preventDefault()
    setDragFromPanel({ element })
  }, [])

  // ── 画布指针事件 ──────────────────────────────────

  const handleCanvasPointerDown = useCallback((e) => {
    const pos = canvasCoords(e)

    if (centerComp) {
      const dx = pos.x - CX, dy = pos.y - CY
      if (Math.sqrt(dx * dx + dy * dy) < centerComp.size * 0.4) {
        setSelectedIdx(-2)
        setDragging({ idx: -2, offsetX: dx, offsetY: dy })
        return
      }
    }

    let hitIdx = -1
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i]
      const dx = pos.x - p.x, dy = pos.y - p.y
      if (Math.sqrt(dx * dx + dy * dy) < p.size * 0.4) {
        hitIdx = i
        break
      }
    }

    if (hitIdx >= 0) {
      setSelectedIdx(hitIdx)
      setDragging({ idx: hitIdx, offsetX: pos.x - placements[hitIdx].x, offsetY: pos.y - placements[hitIdx].y })
    } else {
      setSelectedIdx(-1)
    }
  }, [placements, centerComp])

  const handleCanvasPointerMove = useCallback((e) => {
    if (!dragging) return
    const pos = canvasCoords(e)
    const newX = pos.x - dragging.offsetX
    const newY = pos.y - dragging.offsetY

    if (dragging.idx === -2) return

    setPlacements(prev => {
      const next = [...prev]
      next[dragging.idx] = { ...next[dragging.idx], x: newX, y: newY }
      return next
    })
  }, [dragging])

  const handleCanvasPointerUp = useCallback(() => {
    setDragging(null)
  }, [])

  // 全局拖拽（从面板拖入画布）
  useEffect(() => {
    if (!dragFromPanel) return
    const onMove = (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const isOver = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom

      if (isOver) {
        const pos = { x: (e.clientX - rect.left) / SCALE, y: (e.clientY - rect.top) / SCALE }

        if (dragFromPanel.component) {
          const comp = dragFromPanel.component
          const defaultSize = comp.type === 'center' ? CANVAS_SIZE * 0.28 : CANVAS_SIZE * 0.15

          if (comp.type === 'center') {
            setCenterComp({ component: comp, size: defaultSize, color: strokeColor })
          } else {
            let px = pos.x, py = pos.y
            if (!inEditSlice(px, py)) {
              const dx = px - CX, dy = py - CY
              const dist = Math.sqrt(dx * dx + dy * dy)
              const midAngle = -Math.PI / 2 + sliceAngle / 2
              px = CX + Math.cos(midAngle) * Math.min(dist, CANVAS_SIZE * 0.3)
              py = CY + Math.sin(midAngle) * Math.min(dist, CANVAS_SIZE * 0.3)
            }
            setPlacements(prev => {
              const withoutTemp = prev.filter(p => !p._temp)
              return [...withoutTemp, { component: comp, x: px, y: py, size: defaultSize, rotation: 0, color: strokeColor, _temp: true }]
            })
          }
        } else if (dragFromPanel.element) {
          const el = dragFromPanel.element
          const defaultSize = CANVAS_SIZE * 0.15
          let px = pos.x, py = pos.y
          if (!inEditSlice(px, py)) {
            const dx = px - CX, dy = py - CY
            const dist = Math.sqrt(dx * dx + dy * dy)
            const midAngle = -Math.PI / 2 + sliceAngle / 2
            px = CX + Math.cos(midAngle) * Math.min(dist, CANVAS_SIZE * 0.3)
            py = CY + Math.sin(midAngle) * Math.min(dist, CANVAS_SIZE * 0.3)
          }
          setPlacements(prev => {
            const withoutTemp = prev.filter(p => !p._temp)
            return [...withoutTemp, { elementId: el.id, x: px, y: py, size: defaultSize, rotation: 0, _temp: true }]
          })
        }
      }
    }
    const onUp = () => {
      setPlacements(prev => prev.map(p => { const { _temp, ...rest } = p; return rest }))
      setDragFromPanel(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragFromPanel, strokeColor, folds])

  // ── 操作 ──────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (selectedIdx === -2) { setCenterComp(null); setSelectedIdx(-1); return }
    if (selectedIdx < 0) return
    setPlacements(prev => prev.filter((_, i) => i !== selectedIdx))
    setSelectedIdx(-1)
  }, [selectedIdx])

  const rotateSelected = useCallback((deg) => {
    if (selectedIdx < 0) return
    setPlacements(prev => {
      const next = [...prev]
      next[selectedIdx] = { ...next[selectedIdx], rotation: (next[selectedIdx].rotation + deg) % 360 }
      return next
    })
  }, [selectedIdx])

  const scaleSelected = useCallback((delta) => {
    if (selectedIdx === -2) {
      setCenterComp(prev => ({ ...prev, size: Math.max(40, prev.size + delta) }))
      return
    }
    if (selectedIdx < 0) return
    setPlacements(prev => {
      const next = [...prev]
      next[selectedIdx] = { ...next[selectedIdx], size: Math.max(30, next[selectedIdx].size + delta) }
      return next
    })
  }, [selectedIdx])

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `wenmai-compose-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const clearCanvas = useCallback(() => {
    setPlacements([])
    setCenterComp(null)
    setSelectedIdx(-1)
  }, [])

  const saveToLibrary = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    saveCreation(canvas.toDataURL('image/jpeg', 0.7), 'composer')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [saveCreation])

  // ── 渲染 ──────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 80px 0', minHeight: '100vh' }}>
      {/* 标题 */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>纹样工坊</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveToLibrary} style={{
            ...btnStyle,
            background: saved ? 'rgba(100,180,100,0.15)' : 'rgba(212,175,106,0.12)',
            color: saved ? '#6B6' : '#D4AF6A',
          }}>{saved ? '已保存' : '保存'}</button>
          <button onClick={exportPNG} style={{ ...btnStyle, background: 'linear-gradient(145deg, #BC6B2F, #8A4A20)' }}>导出</button>
        </div>
      </div>

      {/* 对称模式选择 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 16px 8px' }}>
        {SYMMETRY_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setFolds(m.id)}
            style={{
              padding: '6px 16px', borderRadius: 10, fontSize: 13,
              background: folds === m.id ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.04)',
              color: folds === m.id ? '#F2D58A' : '#6A6A6A',
              border: folds === m.id ? '1px solid rgba(212,175,106,0.3)' : '1px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {m.label}
            <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.5 }}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* 画布 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{
          width: DISPLAY_SIZE, height: DISPLAY_SIZE,
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, display: 'block', touchAction: 'none' }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          />
        </div>
      </div>

      {/* 操作栏 */}
      {selectedIdx >= -1 && selectedIdx !== -1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '10px 16px' }}>
          <button onClick={() => rotateSelected(-15)} style={btnStyle}>↺</button>
          <button onClick={() => rotateSelected(15)} style={btnStyle}>↻</button>
          <button onClick={() => scaleSelected(-15)} style={btnStyle}>−</button>
          <button onClick={() => scaleSelected(15)} style={btnStyle}>+</button>
          <button onClick={deleteSelected} style={{ ...btnStyle, color: '#E85D5D' }}>删</button>
        </div>
      )}

      {/* 颜色 + 清空 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '6px 16px', alignItems: 'center' }}>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setStrokeColor(c)}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: c, border: strokeColor === c ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          />
        ))}
        <button onClick={clearCanvas} style={{ ...btnStyle, marginLeft: 8, fontSize: 11 }}>清空</button>
      </div>

      {/* 素材面板 Tab */}
      <div style={{
        display: 'flex', gap: 0, padding: '8px 16px 4px',
        background: 'rgba(255,255,255,0.02)', borderRadius: '10px 10px 0 0', margin: '4px 16px 0',
      }}>
        {PANEL_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setPanelTab(t.id)}
            style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: 8,
              background: panelTab === t.id ? 'rgba(212,175,106,0.12)' : 'transparent',
              color: panelTab === t.id ? '#F2D58A' : '#6A6A6A',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 数学组件面板 */}
      {panelTab === 'math' && (
        <>
          <div style={{ display: 'flex', gap: 6, padding: '6px 16px', overflowX: 'auto' }}>
            {['all', 'center', 'border', 'corner'].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '4px 12px', borderRadius: 12, fontSize: 12,
                  background: filter === t ? 'rgba(212,175,106,0.15)' : 'rgba(255,255,255,0.03)',
                  color: filter === t ? '#F2D58A' : '#6A6A6A',
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}
              >
                {{ all: '全部', center: '中心', border: '边饰', corner: '角花' }[t]}
              </button>
            ))}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
            gap: 8, padding: '0 16px', maxHeight: '32vh', overflowY: 'auto',
          }}>
            {filtered.map(comp => (
              <div
                key={comp.id}
                onPointerDown={(e) => handlePanelPointerDown(e, comp)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 8, padding: 6, cursor: 'grab',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  touchAction: 'none',
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: getComponentSVG(comp, '#C9A84C', 1.5) }}
                  style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
                <span style={{ fontSize: 9, color: '#6A6A6A', textAlign: 'center', lineHeight: 1.2 }}>{comp.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 真实元素面板 */}
      {panelTab === 'real' && (
        <>
          <div style={{ display: 'flex', gap: 6, padding: '6px 16px', overflowX: 'auto' }}>
            <button
              onClick={() => setSourceFilter('all')}
              style={pillStyle(sourceFilter === 'all')}
            >全部</button>
            {ELEMENT_MANIFEST.sources.map(s => (
              <button key={s} onClick={() => setSourceFilter(s)} style={pillStyle(sourceFilter === s)}>
                {SOURCE_NAMES[s] || s}
              </button>
            ))}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
            gap: 8, padding: '0 16px', maxHeight: '32vh', overflowY: 'auto',
          }}>
            {realElements.map(el => (
              <div
                key={el.id}
                onPointerDown={(e) => handleElementPointerDown(e, el)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 8, padding: 6, cursor: 'grab',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  touchAction: 'none',
                }}
              >
                <div style={{
                  width: 52, height: 52,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img
                    src={`/elements/${el.file}`}
                    alt={el.id}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    loading="lazy"
                  />
                </div>
                <span style={{ fontSize: 9, color: '#6A6A6A', textAlign: 'center', lineHeight: 1.2 }}>
                  {SOURCE_NAMES[el.source] || el.source}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function pillStyle(active) {
  return {
    padding: '4px 12px', borderRadius: 12, fontSize: 12, whiteSpace: 'nowrap',
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
