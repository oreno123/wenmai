import type { Pattern } from '../store/patternData'
import peony from '../../public/relic/m/qinghua_peony/manifest.json'
import landscape from '../../public/relic/m/qinghua_second/manifest.json'
import guiZhou from '../../public/relic/m/gui_zhou/manifest.json'
import shangGui from '../../public/relic/m/shang_gui/manifest.json'

// 鸿蒙 App 的页面 origin 是 http://localhost，rawfile 里只内置了 4 件器物的模型，
// 青花展开图必须走线上站；桌面 dev 与线上站同源，保持相对路径。
const ASSET_BASE = typeof location !== 'undefined' && location.hostname === 'localhost'
  ? 'https://wenmai.ruoziqing.cn'
  : ''

// 158 张青铜卡三轮 VLM 审核放行的 38 张，经用户按「清晰连贯大块」标准人眼复审后
// 只留 4 张（2026-10-25）：shang_gui 是人工精调基准器整组达标，gui_zhou#3 是唯一
// 达标的批量管线卡。VLM 判据偏松（把「有纹样痕迹」当及格），批量卡败因=低精度扫描源
// + 展开撕裂，即 08-29「瓶颈在模型源」结论。名单史见 scripts/bronze_verdict_merge.json。
const BRONZE_PASS = new Set([
  'shang_gui#0', 'shang_gui#1', 'shang_gui#2',
  'gui_zhou#3',
])

// 瓷器 manifest 由 surface recipe 管线产出，element.image 指向 surface_elem_XX.png。
// 磁州/定窑 2026-10-25 撤下：surface 卡只采颜色贴图，磁州灰绿失真、定窑刻花在几何里
// 颜色无信号出空卡（同龙泉"成而淡"先例）。模型移 .model-archive/，重提走几何渲染。
const CERAMIC_VESSELS = [
  { id: 'qinghua_peony', manifest: peony },
  { id: 'qinghua_second', manifest: landscape },
]

const BRONZE_VESSELS = [
  { id: 'gui_zhou', manifest: guiZhou },
  { id: 'shang_gui', manifest: shangGui },
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
