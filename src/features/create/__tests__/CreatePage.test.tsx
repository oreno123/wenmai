import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import CreatePage from '../CreatePage'
import { normalizeSub } from '../SubModeTabs'

vi.mock('../modes/FreeMode', () => ({
  __esModule: true,
  default: () => <div data-testid="free-mode">FreeMode</div>,
}))
vi.mock('../modes/GuidedMode', () => ({
  __esModule: true,
  default: () => {
    const [sp] = useSearchParams()
    const sub = normalizeSub(
      [
        { sub: 'symmetry' },
        { sub: 'jigsaw' },
      ],
      sp.get('sub'),
    )
    return (
      <div data-testid={`guided-${sub}`}>
        GuidedMode ({sub})
      </div>
    )
  },
}))
vi.mock('../modes/PreviewMode', () => ({
  __esModule: true,
  default: () => {
    const [sp] = useSearchParams()
    const sub = normalizeSub(
      [
        { sub: 'relief' },
        { sub: 'shatter' },
      ],
      sp.get('sub'),
    )
    return (
      <div data-testid={`preview-${sub}`}>
        PreviewMode ({sub})
      </div>
    )
  },
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/create" element={<CreatePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CreatePage', () => {
  it('renders FreeMode by default when no mode query', async () => {
    const { findByTestId } = renderAt('/create')
    expect(await findByTestId('free-mode')).toBeTruthy()
  })

  it('renders FreeMode when mode=free', async () => {
    const { findByTestId } = renderAt('/create?mode=free')
    expect(await findByTestId('free-mode')).toBeTruthy()
  })

  it('renders GuidedMode when mode=guided', async () => {
    const { findByTestId } = renderAt('/create?mode=guided')
    expect(await findByTestId('guided-symmetry')).toBeTruthy()
  })

  it('renders PreviewMode when mode=preview', async () => {
    const { findByTestId } = renderAt('/create?mode=preview')
    expect(await findByTestId('preview-relief')).toBeTruthy()
  })

  it('falls back to FreeMode when mode is unknown', async () => {
    const { findByTestId, queryByTestId } = renderAt('/create?mode=garbage')
    expect(await findByTestId('free-mode')).toBeTruthy()
    expect(queryByTestId('guided-symmetry')).toBeNull()
    expect(queryByTestId('preview-relief')).toBeNull()
  })

  it('renders 3 mode tabs', () => {
    const { getAllByRole } = renderAt('/create')
    const tabs = getAllByRole('button').filter((b) =>
      ['自', '引', '预'].some((t) => b.textContent?.includes(t)),
    )
    expect(tabs.length).toBeGreaterThanOrEqual(3)
  })
})

describe('CreatePage sub-modes', () => {
  it('guided mode defaults to symmetry when no sub', async () => {
    const { findByTestId } = renderAt('/create?mode=guided')
    expect(await findByTestId('guided-symmetry')).toBeTruthy()
  })

  it('guided mode switches to jigsaw when sub=jigsaw', async () => {
    const { findByTestId } = renderAt('/create?mode=guided&sub=jigsaw')
    expect(await findByTestId('guided-jigsaw')).toBeTruthy()
  })

  it('preview mode defaults to relief when no sub', async () => {
    const { findByTestId } = renderAt('/create?mode=preview')
    expect(await findByTestId('preview-relief')).toBeTruthy()
  })

  it('preview mode switches to shatter when sub=shatter', async () => {
    const { findByTestId } = renderAt('/create?mode=preview&sub=shatter')
    expect(await findByTestId('preview-shatter')).toBeTruthy()
  })

  it('guided mode falls back to symmetry when sub is unknown', async () => {
    const { findByTestId } = renderAt('/create?mode=guided&sub=garbage')
    expect(await findByTestId('guided-symmetry')).toBeTruthy()
  })

  it('preview mode falls back to relief when sub is unknown', async () => {
    const { findByTestId } = renderAt('/create?mode=preview&sub=garbage')
    expect(await findByTestId('preview-relief')).toBeTruthy()
  })
})
