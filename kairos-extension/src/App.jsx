// Kairos Extension — App Root
// Screen router for the 360x600 popup

import React, { useEffect, Suspense, lazy } from 'react';
import useStore from './store/useStore';

// Core screens (eager loaded - small)
import WelcomeScreen from './components/WelcomeScreen';
import UnlockScreen from './components/UnlockScreen';
import Dashboard from './components/Dashboard';

// Secondary screens (lazy loaded)
const CreateWallet = lazy(() => import('./components/CreateWallet'));
const ImportWallet = lazy(() => import('./components/ImportWallet'));
const SendScreen = lazy(() => import('./components/SendScreen'));
const ReceiveScreen = lazy(() => import('./components/ReceiveScreen'));
const SettingsScreen = lazy(() => import('./components/SettingsScreen'));
const TxApproval = lazy(() => import('./components/TxApproval'));
const ConnectApproval = lazy(() => import('./components/ConnectApproval'));

// Loading fallback
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full bg-dark-400">
      <div className="w-8 h-8 border-2 border-kairos-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const screen = useStore(s => s.screen);
  const initialize = useStore(s => s.initialize);
  const error = useStore(s => s.error);
  const clearError = useStore(s => s.clearError);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Error toast
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 4000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  return (
    <div className="relative w-[360px] h-[600px] bg-dark-400 text-gray-100 flex flex-col overflow-hidden">
      {/* Error Toast */}
      {error && (
        <div className="absolute top-2 left-2 right-2 z-50 bg-red-900/90 border border-red-700 text-red-100 text-xs px-3 py-2 rounded-lg backdrop-blur-sm animate-pulse">
          {error}
        </div>
      )}

      {/* Screen Router */}
      <Suspense fallback={<LoadingSpinner />}>
        {renderScreen(screen)}
      </Suspense>
    </div>
  );
}

function renderScreen(screen) {
  switch (screen) {
    case 'loading':
      return <LoadingSpinner />;
    case 'welcome':
      return <WelcomeScreen />;
    case 'create':
    case 'create-confirm':
      return <CreateWallet />;
    case 'import':
      return <ImportWallet />;
    case 'unlock':
      return <UnlockScreen />;
    case 'dashboard':
      return <Dashboard />;
    case 'send':
      return <SendScreen />;
    case 'receive':
      return <ReceiveScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'tx-approval':
      return <TxApproval />;
    case 'connect-approval':
      return <ConnectApproval />;
    default:
      return <WelcomeScreen />;
  }
}
