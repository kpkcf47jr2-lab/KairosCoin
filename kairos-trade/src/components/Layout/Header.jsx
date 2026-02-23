// Kairos Trade — Top Header Bar (BingX-style)
import { Search, Bell, Wifi, WifiOff, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import useStore from '../../store/useStore';

export default function Header() {
  const { selectedPair, currentPrice, priceChange24h, toggleAiPanel, aiPanelOpen, brokers } = useStore();
  const connected = brokers.some(b => b.connected);

  return (
    <header className="h-[52px] shrink-0 flex items-center justify-between px-4" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Left: Pair info */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold text-[var(--text)] tracking-wide">{selectedPair}</h2>
          {currentPrice && (
            <span className="text-[15px] font-mono font-semibold text-[var(--text)]">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {priceChange24h !== null && (
            <div className={`flex items-center gap-0.5 text-xs font-mono px-2 py-0.5 rounded ${priceChange24h >= 0 ? 'text-[var(--green)] bg-[var(--green)]/8' : 'text-[var(--red)] bg-[var(--red)]/8'}`}>
              {priceChange24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {priceChange24h >= 0 ? '+' : ''}{priceChange24h?.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md ${connected ? 'text-[var(--green)] bg-[var(--green)]/8' : 'text-[var(--text-dim)] bg-white/[0.03]'}`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className="font-medium">{connected ? 'Conectado' : 'Sin broker'}</span>
        </div>

        {/* AI toggle */}
        <button
          onClick={toggleAiPanel}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${aiPanelOpen ? 'bg-[var(--gold)]/12 text-[var(--gold)]' : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.03]'}`}
          title="Kairos AI"
        >
          <Brain size={14} />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* Notifications */}
        <button className="p-1.5 rounded-md text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.03] transition-all relative">
          <Bell size={16} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[var(--gold)] rounded-full" />
        </button>
      </div>
    </header>
  );
}
