export interface ArtifactInfo {
  img: string
  name: string
  dynasty: string
  material?: string
}

export const ARTIFACT_DIR = '/artifacts/'

export const ARTIFACT_MAP: Record<string, ArtifactInfo[]> = {
  'basic-1': [
    { img: 'han_xizun.jpg', name: '错金银云纹青铜犀尊', dynasty: '西汉', material: '青铜' },
  ],
  'basic-2': [
    { img: 'shang_gong.jpg', name: '青铜觥', dynasty: '商代', material: '青铜' },
    { img: 'shang_ding.jpg', name: '青铜圆鼎', dynasty: '商代', material: '青铜' },
    { img: 'qing_qinghua_vase.jpg', name: '青花缠枝莲双耳瓶', dynasty: '清乾隆', material: '瓷' },
  ],
  'basic-3': [
    { img: 'ming_qinghua_meiping.jpg', name: '青花缠枝莲梅瓶', dynasty: '明代', material: '瓷' },
    { img: 'ming_qinghua_lian.jpg', name: '青花缠枝莲盘', dynasty: '明代', material: '瓷' },
    { img: 'tang_dunhuang_zaojing.jpg', name: '敦煌莫高窟藻井', dynasty: '唐代', material: '壁画' },
  ],

  'cloud-1': [
    { img: 'han_xizun.jpg', name: '错金银云纹青铜犀尊', dynasty: '西汉', material: '青铜' },
    { img: 'han_mawangdui_silk.jpg', name: '马王堆 T 型帛画', dynasty: '西汉', material: '帛' },
  ],
  'cloud-2': [
    { img: 'han_xizun.jpg', name: '错金银云纹青铜犀尊', dynasty: '西汉', material: '青铜' },
    { img: 'han_mawangdui_silk.jpg', name: '马王堆 T 型帛画', dynasty: '西汉', material: '帛' },
    { img: 'tang_dunhuang_zaojing.jpg', name: '敦煌莫高窟藻井', dynasty: '唐代', material: '壁画' },
  ],

  'taotie-1': [
    { img: 'shang_houmuwu.jpg', name: '后母戊方鼎', dynasty: '商代', material: '青铜' },
    { img: 'shang_siyangfangzun.jpg', name: '四羊方尊', dynasty: '商代', material: '青铜' },
    { img: 'shang_ding.jpg', name: '青铜圆鼎', dynasty: '商代', material: '青铜' },
    { img: 'shang_gong.jpg', name: '青铜觥', dynasty: '商代', material: '青铜' },
  ],
  'taotie-3': [
    { img: 'shang_siyangfangzun.jpg', name: '四羊方尊', dynasty: '商代', material: '青铜' },
    { img: 'shang_gong.jpg', name: '青铜觥', dynasty: '商代', material: '青铜' },
  ],

  'dragon-1': [
    { img: 'han_mawangdui_silk.jpg', name: '马王堆 T 型帛画', dynasty: '西汉', material: '帛' },
  ],
  'dragon-2': [
    { img: 'han_mawangdui_silk.jpg', name: '马王堆 T 型帛画', dynasty: '西汉', material: '帛' },
  ],

  'scroll-1': [
    { img: 'tang_wuma_yinhu.jpg', name: '舞马衔杯纹银壶', dynasty: '唐代', material: '金银' },
    { img: 'tang_dunhuang_zaojing.jpg', name: '敦煌莫高窟藻井', dynasty: '唐代', material: '壁画' },
  ],
  'scroll-2': [
    { img: 'yuan_qinghua_jar.jpg', name: '青花缠枝莲罐', dynasty: '元代', material: '瓷' },
    { img: 'qing_qinghua_vase.jpg', name: '青花缠枝莲双耳瓶', dynasty: '清乾隆', material: '瓷' },
    { img: 'ming_qinghua_meiping.jpg', name: '青花缠枝莲梅瓶', dynasty: '明代', material: '瓷' },
  ],
  'scroll-3': [
    { img: 'tang_wuma_yinhu.jpg', name: '舞马衔杯纹银壶', dynasty: '唐代', material: '金银' },
    { img: 'tang_dunhuang_zaojing.jpg', name: '敦煌莫高窟藻井', dynasty: '唐代', material: '壁画' },
    { img: 'yuan_qinghua_jar.jpg', name: '青花缠枝莲罐', dynasty: '元代', material: '瓷' },
  ],

  'corner-2': [
    { img: 'ming_qinghua_feng.jpg', name: '青花凤凰花卉盘', dynasty: '明代', material: '瓷' },
    { img: 'han_mawangdui_silk.jpg', name: '马王堆 T 型帛画', dynasty: '西汉', material: '帛' },
  ],
}

const QINGHUA_POOL: ArtifactInfo[] = [
  { img: 'yuan_qinghua_jar.jpg', name: '青花缠枝莲罐', dynasty: '元代', material: '瓷' },
  { img: 'qing_qinghua_vase.jpg', name: '青花缠枝莲双耳瓶', dynasty: '清乾隆', material: '瓷' },
  { img: 'ming_qinghua_feng.jpg', name: '青花凤凰花卉盘', dynasty: '明代', material: '瓷' },
  { img: 'ming_qinghua_lian.jpg', name: '青花缠枝莲盘', dynasty: '明代', material: '瓷' },
  { img: 'ming_qinghua_meiping.jpg', name: '青花缠枝莲梅瓶', dynasty: '明代', material: '瓷' },
]

export function getArtifactsForPattern(patternId: string): ArtifactInfo[] {
  if (ARTIFACT_MAP[patternId]) return ARTIFACT_MAP[patternId]
  if (patternId.startsWith('qh-')) return QINGHUA_POOL
  return []
}
