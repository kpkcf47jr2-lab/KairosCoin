import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { CHAINS } from '../config/chains';
import { KAIROS_ADDRESS, NATIVE_ADDRESS, TOKENS } from '../config/tokens';
import {
  getDexName, getPairInfo, getUserPositions,
  approveForRouter, addLiquidity, removeLiquidity,
  calculatePairedAmount, getPoolPrice, KAIROS_SWAP_INFO,
} from '../services/liquidity';
import ChainSelector from '../components/ChainSelector';

const fmt = (n) => {
  if (!n) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

// ── Pair tokens user can pair with KAIROS ──
function getPairableTokens(chainId) {
  const tokens = TOKENS[chainId] || [];
  return tokens.filter(t => !t.isKairos && t.symbol !== 'KAIROS');
}

export default function PoolsPage() {
  const { t } = useTranslation();
  const { chainId, account, provider, setShowWalletModal } = useStore();
  const [tab, setTab] = useState('add'); // 'add' | 'positions' | 'overview'
  const kairosAddr = KAIROS_ADDRESS[chainId];

  const TABS = [
    { id: 'add', label: t('add_liq_tab') },
    { id: 'positions', label: t('my_positions_tab') },
    { id: 'overview', label: t('pool_overview') },
  ];

  if (!kairosAddr) {
    return (
      <div className="max-w-3xl mx-auto px-4 mt-6 animate-fade-in">
        <h2 className="text-xl font-bold text-white mb-5">💧 {t('liquidity_pools')}</h2>
        <div className="mb-5"><ChainSelector /></div>
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-white/40">{t('no_kairos_on_chain')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 mt-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">💧 {t('liquidity_pools')}</h2>
      </div>

      <div className="mb-5"><ChainSelector /></div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t_ => (
          <button key={t_.id} onClick={() => setTab(t_.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t_.id
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
            }`}>
            {t_.label}
          </button>
        ))}
      </div>

      {tab === 'add' && <AddLiquidityTab chainId={chainId} account={account} provider={provider} kairosAddr={kairosAddr} t={t} setShowWalletModal={setShowWalletModal} />}
      {tab === 'positions' && <PositionsTab chainId={chainId} account={account} provider={provider} kairosAddr={kairosAddr} t={t} setShowWalletModal={setShowWalletModal} />}
      {tab === 'overview' && <OverviewTab chainId={chainId} provider={provider} kairosAddr={kairosAddr} t={t} />}
    </div>
  );
}

// ═══════════════════════ ADD LIQUIDITY TAB ═══════════════════════
function AddLiquidityTab({ chainId, account, provider, kairosAddr, t, setShowWalletModal }) {
  const pairableTokens = getPairableTokens(chainId);
  const [selectedToken, setSelectedToken] = useState(pairableTokens[0] || null);
  const [amountKairos, setAmountKairos] = useState('');
  const [amountOther, setAmountOther] = useState('');
  const [pairInfo, setPairInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(''); // '' | 'approving-a' | 'approving-b' | 'adding' | 'done' | 'error'
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [kairosBalance, setKairosBalance] = useState(null);
  const [otherBalance, setOtherBalance] = useState(null);

  // Fetch pair info + balances
  useEffect(() => {
    if (!provider || !selectedToken) return;
    setPairInfo(null);

    const tokenAddr = selectedToken.address === NATIVE_ADDRESS
      ? CHAINS[chainId].wrappedNative
      : selectedToken.address;

    getPairInfo(provider, chainId, kairosAddr, selectedToken.address, account)
      .then(setPairInfo)
      .catch(() => setPairInfo(null));

    // Fetch balances
    if (account) {
      // KAIROS balance
      const kc = new ethers.Contract(kairosAddr, ['function balanceOf(address) view returns (uint256)'], provider);
      kc.balanceOf(account).then(b => setKairosBalance(parseFloat(ethers.formatUnits(b, 18)))).catch(() => {});

      // Other token balance
      if (selectedToken.isNative) {
        provider.getBalance(account).then(b => setOtherBalance(parseFloat(ethers.formatEther(b)))).catch(() => {});
      } else {
        const oc = new ethers.Contract(selectedToken.address, ['function balanceOf(address) view returns (uint256)'], provider);
        oc.balanceOf(account).then(b => setOtherBalance(parseFloat(ethers.formatUnits(b, selectedToken.decimals || 18)))).catch(() => {});
      }
    }
  }, [provider, chainId, selectedToken?.address, account]);

  // Auto-calc paired amount when reserves exist
  const handleKairosChange = (val) => {
    setAmountKairos(val);
    if (pairInfo && pairInfo.reserveA > 0n && val && parseFloat(val) > 0) {
      const weiA = ethers.parseUnits(val, 18);
      const pairedWei = calculatePairedAmount(weiA, pairInfo.reserveA, pairInfo.reserveB);
      const dec = selectedToken.decimals || 18;
      setAmountOther(parseFloat(ethers.formatUnits(pairedWei, dec)).toFixed(6));
    }
  };

  const handleOtherChange = (val) => {
    setAmountOther(val);
    if (pairInfo && pairInfo.reserveB > 0n && val && parseFloat(val) > 0) {
      const dec = selectedToken.decimals || 18;
      const weiB = ethers.parseUnits(val, dec);
      const pairedWei = calculatePairedAmount(weiB, pairInfo.reserveB, pairInfo.reserveA);
      setAmountKairos(parseFloat(ethers.formatUnits(pairedWei, 18)).toFixed(6));
    }
  };

  const handleAddLiquidity = async () => {
    if (!provider || !account || !amountKairos || !amountOther) return;
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const amountA = ethers.parseUnits(amountKairos, 18).toString();
      const decB = selectedToken.decimals || 18;
      const amountB = ethers.parseUnits(amountOther, decB).toString();

      // Step 1: Approve KAIROS
      setStep('approving-a');
      await approveForRouter(provider, chainId, kairosAddr, amountA);

      // Step 2: Approve other token (if not native)
      if (!selectedToken.isNative) {
        setStep('approving-b');
        await approveForRouter(provider, chainId, selectedToken.address, amountB);
      }

      // Step 3: Add liquidity
      setStep('adding');
      const result = await addLiquidity({
        provider, chainId,
        tokenA: kairosAddr,
        tokenB: selectedToken.address,
        amountA, amountB,
        slippage: 1,
        account,
      });

      setTxHash(result.hash);
      setStep('done');
      setAmountKairos('');
      setAmountOther('');
    } catch (err) {
      console.error('Add liquidity error:', err);
      setStep('error');
      setError(err.reason || err.message || 'Failed to add liquidity');
    } finally {
      setLoading(false);
    }
  };

  const chain = CHAINS[chainId];
  const dex = getDexName(chainId);
  const poolPrice = pairInfo
    ? getPoolPrice(pairInfo.reserveA, pairInfo.reserveB, 18, selectedToken.decimals || 18)
    : null;

  const isKairosSwap = chainId === 56;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className={`glass-card p-4 text-center ${isKairosSwap ? 'border-brand-500/30' : ''}`}>
        <img src="/kairos-token.png" alt="KAIROS" className="w-12 h-12 rounded-full mx-auto mb-2" />
        {isKairosSwap ? (
          <>
            <h3 className="text-base font-bold text-brand-400 mb-1">KairosSwap</h3>
            <p className="text-xs text-white/50 max-w-sm mx-auto">AMM nativo de Kairos 777. 100% de comisiones se quedan en el ecosistema.</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-[9px] bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded-full">0.25% LP fees</span>
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">0.05% Treasury</span>
            </div>
            <a href={`https://bscscan.com/address/${KAIROS_SWAP_INFO.router}`} target="_blank" rel="noopener noreferrer"
              className="text-[9px] text-white/20 hover:text-white/40 mt-1 inline-block">Verified on BscScan</a>
          </>
        ) : (
          <>
            <h3 className="text-base font-bold text-white mb-1">{t('add_liq_tab')}</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">{t('earn_fees_desc')}</p>
            <p className="text-[10px] text-white/25 mt-1">{t('via_dex', { dex })}</p>
          </>
        )}
      </div>

      <div className="glass-card p-5">
        {/* Select pair token */}
        <div className="mb-4">
          <label className="text-xs text-white/40 mb-2 block">{t('select_pair')}: KAIROS / ?</label>
          <div className="flex flex-wrap gap-2">
            {pairableTokens.slice(0, 8).map(token => (
              <button key={token.address} onClick={() => { setSelectedToken(token); setAmountKairos(''); setAmountOther(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  selectedToken?.address === token.address
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                }`}>
                {token.logoURI && <img src={token.logoURI} alt="" className="w-4 h-4 rounded-full" onError={e => e.target.style.display='none'} />}
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* KAIROS amount */}
        <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <img src="/kairos-token.png" alt="K" className="w-5 h-5 rounded-full" />
              <span className="text-xs font-semibold text-white">KAIROS</span>
            </div>
            {kairosBalance !== null && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/30">{t('balance')}: {kairosBalance.toFixed(4)}</span>
                <button onClick={() => handleKairosChange(kairosBalance.toFixed(6))} className="text-[9px] text-brand-400 px-1 rounded bg-brand-500/10">MAX</button>
              </div>
            )}
          </div>
          <input type="text" inputMode="decimal" placeholder="0.0" value={amountKairos}
            onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v.split('.').length <= 2) handleKairosChange(v); }}
            className="input-token text-xl" />
        </div>

        <div className="flex justify-center -my-1 relative z-10 text-white/20 text-lg">+</div>

        {/* Other token amount */}
        <div className="rounded-xl bg-dark-300/60 border border-white/5 p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {selectedToken?.logoURI && <img src={selectedToken.logoURI} alt="" className="w-5 h-5 rounded-full" onError={e => e.target.style.display='none'} />}
              <span className="text-xs font-semibold text-white">{selectedToken?.symbol || '?'}</span>
            </div>
            {otherBalance !== null && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/30">{t('balance')}: {otherBalance.toFixed(4)}</span>
                <button onClick={() => handleOtherChange(selectedToken.isNative ? Math.max(0, otherBalance - 0.01).toFixed(6) : otherBalance.toFixed(6))} className="text-[9px] text-brand-400 px-1 rounded bg-brand-500/10">MAX</button>
              </div>
            )}
          </div>
          <input type="text" inputMode="decimal" placeholder="0.0" value={amountOther}
            onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if (v.split('.').length <= 2) handleOtherChange(v); }}
            className="input-token text-xl" />
        </div>

        {/* Pool info */}
        {pairInfo ? (
          <div className="rounded-xl bg-dark-300/40 border border-white/5 p-3 mb-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-white/40">
              <span>{t('pool_price')}</span>
              <span className="text-white font-mono">1 KAIROS = {poolPrice ? poolPrice.toFixed(6) : '?'} {selectedToken?.symbol}</span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>{t('pool_reserves')}</span>
              <span className="text-white/60 font-mono">
                {parseFloat(ethers.formatUnits(pairInfo.reserveA, 18)).toFixed(2)} KAIROS / {parseFloat(ethers.formatUnits(pairInfo.reserveB, selectedToken.decimals || 18)).toFixed(2)} {selectedToken?.symbol}
              </span>
            </div>
            {pairInfo.userSharePercent > 0 && (
              <div className="flex justify-between text-white/40">
                <span>{t('pool_share')}</span>
                <span className="text-brand-400 font-mono">{pairInfo.userSharePercent.toFixed(2)}%</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 mb-4 text-center">
            <span className="text-[11px] text-emerald-400/80">✨ {t('no_pool_exists')}</span>
          </div>
        )}

        {/* Action button */}
        {!account ? (
          <button onClick={() => setShowWalletModal(true)} className="btn-primary w-full py-4 text-base">{t('connect_wallet')}</button>
        ) : loading ? (
          <button disabled className="btn-primary w-full py-4 text-base opacity-60">
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {step === 'approving-a' ? t('approving_token', { token: 'KAIROS' }) :
               step === 'approving-b' ? t('approving_token', { token: selectedToken?.symbol }) :
               step === 'adding' ? t('adding_liquidity') : '...'}
            </span>
          </button>
        ) : step === 'done' ? (
          <div className="text-center space-y-2">
            <div className="text-sm text-emerald-400">✓ {t('liq_added_success')}</div>
            {txHash && (
              <a href={`${chain?.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-brand-400 hover:underline">{t('view_tx')} {chain?.shortName} →</a>
            )}
            <button onClick={() => { setStep(''); setTxHash(null); }} className="btn-secondary px-4 py-2 text-xs mt-2">OK</button>
          </div>
        ) : (
          <button onClick={handleAddLiquidity}
            disabled={!amountKairos || !amountOther || parseFloat(amountKairos) <= 0}
            className="btn-primary w-full py-4 text-base">
            {t('supply')} KAIROS + {selectedToken?.symbol}
          </button>
        )}

        {error && (
          <div className="mt-3 text-center text-xs text-red-400/80">{error}</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════ POSITIONS TAB ═══════════════════════
function PositionsTab({ chainId, account, provider, kairosAddr, t, setShowWalletModal }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null); // pairAddress being removed
  const [withdrawPct, setWithdrawPct] = useState(100);
  const [removeTx, setRemoveTx] = useState(null);
  const [removeError, setRemoveError] = useState(null);

  const chain = CHAINS[chainId];

  useEffect(() => {
    if (!account || !provider) { setLoading(false); return; }
    setLoading(true);
    getUserPositions(provider, chainId, account)
      .then(setPositions)
      .catch(() => setPositions([]))
      .finally(() => setLoading(false));
  }, [provider, chainId, account]);

  const handleRemove = async (pos) => {
    if (!provider || !account) return;
    setRemoving(pos.pairAddress);
    setRemoveError(null);
    setRemoveTx(null);

    try {
      const lpAmount = (pos.userLPBalance * BigInt(withdrawPct)) / 100n;
      const result = await removeLiquidity({
        provider, chainId,
        tokenA: kairosAddr,
        tokenB: pos.tokenAddress,
        lpAmount: lpAmount.toString(),
        slippage: 1,
        account,
        pairAddress: pos.pairAddress,
      });
      setRemoveTx(result.hash);
      // Refresh positions
      const updated = await getUserPositions(provider, chainId, account);
      setPositions(updated);
    } catch (err) {
      setRemoveError(err.reason || err.message || 'Failed');
    } finally {
      setRemoving(null);
    }
  };

  if (!account) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3">🔗</div>
        <p className="text-sm text-white/40 mb-4">{t('connect_to_view')}</p>
        <button onClick={() => setShowWalletModal(true)} className="btn-primary px-6 py-3 text-sm">{t('connect_wallet')}</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <svg className="animate-spin h-6 w-6 text-brand-400 mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>
    );
  }

  const myPositions = positions.filter(p => p.hasPosition);

  return (
    <div className="space-y-3">
      {myPositions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3">💧</div>
          <p className="text-sm text-white/40">{t('no_positions')}</p>
          <p className="text-[10px] text-white/25 mt-1">{t('earn_fees_desc')}</p>
        </div>
      ) : (
        myPositions.map(pos => (
          <div key={pos.pairAddress} className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/kairos-token.png" alt="K" className="w-6 h-6 rounded-full" />
                <span className="text-sm font-bold text-white">{pos.pair}</span>
                <span className="text-[10px] text-white/25 bg-white/5 px-2 py-0.5 rounded">{pos.dex}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] text-white/30">{t('lp_balance')}</div>
                <div className="text-xs font-mono text-white">{parseFloat(ethers.formatUnits(pos.userLPBalance, 18)).toFixed(6)}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/30">{t('share_of_pool')}</div>
                <div className="text-xs font-mono text-brand-400">{pos.userSharePercent.toFixed(4)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-white/30">{t('pool_reserves')}</div>
                <div className="text-[10px] font-mono text-white/60">
                  {parseFloat(ethers.formatUnits(pos.reserveKairos, 18)).toFixed(2)} K / {parseFloat(ethers.formatUnits(pos.reserveOther, pos.tokenDecimals)).toFixed(2)} {pos.tokenSymbol}
                </div>
              </div>
            </div>

            {/* Withdraw slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30">{t('withdraw_percent')}</span>
                <div className="flex gap-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button key={pct} onClick={() => setWithdrawPct(pct)}
                      className={`text-[9px] px-2 py-0.5 rounded ${withdrawPct === pct ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-white/30'}`}>
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {removing === pos.pairAddress ? (
                <button disabled className="btn-secondary w-full py-2.5 text-xs opacity-60">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {t('removing_liquidity')}
                  </span>
                </button>
              ) : (
                <button onClick={() => handleRemove(pos)}
                  className="btn-secondary w-full py-2.5 text-xs text-red-400 hover:bg-red-500/10 border-red-500/20">
                  {t('withdraw')} {withdrawPct}% LP
                </button>
              )}
            </div>

            {removeTx && (
              <a href={`${chain?.explorerUrl}/tx/${removeTx}`} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-brand-400 hover:underline block text-center">✓ {t('view_tx')} →</a>
            )}
            {removeError && <p className="text-[10px] text-red-400/70 text-center">{removeError}</p>}
          </div>
        ))
      )}

      {/* All pools (even without position) */}
      {positions.filter(p => !p.hasPosition && p.totalSupply > 0n).length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs text-white/30 mb-2">{t('pool_overview')}</h4>
          {positions.filter(p => !p.hasPosition && p.totalSupply > 0n).map(pos => (
            <div key={pos.pairAddress} className="glass-card p-3 flex items-center gap-3 mb-2 opacity-60">
              <img src="/kairos-token.png" alt="K" className="w-5 h-5 rounded-full" />
              <div className="flex-1">
                <span className="text-xs font-semibold text-white">{pos.pair}</span>
                <span className="text-[10px] text-white/20 ml-2">{pos.dex}</span>
              </div>
              <div className="text-[10px] font-mono text-white/40">
                {parseFloat(ethers.formatUnits(pos.reserveKairos, 18)).toFixed(0)} K / {parseFloat(ethers.formatUnits(pos.reserveOther, pos.tokenDecimals)).toFixed(2)} {pos.tokenSymbol}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════ OVERVIEW TAB ═══════════════════════
function OverviewTab({ chainId, provider, kairosAddr, t }) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);

  const CHAIN_SEARCH = {
    56: 'bsc', 1: 'ethereum', 8453: 'base', 42161: 'arbitrum', 137: 'polygon',
  };

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
          }));
        setPools(pairs);
      })
      .catch(() => setPools([]))
      .finally(() => setLoading(false));
  }, [chainId]);

  return (
    <div>
      {/* KairosSwap highlight for BSC */}
      {chainId === 56 && (
        <div className="glass-card p-5 mb-4 border-brand-500/20">
          <div className="flex items-center gap-3 mb-3">
            <img src="/kairos-token.png" alt="KairosSwap" className="w-10 h-10 rounded-full" />
            <div>
              <h3 className="text-sm font-bold text-brand-400">KairosSwap - AMM Nativo</h3>
              <p className="text-[10px] text-white/30">DEX propio de Kairos 777 en BNB Chain</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-dark-300/60 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-white/30">Factory</div>
              <a href={`https://bscscan.com/address/${KAIROS_SWAP_INFO.factory}`} target="_blank" rel="noopener noreferrer"
                className="text-[9px] font-mono text-brand-400 hover:underline">{KAIROS_SWAP_INFO.factory.slice(0, 10)}...{KAIROS_SWAP_INFO.factory.slice(-6)}</a>
            </div>
            <div className="bg-dark-300/60 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-white/30">Router</div>
              <a href={`https://bscscan.com/address/${KAIROS_SWAP_INFO.router}`} target="_blank" rel="noopener noreferrer"
                className="text-[9px] font-mono text-brand-400 hover:underline">{KAIROS_SWAP_INFO.router.slice(0, 10)}...{KAIROS_SWAP_INFO.router.slice(-6)}</a>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 text-[10px]">
            <span className="bg-brand-500/10 text-brand-400 px-2 py-1 rounded">0.30% swap fee</span>
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">0.05% → Kairos Treasury</span>
            <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded">Verified on BscScan</span>
          </div>
        </div>
      )}

      <div className="glass-card p-4 mb-4 text-center">
        <img src="/kairos-token.png" alt="KAIROS" className="w-10 h-10 rounded-full mx-auto mb-2" />
        <h3 className="text-sm font-bold text-white mb-1">KAIROS {t('liquidity_pools')}</h3>
        <p className="text-[10px] text-white/30">{t('pools_desc')}</p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <svg className="animate-spin h-6 w-6 text-brand-400 mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-8 text-sm text-white/30">{t('no_positions')}</div>
      ) : (
        <div className="space-y-2">
          {pools.map((pool, i) => (
            <a key={i} href={pool.url} target="_blank" rel="noopener noreferrer"
              className="glass-card p-4 flex items-center gap-4 hover:border-white/10 transition-all block">
              <img src="/kairos-token.png" alt="K" className="w-8 h-8 rounded-full" />
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
