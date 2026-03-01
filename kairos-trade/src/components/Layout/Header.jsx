// Kairos Trade — Top Header Bar (Premium v2.1 — i18n + Mobile Responsive)
import { Search, Bell, Wifi, WifiOff, Brain, TrendingUp, TrendingDown, Globe, Volume2, Menu, X, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import useStore from '../../store/useStore';
import { getBase, formatPair, QUOTE } from '../../utils/pairUtils';
import useTranslation from '../../hooks/useTranslation';

export default function Header({ onMenuToggle, mobileMenuOpen }) {
  const { selectedPair, currentPrice, priceChange24h, toggleAiPanel, aiPanelOpen, brokers, activeBroker } = useStore();
  const connected = brokers.some(b => b.connected);
  const connectedBroker = activeBroker || brokers.find(b => b.connected);
  const [searchFocused, setSearchFocused] = useState(false);
  const { t, lang, setLang } = useTranslation();

  return (
    <header
      className="h-[56px] shrink-0 flex items-center justify-between px-3 md:px-5"
      style={{
        borderBottom: '1px solid rgba(26,29,38,0.6)',
        background: 'linear-gradient(180deg, rgba(14,16,21,0.95) 0%, rgba(8,9,12,0.95) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Left: Hamburger (mobile) + Pair info */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.04] transition-all shrink-0"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
          {/* Pair badge */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))', border: '1px solid rgba(59,130,246,0.1)' }}>
              <span className="text-[var(--gold)]">{getBase(selectedPair).slice(0, 3)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] md:text-[14px] font-bold text-[var(--text)] tracking-wide leading-none truncate">{formatPair(selectedPair)}</h2>
              <span className="text-[9px] text-[var(--text-dim)]/60 font-medium hidden sm:inline">{t('header.spotTrading')}</span>
            </div>
          </div>

          {/* Divider — hide on very small screens */}
          <div className="w-px h-7 bg-[var(--border)]/50 shrink-0 hidden sm:block" />

          {/* Price */}
          {currentPrice && (
            <div className="shrink-0">
              <span className="text-[14px] md:text-[16px] font-mono font-bold text-[var(--text)] leading-none whitespace-nowrap">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Change badge */}
          {priceChange24h !== null && (
            <div className={`flex items-center gap-1 text-[10px] md:text-xs font-mono font-semibold px-1.5 md:px-2.5 py-1 rounded-lg
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

          {/* 24h label — desktop only */}
          <span className="text-[10px] text-[var(--text-dim)]/40 font-medium shrink-0 hidden lg:inline">24h</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-2 md:ml-3">
        {/* Connection status — compact on mobile */}
        <div className={`flex items-center gap-1 md:gap-1.5 text-[11px] px-2 md:px-3 py-1.5 rounded-lg transition-all
          ${connected
            ? 'text-[var(--green)] bg-[var(--green)]/[0.06] border border-[var(--green)]/10'
            : 'text-[var(--text-dim)] bg-white/[0.02] border border-[var(--border)]/50'
          }`}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="font-semibold truncate max-w-[60px] md:max-w-[100px] hidden sm:inline">{connected && connectedBroker ? connectedBroker.name || connectedBroker.broker : 'Demo'}</span>
          {connected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />}
        </div>

        {/* Pro ↔ Simple toggle */}
        <div className="flex items-center bg-white/[0.03] border border-[var(--border)]/50 rounded-lg p-0.5">
          <a href="https://kairos-exchange-app.netlify.app" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[var(--text-dim)] hover:text-[var(--text)] transition-all">
            <ArrowLeftRight size={11} />
            <span className="hidden sm:inline">Simple</span>
          </a>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--gold)]/10 text-[var(--gold)] text-[10px] font-bold border border-[var(--gold)]/15">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            Pro
          </div>
        </div>

        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          className="flex items-center gap-1 px-2 md:px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border text-[var(--text-dim)] hover:text-[var(--text)] bg-white/[0.02] border-[var(--border)]/50 hover:border-[var(--gold)]/20"
          title={t('common.language')}
        >
          <Globe size={13} />
          <span className="hidden sm:inline">{lang === 'es' ? 'ES' : 'EN'}</span>
        </button>

        {/* AI toggle */}
        <button
          onClick={toggleAiPanel}
          className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border
            ${aiPanelOpen
              ? 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/15'
              : 'text-[var(--text-dim)] hover:text-[var(--text)] bg-white/[0.02] border-[var(--border)]/50 hover:border-[var(--gold)]/20'
            }`}
          title="Kairos AI"
        >
          <Brain size={13} />
          <span className="hidden sm:inline">{t('header.ai')}</span>
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
