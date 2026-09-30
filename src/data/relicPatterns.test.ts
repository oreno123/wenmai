import { describe, expect, it } from 'vitest'
import { getPatternById, getPatternImage, PATTERN_LIBRARY } from '../store/patternData'

describe('extracted assets in saved compositions', () => {
  it('resolves a saved extraction ID to its real surface image', () => {
    const pattern = getPatternById('relic_qinghua_peony_0')
    expect(pattern?.name).toBe('牡丹花头 · 正面')
    expect(getPatternImage(pattern)).toBe('/relic/m/qinghua_peony/surface_elem_00.png')
    expect(PATTERN_LIBRARY.some(p => p.id === pattern?.id)).toBe(false)
  })
  it('does not resolve removed fragments or arbitrary asset paths', () => {
    expect(getPatternById('relic_qinghua_second_5')).toBeUndefined()
    expect(getPatternById('relic_../../private_0')).toBeUndefined()
  })
})
