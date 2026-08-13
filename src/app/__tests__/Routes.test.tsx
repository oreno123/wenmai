import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '../Routes'

// Stub all lazy-loaded pages. Each must `default` export a component.
// Note: vi.mock paths resolve relative to the test file
// (src/app/__tests/), so we use ../../pages/... to reach src/pages/.
vi.mock('../../pages/SplashPage', () => ({ default: () => <div data-testid="splash">Splash</div> }))
vi.mock('../../pages/AuthPage', () => ({ default: () => <div data-testid="auth">Auth</div> }))
vi.mock('../../pages/Home', () => ({ default: () => <div data-testid="home">Home</div> }))
vi.mock('../../pages/Library', () => ({ default: () => <div data-testid="library">Library</div> }))
vi.mock('../../features/create/modes/FreeMode', () => ({ default: () => <div data-testid="create">Create</div> }))
vi.mock('../../features/gacha/GachaPage', () => ({ default: () => <div data-testid="gacha">Gacha</div> }))
vi.mock('../../features/gallery/GalleryPage', () => ({ default: () => <div data-testid="gallery">Gallery</div> }))
vi.mock('../../features/gallery/WorkDetailPage', () => ({ default: () => <div data-testid="work">Work</div> }))
vi.mock('../../pages/PatternDetailPage', () => ({ default: () => <div data-testid="pattern">Pattern</div> }))
vi.mock('../../pages/PhotoMatchPage', () => ({ default: () => <div data-testid="photo">PhotoMatch</div> }))
vi.mock('../../features/gallery/AdminReviewPage', () => ({ default: () => <div data-testid="admin">Admin</div> }))
vi.mock('../../pages/CuratePage', () => ({ default: () => <div data-testid="curate">Curate</div> }))
vi.mock('../../pages/demo/SeriesDemoPage', () => ({ default: () => <div data-testid="demo">Demo</div> }))

async function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  )
}

describe('AppRoutes', () => {
  // Each page is wrapped in React.lazy() + Suspense in Routes.tsx, so the
  // first render shows the <PageLoader /> fallback until the (mocked) dynamic
  // import resolves on the next microtask. Use findByTestId (async) to wait
  // for the real page to mount, then assert.
  it('renders SplashPage at /', async () => {
    await renderAt('/')
    expect(await screen.findByTestId('splash')).toBeTruthy()
  })

  it('renders AuthPage at /auth', async () => {
    await renderAt('/auth')
    expect(await screen.findByTestId('auth')).toBeTruthy()
  })

  it('renders Home at /home', async () => {
    await renderAt('/home')
    expect(await screen.findByTestId('home')).toBeTruthy()
  })

  it('renders Library at /library', async () => {
    await renderAt('/library')
    expect(await screen.findByTestId('library')).toBeTruthy()
  })

  it('renders Create (PuzzlePage) at /create', async () => {
    await renderAt('/create')
    expect(await screen.findByTestId('create')).toBeTruthy()
  })

  it('renders Gallery at /gallery', async () => {
    await renderAt('/gallery')
    expect(await screen.findByTestId('gallery')).toBeTruthy()
  })

  it('renders WorkDetailPage at /work/:id', async () => {
    await renderAt('/work/abc-123')
    expect(await screen.findByTestId('work')).toBeTruthy()
  })

  it('renders PatternDetailPage at /pattern/:id', async () => {
    await renderAt('/pattern/qinghua-001')
    expect(await screen.findByTestId('pattern')).toBeTruthy()
  })

  it('renders CuratePage at /tools/curate (NOT /curate)', async () => {
    await renderAt('/tools/curate')
    expect(await screen.findByTestId('curate')).toBeTruthy()
  })

  it('renders SeriesDemoPage at /demo/series/:id (Plan 2 leftover)', async () => {
    await renderAt('/demo/series/cloud')
    expect(await screen.findByTestId('demo')).toBeTruthy()
  })

  it('falls back to Splash at unknown path', async () => {
    await renderAt('/this-does-not-exist')
    expect(await screen.findByTestId('splash')).toBeTruthy()
  })

  it('redirects /puzzle to /create (legacy)', async () => {
    renderAt('/puzzle')
    expect(await screen.findByTestId('create')).toBeTruthy()
  })

  it('redirects /qinghua to /library (legacy)', async () => {
    renderAt('/qinghua')
    expect(await screen.findByTestId('library')).toBeTruthy()
  })
})
