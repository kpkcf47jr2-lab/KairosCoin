import React from 'react';
import { useStore } from '../store';
import { CHAINS } from '../config/chains';
import { useTranslation } from 'react-i18next';

export default function TxModal() {
  const { t } = useTranslation();
  const { showTxModal, setShowTxModal, txHash, txStatus, chainId, sellToken, buyToken, sellAmount, buyAmount } = useStore();
  if (!showTxModal) return null;

  const chain = CHAINS[chainId];
  const explorerUrl = txHash ? `${chain?.explorerUrl}/tx/${txHash}` : null;

  const statusConfig = {
    pending: { icon: '⏳', color: 'text-yellow-400', bg: 'bg-yellow-400/10', title: t('tx_pending') },
    confirming: { icon: '🔄', color: 'text-blue-400', bg: 'bg-blue-400/10', title: t('tx_submitted') },
    confirmed: { icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-400/10', title: t('tx_confirmed') },
    failed: { icon: '❌', color: 'text-red-400', bg: 'bg-red-400/10', title: t('tx_failed') },
  };
  const cfg = statusConfig[txStatus] || statusConfig.pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => txStatus !== 'pending' && setShowTxModal(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm mx-4 bg-dark-200 border border-white/10 rounded-2xl p-6 animate-slide-up text-center" onClick={e => e.stopPropagation()}>
        {/* Status icon */}
        <div className={`w-16 h-16 rounded-full ${cfg.bg} flex items-center justify-center text-3xl mx-auto mb-4 ${txStatus === 'pending' || txStatus === 'confirming' ? 'animate-pulse' : ''}`}>
          {cfg.icon}
        </div>

        <h3 className={`text-lg font-bold ${cfg.color} mb-2`}>{cfg.title}</h3>

        {/* Swap summary */}
        {sellToken && buyToken && (
          <div className="flex items-center justify-center gap-2 text-sm text-white/60 mb-4">
            <span>{sellAmount} {sellToken.symbol}</span>
            <span className="text-white/20">→</span>
            <span>{buyAmount} {buyToken.symbol}</span>
          </div>
        )}

        {/* Spinner for pending */}
        {(txStatus === 'pending' || txStatus === 'confirming') && (
          <div className="flex items-center justify-center gap-2 text-sm text-white/40 mb-4">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {t('waiting_confirmation')}
          </div>
        )}

        {/* Explorer link */}
        {explorerUrl && (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors mb-4">
            {t('view_tx')} {chain?.shortName} ↗
          </a>
        )}

        {/* TX hash */}
        {txHash && (
          <p className="text-[11px] text-white/20 font-mono break-all mb-4">{txHash}</p>
        )}

        {/* Close button */}
        {(txStatus === 'confirmed' || txStatus === 'failed') && (
          <button onClick={() => setShowTxModal(false)} className="btn-primary w-full py-3 text-sm mt-2">
            {t('close')}
          </button>
        )}
      </div>
    </div>
  );
}
