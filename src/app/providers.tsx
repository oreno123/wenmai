import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '../store/AppState'
import ErrorBoundary from '../components/common/ErrorBoundary'
import SmoothScrollProvider from './SmoothScrollProvider'

export interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
