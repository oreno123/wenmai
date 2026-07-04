/**
 * 手动跑一次 Step Fun API，看真实输出。
 *
 * 用法：
 *   node scripts/test-vlm-api.mjs <图片路径>
 *
 * 不传图片路径就用 public/patterns/tuanlong.webp 测试。
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const apiKey = process.env.VITE_STEPFUN_API_KEY
if (!apiKey) {
  console.error('❌ 请先在 .env.local 设 VITE_STEPFUN_API_KEY')
  process.exit(1)
}

const imgPath = process.argv[2] || 'public/patterns/tuanlong.webp'
const abs = resolve(imgPath)
if (!existsSync(abs)) {
  console.error(`❌ 图片不存在: ${abs}`)
  process.exit(1)
}

const base64 = readFileSync(abs).toString('base64')
console.log(`📷 测试图片: ${abs}`)
console.log(`📐 大小: ${(base64.length / 1024).toFixed(1)} KB (base64)`)
console.log(`🚀 调用 Step Fun step-3.7-flash...`)

const start = Date.now()
try {
  const resp = await fetch('https://api.stepfun.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'step-3.7-flash',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '识别图中的中国传统纹样。只输出纹样名，不要解释。多主题用 | 分隔。最后用一行输出：答案：纹样名',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
    }),
  })

  console.log(`⏱️  耗时: ${((Date.now() - start) / 1000).toFixed(1)}s`)
  console.log(`📡 HTTP ${resp.status}`)

  if (!resp.ok) {
    console.error(`❌ API 失败:`, await resp.text())
    process.exit(1)
  }

  const data = await resp.json()
  const msg = data?.choices?.[0]?.message ?? {}

  console.log('\n=== content ===')
  console.log(JSON.stringify(msg.content, null, 2))
  console.log('\n=== reasoning_content ===')
  console.log(JSON.stringify(msg.reasoning_content, null, 2)?.slice(0, 500) + '...')
  console.log('\n=== reasoning ===')
  console.log(JSON.stringify(msg.reasoning, null, 2)?.slice(0, 500) + '...')
  console.log('\n=== usage ===')
  console.log(JSON.stringify(data?.usage, null, 2))
} catch (e) {
  console.error('❌ 异常:', e)
  process.exit(1)
}
