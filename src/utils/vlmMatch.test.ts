import { describe, it, expect } from 'vitest'
import { parseVlmNames, extractKeyword, matchPattern, type MatchResult } from './vlmMatch'
import type { Pattern } from '../store/patternData'

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
