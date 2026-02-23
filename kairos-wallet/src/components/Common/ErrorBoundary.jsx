// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Error Boundary
//  Catches React errors and shows a recovery UI
//  instead of a white screen of death
// ═══════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">
            Algo salió mal
          </h2>
          <p className="text-dark-300 text-sm mb-6 max-w-xs">
            La aplicación encontró un error inesperado. Tus fondos están seguros.
          </p>

          {this.state.error && (
            <div className="w-full bg-dark-800 rounded-xl p-3 mb-6 max-h-24 overflow-auto">
              <p className="text-red-400 text-xs font-mono break-all">
                {this.state.error.toString()}
              </p>
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={this.handleGoHome}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                         bg-dark-700 hover:bg-dark-600 text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              Reintentar
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                         bg-kairos-500 hover:bg-kairos-600 text-black font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
