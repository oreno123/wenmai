# 3D 商品纹样预览 — 设计文档

## 概述

将编辑器生成的对称纹样实时贴到 3D 商品模型上预览。合并 Editor 和 Preview3D 为上下分屏单页，支持四种商品切换。

## 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 商品范围 | 马克杯、手机壳、圆盘、丝巾 | 覆盖环绕/居中/平铺三种纹样用法 |
| 纹样控制 | 实时同步编辑器 | 所见即所得，体验最好 |
| 页面布局 | 上下分屏 | 编辑器和 3D 同时可见 |
| 模型方案 | 程序化几何体先行，GLB 后补 | 不阻塞开发，替换成本低 |

## 页面结构

路由：`/editor`（删除 `/preview3d`）

```
┌─────────────────────────────┐
│ 标题栏: 创作   [积分: 1000] │
├─────────────────────────────┤
│                             │
│   512x512 Canvas 画布       │  编辑器区（~40% 高度）
│   + 对称模式选择            │
│   + 纹样选择                │
│                             │
├─────────────────────────────┤
│ [杯子] [手机壳] [圆盘] [丝巾]│  商品切换 Tab
├─────────────────────────────┤
│                             │
│   Three.js 3D 场景          │  3D 预览区（~50% 高度）
│   可旋转/缩放               │
│                             │
└─────────────────────────────┘
```

## 组件结构

```
src/pages/Editor.jsx              ← 重写：上下分屏
src/components/products/          ← 新目录
  ├── ProductScene.jsx            ← Three.js Canvas + 灯光 + OrbitControls
  ├── Mug.jsx                     ← 杯子（程序化几何体，后续替换 GLB）
  ├── PhoneCase.jsx               ← 手机壳
  ├── Plate.jsx                   ← 圆盘
  ├── Scarf.jsx                   ← 丝巾
  └── ProductSwitcher.jsx         ← 四商品切换 Tab
```

## 组件接口

所有商品组件统一接口：

```jsx
<Mug texture={canvasElement} />
```

- `texture`：Canvas DOM 元素（非 dataURL）
- 组件内部创建 `THREE.CanvasTexture` 并管理贴图参数
- GLB 替换时只改几何体来源，接口不变

## 纹理传递机制

```
用户操作（选纹样 / 换对称模式）
  → useEffect 触发 Canvas 重绘
  → canvasRef.current 传入 ProductScene
  → ProductScene 内 CanvasTexture.needsUpdate = true
  → 下一帧 3D 模型纹样同步更新
```

贴图参数：

| 商品 | texture repeat | 说明 |
|------|---------------|------|
| 马克杯 | repeat.x=2, wrapS=Repeat | 纹样绕杯身一圈 |
| 手机壳 | repeat(1,1) | 纹样居中铺满背面 |
| 圆盘 | repeat(1,1) | 圆柱顶面贴图 |
| 丝巾 | repeat(2,2) | 四方连续感 |

## 状态管理

Editor 内部 state：

- `selectedPattern`：当前选中的纹样 id
- `symmetryMode`：对称模式
- `activeProduct`：当前商品（mug / case / plate / scarf）
- `canvasRef`：Canvas DOM 引用

gameStore 不修改。

## 用户操作流

```
首页 → 点「创作」→ Editor（上下分屏）
  → 选纹样 / 换对称模式 → 上方 Canvas 自动刷新
  → 下方 3D 实时同步
  → 切 Tab 换商品
  → 拖拽旋转 3D 模型
```

## 文件变更

| 操作 | 文件 |
|------|------|
| 重写 | `src/pages/Editor.jsx` |
| 删除 | `src/pages/Preview3D.jsx` |
| 新建 | `src/components/products/ProductScene.jsx` |
| 新建 | `src/components/products/Mug.jsx` |
| 新建 | `src/components/products/PhoneCase.jsx` |
| 新建 | `src/components/products/Plate.jsx` |
| 新建 | `src/components/products/Scarf.jsx` |
| 新建 | `src/components/products/ProductSwitcher.jsx` |
| 修改 | `src/App.jsx`（移除 /preview3d 路由） |
| 修改 | `src/components/common/BottomNav.jsx`（如有引用 Preview3D 则改指向） |

## GLB 升级路径

找到模型后，每个商品组件只需改几何体部分：

```jsx
// 之前：程序化
const geometry = new THREE.CylinderGeometry(...)

// 之后：GLB
const { scene } = useGLTF('/models/mug.glb')
```

接口（`texture` prop）、贴图逻辑、商品切换逻辑全部不动。
