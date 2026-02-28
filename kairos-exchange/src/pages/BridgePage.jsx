import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { CHAINS, SUPPORTED_CHAIN_IDS } from '../config/chains';

// Li.Fi (formerly LI.FI) free quote API
const LIFI_QUOTE_URL = 'https://li.quest/v1/quote';

// Native token addresses per chain for Li.Fi
const NATIVE_ADDRS = {
  56: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  1: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  8453: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  42161: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  137: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
};

export default function BridgePage() {
  const { t } = useTranslation();
  const { account, chainId, provider, setShowWalletModal } = useStore();
  const [fromChain, setFromChain] = useState(chainId);
  const [toChain, setToChain] = useState(SUPPORTED_CHAIN_IDS.find(c => c !== chainId) || 1);
  const [amount, setAmount] = useState('');
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [bridging, setBridging] = useState(false);
  const [txHash, setTxHash] = useState(null);

  // Fetch Li.Fi quote when amount changes
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || fromChain === toChain) {
      setQuoteData(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const fromAddr = NATIVE_ADDRS[fromChain];
        const toAddr = NATIVE_ADDRS[toChain];
        const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18)).toString();
        const url = `${LIFI_QUOTE_URL}?fromChain=${fromChain}&toChain=${toChain}&fromToken=${fromAddr}&toToken=${toAddr}&fromAmount=${amountWei}&fromAddress=${account || '0x0000000000000000000000000000000000000000'}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('No route found');
        const data = await res.json();
        setQuoteData(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setQuoteError(err.message || 'No bridge route available');
          setQuoteData(null);
        }
      } finally {
        setQuoteLoading(false);
      }
    }, 800);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [amount, fromChain, toChain, account]);

  // Execute bridge via Li.Fi transaction data
  const handleBridge = async () => {
    if (!quoteData?.transactionRequest || !provider || !account) return;
    setBridging(true);
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: quoteData.transactionRequest.to,
        data: quoteData.transactionRequest.data,
        value: quoteData.transactionRequest.value,
        gasLimit: quoteData.transactionRequest.gasLimit,
      });
      setTxHash(tx.hash);
      await tx.wait();
    } catch (err) {
      setQuoteError(err.reason || err.message || 'Bridge failed');
    } finally {
      setBridging(false);
    }
  };

  const estimatedReceive = quoteData?.estimate?.toAmountMin
    ? (parseFloat(quoteData.estimate.toAmountMin) / 1e18).toFixed(6)
    : null;

  const bridgeFee = quoteData?.estimate?.feeCosts?.[0]
    ? `$${(parseFloat(quoteData.estimate.feeCosts[0].amountUSD) || 0).toFixed(2)}`
    : null;

  const estimatedTime = quoteData?.estimate?.executionDuration
    ? `~${Math.ceil(quoteData.estimate.executionDuration / 60)}min`
    : null;

  return (
    <div className="max-w-lg mx-auto px-4 mt-6 animate-fade-in">
      <h2 className="text-xl font-bold text-white mb-5">🌉 {t('cross_chain_bridge')}</h2>

      <div className="glass-card p-5">
        <div className="text-center mb-5">
          <p className="text-sm text-white/40 max-w-sm mx-auto mb-4">{t('bridge_desc')}</p>
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
          <span className="text-xs text-white/40 mb-2 block">{t('amount')} ({CHAINS[fromChain]?.nativeCurrency || 'Native'})</span>
          <input type="text" inputMode="decimal" placeholder="0.0" value={amount}
            onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v.split('.').length <= 2) setAmount(v); }}
            className="input-token" />
        </div>

        {/* Quote preview */}
        {quoteLoading && (
          <div className="text-center py-3 text-xs text-brand-400 animate-pulse">{t('finding_best_price')}</div>
        )}

        {quoteData && !quoteLoading && (
          <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mb-4 space-y-2 animate-fade-in">
            {estimatedReceive && (
              <div className="flex justify-between text-xs">
                <span className="text-white/40">{t('you_receive')}</span>
                <span className="text-white font-mono">{estimatedReceive} {CHAINS[toChain]?.nativeCurrency || 'Native'}</span>
              </div>
            )}
            {quoteData.toolDetails?.name && (
              <div className="flex justify-between text-xs">
                <span className="text-white/40">{t('route')}</span>
                <span className="text-white/60">{quoteData.toolDetails.name}</span>
              </div>
            )}
            {bridgeFee && (
              <div className="flex justify-between text-xs">
                <span className="text-white/40">{t('kairos_fee')}</span>
                <span className="text-white/60">{bridgeFee}</span>
              </div>
            )}
            {estimatedTime && (
              <div className="flex justify-between text-xs">
                <span className="text-white/40">ETA</span>
                <span className="text-white/60">{estimatedTime}</span>
              </div>
            )}
          </div>
        )}

        {quoteError && !quoteLoading && (
          <div className="text-center text-xs text-red-400/70 mb-3">{quoteError}</div>
        )}

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

        {txHash && (
          <div className="mb-3 text-center">
            <a href={`${CHAINS[fromChain]?.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand-400 hover:underline">
              ✓ {t('view_tx')} {CHAINS[fromChain]?.shortName} →
            </a>
          </div>
        )}

        {/* Action */}
        {!account ? (
          <button onClick={() => setShowWalletModal(true)} className="btn-primary w-full py-4 text-base">{t('connect_wallet')}</button>
        ) : bridging ? (
          <button disabled className="btn-primary w-full py-4 text-base opacity-60">
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Bridging...
            </span>
          </button>
        ) : quoteData?.transactionRequest ? (
          <button onClick={handleBridge} className="btn-primary w-full py-4 text-base">
            Bridge {CHAINS[fromChain]?.shortName} → {CHAINS[toChain]?.shortName}
          </button>
        ) : (
          <button disabled className="btn-primary w-full py-4 text-base opacity-40">
            {amount && parseFloat(amount) > 0 ? (quoteLoading ? t('finding_best_price') : 'Enter amount to bridge') : t('enter_amount')}
          </button>
        )}
      </div>
    </div>
  );
}
