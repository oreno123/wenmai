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
