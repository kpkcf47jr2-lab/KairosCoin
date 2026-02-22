import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error Boundary to catch React crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Kairos Wallet Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', background: '#05050f',
          color: 'white', fontFamily: 'Inter, sans-serif', padding: '20px',
          textAlign: 'center', gap: '16px'
        }
      },
        React.createElement('img', { src: '/icons/logo-128.png', width: 64, height: 64, alt: 'Kairos' }),
        React.createElement('h2', { style: { color: '#f7c948', fontSize: '20px' } }, 'Kairos Wallet'),
        React.createElement('p', { style: { color: '#9d9db8', fontSize: '14px', maxWidth: '300px' } },
          'Algo salió mal. Intenta limpiar los datos del sitio.'),
        React.createElement('p', { style: { color: '#585887', fontSize: '12px', fontFamily: 'monospace', maxWidth: '300px', wordBreak: 'break-all' } },
          String(this.state.error)),
        React.createElement('button', {
          onClick: () => {
            localStorage.clear();
            if ('caches' in window) caches.keys().then(k => k.forEach(n => caches.delete(n)));
            window.location.reload();
          },
          style: {
            marginTop: '12px', padding: '12px 24px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #f7c948, #d4a017)', color: '#05050f',
            fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '14px'
          }
        }, 'Reiniciar Wallet')
      );
    }
    return this.props.children;
  }
}

// Remove loading fallback
const loadingEl = document.getElementById('app-loading');
if (loadingEl) loadingEl.remove();

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(ErrorBoundary, null,
      React.createElement(React.StrictMode, null,
        React.createElement(App, null)
      )
    )
  );
} catch (e) {
  console.error('Fatal Kairos error:', e);
  document.getElementById('root').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#05050f;color:white;font-family:Inter,sans-serif;text-align:center;padding:20px;gap:16px;">
      <img src="/icons/logo-128.png" width="64" height="64" />
      <h2 style="color:#f7c948;">Error Fatal</h2>
      <p style="color:#9d9db8;font-size:14px;">${e.message}</p>
      <button onclick="localStorage.clear();location.reload()" style="padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#f7c948,#d4a017);color:#05050f;font-weight:bold;border:none;cursor:pointer;">Reiniciar</button>
    </div>
  `;
}
