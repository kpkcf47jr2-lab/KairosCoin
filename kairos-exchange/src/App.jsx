import React from 'react';
import Header from './components/Header';
import ChainSelector from './components/ChainSelector';
import SwapCard from './components/SwapCard';
import TokenSelector from './components/TokenSelector';
import SettingsPanel from './components/SettingsPanel';
import Stats from './components/Stats';
import { useStore } from './store';

export default function App() {
  const { error, setError } = useStore();

  return (
    <div className="min-h-screen bg-dark-300 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-600/2 rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header />

        {/* Hero section */}
        <div className="text-center px-4 mt-4 sm:mt-8 mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Best Price. <span className="text-brand-400">Every Swap.</span>
          </h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            Trade any token at the best price across 100+ DEXes on 5 blockchains. One click, zero hassle.
          </p>

          {/* Chain Selector */}
          <div className="mt-5">
            <ChainSelector />
          </div>
        </div>

        {/* Swap Card */}
        <SwapCard />

        {/* Stats & Info */}
        <Stats />
      </div>

      {/* Modals */}
      <TokenSelector />
      <SettingsPanel />

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
  );
}
