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

import type { Pattern } from '../store/patternData'

export type MatchSource = 'exact' | 'fuzzy' | 'fallback'

export interface MatchResult {
  primaryMatch: Pattern | null
  fuzzyMatches: Pattern[]
  source: MatchSource
  matchedCandidate: string | null  // 命中的 VLM 候选名（debug 用）
}

const MAX_CANDIDATES = 3
const MAX_FUZZY = 5

export function parseVlmNames(raw: string): string[] {
  if (!raw || !raw.trim()) return []

  // 取最后一非空行（reasoning 模型常在末尾给答案）
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const lastLine = lines[lines.length - 1] ?? raw.trim()

  // 剥"答案："/"识别结果："/"最终答案:" 等前缀
  const cleaned = lastLine.replace(/^.*?(?:答案|识别结果|最终答案)[:：]\s*/, '').trim()

  // 多分隔符 split：| ｜ 、 ， ,
  const names = cleaned
    .split(/[|｜、，,\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // 去掉尾随的句号/问号
  const cleanedNames = names.map(n => n.replace(/[。.?？!！]+$/, '').trim()).filter(Boolean)

  return cleanedNames.slice(0, MAX_CANDIDATES)
}

/**
 * 提取纹样名的核心关键词用于模糊匹配。
 * "团龙纹" → "团龙"（去"纹"后缀，取末 2 字）
 * "回纹" → "回"（去"纹"后缀）
 * "宝相花" → "宝相"（去"花"后缀）
 * "龙" → "龙"（保留）
 * "饕餮纹·商" → "饕餮"（去朝代标记）
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
      // 双向匹配：keyword 匹配 type/name，或 type/name 匹配 keyword
      const typeKeyword = p.type.replace(/(纹|花|字)$/, '').slice(-2)
      // 检查是否有任何字符重叠（用于"神兽"匹配"兽面"的场景）
      const hasOverlap = keyword.split('').some(c => typeKeyword.includes(c))
      if (
        p.name.includes(keyword) ||
        p.type.includes(keyword) ||
        keyword.includes(p.type) ||
        keyword.includes(typeKeyword) ||
        hasOverlap
      ) {
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
