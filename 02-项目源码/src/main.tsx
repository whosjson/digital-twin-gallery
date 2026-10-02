import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { Component, type ReactNode } from 'react'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: unknown) {
    console.error('App crashed:', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#07080c',
            color: '#e8ddc4',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Noto Serif SC', 'Songti SC', serif",
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <div style={{ fontSize: '26px', letterSpacing: '0.3em', color: '#ecc98a', marginBottom: '14px' }}>
            数字分身画像馆
          </div>
          <div style={{ fontSize: '13px', opacity: 0.65, lineHeight: 1.9, maxWidth: '460px' }}>
            展厅遇到了一点意外。请刷新页面重试。
          </div>
          <button
            onClick={() => location.reload()}
            style={{
              marginTop: '26px',
              background: 'transparent',
              color: '#ecc98a',
              border: '1px solid rgba(236,201,138,0.5)',
              padding: '10px 30px',
              fontSize: '13px',
              letterSpacing: '0.14em',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
