import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Global Error Boundary — catches any crash from App or its children
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[KairosTrade] Global crash:', error, info);
    this.setState({ componentStack: info?.componentStack || '' });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#08090C', color: '#F0F0F0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ background: '#1A1D26', padding: '2rem', borderRadius: '16px', maxWidth: '520px', width: '100%', border: '1px solid #252836', textAlign: 'center' }}>
            <h2 style={{ color: '#FF4757', marginBottom: '12px', fontSize: '18px' }}>Error de aplicación</h2>
            <p style={{ color: '#B8BCC8', fontSize: '14px', marginBottom: '8px' }}>{String(this.state.error?.message || 'Algo salió mal')}</p>
            <p style={{ color: '#FFA500', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>Component Stack:</p>
            <pre style={{ color: '#4ADE80', fontSize: '10px', background: '#12141A', padding: '8px', borderRadius: '8px', marginBottom: '8px', overflowX: 'auto', maxHeight: '200px', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.componentStack || 'Loading...'}
            </pre>
            <p style={{ color: '#FFA500', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>Error Stack:</p>
            <pre style={{ color: '#FF6B7A', fontSize: '10px', background: '#12141A', padding: '8px', borderRadius: '8px', marginBottom: '16px', overflowX: 'auto', maxHeight: '120px', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error?.stack?.slice(0, 600) || 'N/A'}
            </pre>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()}
                style={{ background: '#3B82F6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                Recargar
              </button>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }}
                style={{ background: '#374151', color: '#D1D5DB', border: '1px solid #4B5563', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                Limpiar y Recargar
              </button>
            </div>
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
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
