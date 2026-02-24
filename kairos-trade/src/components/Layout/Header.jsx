// Kairos Trade — Top Header Bar (Premium v2)
import { Search, Bell, Wifi, WifiOff, Brain, TrendingUp, TrendingDown, Globe, Volume2 } from 'lucide-react';
import { useState } from 'react';
import useStore from '../../store/useStore';
import { getBase, QUOTE } from '../../utils/pairUtils';

export default function Header() {
  const { selectedPair, currentPrice, priceChange24h, toggleAiPanel, aiPanelOpen, brokers } = useStore();
  const connected = brokers.some(b => b.connected);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header
      className="h-[56px] shrink-0 flex items-center justify-between px-5"
      style={{
        borderBottom: '1px solid rgba(26,29,38,0.6)',
        background: 'linear-gradient(180deg, rgba(14,16,21,0.95) 0%, rgba(8,9,12,0.95) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Left: Pair info */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          {/* Pair badge */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))', border: '1px solid rgba(59,130,246,0.1)' }}>
              <span className="text-[var(--gold)]">{getBase(selectedPair).slice(0, 3)}</span>
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[var(--text)] tracking-wide leading-none">{selectedPair}</h2>
              <span className="text-[9px] text-[var(--text-dim)]/60 font-medium">Perpetual</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-[var(--border)]/50" />

          {/* Price */}
          {currentPrice && (
            <div>
              <span className="text-[16px] font-mono font-bold text-[var(--text)] leading-none">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Change badge */}
          {priceChange24h !== null && (
            <div className={`flex items-center gap-1 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg
              ${priceChange24h >= 0
                ? 'text-[var(--green)] bg-[var(--green)]/[0.08]'
                : 'text-[var(--red)] bg-[var(--red)]/[0.08]'
              }`}
              style={{ border: `1px solid ${priceChange24h >= 0 ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)'}` }}
            >
              {priceChange24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {priceChange24h >= 0 ? '+' : ''}{priceChange24h?.toFixed(2)}%
            </div>
          )}

          {/* 24h label */}
          <span className="text-[10px] text-[var(--text-dim)]/40 font-medium">24h</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-all
          ${connected
            ? 'text-[var(--green)] bg-[var(--green)]/[0.06] border border-[var(--green)]/10'
            : 'text-[var(--text-dim)] bg-white/[0.02] border border-[var(--border)]/50'
          }`}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="font-semibold">{connected ? 'Live' : 'Demo'}</span>
        </div>

        {/* AI toggle */}
        <button
          onClick={toggleAiPanel}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border
            ${aiPanelOpen
              ? 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/15'
              : 'text-[var(--text-dim)] hover:text-[var(--text)] bg-white/[0.02] border-[var(--border)]/50 hover:border-[var(--gold)]/20'
            }`}
          title="Kairos AI"
        >
          <Brain size={13} />
          <span>AI</span>
          {aiPanelOpen && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] bg-white/[0.02] border border-[var(--border)]/50 hover:border-[var(--border)] transition-all relative">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--gold)] rounded-full shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
        </button>
      </div>
    </header>
  );
}
