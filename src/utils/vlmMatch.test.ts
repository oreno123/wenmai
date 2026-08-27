import { describe, it, expect } from 'vitest'
import { parseVlmNames, extractKeyword, matchPattern, parseVlmOutput, type MatchResult } from './vlmMatch'
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

  it('讲解行内含"答案："字样不被当答案行', () => {
    const raw = '答案：龙纹\n讲解：该纹样的答案：龙纹。'
    const r = parseVlmOutput(raw)
    expect(r.names).toEqual(['龙纹'])
    expect(r.explanation).toBe('该纹样的答案：龙纹')
  })

  it('无纹样拒绝：答案为"无"→ names 空，讲解保留', () => {
    const r = parseVlmOutput('答案：无\n讲解：图中是一只咖啡杯')
    expect(r).toEqual({ names: [], explanation: '图中是一只咖啡杯' })
  })

  it('无纹样拒绝：纯"无"（无答案行，走 fallback 末行路径）→ names 空', () => {
    const r = parseVlmOutput('无')
    expect(r.names).toEqual([])
    expect(r.explanation).toBe('')
  })

  it('无纹样拒绝：变体"无纹样。"也判为无', () => {
    const r = parseVlmOutput('答案：无纹样。\n讲解：照片是现代印花，非传统纹样')
    expect(r.names).toEqual([])
    expect(r.explanation).toBe('照片是现代印花，非传统纹样')
  })

  it('回归：正常纹样名不受否定判定影响', () => {
    const r = parseVlmOutput('答案：缠枝莲纹\n讲解：枝蔓缠绕成带状。')
    expect(r.names).toEqual(['缠枝莲纹'])
    expect(r.explanation).toBe('枝蔓缠绕成带状')
  })

  it('无纹样拒绝：带引号“无”→ names 空', () => {
    const r = parseVlmOutput('答案：“无”\n讲解：图中是一只咖啡杯')
    expect(r.names).toEqual([])
    expect(r.explanation).toBe('图中是一只咖啡杯')
  })

  it('无纹样拒绝：自由措辞"图中无纹样"→ names 空', () => {
    const r = parseVlmOutput('答案：图中无纹样\n讲解：照片是现代建筑')
    expect(r.names).toEqual([])
    expect(r.explanation).toBe('照片是现代建筑')
  })

  it('无纹样拒绝：自由措辞"照片中没有传统纹样"→ names 空', () => {
    const r = parseVlmOutput('答案：照片中没有传统纹样')
    expect(r.names).toEqual([])
  })

  it('反例：万字曲水纹（"纹"结尾正常名）不受尾部否定匹配影响', () => {
    const r = parseVlmOutput('答案：万字曲水纹\n讲解：以万字连续排列成带状。')
    expect(r.names).toEqual(['万字曲水纹'])
    expect(r.explanation).toBe('以万字连续排列成带状')
  })

  it('无答案行且末行是讲解行：不把讲解当候选名', () => {
    const r = parseVlmOutput('饕餮纹\n讲解：商代青铜器典型纹样')
    expect(r.names).toEqual(['饕餮纹'])
    expect(r.explanation).toBe('商代青铜器典型纹样')
  })

  it('三行格式：判定为是 → 正常解析答案行', () => {
    const r = parseVlmOutput('判定：是\n答案：饕餮纹\n讲解：商代青铜器典型兽面纹样。')
    expect(r.names).toEqual(['饕餮纹'])
    expect(r.explanation).toBe('商代青铜器典型兽面纹样')
  })

  it('三行格式：判定为否 + 答案：无 → names 空，讲解保留', () => {
    const r = parseVlmOutput('判定：否\n答案：无\n讲解：图中是一只现代咖啡杯')
    expect(r.names).toEqual([])
    expect(r.explanation).toBe('图中是一只现代咖啡杯')
  })

  it('判定门优先：判定为否但答案行硬写了名字 → 仍然 names 空', () => {
    const r = parseVlmOutput('判定：否\n答案：云纹\n讲解：现代印花布料，非传统纹样')
    expect(r.names).toEqual([])
    expect(r.explanation).toBe('现代印花布料，非传统纹样')
  })

  it('判定行变体（空格+句读）也能识别为否', () => {
    const r = parseVlmOutput('判定： 否。\n答案：无\n讲解：一只猫')
    expect(r.names).toEqual([])
    expect(r.explanation).toBe('一只猫')
  })

  it('旧两行格式无判定行：走原逻辑正常解析', () => {
    const r = parseVlmOutput('答案：回纹|莲瓣纹\n讲解：几何连续纹样。')
    expect(r.names).toEqual(['回纹', '莲瓣纹'])
    expect(r.explanation).toBe('几何连续纹样')
  })
})
