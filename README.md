# 纹脉

中国传统纹样抽卡与创作 Web 应用。收集、探索、拼合千年纹样之美。

## 功能

- **抽卡系统** — 基础纹样 + 山海经传说 + 青花瓷 335 张，3 档稀有度（common / rare / SSR），单抽 / 十连，软硬保底
- **纹样图鉴** — 9 个系列收藏浏览，含手势 AR 卡片浏览器
- **纹样百科** — 朝代、文化意义、用途、冷知识，每个纹样的知识卡片
- **拍照识别** — 上传图片，颜色直方图比对返回 Top 3 最相似纹样
- **拼图创作** — Canvas 拖拽拼合金线元素块，磁吸吸附，固定块 + 柔性块
- **对称创作** — 2 / 4 / 8 分对称生成
- **程序化生成** — 5 种几何纹样（回纹 / 万字 / 冰裂 / 雷纹 / 绳纹）实时 SVG
- **3D 产品预览** — 马克杯、手机壳、盘子、丝巾贴纹样实时预览
- **手势交互展示** — MediaPipe 手势控制纹样碎裂 / 拼合，弹簧物理动画
- **分享卡片** — Canvas 生成 750×1334 品牌分享图，一键保存

## 技术栈

Vite 8 · React 19 · Three.js (R3F) · Framer Motion · Tailwind CSS 4 · MediaPipe

纯前端 SPA，无后端依赖，数据存 localStorage。

## 开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## 项目结构

```
src/
├── components/
│   ├── cards/          # 纹样卡牌
│   ├── common/         # 导航、路由、金色装饰组件
│   ├── gacha/          # 抽卡动画
│   └── products/       # 3D 产品模型
├── engine/
│   ├── proceduralPatterns.js   # 程序化纹样生成器
│   ├── puzzleBlocks.js         # 拼图块定义
│   ├── puzzleSnap.js           # 磁吸吸附算法
│   └── symmetry.js             # 对称变换
├── pages/
│   ├── Landing.jsx      # 落地页
│   ├── Home.jsx         # 首页
│   ├── Library.jsx      # 图鉴
│   ├── GachaPage.jsx    # 抽卡
│   ├── PuzzlePage.jsx   # 拼图创作
│   ├── Showcase.jsx     # 手势展示
│   ├── Editor.jsx       # 编辑器
│   └── Composer.jsx     # 组合器
├── showcase/            # 碎裂物理、丝线、Voronoi 拆解
├── store/               # 状态管理
└── styles/              # 设计系统 + 动画样式

scripts/
├── generate_patterns.py    # 程序化纹样批量生成
└── process_patterns.py     # 图片处理（去底/合成/多尺寸/WebP）

public/
├── patterns/           # 纹样图片素材
└── puzzle/             # 拼图块资源（11 组 block + mask）
```

## 元素提取

纹样元素 = 金线连通域的空间聚类，不是视觉显著物体。颜色阈值（LAB）+ 连通域拆件 + DBSCAN 空间聚类：

1. LAB 颜色阈值提取金丝
2. 连通域拆件
3. DBSCAN 空间聚类语义分组
4. 可选 vtracer 矢量化为 SVG

6 张圆形纹样图 → 45 个元素，1 张复合纹样图 → 9 个元素，共 54 个可用元素。

## License

MIT
