import type { Pattern } from '../store/patternData'
import peony from '../../public/relic/m/qinghua_peony/manifest.json'
import landscape from '../../public/relic/m/qinghua_second/manifest.json'
import cizhou from '../../public/relic/m/cizhou_blackwhite/manifest.json'
import dingyao from '../../public/relic/m/dingyao_carved/manifest.json'
import dingWestZhou from '../../public/relic/m/ding_west_zhou/manifest.json'
import doubleOwlYou from '../../public/relic/m/double_owl_you/manifest.json'
import fanghu from '../../public/relic/m/fanghu/manifest.json'
import fangyi from '../../public/relic/m/fangyi/manifest.json'
import guang from '../../public/relic/m/guang/manifest.json'
import guiZhou from '../../public/relic/m/gui_zhou/manifest.json'
import guiZhou2 from '../../public/relic/m/gui_zhou_2/manifest.json'
import he from '../../public/relic/m/he/manifest.json'
import jia from '../../public/relic/m/jia/manifest.json'
import shangGui from '../../public/relic/m/shang_gui/manifest.json'
import shengding from '../../public/relic/m/shengding/manifest.json'
import tingShang from '../../public/relic/m/ting_shang/manifest.json'

// 鸿蒙 App 的页面 origin 是 http://localhost，rawfile 里只内置了 4 件器物的模型，
// 青花展开图必须走线上站；桌面 dev 与线上站同源，保持相对路径。
const ASSET_BASE = typeof location !== 'undefined' && location.hostname === 'localhost'
  ? 'https://wenmai.ruoziqing.cn'
  : ''

// 158 张青铜卡经三轮视觉审核（glm-4v-flash 全量 + 强模型拼图复核 + 严格二筛）后
// 通过的 38 张，其余只留在器物提取页，不入图鉴。名单见 scripts/bronze_verdict_merge.json。
const BRONZE_PASS = new Set([
  'ding_west_zhou#0', 'ding_west_zhou#1', 'ding_west_zhou#2',
  'double_owl_you#0', 'double_owl_you#1',
  'fanghu#0', 'fanghu#1', 'fanghu#2', 'fanghu#3',
  'fangyi#0', 'fangyi#1', 'fangyi#2', 'fangyi#3',
  'guang#1', 'guang#2', 'guang#3',
  'gui_zhou#0', 'gui_zhou#1', 'gui_zhou#2', 'gui_zhou#3',
  'gui_zhou_2#0', 'gui_zhou_2#1', 'gui_zhou_2#2', 'gui_zhou_2#3',
  'he#2', 'he#3', 'he#4', 'he#5',
  'jia#7', 'jia#8',
  'shang_gui#0', 'shang_gui#1', 'shang_gui#2',
  'shengding#0', 'shengding#2',
  'ting_shang#0', 'ting_shang#1', 'ting_shang#2',
])

const CERAMIC_VESSELS = [
  { id: 'qinghua_peony', manifest: peony },
  { id: 'qinghua_second', manifest: landscape },
  { id: 'cizhou_blackwhite', manifest: cizhou },
  { id: 'dingyao_carved', manifest: dingyao },
]

const BRONZE_VESSELS = [
  { id: 'ding_west_zhou', manifest: dingWestZhou },
  { id: 'double_owl_you', manifest: doubleOwlYou },
  { id: 'fanghu', manifest: fanghu },
  { id: 'fangyi', manifest: fangyi },
  { id: 'guang', manifest: guang },
  { id: 'gui_zhou', manifest: guiZhou },
  { id: 'gui_zhou_2', manifest: guiZhou2 },
  { id: 'he', manifest: he },
  { id: 'jia', manifest: jia },
  { id: 'shang_gui', manifest: shangGui },
  { id: 'shengding', manifest: shengding },
  { id: 'ting_shang', manifest: tingShang },
]

// Stable IDs let saved compositions and gallery forks resolve extracted assets.
// These elements are available through extraction, not added to the gacha pool.
export const RELIC_PATTERNS: Pattern[] = [
  ...CERAMIC_VESSELS.flatMap(({ id, manifest }) => manifest.elements.map((element) => ({
    id: `relic_${id}_${element.id}`,
    name: element.label,
    type: element.kind === 'panel' ? '器身展片' : element.level === 'ground' ? '边饰' : '器物纹样',
    series: 'qinghua' as const,
    rarity: 'common' as const,
    tags: ['模型曲面提取'],
    image: `${ASSET_BASE}/relic/m/${id}/${element.image}`,
  }))),
  ...BRONZE_VESSELS.flatMap(({ id, manifest }) => manifest.elements
    .filter((element) => BRONZE_PASS.has(`${id}#${element.id}`))
    .map((element) => ({
      id: `relic_${id}_${element.id}`,
      name: element.label,
      type: element.level === 'ground' ? '边饰' : '器物纹样',
      series: 'bronze' as const,
      rarity: 'common' as const,
      tags: ['模型曲面提取'],
      image: `${ASSET_BASE}/relic/m/${id}/elem_${String(element.id).padStart(2, '0')}.png`,
    }))),
]
