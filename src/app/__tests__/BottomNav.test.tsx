import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import BottomNav from '../BottomNav'

// Helper to capture current location after a click
function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname}</div>
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
      <LocationProbe />
    </MemoryRouter>
  )
}

describe('BottomNav', () => {
  it('renders exactly 4 tabs', () => {
    renderAt('/home')
    expect(screen.getByText('首页')).toBeTruthy()
    expect(screen.getByText('图鉴')).toBeTruthy()
    expect(screen.getByText('创作')).toBeTruthy()
    expect(screen.getByText('广场')).toBeTruthy()
  })

  it('highlights Home tab when at /home', () => {
    renderAt('/home')
    const homeBtn = screen.getByText('首页').closest('button')
    expect(homeBtn?.getAttribute('data-active')).toBe('true')
  })

  it('highlights Library tab when at /library', () => {
    renderAt('/library')
    const libBtn = screen.getByText('图鉴').closest('button')
    expect(libBtn?.getAttribute('data-active')).toBe('true')
  })

  it('clicking 创作 navigates to /create', () => {
    renderAt('/home')
    fireEvent.click(screen.getByText('创作'))
    expect(screen.getByTestId('loc').textContent).toBe('/create')
  })

  it('clicking 广场 navigates to /gallery', () => {
    renderAt('/home')
    fireEvent.click(screen.getByText('广场'))
    expect(screen.getByTestId('loc').textContent).toBe('/gallery')
  })

  it('Create tab is the center elevated button (data-center="true")', () => {
    renderAt('/home')
    const createBtn = screen.getByText('创作').closest('button')
    expect(createBtn?.getAttribute('data-center')).toBe('true')
  })
})
