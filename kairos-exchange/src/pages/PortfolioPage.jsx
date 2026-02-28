import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { getTokenBalances, getTokenPrices } from '../services/portfolio';
import { TOKENS, NATIVE_ADDRESS } from '../config/tokens';
import { CHAINS } from '../config/chains';
import { getCustomTokens } from '../services/history';

// CoinGecko native price fetcher with 5-min cache
const CG_IDS = { 56: 'binancecoin', 1: 'ethereum', 8453: 'ethereum', 42161: 'ethereum', 137: 'matic-network' };
const FALLBACK = { 56: 600, 1: 3200, 8453: 3200, 42161: 3200, 137: 0.4 };
let _npCache = { data: null, ts: 0 };
async function getNativePrice(chainId) {
  if (_npCache.data && Date.now() - _npCache.ts < 300000) return _npCache.data[chainId] || FALLBACK[chainId] || 0;
  try {
    const ids = [...new Set(Object.values(CG_IDS))].join(',');
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const d = await r.json();
    const prices = {};
    for (const [cid, cgId] of Object.entries(CG_IDS)) prices[cid] = d[cgId]?.usd || FALLBACK[cid] || 0;
    _npCache = { data: prices, ts: Date.now() };
    return prices[chainId] || FALLBACK[chainId] || 0;
  } catch { return FALLBACK[chainId] || 0; }
}

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { account, provider, chainId, setShowWalletModal } = useStore();
  const [balances, setBalances] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const chain = CHAINS[chainId];

  const fetchPortfolio = useCallback(async () => {
    if (!provider || !account) return;
    setLoading(true);
    try {
      const tokens = [...(TOKENS[chainId] || []), ...getCustomTokens(chainId)];
      const bals = await getTokenBalances(provider, account, tokens);
      setBalances(bals);

      // Fetch prices for non-native tokens
      const addresses = bals.filter(t => !t.isNative).map(t => t.address);
      if (addresses.length) {
        const p = await getTokenPrices(chainId, addresses);
        setPrices(p);
      }
    } catch (err) {
      console.warn('Portfolio error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider, account, chainId]);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  const [nativePrice, setNativePrice] = useState(FALLBACK[chainId] || 0);
  useEffect(() => { getNativePrice(chainId).then(setNativePrice); }, [chainId]);

  // Calculate total value
  const totalValue = balances.reduce((sum, token) => {
    if (token.isNative) return sum + token.balance * nativePrice;
    const p = prices[token.address?.toLowerCase()];
    return sum + token.balance * (p?.price || 0);
  }, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 mt-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">💼 {t('portfolio')}</h2>
        {account && (
          <button onClick={fetchPortfolio} disabled={loading}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            {loading ? t('refreshing') : t('refresh')}
          </button>
        )}
      </div>

      {!account ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-sm text-white/40 mb-4">{t('connect_to_view')}</p>
          <button onClick={() => setShowWalletModal(true)} className="btn-primary px-6 py-3 text-sm">{t('connect_wallet')}</button>
        </div>
      ) : (
        <>
          {/* Total Value Card */}
          <div className="glass-card p-6 mb-5 text-center">
            <p className="text-xs text-white/40 mb-1">{t('total_value')} • {chain?.shortName}</p>
            <p className="text-3xl font-bold text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-white/20 mt-2 font-mono">{account}</p>
          </div>

          {/* Token list */}
          {loading ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-6 w-6 text-brand-400 mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center py-8 text-sm text-white/30">{t('no_tokens_found')}</div>
          ) : (
            <div className="space-y-2">
              {balances.map(token => {
                const price = token.isNative
                  ? nativePrice
                  : prices[token.address?.toLowerCase()]?.price || 0;
                const value = token.balance * price;
                const change = prices[token.address?.toLowerCase()]?.priceChange24h;

                return (
                  <div key={token.address} className="glass-card p-4 flex items-center gap-3 hover:border-white/10 transition-all">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {token.logoURI ? (
                        <img src={token.logoURI} alt="" className="w-10 h-10 rounded-full" onError={e => e.target.style.display='none'} />
                      ) : (
                        <span className={`text-sm font-bold ${token.isKairos ? 'text-brand-400' : 'text-white/60'}`}>
                          {token.isKairos ? 'K' : token.symbol?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{token.symbol}</span>
                        {token.isKairos && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-brand-500/20 text-brand-400 rounded-md">KAIROS</span>}
                        {token.isCustom && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-400 rounded-md">{t('imported')}</span>}
                      </div>
                      <p className="text-xs text-white/30">{token.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono text-white">{token.balance < 0.0001 ? token.balance.toExponential(2) : token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                      <p className="text-xs text-white/30 font-mono">${value.toFixed(2)}</p>
                      {change !== undefined && change !== null && (
                        <p className={`text-[10px] font-mono ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
