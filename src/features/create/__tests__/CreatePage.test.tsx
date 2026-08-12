import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CreatePage from '../CreatePage'

vi.mock('../../../pages/PuzzlePage', () => ({
  __esModule: true,
  default: () => <div data-testid="free-mode">FreeMode</div>,
}))
vi.mock('../modes/GuidedMode', () => ({
  __esModule: true,
  default: () => <div data-testid="guided-mode">GuidedMode</div>,
}))
vi.mock('../modes/PreviewMode', () => ({
  __esModule: true,
  default: () => <div data-testid="preview-mode">PreviewMode</div>,
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
    expect(await findByTestId('guided-mode')).toBeTruthy()
  })

  it('renders PreviewMode when mode=preview', async () => {
    const { findByTestId } = renderAt('/create?mode=preview')
    expect(await findByTestId('preview-mode')).toBeTruthy()
  })

  it('falls back to FreeMode when mode is unknown', async () => {
    const { findByTestId, queryByTestId } = renderAt('/create?mode=garbage')
    expect(await findByTestId('free-mode')).toBeTruthy()
    expect(queryByTestId('guided-mode')).toBeNull()
    expect(queryByTestId('preview-mode')).toBeNull()
  })

  it('renders 3 mode tabs', () => {
    const { getAllByRole } = renderAt('/create')
    const tabs = getAllByRole('button').filter((b) =>
      ['自', '引', '预'].some((t) => b.textContent?.includes(t)),
    )
    expect(tabs.length).toBeGreaterThanOrEqual(3)
  })
})
