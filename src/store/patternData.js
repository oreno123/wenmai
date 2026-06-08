import { generatePatternDataURL, PROCEDURAL_GENERATORS } from '../engine/proceduralPatterns.js'

// 模拟纹样总库数据
// procedural: 使用程序化 SVG 生成的纹样类型（无需 AI 图片）
const PATTERN_LIBRARY = [
  // 基础纹样（所有人免费）
  { id: 'basic-1', name: '如意云纹', type: '云纹', series: 'cloud', rarity: 'common', tags: ['基础', '云纹'], image: '/patterns/ruyi_cloud.png' },
  { id: 'basic-2', name: '回纹', type: '几何纹', series: 'geometric', rarity: 'common', tags: ['基础', '几何'], image: '/patterns/huiwen.png' },
  { id: 'basic-3', name: '莲瓣纹', type: '花卉纹', series: 'floral', rarity: 'common', tags: ['基础', '花卉'], image: '/patterns/lianhua.png' },

  // 云纹系列
  { id: 'cloud-1', name: '流云纹', type: '云纹', series: 'cloud', rarity: 'common', tags: ['云纹', '汉代'], image: '/patterns/liuyun.png' },
  { id: 'cloud-2', name: '祥云纹', type: '云纹', series: 'cloud', rarity: 'rare', tags: ['云纹', '唐代'], image: '/patterns/xiangyun.png' },
  { id: 'cloud-3', name: '朵云纹', type: '云纹', series: 'cloud', rarity: 'rare', tags: ['云纹', '宋代'], image: '/patterns/duoyun.png' },
  { id: 'cloud-4', name: '团云纹', type: '云纹', series: 'cloud', rarity: 'ssr', tags: ['云纹', '明代'], image: '/patterns/yunlei.png' },

  // 饕餮系列
  { id: 'taotie-1', name: '饕餮纹·商', type: '兽面纹', series: 'taotie', rarity: 'rare', tags: ['兽面纹', '商代'], image: '/patterns/taotie_shang.png' },
  { id: 'taotie-2', name: '饕餮纹·周', type: '兽面纹', series: 'taotie', rarity: 'rare', tags: ['兽面纹', '周代'], image: '/patterns/taotie_zhou.png' },
  { id: 'taotie-3', name: '夔龙饕餮纹', type: '兽面纹', series: 'taotie', rarity: 'ssr', tags: ['兽面纹', '战国'], image: '/patterns/kuilong_taotie.png' },

  // 龙纹系列
  { id: 'dragon-1', name: '蟠龙纹', type: '龙纹', series: 'dragon', rarity: 'rare', tags: ['龙纹', '汉代'], image: '/patterns/panlong.png' },
  { id: 'dragon-2', name: '行龙纹', type: '龙纹', series: 'dragon', rarity: 'rare', tags: ['龙纹', '唐代'], image: '/patterns/xinglong.png' },
  { id: 'dragon-3', name: '升龙纹', type: '龙纹', series: 'dragon', rarity: 'ssr', tags: ['龙纹', '明代'], image: '/patterns/shenglong.png' },
  { id: 'dragon-4', name: '团龙纹', type: '龙纹', series: 'dragon', rarity: 'ssr', tags: ['龙纹', '清代'], image: '/patterns/tuanlong.png' },

  // 卷草纹
  { id: 'scroll-1', name: '唐草纹', type: '卷草纹', series: 'scroll', rarity: 'common', tags: ['卷草纹', '唐代'], image: '/patterns/juancao.png' },
  { id: 'scroll-2', name: '缠枝纹', type: '卷草纹', series: 'scroll', rarity: 'rare', tags: ['卷草纹', '明代'], image: '/patterns/juancao-fixed.png' },
  { id: 'scroll-3', name: '宝相花卷草', type: '卷草纹', series: 'scroll', rarity: 'ssr', tags: ['卷草纹', '唐代'], image: '/patterns/baoxiang.png' },

  // 角花
  { id: 'corner-1', name: '如意角花', type: '角花', series: 'corner', rarity: 'common', tags: ['角花'], image: '/patterns/ruyi_corner.png' },
  { id: 'corner-2', name: '凤鸟角花', type: '角花', series: 'corner', rarity: 'rare', tags: ['角花', '凤鸟'], image: '/patterns/fengniao_corner.png' },

  // 四方连续
  { id: 'tile-1', name: '万字不到头', type: '四方连续', series: 'tile', rarity: 'common', tags: ['四方连续', '万字'], image: '/patterns/wanzi_endless.png' },
  { id: 'tile-2', name: '冰裂纹', type: '四方连续', series: 'tile', rarity: 'rare', tags: ['四方连续', '冰裂'], image: '/patterns/binglie.png' },

  // 山海经系列（全部传说）
  { id: 'sj-1', name: '马身人面神·人马踏珪纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '神'], image: '/patterns/shanjing/马身人面神·人马踏珪纹.png' },
  { id: 'sj-2', name: '狍鸮·羊身人爪纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/狍鸮·羊身人爪纹.png' },
  { id: 'sj-3', name: '臘疏·马身独角纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/臘疏·马身独角纹.png' },
  { id: 'sj-4', name: '蛇身人面神·盘坐莲心纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '神'], image: '/patterns/shanjing/蛇身人面神·盘坐莲心纹.png' },
  { id: 'sj-5', name: '英招·四海巡游纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '神'], image: '/patterns/shanjing/英招·四海巡游纹.png' },
  { id: 'sj-6', name: '武罗·山神腾云纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '神'], image: '/patterns/shanjing/武罗·山神腾云纹.png' },
  { id: 'sj-7', name: '夫诸·白鹿行水纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/夫诸·白鹿行水纹.png' },
  { id: 'sj-8', name: '文鳐鱼·鸟翼锦鲤纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/文鳐鱼·鸟翼锦鲤纹.png' },
  { id: 'sj-9', name: '旋龟·鸟首蛇身纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/旋龟·鸟首蛇身纹.png' },
  { id: 'sj-10', name: '计蒙·游渊司雨纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '神'], image: '/patterns/shanjing/计蒙·游渊司雨纹.png' },
  { id: 'sj-11', name: '人身龙首神·龙吟守山纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '神'], image: '/patterns/shanjing/人身龙首神·龙吟守山纹.png' },
  { id: 'sj-12', name: '应龙·飞龙布雨纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/应龙·飞龙布雨纹.png' },
  { id: 'sj-13', name: '葱聋·山羊垂鬃纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/葱聋·山羊垂鬃纹.png' },
  { id: 'sj-14', name: '鼓·人面龙身纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/鼓·人面龙身纹.png' },
  { id: 'sj-15', name: '瞿如·三足人面纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/瞿如·三足人面纹.png' },
  { id: 'sj-16', name: '獬讹·一目九尾纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/獬讹·一目九尾纹.png' },
  { id: 'sj-17', name: '虎蛟·鱼身蛇尾纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/虎蛟·鱼身蛇尾纹.png' },
  { id: 'sj-18', name: '穷奇·如虎飞翼纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/穷奇·如虎飞翼纹.png' },
  { id: 'sj-19', name: '肥遗·一蛇双身纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/肥遗·一蛇双身纹.png' },
  { id: 'sj-20', name: '窫窳·赤牛食人纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/窫窳·赤牛食人纹.png' },
  { id: 'sj-21', name: '凤皇·自在歌舞纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '神鸟'], image: '/patterns/shanjing/凤皇·自在歌舞纹.png' },
  { id: 'sj-22', name: '顒·人面四目纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/顒·人面四目纹.png' },
  { id: 'sj-23', name: '鷧·双首四足纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/鷧·双首四足纹.png' },
  { id: 'sj-24', name: '诸犍·一目豹行纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/诸犍·一目豹行纹.png' },
  { id: 'sj-25', name: '相繇·九首蛇身纹', type: '山海经', series: 'shanjing', rarity: 'ssr', tags: ['山海经', '异兽'], image: '/patterns/shanjing/相繇·九首蛇身纹.png' },
]

// 稀有度权重（抽卡概率）
const RARITY_WEIGHTS = {
  common: 60,
  rare: 30,
  ssr: 10,
}

// 系列信息
const SERIES_INFO = {
  cloud: { name: '云纹演变', description: '从流云到团云，千年云纹演变之路', color: '#87CEEB' },
  taotie: { name: '饕餮传奇', description: '青铜时代的神秘兽面', color: '#CD853F' },
  dragon: { name: '龙纹千年', description: '从蟠龙到团龙，皇权与祥瑞', color: '#FFD700' },
  scroll: { name: '卷草流转', description: '生生不息的东方植物纹', color: '#98FB98' },
  geometric: { name: '几何之美', description: '最古老的秩序感', color: '#DDA0DD' },
  floral: { name: '花卉清韵', description: '以花为信，以瓣为言', color: '#FFB6C1' },
  corner: { name: '角花集', description: '转角处的惊喜', color: '#F0E68C' },
  tile: { name: '四方连续', description: '无限延展的纹样世界', color: '#B0C4DE' },
  shanjing: { name: '山海经', description: '上古神兽，千年纹影', color: '#C41E3A' },
}

// 程序化纹样 SVG 缓存
const _svgCache = new Map()

export function getPatternById(id) {
  return PATTERN_LIBRARY.find(p => p.id === id)
}

/**
 * 获取纹样的图片源（优先 image 文件，其次程序化 SVG）
 * @returns {string} 图片 URL 或 data URL
 */
export function getPatternImage(pattern) {
  if (!pattern) return ''
  if (pattern.image) return pattern.image
  if (pattern.procedural) {
    if (!_svgCache.has(pattern.id)) {
      _svgCache.set(pattern.id, generatePatternDataURL(pattern.procedural))
    }
    return _svgCache.get(pattern.id)
  }
  return ''
}

export function getPatternsBySeries(series) {
  return PATTERN_LIBRARY.filter(p => p.series === series)
}

export function getSeriesInfo(seriesId) {
  return SERIES_INFO[seriesId]
}

export function getAllSeries() {
  return Object.entries(SERIES_INFO).map(([id, info]) => ({
    id,
    ...info,
    patterns: PATTERN_LIBRARY.filter(p => p.series === id),
  }))
}

export function getRandomPattern() {
  // 加权随机
  const total = PATTERN_LIBRARY.reduce((sum, p) => sum + RARITY_WEIGHTS[p.rarity], 0)
  let rand = Math.random() * total
  for (const pattern of PATTERN_LIBRARY) {
    rand -= RARITY_WEIGHTS[pattern.rarity]
    if (rand <= 0) return pattern
  }
  return PATTERN_LIBRARY[0]
}

export function getRarityLabel(rarity) {
  return { common: '普通', rare: '稀有', ssr: '传说' }[rarity] || '普通'
}

export { PATTERN_LIBRARY, SERIES_INFO }
