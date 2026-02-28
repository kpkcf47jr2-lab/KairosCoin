import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-300 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-white/40 mb-6">
              An unexpected error occurred. Please reload the page.
            </p>
            <button
              onClick={this.handleReload}
              className="px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-all"
            >
              Reload
            </button>
            {this.state.error && (
              <pre className="mt-4 p-3 rounded-lg bg-white/5 text-[10px] text-red-400/60 text-left overflow-auto max-h-32">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
