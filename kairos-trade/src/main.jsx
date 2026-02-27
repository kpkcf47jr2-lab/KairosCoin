import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initNative } from './native';

// Initialize native plugins (Capacitor — no-op on web)
initNative();

// ═══════════════════════════════════════════════════════════════════════════════
//  Production-Grade Global Error Boundary
//  - Auto-retries up to 3 times before showing error UI
//  - Shows user-friendly message (no technical details in prod)
//  - "Reset Session" only clears auth — preserves user preferences
//  - Logs errors to console for remote debugging
// ═══════════════════════════════════════════════════════════════════════════════
const MAX_AUTO_RETRIES = 3;
const RETRY_RESET_AFTER_MS = 10000; // Reset retry counter after 10s of stability

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
    this._stabilityTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Always log for remote debugging
    console.error('[KairosTrade] Crash:', error?.message, '\nStack:', error?.stack?.slice(0, 500), '\nComponent:', info?.componentStack?.slice(0, 300));

    const { retryCount } = this.state;

    // Auto-retry: silently recover up to MAX_AUTO_RETRIES times
    if (retryCount < MAX_AUTO_RETRIES) {
      console.warn(`[KairosTrade] Auto-retry ${retryCount + 1}/${MAX_AUTO_RETRIES}...`);
      setTimeout(() => {
        this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
      }, 500);
      return;
    }
  }

  componentDidUpdate(_, prevState) {
    // If we recovered from an error, start a stability timer
    if (prevState.hasError && !this.state.hasError) {
      clearTimeout(this._stabilityTimer);
      this._stabilityTimer = setTimeout(() => {
        // App has been stable — reset retry counter
        this.setState({ retryCount: 0 });
      }, RETRY_RESET_AFTER_MS);
    }
  }

  componentWillUnmount() {
    clearTimeout(this._stabilityTimer);
  }

  render() {
    if (this.state.hasError && this.state.retryCount >= MAX_AUTO_RETRIES) {
      return (
        <div style={{ background: '#08090C', color: '#F0F0F0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ background: '#1A1D26', padding: '2.5rem', borderRadius: '16px', maxWidth: '420px', width: '100%', border: '1px solid #252836', textAlign: 'center' }}>
            {/* Logo */}
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>

            <h2 style={{ color: '#EAECEF', marginBottom: '8px', fontSize: '20px', fontWeight: '700' }}>
              Algo salió mal
            </h2>
            <p style={{ color: '#848E9C', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Estamos trabajando para solucionarlo. Por favor recarga la página.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{ background: '#3B82F6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', transition: 'background 0.2s' }}
                onMouseOver={e => e.target.style.background = '#2563EB'}
                onMouseOut={e => e.target.style.background = '#3B82F6'}
              >
                Recargar Página
              </button>
              <button
                onClick={() => {
                  // Only clear auth session — preserve user settings and data
                  localStorage.removeItem('kairos_trade_auth');
                  sessionStorage.clear();
                  window.location.href = '/';
                }}
                style={{ background: 'transparent', color: '#848E9C', border: '1px solid #2B3139', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                Reiniciar Sesión
              </button>
            </div>

            <p style={{ color: '#4B5563', fontSize: '11px', marginTop: '20px' }}>
              Si el problema persiste, contacta soporte: info@kairos-777.com
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

// Signal to global error handler that React mounted successfully
if (typeof window.__kairosReady === 'function') window.__kairosReady();
