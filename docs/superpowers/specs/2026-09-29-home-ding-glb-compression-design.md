# 首页鼎模型 Meshopt 压缩设计

## 目标
缩短首页默认战国鼎首次下载时间，并保持模型的几何、材质和贴图表现。

## 方案
仅对 `public/relic/m/ding_warring/model.glb` 做 Meshopt 几何重编码：

- 不进行网格简化，保留原始三角面与轮廓。
- 不重编码现有 WebP 贴图，保留材质和 UV。
- 继续使用 GLB 内的 `EXT_meshopt_compression`；项目的 `useGLTF` 默认已配置 MeshoptDecoder。

## 验收
- 文件体积显著小于原始 6.66 MiB。
- glTF 校验没有 error。
- 网站测试和生产构建通过。
