import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { getTransactions, clearHistory } from '../services/history';
import { CHAINS } from '../config/chains';

export default function HistoryPage() {
  const { t } = useTranslation();
  const { account, chainId } = useStore();
  const [filter, setFilter] = useState('all');

  const transactions = useMemo(() => getTransactions({ account, type: filter }), [account, filter]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return t('just_now');
    if (diff < 3600000) return t('minutes_ago', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('hours_ago', { count: Math.floor(diff / 3600000) });
    return d.toLocaleDateString();
  };

  const statusColors = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    confirmed: 'text-emerald-400 bg-emerald-400/10',
    failed: 'text-red-400 bg-red-400/10',
  };

  const FILTERS = [
    { label: t('all'), value: 'all' },
    { label: t('swaps'), value: 'swap' },
    { label: t('approvals'), value: 'approval' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 mt-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">📜 {t('transaction_history')}</h2>
        {transactions.length > 0 && (
          <button onClick={() => { clearHistory(); window.location.reload(); }}
            className="text-xs text-white/30 hover:text-red-400 transition-colors">{t('clear_history')}</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === f.value ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
            }`}>{f.label}</button>
        ))}
      </div>

      {/* Transactions */}
      {!account ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-sm text-white/40">{t('connect_to_view')}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm text-white/60 mb-1">{t('no_transactions')}</p>
          <p className="text-xs text-white/30">{t('start_swapping')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => {
            const chain = CHAINS[tx.chainId];
            const sc = statusColors[tx.status] || statusColors.pending;
            return (
              <div key={tx.id} className="glass-card p-4 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-lg">
                      {tx.type === 'swap' ? '🔄' : '✅'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {tx.type === 'swap' ? `${tx.sellSymbol} → ${tx.buySymbol}` : `Approve ${tx.sellSymbol}`}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {chain && <span className="text-[10px] text-white/30">{chain.icon} {chain.shortName}</span>}
                        <span className="text-[10px] text-white/20">{formatTime(tx.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {tx.type === 'swap' && (
                      <div className="text-sm font-mono text-white/70">
                        {parseFloat(tx.sellAmount)?.toFixed(4)} → {parseFloat(tx.buyAmount)?.toFixed(4)}
                      </div>
                    )}
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${sc}`}>
                      {t(tx.status)}
                    </span>
                  </div>
                </div>
                {tx.hash && (
                  <a href={`${chain?.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                    className="block text-[10px] text-brand-400/60 hover:text-brand-400 transition-colors mt-2 font-mono truncate">
                    {tx.hash} ↗
                  </a>
                )}
                {tx.route?.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {tx.route.map((r, i) => (
                      <span key={i} className="text-[9px] text-white/20 bg-white/3 px-1.5 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
