// 星河视图数据 — 从 xinghe-demo/data.js 逐字移植。
// era/score/webp/motifs 是 demo 里人工调好的映射，不从 manifest 重推导。
export const XINGHE_IMG_BASE = '/relic/ai/'

export const XINGHE_ERAS = ['商', '商末周初', '西周', '春秋', '战国', '东汉', '后期', '待考'] as const

export interface XingheRelic {
  slug: string
  zh: string
  dynasty: string
  era: number
  score: number
  webp: string
  motifs: string[]
}

export const XINGHE_RELICS: XingheRelic[] = [
  { slug: 'ding_hd', zh: '鼎', dynasty: '商', era: 0, score: 5, webp: 'ding_hd/face2.webp', motifs: ['饕餮纹'] },
  { slug: 'ding_shang', zh: '鼎', dynasty: '商 · 前12世纪', era: 0, score: 4, webp: 'ding_shang/face0.webp', motifs: ['饕餮纹'] },
  { slug: 'ding_src', zh: '鼎', dynasty: '商', era: 0, score: 5, webp: 'ding_src/face0.webp', motifs: ['饕餮纹'] },
  { slug: 'fangyi', zh: '彝', dynasty: '商', era: 0, score: 5, webp: 'fangyi/face3.webp', motifs: ['饕餮纹'] },
  { slug: 'fangyi_src', zh: '彝', dynasty: '商 · 前12–11世纪', era: 0, score: 4, webp: 'fangyi_src/band.webp', motifs: ['虎纹', '饕餮纹'] },
  { slug: 'jia', zh: '斝', dynasty: '商 · 前13–12世纪', era: 0, score: 5, webp: 'jia/face1.webp', motifs: ['虎纹', '饕餮纹'] },
  { slug: 'owl_zun', zh: '尊', dynasty: '商 · 前13–12世纪', era: 0, score: 5, webp: 'owl_zun/face0.webp', motifs: ['饕餮纹', '鸮纹'] },
  { slug: 'shang_gui', zh: '簋', dynasty: '商 · 前12–11世纪', era: 0, score: 5, webp: 'shang_gui/face0.webp', motifs: ['饕餮纹'] },
  { slug: 'ting_shang', zh: '鼎', dynasty: '商 · 前12世纪', era: 0, score: 5, webp: 'ting_shang/face2.webp', motifs: ['夔龙纹', '饕餮纹'] },
  { slug: 'jue_hd', zh: '爵', dynasty: '商', era: 0, score: 5, webp: 'jue_hd/v3.webp', motifs: ['饕餮纹', '龙纹'] },
  { slug: 'jiubei', zh: '爵', dynasty: '商', era: 0, score: 4, webp: 'jiubei/v3.webp', motifs: ['饕餮纹'] },

  { slug: 'ewer_huo', zh: '壶', dynasty: '商末周初', era: 1, score: 5, webp: 'ewer_huo/band_g.webp', motifs: ['饕餮纹', '龙纹'] },
  { slug: 'guang', zh: '觥', dynasty: '商末周初', era: 1, score: 5, webp: 'guang/face2.webp', motifs: ['饕餮纹'] },
  { slug: 'guang_src', zh: '觥', dynasty: '商末周初', era: 1, score: 4, webp: 'guang_src/face0.webp', motifs: ['饕餮纹'] },
  { slug: 'liding', zh: '鬲', dynasty: '商末周初 · 前12–11世纪', era: 1, score: 4, webp: 'liding/face1.webp', motifs: ['饕餮纹'] },
  { slug: 'you_shang', zh: '卣', dynasty: '商末周初 · 前12–11世纪', era: 1, score: 4, webp: 'you_shang/face0.webp', motifs: ['饕餮纹', '龙纹'] },
  { slug: 'yu_src', zh: '盂', dynasty: '商末周初 · 前12-11世纪', era: 1, score: 5, webp: 'yu_src/face0.webp', motifs: ['饕餮纹'] },
  { slug: 'he_hd', zh: '盉', dynasty: '商末周初', era: 1, score: 5, webp: 'he_hd/band.webp', motifs: ['夔龙纹', '饕餮纹'] },

  { slug: 'ding_west_zhou', zh: '鼎', dynasty: '西周 · 前11–10世纪', era: 2, score: 5, webp: 'ding_west_zhou/face1.webp', motifs: ['饕餮纹'] },
  { slug: 'double_owl_you', zh: '卣', dynasty: '西周 · 前11世纪', era: 2, score: 5, webp: 'double_owl_you/v3.webp', motifs: ['饕餮纹'] },
  { slug: 'gui_zhou', zh: '簋', dynasty: '西周 · 约前10世纪', era: 2, score: 5, webp: 'gui_zhou/face0.webp', motifs: ['饕餮纹'] },
  { slug: 'gui_zhou_2', zh: '簋', dynasty: '西周 · 前11–10世纪', era: 2, score: 5, webp: 'gui_zhou_2/face3.webp', motifs: ['夔龙纹', '饕餮纹'] },
  { slug: 'he', zh: '盉', dynasty: '西周 · 前11–10世纪', era: 2, score: 5, webp: 'he/face0.webp', motifs: ['饕餮纹'] },
  { slug: 'tenghou_ding', zh: '鼎', dynasty: '西周', era: 2, score: 5, webp: 'tenghou_ding/band.webp', motifs: ['饕餮纹', '龙纹'] },
  { slug: 'lei_lid', zh: '罍', dynasty: '西周', era: 2, score: 5, webp: 'lei_lid/v3.webp', motifs: ['龙纹'] },
  { slug: 'lei_base', zh: '罍', dynasty: '西周', era: 2, score: 4, webp: 'lei_base/band.webp', motifs: ['龙纹'] },
  { slug: 'rijifangzun', zh: '尊', dynasty: '西周', era: 2, score: 5, webp: 'rijifangzun/face0.webp', motifs: ['饕餮纹'] },

  { slug: 'shengding', zh: '鼎', dynasty: '春秋 · 约前575年', era: 3, score: 5, webp: 'shengding/face1.webp', motifs: ['饕餮纹'] },

  { slug: 'ding_warring', zh: '鼎', dynasty: '战国 · 前5世纪', era: 4, score: 4, webp: 'ding_warring/face0.webp', motifs: ['饕餮纹'] },
  { slug: 'fanghu', zh: '壶', dynasty: '战国 · 前5–4世纪', era: 4, score: 4, webp: 'fanghu/v2.webp', motifs: ['饕餮纹'] },
  { slug: 'hu', zh: '壶', dynasty: '战国 · 前5–4世纪', era: 4, score: 5, webp: 'hu/face0.webp', motifs: ['蟠螭纹', '饕餮纹', '龙纹'] },

  { slug: 'feima', zh: '雕塑', dynasty: '东汉', era: 5, score: 4, webp: 'feima/sil.webp', motifs: ['马形'] },

  { slug: 'xianglu', zh: '炉', dynasty: '后期', era: 6, score: 5, webp: 'xianglu/face0.webp', motifs: ['饕餮纹'] },

  { slug: 'fangding_src', zh: '鼎', dynasty: '待考', era: 7, score: 4, webp: 'fangding_src/band.webp', motifs: ['饕餮纹', '龙纹'] },
  { slug: 'huo_src', zh: '盉', dynasty: '待考', era: 7, score: 4, webp: 'huo_src/face0.webp', motifs: ['饕餮纹', '龙纹'] },
  { slug: 'owl_you_src', zh: '卣', dynasty: '待考', era: 7, score: 5, webp: 'owl_you_src/face2.webp', motifs: ['牛纹', '饕餮纹', '龙纹'] },
]
