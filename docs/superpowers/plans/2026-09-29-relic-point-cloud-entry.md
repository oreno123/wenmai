# 器物点云进入试作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用点云扫描显影覆盖默认青铜簋的模型加载空档。

**Architecture:** `RelicPage.tsx` 内新增独立 canvas 覆盖组件，以确定性随机点构造簋的轮廓和腹部密度。`Vessel` 报告 GLB 就绪状态；点云在最短展示时间结束且模型就绪后淡出。

**Tech Stack:** React 19、TypeScript、React Three Fiber、Canvas 2D。

---

### Task 1: 点云显影覆盖层

**Files:**
- Modify: `src/pages/RelicPage.tsx`

- [x] 生成青铜簋轮廓与腹部的金色点云，加入收束、呼吸和扫描线动画。
- [x] 让 `Vessel` 在 GLB 可用时上报就绪状态。
- [x] 仅在默认 `shang_gui` 初次进入时展示，模型就绪后淡出。
- [x] 运行单测和生产构建。
- [ ] 在 `#/relic` 人工查看点云显影与真实模型的衔接。
