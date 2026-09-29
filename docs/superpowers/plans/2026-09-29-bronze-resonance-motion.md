# 青铜共鸣动效 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为首页大鼎、识纹结果、拼图发布和作品广场建立统一且可降级的青铜共鸣反馈。

**Architecture:** 新建无状态 `ResonanceEffect`，用 CSS 伪元素和少量 DOM 点构成一次性光环与纹样点，不增加网络资源或 Canvas 渲染循环。`HomeHero3D` 在大鼎点按时触发它；识纹精确结果、拼图发布回调和广场入场通过同一组件或全局 CSS 动画复用该语言。全局减少动态媒体查询直接关闭动画。

**Tech Stack:** React 19、Framer Motion、Three.js、CSS `@keyframes`、Vitest、Vite。

---

### Task 1: 建立可复用的共鸣效果

**Files:**
- Create: `src/components/common/ResonanceEffect.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: 新建表现层组件**

```jsx
export default function ResonanceEffect({ active, className = '' }) {
  if (!active) return null
  return (
    <div className={`wm-resonance ${className}`} aria-hidden="true">
      <i className="wm-resonance__ring" />
      <i className="wm-resonance__ring wm-resonance__ring--late" />
      {Array.from({ length: 18 }, (_, index) => <i className="wm-resonance__dot" key={index} />)}
    </div>
  )
}
```

- [ ] **Step 2: 添加一次性光环和粒子样式**

```css
.wm-resonance { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.wm-resonance__ring { position:absolute; left:50%; top:52%; width:88px; height:28px; border:1px solid rgba(227,192,121,.85); border-radius:50%; transform:translate(-50%,-50%); animation:wm-resonance-ring .8s ease-out forwards; }
.wm-resonance__ring--late { animation-delay:.12s; border-color:rgba(103,168,134,.72); }
.wm-resonance__dot { position:absolute; left:50%; top:52%; width:3px; height:3px; border-radius:50%; background:var(--color-gold-bright); animation:wm-resonance-dot .72s ease-out forwards; }
@media (prefers-reduced-motion: reduce) { .wm-resonance *, .wm-enter { animation:none !important; } }
```

在每个点上按 `nth-child` 写入固定角度、距离和延迟；禁止随机数和无限循环。

- [ ] **Step 3: 验证构建**

Run: `npm run build`

Expected: `built in` 且进程退出码为 0。

- [ ] **Step 4: 提交**

```bash
git add src/components/common/ResonanceEffect.jsx src/index.css
git commit -m "feat: add reusable bronze resonance effect"
```

### Task 2: 接入首页大鼎的触碰反馈

**Files:**
- Modify: `src/components/common/HomeHero3D.jsx:1-430`

- [ ] **Step 1: 添加一次性触发状态**

```jsx
const [resonanceKey, setResonanceKey] = useState(0)
const revealArtifactInfo = () => {
  setResonanceKey(key => key + 1)
  setShowArtifactInfo(true)
}
```

将 `Ding` 的 `onTap` 改为 `revealArtifactInfo`，并在 Canvas 之后、器物信息面板之前渲染：

```jsx
{resonanceKey > 0 && <ResonanceEffect key={resonanceKey} active />}
```

- [ ] **Step 2: 为首屏内容添加一次性淡入**

为“从这里开始”容器添加 `wm-enter` 类，在 CSS 中只播放一次 `opacity` 和 `translateY`，不改动按钮路径或布局高度。

- [ ] **Step 3: 浏览器验证**

Run: `npm run dev -- --host 127.0.0.1`

Expected: 点击大鼎后先出现一轮金绿光环和纹样点，再显示既有器物说明；左右切换大鼎与“先去识纹”保持可用。

- [ ] **Step 4: 提交**

```bash
git add src/components/common/HomeHero3D.jsx src/pages/Home.jsx src/index.css
git commit -m "feat: add resonance feedback to home artifact"
```

### Task 3: 接入识纹与拼图完成反馈

**Files:**
- Modify: `src/pages/PhotoMatchPage.jsx:1-640`
- Modify: `src/pages/PuzzlePage.jsx:1-1030`

- [ ] **Step 1: 在精确识纹结果上包裹效果**

在 `matchResult.source === 'exact'` 的结果容器设为 `position: relative`，渲染 `<ResonanceEffect active />` 一次；该效果不遮挡“查看百科”和“用它创作”。模糊、兜底和错误结果不触发。

- [ ] **Step 2: 在发布成功时触发后导航反馈**

将 `onPublished` 改为先设置 `publishedResonance`，展示一次中心聚拢的成功层 420ms，然后关闭发布框并跳转 `/gallery`。关闭层和导航放进 `setTimeout` 的清理函数；组件卸载时清理定时器。

- [ ] **Step 3: 浏览器验证**

Run: `npm run dev -- --host 127.0.0.1`

Expected: 精确识纹可继续查看百科或进入创作；发布后仍跳到广场，动效不阻塞按钮或路由。

- [ ] **Step 4: 提交**

```bash
git add src/pages/PhotoMatchPage.jsx src/pages/PuzzlePage.jsx
git commit -m "feat: add resonance feedback to discovery and publish"
```

### Task 4: 广场入场和回归验证

**Files:**
- Modify: `src/pages/GalleryPage.jsx:1-400`
- Modify: `src/index.css`

- [ ] **Step 1: 添加静态优先的广场入场**

给 `GalleryHero` 仅添加 `wm-enter` 类，使标题、统计与“用纹样创作”按原内容顺序轻微淡入。不要新增数字、图像、请求或循环粒子。

- [ ] **Step 2: 检查减少动态模式**

在浏览器开发工具模拟 `prefers-reduced-motion: reduce`。确认大鼎信息、识纹结果、发布成功和广场入口均可操作，动画关键帧不会持续运行。

- [ ] **Step 3: 跑自动验证**

Run: `npm run test -- --run && npm run build`

Expected: Vitest 全部通过，Vite 构建完成且两个命令退出码均为 0。

- [ ] **Step 4: 提交**

```bash
git add src/pages/GalleryPage.jsx src/index.css
git commit -m "feat: animate gallery entry with bronze resonance"
```
