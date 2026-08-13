import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info)
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh',
          background: '#0C0A0E', color: '#F5F1E8',
          padding: 24, gap: 16,
        }}>
          <div style={{ fontSize: 48, color: 'rgba(201,162,60,0.4)' }}>☯</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>页面出了点问题</div>
          <div style={{ fontSize: 12, color: 'rgba(201,162,60,0.5)', maxWidth: 320, textAlign: 'center' }}>
            {this.state.error?.message || '未知错误'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/home' }}
            style={{
              marginTop: 12, padding: '10px 32px', borderRadius: 12,
              background: 'rgba(201,162,60,0.15)', color: '#D4AF6A',
              border: '1px solid rgba(201,162,60,0.3)',
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            返回首页
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
