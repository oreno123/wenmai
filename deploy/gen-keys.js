// 用 JWT_SECRET 签发 Supabase 风格的 anon / service_role key
// 用法: node gen-keys.js <jwt_secret>
// 输出三行: JWT_SECRET / ANON_KEY / SERVICE_ROLE_KEY（写进 .env）
const crypto = require('crypto')

const secret = process.argv[2]
if (!secret || secret.length < 32) {
  console.error('usage: node gen-keys.js <jwt_secret (>=32 chars)>')
  process.exit(1)
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function signKey(role) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({
    role,
    iss: 'supabase',
    iat: now,
    exp: now + 10 * 365 * 24 * 3600, // 10 年
  }))
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest()
  return `${header}.${payload}.${b64url(sig)}`
}

console.log(`JWT_SECRET=${secret}`)
console.log(`ANON_KEY=${signKey('anon')}`)
console.log(`SERVICE_ROLE_KEY=${signKey('service_role')}`)
