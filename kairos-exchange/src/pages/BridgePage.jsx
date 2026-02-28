import React, { useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '../config/chains';

export default function BridgePage() {
  const { t } = useTranslation();
  const { account, chainId, setShowWalletModal } = useStore();
  const [fromChain, setFromChain] = useState(chainId);
  const [toChain, setToChain] = useState(SUPPORTED_CHAIN_IDS.find(c => c !== chainId) || 1);
  const [amount, setAmount] = useState('');

  return (
    <div className="max-w-lg mx-auto px-4 mt-6 animate-fade-in">
      <h2 className="text-xl font-bold text-white mb-5">🌉 {t('cross_chain_bridge')}</h2>

      <div className="glass-card p-5">
        {/* Info */}
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🌉</div>
          <p className="text-sm text-white/40 max-w-sm mx-auto mb-4">{t('bridge_desc')}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-5">
            <span className="text-brand-400 text-sm font-semibold">{t('coming_soon')}</span>
          </div>
        </div>

        {/* From chain */}
        <div className="mb-4">
          <label className="text-xs text-white/40 mb-2 block">{t('from_chain')}</label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_CHAIN_IDS.map(id => {
              const c = CHAINS[id];
              return (
                <button key={id} onClick={() => { setFromChain(id); if (toChain === id) setToChain(SUPPORTED_CHAIN_IDS.find(cc => cc !== id) || 1); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    fromChain === id ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}>
                  <span>{c.icon}</span> {c.shortName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-2">
          <button onClick={() => { const tmp = fromChain; setFromChain(toChain); setToChain(tmp); }}
            className="w-10 h-10 rounded-xl bg-dark-200 border border-white/10 flex items-center justify-center text-white/50 hover:text-brand-400 hover:border-brand-500/30 transition-all active:scale-90">
            ↕
          </button>
        </div>

        {/* To chain */}
        <div className="mb-4">
          <label className="text-xs text-white/40 mb-2 block">{t('to_chain')}</label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_CHAIN_IDS.filter(id => id !== fromChain).map(id => {
              const c = CHAINS[id];
              return (
                <button key={id} onClick={() => setToChain(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    toChain === id ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}>
                  <span>{c.icon}</span> {c.shortName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mb-4">
          <span className="text-xs text-white/40 mb-2 block">Amount</span>
          <input type="text" inputMode="decimal" placeholder="0.0" value={amount}
            onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v.split('.').length <= 2) setAmount(v); }}
            className="input-token" />
        </div>

        {/* Route preview */}
        <div className="flex items-center justify-center gap-3 mb-4 py-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/50">
            <span>{CHAINS[fromChain]?.icon}</span> {CHAINS[fromChain]?.shortName}
          </div>
          <span className="text-white/20">→</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/50">
            <span>{CHAINS[toChain]?.icon}</span> {CHAINS[toChain]?.shortName}
          </div>
        </div>

        {/* Action */}
        {!account ? (
          <button onClick={() => setShowWalletModal(true)} className="btn-primary w-full py-4 text-base">{t('connect_wallet')}</button>
        ) : (
          <button disabled className="btn-primary w-full py-4 text-base opacity-50">{t('coming_soon')}</button>
        )}
      </div>
    </div>
  );
}
