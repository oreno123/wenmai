import bronzeCardNotes from './bronzeCardNotes.json'

/* 文物纹样库的讲解层。
   bronzeCardNotes.json = glm-4v-flash 鉴定结果（学名 + 画面描述），脚本生成：
     scripts/label_bronze_extract.py → scripts/bronze_labels.jsonl → 合并
   本文件手写部分 = 纹样学名讲解（MOTIF_NOTES）与器物背景（VESSEL_NOTES），
   均为标准器物学常识，不虚构具体馆藏信息。 */

const MOTIF_NOTES: Record<string, string> = {
  '兽面纹': '商周青铜器最核心的主纹：正面兽首、双目圆睁，角与眉向两侧展开。旧称饕餮纹，取自《吕氏春秋》「周鼎著饕餮，有首无身」，今多称兽面纹。',
  '云雷纹': '连续回旋的几何纹：圆形回旋称云纹、方形称雷纹，通常作为地纹铺满主纹之下，是商代「三层花」纹饰的地底层。',
  '夔龙纹': '一足或两足的侧面龙形，张口、上卷尾，多对称配置在兽面纹两侧作辅纹。',
  '龙纹': '蟠曲的龙体纹样，多作带状环绕器腹，流行于西周至春秋。',
  '凤鸟纹': '长冠垂尾的侧面鸟形，商末周初成为主纹，西周早期尤盛。',
  '涡纹': '圆形漩涡状纹样，旧称火纹，多饰于鼎簋腹部或斝柱顶端。',
  '弦纹': '凸起的细横线，两三道为一组，是最简朴的带状界栏装饰。',
  '乳钉纹': '凸起的圆乳状钉，成列成阵，商代簋、罍腹部常见。',
  '四瓣目纹': '中心一目形、四花瓣环绕的单元纹样，多作带状辅纹。',
  '勾连雷纹': '雷纹横向勾连成带，商末周初常见于器物颈、圈足。',
  '蟠螭纹': '多条幼龙蟠曲交织、布满器面的细密纹样，春秋战国的时代风格。',
  '窃曲纹': '由龙纹简化抽象成的S形带状纹，西周中晚期取代兽面纹成为主流。',
  '重环纹': '一环套一环的横S形带状纹，西周晚期至春秋盛行。',
  '环带纹': '宽带如波浪上下起伏、间填窃曲或鳞纹，西周晚期重器常见。',
  '蕉叶纹': '蕉叶形框架内填纹样，多饰于器物颈部，商代晚期出现。',
}

const VESSEL_NOTES: Record<string, string> = {
  ding_west_zhou: '鼎是炊煮与盛放肉食的礼器，周代以奇数列鼎明等差，是礼乐制度的核心载体。',
  double_owl_you: '卣是盛酒器，此器两鸮（猫头鹰）相背而立。商人视鸮为威武之夜禽，鸮形青铜器多出自高级贵族墓。',
  fanghu: '方壶是盛酒礼器，战国方壶多通体细密纹饰，与圆壶相对，常见于大夫以上用器组合。',
  fangyi: '方彝是盛酒器，盖作四阿屋顶形，器身方方正正，为商代王室重器组合「斝觚方彝」之一。',
  guang: '觥是盛酒兼注酒之器，整体多塑成兽形，前有流、后有鋬、上有盖，商末周初最为精致。',
  gui_zhou: '簋盛放黍稷饭食，与鼎配套：鼎用奇数、簋用偶数，是周代食礼的基本组合。',
  gui_zhou_2: '簋盛放黍稷饭食，与鼎配套：鼎用奇数、簋用偶数，是周代食礼的基本组合。',
  he: '盉是调酒、温酒之器，深腹三足前有流后有鋬，与爵、觚构成商周酒器组合。',
  jia: '斝是温酒器，三足、口沿立双柱，与爵形制相近而体量更大，常与爵同出。',
  shang_gui: '簋盛放黍稷饭食，与列鼎相配。此簋为商代晚期形制，通体满饰兽面与云雷。',
  shengding: '升鼎盛放烹熟的牲肉，春秋时期诸侯僭越礼制用九鼎，此鼎即升鼎形制。',
  ting_shang: '鼎是炊煮与盛放肉食的礼器，商代鼎腹多饰兽面纹，以云雷纹铺地。',
  qinghua_peony: '青花以钴料在坯上绘画、罩透明釉一次烧成，缠枝牡丹是元明青花最经典的主体纹样。',
  qinghua_second: '青花以钴料在坯上绘画、罩透明釉一次烧成，蓝白相映，自元代起成为中国瓷器最具辨识度的语言。',
}

const normName = (raw) => {
  if (!raw || raw === '待考' || raw === 'error') return ''
  return raw.replace(/[（(]饕餮纹[)）]/, '').trim() || raw
}

// patternId 形如 relic_fanghu_0 → fanghu#0
export const cardNote = (patternId) => {
  const m = /^relic_(.+)_(\d+)$/.exec(patternId)
  if (!m) return null
  const hit = bronzeCardNotes[`${m[1]}#${m[2]}`]
  if (!hit || hit.name === '待考' || hit.name === 'error') return null
  const name = normName(hit.name)
  return { name, desc: hit.desc || '', note: MOTIF_NOTES[name] || '' }
}

export const vesselNote = (slug) => VESSEL_NOTES[slug] || ''
