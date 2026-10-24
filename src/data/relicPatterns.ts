import type { Pattern } from '../store/patternData'
import peony from '../../public/relic/m/qinghua_peony/manifest.json'
import landscape from '../../public/relic/m/qinghua_second/manifest.json'
import cizhou from '../../public/relic/m/cizhou_blackwhite/manifest.json'
import dingyao from '../../public/relic/m/dingyao_carved/manifest.json'

// 鸿蒙 App 的页面 origin 是 http://localhost，rawfile 里只内置了 4 件器物的模型，
// 青花展开图必须走线上站；桌面 dev 与线上站同源，保持相对路径。
const ASSET_BASE = typeof location !== 'undefined' && location.hostname === 'localhost'
  ? 'https://wenmai.ruoziqing.cn'
  : ''

// Stable IDs let saved compositions and gallery forks resolve extracted assets.
// These elements are available through extraction, not added to the gacha pool.
export const RELIC_PATTERNS: Pattern[] = [
  { id: 'qinghua_peony', manifest: peony },
  { id: 'qinghua_second', manifest: landscape },
  { id: 'cizhou_blackwhite', manifest: cizhou },
  { id: 'dingyao_carved', manifest: dingyao },
].flatMap(({ id, manifest }) => manifest.elements.map((element) => ({
  id: `relic_${id}_${element.id}`,
  name: element.label,
  type: element.kind === 'panel' ? '器身展片' : element.level === 'ground' ? '边饰' : '器物纹样',
  series: 'qinghua' as const,
  rarity: 'common' as const,
  tags: ['模型曲面提取'],
  image: `${ASSET_BASE}/relic/m/${id}/${element.image}`,
})))
