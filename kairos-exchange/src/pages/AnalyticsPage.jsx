import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { getTopTokens } from '../services/portfolio';
import { CHAINS } from '../config/chains';
import ChainSelector from '../components/ChainSelector';

const API_BASE = 'https://kairos-api-u6k5.onrender.com/api';

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="glass-card p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-white font-mono">{value}</div>
      <div className="text-[11px] text-white/40">{label}</div>
      {sub && <div className="text-[10px] text-brand-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { chainId } = useStore();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kairosStats, setKairosStats] = useState(null);
  const [limitStats, setLimitStats] = useState(null);

  useEffect(() => {
    setLoading(true);
    getTopTokens(chainId).then(setTokens).catch(() => setTokens([])).finally(() => setLoading(false));
  }, [chainId]);

  // Fetch Kairos-specific stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const [supplyRes, reservesRes, limitRes] = await Promise.allSettled([
          fetch(`${API_BASE}/supply`).then(r => r.json()),
          fetch(`${API_BASE}/reserves`).then(r => r.json()),
          fetch(`${API_BASE}/limit-orders/stats/summary`).then(r => r.json()),
        ]);
        if (supplyRes.status === 'fulfilled' && supplyRes.value?.data) {
          setKairosStats(prev => ({ ...prev, ...supplyRes.value.data }));
        }
        if (reservesRes.status === 'fulfilled' && reservesRes.value?.data) {
          setKairosStats(prev => ({ ...prev, reserves: reservesRes.value.data }));
        }
        if (limitRes.status === 'fulfilled' && limitRes.value?.stats) {
          setLimitStats(limitRes.value.stats);
        }
      } catch {}
    }
    fetchStats();
  }, []);

  const filtered = search.trim()
    ? tokens.filter(t => t.symbol?.toLowerCase().includes(search.toLowerCase()) || t.name?.toLowerCase().includes(search.toLowerCase()))
    : tokens;

  const fmt = (n) => {
    if (!n && n !== 0) return '$0';
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${Number(n).toFixed(2)}`;
  };

  const fmtNum = (n) => {
    if (!n && n !== 0) return '0';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mt-6 animate-fade-in">
      <h2 className="text-xl font-bold text-white mb-4">📈 {t('token_analytics')}</h2>

      {/* Kairos Protocol Stats */}
      {kairosStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon="◆"
            label="KAIROS Supply"
            value={fmtNum(kairosStats.totalSupply || kairosStats.total_supply)}
            sub="1 KAIROS = 1 USD"
          />
          <StatCard
            icon="🏦"
            label={t('reserves') || 'Reserves'}
            value={fmt(kairosStats.reserves?.totalReserves || kairosStats.reserves?.total_reserves || 0)}
            sub={`${(kairosStats.reserves?.backingRatio || kairosStats.reserves?.backing_ratio || 100)}% backed`}
          />
          <StatCard
            icon="📊"
            label={t('limit_orders') || 'Limit Orders'}
            value={limitStats?.open || 0}
            sub={`${limitStats?.filled || 0} filled total`}
          />
          <StatCard
            icon="🔗"
            label={t('chains') || 'Chains'}
            value="5"
            sub="BSC • ETH • Base • Arb • Polygon"
          />
        </div>
      )}

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
            <div className="col-span-2 text-right">{t('liquidity')}</div>
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
