// Kairos Extension — Dashboard
// Main screen: balance, actions, KAIROS balance, recent activity

import React, { useEffect, useState } from 'react';
import { Send, Download, RefreshCw, Settings, Lock, Copy, Check, ExternalLink } from 'lucide-react';
import useStore from '../store/useStore';
import { CHAINS } from '../constants/chains';

export default function Dashboard() {
  const navigate = useStore(s => s.navigate);
  const lock = useStore(s => s.lock);
  const activeAddress = useStore(s => s.activeAddress);
  const activeChainId = useStore(s => s.activeChainId);
  const switchChain = useStore(s => s.switchChain);
  const balances = useStore(s => s.balances);
  const refreshBalances = useStore(s => s.refreshBalances);

  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChainSelect, setShowChainSelect] = useState(false);

  const chain = CHAINS[activeChainId];
  const shortAddr = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : '';

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [activeChainId, refreshBalances]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalances();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="flex flex-col h-full bg-dark-400">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        {/* Chain Selector */}
        <button
          onClick={() => setShowChainSelect(!showChainSelect)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-200 hover:bg-dark-100 transition-colors text-xs"
        >
          <span>{chain?.icon}</span>
          <span className="font-medium text-gray-300">{chain?.shortName}</span>
          <span className="text-gray-500 text-[10px]">▼</span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={handleRefresh} className="p-1.5 rounded-lg hover:bg-white/5">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => navigate('settings')} className="p-1.5 rounded-lg hover:bg-white/5">
            <Settings className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={lock} className="p-1.5 rounded-lg hover:bg-white/5">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* ── Chain Selector Dropdown ── */}
      {showChainSelect && (
        <div className="absolute top-12 left-4 right-4 z-40 card p-2 shadow-2xl shadow-black/50">
          {Object.values(CHAINS).map(c => (
            <button
              key={c.id}
              onClick={() => { switchChain(c.id); setShowChainSelect(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                c.id === activeChainId ? 'bg-kairos-400/10 text-kairos-400' : 'hover:bg-white/5 text-gray-300'
              }`}
            >
              <span>{c.icon}</span>
              <span className="font-medium">{c.name}</span>
              {c.id === activeChainId && <span className="ml-auto text-kairos-400">✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Address ── */}
      <button onClick={handleCopy} className="mx-4 flex items-center justify-center gap-1.5 py-1.5">
        <span className="text-xs text-gray-400 font-mono">{shortAddr}</span>
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-500" />}
      </button>

      {/* ── Balance Card ── */}
      <div className="mx-4 mt-2 card p-5 text-center bg-gradient-to-br from-dark-200 to-dark-300">
        <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{chain?.symbol} Balance</p>
        <p className="text-3xl font-bold text-white mb-1">
          {Number(balances.native).toFixed(4)}
        </p>
        <p className="text-sm text-gray-400">{chain?.symbol}</p>

        {/* KAIROS Balance */}
        {balances.kairos !== null && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-kairos-400 to-kairos-600 flex items-center justify-center">
                <span className="text-[8px] font-bold text-dark-500">K</span>
              </div>
              <span className="text-lg font-bold text-kairos-400">
                {Number(balances.kairos).toFixed(2)}
              </span>
              <span className="text-xs text-gray-400">KAIROS</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">≈ ${Number(balances.kairos).toFixed(2)} USD</p>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex gap-3 mx-4 mt-4">
        <button
          onClick={() => navigate('send')}
          className="flex-1 btn-gold flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
        >
          <Send className="w-4 h-4" /> Enviar
        </button>
        <button
          onClick={() => navigate('receive')}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-kairos-400 bg-kairos-400/10 hover:bg-kairos-400/15 border border-kairos-400/20 transition-colors"
        >
          <Download className="w-4 h-4" /> Recibir
        </button>
      </div>

      {/* ── Explorer Link ── */}
      <a
        href={`${chain?.explorer}/address/${activeAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-gray-500 hover:text-kairos-400 transition-colors"
      >
        <ExternalLink className="w-3 h-3" /> Ver en {chain?.shortName}Scan
      </a>

      {/* ── Footer ── */}
      <div className="mt-auto px-4 py-3 border-t border-white/5">
        <p className="text-[10px] text-gray-600 text-center">
          Kairos Wallet · Multi-chain · Segura
        </p>
      </div>
    </div>
  );
}
