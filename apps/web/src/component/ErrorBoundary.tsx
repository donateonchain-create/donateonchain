import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: 16 }}>
            Try refreshing the page. If the problem continues, please try again later.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              cursor: 'pointer',
              border: '1px solid #ccc',
              borderRadius: 6,
              background: '#f5f5f5',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
