import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Stats() {
  const { t } = useTranslation();

  const STATS = [
    { label: t('supported_dexes'), value: '100+', icon: '🔄' },
    { label: t('blockchains'), value: '5', icon: '⛓️' },
    { label: t('tokens'), value: '1000s', icon: '🪙' },
    { label: t('fee'), value: '0.15%', icon: '💎' },
  ];

  const DEXES = [
    { name: 'PancakeSwap', icon: '🥞' },
    { name: 'Uniswap', icon: '🦄' },
    { name: 'SushiSwap', icon: '🍣' },
    { name: 'Curve', icon: '🔴' },
    { name: 'Balancer', icon: '⚖️' },
    { name: 'DODO', icon: '🐤' },
    { name: 'TraderJoe', icon: '🎩' },
    { name: 'Camelot', icon: '⚔️' },
    { name: 'Velodrome', icon: '🚴' },
    { name: 'Aerodrome', icon: '✈️' },
    { name: 'KyberSwap', icon: '💎' },
    { name: 'Bancor', icon: '🔷' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 px-4 animate-fade-in">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {STATS.map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Connected DEXes */}
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-widest">{t('aggregating_from')}</h3>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {DEXES.map(d => (
          <div key={d.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/3 border border-white/5 text-xs text-white/40">
            <span>{d.icon}</span>
            <span>{d.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/5 border border-brand-500/10 text-xs text-brand-400">
          <span>+88 more</span>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-12 text-center max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-white mb-6">{t('how_it_works')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <div className="text-3xl mb-3">🔍</div>
            <h4 className="text-sm font-semibold text-white mb-1">1. {t('find_best_price')}</h4>
            <p className="text-xs text-white/40">{t('find_best_price_desc')}</p>
          </div>
          <div className="glass-card p-5">
            <div className="text-3xl mb-3">🔀</div>
            <h4 className="text-sm font-semibold text-white mb-1">2. {t('smart_routing')}</h4>
            <p className="text-xs text-white/40">{t('smart_routing_desc')}</p>
          </div>
          <div className="glass-card p-5">
            <div className="text-3xl mb-3">✅</div>
            <h4 className="text-sm font-semibold text-white mb-1">3. {t('execute')}</h4>
            <p className="text-xs text-white/40">{t('execute_desc')}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center border-t border-white/5 pt-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-extrabold">K</div>
          <span className="text-sm font-bold text-white">Kairos <span className="text-brand-400">Exchange</span></span>
        </div>
        <p className="text-xs text-white/30">Part of the Kairos 777 Ecosystem</p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-white/20">
          <a href="https://kairos-777.com" target="_blank" rel="noopener" className="hover:text-brand-400 transition-colors">Website</a>
          <a href="https://kairos-trade.netlify.app" target="_blank" rel="noopener" className="hover:text-brand-400 transition-colors">Trading</a>
          <a href="https://kairos-wallet.netlify.app" target="_blank" rel="noopener" className="hover:text-brand-400 transition-colors">Wallet</a>
          <a href="https://kairos-exchange-app.netlify.app" target="_blank" rel="noopener" className="hover:text-brand-400 transition-colors">Exchange</a>
          <a href="https://kairos-777.com/whitepaper.html" target="_blank" rel="noopener" className="hover:text-brand-400 transition-colors">Whitepaper</a>
        </div>
        <p className="text-[10px] text-white/10 mt-4">© 2026 Kaizen LLC — In God We Trust</p>
      </footer>
    </div>
  );
}
