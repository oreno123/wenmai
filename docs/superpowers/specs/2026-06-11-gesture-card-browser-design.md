# Gesture Card Browser Design

AR 手势控制悬浮卡片浏览器，集成到纹脉收藏库页面。

## Architecture

三层叠放结构（`position: fixed` 全屏覆盖）：

1. **底层** — `<video>` 摄像头画面，CSS `transform: scaleX(-1)` 镜像，`filter: brightness(0.6)` + 暗角 vignette
2. **中层** — Canvas 2D 粒子特效层（手部粒子尾迹、滑动弧光、金色丝线）
3. **顶层** — CSS 3D 悬浮卡片轮播（`perspective` + `rotateY`）

## Gesture Detection

追踪点：手掌中心 = `wrist(0)` 与 `middle_finger_mcp(9)` 中点。

### 滑动（Swipe）
- 连续 3 帧手掌中心 x 偏移同方向且超过阈值 → 触发翻页
- 300ms 冷却防抖
- 镜像处理：摄像头 CSS 镜像后，MediaPipe 原始坐标"手向左滑"= x 增大，需翻转判定方向

### 缩放（Pinch Scale）
- 两手各取手掌中心，算两点距离
- 距离变化超过 15% → 触发缩放
- 映射范围：0.5x–2x

### State Machine
```
IDLE → (检测到手) → TRACKING → (滑动) → SWIPING → TRACKING
                                  → (双手缩放) → SCALING → TRACKING
      → (3秒无手) → IDLE
```

## Card Visual

- 白色/暖米色半透明底 `rgba(255,248,240,0.85)` + `backdrop-filter: blur(8px)`
- 卡片正面：纹样图 + 纹样名 + 稀有度标签
- 当前卡片居中最大，左右卡片缩小 70% + 偏移 + `rotateY` 透视倾斜
- 翻页动画：CSS `transition` 0.4s ease-out

## Particle Effects (Canvas 2D)

- **手部尾迹**：手掌中心持续喷射金色粒子（每帧 2-3 个），半径 2-4px，金色→透明渐变，生命周期 0.5s
- **滑动弧光**：沿滑动方向喷射弧形粒子流
- **缩放丝线**：两手之间连半透明金色丝线

## File Structure

```
src/gesture-cards/
├── GestureCardView.tsx      # 主页面组件，三层叠放
├── HandSwipeDetector.ts     # 手势检测（滑动+缩放）
├── ParticleRenderer.ts      # Canvas 2D 粒子特效
└── types.ts                 # 类型定义
```

## Integration

- 收藏库页面加"手势浏览"按钮，点击进入 `GestureCardView`
- `GestureCardView` 全屏覆盖（`position: fixed`），关闭按钮返回
- 数据：`gameStore.data.library` → `patternData.PATTERN_LIBRARY` 匹配拿图片和名称
- 不需要新路由，state 控制显示/隐藏
- 无新增依赖（`@mediapipe/tasks-vision` 已在 package.json）

## Exit

- 右上角半透明关闭按钮
- 3 秒内无手 → 自动提示"未检测到手势"
