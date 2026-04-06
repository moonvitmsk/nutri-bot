import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>😵</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Что-то пошло не так</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>{this.state.error?.message}</div>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              background: 'var(--accent-purple)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '10px 24px', fontSize: 14, cursor: 'pointer',
            }}
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
