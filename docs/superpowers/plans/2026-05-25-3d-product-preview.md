# 3D 商品纹样预览 — 实施方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将编辑器生成的对称纹样实时贴到 3D 商品（马克杯、手机壳、圆盘、丝巾）上预览。

**Architecture:** 合并 Editor + Preview3D 为上下分屏单页。编辑器 Canvas 内容通过 Canvas DOM 元素直传给 Three.js CanvasTexture，每帧 needsUpdate 实现实时同步。四个商品组件接口统一（接收 canvas 元素），GLB 替换时只改几何体。

**Tech Stack:** React 19, Three.js, @react-three/fiber, @react-three/drei

---

## 文件变更清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `src/components/products/ProductSwitcher.jsx` | 四商品切换 Tab |
| 新建 | `src/components/products/Mug.jsx` | 马克杯几何体 + 贴图 |
| 新建 | `src/components/products/PhoneCase.jsx` | 手机壳几何体 + 贴图 |
| 新建 | `src/components/products/Plate.jsx` | 圆盘几何体 + 贴图 |
| 新建 | `src/components/products/Scarf.jsx` | 丝巾几何体 + 贴图 |
| 新建 | `src/components/products/ProductScene.jsx` | Three.js Canvas + 灯光 + OrbitControls + 商品渲染 |
| 重写 | `src/pages/Editor.jsx` | 上下分屏：编辑器 + 3D 预览 |
| 删除 | `src/pages/Preview3D.jsx` | 功能已合并进 Editor |
| 修改 | `src/App.jsx` | 移除 Preview3D 导入和路由 |

---

### Task 1: ProductSwitcher 组件

**Files:**
- Create: `src/components/products/ProductSwitcher.jsx`

- [ ] **Step 1: Create ProductSwitcher.jsx**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/products/ProductSwitcher.jsx
git commit -m "feat: add ProductSwitcher component"
```

---

### Task 2: 四个商品几何体组件

**Files:**
- Create: `src/components/products/Mug.jsx`
- Create: `src/components/products/PhoneCase.jsx`
- Create: `src/components/products/Plate.jsx`
- Create: `src/components/products/Scarf.jsx`

- [ ] **Step 1: Create Mug.jsx**

```jsx
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Mug({ texture }) {
  const canvasTexture = useMemo(() => {
    if (!texture) return null
    const tex = new THREE.CanvasTexture(texture)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.repeat.x = 2
    tex.repeat.y = 1
    return tex
  }, [texture])

  useFrame(() => {
    if (canvasTexture) canvasTexture.needsUpdate = true
  })

  return (
    <group>
      {/* Cup body */}
      <mesh>
        <cylinderGeometry args={[1, 0.9, 2.5, 64, 1, true]} />
        <meshStandardMaterial
          map={canvasTexture}
          side={THREE.DoubleSide}
          metalness={0.3}
          roughness={0.6}
          color={canvasTexture ? '#ffffff' : '#D4AF6A'}
        />
      </mesh>
      {/* Cup bottom */}
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 64]} />
        <meshStandardMaterial color="#1A1A1C" metalness={0.2} roughness={0.8} />
      </mesh>
      {/* Handle */}
      <mesh position={[1.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.45, 0.08, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#D4AF6A" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Create PhoneCase.jsx**

```jsx
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function PhoneCase({ texture }) {
  const canvasTexture = useMemo(() => {
    if (!texture) return null
    const tex = new THREE.CanvasTexture(texture)
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [texture])

  useFrame(() => {
    if (canvasTexture) canvasTexture.needsUpdate = true
  })

  return (
    <group>
      {/* Back panel with pattern */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[1.6, 3.2, 0.1]} />
        <meshStandardMaterial
          map={canvasTexture}
          metalness={0.2}
          roughness={0.7}
          color={canvasTexture ? '#ffffff' : '#D4AF6A'}
        />
      </mesh>
      {/* Camera bump */}
      <mesh position={[-0.4, 1.1, -0.2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
        <meshStandardMaterial color="#2A2A2A" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Camera lens */}
      <mesh position={[-0.4, 1.1, -0.24]}>
        <circleGeometry args={[0.12, 32]} />
        <meshStandardMaterial color="#0A0A0A" metalness={0.8} roughness={0.1} />
      </mesh>
      {/* Side frame */}
      <mesh>
        <boxGeometry args={[1.65, 3.25, 0.2]} />
        <meshStandardMaterial color="#1A1A1C" metalness={0.3} roughness={0.6} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: Create Plate.jsx**

```jsx
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Plate({ texture }) {
  const canvasTexture = useMemo(() => {
    if (!texture) return null
    const tex = new THREE.CanvasTexture(texture)
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [texture])

  useFrame(() => {
    if (canvasTexture) canvasTexture.needsUpdate = true
  })

  return (
    <group rotation={[-0.3, 0, 0]}>
      {/* Plate body */}
      <mesh>
        <cylinderGeometry args={[2, 1.8, 0.2, 64]} />
        <meshStandardMaterial color="#F0EBE0" metalness={0.1} roughness={0.9} />
      </mesh>
      {/* Pattern surface (top) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
        <circleGeometry args={[1.85, 64]} />
        <meshStandardMaterial
          map={canvasTexture}
          metalness={0.15}
          roughness={0.8}
          color={canvasTexture ? '#ffffff' : '#F0EBE0'}
        />
      </mesh>
      {/* Gold rim */}
      <mesh position={[0, 0.08, 0]}>
        <torusGeometry args={[2, 0.05, 8, 64]} />
        <meshStandardMaterial color="#D4AF6A" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 4: Create Scarf.jsx**

```jsx
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Scarf({ texture }) {
  const canvasTexture = useMemo(() => {
    if (!texture) return null
    const tex = new THREE.CanvasTexture(texture)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 2)
    return tex
  }, [texture])

  useFrame(() => {
    if (canvasTexture) canvasTexture.needsUpdate = true
  })

  // Wavy fabric geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3, 3, 32, 32)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      pos.setZ(i, Math.sin(x * 2) * 0.04 + Math.cos(y * 2) * 0.04)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} rotation={[-0.4, 0, 0]}>
      <meshStandardMaterial
        map={canvasTexture}
        side={THREE.DoubleSide}
        metalness={0.0}
        roughness={0.95}
        color={canvasTexture ? '#ffffff' : '#D4AF6A'}
      />
    </mesh>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/products/Mug.jsx src/components/products/PhoneCase.jsx src/components/products/Plate.jsx src/components/products/Scarf.jsx
git commit -m "feat: add product geometry components (mug, phone case, plate, scarf)"
```

---

### Task 3: ProductScene 组件

**Files:**
- Create: `src/components/products/ProductScene.jsx`

- [ ] **Step 1: Create ProductScene.jsx**

```jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Mug from './Mug'
import PhoneCase from './PhoneCase'
import Plate from './Plate'
import Scarf from './Scarf'

const PRODUCT_COMPONENTS = { mug: Mug, case: PhoneCase, plate: Plate, scarf: Scarf }

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight
        position={[5, 5, 5]}
        angle={0.6}
        penumbra={1}
        intensity={1.5}
        color="#F2D58A"
      />
      <spotLight
        position={[-3, 3, -3]}
        angle={0.5}
        penumbra={1}
        intensity={0.8}
        color="#D4AF6A"
      />
    </>
  )
}

export default function ProductScene({ texture, activeProduct }) {
  const ProductComponent = PRODUCT_COMPONENTS[activeProduct] || Mug

  return (
    <Canvas
      camera={{ position: [0, 1, 4], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Lights />
      <ProductComponent texture={texture} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={8}
        autoRotate
        autoRotateSpeed={1}
      />
    </Canvas>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/products/ProductScene.jsx
git commit -m "feat: add ProductScene wrapper with lights and OrbitControls"
```

---

### Task 4: 重写 Editor.jsx

**Files:**
- Rewrite: `src/pages/Editor.jsx`

This is the main integration task. The new Editor combines the canvas editor with 3D preview in a split-screen layout. Key changes from the old Editor:

- Remove `useNavigate` (no longer navigating to Preview3D)
- Remove manual "生成预览" button — auto-generate via `useEffect`
- Add `activeProduct` state for product switching
- Add `textureSource` state to pass canvas DOM element to 3D
- Use callback ref to capture canvas DOM element on mount
- Render ProductSwitcher + ProductScene below the editor controls

BottomNav height is 64px. Editor uses `height: calc(100vh - 64px)` to fill the viewport above the nav.

- [ ] **Step 1: Rewrite Editor.jsx**

```jsx
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useApp } from '../store/AppState'
import { getPatternById } from '../store/patternData'
import { SYMMETRY_MODES, drawSymmetric } from '../engine/symmetry'
import ProductScene from '../components/products/ProductScene'
import ProductSwitcher from '../components/products/ProductSwitcher'

const MODES = Object.values(SYMMETRY_MODES)

export default function Editor() {
  const { data } = useApp()
  const canvasRef = useRef(null)
  const [textureSource, setTextureSource] = useState(null)
  const [selectedPattern, setSelectedPattern] = useState(data.library[0] || null)
  const [symmetryMode, setSymmetryMode] = useState(SYMMETRY_MODES.ROTATE_4)
  const [activeProduct, setActiveProduct] = useState('mug')

  const myPatterns = useMemo(
    () => data.library.map(id => getPatternById(id)).filter(Boolean),
    [data.library]
  )

  // Capture canvas DOM element via callback ref
  const canvasCallbackRef = useCallback((node) => {
    canvasRef.current = node
    if (node) setTextureSource(node)
  }, [])

  // Auto-generate pattern when params change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const pat = myPatterns.find(p => p.id === selectedPattern)

    if (pat?.image) {
      const img = new Image()
      img.onload = () => {
        const drawFn = (ctx, cx, cy, size) => {
          const s = size * 0.3
          ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s)
        }
        drawSymmetric(ctx, drawFn, symmetryMode, canvas.width)
      }
      img.src = pat.image
    } else {
      const drawFn = (ctx, cx, cy, size) => {
        ctx.save()
        ctx.fillStyle = '#D4AF6A'
        ctx.beginPath()
        const r = size * 0.12
        ctx.arc(cx - r * 0.5, cy - r * 0.3, r, 0, Math.PI * 2)
        ctx.arc(cx + r * 0.5, cy - r * 0.3, r, 0, Math.PI * 2)
        ctx.arc(cx, cy + r * 0.2, r * 0.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      drawSymmetric(ctx, drawFn, symmetryMode, canvas.width)
    }
  }, [symmetryMode, selectedPattern, myPatterns])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      overflow: 'hidden',
    }}>
      {/* ── Editor Section (top) ── */}
      <div style={{
        padding: '12px 16px',
        flex: '0 0 auto',
        overflowY: 'auto',
      }}>
        <h1 style={{
          fontSize: '20px', fontWeight: 700,
          color: 'var(--text-primary)', marginBottom: '10px',
        }}>
          创作
        </h1>

        {/* Canvas */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-gold)',
          padding: '8px',
          marginBottom: '10px',
        }}>
          <canvas
            ref={canvasCallbackRef}
            width={512}
            height={512}
            style={{
              width: '100%', maxWidth: '200px',
              height: 'auto', display: 'block', margin: '0 auto',
              borderRadius: '8px', background: '#0F0F10',
            }}
          />
        </div>

        {/* Symmetry mode */}
        <div style={{ marginBottom: '10px' }}>
          <h3 style={{
            fontSize: '12px', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: '4px',
          }}>
            对称模式
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSymmetryMode(mode)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: `1px solid ${symmetryMode.id === mode.id ? 'var(--gold-main)' : 'rgba(255,255,255,0.1)'}`,
                  background: symmetryMode.id === mode.id ? 'rgba(212,175,106,0.15)' : 'var(--bg-secondary)',
                  color: symmetryMode.id === mode.id ? 'var(--gold-main)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {mode.name}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern selector */}
        <div>
          <h3 style={{
            fontSize: '12px', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: '4px',
          }}>
            选择纹样
          </h3>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {myPatterns.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPattern(p.id)}
                style={{
                  minWidth: '48px', height: '48px', borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: `2px solid ${selectedPattern === p.id ? 'var(--gold-main)' : 'transparent'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden',
                }}
              >
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '20px' }}>☯</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product Switcher ── */}
      <ProductSwitcher active={activeProduct} onChange={setActiveProduct} />

      {/* ── 3D Preview Section (bottom) ── */}
      <div style={{
        flex: '1 1 auto',
        minHeight: 0,
        background: '#0F0F10',
      }}>
        <ProductScene texture={textureSource} activeProduct={activeProduct} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and verify**

Run: `cd wenmai && npm run dev`

Expected:
- Navigate to `/editor` (or click 创作 in bottom nav)
- Top section shows canvas + symmetry mode picker + pattern selector
- Canvas auto-generates pattern on load
- ProductSwitcher shows 4 tabs
- Bottom section shows 3D model with canvas texture applied
- Switching symmetry mode redraws canvas AND updates 3D model
- Switching product tab swaps 3D model
- Can drag to rotate, scroll to zoom

- [ ] **Step 3: Commit**

```bash
git add src/pages/Editor.jsx
git commit -m "feat: rewrite Editor as split-screen with live 3D preview"
```

---

### Task 5: 清理旧文件和路由

**Files:**
- Delete: `src/pages/Preview3D.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Delete Preview3D.jsx**

```bash
rm src/pages/Preview3D.jsx
```

- [ ] **Step 2: Update App.jsx — remove Preview3D import and route**

The current App.jsx lines 8-9 import Preview3D and line 16 has the route. Remove all three references. The file becomes:

```jsx
import { RouterProvider, useLocation } from './components/common/Router'
import { AppProvider } from './store/AppState'
import BottomNav from './components/common/BottomNav'
import GoldBackground from './components/common/GoldBackground'
import Home from './pages/Home'
import Library from './pages/Library'
import GachaPage from './pages/GachaPage'
import Editor from './pages/Editor'

function Pages() {
  const { pathname } = useLocation()
  if (pathname === '/library') return <Library />
  if (pathname === '/gacha') return <GachaPage />
  if (pathname === '/editor') return <Editor />
  return <Home />
}

export default function App() {
  return (
    <RouterProvider>
      <AppProvider>
        <GoldBackground />
        <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'transparent', position: 'relative', zIndex: 1 }}>
          <Pages />
          <BottomNav />
        </div>
      </AppProvider>
    </RouterProvider>
  )
}
```

- [ ] **Step 3: Run dev server and verify full flow**

Run: `cd wenmai && npm run dev`

Verify:
- No console errors
- `/preview3d` route falls through to Home (not a crash)
- `/editor` shows the new split-screen layout
- BottomNav still works — all tabs navigate correctly
- Build succeeds: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Preview3D page, update routing"
```

---

## Self-Review Checklist

- [x] Spec coverage: all 4 products, split-screen layout, real-time sync, cleanup — all covered
- [x] No placeholders: every step has complete code
- [x] Type consistency: all product components share identical `{ texture }` prop interface; ProductScene passes it through correctly
- [x] File paths: all paths are relative to `wenmai/` project root
