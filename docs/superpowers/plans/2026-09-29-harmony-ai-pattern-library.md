# 鸿蒙 AI 纹样库保留 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留鸿蒙 HAP 的 AI 纹样库入口、离线资源和可恢复的加载状态。

**Architecture:** `prepare_harmony_assets.py` 将 `relic/ai` 复制进轻量 HAP 资源目录，同时排除 314.8 MB 的 `patterns/ai`。React 页面显式管理 loading/error/ready 三态；首页 3D 模型按鸿蒙内置与云端资源分流。

**Tech Stack:** React 19、Vite 8、Python 打包脚本、HarmonyOS ArkWeb rawfile。

---

### Task 1: 保留 AI 纹样库素材

**Files:**
- Modify: `wenmai-harmony/prepare_harmony_assets.py`

- [x] 移除对子目录名 `ai` 的通配排除，仅保留顶层 `patterns/ai` 排除。
- [x] 运行 `npm run build`、`build_relic_pack.py` 和 `prepare_harmony_assets.py`。
- [x] 验证 `dist_harmony/relic/ai/manifest.json` 存在且 `dist_harmony/patterns/ai` 不存在。

### Task 2: 显式加载失败状态

**Files:**
- Modify: `src/pages/AiPatternsPage.jsx`

- [x] 为清单请求加入 HTTP 状态、内容校验、loading/error 三态和重试按钮。
- [x] 对空卡片清单按失败处理，避免统计区域显示零件零图。
- [x] 运行 lint、单测和生产构建。

### Task 3: 修复鸿蒙首页五鼎资源分流

**Files:**
- Modify: `src/components/common/HomeHero3D.jsx`

- [x] 在鸿蒙虚拟 origin 中让 `ding_shang` 使用 rawfile，其余四鼎使用 `https://wenmai.ruoziqing.cn`。
- [x] 保持本地开发路径和现有页面行为。
- [x] 打包 HAP，并检查 rawfile 和构建日志。
