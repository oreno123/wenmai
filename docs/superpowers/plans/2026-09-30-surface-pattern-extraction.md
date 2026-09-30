# 器身连续纹样提取

目标：修复青花提取把 UV 岛碎片当成纹样的问题。沿用用户已批准的模型表面提取方向。

1. 从 GLB 读取实际 baseColorTexture、三角形、UV 和节点变换，按器身角度与高度展开；使用外层半径缓冲排除内壁。
2. 先目视检查展开图，再选择有完整图案的区域；保留原始像素，不补绘、不编造语义名称。透明图保留浅色笔触，过滤零散噪点。
3. 将展开区域反投影到原 UV 生成点击掩膜，使模型点击与输出保持对应。明确区分表面展片与独立纹样。
4. 添加几何展开、接缝、UV 方向与点击 ID 回归测试；生成两件青花资源。
5. 运行测试、lint、build，并在浏览器检查切换器物、提取、拼贴。

实现文件：scripts/extract_qinghua_patterns.py（命令入口及分割）、scripts/vessel_surface.py（GLB 与曲面展开）、scripts/test_vessel_surface.py（回归）、src/pages/RelicPage.tsx（必要的展示文案与资源消费）。不改模型文件和线上资源。

## 执行结果

- 已完成：几何驱动展开、外壁筛选、柔和去底、噪点过滤、人工核对区域、UV 反投影。
- 牡丹瓶产出六个区域；第二只瓶为山水器型，保留两幅连续展片和一条边饰，原始模糊如实保留。
- 范围：目前支持单节点、单材质的回转器型；自动展开后仍需人工核对区域，不能宣称任意器型全自动语义提取。
- 补齐原有卡片只跳转、不带入素材的问题。src/data/relicPatterns.ts 注册稳定 ID；PuzzlePage 保留透明图、青花颜色与比例。素材不进入抽卡池。
- 验证：Python 几何/UV/细线回归 3 项通过；Vitest 43 项通过；生产构建通过。浏览器验证两模型切换、批量提取、卡片到拼贴画布、刷新后素材仍能解析；页面无控制台错误。界面按钮通过键盘激活验证；曲面逐像素命中由几何回归覆盖，未宣称完成所有鼠标点位验证。
- 全仓 lint 未通过（包含构建产物、旧工作树及已有代码错误）；修改后的 PuzzlePage 与 HEAD 对比均为 5 错误、1 警告，无新增。TS 文件未纳入现有 ESLint 配置。
- 模型 GLB、CDN、HAP 未改动；三件新器型及其他任务的 SQL 文件未纳入本次修改。

复现：`python scripts/extract_qinghua_patterns.py public/relic/m/qinghua_peony public/relic/m/qinghua_second`；`python -m unittest discover -s scripts -p test_vessel_surface.py -v`；`npm run test`；`npm run build`。
