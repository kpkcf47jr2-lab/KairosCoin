import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { CHAINS } from '../config/chains';
import { WALLET_OPTIONS } from '../services/wallet';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { path: '/', label: 'nav_swap', icon: '🔄' },
  { path: '/limit', label: 'nav_limit', icon: '📊' },
  { path: '/history', label: 'nav_history', icon: '📜' },
  { path: '/portfolio', label: 'nav_portfolio', icon: '💼' },
  { path: '/analytics', label: 'nav_analytics', icon: '📈' },
  { path: '/pools', label: 'nav_pools', icon: '💧' },
  { path: '/bridge', label: 'nav_bridge', icon: '🌉' },
];

export default function Header() {
  const { t, i18n } = useTranslation();
  const { account, isConnecting, disconnectWallet, chainId, walletId, setShowWalletModal, language, setLanguage } = useStore();
  const chain = CHAINS[chainId];

  const shortAddr = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '';
  const walletInfo = WALLET_OPTIONS.find(w => w.id === walletId);

  const toggleLang = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  };

  return (
    <header className="w-full px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-brand-500/20">K</div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Kairos <span className="text-brand-400">Exchange</span></h1>
              <p className="text-[10px] text-white/30 leading-none mt-0.5">{t('dex_aggregator')}</p>
            </div>
          </NavLink>

          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all" title={t('language')}>
              {language === 'es' ? '🇪🇸' : '🇺🇸'}
            </button>

            {account && chain && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
                <span>{chain.icon}</span>
                <span>{chain.shortName}</span>
              </div>
            )}

            {account ? (
              <button onClick={disconnectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-all">
                {walletInfo && <span className="text-xs">{walletInfo.icon}</span>}
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs">{shortAddr}</span>
              </button>
            ) : (
              <button onClick={() => setShowWalletModal(true)} disabled={isConnecting} className="btn-primary px-5 py-2.5 text-sm">
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {t('connecting')}
                  </span>
                ) : t('connect_wallet')}
              </button>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'
              }`}>
              <span className="text-sm">{item.icon}</span>
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
