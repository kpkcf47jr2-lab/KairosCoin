import React from 'react';
import { useTranslation } from 'react-i18next';
import ChainSelector from '../components/ChainSelector';

const POOLS_DATA = [
  { pair: 'KAIROS/USDT', dex: 'PancakeSwap V3', tvl: '$2.4M', apr: '18.5%', icon: '🥞' },
  { pair: 'KAIROS/BNB', dex: 'PancakeSwap V2', tvl: '$890K', apr: '24.2%', icon: '🥞' },
  { pair: 'KAIROS/USDC', dex: 'Uniswap V3', tvl: '$1.1M', apr: '15.8%', icon: '🦄' },
  { pair: 'ETH/USDT', dex: 'Uniswap V3', tvl: '$45M', apr: '8.2%', icon: '🦄' },
  { pair: 'BNB/USDT', dex: 'PancakeSwap V3', tvl: '$32M', apr: '6.5%', icon: '🥞' },
  { pair: 'KAIROS/ETH', dex: 'SushiSwap', tvl: '$340K', apr: '32.1%', icon: '🍣' },
];

export default function PoolsPage() {
  const { t } = useTranslation();

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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <span className="text-brand-400 text-sm font-semibold">{t('coming_soon')}</span>
        </div>
      </div>

      {/* Pool previews */}
      <div className="space-y-2">
        {POOLS_DATA.map((pool, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-4 hover:border-white/10 transition-all opacity-80">
            <span className="text-2xl">{pool.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{pool.pair}</div>
              <div className="text-xs text-white/30">{pool.dex}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60 font-mono">TVL: {pool.tvl}</div>
              <div className="text-xs text-emerald-400 font-mono">APR: {pool.apr}</div>
            </div>
            <button disabled className="btn-secondary px-3 py-1.5 text-xs opacity-50">{t('add_liquidity')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
