# 纹脉 — AI 图片生成 Prompt 清单

## 统一风格参数

所有纹样图保持统一视觉语言：

- **构图**：正圆形，居中，边缘留白
- **线条**：金色（#C9A84C ~ #D4AF37），精细工笔
- **底色**：奶白/宣纸色（`on cream paper background`）或透明底（`transparent background, PNG`）
- **风格**：中国传统纹样，对称，精细，无阴影
- **尺寸**：2048×2048（后续脚本自动缩放）

---

## 已有图片（6 张，无需重新生成）

| ID | 纹样 | 文件 |
|----|------|------|
| basic-2 | 回纹 | huiwen.png |
| basic-3 | 莲瓣纹 | lianhua.png |
| cloud-4 | 团云纹 | yunlei.png |
| dragon-4 | 团龙纹 | tuanlong.png |
| scroll-1 | 唐草纹 | juancao.png |
| scroll-2 | 缠枝纹 | juancao-fixed.png |

---

## 待生成 Prompt（31 个）

### 云纹系列（cloud）

#### basic-1 — 如意云纹
```
EN: Traditional Chinese ruyi cloud pattern, stylized cloud scrolls with inward-curving terminals, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统如意云纹，云头内卷呈如意形，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

#### cloud-1 — 流云纹
```
EN: Traditional Chinese flowing cloud pattern (liuyun), dynamic cloud wisps trailing horizontally, Han dynasty style, circular composition, golden line art on cream paper background, fine gongbi painting style, asymmetric flow, no shadow, 2048x2048

CN: 中国传统流云纹，汉代风格，云气飘逸横向流动，正圆形构图，金色线条，宣纸底色，精细工笔风格，流动感，无阴影，2048x2048
```

#### cloud-2 — 祥云纹
```
EN: Traditional Chinese auspicious cloud pattern (xiangyun), layered cloud scrolls with five-petal terminals, Tang dynasty style, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统祥云纹，唐代风格，层叠云头五瓣如意，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

#### cloud-3 — 朵云纹
```
EN: Traditional Chinese floral cloud pattern (duoyun), cloud clusters like flower blossoms, Song dynasty style, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统朵云纹，宋代风格，云团聚如花朵绽放，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

---

### 饕餮系列（taotie）

#### taotie-1 — 饕餮纹·商
```
EN: Traditional Chinese taotie beast mask pattern, Shang dynasty bronze style, frontal symmetric animal face with prominent eyes and horns, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统饕餮纹，商代青铜器风格，正面兽面，双目突出，双角对称，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

#### taotie-2 — 饕餮纹·周
```
EN: Traditional Chinese taotie beast mask pattern, Western Zhou dynasty style, more refined and elongated animal face with curled patterns, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统饕餮纹，西周风格，兽面更修长精致，纹饰卷曲繁复，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

#### taotie-3 — 夔龙饕餮纹
```
EN: Traditional Chinese kuilong-taotie composite pattern, Warring States style, beast face flanked by two kuilong dragons, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统夔龙饕餮纹，战国风格，兽面两侧配夔龙纹，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

---

### 龙纹系列（dragon）

#### dragon-1 — 蟠龙纹
```
EN: Traditional Chinese coiled dragon pattern (panlong), Han dynasty style, dragon body coiled in circular form, scales and claws visible, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统蟠龙纹，汉代风格，龙身盘曲呈圆形，鳞爪清晰，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

#### dragon-2 — 行龙纹
```
EN: Traditional Chinese walking dragon pattern (xinglong), Tang dynasty style, dragon striding sideways with flowing mane, dynamic pose, circular composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048

CN: 中国传统行龙纹，唐代风格，龙横向行走，鬃毛飘动，动态姿势，正圆形构图，金色线条，宣纸底色，精细工笔风格，无阴影，2048x2048
```

#### dragon-3 — 升龙纹
```
EN: Traditional Chinese ascending dragon pattern (shenglong), Ming dynasty style, dragon rising upward with five claws, imperial style, circular composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048

CN: 中国传统升龙纹，明代风格，五爪龙上升飞腾，皇家风格，正圆形构图，金色线条，宣纸底色，精细工笔风格，无阴影，2048x2048
```

---

### 卷草纹系列（scroll）

#### scroll-3 — 宝相花卷草
```
EN: Traditional Chinese baoxiang flower scroll pattern, Tang dynasty style, composite floral-scroll motif with lotus and peony elements, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统宝相花卷草纹，唐代风格，宝相花与卷草组合纹样，融莲花牡丹元素，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

---

### 几何纹系列（geometric）

#### basic-1-alt — 万字纹
```
EN: Traditional Chinese wan (swastika) pattern, repeating geometric swastika fret, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048

CN: 中国传统万字纹，几何连续万字纹，正圆形构图，金色线条，宣纸底色，精细工笔风格，对称图案，无阴影，2048x2048
```

---

### 角花系列（corner）

#### corner-1 — 如意角花
```
EN: Traditional Chinese ruyi corner ornament, ruyi-scepter head motif for corner decoration, quarter-circle composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048

CN: 中国传统如意角花，如意头形角隅装饰纹样，四分之一圆构图，金色线条，宣纸底色，精细工笔风格，无阴影，2048x2048
```

#### corner-2 — 凤鸟角花
```
EN: Traditional Chinese phoenix corner ornament, stylized feng bird motif for corner decoration, quarter-circle composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048

CN: 中国传统凤鸟角花，凤鸟纹角隅装饰纹样，四分之一圆构图，金色线条，宣纸底色，精细工笔风格，无阴影，2048x2048
```

---

### 四方连续系列（tile）

#### tile-1 — 万字不到头
```
EN: Traditional Chinese wan character endless pattern (wanzi butoudao), interlocking swastika geometric fret creating infinite connection, square composition, golden line art on cream paper background, fine gongbi painting style, tiled repeat, no shadow, 2048x2048

CN: 中国传统万字不到头纹，万字互连几何连续纹样，方形构图，金色线条，宣纸底色，精细工笔风格，四方连续，无阴影，2048x2048
```

#### tile-2 — 冰裂纹
```
EN: Traditional Chinese ice crackle pattern (binglie wen), irregular geometric crackle network resembling broken ice, square composition, golden line art on cream paper background, fine gongbi painting style, random geometric, no shadow, 2048x2048

CN: 中国传统冰裂纹，不规则几何冰裂网络纹样，方形构图，金色线条，宣纸底色，精细工笔风格，随机几何感，无阴影，2048x2048
```

---

## 使用说明

### 推荐工具优先级

1. **Ideogram 3.0** — 文字少、线条图案最干净，圆形构图最好
2. **Flux Pro 1.1** — 细节最精细，适合复杂纹样（龙纹、饕餮纹）
3. **Gemini Nano Banana** — 免费额度多，适合快速试稿

### 批量生成建议

- 每个纹样先生成 4 张选最佳
- SSR 纹样（龙纹、饕餮）用 Flux Pro 提升细节
- Common 纹样用 Gemini Flash 节省成本
- 全部保持 2048×2048 原始尺寸
- 生成后用 `process_patterns.py` 统一处理

### Prompt 调优参数

如果生成效果不理想，按以下方向调整：

| 问题 | 调整 |
|------|------|
| 构图不圆 | 加 `perfect circle composition, centered` |
| 线条太粗 | 加 `hair-thin golden lines, ultra fine detail` |
| 底色不对 | 加 `pure cream white background, no gradient` |
| 不对称 | 加 `perfectly bilaterally symmetric` |
| 有阴影 | 加 `flat, no shadow, no 3D effect, no depth` |
| 风格不对 | 加 `Chinese traditional pattern illustration, not modern, not art deco` |
