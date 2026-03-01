import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import MobileNav from './components/MobileNav';
import Header from './components/Header';
import TokenSelector from './components/TokenSelector';
import SettingsPanel from './components/SettingsPanel';
import WalletModal from './components/WalletModal';
import TxModal from './components/TxModal';
import SwapPage from './pages/SwapPage';
import LimitPage from './pages/LimitPage';
import PoolsPage from './pages/PoolsPage';
import BridgePage from './pages/BridgePage';
import PortfolioPage from './pages/PortfolioPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HistoryPage from './pages/HistoryPage';
import LaunchpadPage from './pages/LaunchpadPage';
import ListTokenPage from './pages/ListTokenPage';
import { useStore } from './store';

export default function App() {
  const { error, setError } = useStore();

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-dark-300 relative overflow-hidden pb-16 sm:pb-0">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-600/2 rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header />

        <Routes>
          <Route path="/" element={<SwapPage />} />
          <Route path="/limit" element={<LimitPage />} />
          <Route path="/pools" element={<PoolsPage />} />
          <Route path="/bridge" element={<BridgePage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/launchpad" element={<LaunchpadPage />} />
          <Route path="/list-token" element={<ListTokenPage />} />
        </Routes>
      </div>

      {/* Global Modals */}
      <TokenSelector />
      <SettingsPanel />
      <WalletModal />
      <TxModal />

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Global error toast */}
      {error && (
        <div
          className="fixed top-4 right-4 z-50 max-w-sm bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl animate-slide-up cursor-pointer backdrop-blur-xl"
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
