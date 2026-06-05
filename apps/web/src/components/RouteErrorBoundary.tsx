import { Component, type ReactNode } from 'react';
import { translate } from '@/i18n';
import { usePreferences } from '@/store/preferences';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RouteError]', error.message, info.componentStack?.slice(0, 200));
  }

  render() {
    if (this.state.hasError) {
      // Class component: read the current language synchronously at render time.
      const lang = usePreferences.getState().lang;
      return (
        <div className="page-fade" style={{ padding: 32, textAlign: 'center', maxWidth: 480, margin: '80px auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>⚠</div>
          <h2 style={{ color: 'var(--tx)', marginBottom: 8 }}>{translate(lang, 'states.errorTitle')}</h2>
          <p style={{ color: 'var(--tx-2)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
            {translate(lang, 'states.errorBody')}
          </p>
          {this.state.error && (
            <pre style={{ fontSize: 11, color: 'var(--tx-3)', background: 'var(--bg-2)', padding: 12, borderRadius: 8, textAlign: 'left', overflow: 'auto', maxHeight: 120 }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            className="btn gold"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{ marginTop: 16 }}
          >
            {translate(lang, 'states.reload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
