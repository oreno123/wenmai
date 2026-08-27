# 找相似 VLM 接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 07-04 写好但从未接入的 VLM 识别（Step Fun step-3.7-flash）接进 `/photo-match` 页面，API key 收进服务器 nginx 反代，返回纹样名+讲解，hash 撞库降级为兜底。

**Architecture:** 浏览器同源调 `https://wenmai-api.ruoziqing.cn/vlm/chat/completions`（dev 走 vite proxy 转发到同一地址）；nginx 剥 `/vlm` 前缀、注入 Bearer key 反代到 `api.stepfun.com/v1/chat/completions`；VLM 一次调用输出"答案行+讲解行"两行，`parseVlmOutput` 解析后走 `matchPattern` 三段匹配（精确/模糊/未收录），失败或未收录时落回现有 pHash/dHash 撞库。

**Tech Stack:** Vite 8 + React 19、vitest、nginx（腾讯云 1.13.192.33）、Step Fun step-3.7-flash（OpenAI 兼容 chat/completions）。

**规格:** `docs/superpowers/specs/2026-08-27-photo-match-vlm-wiring-design.md`

**服务器速查:** `ssh -i ~/Downloads/me.pem ubuntu@1.13.192.33`（必须 me.pem）；前端在 `/var/www/wenmai`；nginx 配置 `/etc/nginx/sites-available/wenmai-api`（2026-08-27 已有 `.bak-20260827` 备份基线）。

---

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/utils/vlmMatch.ts` | 修改 | 相对端点、双行 prompt、`parseVlmOutput`、`fileToCompressedBase64`、`VlmCallResult` 加 explanation |
| `src/utils/vlmMatch.test.ts` | 修改 | 新增 `parseVlmOutput` 用例组 |
| `vite.config.js` | 修改 | dev proxy `/vlm` → wenmai-api |
| `src/pages/PhotoMatchPage.jsx` | 修改 | VLM 编排 + 四结果态 UI |
| `deploy/nginx-wenmai-api.conf.template` | 新建 | 脱敏 nginx 模板（`<STEPFUN_KEY>` 占位符） |
| 服务器 `/etc/nginx/sites-available/wenmai-api` | 修改 | 加 `location /vlm/`（由模板生成） |
| 服务器 `/etc/nginx/conf.d/wenmai-vlm-limit.conf` | 新建 | limit_req zone（http 上下文） |

不动的文件：`src/utils/imageComparison.ts`（hash 兜底原样用）、`src/store/patternData.ts`、`scripts/test-vlm-api.mjs`（独立脚本，自带 key 读取）。

---

### Task 1: `parseVlmOutput` 解析双行输出（TDD）

**Files:**
- Modify: `src/utils/vlmMatch.test.ts`（文件末尾追加）
- Modify: `src/utils/vlmMatch.ts`

- [ ] **Step 1: 写失败测试**

在 `src/utils/vlmMatch.test.ts` 末尾追加（import 行同步加 `parseVlmOutput`）：

```ts
import { parseVlmNames, extractKeyword, matchPattern, parseVlmOutput, type MatchResult } from './vlmMatch'
```

```ts
describe('parseVlmOutput', () => {
  it('标准双行输出：答案行 + 讲解行', () => {
    const raw = '答案：团龙纹|云纹\n讲解：团龙纹为龙体盘踞成团的圆形适合纹样，盛行于明清，寓意尊贵吉祥。'
    const r = parseVlmOutput(raw)
    expect(r.names).toEqual(['团龙纹', '云纹'])
    expect(r.explanation).toBe('团龙纹为龙体盘踞成团的圆形适合纹样，盛行于明清，寓意尊贵吉祥')
  })

  it('reasoning 包裹：答案行不在最后一行', () => {
    const raw = '先分析图中龙的形态。\n答案：团龙纹\n讲解：龙纹盘踞成团。'
    const r = parseVlmOutput(raw)
    expect(r.names).toEqual(['团龙纹'])
    expect(r.explanation).toBe('龙纹盘踞成团')
  })

  it('只有答案行、无讲解行', () => {
    const r = parseVlmOutput('答案：回纹')
    expect(r.names).toEqual(['回纹'])
    expect(r.explanation).toBe('')
  })

  it('无答案前缀（老格式）：退回取最后一行做名字', () => {
    const r = parseVlmOutput('这是多行推理。\n饕餮纹')
    expect(r.names).toEqual(['饕餮纹'])
    expect(r.explanation).toBe('')
  })

  it('讲解行必须以"讲解"开头才算（行中出现不算）', () => {
    const raw = '答案：龙纹\n这是对纹样的讲解：龙纹威严。'
    const r = parseVlmOutput(raw)
    expect(r.names).toEqual(['龙纹'])
    expect(r.explanation).toBe('')
  })

  it('空输入返回空', () => {
    expect(parseVlmOutput('')).toEqual({ names: [], explanation: '' })
    expect(parseVlmOutput('  \n  ')).toEqual({ names: [], explanation: '' })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd /d/desktop/纹脉/wenmai && npx vitest run src/utils/vlmMatch.test.ts
```

预期：FAIL，报 `parseVlmOutput` 不是 `vlmMatch` 的导出（import 错误）。

- [ ] **Step 3: 实现**

在 `src/utils/vlmMatch.ts` 的 `parseVlmNames` 函数之后新增：

```ts
export interface VlmParsedOutput {
  names: string[]
  explanation: string
}

/**
 * 解析双行输出：优先找 "答案：" 行（reasoning 模型答案行不一定在末尾），
 * 找不到退回 parseVlmNames 的"取最后一行"老逻辑；"讲解：" 行必须以行首"讲解"开头。
 */
export function parseVlmOutput(raw: string): VlmParsedOutput {
  const lines = (raw || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const answerLine = lines.find(l => /(^|\s)(答案|识别结果|最终答案)[:：]/.test(l))
  const nameSource = answerLine ?? lines[lines.length - 1] ?? ''
  const names = parseVlmNames(nameSource)

  const explainLine = lines.find(l => /^讲解[:：]/.test(l))
  let explanation = explainLine ? explainLine.replace(/^讲解[:：]\s*/, '').trim() : ''
  explanation = explanation.replace(/[。.]+$/, '').trim()

  return { names, explanation }
}
```

- [ ] **Step 4: 跑测试确认全过**

```bash
npx vitest run src/utils/vlmMatch.test.ts
```

预期：PASS（新用例组 + 既有 parseVlmNames/extractKeyword/matchPattern 全部用例）。

- [ ] **Step 5: Commit**

```bash
git add src/utils/vlmMatch.ts src/utils/vlmMatch.test.ts
git commit -m "feat(vlm): parseVlmOutput 解析答案+讲解双行输出"
```

---

### Task 2: 端点改相对路径 + 双行 prompt + 图片压缩

**Files:**
- Modify: `src/utils/vlmMatch.ts`

说明：`fileToCompressedBase64` 依赖浏览器 canvas，vitest（node 环境）测不了，验收放 Task 6 手测。

- [ ] **Step 1: 改端点、去 apiKey、换 prompt**

`src/utils/vlmMatch.ts` 中：

把

```ts
const STEPFUN_ENDPOINT = 'https://api.stepfun.com/v1/chat/completions'
```

替换为

```ts
// 生产=wenmai-api nginx 反代（注入 key），dev=vite server.proxy 转发到同一反代。
// 前端 bundle 永远不含 api.stepfun.com 域名和 key。
const VLM_ENDPOINT = '/vlm/chat/completions'
```

把 `VLM_PROMPT` 整体替换为：

```ts
const VLM_PROMPT = `识别图中的中国传统纹样。

输出规则（严格两行，不要多余内容）：
第一行 答案：纹样名（多主题时按主次输出 1-3 个，用 | 分隔）
第二行 讲解：60 字内说明这是什么纹样、盛行朝代、寓意

示例：
答案：团龙纹|云纹
讲解：团龙纹为龙体盘踞成团的圆形适合纹样，盛行于明清，寓意尊贵吉祥。

常见纹样参考（不限于）：团龙纹、行龙纹、蟠龙纹、云雷纹、回纹、卷草纹、缠枝纹、莲瓣纹、如意云纹、海水江崖纹、宝相花、冰裂纹、万字纹、绳纹、饕餮纹、凤鸟纹、牡丹纹、菊花纹、兰花纹、青花龙纹、青花山水

最终输出：
答案：纹样名
讲解：一句话介绍`
```

把接口定义

```ts
export interface VlmCallOptions {
  apiKey: string
  imageBase64: string  // 不带 data: 前缀的纯 base64
  signal?: AbortSignal
}

export interface VlmCallResult {
  rawOutput: string
  candidates: string[]
}
```

替换为

```ts
export interface VlmCallOptions {
  imageBase64: string  // 不带 data: 前缀的纯 base64
  signal?: AbortSignal
}

export interface VlmCallResult {
  rawOutput: string
  candidates: string[]
  explanation: string
}
```

`callStepFunVision` 内三处修改——fetch 目标与 headers：

```ts
  const resp = await fetch(VLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
```

返回值改用 `parseVlmOutput`：

```ts
  const parsed = parseVlmOutput(rawOutput)

  return {
    rawOutput,
    candidates: parsed.names,
    explanation: parsed.explanation,
  }
```

同步更新函数头注释里的坑说明第 4 条：`4. 认证由 nginx /vlm/ 反代注入，本函数不再接收 apiKey`。

- [ ] **Step 2: 加压缩函数**

在 `fileToBase64` 之前新增（文件顶部已有 import，补一个类型 import）：

文件第一个 import 块后加：

```ts
import type { CropRect } from './imageComparison'
```

```ts
/**
 * 上传图 → 压缩 base64（VLM 用）。有框选画框内区域，否则整图。
 * 最长边 1024 / JPEG q0.82：手机原图 5-10MB → 约 200KB，上行快约 10 倍。
 * crop 坐标为图片自然像素（与 imageComparison 同一约定）。
 */
export async function fileToCompressedBase64(
  file: File,
  crop: CropRect | null = null,
): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed: ' + file.name))
      el.src = url
    })
    const srcW = crop ? crop.w : img.naturalWidth
    const srcH = crop ? crop.h : img.naturalHeight
    const MAX = 1024
    const scale = Math.min(1, MAX / Math.max(srcW, srcH))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(srcW * scale))
    canvas.height = Math.max(1, Math.round(srcH * scale))
    const ctx = canvas.getContext('2d')!
    if (crop) {
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    return dataUrl.split(',')[1] ?? ''
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

- [ ] **Step 3: 全量测试不回归**

```bash
npx vitest run
```

预期：全部 PASS（callStepFunVision 无单测，不涉及网络）。

- [ ] **Step 4: Commit**

```bash
git add src/utils/vlmMatch.ts
git commit -m "feat(vlm): 端点改 /vlm 相对路径(反代注入key) + 双行prompt + 上传图压缩"
```

---

### Task 3: vite dev proxy

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: 加 server.proxy**

`vite.config.js` 的 `export default defineConfig({...})` 改为：

```js
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    writeFilePlugin(),
  ],
  server: {
    proxy: {
      // dev 下把 /vlm 转到生产反代（key 在服务器 nginx 注入），与生产同一条代码路径
      '/vlm': {
        target: 'https://wenmai-api.ruoziqing.cn',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 2: 验证 proxy 配置合法**

```bash
npx vite --port 5199 > /tmp/vite.log 2>&1 & sleep 4 && curl -s -o /dev/null -w "%{http_code}" http://localhost:5199/ && kill %1
```

预期：`200`（vite 起得来即可；/vlm 转发效果在 Task 6 验证）。

- [ ] **Step 3: Commit**

```bash
git add vite.config.js
git commit -m "chore(dev): vite proxy /vlm 转发到 wenmai-api 反代"
```

---

### Task 4: PhotoMatchPage 四结果态接入

**Files:**
- Modify: `src/pages/PhotoMatchPage.jsx`

- [ ] **Step 1: 加 import**

第 5 行 `import { extractHashFromFileWithCrop, ... } from '../utils/imageComparison'` 之后加：

```js
import { callStepFunVision, matchPattern, fileToCompressedBase64 } from '../utils/vlmMatch'
```

- [ ] **Step 2: 加 state**

`const [error, setError] = useState(null)` 之后加：

```js
const [vlm, setVlm] = useState(null)                 // { candidates, explanation } | null
const [matchResult, setMatchResult] = useState(null) // matchPattern 的 MatchResult | null
const [aiDown, setAiDown] = useState(false)          // true = VLM 失败走了本地兜底
```

`matchState` 注释改为 `// 'idle' → 'crop' → 'loading' → 'results'(本地) / 'results-ai'(AI)`。

- [ ] **Step 3: 重写 runIdentify**

整个 `runIdentify`（原 100-125 行）替换为：

```js
  const runIdentify = useCallback(async (useCrop) => {
    if (!pendingFile || !imgInfo) return
    setMatchState('loading')
    setError(null)
    try {
      let crop = null
      if (useCrop && cropRect && cropRect.w > 8 && cropRect.h > 8) {
        const sx = imgInfo.naturalW / imgInfo.displayW
        const sy = imgInfo.naturalH / imgInfo.displayH
        crop = {
          x: cropRect.x * sx,
          y: cropRect.y * sy,
          w: cropRect.w * sx,
          h: cropRect.h * sy,
        }
      }

      // 本地 hash 先算好（兜底与"未收录"态都要用）
      const userHash = await extractHashFromFileWithCrop(pendingFile, crop)

      // AI 识别，25s 超时
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 25000)
      try {
        const base64 = await fileToCompressedBase64(pendingFile, crop)
        const result = await callStepFunVision({ imageBase64: base64, signal: ctrl.signal })
        clearTimeout(timer)

        const m = matchPattern(result.candidates, PATTERN_LIBRARY)
        setVlm(result)
        setMatchResult(m)
        setAiDown(false)

        if (m.source === 'fallback') {
          // VLM 认出了名字但图鉴未收录：补 hash top3 作"相似参考"
          const libHashes = await buildLibraryHashes(PATTERN_LIBRARY.filter(p => p.image))
          setMatches(findTopMatches(userHash, libHashes, 3))
        } else {
          setMatches([])
        }
        setMatchState('results-ai')
      } catch (aiErr) {
        clearTimeout(timer)
        // VLM 失败（超时/网络/5xx/空输出）→ 静默落回本地匹配
        const libHashes = await buildLibraryHashes(PATTERN_LIBRARY.filter(p => p.image))
        setMatches(findTopMatches(userHash, libHashes, 3))
        setVlm(null)
        setMatchResult(null)
        setAiDown(true)
        setMatchState('results')
      }
    } catch (e) {
      setError('图片分析失败，请换一张试试')
      setMatchState('crop')
    }
  }, [pendingFile, imgInfo, cropRect])
```

同时在 `handleReset` 里追加三个新 state 的重置（放在 `setImgInfo(null)` 之后）：

```js
    setVlm(null)
    setMatchResult(null)
    setAiDown(false)
```

- [ ] **Step 4: 抽出结果卡片渲染（供两个结果态复用）**

组件 return 之前加：

```js
  const renderMatchCards = (list) => list.map((match, idx) => {
    const pattern = getPatternById(match.patternId)
    if (!pattern) return null
    const { label, color } = similarityLabel(match.score)
    return (
      <div key={match.patternId} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 12, marginBottom: 8,
        background: idx === 0 ? 'rgba(201,162,60,0.08)' : 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        border: `1px solid ${idx === 0 ? 'rgba(201,162,60,0.2)' : 'rgba(255,255,255,0.05)'}`,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: idx === 0 ? 'rgba(201,162,60,0.2)' : 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: idx === 0 ? '#F2D58A' : '#6A6A6A',
          flexShrink: 0,
        }}>
          {idx + 1}
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
          background: 'rgba(0,0,0,0.3)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PatternImage src={getPatternImage(pattern)} alt={pattern.name} fallbackSize={24} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F1E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pattern.name}
          </div>
          <div style={{ fontSize: 11, color: '#6A6A6A', marginTop: 2 }}>
            <span className={`rarity-badge rarity-${pattern.rarity}`} style={{ fontSize: 10, padding: '1px 6px' }}>
              {getRarityLabel(pattern.rarity)}
            </span>
            <span style={{ marginLeft: 6 }}>{pattern.type}</span>
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, color,
          padding: '3px 8px', borderRadius: 8,
          background: 'rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}>
          {label}
        </div>
      </div>
    )
  })
```

原 `results` 区里 `{matches.map((match, idx) => {...})}` 整块替换为 `{renderMatchCards(matches)}`。

- [ ] **Step 5: 新增 results-ai 结果区**

在 `{/* Results */}` 块（`matchState === 'results'`）之后新增平级块：

```jsx
      {/* Results — AI 识别 */}
      {matchState === 'results-ai' && vlm && matchResult && (
        <div>
          <div style={{
            textAlign: 'center', marginBottom: 24,
            padding: 16, background: 'rgba(201,162,60,0.03)',
            borderRadius: 12, border: '1px solid rgba(201,162,60,0.1)',
          }}>
            <div style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>你上传的图片</div>
            <img src={previewUrl} alt="上传图片" style={{
              maxWidth: '100%', maxHeight: 180, borderRadius: 8, objectFit: 'contain',
            }} />
          </div>

          {matchResult.source === 'exact' && matchResult.primaryMatch ? (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#8a7a4a', letterSpacing: 3, marginBottom: 8 }}>AI 识别为</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#F2D58A', letterSpacing: 4 }}>
                {matchResult.primaryMatch.name}
              </div>
              <div style={{ margin: '14px auto', width: 48, height: 1, background: 'rgba(212,175,106,0.4)' }} />
              {vlm.explanation && (
                <div style={{ fontSize: 13, color: '#C8B896', lineHeight: 1.8, maxWidth: 320, margin: '0 auto 16px' }}>
                  {vlm.explanation}
                </div>
              )}
              <button
                onClick={() => navigate(`/pattern/${matchResult.primaryMatch.id}`)}
                style={{
                  padding: '10px 28px', borderRadius: 10, fontSize: 13,
                  background: 'linear-gradient(135deg, #D4AF6A, #B8860B)',
                  color: '#1a1a1a', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                查看百科 →
              </button>
            </div>
          ) : matchResult.source === 'fuzzy' ? (
            <div>
              <div style={{ fontSize: 14, color: '#F5F1E8', fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>
                AI 认为可能是：{vlm.candidates.join('、')}
              </div>
              {vlm.explanation && (
                <div style={{ fontSize: 12, color: '#8a7a4a', lineHeight: 1.8, marginBottom: 16 }}>
                  {vlm.explanation}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#C8B896', marginBottom: 10 }}>图鉴内近似纹样（点击查看百科）</div>
              {matchResult.fuzzyMatches.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/pattern/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 12, marginBottom: 8, borderRadius: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                    background: 'rgba(0,0,0,0.3)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PatternImage src={getPatternImage(p)} alt={p.name} fallbackSize={24} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F1E8' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#6A6A6A', marginTop: 2 }}>
                      <span className={`rarity-badge rarity-${p.rarity}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                        {getRarityLabel(p.rarity)}
                      </span>
                      <span style={{ marginLeft: 6 }}>{p.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#8a7a4a', letterSpacing: 3, marginBottom: 8 }}>
                  图鉴暂未收录 · AI 识别为
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#D4AF6A', letterSpacing: 3 }}>
                  {vlm.candidates.join('、') || '未能识别'}
                </div>
                {vlm.explanation && (
                  <div style={{ fontSize: 13, color: '#C8B896', lineHeight: 1.8, maxWidth: 320, margin: '12px auto 0' }}>
                    {vlm.explanation}
                  </div>
                )}
              </div>
              {matches.length > 0 && (
                <>
                  <div style={{ fontSize: 13, color: '#C8B896', marginBottom: 10 }}>相似参考（本地匹配）</div>
                  {renderMatchCards(matches)}
                </>
              )}
            </div>
          )}

          <div style={{
            fontSize: 11, color: '#5a5a5a', textAlign: 'center',
            marginTop: 12, fontStyle: 'italic',
          }}>
            AI 识别 + 库内匹配 · 拍博物馆实物效果最好
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
            <button onClick={() => setMatchState('crop')} style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 13,
              background: 'rgba(255,255,255,0.04)', color: '#D4AF6A',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              重新框选
            </button>
            <button onClick={handleReset} style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 13,
              background: 'rgba(255,255,255,0.04)', color: '#D4AF6A',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              换一张
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 6: 改 loading 文案与本地结果态标注**

loading 区 `正在匹配纹样...` → `AI 正在识别纹样...`。

本地 `results` 态底部说明行前加一行（在"本地特征匹配，结果仅供参考…"那行之前）：

```jsx
          {aiDown && (
            <div style={{ textAlign: 'center', color: '#E8A35D', fontSize: 12, marginTop: 12 }}>
              AI 识别不可用，已用本地匹配
            </div>
          )}
```

- [ ] **Step 7: lint + 测试**

```bash
npx eslint src/pages/PhotoMatchPage.jsx src/utils/vlmMatch.ts && npx vitest run
```

预期：无 error，测试全 PASS。

- [ ] **Step 8: Commit**

```bash
git add src/pages/PhotoMatchPage.jsx
git commit -m "feat(photo-match): VLM 识别接入，四结果态 + hash 兜底"
```

---

### Task 5: 服务器 nginx /vlm/ 反代上线

**Files:**
- Create: `deploy/nginx-wenmai-api.conf.template`（入 git）
- 服务器: `/etc/nginx/conf.d/wenmai-vlm-limit.conf`、`/etc/nginx/sites-available/wenmai-api`

前置：读 `.env.local` 拿 `VITE_STEPFUN_API_KEY` 的值（只在本地 shell 变量里用，不写入任何 git 文件）。

- [ ] **Step 1: 写脱敏模板**

`deploy/nginx-wenmai-api.conf.template`——内容 = 服务器当前 `/etc/nginx/sites-available/wenmai-api`（2026-08-27 CORS 修复版，含 `/auth/v1/` OPTIONS 直答），在 `# PostgREST — 数据` 注释前插入：

```nginx
    # VLM 反代 — Step Fun（key 只存服务器，bundle 零 key）
    location /vlm/ {
        limit_req zone=vlm burst=5 nodelay;
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "POST, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type";
            add_header Access-Control-Max-Age "86400";
            return 204;
        }
        proxy_pass https://api.stepfun.com/v1/;
        proxy_set_header Host api.stepfun.com;
        proxy_ssl_server_name on;
        proxy_set_header Authorization "Bearer <STEPFUN_KEY>";
        proxy_read_timeout 60s;
    }
```

- [ ] **Step 2: 写 limit_req zone 文件（本地暂存）**

本地 `/tmp/wenmai-vlm-limit.conf`：

```nginx
limit_req_zone $binary_remote_addr zone=vlm:10m rate=10r/m;
```

- [ ] **Step 3: 生成真实配置并部署**

```bash
cd /d/desktop/纹脉/wenmai
KEY=$(grep '^VITE_STEPFUN_API_KEY=' .env.local | cut -d= -f2-)
sed "s|<STEPFUN_KEY>|$KEY|" deploy/nginx-wenmai-api.conf.template > /tmp/wenmai-api.conf.real
scp -i ~/Downloads/me.pem /tmp/wenmai-api.conf.real /tmp/wenmai-vlm-limit.conf ubuntu@1.13.192.33:/tmp/
ssh -i ~/Downloads/me.pem ubuntu@1.13.192.33 "sudo cp /etc/nginx/sites-available/wenmai-api /etc/nginx/sites-available/wenmai-api.bak-vlm && sudo cp /tmp/wenmai-api.conf.real /etc/nginx/sites-available/wenmai-api && sudo cp /tmp/wenmai-vlm-limit.conf /etc/nginx/conf.d/wenmai-vlm-limit.conf && sudo nginx -t && sudo nginx -s reload && echo DEPLOYED"
```

预期：`nginx: configuration file ... test is successful` + `DEPLOYED`。

- [ ] **Step 4: curl 验证反代**

预检：

```bash
curl -s -i -X OPTIONS https://wenmai-api.ruoziqing.cn/vlm/chat/completions -H "Origin: https://wenmai.ruoziqing.cn" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type" | grep -iE "^HTTP|access-control"
```

预期：`204` + `Access-Control-Allow-Origin: *` + Allow-Headers 含 `Content-Type`。

真实调用（node 组装 body，避开 Windows curl 中文坑）：

```bash
node -e "const fs=require('fs');const b=fs.readFileSync('public/patterns/tuanlong.webp').toString('base64');fs.writeFileSync('/tmp/vlm-req.json',JSON.stringify({model:'step-3.7-flash',max_tokens:4000,messages:[{role:'user',content:[{type:'text',text:'识别图中的中国传统纹样。最终输出：答案：纹样名'},{type:'image_url',image_url:{url:'data:image/jpeg;base64,'+b}}]}]}))"
curl -s -m 60 -X POST https://wenmai-api.ruoziqing.cn/vlm/chat/completions -H "Content-Type: application/json" --data-binary @/tmp/vlm-req.json | head -c 400
```

预期：HTTP 200 的 JSON，含 `choices`（若 `usage`/`choices` 为空但 HTTP 200，看 `error` 字段——多数是 key 或模型名问题）。

- [ ] **Step 5: 验证限流**

```bash
for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code} " -X POST https://wenmai-api.ruoziqing.cn/vlm/chat/completions -H "Content-Type: application/json" -d '{}'; done; echo
```

预期：前几个 `400`（空 body 透传到 stepfun 报错），后面出现 `503`（limit_req 拦截）。等 1 分钟后单个请求恢复非 503。

- [ ] **Step 6: Commit 模板**

```bash
git add deploy/nginx-wenmai-api.conf.template
git commit -m "chore(deploy): wenmai-api nginx 模板入库存档（含 /vlm/ 反代与 /auth/v1 CORS 直答，key 脱敏）"
```

---

### Task 6: dev 全流程手测

前置：Task 1-5 全部完成（nginx 已上线）。

- [ ] **Step 1: 起 dev server 并打开页面**

```bash
cd /d/desktop/纹脉/wenmai && npm run dev
```

浏览器开 `http://localhost:5173/#/photo-match`。

- [ ] **Step 2: 三张代表图逐个测**

| 上传图 | 预期结果态 |
|---|---|
| 截屏 `public/patterns/tuanlong.webp` 的主体 | `exact`：大卡"AI 识别为 团龙纹" + 讲解 + 查看百科按钮能跳 `/pattern/dragon-4` |
| 任意山海经/异兽类纹样截图（`public/` 里 sj 系列或网上搜图） | `fuzzy`：候选列表可点击跳百科 |
| 无关照片（风景/人像） | `未收录`：显示 AI 名字（或"未能识别"）+ hash top3"相似参考" |

每张测完点"换一张"重置。

- [ ] **Step 3: VLM 失败路径**

DevTools → Network → 切 Offline → 上传一张图点"整图识别"。

预期：走本地结果页 + 橙字"AI 识别不可用，已用本地匹配"。测完切回 Online。

- [ ] **Step 4: 框选路径**

上传复合图（如青花瓷整器照片），框选纹样主体点"框选识别"。

预期：识别的是框内主体而非整图。

---

### Task 7: build + 部署 + 线上验证

**Files:**
- 服务器: `/var/www/wenmai`（整包替换）

- [ ] **Step 1: build**

```bash
cd /d/desktop/纹脉/wenmai && npm run build
```

预期：`dist/` 生成，无 TS/rollup 报错。

- [ ] **Step 2: 服务器端留回滚点**

```bash
ssh -i ~/Downloads/me.pem ubuntu@1.13.192.33 "rm -rf /var/www/wenmai-prev && cp -r /var/www/wenmai /var/www/wenmai-prev && echo BACKUP_OK"
```

预期：`BACKUP_OK`（359MB 本盘拷贝，约几十秒）。

- [ ] **Step 3: 上传新包**

```bash
cd /d/desktop/纹脉/wenmai && scp -r dist/* ubuntu@1.13.192.33:/var/www/wenmai/
```

预期：约 1 分钟（359MB）。

- [ ] **Step 4: 线上验证**

```bash
# 新 bundle 生效（index 引用新 hash 的 chunk）
curl -s https://wenmai.ruoziqing.cn/ | grep -oE 'assets/index-[^"]*\.js'
# bundle 里没有任何 Step Fun 域名/key 痕迹
JS=$(curl -s https://wenmai.ruoziqing.cn/ | grep -oE 'assets/index-[^"]*\.js' | head -1)
curl -s "https://wenmai.ruoziqing.cn/$JS" | grep -c "api.stepfun.com"
```

预期：第一条输出新 `index-<hash>.js`；第二条 `grep -c` = **0**。

- [ ] **Step 5: 手机实测**

手机浏览器开 `https://wenmai.ruoziqing.cn/#/photo-match`，拍/传一张纹样图走全流程（未登录也应能识别）。

- [ ] **Step 6: Commit（如有 deploy 目录新增）+ 汇报**

```bash
git status --short   # 确认无遗漏未提交文件
```

回滚预案（如线上异常）：

```bash
ssh -i ~/Downloads/me.pem ubuntu@1.13.192.33 "rm -rf /var/www/wenmai && cp -r /var/www/wenmai-prev /var/www/wenmai"
```

---

## Self-Review 记录

- 规格覆盖：架构（Task 2/3/5）、vlmMatch 改动（Task 1/2）、四结果态（Task 4）、nginx+limit_req+CORS（Task 5）、测试与部署与回滚（Task 6/7）——全覆盖
- 占位符：`<STEPFUN_KEY>` 是模板的刻意占位符；无 TBD/TODO
- 类型一致性：`VlmCallResult.candidates/explanation`、`parseVlmOutput().names/explanation`、`fileToCompressedBase64(file, crop)`、`matchResult.fuzzyMatches/primaryMatch/source` 各任务间已核对一致；`CropRect` 从 `./imageComparison` 导入
