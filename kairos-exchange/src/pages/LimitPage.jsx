import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { getPrice } from '../services/aggregator';
import { CHAINS } from '../config/chains';
import { NATIVE_ADDRESS } from '../config/tokens';
import ChainSelector from '../components/ChainSelector';

const API_BASE = 'https://kairos-api-u6k5.onrender.com/api/limit-orders';

// Expiry countdown helper component
function ExpiryCountdown({ order, t }) {
  const expiresAt = new Date(order.expiryAt || order.expiryAt).getTime();
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return <span className="text-red-400">{t('expired')}</span>;
  const hours = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  if (hours > 24) return <span>{t('expires_in')} {Math.floor(hours / 24)}d {hours % 24}h</span>;
  return <span>{t('expires_in')} {hours}h {mins}m</span>;
}

export default function LimitPage() {
  const { t } = useTranslation();
  const { account, provider, chainId, sellToken, buyToken, setShowTokenSelector, setShowWalletModal } = useStore();

  const [limitPrice, setLimitPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [expiry, setExpiry] = useState('24h');
  const [currentPrice, setCurrentPrice] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Fetch orders from backend
  const fetchOrders = useCallback(async () => {
    if (!account) return;
    try {
      const res = await fetch(`${API_BASE}?wallet=${account}&status=open&chainId=${chainId}`);
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch (err) {
      console.warn('Failed to fetch limit orders:', err.message);
    }
  }, [account, chainId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Fetch current market price
  useEffect(() => {
    if (!sellToken || !buyToken) return;
    const fetchPriceFn = async () => {
      try {
        const decimals = sellToken.decimals || 18;
        const amt = (10n ** BigInt(decimals)).toString(); // 1 unit
        const data = await getPrice({
          chainId, sellToken: sellToken.address, buyToken: buyToken.address, sellAmount: amt,
        });
        if (data?.price) setCurrentPrice(parseFloat(data.price));
      } catch {}
    };
    fetchPriceFn();
    const interval = setInterval(fetchPriceFn, 15000);
    return () => clearInterval(interval);
  }, [sellToken?.address, buyToken?.address, chainId]);

  const buyAmount = sellAmount && limitPrice ? (parseFloat(sellAmount) * parseFloat(limitPrice)).toFixed(6) : '';

  const handlePlaceOrder = async () => {
    if (!account || !sellAmount || !limitPrice || placing) return;
    setPlacing(true);
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: account,
          chainId,
          sellToken: sellToken.address,
          sellSymbol: sellToken.symbol,
          sellAmount,
          sellDecimals: sellToken.decimals || 18,
          buyToken: buyToken.address,
          buySymbol: buyToken.symbol,
          buyAmount,
          buyDecimals: buyToken.decimals || 18,
          limitPrice,
          expiry,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSellAmount('');
        setLimitPrice('');
        fetchOrders();
      } else {
        console.error('Failed to place order:', data.error);
      }
    } catch (err) {
      console.error('Failed to place limit order:', err);
    } finally {
      setPlacing(false);
    }
  };

  const cancelOrder = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/${id}?wallet=${account}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchOrders();
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }
  };

  const openOrders = orders.filter(o => o.status === 'open');

  const EXPIRY_OPTIONS = [
    { label: `1 ${t('hours')}`, value: '1h' },
    { label: `24 ${t('hours')}`, value: '24h' },
    { label: `7 ${t('days')}`, value: '7d' },
    { label: `30 ${t('days')}`, value: '30d' },
  ];

  return (
    <div className="px-4 mt-4">
      <div className="text-center mb-4"><ChainSelector /></div>
      <div className="w-full max-w-[460px] mx-auto">
        <div className="glass-card p-5 animate-fade-in">
          <h2 className="text-base font-semibold text-white mb-4">📊 {t('limit_order')}</h2>

          {/* Sell token */}
          <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{t('you_sell')}</span>
              {currentPrice && <span className="text-xs text-white/30">{t('market_price')}: {currentPrice.toFixed(6)}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowTokenSelector('sell')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex-shrink-0">
                <span className="text-sm font-semibold text-white">{sellToken?.symbol || 'Select'}</span>
                <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <input type="text" inputMode="decimal" placeholder="0.0" value={sellAmount}
                onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v.split('.').length <= 2) setSellAmount(v); }}
                className="input-token" />
            </div>
          </div>

          {/* Limit price */}
          <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{t('limit_price')} ({buyToken?.symbol}/{sellToken?.symbol})</span>
              {currentPrice && (
                <button onClick={() => setLimitPrice(currentPrice.toFixed(6))} className="text-[10px] text-brand-400 hover:underline">{t('market_price')}</button>
              )}
            </div>
            <input type="text" inputMode="decimal" placeholder="0.0" value={limitPrice}
              onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v.split('.').length <= 2) setLimitPrice(v); }}
              className="input-token text-xl" />
          </div>

          {/* You receive preview */}
          <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{t('you_will_receive')}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowTokenSelector('buy')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex-shrink-0">
                <span className="text-sm font-semibold text-white">{buyToken?.symbol || 'Select'}</span>
                <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div className="input-token text-xl opacity-60">{buyAmount || '0.0'}</div>
            </div>
          </div>

          {/* Expiry */}
          <div className="mb-4">
            <span className="text-xs text-white/40 mb-2 block">{t('expiry')}</span>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setExpiry(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    expiry === opt.value ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Info */}
          {sellAmount && limitPrice && (
            <div className="rounded-xl bg-brand-500/5 border border-brand-500/10 p-3 mb-4 text-xs text-white/50 space-y-1">
              <div className="flex justify-between"><span>{t('when_price_reaches')}</span><span className="text-white font-mono">{limitPrice} {buyToken?.symbol}</span></div>
              <div className="flex justify-between"><span>{t('you_will_receive')}</span><span className="text-white font-mono">{buyAmount} {buyToken?.symbol}</span></div>
              <div className="flex justify-between"><span>{t('kairos_fee')}</span><span className="text-brand-400">0.15%</span></div>
            </div>
          )}

          {/* Action */}
          {!account ? (
            <button onClick={() => setShowWalletModal(true)} className="btn-primary w-full py-4 text-base">{t('connect_wallet')}</button>
          ) : (
            <button onClick={handlePlaceOrder} disabled={!sellAmount || !limitPrice || placing}
              className="btn-primary w-full py-4 text-base">{placing ? '...' : t('place_limit_order')}</button>
          )}
        </div>

        {/* Open Orders */}
        {openOrders.length > 0 && (
          <div className="glass-card p-4 mt-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-white mb-3">{t('open_orders')}</h3>
            <div className="space-y-2">
              {openOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                  <div>
                    <div className="text-xs text-white font-medium">{order.sellAmount} {order.sellToken?.symbol} → {order.buyAmount} {order.buyToken?.symbol}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">@ {order.limitPrice} • <ExpiryCountdown order={order} t={t} /></div>
                  </div>
                  <button onClick={() => cancelOrder(order.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-400/10 transition-all">{t('cancel')}</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
