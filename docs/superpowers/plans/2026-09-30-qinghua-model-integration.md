# 青花器型接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将两件用户提供的青花 GLB 压缩后接入首页与真实器型纹样提取页。

**Architecture:** Python 脚本只重写 GLB 内嵌的 4096px RGB 贴图为 2048px JPEG，不触碰原网格或源文件；每件器型有独立模型目录、纹样卡图片和 manifest。`HomeHero3D` 与 `RelicPage` 从同一模型索引读取青花条目，提取页按材质分类显示。

**Tech Stack:** React 19、Three.js、Python Pillow、Vite、Vitest。

---

### Task 1: 压缩并准备两件青花资产

**Files:**
- Create: `scripts/compress_glb_textures.py`
- Create: `public/relic/m/qinghua_peony/model.glb`
- Create: `public/relic/m/qinghua_second/model.glb`

- [ ] **Step 1: 实现嵌入贴图压缩器**

脚本读取 GLB JSON/BIN chunk，对每个 `images[].bufferView` 用 Pillow 以最长边 2048px、JPEG quality 88 重编码，更新 `mimeType`、buffer view 偏移与长度，四字节对齐后写回新 GLB。命令接受 `input output` 两个参数并打印输入、输出字节数。

- [ ] **Step 2: 生成发布副本**

Run:
```powershell
python scripts/compress_glb_textures.py C:\Users\lenovo\Downloads\e384427da9f179c900ea612a313a99f3.glb public\relic\m\qinghua_peony\model.glb
python scripts/compress_glb_textures.py C:\Users\lenovo\Downloads\93113cd6c63cf761de15cca8b63626a0.glb public\relic\m\qinghua_second\model.glb
```

Expected: 两个输出均小于源文件，仍包含 1 mesh、3 textures 和 1 animation。

- [ ] **Step 3: 提取基础纹理作为器型缩略图和卡片来源**

脚本输出 baseColor texture（材质 `pbrMetallicRoughness.baseColorTexture`）到每个器型目录的 `texture.jpg`；从已确认的纹样清晰区域裁出 `elem_00.png` 与 `elem_01.png`，不从法线或金属粗糙度贴图裁图。

- [ ] **Step 4: 提交**

```bash
git add scripts/compress_glb_textures.py public/relic/m/qinghua_peony public/relic/m/qinghua_second
git commit -m "feat: add optimized qinghua vessel assets"
```

### Task 2: 注册器型与真实纹样卡

**Files:**
- Modify: `public/relic/index.json`
- Create: `public/relic/m/qinghua_peony/manifest.json`
- Create: `public/relic/m/qinghua_second/manifest.json`

- [ ] **Step 1: 增加两条模型索引**

为 `qinghua_peony` 和 `qinghua_second` 增加 `material: "qinghua"`、名称、年代说明、GLB、manifest、thumb 字段；青花主瓶排在索引首位，第二件紧随其后。

- [ ] **Step 2: 写入各自独立 manifest**

每份 manifest 的元素使用独立 ID、名称、`level`、UV 点击范围与 `elem_*.png`。仅写入与纹理卡可核验的一到两个前方纹样区域；不拷贝青铜器元素或 UV。

- [ ] **Step 3: 提交**

```bash
git add public/relic/index.json public/relic/m/qinghua_peony/manifest.json public/relic/m/qinghua_second/manifest.json
git commit -m "feat: register qinghua vessel extraction manifests"
```

### Task 3: 首页和提取页接入

**Files:**
- Modify: `src/components/common/HomeHero3D.jsx`
- Modify: `src/pages/RelicPage.tsx`

- [ ] **Step 1: 首页默认青花主瓶**

在首页器型数组首位加入 `qinghua_peony`，给该项使用瓷器材质调校；点击说明的“查看器物详览”跳转 `#/relic?m=qinghua_peony`。

- [ ] **Step 2: 提取页增加材质分类**

扩展 `ModelInfo` 为可选 `material: 'qinghua' | 'bronze'`。模型索引加载完后默认青花主瓶；常驻按钮筛选“青花瓷”和“考古扫描”，当前分类下的模型卡可见。切换分类或模型时清空 picked。

- [ ] **Step 3: 调整瓷器展示**

在 `Vessel` 的基础材质按 `model.material` 使用低金属、高粗糙度、暖白底色与钴蓝可读光照；金绿 overlay 对青花改为钴蓝/暖白，仍使用 manifest UV 命中。

- [ ] **Step 4: 浏览器验证**

Run: `npm run dev -- --host 127.0.0.1`

Expected: 首页先显示青花主瓶；详情页默认青花分类；两件青花器型可切换并产出自身纹样卡；青铜器提取仍可用。

- [ ] **Step 5: 提交**

```bash
git add src/components/common/HomeHero3D.jsx src/pages/RelicPage.tsx
git commit -m "feat: make qinghua vessels primary extraction models"
```

### Task 4: 回归验证

**Files:**
- Modify: `docs/superpowers/plans/2026-09-30-qinghua-model-integration.md`

- [ ] **Step 1: 验证压缩模型元数据与资源存在性**

Run: `python scripts/compress_glb_textures.py --check public/relic/m/qinghua_peony/model.glb public/relic/m/qinghua_second/model.glb`

Expected: 两个模型均报告有效 GLB、贴图数 3、输出尺寸。

- [ ] **Step 2: 跑项目验证**

Run: `npm run test -- --run && npm run build`

Expected: Vitest 全部通过，Vite 构建退出码为 0。

- [ ] **Step 3: 提交**

```bash
git add docs/superpowers/plans/2026-09-30-qinghua-model-integration.md
git commit -m "docs: record qinghua model validation"
```
