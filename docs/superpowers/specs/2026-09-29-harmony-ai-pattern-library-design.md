# 鸿蒙 AI 纹样库保留设计

## 目标

鸿蒙 HAP 保留首页的“AI 纹样库”入口和 `/ai-patterns` 路由，并让页面在无网络或资源异常时提供明确状态，不再渲染为空白内容。

## 方案

`public/relic/ai` 是 AI 纹样库页面唯一依赖的清单与预览图，现有 144 个文件合计约 7.8 MB。HAP 打包脚本保留这组资源；继续排除 `public/patterns/ai` 的 314.8 MB 编辑器素材，避免包体膨胀。

`AiPatternsPage` 在请求期间显示加载状态；请求失败、清单格式不正确或清单为空时显示“未能加载 AI 纹样库”和重试按钮。正常网页和 HAP 仍使用相同的相对资源路径，因此 HAP 由 ArkWeb 的 rawfile 拦截器提供离线资源。

首页 3D 五鼎中仅一件在 HAP 内置，其他资源原先会被当作本地 rawfile 请求。首页应在鸿蒙 `http://localhost` 虚拟 origin 下将缺失模型改为已验证可访问的 `https://wenmai.ruoziqing.cn`，内置兽纹鼎继续使用本地资源。

## 验收

1. `dist_harmony/relic/ai/manifest.json` 和预览图存在。
2. HAP 的 rawfile 包含 `relic/ai/manifest.json`，`/ai-patterns` 可离线读取资源。
3. 清单加载失败时页面有可见说明和重试操作。
4. 鸿蒙首页的非内置鼎模型 URL 不再指向不存在的 rawfile。
