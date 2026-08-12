import { describe, it, expect } from 'vitest'
import { LEGACY_REDIRECTS } from '../LegacyRedirects'

describe('LEGACY_REDIRECTS', () => {
  it('covers all 9 legacy paths', () => {
    expect(LEGACY_REDIRECTS).toHaveLength(9)
  })

  it('redirects all creation tools to /create with mode', () => {
    const createRedirects = LEGACY_REDIRECTS.filter((r) => r.to.startsWith('/create'))
    expect(createRedirects.map((r) => r.from).sort()).toEqual(
      ['/composer', '/editor', '/jigsaw', '/puzzle', '/showcase'].sort()
    )
    expect(createRedirects.every((r) => r.to.includes('mode='))).toBeTruthy()
  })

  it('redirects /qinghua to /library with series=qinghua', () => {
    const q = LEGACY_REDIRECTS.find((r) => r.from === '/qinghua')
    expect(q?.to).toBe('/library?series=qinghua')
  })

  it('redirects /curate to /tools/curate', () => {
    const c = LEGACY_REDIRECTS.find((r) => r.from === '/curate')
    expect(c?.to).toBe('/tools/curate')
  })

  it('redirects /splash to /', () => {
    const s = LEGACY_REDIRECTS.find((r) => r.from === '/splash')
    expect(s?.to).toBe('/')
  })

  it('redirects /landing to /auth (Landing merged into AuthPage in Plan 3)', () => {
    const l = LEGACY_REDIRECTS.find((r) => r.from === '/landing')
    expect(l?.to).toBe('/auth')
  })
})
