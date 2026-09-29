# 首页鼎点云入场 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让首页默认鼎以点云扫描显影进入。

**Architecture:** `HomeHero3D.jsx` 新增不依赖 GLB 的 Canvas 2D 点云层；默认鼎的 Three.js group 在点云动画和模型首帧都完成后再显示。

**Tech Stack:** React 19、React Three Fiber、Three.js、Canvas 2D。

---

### Task 1: 首页默认鼎点云入场

**Files:**
- Modify: `src/components/common/HomeHero3D.jsx`

- [x] 绘制鼎形金色点云、收束动画与扫描线。
- [x] 将默认鼎的真实模型显示延后到点云和 GLB 首帧都完成后。
- [x] 保留其他鼎的缩略图过渡、手势和点击操作。
- [x] 运行单测和生产构建。
- [ ] 在 `#/home` 人工查看点云显影与真实鼎的衔接。
