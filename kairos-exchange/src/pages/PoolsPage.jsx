import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { CHAINS } from '../config/chains';
import ChainSelector from '../components/ChainSelector';

const CHAIN_SEARCH = {
  56: 'bsc', 1: 'ethereum', 8453: 'base', 42161: 'arbitrum', 137: 'polygon',
};

const DEX_ICONS = {
  'pancakeswap': '🥞', 'uniswap': '🦄', 'sushiswap': '🍣', 'curve': '🔵',
  'raydium': '☀️', 'aerodrome': '✈️', 'camelot': '⚔️', 'quickswap': '🔷',
};

function getDexIcon(name) {
  const lower = (name || '').toLowerCase();
  for (const [key, icon] of Object.entries(DEX_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '💧';
}

const fmt = (n) => {
  if (!n) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

export default function PoolsPage() {
  const { t } = useTranslation();
  const { chainId } = useStore();
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const chainSlug = CHAIN_SEARCH[chainId] || 'bsc';
    fetch(`https://api.dexscreener.com/latest/dex/search?q=KAIROS%20${chainSlug}`)
      .then(r => r.json())
      .then(data => {
        const pairs = (data.pairs || [])
          .filter(p => p.chainId === chainSlug)
          .slice(0, 10)
          .map(p => ({
            pair: `${p.baseToken?.symbol}/${p.quoteToken?.symbol}`,
            dex: p.dexId?.replace(/_/g, ' ') || 'DEX',
            tvl: p.liquidity?.usd || 0,
            volume24h: p.volume?.h24 || 0,
            priceChange: p.priceChange?.h24 || 0,
            url: p.url,
            icon: getDexIcon(p.dexId),
          }));
        if (pairs.length > 0) {
          setPools(pairs);
        } else {
          // Fallback: fetch top pairs on chain
          fetch(`https://api.dexscreener.com/latest/dex/search?q=USDT%20${chainSlug}`)
            .then(r => r.json())
            .then(fb => {
              const fallbackPairs = (fb.pairs || [])
                .filter(p => p.chainId === chainSlug && p.liquidity?.usd > 100000)
                .slice(0, 8)
                .map(p => ({
                  pair: `${p.baseToken?.symbol}/${p.quoteToken?.symbol}`,
                  dex: p.dexId?.replace(/_/g, ' ') || 'DEX',
                  tvl: p.liquidity?.usd || 0,
                  volume24h: p.volume?.h24 || 0,
                  priceChange: p.priceChange?.h24 || 0,
                  url: p.url,
                  icon: getDexIcon(p.dexId),
                }));
              setPools(fallbackPairs);
            })
            .catch(() => setPools([]));
        }
      })
      .catch(() => setPools([]))
      .finally(() => setLoading(false));
  }, [chainId]);

  return (
    <div className="max-w-3xl mx-auto px-4 mt-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">💧 {t('liquidity_pools')}</h2>
      </div>

      <div className="mb-5"><ChainSelector /></div>

      {/* Info banner */}
      <div className="glass-card p-5 mb-5 text-center">
        <div className="text-3xl mb-2">💧</div>
        <h3 className="text-lg font-bold text-white mb-2">{t('liquidity_pools')}</h3>
        <p className="text-sm text-white/40 max-w-md mx-auto mb-4">{t('pools_desc')}</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-6 w-6 text-brand-400 mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-12 text-sm text-white/30">{t('no_positions')}</div>
      ) : (
        <div className="space-y-2">
          {pools.map((pool, i) => (
            <a key={i} href={pool.url} target="_blank" rel="noopener noreferrer"
              className="glass-card p-4 flex items-center gap-4 hover:border-white/10 transition-all block">
              <span className="text-2xl">{pool.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{pool.pair}</div>
                <div className="text-xs text-white/30 capitalize">{pool.dex}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm text-white/60 font-mono">TVL: {fmt(pool.tvl)}</div>
                <div className="text-xs text-white/40 font-mono">Vol: {fmt(pool.volume24h)}</div>
              </div>
              <div className={`text-xs font-mono flex-shrink-0 ${pool.priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pool.priceChange >= 0 ? '+' : ''}{pool.priceChange?.toFixed(2)}%
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
