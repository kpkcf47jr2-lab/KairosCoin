import React from 'react';
import { useStore } from '../store';
import { WALLET_OPTIONS } from '../services/wallet';
import { useTranslation } from 'react-i18next';

export default function WalletModal() {
  const { t } = useTranslation();
  const { showWalletModal, setShowWalletModal, connectWallet, isConnecting, error } = useStore();
  if (!showWalletModal) return null;

  const recommended = WALLET_OPTIONS.filter(w => w.recommended);
  const others = WALLET_OPTIONS.filter(w => !w.recommended);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowWalletModal(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm mx-4 bg-dark-200 border border-white/10 rounded-2xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">{t('choose_wallet')}</h3>
          <button onClick={() => setShowWalletModal(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
        </div>

        {/* Recommended: Kairos Wallet */}
        {recommended.map(w => (
          <button key={w.id} onClick={() => connectWallet(w)} disabled={isConnecting}
            className="w-full flex items-center gap-3 p-4 rounded-xl mb-3 bg-gradient-to-r from-brand-500/10 to-brand-600/5 border border-brand-500/20 hover:border-brand-500/40 transition-all group">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: `${w.brandColor}20`, color: w.brandColor }}>
              {w.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{w.name}</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-brand-500/20 text-brand-400 rounded-md">{t('recommended')}</span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{w.description}</p>
            </div>
            <svg className="w-4 h-4 text-white/20 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        ))}

        {/* Divider */}
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-white/20 uppercase tracking-widest">{t('popular')}</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Other wallets */}
        <div className="space-y-1.5">
          {others.map(w => {
            const installed = w.checkInstalled?.();
            return (
              <button key={w.id} onClick={() => connectWallet(w)} disabled={isConnecting}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group">
                <span className="text-xl w-8 text-center">{w.icon}</span>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-white/80">{w.name}</span>
                  {installed === false && <span className="ml-2 text-[10px] text-white/30">Not installed</span>}
                </div>
                {installed !== undefined && (
                  <span className={`w-2 h-2 rounded-full ${installed ? 'bg-emerald-400' : 'bg-white/10'}`} />
                )}
              </button>
            );
          })}
        </div>

        {isConnecting && (
          <div className="mt-4 text-center text-sm text-brand-400 animate-pulse">{t('connecting')}</div>
        )}

        {error && !isConnecting && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
