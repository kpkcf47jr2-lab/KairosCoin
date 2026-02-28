import React from 'react';
import { useStore } from '../store';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '../config/chains';

export default function Header() {
  const { account, isConnecting, connectWallet, disconnectWallet, chainId } = useStore();
  const chain = CHAINS[chainId];

  const shortAddr = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '';

  return (
    <header className="w-full px-4 sm:px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-brand-500/20">
            K
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">
              Kairos <span className="text-brand-400">Exchange</span>
            </h1>
            <p className="text-[10px] text-white/30 leading-none mt-0.5">DEX Aggregator</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Chain indicator */}
          {account && chain && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
              <span>{chain.icon}</span>
              <span>{chain.shortName}</span>
            </div>
          )}

          {/* Connect button */}
          {account ? (
            <button
              onClick={disconnectWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs">{shortAddr}</span>
            </button>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Connecting...
                </span>
              ) : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
