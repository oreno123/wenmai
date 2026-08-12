# 纹脉 v3 重构设计

**日期**：2026-08-12
**作者**：孔子聪 + Claude
**时间盒**：1 个月（2026-08-12 ~ 2026-09-12）
**触发**：NOVA 进决赛、视觉不满意

---

## 1. 目标与范围

### 1.1 目标
- **视觉**：建立"系列驱动皮肤"设计系统，每个纹样系列有自己的视觉语言（底色+装饰+动效）
- **IA**：5 个创作页 → 1 个创作台 + 3 模式；4 主 tab；用户路径清晰
- **架构**：design-system 拆分 + 状态管理统一 + Router 替换 + 全 TS 化 + 目录重划
- **bug**：现有交互问题修

### 1.2 范围
**包含**：
- 全部 18 页的 IA 重排、视觉重做、bug 修
- 设计系统建立（tokens + SeriesSkin + 基础组件库）
- 状态管理 zustand 统一
- React Router 替换手写 hash router
- 全 TS 化
- 目录重划

**不包含**：
- 后端 / Supabase 数据模型变更（除 Gallery 上线所需）
- 大素材重做（203 AI 资产 + 335 青花 + Smithsonian 658 都保留）
- git history filter-repo 瘦身（独立任务，时间盒外）

---

## 2. 信息架构（IA）

### 2.1 路由结构（新）

```
入口
├ /                    Splash 云海列车
├ /auth                沉浸登录
├ /home                首页 4 大入口

4 主 tab（BottomNav）
├ /home                首页（4 大入口：图鉴/创作/抽卡/广场）
├ /library             图鉴
│  ├ ?series=all       全部
│  ├ ?series=qinghua   青花瓷（原 /qinghua 并入）
│  ├ ?series=shanjing  山海经
│  └ /pattern/:id      纹样百科
├ /create              创作台
│  ├ ?mode=free        自由拼贴（原 Puzzle）
│  ├ ?mode=guided      引导（原 Composer 对称 + Jigsaw 拼图模板）
│  └ ?mode=preview     预览（原 Editor 浮雕 + Showcase 碎裂）
├ /gallery             广场
│  ├ 作品列表
│  ├ /work/:id         作品详情
│  └ 发布入口（创作台调用）

抽卡入口（不在主 tab，收起来）
├ /gacha               抽卡（首页入口卡片 + 图鉴页顶部「抽卡获取」按钮 + 创作台右上抽卡 icon）

次要入口（首页「更多」菜单 / 不放主导航）
├ /photo-match         拍照识别
├ /admin               审核（仅管理员可见）
├ /tools/curate        元素审核内部工具（原 /curate 移入）

移除/合并
├ /splash → /          一个路由
├ /landing → 隐（未登录直接 /auth）
├ /puzzle /jigsaw /composer /editor /showcase
│  → 全部并入 /create?mode=*
└ /curate → /tools/curate
```

### 2.2 创作台 3 模式（用户确认：自由/引导/预览）

| 模式 | 合并自 | 核心交互 |
|---|---|---|
| **自由** | PuzzlePage | 画布 + 纹样 tray + 自由摆放 + 拖拽缩放旋转 |
| **引导** | Composer + Jigsaw | 4 角对称 / 模板填空 / 网格拼图，三个子模式切换 |
| **预览** | Editor + Showcase | 平面 → 浮雕 3D 转换 / 手势碎裂沉浸展示 |

创作台主路径：选模式 → 创作画布 → 完成后可"预览"或"发布到广场"

### 2.3 用户路径

```
新用户：Splash → Auth → Home → 看见 4 大入口 → 选图鉴浏览 / 创作 / 抽卡 / 广场

老用户：Splash(快闪) → Home → 直奔上次功能

创作流程：图鉴选纹样 → 抽卡获取（如未拥有）→ 创作台拼贴 → 预览浮雕 → 发布到广场
```

---

## 3. 视觉系统

### 3.1 核心思路：系列驱动皮肤（用户确认）

**纹脉视觉系统 = 基础 UI 层（统一）+ 系列氛围层（按系列切换皮肤）**

- **基础 UI 层**（全站统一）：字体、卡片骨架、按钮形态、间距、网格、文字层级
- **系列氛围层**（按系列切换）：底色调、装饰层、动效、卡片呈现细节

暗色基调全站不变（`#0F0F10` 基座）。每个系列在自己底色范围内调，不破暗色系。

### 3.2 基础 UI 层 token

```css
/* 颜色 - 基座 */
--color-bg-base: #0F0F10;
--color-bg-elevated: #1A1A1C;
--color-bg-card: #1F1F22;
--color-border: rgba(255, 255, 255, 0.08);
--color-text-primary: #F5F1E8;
--color-text-secondary: #8A8A8A;
--color-text-dim: #4A4A4A;

/* 颜色 - 强调（被系列皮肤覆盖） */
--color-accent: var(--series-primary);      /* 系列主色，由 SeriesSkin 注入 */
--color-accent-soft: var(--series-soft);
--color-accent-text: var(--series-text);

/* 字体 */
--font-serif: 'Noto Serif SC', 'STSong', Georgia, serif;
--font-display: 'Noto Serif SC', 'STSong', Georgia, serif;  /* 大字标题 */
--font-mono: 'IBM Plex Mono', monospace;                     /* 等宽小字 */
--font-seal: 'Ma Shan Zheng', cursive;                       /* 印章字体 */

/* 字号（移动端基准） */
--text-xs: 10px;
--text-sm: 12px;
--text-base: 14px;
--text-lg: 16px;
--text-xl: 20px;
--text-2xl: 28px;
--text-display: 56px;        /* 大字（如"龍""青"） */

/* 间距（4 倍数系统） */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;

/* 圆角 */
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 8px;

/* 阴影 */
--shadow-card: 0 4px 16px rgba(0, 0, 0, 0.4);
--shadow-elevated: 0 8px 32px rgba(0, 0, 0, 0.6);
```

### 3.3 系列皮肤定义

每个系列定义为一个 `SeriesTheme` 对象：

```ts
type SeriesTheme = {
  id: string
  name: string
  primary: string       // 主色
  soft: string          // 主色淡化版
  bgGradient: string    // 底色 CSS background
  particle?: 'sparkle' | 'mist' | 'cloud' | 'rust' | 'growth' | 'none'
  decoration?: 'cloud' | 'seal' | 'bronze' | 'vine' | 'splash' | 'none'
  cardBorder: 'soft' | 'gold-line' | 'ink-line' | 'splash'
  textGlow: boolean     // 标题字是否发光
}
```

#### 11 个系列皮肤定义（初稿）

| Series | 主色 | 底色 | 粒子 | 装饰 | 卡片描边 |
|---|---|---|---|---|---|
| `qinghua` 青花瓷 | `#87CEEB` | 钴蓝渐隐 `#0a1f3d→#1E4D8C` | sparkle 白蓝 | splash 青花笔触 | soft 蓝色光晕 |
| `shanjing` 山海经 | `#C41E3A` | 墨红 `#2a0a0a→#0a0505` | mist 朱砂雾气 | seal 古文字残片 | ink-line 朱砂 |
| `dragon` 团龙 | `#D4AF6A` | 朱漆 `#2A0808→#5a1010` | cloud 金云纹流转 | seal 印章 | gold-line 金线 |
| `taotie` 饕餮/青铜 | `#8B7355` | 铜锈 `#1a2818→#0a0f08` | rust 铜锈斑 | bronze 兽面剪影 | soft 锈色 |
| `scroll` 唐草 | `#98FB98` | 深绿金 `#0f1a08→#1f2a10` | growth 生长 | vine 蔓延叶脉 | soft 绿光 |
| `cloud` 云纹 | `#B0E0E6` | 深蓝灰 `#0a1a2a→#1a2f3f` | cloud 流云 | cloud 云纹线条 | soft 蓝光 |
| `floral` 花卉 | `#FFB6C1` | 暗粉米 `#2a1a1f→#1a0f10` | sparkle 粉 | splash 花瓣 | soft 粉光 |
| `geometric` 几何 | `#DDA0DD` | 深紫 `#1a0f1f→#0f0810` | none | none 几何线条 | ink-line 紫 |
| `corner` 角花 | `#F0E68C` | 暗卡其 `#1f1f0a→#0f0f08` | none | splash 角花笔触 | gold-line 卡其 |
| `tile` 四方连续 | `#B0C4DE` | 深灰蓝 `#0a0f1a→#1a1f2a` | none | none 重复纹 | soft 灰蓝 |
| `ai` AI 元素库 | `#9b59b6` | 暗紫 `#1a0a2a→#0f051a` | sparkle 紫光 | none | soft 紫 |
| `neutral` 跨系列中性 | `#D4AF6A` | 基座 `#0F0F10` | none | none | soft 金线 |

### 3.4 SeriesSkin 组件 API

```tsx
<SeriesSkin series="qinghua" intensity="full">      {/* full | subtle | minimal */}
  <PatternCard ... />
</SeriesSkin>
```

- `intensity="full"`：底色 + 粒子 + 装饰 + 卡片描边全开（纹样详情页、单系列总览）
- `intensity="subtle"`：底色 + 卡片描边，无动效（图鉴筛选时的轻氛围）
- `intensity="minimal"`：仅 CSS 变量注入，无背景层（卡片混排，跨系列浏览）

### 3.5 跨系列页面（Home/Library 总览/Gallery）

- 用 `SeriesSkin series="neutral"`，纯基座色 + 极轻金线装饰
- 每个系列卡片用 `intensity="minimal"` 微缩皮肤作为预览
- 让纹样卡片自己说话，背景不抢戏

### 3.6 原 5 个背景组件处理

| 原组件 | 处理 |
|---|---|
| `CloudShaderBackground` | 移入 SeriesSkin `cloud` 系列的背景层；Showcase 等沉浸场景保留 |
| `FluidShaderBackground` | 移入 SeriesSkin `shanjing` 系列雾气背景；Splash 保留 |
| `GoldBackground` | 弃用，被 SeriesSkin `neutral` 替代 |
| `GoldDecorations` | 弃用，装饰由 SeriesSkin 各系列的 decoration 层提供 |
| `GoldSilkCanvas` | 移入 SeriesSkin `dragon` 系列，作为可选装饰 |

---

## 4. 动效库

### 4.1 已有（继续用）
- Framer Motion（UI 通用）
- R3F + drei（3D 浮雕 / Showcase）
- MediaPipe（手势）
- 自写 shader（CloudShader / FluidShader）

### 4.2 新增（用户确认全装）

| 库 | 用途 | 包体 | 优先级 |
|---|---|---|---|
| **tsParticles** | 粒子（青花钴蓝、山海朱砂雾、星尘） | 15KB | 必装 |
| **GSAP** + DrawSVG + MotionPath | SVG 路径动效（云纹流转、卷草生长、笔触描边、印章盖下） | 30KB | 必装 |
| **Atropos** | 卡片视差（纹样卡片立体悬浮） | 10KB | 必装 |
| **Splitting.js** | 文字拆解动效（"龍"等大字浮现/拆字） | 10KB | 必装 |
| **lottie-react** | 复杂叙事（设计师 AE 导出 JSON） | 80KB | 必装（团队需配 AE 技能） |
| **Locomotive Scroll** | 平滑滚动 + 滚动驱动动效（沉浸长页） | 30KB | 必装 |

总新增包体 ~175KB（gzipped）。按 series 配置驱动启用：
- `qinghua` → tsParticles（sparkle 模式）
- `shanjing` → tsParticles（mist 模式）+ Splitting.js（古文字浮现）
- `dragon` → GSAP（云纹 SVG 路径流转）+ Atropos（卡片视差）
- `taotie` → GSAP（兽面剪影描边）
- `scroll` → GSAP（卷草生长 SVG 路径）
- `cloud` → 保留 CloudShader + GSAP（云纹线流转）

---

## 5. 状态管理（C-2）

### 5.1 选型：**zustand**

理由：轻量、无需 Provider、与 React 19 兼容好、TS 友好、学习成本低（队友上手快）

### 5.2 Store 划分

```ts
// 5 个独立 store
useUserStore        // 用户账号、登录状态、收藏、积分
useLibraryStore     // 已拥有纹样、系列筛选、当前查看的纹样
useGachaStore       // 抽卡历史、保底计数、抽卡动画状态
useCreationStore    // 创作台画布状态、模式、历史、当前作品
useGalleryStore     // 广场列表、作品详情、点赞、fork
```

### 5.3 迁移路径

| 原 | 新 |
|---|---|
| `AppState.tsx` Context | 拆分到 5 个 zustand store |
| `gameStore.ts` 自写 | 合并到 `useGachaStore` + `useLibraryStore` |
| `patternData.ts` 数据常量 | 保留为静态数据文件，访问器迁到 `useLibraryStore` |

迁移分页进行，每页迁完独立测。

---

## 6. TS 化（C-1）

### 6.1 策略：渐进式 + strict

- **第一阶段**：新写代码全 TS；现有 `.jsx` 保留不动
- **第二阶段**：按页面/feature 迁移（每迁一页，开 strict，修 type error）
- **第三阶段**：最后批 `.jsx` → `.tsx`，开 `strict: true`

### 6.2 类型定义

集中放在 `src/types/`：

```
src/types/
├ pattern.ts         // Pattern, Series, Rarity, PatternType
├ creation.ts        // Placement, CanvasState, Mode
├ gallery.ts         // Work, Like, Fork, PublishState
├ user.ts            // User, Profile, AuthState
├ gacha.ts           // PullResult, GachaHistory
└ series-theme.ts    // SeriesTheme, ParticleType, DecorationType
```

### 6.3 strict 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

预期会发现一批潜在 bug（特别是 AppState 隐式 any 处）。

---

## 7. Router 替换（C-3）

### 7.1 选型：**React Router v7**

- 已支持 React 19
- `createBrowserRouter` 或 `<Routes>` 任选
- 与 zustand 配合好

### 7.2 迁移

| 原 | 新 |
|---|---|
| `src/components/common/Router.jsx` 手写 hash router | `react-router-dom` v7 |
| `useHashRouter` 自写 hook | `useNavigate` `useParams` `useLocation` |
| `window.location.hash = '...'` | `<Link to="...">` 或 `navigate(...)` |

URL 从 hash 模式（`/#/library`）改为正常模式（`/library`）。Vite dev server 和部署时需要配置 history fallback（已 standard）。

---

## 8. 目录重划（C-4）

### 8.1 新结构

```
src/
├ app/                      # 应用入口、全局布局
│  ├ App.tsx
│  ├ Routes.tsx             # 路由表
│  ├ BottomNav.tsx          # 全局底栏
│  └ providers.tsx          # 全局 Provider 包装
│
├ pages/                    # 页面（按 IA 重组）
│  ├ SplashPage.tsx
│  ├ AuthPage.tsx
│  ├ HomePage.tsx
│  ├ LibraryPage.tsx        # /library（含 series query）
│  ├ CreatePage.tsx         # /create（含 mode query）
│  ├ GachaPage.tsx
│  ├ GalleryPage.tsx
│  ├ WorkDetailPage.tsx
│  ├ PatternDetailPage.tsx
│  ├ PhotoMatchPage.tsx
│  ├ AdminReviewPage.tsx
│  └ tools/
│    └ CuratePage.tsx
│
├ features/                 # 业务模块（包含组件/store/工具）
│  ├ library/               # 图鉴相关
│  │  ├ components/
│  │  ├ store.ts            # useLibraryStore
│  │  └ utils.ts
│  ├ create/                # 创作台相关
│  │  ├ components/
│  │  ├ modes/              # free / guided / preview
│  │  ├ store.ts            # useCreationStore
│  │  └ utils.ts
│  ├ gacha/
│  ├ gallery/
│  ├ auth/
│  └ photo-match/
│
├ design-system/            # 设计系统（统一基座）
│  ├ tokens/
│  │  ├ colors.css
│  │  ├ typography.css
│  │  ├ spacing.css
│  │  └ shadows.css
│  ├ components/
│  │  ├ Button.tsx
│  │  ├ Card.tsx
│  │  ├ Modal.tsx
│  │  ├ PatternImage.tsx
│  │  ├ OrnateFrame.tsx
│  │  └ SeriesSkin.tsx
│  ├ series/                # 11 个系列皮肤定义
│  │  ├ themes.ts
│  │  ├ qinghua.tsx
│  │  ├ shanjing.tsx
│  │  └ ...
│  └ index.ts               # 统一导出
│
├ lib/                      # 第三方封装
│  ├ supabase.ts
│  ├ vlm.ts                 # callStepFunVision
│  ├ three-helpers.ts
│  └ mediapipe.ts
│
├ utils/                    # 纯函数
│  ├ blockOutline.ts
│  ├ generateNormalMap.ts
│  ├ imageComparison.ts
│  ├ shareCard.ts
│  └ format.ts
│
├ store/                    # zustand stores 汇总（如不放 features 内）
│  ├ useUserStore.ts
│  └ ...
│
├ types/                    # 共享 TS 类型
│  ├ pattern.ts
│  ├ creation.ts
│  └ ...
│
├ hooks/                    # 通用 hooks
│  ├ useHandGesture.ts
│  ├ useImagePreload.ts
│  └ ...
│
├ shaders/                  # GLSL
├ assets/                   # 静态资源
├ index.css                 # 全局样式 + token 引入
└ main.tsx
```

### 8.2 迁移策略

机械搬运，每搬一个 feature 独立测。`utils/` vs `lib/` 区分：
- `utils/`：纯函数，无副作用，可单测
- `lib/`：第三方库封装，有副作用（API、副作用 hook）

---

## 9. 页面重做优先级

### 9.1 必做（NOVA 答辩前必出）

**核心 5 页**（第 2-3 周）：
1. **HomePage** —— 4 大入口、SeriesSkin neutral 底、入场动效
2. **LibraryPage** —— 总览 + 系列筛选、卡片用各系列 minimal 皮肤
3. **PatternDetailPage** —— 纹样详情、文物图背景卡、SeriesSkin full 强度
4. **CreatePage** —— 创作台 3 模式切换、SeriesSkin subtle
5. **GachaPage** —— 抽卡动画、SeriesSkin full

**支持 4 页**（第 3 周）：
6. **GalleryPage** —— 广场、SeriesSkin neutral
7. **WorkDetailPage** —— 作品详情
8. **AuthPage** —— 登录页、沉浸背景
9. **PhotoMatchPage** —— 拍照识别
10. **QinghuaBrowser**（合并进 LibraryPage 子 tab）

### 9.2 次做（第 4 周）

11. **Showcase** —— 手势碎裂，SeriesSkin full
12. **Editor** —— 浮雕预览（合并进 CreatePage preview 模式）
13. **SplashPage** —— 开场动画
14. **AdminReviewPage** —— 审核

### 9.3 不动（保留）
- `/tools/curate` 内部工具，原样保留
- `/admin` 后台审核，UI 跟随新 token

---

## 10. bug 修与 QA

### 10.1 已知问题（待修）
- 拍照识别 PhotoMatchPage 准确率不足（VLM 输出解析 + 库内三段式匹配优化）
- 抽卡动画与概率显示不一致（gameStore 重构后清理）
- 手势识别偶发卡顿（MediaPipe 手部检测阈值调优）
- PatternDetailPage 文物图映射缺 9 张（待补素材）

### 10.2 QA 流程
- 每页迁完：手动跑核心路径 + 截图对比
- 全部完成：移动端 + 桌面端双 viewport 跑过
- NOVA 答辩前：邀请 1-2 个非队友用户做 5 分钟可用性测试

---

## 11. 4 周排期

### Week 1（08-12 ~ 08-18）：地基
- 设计 token + design-system 骨架
- zustand stores 拆分（5 个）
- React Router 引入 + 路由表
- 目录重划（机械搬运）
- SeriesSkin 组件 + 11 系列皮肤定义（先 3 个核心：qinghua/shanjing/dragon）

### Week 2（08-19 ~ 08-25）：核心视觉
- 11 系列皮肤全部定义完成
- 动效库接入（tsParticles + GSAP + Atropos + Splitting + lottie + Locomotive）
- HomePage 重做
- LibraryPage 重做
- PatternDetailPage 重做

### Week 3（08-26 ~ 09-01）：核心功能
- CreatePage 创作台（合并 Puzzle/Jigsaw/Composer/Editor/Showcase）
- GachaPage 重做
- GalleryPage + WorkDetailPage 重做
- AuthPage + PhotoMatchPage 重做

### Week 4（09-02 ~ 09-08）：收尾
- Showcase / SplashPage / AdminReviewPage
- 全站 TS 化收尾
- bug 修
- 可用性测试 + NOVA 答辩材料准备

### 缓冲（09-09 ~ 09-12）：NOVA 答辩前最后调整

---

## 12. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 时间盒紧（4.3 周 vs C 方案 6-7 周估算） | 严格按优先级；Week 4 缓冲可压缩 |
| 多个动效库包体增长（+175KB） | 按 series 懒加载（首屏只装当前系列需要的） |
| SeriesSkin 11 个皮肤设计工作量 | Week 1 完成 3 个核心（qinghua/shanjing/dragon），其他按需补 |
| TS 化过程发现隐性 bug | 每页迁完独立测，bug 即时修不积压 |
| 状态管理迁移引起 runtime 报错 | 渐进迁移，每 store 独立测；保留旧 Context 一周作为兜底 |
| 创作台合并 5 工具的复杂度 | 模式切换走 query string；每模式独立组件，状态用 zustand 隔离 |
| NOVA 答辩材料占用时间 | Week 4 留出 2 天做答辩 PPT/视频更新 |

---

## 13. 不做（明确排除）

- git history filter-repo 瘦身（448MB → ~60-80MB）——独立任务
- Supabase 数据模型变更——Gallery 上线所需 SQL 已在 main
- 真打 HAP 包（鸿蒙 NEXT 5.0.5）——NOVA 之后
- 全部 1700+ 纹样重做素材——资产保留
- 多语言 i18n——未在 NOVA 范围
- 浅色模式——明确不做（用户确认暗色基调）

---

## 14. 验收标准

- [ ] 4 主 tab 切换流畅，BottomNav 视觉统一
- [ ] 创作台 3 模式切换正常，5 个原页面功能不丢失
- [ ] 11 个系列皮肤全部生效，至少 6 个有动效（粒子/SVG 路径/视差）
- [ ] 所有 `.jsx/.js` 改为 `.tsx/.ts`，`strict: true` 通过
- [ ] zustand 5 store 全部迁移完成，无 Context 残留
- [ ] React Router 替换完成，浏览器后退/前进/刷新正常
- [ ] 目录结构按 §8 重划
- [ ] NOVA 答辩前核心 5 页（Home/Library/PatternDetail/Create/Gacha）+ 4 支持页全部完成
- [ ] 包体增长 ≤ 200KB gzipped
- [ ] Lighthouse 性能评分 ≥ 75（移动端）

---

## 附录 A：参考产品

- **Spotify** —— 基础 UI 统一 + 每个 playlist 自己的色彩主题（系列驱动皮肤灵感来源）
- **Steam 游戏详情页** —— 每个游戏有自己的氛围皮（背景 + 装饰）
- **故宫数字文物库** —— 系列卡片总览 + 详情沉浸
- **如果国宝会说话** —— 暗色 + 文物 + 现代排版

## 附录 B：原 18 页 → 新 IA 映射

| 原页面 | 新位置 |
|---|---|
| SplashPage `/splash` `/` | `/` |
| AuthPage `/auth` | `/auth`（保留） |
| Landing `/landing` | 移除 |
| Home `/home` | `/home`（保留，重做） |
| Library `/library` | `/library`（含 series query，重做） |
| QinghuaBrowser `/qinghua` | `/library?series=qinghua` |
| PatternDetailPage `/pattern/:id` | `/pattern/:id`（保留，重做） |
| PuzzlePage `/puzzle` | `/create?mode=free` |
| JigsawPage `/jigsaw` | `/create?mode=guided&sub=jigsaw` |
| Composer `/composer` | `/create?mode=guided&sub=symmetry` |
| Editor `/editor` | `/create?mode=preview&sub=relief` |
| Showcase `/showcase` | `/create?mode=preview&sub=shatter` |
| GachaPage `/gacha` | `/gacha`（保留，重做） |
| GalleryPage `/gallery` | `/gallery`（保留，重做） |
| WorkDetailPage `/work/:id` | `/work/:id`（保留） |
| PhotoMatchPage `/photo-match` | `/photo-match`（保留，重做） |
| AdminReviewPage `/admin` | `/admin`（保留） |
| CuratePage `/curate` | `/tools/curate` |
