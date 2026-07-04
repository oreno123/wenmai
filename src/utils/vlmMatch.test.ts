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
