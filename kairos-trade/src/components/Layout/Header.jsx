// Kairos Trade — Top Header Bar
import { Search, Bell, Wifi, WifiOff, Brain } from 'lucide-react';
import useStore from '../../store/useStore';

export default function Header() {
  const { selectedPair, currentPrice, priceChange24h, toggleAiPanel, aiPanelOpen, brokers } = useStore();
  const connected = brokers.some(b => b.connected);

  return (
    <header className="h-12 border-b border-[var(--border)] bg-[var(--dark-2)] flex items-center justify-between px-4 shrink-0">
      {/* Left: Pair info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text)]">{selectedPair}</span>
          {currentPrice && (
            <span className="text-sm font-mono text-[var(--gold)]">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {priceChange24h !== null && (
            <span className={`text-xs font-mono ${priceChange24h >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {priceChange24h >= 0 ? '+' : ''}{priceChange24h?.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className={`flex items-center gap-1 text-xs ${connected ? 'text-[var(--green)]' : 'text-[var(--text-dim)]'}`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Conectado' : 'Sin broker'}
        </div>

        {/* AI toggle */}
        <button
          onClick={toggleAiPanel}
          className={`p-1.5 rounded-lg transition-colors ${aiPanelOpen ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'text-[var(--text-dim)] hover:text-[var(--gold)]'}`}
          title="Kairos AI"
        >
          <Brain size={18} />
        </button>

        {/* Notifications */}
        <button className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] transition-colors relative">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--gold)] rounded-full" />
        </button>
      </div>
    </header>
  );
}
