# 纹脉页面收束与性能优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收紧首页信息密度，使器物舞台承载知识入口，降低空创作页的决策压力，并减少移动端持续渲染负担。

**Architecture:** 在现有页面组件内做状态收束；不改变路由、数据模型或后端接口。所有新入口复用已存在的 `/relic`、`/puzzle` 和 `/gallery` 路径。

**Tech Stack:** React 19、Framer Motion、Canvas 2D、现有 hash 路由。

---

### Task 1: 收束首页探索内容

**Files:**
- Modify: `src/pages/Home.jsx`

- [ ] 保留鼎、三主入口、每日卡和故事旅程。
- [ ] 将次要工具与系列轮播放进默认折叠的“探索更多”区；用户点击后展开。
- [ ] 验证首页首屏不再被长轮播占据。

### Task 2: 为首页器物增加知识入口

**Files:**
- Modify: `src/components/common/HomeHero3D.jsx`

- [ ] 点击鼎时显示轻量说明面板，包含器名、年代、手势提示和“查看器物详览”。
- [ ] 查看详览跳转 `/relic`；不伪造不存在的音频功能。
- [ ] 验证点击器物、关闭面板和跳转。

### Task 3: 精简空画布操作

**Files:**
- Modify: `src/pages/PuzzlePage.jsx`

- [ ] 没有任何 placement 时只显示模板、完成创作和发布以外的低干扰入口；把保存、导出、清空和发布放在已有内容后。
- [ ] 保留 fork 与已有创作的完整工具栏。
- [ ] 验证空画布与已有内容两种状态。

### Task 4: 降低背景渲染成本

**Files:**
- Modify: `src/components/common/GoldBackground.jsx`

- [ ] Canvas DPR 上限设为 1.5。
- [ ] `prefers-reduced-motion` 启用时不启动动画循环，只绘制静态背景。
- [ ] 窗口尺寸变化后重算画布尺寸。

### Task 5: 移除未接通的社区数字

**Files:**
- Modify: `src/pages/GalleryPage.jsx`

- [ ] 只显示当前已加载的作品数量；移除硬编码创作者与复用次数。
- [ ] 保留“用纹样创作”入口。

### Task 6: 验证与 Harmony 资源更新

- [ ] 运行 `npm run test -- --run`、`npm run build`。
- [ ] 浏览器走查首页、创作页、广场。
- [ ] 执行 Harmony 资源准备与注入脚本。
