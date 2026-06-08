import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
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
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.hash = '/home' }}
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
