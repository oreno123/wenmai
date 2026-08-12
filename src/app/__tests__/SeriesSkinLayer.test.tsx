import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SeriesSkinLayer } from '../SeriesSkinLayer'
import { SERIES_ROUTE_MAP } from '../seriesRouteMap'

// SeriesSkin transitively imports ParticleLayer (tsparticles) and
// DecorationLayer (lottie-react), both of which crash under jsdom at module
// eval time. Mock them so the wrapper renders its className/children without
// pulling in WebGL/canvas animation runtimes. Mirrors the mocks in
// src/design-system/components/__tests__/SeriesSkin.test.tsx.
vi.mock('@tsparticles/react', () => ({
  default: () => <div data-testid="mock-particles" />,
}))
vi.mock('../../design-system/visual/DecorationLayer', () => ({
  DecorationLayer: () => null,
}))
// design-system/index.ts re-exports * from visual/, which pulls in
// LottieAsset → lottie-react → lottie-web. lottie-web touches the canvas API
// at module eval time and crashes under jsdom. Mock at the root cause.
vi.mock('lottie-react', () => ({
  default: () => <div data-testid="mock-lottie" />,
}))

describe('SERIES_ROUTE_MAP', () => {
  it('maps /library to neutral', () => {
    expect(SERIES_ROUTE_MAP['/library']).toBe('neutral')
  })
  it('maps /create to neutral', () => {
    expect(SERIES_ROUTE_MAP['/create']).toBe('neutral')
  })
  it('maps /gallery to neutral', () => {
    expect(SERIES_ROUTE_MAP['/gallery']).toBe('neutral')
  })
  it('maps /gacha to dragon', () => {
    expect(SERIES_ROUTE_MAP['/gacha']).toBe('dragon')
  })
})

describe('SeriesSkinLayer', () => {
  it('renders children inside a SeriesSkin wrapper at /library', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/library']}>
        <Routes>
          <Route
            path="/library"
            element={
              <SeriesSkinLayer>
                <div data-testid="child">Library content</div>
              </SeriesSkinLayer>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    const skin = container.querySelector('.ds-series-skin')
    expect(skin).not.toBeNull()
    expect(skin?.classList.contains('series-neutral')).toBe(true)
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull()
  })

  it('skips skin wrapper at /pattern/:id (page mounts its own skin)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/pattern/qh-1']}>
        <Routes>
          <Route
            path="/pattern/:id"
            element={
              <SeriesSkinLayer>
                <div data-testid="child">Detail</div>
              </SeriesSkinLayer>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.querySelector('.ds-series-skin')).toBeNull()
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull()
  })

  it('renders skin at /gacha with dragon series', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/gacha']}>
        <Routes>
          <Route
            path="/gacha"
            element={
              <SeriesSkinLayer>
                <div>gacha</div>
              </SeriesSkinLayer>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    const skin = container.querySelector('.ds-series-skin')
    expect(skin?.classList.contains('series-dragon')).toBe(true)
  })
})
