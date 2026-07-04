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
