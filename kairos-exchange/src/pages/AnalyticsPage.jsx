import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { getTopTokens } from '../services/portfolio';
import { CHAINS } from '../config/chains';
import ChainSelector from '../components/ChainSelector';

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { chainId } = useStore();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getTopTokens(chainId).then(setTokens).catch(() => setTokens([])).finally(() => setLoading(false));
  }, [chainId]);

  const filtered = search.trim()
    ? tokens.filter(t => t.symbol?.toLowerCase().includes(search.toLowerCase()) || t.name?.toLowerCase().includes(search.toLowerCase()))
    : tokens;

  const fmt = (n) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mt-6 animate-fade-in">
      <h2 className="text-xl font-bold text-white mb-4">📈 {t('token_analytics')}</h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1"><ChainSelector /></div>
        <input type="text" placeholder={t('search_token')} value={search} onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-brand-500/40 w-full sm:w-64" />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-6 w-6 text-brand-400 mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-white/30">{t('no_tokens_found')}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 text-xs text-white/30 font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-3">{t('tokens')}</div>
            <div className="col-span-2 text-right">{t('price')}</div>
            <div className="col-span-2 text-right">{t('price_change')}</div>
            <div className="col-span-2 text-right">{t('volume_24h')}</div>
            <div className="col-span-2 text-right">Liquidity</div>
          </div>

          {/* Rows */}
          {filtered.map((token, idx) => (
            <a key={token.address || idx} href={token.url} target="_blank" rel="noopener noreferrer"
              className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/3 transition-all border-b border-white/3 items-center">
              <div className="col-span-1 text-xs text-white/20">{idx + 1}</div>
              <div className="col-span-3">
                <div className="text-sm font-semibold text-white">{token.symbol}</div>
                <div className="text-[10px] text-white/30 truncate">{token.name}</div>
              </div>
              <div className="col-span-2 text-right text-sm font-mono text-white">
                ${token.price < 0.01 ? token.price.toExponential(2) : token.price.toFixed(4)}
              </div>
              <div className={`col-span-2 text-right text-sm font-mono ${token.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
              </div>
              <div className="col-span-2 text-right text-sm font-mono text-white/60">{fmt(token.volume24h)}</div>
              <div className="col-span-2 text-right text-sm font-mono text-white/60">{fmt(token.liquidity)}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
