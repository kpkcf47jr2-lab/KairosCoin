import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { getQuote, checkAndApprove, executeSwap, DEX_SOURCES } from '../services/aggregator';
import { NATIVE_ADDRESS } from '../config/tokens';
import { CHAINS } from '../config/chains';

export default function SwapCard() {
  const {
    account, provider, chainId, connectWallet,
    sellToken, buyToken, sellAmount, buyAmount, slippage, safeMode,
    quote, isQuoting, isSwapping, txHash, error,
    setSellAmount, setBuyAmount, setQuote, setIsQuoting, setIsSwapping, setTxHash, setError,
    setShowTokenSelector, setShowSettings, flipTokens,
  } = useStore();

  const debounceRef = useRef(null);
  const [approving, setApproving] = useState(false);
  const [swapStep, setSwapStep] = useState(''); // idle | quoting | approving | swapping | done | error

  // ── Fetch Quote with debounce ──
  const fetchQuote = useCallback(async (amount) => {
    if (!sellToken || !buyToken || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setBuyAmount('');
      return;
    }

    setIsQuoting(true);
    setError(null);
    try {
      const decimals = sellToken.decimals || 18;
      const sellAmountWei = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals)).toString();

      const q = await getQuote({
        chainId,
        sellToken: sellToken.address,
        buyToken: buyToken.address,
        sellAmount: sellAmountWei,
        slippage,
      });

      setQuote(q);

      // Format buy amount
      const buyDecimals = buyToken.decimals || 18;
      const buyFloat = Number(BigInt(q.buyAmount)) / 10 ** buyDecimals;
      setBuyAmount(buyFloat > 0.001 ? buyFloat.toFixed(6) : buyFloat.toFixed(10));
    } catch (err) {
      console.warn('Quote error:', err);
      setQuote(null);
      setBuyAmount('');
      if (err.message?.includes('INSUFFICIENT_ASSET_LIQUIDITY')) {
        setError('Insufficient liquidity for this pair.');
      } else {
        setError(err.message || 'Failed to get quote');
      }
    } finally {
      setIsQuoting(false);
    }
  }, [sellToken, buyToken, chainId, slippage]);

  // Debounced quote
  const handleAmountChange = (val) => {
    setSellAmount(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuote(val), 500);
  };

  // Refresh quote when tokens change
  useEffect(() => {
    if (sellAmount && parseFloat(sellAmount) > 0) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchQuote(sellAmount), 300);
    }
  }, [sellToken?.address, buyToken?.address, chainId]);

  // ── Execute Swap ──
  const handleSwap = async () => {
    if (!provider || !quote || !account) return;

    setIsSwapping(true);
    setError(null);
    setTxHash(null);

    try {
      // Step 1: Approve if ERC20 (not native token)
      if (sellToken.address !== NATIVE_ADDRESS && quote.allowanceTarget) {
        setSwapStep('approving');
        const decimals = sellToken.decimals || 18;
        const sellAmountWei = BigInt(Math.floor(parseFloat(sellAmount) * 10 ** decimals)).toString();
        await checkAndApprove({
          provider,
          tokenAddress: sellToken.address,
          spender: quote.allowanceTarget,
          amount: sellAmountWei,
        });
      }

      // Step 2: Execute swap
      setSwapStep('swapping');
      const tx = await executeSwap({ provider, quoteData: quote });
      setTxHash(tx.hash);
      setSwapStep('done');

      // Wait for confirmation
      await tx.wait();
    } catch (err) {
      console.error('Swap error:', err);
      setSwapStep('error');
      if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected by user');
      } else {
        setError(err.reason || err.message || 'Swap failed');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  // ── Rate display ──
  const rate = quote && sellToken && buyToken
    ? `1 ${sellToken.symbol} ≈ ${parseFloat(quote.price).toFixed(6)} ${buyToken.symbol}`
    : null;

  const chain = CHAINS[chainId];

  return (
    <div className="w-full max-w-[460px] mx-auto">
      {/* Card */}
      <div className="glass-card p-4 sm:p-5 animate-fade-in">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Swap</h2>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        {/* ── SELL Token ── */}
        <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mb-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">You sell</span>
            <span className="text-xs text-white/30">Slippage: {slippage}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTokenSelector('sell')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex-shrink-0"
            >
              {sellToken?.logoURI ? (
                <img src={sellToken.logoURI} alt="" className="w-6 h-6 rounded-full" onError={(e) => e.target.style.display='none'} />
              ) : (
                <div className={`w-6 h-6 rounded-full ${sellToken?.isKairos ? 'bg-brand-500/30' : 'bg-white/10'} flex items-center justify-center text-xs font-bold`}>
                  {sellToken?.isKairos ? 'K' : sellToken?.symbol?.charAt(0)}
                </div>
              )}
              <span className="text-sm font-semibold text-white">{sellToken?.symbol || 'Select'}</span>
              <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={sellAmount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                if (val.split('.').length <= 2) handleAmountChange(val);
              }}
              className="input-token"
            />
          </div>
        </div>

        {/* ── Flip Button ── */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={flipTokens}
            className="w-10 h-10 rounded-xl bg-dark-200 border border-white/10 flex items-center justify-center text-white/50 hover:text-brand-400 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
          </button>
        </div>

        {/* ── BUY Token ── */}
        <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mt-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">You receive</span>
            {isQuoting && (
              <span className="text-xs text-brand-400 animate-pulse">Finding best price...</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTokenSelector('buy')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex-shrink-0"
            >
              {buyToken?.logoURI ? (
                <img src={buyToken.logoURI} alt="" className="w-6 h-6 rounded-full" onError={(e) => e.target.style.display='none'} />
              ) : (
                <div className={`w-6 h-6 rounded-full ${buyToken?.isKairos ? 'bg-brand-500/30' : 'bg-white/10'} flex items-center justify-center text-xs font-bold`}>
                  {buyToken?.isKairos ? 'K' : buyToken?.symbol?.charAt(0)}
                </div>
              )}
              <span className="text-sm font-semibold text-white">{buyToken?.symbol || 'Select'}</span>
              <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <input
              type="text"
              readOnly
              placeholder="0.0"
              value={isQuoting ? '...' : buyAmount}
              className="input-token opacity-80"
            />
          </div>
        </div>

        {/* ── Quote Info ── */}
        {quote && !isQuoting && (
          <div className="mt-3 space-y-2 animate-fade-in">
            {/* Rate */}
            {rate && (
              <div className="flex items-center justify-between px-1 text-xs text-white/40">
                <span>Rate</span>
                <span className="font-mono">{rate}</span>
              </div>
            )}

            {/* Route Visualization — which DEXes */}
            {quote.sources?.length > 0 && (
              <div className="px-1">
                <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                  <span>Route</span>
                  <span className="text-[10px] text-white/25">{quote.sources.length} source{quote.sources.length > 1 ? 's' : ''}</span>
                </div>
                <div className="rounded-lg bg-dark-300/50 border border-white/5 p-2 space-y-1">
                  {quote.sources.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs">{DEX_SOURCES[s.name]?.icon || '🔄'}</span>
                      <span className="text-[11px] text-white/60 flex-1">{s.name.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-500/60"
                            style={{ width: `${s.percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/50 font-mono w-8 text-right">{s.percentage}%</span>
                      </div>
                    </div>
                  ))}
                  {quote.sources.length > 4 && (
                    <div className="text-[10px] text-white/25 text-center">+{quote.sources.length - 4} more sources</div>
                  )}
                </div>
              </div>
            )}

            {/* Gas + Fee row */}
            <div className="flex items-center justify-between px-1 text-xs text-white/40">
              <span>Gas</span>
              <span className="font-mono">{quote.estimatedGasUsd ? `~$${quote.estimatedGasUsd}` : '—'}</span>
            </div>
            <div className="flex items-center justify-between px-1 text-xs text-white/40">
              <span>Kairos Fee</span>
              <span className="text-brand-400">0.15%</span>
            </div>

            {/* Safe Mode indicator */}
            {safeMode && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-[10px]">🛡️</span>
                <span className="text-[10px] text-emerald-400/80">MEV Protection Active</span>
              </div>
            )}
          </div>
        )}

        {/* ── Action Button ── */}
        <div className="mt-4">
          {!account ? (
            <button
              onClick={connectWallet}
              className="btn-primary w-full py-4 text-base"
            >
              Connect Wallet
            </button>
          ) : !sellAmount || parseFloat(sellAmount) <= 0 ? (
            <button disabled className="btn-primary w-full py-4 text-base opacity-40">
              Enter Amount
            </button>
          ) : isQuoting ? (
            <button disabled className="btn-primary w-full py-4 text-base opacity-60">
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Finding Best Price...
              </span>
            </button>
          ) : isSwapping ? (
            <button disabled className="btn-primary w-full py-4 text-base opacity-70">
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {swapStep === 'approving' ? 'Approving...' : 'Swapping...'}
              </span>
            </button>
          ) : quote ? (
            <button
              onClick={handleSwap}
              className="btn-primary w-full py-4 text-base"
            >
              Swap {sellToken?.symbol} → {buyToken?.symbol}
            </button>
          ) : (
            <button disabled className="btn-primary w-full py-4 text-base opacity-40">
              {error || 'Enter Amount'}
            </button>
          )}
        </div>

        {/* ── TX Hash ── */}
        {txHash && (
          <div className="mt-3 text-center animate-fade-in">
            <a
              href={`${chain?.explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-400 hover:underline"
            >
              ✓ View transaction on {chain?.shortName} Explorer →
            </a>
          </div>
        )}

        {/* ── Error ── */}
        {error && !isQuoting && (
          <div className="mt-3 text-center text-xs text-red-400/80 animate-fade-in">
            {error}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center mt-4 space-y-1">
        <p className="text-[11px] text-white/20">
          Best price aggregated from PancakeSwap, Uniswap, SushiSwap, Curve, and 100+ DEXes
        </p>
        <p className="text-[10px] text-white/15">
          Powered by Kairos 777 • In God We Trust
        </p>
      </div>
    </div>
  );
}
