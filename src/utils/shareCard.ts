/**
 * Generate branded share card image using Canvas
 */
import { getPatternImage } from '../store/patternData'

const W = 750
const H = 1334

export async function generateShareCard(pattern, seriesInfo) {
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#1a0a0c')
  bg.addColorStop(0.5, '#0f0a0e')
  bg.addColorStop(1, '#0a0810')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Top brand bar
  const topBar = ctx.createLinearGradient(0, 0, 0, 120)
  topBar.addColorStop(0, 'rgba(201,148,58,0.15)')
  topBar.addColorStop(1, 'transparent')
  ctx.fillStyle = topBar
  ctx.fillRect(0, 0, W, 120)

  // Brand text
  ctx.fillStyle = '#F2D58A'
  ctx.font = '700 36px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText('纹 脉', W / 2, 72)

  // Subtitle
  ctx.fillStyle = 'rgba(201,162,60,0.4)'
  ctx.font = '400 16px "Noto Serif SC", serif'
  ctx.fillText('中国传统纹样集', W / 2, 102)

  // Pattern image area
  const imgSrc = getPatternImage(pattern)
  if (imgSrc) {
    const img = await loadImage(imgSrc)
    const maxImgSize = 480
    const scale = Math.min(maxImgSize / img.width, maxImgSize / img.height)
    const iw = img.width * scale
    const ih = img.height * scale
    const ix = (W - iw) / 2
    const iy = 180

    // Gold border frame
    const framePad = 24
    ctx.strokeStyle = pattern.rarity === 'ssr' ? 'rgba(201,162,60,0.5)' : 'rgba(201,162,60,0.2)'
    ctx.lineWidth = 2
    roundRect(ctx, ix - framePad, iy - framePad, iw + framePad * 2, ih + framePad * 2, 16)
    ctx.stroke()

    // SSR glow
    if (pattern.rarity === 'ssr') {
      ctx.shadowColor = 'rgba(201,162,60,0.3)'
      ctx.shadowBlur = 40
      ctx.strokeStyle = 'rgba(201,162,60,0.4)'
      roundRect(ctx, ix - framePad, iy - framePad, iw + framePad * 2, ih + framePad * 2, 16)
      ctx.stroke()
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    }

    ctx.drawImage(img, ix, iy, iw, ih)
  }

  // Pattern name
  const nameY = 720
  ctx.fillStyle = pattern.rarity === 'ssr' ? '#F2D58A' : '#F5F1E8'
  ctx.font = '700 42px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText(pattern.name, W / 2, nameY)

  // Rarity badge
  const rarityColors = { ssr: '#F2D58A', rare: '#D4AF6A', common: '#8A8A8A' }
  const rarityLabels = { ssr: '传说', rare: '稀有', common: '普通' }
  const rarityText = rarityLabels[pattern.rarity] || '普通'
  ctx.font = '600 22px "Noto Serif SC", serif'
  const rarityW = ctx.measureText(rarityText).width + 32
  const rx = (W - rarityW) / 2
  ctx.fillStyle = pattern.rarity === 'ssr' ? 'rgba(201,162,60,0.2)' : 'rgba(255,255,255,0.06)'
  roundRect(ctx, rx, nameY + 16, rarityW, 36, 18)
  ctx.fill()
  ctx.fillStyle = rarityColors[pattern.rarity] || '#8A8A8A'
  ctx.font = '600 20px "Noto Serif SC", serif'
  ctx.fillText(rarityText, W / 2, nameY + 41)

  // Series + type
  const seriesName = seriesInfo?.name || pattern.series
  ctx.fillStyle = 'rgba(201,162,60,0.5)'
  ctx.font = '400 20px "Noto Serif SC", serif'
  ctx.fillText(`${seriesName} · ${pattern.type}`, W / 2, nameY + 80)

  // Divider line
  ctx.strokeStyle = 'rgba(201,162,60,0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W * 0.2, nameY + 110)
  ctx.lineTo(W * 0.8, nameY + 110)
  ctx.stroke()

  // Tags
  if (pattern.tags && pattern.tags.length > 0) {
    ctx.fillStyle = 'rgba(201,162,60,0.35)'
    ctx.font = '400 18px "Noto Serif SC", serif'
    ctx.fillText(pattern.tags.join(' · '), W / 2, nameY + 145)
  }

  // Bottom decoration
  ctx.fillStyle = 'rgba(201,162,60,0.08)'
  ctx.font = '400 16px "Noto Serif SC", serif'
  ctx.fillText('收集中国传统纹样 传承千年之美', W / 2, H - 80)

  // Bottom bar
  const bottomBar = ctx.createLinearGradient(0, H - 40, W, H - 40)
  bottomBar.addColorStop(0, 'transparent')
  bottomBar.addColorStop(0.5, 'rgba(201,162,60,0.15)')
  bottomBar.addColorStop(1, 'transparent')
  ctx.fillStyle = bottomBar
  ctx.fillRect(0, H - 40, W, 2)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
