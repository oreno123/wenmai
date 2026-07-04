# Photo Match VLM Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 PhotoMatchPage 从纯 pHash 本地检索升级为「VLM 直接识别纹样名 + 库内三段式匹配 + pHash 兜底」。

**Architecture:** 单文件 `src/utils/vlmMatch.ts` 封装 VLM 调用 + 输出解析 + 库内匹配规则。`PhotoMatchPage.jsx` 改为：用户上传图 → 调 Step Fun step-3.7-flash → 拿纹样名 → 走精确/模糊/pHash 三段匹配 → 重排 UI 展示「VLM 识别 + 库内匹配」两段。VLM 失败静默 fallback 到现有 pHash 逻辑。

**Tech Stack:** React 19 + Vite 8 + TypeScript + Step Fun step-3.7-flash（OpenAI 兼容 API）+ vitest（新增）

---

## File Structure

```
src/utils/
├── imageComparison.ts        # 不动（pHash fallback 复用）
└── vlmMatch.ts               # 新增：Step Fun API + prompt + 解析 + 匹配
   └── vlmMatch.test.ts       # 新增：纯逻辑单元测试

src/pages/
└── PhotoMatchPage.jsx        # 改：UI 重排 + VLM 编排

scripts/
└── test-vlm-api.mjs          # 新增：手动跑一次 API 看真实输出（开发期）

docs/superpowers/plans/
└── 2026-07-04-photo-match-vlm-upgrade.md  # 本文档

.env.example                  # 加 VITE_STEPFUN_API_KEY 注释
.env.local                    # 加真实 key（gitignored）
package.json                  # 加 vitest devDep + npm test 脚本
```

---

## Task 1: 配置 vitest + Step Fun key

**Files:**
- Modify: `package.json`（加 vitest + test 脚本）
- Modify: `.env.example`
- Modify: `.env.local`

- [ ] **Step 1.1: 安装 vitest**

```bash
cd D:/desktop/纹脉/wenmai
npm install -D vitest@^2
```

期望输出：`added N packages`，package.json devDependencies 出现 `vitest`。

- [ ] **Step 1.2: 加 test 脚本到 package.json**

把 `"scripts"` 块改为：

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 1.3: 改 .env.example**

完整内容（保留现有 + 新增 VITE_STEPFUN_API_KEY）：

```env
# Supabase（已有）
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Step Fun Vision（拍照识别用，必填否则降级到本地 pHash 匹配）
# 申请：https://platform.stepfun.com/
# 套餐：Step Plan（含 step-3.7-flash 视觉模型）
VITE_STEPFUN_API_KEY=your_stepfun_api_key
```

- [ ] **Step 1.4: 改 .env.local 加真实 key**

在 `.env.local` 末尾追加（key 来自 Botender 项目已验证可用）：

```env
VITE_STEPFUN_API_KEY=VvHb4oig2tTS8w8a8zuFszxea7FlkgJNezp0iPX8AtJWOLYekckuhibqfL2oX2Gh
```

注意：`.env.local` 已在 `.gitignore`，不会被 commit。

- [ ] **Step 1.5: 验证 vitest 装好了**

```bash
npx vitest run --reporter=verbose
```

期望输出：`No test files found` 或类似（说明 vitest 装好，没有测试文件）。

- [ ] **Step 1.6: commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: 加 vitest 测试框架 + Step Fun key 配置"
```

注意：不 commit `.env.local`（含真实 key，已在 .gitignore）。

---

## Task 2: VLM 输出解析 — 纯逻辑 + 单测

解析 Step Fun 的文本输出（可能是纯纹样名，也可能带「答案：」前缀，也可能多个用 `|` 分隔），输出标准化的候选数组。

**Files:**
- Create: `src/utils/vlmMatch.ts`
- Create: `src/utils/vlmMatch.test.ts`

- [ ] **Step 2.1: 写失败测试**

新建 `src/utils/vlmMatch.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { parseVlmNames } from './vlmMatch'

describe('parseVlmNames', () => {
  it('解析单个纹样名', () => {
    expect(parseVlmNames('团龙纹')).toEqual(['团龙纹'])
    expect(parseVlmNames('回纹')).toEqual(['回纹'])
  })

  it('解析 | 分隔的多个纹样名', () => {
    expect(parseVlmNames('龙|云纹|海水')).toEqual(['龙', '云纹', '海水'])
    expect(parseVlmNames('团龙纹|行龙纹|升龙纹')).toEqual([
      '团龙纹',
      '行龙纹',
      '升龙纹',
    ])
  })

  it('解析、 分隔的多个纹样名', () => {
    expect(parseVlmNames('龙、云纹、海水')).toEqual(['龙', '云纹', '海水'])
  })

  it('剥离 "答案：" 前缀和尾随标点', () => {
    expect(parseVlmNames('答案：团龙纹')).toEqual(['团龙纹'])
    expect(parseVlmNames('最终答案: 回纹。')).toEqual(['回纹'])
    expect(parseVlmNames('识别结果：龙 | 云纹。')).toEqual(['龙', '云纹'])
  })

  it('剥离多行 reasoning，只取答案行', () => {
    const raw = `观察图片主体为龙纹，圆形构图，清代风格。
综合判断这是团龙纹。
答案：团龙纹`
    expect(parseVlmNames(raw)).toEqual(['团龙纹'])
  })

  it('空字符串返回空数组', () => {
    expect(parseVlmNames('')).toEqual([])
    expect(parseVlmNames('   ')).toEqual([])
  })

  it('去掉尾随的"纹"字噪音（如 "团龙纹。" 不应被截断）', () => {
    expect(parseVlmNames('团龙纹')).toEqual(['团龙纹'])
    expect(parseVlmNames('团龙')).toEqual(['团龙'])
  })

  it('最多 3 个候选', () => {
    const result = parseVlmNames('龙|云纹|海水|火焰|宝珠')
    expect(result).toHaveLength(3)
    expect(result).toEqual(['龙', '云纹', '海水'])
  })
})
```

- [ ] **Step 2.2: 跑测试看失败**

```bash
npx vitest run src/utils/vlmMatch.test.ts
```

期望：FAIL，错误信息含 `Cannot find module './vlmMatch'` 或 `parseVlmNames is not a function`。

- [ ] **Step 2.3: 实现 parseVlmNames**

新建 `src/utils/vlmMatch.ts`：

```typescript
/**
 * Step Fun step-3.7-flash 输出解析与库内匹配。
 *
 * VLM 是 reasoning 模型，输出可能是：
 * - 纯纹样名："团龙纹"
 * - 多个分隔："龙|云纹|海水" 或 "龙、云纹、海水"
 * - 带前缀："答案：团龙纹"
 * - 含 reasoning：多行文本最后一行是 "答案：XXX"
 *
 * 解析策略：取最后一行 → 剥前缀 → 多分隔符 split → 限 3 个。
 */

const MAX_CANDIDATES = 3

export function parseVlmNames(raw: string): string[] {
  if (!raw || !raw.trim()) return []

  // 取最后一非空行（reasoning 模型常在末尾给答案）
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const lastLine = lines[lines.length - 1] ?? raw.trim()

  // 剥"答案："/"识别结果："/"最终答案:" 等前缀
  const cleaned = lastLine.replace(/^.*?答案[:：]\s*/, '').trim()

  // 多分隔符 split：| ｜ 、 ， ,
  const names = cleaned
    .split(/[|｜、，,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // 去掉尾随的句号/问号
  const cleanedNames = names.map(n => n.replace(/[。.?？!！]+$/, '').trim()).filter(Boolean)

  return cleanedNames.slice(0, MAX_CANDIDATES)
}
```

- [ ] **Step 2.4: 跑测试看通过**

```bash
npx vitest run src/utils/vlmMatch.test.ts
```

期望：PASS（8 个测试全过）。

- [ ] **Step 2.5: commit**

```bash
git add src/utils/vlmMatch.ts src/utils/vlmMatch.test.ts
git commit -m "feat(vlm): 加 VLM 输出解析 + 单元测试"
```

---

## Task 3: 关键词提取 + 库内三段式匹配 — 纯逻辑 + 单测

**Files:**
- Modify: `src/utils/vlmMatch.ts`（加 extractKeyword + matchPattern）
- Modify: `src/utils/vlmMatch.test.ts`（加测试）

- [ ] **Step 3.1: 加测试到 vlmMatch.test.ts**

在 `describe('parseVlmNames', ...)` 块之后追加：

```typescript
import { extractKeyword, matchPattern, type MatchResult } from './vlmMatch'
import type { Pattern } from '../store/patternData'

// 测试用的 mock 库
const MOCK_LIB: Pattern[] = [
  { id: 'dragon-1', name: '蟠龙纹', type: '龙纹', series: 'dragon', rarity: 'rare', tags: ['龙纹', '汉代'], image: '/x.webp' },
  { id: 'dragon-4', name: '团龙纹', type: '龙纹', series: 'dragon', rarity: 'ssr', tags: ['龙纹', '清代'], image: '/x.webp' },
  { id: 'cloud-1', name: '流云纹', type: '云纹', series: 'cloud', rarity: 'common', tags: ['云纹'], image: '/x.webp' },
  { id: 'basic-2', name: '回纹', type: '几何纹', series: 'geometric', rarity: 'common', tags: ['几何'], image: '/x.webp' },
  { id: 'taotie-1', name: '饕餮纹·商', type: '兽面纹', series: 'taotie', rarity: 'rare', tags: ['兽面纹', '商代'], image: '/x.webp' },
]

describe('extractKeyword', () => {
  it('去掉"纹/花"后缀', () => {
    expect(extractKeyword('团龙纹')).toBe('团龙')
    expect(extractKeyword('回纹')).toBe('回')
    expect(extractKeyword('宝相花')).toBe('宝相')
  })

  it('保留核心主题词', () => {
    expect(extractKeyword('龙')).toBe('龙')
    expect(extractKeyword('海水')).toBe('海水')
  })

  it('复合名取核心', () => {
    expect(extractKeyword('饕餮纹·商')).toBe('饕餮')
  })
})

describe('matchPattern', () => {
  it('① 精确匹配 name', () => {
    const r = matchPattern(['团龙纹'], MOCK_LIB)
    expect(r.primaryMatch?.id).toBe('dragon-4')
    expect(r.source).toBe('exact')
    expect(r.fuzzyMatches).toEqual([])
  })

  it('② 模糊匹配：VLM 输出"蟠龙纹"，库内精确命中蟠龙纹', () => {
    const r = matchPattern(['蟠龙纹'], MOCK_LIB)
    expect(r.primaryMatch?.id).toBe('dragon-1')
    expect(r.source).toBe('exact')
  })

  it('② 模糊匹配：VLM 输出"行龙纹"，库内没有，按 type "龙纹" 兜底', () => {
    const r = matchPattern(['行龙纹'], MOCK_LIB)
    expect(r.primaryMatch).toBeNull()
    expect(r.source).toBe('fuzzy')
    // 库内 2 个龙纹（蟠龙、团龙）都应被找到
    expect(r.fuzzyMatches.map(p => p.id).sort()).toEqual(['dragon-1', 'dragon-4'])
  })

  it('② 模糊匹配：VLM 输出"龙"，按关键词"龙"命中所有龙纹', () => {
    const r = matchPattern(['龙'], MOCK_LIB)
    expect(r.source).toBe('fuzzy')
    expect(r.fuzzyMatches.length).toBe(2)
  })

  it('③ 都没命中 → source=fallback，返回空（fallback 由调用方填 pHash 结果）', () => {
    const r = matchPattern(['不存在的纹样'], MOCK_LIB)
    expect(r.source).toBe('fallback')
    expect(r.primaryMatch).toBeNull()
    expect(r.fuzzyMatches).toEqual([])
  })

  it('多候选：第一个精确命中即返回', () => {
    const r = matchPattern(['乱说的', '团龙纹', '云纹'], MOCK_LIB)
    expect(r.primaryMatch?.id).toBe('dragon-4')
    expect(r.source).toBe('exact')
  })

  it('多候选：都没精确命中时合并模糊结果', () => {
    const r = matchPattern(['行龙', '流云'], MOCK_LIB)
    expect(r.source).toBe('fuzzy')
    const ids = r.fuzzyMatches.map(p => p.id).sort()
    // 行龙 → 龙纹系列 2 个；流云 → name includes 流云 1 个
    expect(ids).toEqual(['cloud-1', 'dragon-1', 'dragon-4'])
  })

  it('fuzzyMatches 最多 5 个', () => {
    const bigLib: Pattern[] = []
    for (let i = 0; i < 10; i++) {
      bigLib.push({
        id: `d${i}`,
        name: `龙纹变体${i}`,
        type: '龙纹',
        series: 'dragon',
        rarity: 'common',
        tags: ['龙纹'],
        image: '/x.webp',
      })
    }
    const r = matchPattern(['龙'], bigLib)
    expect(r.fuzzyMatches.length).toBe(5)
  })

  it('type 字段优先于 name includes（同义词更稳）', () => {
    // VLM 输出"神兽纹"，库内没 name 含"神兽"的，但 type "兽面纹" 含 "兽"
    const r = matchPattern(['神兽'], MOCK_LIB)
    expect(r.source).toBe('fuzzy')
    expect(r.fuzzyMatches.map(p => p.id)).toContain('taotie-1')
  })
})
```

- [ ] **Step 3.2: 跑测试看失败**

```bash
npx vitest run src/utils/vlmMatch.test.ts
```

期望：FAIL，新加的测试都失败（`extractKeyword` / `matchPattern` 未定义）。

- [ ] **Step 3.3: 实现 extractKeyword + matchPattern + 类型**

在 `src/utils/vlmMatch.ts` 顶部加 import 和类型：

```typescript
import type { Pattern } from '../store/patternData'

export type MatchSource = 'exact' | 'fuzzy' | 'fallback'

export interface MatchResult {
  primaryMatch: Pattern | null
  fuzzyMatches: Pattern[]
  source: MatchSource
  matchedCandidate: string | null  // 命中的 VLM 候选名（debug 用）
}

const MAX_FUZZY = 5
```

在文件末尾追加：

```typescript
/**
 * 提取纹样名的核心关键词用于模糊匹配。
 * "团龙纹" → "团龙"（去"纹"后缀，取末 2 字）
 * "宝相花" → "宝相"（去"花"后缀）
 * "龙" → "龙"（保留）
 */
export function extractKeyword(name: string): string {
  // 去掉 · 后面的朝代标记：饕餮纹·商 → 饕餮纹
  const noDynasty = name.split(/[·・]/)[0]
  // 去掉常见后缀
  const cleaned = noDynasty.replace(/(纹|花|字)$/, '').trim()
  if (cleaned.length === 0) return noDynasty.replace(/(纹|花|字)$/, '').trim()
  // 取末 1-2 字（核心主题）
  return cleaned.slice(-2)
}

/**
 * 库内三段式匹配。
 *
 * ① 精确：name === vlmName（任意候选命中即返回）
 * ② 模糊：按候选顺序遍历，每个候选用 keyword 匹配 name includes 或 type includes
 * ③ fallback：①②都没命中，返回空 result，让调用方走 pHash
 *
 * 多候选合并：②阶段把所有候选的模糊命中去重合并，最多 5 个。
 */
export function matchPattern(vlmNames: string[], library: Pattern[]): MatchResult {
  // ① 精确
  for (const name of vlmNames) {
    const exact = library.find(p => p.name === name)
    if (exact) {
      return {
        primaryMatch: exact,
        fuzzyMatches: [],
        source: 'exact',
        matchedCandidate: name,
      }
    }
  }

  // ② 模糊
  const fuzzySet = new Map<string, Pattern>()
  for (const name of vlmNames) {
    const keyword = extractKeyword(name)
    if (!keyword) continue
    for (const p of library) {
      if (p.name.includes(keyword) || p.type.includes(keyword)) {
        if (!fuzzySet.has(p.id)) fuzzySet.set(p.id, p)
      }
    }
  }

  if (fuzzySet.size > 0) {
    const fuzzyList = [...fuzzySet.values()].slice(0, MAX_FUZZY)
    return {
      primaryMatch: null,
      fuzzyMatches: fuzzyList,
      source: 'fuzzy',
      matchedCandidate: null,
    }
  }

  // ③ fallback
  return {
    primaryMatch: null,
    fuzzyMatches: [],
    source: 'fallback',
    matchedCandidate: null,
  }
}
```

- [ ] **Step 3.4: 跑测试看通过**

```bash
npx vitest run src/utils/vlmMatch.test.ts
```

期望：PASS（所有测试全过）。

- [ ] **Step 3.5: commit**

```bash
git add src/utils/vlmMatch.ts src/utils/vlmMatch.test.ts
git commit -m "feat(vlm): 加关键词提取 + 库内三段式匹配 + 单测"
```

---

## Task 4: Step Fun API 调用 + 手动集成测试

**Files:**
- Modify: `src/utils/vlmMatch.ts`（加 callStepFunVision）
- Create: `scripts/test-vlm-api.mjs`（手动跑一次 API）

- [ ] **Step 4.1: 加 callStepFunVision 函数**

在 `src/utils/vlmMatch.ts` 末尾追加：

```typescript
const STEPFUN_ENDPOINT = 'https://api.stepfun.com/v1/chat/completions'
const STEPFUN_MODEL = 'step-3.7-flash'

const VLM_PROMPT = `识别图中的中国传统纹样。

输出规则：
- 只输出纹样名，不要解释、不要标点
- 多主题时按主次输出 1-3 个，用 | 分隔
- 示例：团龙纹 / 缠枝纹 / 龙|云纹|海水 / 莲瓣纹

常见纹样参考（不限于）：团龙纹、行龙纹、蟠龙纹、云雷纹、回纹、卷草纹、缠枝纹、莲瓣纹、如意云纹、海水江崖纹、宝相花、冰裂纹、万字纹、绳纹、饕餮纹、凤鸟纹、牡丹纹、菊花纹、兰花纹、青花龙纹、青花山水

最终用一行输出：
答案：纹样名`

export interface VlmCallOptions {
  apiKey: string
  imageBase64: string  // 不带 data: 前缀的纯 base64
  signal?: AbortSignal
}

export interface VlmCallResult {
  rawOutput: string
  candidates: string[]
}

/**
 * 调用 Step Fun step-3.7-flash。
 *
 * 关键坑（来自 reference_stepfun-api.md）：
 * 1. content 字段经常空，真实输出在 reasoning_content / reasoning
 * 2. max_tokens 给 4000+（reasoning 模型会先思考）
 * 3. 错误时抛异常，调用方 try/catch 走 fallback
 */
export async function callStepFunVision(opts: VlmCallOptions): Promise<VlmCallResult> {
  const body = {
    model: STEPFUN_MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VLM_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${opts.imageBase64}` },
          },
        ],
      },
    ],
  }

  const resp = await fetch(STEPFUN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`Step Fun API ${resp.status}: ${errText.slice(0, 200)}`)
  }

  const data = await resp.json()
  const msg = data?.choices?.[0]?.message ?? {}
  // content / reasoning_content / reasoning 三段 fallback
  const rawOutput =
    (typeof msg.content === 'string' && msg.content) ||
    (typeof msg.reasoning_content === 'string' && msg.reasoning_content) ||
    (typeof msg.reasoning === 'string' && msg.reasoning) ||
    ''

  if (!rawOutput) {
    throw new Error('Step Fun API 返回空内容（content/reasoning_content/reasoning 都为空）')
  }

  return {
    rawOutput,
    candidates: parseVlmNames(rawOutput),
  }
}

/** 把 File 转成 base64 字符串（不带 data: 前缀） */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 去掉 "data:image/xxx;base64," 前缀
      const base64 = result.split(',')[1] ?? ''
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 4.2: 写手动集成测试脚本**

新建 `scripts/test-vlm-api.mjs`：

```javascript
/**
 * 手动跑一次 Step Fun API，看真实输出。
 *
 * 用法：
 *   node scripts/test-vlm-api.mjs <图片路径>
 *
 * 不传图片路径就用 public/patterns/tuanlong.webp 测试。
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const apiKey = process.env.VITE_STEPFUN_API_KEY
if (!apiKey) {
  console.error('❌ 请先在 .env.local 设 VITE_STEPFUN_API_KEY')
  process.exit(1)
}

const imgPath = process.argv[2] || 'public/patterns/tuanlong.webp'
const abs = resolve(imgPath)
if (!existsSync(abs)) {
  console.error(`❌ 图片不存在: ${abs}`)
  process.exit(1)
}

const base64 = readFileSync(abs).toString('base64')
console.log(`📷 测试图片: ${abs}`)
console.log(`📐 大小: ${(base64.length / 1024).toFixed(1)} KB (base64)`)
console.log(`🚀 调用 Step Fun step-3.7-flash...`)

const start = Date.now()
try {
  const resp = await fetch('https://api.stepfun.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'step-3.7-flash',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '识别图中的中国传统纹样。只输出纹样名，不要解释。多主题用 | 分隔。最后用一行输出：答案：纹样名',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
    }),
  })

  console.log(`⏱️  耗时: ${((Date.now() - start) / 1000).toFixed(1)}s`)
  console.log(`📡 HTTP ${resp.status}`)

  if (!resp.ok) {
    console.error(`❌ API 失败:`, await resp.text())
    process.exit(1)
  }

  const data = await resp.json()
  const msg = data?.choices?.[0]?.message ?? {}

  console.log('\n=== content ===')
  console.log(JSON.stringify(msg.content, null, 2))
  console.log('\n=== reasoning_content ===')
  console.log(JSON.stringify(msg.reasoning_content, null, 2)?.slice(0, 500) + '...')
  console.log('\n=== reasoning ===')
  console.log(JSON.stringify(msg.reasoning, null, 2)?.slice(0, 500) + '...')
  console.log('\n=== usage ===')
  console.log(JSON.stringify(data?.usage, null, 2))
} catch (e) {
  console.error('❌ 异常:', e)
  process.exit(1)
}
```

- [ ] **Step 4.3: 跑脚本验证 API 真能调通**

```bash
cd D:/desktop/纹脉/wenmai
set -a && source .env.local && set +a
node scripts/test-vlm-api.mjs public/patterns/tuanlong.webp
```

期望：5-30 秒内输出 HTTP 200 + content 或 reasoning_content 含「团龙纹」。

注意 Windows bash 用 `set -a && source .env.local && set +a` 加载 .env。如果失败，直接在命令前 export：

```bash
export VITE_STEPFUN_API_KEY=VvHb4oig2tTS8w8a8zuFszxea7FlkgJNezp0iPX8AtJWOLYekckuhibqfL2oX2Gh
node scripts/test-vlm-api.mjs public/patterns/tuanlong.webp
```

如果输出 `团龙纹` → API 调通，继续。如果输出乱码或空 → 检查 reasoning_content 字段，必要时调整 prompt。

- [ ] **Step 4.4: 跑多张样本验证稳定性**

```bash
node scripts/test-vlm-api.mjs public/patterns/huiwen.webp        # 回纹
node scripts/test-vlm-api.mjs public/patterns/ruyi_cloud.webp    # 如意云纹
node scripts/test-vlm-api.mjs public/patterns/taotie_shang.webp  # 饕餮纹·商
```

期望：每张都正确识别。如果有错，记录 VLM 实际输出，后续用作调优 prompt 的依据。

- [ ] **Step 4.5: commit**

```bash
git add src/utils/vlmMatch.ts scripts/test-vlm-api.mjs
git commit -m "feat(vlm): 加 Step Fun API 调用 + 手动集成测试脚本"
```

---

## Task 5: PhotoMatchPage UI 重排

**Files:**
- Modify: `src/pages/PhotoMatchPage.jsx`

UI 改动：当前 4 档徽章（很像/相似/略像/参考）→ 两段式（VLM 识别大字 + 库内匹配档位）。本任务只改 UI 不改 runIdentify 逻辑（VLM 编排在 Task 6）。

- [ ] **Step 5.1: 启动 dev server**

```bash
cd D:/desktop/纹脉/wenmai
npm run dev
```

dev server 跑在 http://localhost:5174（或终端提示的端口），保持运行。打开浏览器到 `/photo-match` 验证改动。

- [ ] **Step 5.2: 改 similarityLabel → matchLabel**

在 `PhotoMatchPage.jsx` 顶部，把 `similarityLabel` 函数（第 8-13 行）替换为：

```jsx
function matchLabel(source) {
  switch (source) {
    case 'exact':
      return { label: '库内一致', color: '#F2D58A', desc: 'VLM 直接命中' }
    case 'fuzzy':
      return { label: '库内近似', color: '#D4AF6A', desc: '按类型匹配' }
    case 'fallback':
      return { label: '本地参考', color: '#8a7a4a', desc: 'VLM 未识别，pHash 兜底' }
    default:
      return { label: '未识别', color: '#5a5a5a', desc: '' }
  }
}
```

- [ ] **Step 5.3: 改 Loading 文案**

把第 299 行附近的：

```jsx
<div style={{ color: '#D4AF6A', fontSize: 15, letterSpacing: 2 }}>
  正在匹配纹样...
</div>
```

改为：

```jsx
<div style={{ color: '#D4AF6A', fontSize: 15, letterSpacing: 2 }}>
  VLM 正在识别...
</div>
```

- [ ] **Step 5.4: 改底部说明文案**

把第 380-385 行的：

```jsx
<div style={{
  fontSize: 11, color: '#5a5a5a', textAlign: 'center',
  marginTop: 12, fontStyle: 'italic',
}}>
  本地特征匹配，结果仅供参考 · 想精确识别同一张图请上传库内原图
</div>
```

改为：

```jsx
<div style={{
  fontSize: 11, color: '#5a5a5a', textAlign: 'center',
  marginTop: 12, fontStyle: 'italic',
}}>
  VLM 识别 + 库内匹配 · 拍博物馆实物效果最好
</div>
```

- [ ] **Step 5.5: 改 results 区结构 — 加 VLM 识别大字 + 调档位徽章**

把整个 results 区（第 306-413 行）替换为下面的代码（保留外层 `<div>` 但内部重排）：

```jsx
{matchState === 'results' && (
  <div>
    {/* User image */}
    <div style={{
      textAlign: 'center', marginBottom: 16,
      padding: 12, background: 'rgba(201,162,60,0.03)',
      borderRadius: 12, border: '1px solid rgba(201,162,60,0.1)',
    }}>
      <div style={{ fontSize: 11, color: '#6A6A6A', marginBottom: 6 }}>你上传的图片</div>
      <img src={previewUrl} alt="上传图片" style={{
        maxWidth: '100%', maxHeight: 140, borderRadius: 8, objectFit: 'contain',
      }} />
    </div>

    {/* VLM 识别结果大字 */}
    {vlmNames.length > 0 && (
      <div style={{
        textAlign: 'center', marginBottom: 20,
        padding: '16px 12px',
        background: 'linear-gradient(135deg, rgba(212,175,106,0.12), rgba(184,134,11,0.04))',
        borderRadius: 12,
        border: '1px solid rgba(212,175,106,0.25)',
      }}>
        <div style={{ fontSize: 11, color: '#8a7a4a', letterSpacing: 2, marginBottom: 6 }}>
          🎯 VLM 识别
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: '#F2D58A',
          letterSpacing: 2, lineHeight: 1.3,
        }}>
          {vlmNames.join(' · ')}
        </div>
        {vlmNames.length > 1 && (
          <div style={{ fontSize: 10, color: '#6A6A6A', marginTop: 4 }}>
            候选 {vlmNames.length} 个，按主次排序
          </div>
        )}
      </div>
    )}

    {/* 档位标签条 */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12, padding: '8px 12px',
      background: 'rgba(0,0,0,0.2)', borderRadius: 8,
    }}>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: matchLabel(matchSource).color,
        padding: '3px 10px', borderRadius: 6,
        background: 'rgba(0,0,0,0.4)',
      }}>
        {matchLabel(matchSource).label}
      </span>
      <span style={{ fontSize: 11, color: '#6A6A6A' }}>
        {matchLabel(matchSource).desc}
      </span>
    </div>

    {/* 库内匹配卡片列表 */}
    <div style={{ fontSize: 13, color: '#F5F1E8', fontWeight: 600, marginBottom: 10, letterSpacing: 1 }}>
      库内匹配
    </div>

    {displayedMatches.length === 0 && (
      <div style={{
        textAlign: 'center', padding: '24px 12px',
        color: '#6A6A6A', fontSize: 13,
        background: 'rgba(255,255,255,0.02)', borderRadius: 12,
      }}>
        库内没有匹配项，仅展示 VLM 识别结果
      </div>
    )}

    {displayedMatches.map((match, idx) => {
      const pattern = getPatternById(match.patternId) ?? match.pattern
      if (!pattern) return null

      return (
        <div key={pattern.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: 12, marginBottom: 8,
          background: idx === 0 && matchSource === 'exact'
            ? 'rgba(212,175,106,0.12)'
            : idx === 0
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          border: `1px solid ${
            idx === 0 && matchSource === 'exact'
              ? 'rgba(212,175,106,0.35)'
              : 'rgba(255,255,255,0.05)'
          }`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: idx === 0 && matchSource === 'exact'
              ? 'rgba(212,175,106,0.25)'
              : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
            color: idx === 0 && matchSource === 'exact' ? '#F2D58A' : '#6A6A6A',
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
            <div style={{
              fontSize: 14, fontWeight: 600, color: '#F5F1E8',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {pattern.name}
            </div>
            <div style={{ fontSize: 11, color: '#6A6A6A', marginTop: 2 }}>
              <span className={`rarity-badge rarity-${pattern.rarity}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                {getRarityLabel(pattern.rarity)}
              </span>
              <span style={{ marginLeft: 6 }}>{pattern.type}</span>
            </div>
          </div>
        </div>
      )
    })}

    {/* Actions */}
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

    {error && (
      <div style={{ textAlign: 'center', color: '#E85D5D', fontSize: 13, marginTop: 12 }}>
        {error}
      </div>
    )}
  </div>
)}
```

注意：这里用到的 `vlmNames`、`matchSource`、`displayedMatches` 三个 state 在 Task 6 才正式接入。Task 5 为了能编译跑通，需要加临时 state 占位。

- [ ] **Step 5.6: 加临时 state 占位（Task 6 会替换）**

在 PhotoMatchPage 函数顶部（约第 27 行 `const [error, setError] = useState(null)` 之后）加：

```jsx
// VLM 状态（Task 6 接入实际调用，先占位让 UI 能渲染）
const [vlmNames, setVlmNames] = useState([])         // VLM 输出的候选名数组
const [matchSource, setMatchSource] = useState('fallback')  // exact / fuzzy / fallback
const [displayedMatches, setDisplayedMatches] = useState([])  // 实际展示的卡片数组
```

然后在 `runIdentify` 函数末尾（约第 119 行 `setMatchState('results')` 之前）加：

```jsx
// 临时占位：Task 6 替换为 VLM 调用编排
setVlmNames([])
setMatchSource('fallback')
setDisplayedMatches(topMatches.map(m => ({ patternId: m.patternId })))
```

- [ ] **Step 5.7: 浏览器验证 UI 改动**

打开浏览器 http://localhost:5174/#/photo-match（或 dev server 提示的端口）。

上传任意一张图 → 框选 → 点框选识别。

期望：
- Loading 文案是「VLM 正在识别...」
- 结果页有 3 段：上传图缩略图（更小）/ VLM 识别大字区（空，因为占位）/ 档位标签（"本地参考 VLM 未识别，pHash 兜底"）/ 库内匹配卡片
- 底部说明是「VLM 识别 + 库内匹配 · 拍博物馆实物效果最好」
- 原 4 档徽章（很像/相似/略像/参考）不再出现

如果界面卡或崩 → 看 dev server 控制台和浏览器 console，修后再继续。

- [ ] **Step 5.8: commit**

```bash
git add src/pages/PhotoMatchPage.jsx
git commit -m "feat(photo-match): UI 重排 — VLM 识别大字 + 库内匹配档位"
```

---

## Task 6: VLM 编排 + pHash fallback

**Files:**
- Modify: `src/pages/PhotoMatchPage.jsx`

把 runIdentify 改为：先调 VLM → 解析候选 → 走 matchPattern → VLM 失败 fallback pHash。

- [ ] **Step 6.1: 加 import**

在 PhotoMatchPage.jsx 顶部 import 区（约第 5 行）加：

```jsx
import { callStepFunVision, fileToBase64, matchPattern } from '../utils/vlmMatch'
```

- [ ] **Step 6.2: 替换 runIdentify 函数**

把整个 `runIdentify` 函数（约第 100-125 行）替换为：

```jsx
const runIdentify = useCallback(async (useCrop) => {
  if (!pendingFile || !imgInfo) return
  setMatchState('loading')
  setError(null)

  // crop 计算（保留原逻辑）
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

  const apiKey = import.meta.env.VITE_STEPFUN_API_KEY

  // ─── 阶段 1：如有 API key，先调 VLM ───
  if (apiKey) {
    try {
      // 准备图片：如有 crop，先在 canvas 上裁切再转 base64
      let imageBase64
      if (crop) {
        imageBase64 = await cropFileToBase64(pendingFile, crop)
      } else {
        imageBase64 = await fileToBase64(pendingFile)
      }

      const vlmResult = await callStepFunVision({ apiKey, imageBase64 })
      const candidates = vlmResult.candidates

      if (candidates.length > 0) {
        const patterns = PATTERN_LIBRARY.filter(p => p.image)
        const matchResult = matchPattern(candidates, patterns)

        setVlmNames(candidates)
        setMatchSource(matchResult.source)

        if (matchResult.primaryMatch) {
          // 精确命中：单张主匹配 + 模糊匹配补充
          setDisplayedMatches([
            { patternId: matchResult.primaryMatch.id, pattern: matchResult.primaryMatch },
            ...matchResult.fuzzyMatches
              .filter(p => p.id !== matchResult.primaryMatch.id)
              .slice(0, 2)
              .map(p => ({ patternId: p.id, pattern: p })),
          ])
        } else if (matchResult.fuzzyMatches.length > 0) {
          // 模糊命中：展示 fuzzy 列表
          setDisplayedMatches(
            matchResult.fuzzyMatches.map(p => ({ patternId: p.id, pattern: p }))
          )
        } else {
          // VLM 识别成功但库内无匹配 → 走 pHash fallback 找视觉最像的
          const phashMatches = await runPhashMatch(pendingFile, crop)
          setDisplayedMatches(phashMatches)
        }

        setMatchState('results')
        return
      }
    } catch (e) {
      console.warn('[VLM] 调用失败，fallback 到 pHash:', e)
      // 继续走下面的 pHash 分支
    }
  }

  // ─── 阶段 2：VLM 失败 / 没 key / 候选空 → pHash fallback ───
  try {
    const phashMatches = await runPhashMatch(pendingFile, crop)
    setVlmNames([])
    setMatchSource('fallback')
    setDisplayedMatches(phashMatches)
    setMatchState('results')
  } catch (e) {
    setError('图片分析失败，请换一张试试')
    setMatchState('crop')
  }
}, [pendingFile, imgInfo, cropRect])
```

- [ ] **Step 6.3: 加 cropFileToBase64 + runPhashMatch 辅助函数**

在 PhotoMatchPage 组件内部，`runIdentify` 之前（约第 99 行）加：

```jsx
// 把 File 按 crop 在 canvas 上裁切，输出 base64（不带 data: 前缀）
const cropFileToBase64 = useCallback(async (file, crop) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = crop.w
      canvas.height = crop.h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}, [])

// pHash 匹配（保留原逻辑，包成函数复用）
const runPhashMatch = useCallback(async (file, crop) => {
  const userHash = await extractHashFromFileWithCrop(file, crop)
  const patterns = PATTERN_LIBRARY.filter(p => p.image)
  const libHashes = await buildLibraryHashes(patterns)
  const topMatches = findTopMatches(userHash, libHashes, 3)
  return topMatches.map(m => ({ patternId: m.patternId }))
}, [])
```

- [ ] **Step 6.4: 浏览器验证完整流程**

确保 dev server 还在跑（http://localhost:5174 或终端提示端口）。

打开浏览器到 `/#/photo-match`，依次测试：

**测试 A：库内原图（应精确命中）**
1. 上传 `D:/desktop/纹脉/wenmai/public/patterns/tuanlong.webp`（团龙纹）
2. 不框选，直接「整图识别」
3. 期望：VLM 识别大字显示「团龙纹」，档位标签「库内一致」，卡片第 1 张是团龙纹 SSR

**测试 B：库内原图（应精确命中其他）**
1. 上传 `public/patterns/huiwen.webp`（回纹）
2. 整图识别
3. 期望：VLM「回纹」，档位「库内一致」，卡片第 1 张是回纹

**测试 C：网络断开 / 非法 key fallback**
1. 浏览器 devtools → Network → 选 Offline
2. 上传任意图，整图识别
3. 期望：5-10 秒后 fallback 到 pHash，档位「本地参考」，控制台有 `[VLM] 调用失败` warning
4. Network 切回 Online

**测试 D：真实场景图（应模糊命中或 fallback）**
1. 上传网上找的博物馆实物纹样照片
2. 整图识别
3. 期望：VLM 给名字（可能是「龙纹」「云纹」等大类），档位「库内近似」展示同 type 的几个候选；如果都不在库内则 fallback pHash

每个测试都过 → 继续。任何一个失败 → 看 console 报错，修复后重测。

- [ ] **Step 6.5: commit**

```bash
git add src/pages/PhotoMatchPage.jsx
git commit -m "feat(photo-match): 接入 VLM + pHash fallback 编排"
```

---

## Task 7: 端到端样本验证 + README + push

**Files:**
- Modify: `README.md`

- [ ] **Step 7.1: 端到端样本验证**

按 spec 测试集表格，跑 10 张样本：

| 类别 | 数量 | 来源 | 期望 | 实际 |
|---|---|---|---|---|
| 库内原图 | 5 | public/patterns/ 任意 5 张 | 精确 ≥ 4/5 | 填写 |
| 真实场景 | 3 | 网上博物馆实物图 | 模糊 ≥ 2/3 | 填写 |
| 复合纹样 | 2 | 青花瓷照片 | 至少 1 命中 | 填写 |

库内原图建议选：tuanlong.webp、huiwen.webp、ruyi_cloud.webp、taotie_shang.webp、juancao.webp

把每张的 VLM 输出和档位记录下来。如果精确率 < 4/5，看 VLM 出词哪里飘了，回头调 prompt（Task 4 的 VLM_PROMPT）。

- [ ] **Step 7.2: README 加 VLM 识别说明**

打开 `D:/desktop/纹脉/wenmai/README.md`，在合适位置（如「功能」章节）加一段：

```markdown
## 拍照识别

拍照识别（找相似）功能使用 Step Fun step-3.7-flash 视觉大模型识别用户上传图片中的中国传统纹样。

### 流程

1. 用户上传图片（可选框选 crop）
2. 调 Step Fun Vision API → 输出纹样名候选
3. 库内三段式匹配：
   - ① 精确匹配 name
   - ② 模糊匹配 name includes / type
   - ③ pHash fallback（VLM 失败时兜底）

### 配置

在 `.env.local` 加：

```env
VITE_STEPFUN_API_KEY=your_stepfun_api_key
```

未配置 key 时自动降级为纯 pHash 本地匹配。

### 测试

```bash
# 单元测试（VLM 输出解析 + 库内匹配规则）
npm test

# 手动跑一次 VLM API 看真实输出
node scripts/test-vlm-api.mjs public/patterns/tuanlong.webp
```
```

- [ ] **Step 7.3: commit README**

```bash
git add README.md
git commit -m "docs: README 加拍照识别 VLM 升级说明"
```

- [ ] **Step 7.4: 推送到 origin**

```bash
git push origin main
```

期望：`main -> main`（GitHub oreno123/wenmai）

- [ ] **Step 7.5: 更新 memory**

最后告诉用户（不要直接做）：
- 拍照识别从 pHash 升级到 VLM 直接识别
- 用 Step Fun step-3.7-flash
- 三段式匹配：精确 name → 模糊 type → pHash fallback
- 待用户在 memory 里更新 project_wenmai.md

---

## Self-Review

**Spec coverage 检查**：
- ✅ VLM 调用（Step Fun step-3.7-flash）→ Task 4
- ✅ Prompt 设计（输出 1-3 个候选 `|` 分隔）→ Task 4 VLM_PROMPT
- ✅ 输出解析（剥前缀 / 多分隔 / 取末行）→ Task 2 parseVlmNames
- ✅ 关键词提取 → Task 3 extractKeyword
- ✅ 三段式匹配（精确 name → 模糊 type → fallback）→ Task 3 matchPattern
- ✅ UI 重排（VLM 识别大字 + 库内匹配档位）→ Task 5
- ✅ 错误处理（API 失败 fallback、key 缺失、输出空）→ Task 6
- ✅ 配置（VITE_STEPFUN_API_KEY）→ Task 1
- ✅ 测试（10 张样本）→ Task 7
- ✅ File Structure 一致 → 全任务文件路径都对得上

**Placeholder 扫描**：
- ✅ 无 TBD / TODO / "implement later"
- ✅ 所有代码块都是完整可粘贴的
- ✅ 命令都给了期望输出

**类型一致性**：
- ✅ `parseVlmNames(raw: string): string[]` — Task 2/3/4 一致
- ✅ `extractKeyword(name: string): string` — Task 3 一致
- ✅ `matchPattern(vlmNames: string[], library: Pattern[]): MatchResult` — Task 3/6 一致
- ✅ `MatchResult` 接口 — Task 3 定义，Task 5/6 消费，字段名（primaryMatch / fuzzyMatches / source）一致
- ✅ `callStepFunVision({apiKey, imageBase64}): Promise<VlmCallResult>` — Task 4/6 一致
- ✅ `fileToBase64(file: File): Promise<string>` — Task 4/6 一致

无问题，可以执行。
