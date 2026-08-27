import { AI_ASSETS } from '../src/data/aiAssets.ts'

const AI_TYPE_MAP = {
  '宝相花': '花卉纹', '莲花纹': '花卉纹', '牡丹纹': '花卉纹',
  '缠枝莲': '卷草纹', '卷草纹': '卷草纹', '如意云纹': '云纹',
  '回纹': '几何纹', '几何边饰': '几何纹', '凤纹': '凤纹',
  '龙纹': '龙纹', '海水江崖': '海水纹', '山水纹': '山水纹', '八宝纹': '八宝纹',
}

function aiAssetToPattern(asset) {
  const type = asset.purpose === 'corner'
    ? '角花'
    : (AI_TYPE_MAP[asset.type_zh] || asset.type_zh)
  return { id: asset.id, type, type_zh: asset.type_zh, purpose: asset.purpose }
}

const patterns = AI_ASSETS.map(aiAssetToPattern)
const corners = patterns.filter(p => p.type === '角花')
console.log('AI_ASSETS 总数:', AI_ASSETS.length)
console.log('AI_PATTERNS 总数:', patterns.length)
console.log('角花数量 (type=角花):', corners.length)
console.log('前 5 个角花:', corners.slice(0, 5).map(c => c.id))
console.log('=== type 分布 ===')
const typeCount = {}
patterns.forEach(p => { typeCount[p.type] = (typeCount[p.type] || 0) + 1 })
Object.entries(typeCount).sort((a,b) => b[1]-a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`))
