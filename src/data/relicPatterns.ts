import type { Pattern } from '../store/patternData'
import peony from '../../public/relic/m/qinghua_peony/manifest.json'
import landscape from '../../public/relic/m/qinghua_second/manifest.json'

// Stable IDs let saved compositions and gallery forks resolve extracted assets.
// These elements are available through extraction, not added to the gacha pool.
export const RELIC_PATTERNS: Pattern[] = [
  { id: 'qinghua_peony', manifest: peony },
  { id: 'qinghua_second', manifest: landscape },
].flatMap(({ id, manifest }) => manifest.elements.map((element) => ({
  id: `relic_${id}_${element.id}`,
  name: element.label,
  type: element.kind === 'panel' ? '器身展片' : element.level === 'ground' ? '边饰' : '器物纹样',
  series: 'qinghua' as const,
  rarity: 'common' as const,
  tags: ['模型曲面提取'],
  image: `/relic/m/${id}/${element.image}`,
})))
