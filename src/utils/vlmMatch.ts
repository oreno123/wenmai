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
import type { CropRect } from './imageComparison'

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
  const isExplain = (l: string) => /^讲解[:：]/.test(l)

  // 判定门（gate-first）：找行首 "判定：是/否"。
  // 内容含 否/无/非 → 无条件 names: []（即使答案行仍硬写了名字也忽略）。
  const verdictLine = lines.find(l => /^判定[:：]/.test(l))
  const verdictText = verdictLine ? verdictLine.replace(/^判定[:：]\s*/, '') : ''
  const isNegativeVerdict = verdictText.length > 0 && /[否无非]/.test(verdictText)

  const answerLine = lines.find(l => !isExplain(l) && !/^判定[:：]/.test(l) && /(^|\s)(答案|识别结果|最终答案)[:：]/.test(l))
  const fallbackPool = lines.filter(l => !isExplain(l) && !/^判定[:：]/.test(l))
  const nameSource = answerLine ?? fallbackPool[fallbackPool.length - 1] ?? ''

  // 无纹样拒绝出口：答案行剥掉前缀/引号/句读后是极短否定（"无"/"无纹样"/"没有"）
  // 或尾部否定短语（"图中无纹样"/"照片中没有传统纹样"）→ names 为空。
  // 整词枚举兜最短形态；尾部匹配锚定句尾、否定词后限 0-6 字，真名不会以否定词开头且以"纹样"结尾。
  const stripped = nameSource
    .replace(/^.*?(?:答案|识别结果|最终答案)[:：]\s*/, '')
    .replace(/^["'“”‘’]+/, '')
    .replace(/["'“”‘’]+$/g, '')
    .replace(/[。．.!！?？\s]+$/g, '')
    .replace(/^["'“”‘’]+/, '')
    .replace(/["'“”‘’]+$/g, '')
  const isExactNegative = /^(无|無|没有|沒有|无纹样|沒有纹样|没有纹样|未检测到纹样)$/.test(stripped)
  const isTailNegative = /(无|無|没有|沒有|未检测到|未见).{0,6}(纹样|图案|传统纹样)$/.test(stripped)
  // 判定门优先：判定为"否" → 无条件空（答案行内容忽略）
  const names = isNegativeVerdict || isExactNegative || isTailNegative
    ? []
    : parseVlmNames(nameSource)

  const explainLine = lines.find(isExplain)
  let explanation = explainLine ? explainLine.replace(/^讲解[:：]\s*/, '').trim() : ''
  explanation = explanation.replace(/[。.]+$/, '').trim()

  return { names, explanation }
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

// 生产=wenmai-api nginx 反代（注入 key），dev=vite server.proxy 转发到同一反代。
// 前端 bundle 永远不含 api.stepfun.com 域名和 key。
const VLM_ENDPOINT = '/vlm/chat/completions'
const STEPFUN_MODEL = 'step-3.7-flash'

const VLM_PROMPT = `你是中国传统纹样鉴定专家。只按以下三行格式回答，不要输出其他内容：
判定：<是|否>（图中是否出现中国传统纹样，如青铜器纹、瓷器纹、织绣纹、建筑彩画、吉祥图案；现代图案/风景/人物/物品不算）
答案：<判定为"是"时写纹样名，1-3 个按主次用 | 分隔；判定为"否"时只写：无>
讲解：<60 字内。判定为"是"：说明是什么/盛行朝代/寓意；判定为"否"：简述图中实际是什么>

示例一：
判定：是
答案：团龙纹|云纹
讲解：团龙纹为龙体盘踞成团的圆形适合纹样，盛行于明清，寓意尊贵吉祥。

示例二：
判定：否
答案：无
讲解：图中是一只现代咖啡杯，无传统纹样。

常见纹样参考（不限于）：团龙纹、行龙纹、蟠龙纹、云雷纹、回纹、卷草纹、缠枝纹、莲瓣纹、如意云纹、海水江崖纹、宝相花、冰裂纹、万字纹、绳纹、饕餮纹、凤鸟纹、牡丹纹、菊花纹、兰花纹、青花龙纹、青花山水`

export interface VlmCallOptions {
  imageBase64: string  // 不带 data: 前缀的纯 base64
  signal?: AbortSignal
}

export interface VlmCallResult {
  rawOutput: string
  candidates: string[]
  explanation: string
}

/**
 * 调用 Step Fun step-3.7-flash。
 *
 * 关键坑（来自 reference_stepfun-api.md）：
 * 1. content 字段经常空，真实输出在 reasoning_content / reasoning
 * 2. max_tokens 给 4000+（reasoning 模型会先思考）
 * 3. 错误时抛异常，调用方 try/catch 走 fallback
 * 4. 认证由 nginx /vlm/ 反代注入，本函数不再接收 apiKey
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

  const resp = await fetch(VLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

  if (import.meta.env.DEV) {
    console.debug('[vlm] raw output:', rawOutput)
  }

  if (!rawOutput) {
    throw new Error('Step Fun API 返回空内容（content/reasoning_content/reasoning 都为空）')
  }

  const parsed = parseVlmOutput(rawOutput)

  return {
    rawOutput,
    candidates: parsed.names,
    explanation: parsed.explanation,
  }
}

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
