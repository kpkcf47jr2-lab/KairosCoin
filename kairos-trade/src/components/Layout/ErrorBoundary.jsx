// Kairos Trade — Error Boundary with Crash Recovery (i18n)
import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { getTranslation } from '../../i18n';
import useStore from '../../store/useStore';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in dev, could send to monitoring service
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Reset to dashboard
    try {
      useStore.getState().setPage('dashboard');
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const { level = 'page' } = this.props;
      let t;
      try {
        const lang = useStore.getState().settings?.language || 'es';
        t = (key) => {
          const val = getTranslation(lang, key);
          return (typeof val === 'string') ? val : key;
        };
      } catch {
        t = (key) => key;
      }

      // Inline/widget level — minimal error
      if (level === 'widget') {
        return (
          <div className="flex items-center justify-center p-4 rounded-xl border border-[var(--red)]/20 bg-[var(--red)]/[0.04]">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-[var(--red)] shrink-0" />
              <span className="text-xs text-[var(--text-dim)]">{t('errors.widgetError')}</span>
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors"
              >
                <RefreshCw size={12} /> {t('errors.widgetRetry')}
              </button>
            </div>
          </div>
        );
      }

      // Page level — full crash recovery screen
      return (
        <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'var(--dark)' }}>
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,71,87,0.12), rgba(255,71,87,0.04))',
                border: '1px solid rgba(255,71,87,0.15)',
              }}>
              <AlertTriangle size={28} className="text-[var(--red)]" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">{t('errors.pageError')}</h2>
            <p className="text-sm text-[var(--text-dim)] mb-6 leading-relaxed">
              {t('errors.pageErrorDesc')}
            </p>

            {/* Error detail (collapsed) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-[var(--text-dim)] cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
                  Detalles técnicos
                </summary>
                <pre className="mt-2 p-3 rounded-lg text-[10px] text-[var(--red)]/80 overflow-auto max-h-32"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack?.slice(0, 500)}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="btn-gold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                <RefreshCw size={15} /> {t('errors.retry')}
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors flex items-center gap-2"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Home size={15} /> {t('errors.goToDashboard')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
