# 纹脉核心路径完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让首页成为稳定入口，并打通识纹、学习、创作与分享的连续路径。

**Architecture:** 保留现有 hash 路由和 BottomNav，用小型 React 组件补齐入口与下一步行动；复用既有图鉴、纹样、创作、广场路由，不引入依赖或改动持久化结构。

**Tech Stack:** React 19、Vite、Framer Motion、现有自写 hash 路由、Vitest。

---

## File structure

- Modify: `src/components/common/BottomNav.jsx` — 提供稳定首页入口。
- Modify: `src/pages/Home.jsx` — 在 3D 舞台后提供明确的首要任务。
- Modify: `src/components/common/HomeHero3D.jsx` — 3D 加载中可立即进入识纹。
- Modify: `src/pages/PhotoMatchPage.jsx` — 每种识别结果都有下一步。
- Modify: `src/pages/Library.jsx` — 显示收集进度与目标。
- Modify: `src/pages/PuzzlePage.jsx` — 说明首次创作选择。
- Modify: `src/pages/GalleryPage.jsx` — 从浏览回到创作。

### Task 1: 首页导航与首要任务

**Files:**
- Modify: `src/components/common/BottomNav.jsx`
- Modify: `src/pages/Home.jsx`

- [ ] 将“立体”Tab 改为指向 `/home` 的“首页”；器物 3D 继续保留在首页鼎舞台与详情入口。
- [ ] 在鼎舞台下加入“从这里开始”面板，提供“拍照识纹”→`/photo-match`、“浏览图鉴”→`/library`、“开始创作”→`/puzzle`。
- [ ] 每日卡与故事旅程保持在面板后，兼顾首次使用与回访。
- [ ] 在 `#/home` 验证首页选中态及三项跳转。

### Task 2: 可预期的 3D 入场

**Files:**
- Modify: `src/components/common/HomeHero3D.jsx`

- [ ] 在点云和加载阶段显示“先去识纹”，调用 `navigate('/photo-match')`。
- [ ] 保留首尊优先加载和下一尊预载，不在浏览器端新增同步压缩工作。
- [ ] 清缓存访问 `#/home`，在 GLB 完成前验证跳转。

### Task 3: 识纹结果闭环

**Files:**
- Modify: `src/pages/PhotoMatchPage.jsx`

- [ ] 匹配结果提供“查看纹样”“用它创作”“重新拍摄”。
- [ ] 未收录或无纹样结果提供“看看相近纹样”“重新裁切”“开始自由创作”。
- [ ] 保持 VLM 优先和 pHash 兜底逻辑不变。
- [ ] 用现有示例图片走精确、兜底和无结果分支。

### Task 4: 收集与创作引导

**Files:**
- Modify: `src/pages/Library.jsx`
- Modify: `src/pages/PuzzlePage.jsx`

- [ ] 图鉴网格前显示已收集数量、总数与完成度最低的系列。
- [ ] 增加“继续收集”→`/gacha`。
- [ ] 拼图页无 fork 时显示“自由拼”和“经典拼图”的首用引导。
- [ ] 验证空图鉴、已有收藏以及两个创作入口。

### Task 5: 广场回流创作

**Files:**
- Modify: `src/pages/GalleryPage.jsx`

- [ ] 广场头部增加“用纹样创作”→`/puzzle`。
- [ ] 保持现有作品详情、发布和审核逻辑。
- [ ] 在 `#/gallery` 验证首屏同时有浏览与创作路径。

### Task 6: 验证与鸿蒙资源准备

- [ ] 运行 `npm run test -- --run`、`npm run build`。
- [ ] 浏览器走查 `#/home`、`#/photo-match`、`#/library`、`#/puzzle`、`#/gallery`。
- [ ] 构建后运行 Harmony 三个资源脚本：`prepare_harmony_assets.py`、`build_relic_pack.py`、`inject_wenmai.py`。
- [ ] 按功能提交，生成资源不提交。
