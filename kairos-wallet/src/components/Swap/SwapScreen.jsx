// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Swap Screen
//  Real DEX swaps: PancakeSwap, Uniswap, QuickSwap, etc.
//  Professional UI with live quotes, slippage, price impact
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowDown, Settings2, ChevronDown, Loader2,
  AlertTriangle, CheckCircle, X, RefreshCw, Info, Zap,
  Search, Star, Clock, Plus, ExternalLink, ArrowUpDown,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS, KAIROS_TOKEN } from '../../constants/chains';
import { unlockVault } from '../../services/wallet';
import { getAllBalances } from '../../services/blockchain';
import { getSwapQuote, executeSwap, getSwapTokens, DEX_NAMES, SLIPPAGE_PRESETS, lookupToken, getSwapHistory, addSwapToHistory, getSwapFavorites, toggleSwapFavorite } from '../../services/swap';
import { getAggregatedQuotes } from '../../services/aggregator';
import { formatBalance, formatUSD, getNativePrice } from '../../services/prices';
import TokenIcon from '../Common/TokenIcon';

export default function SwapScreen() {
  const {
    activeAddress, activeChainId, balances, navigate, goBack,
    showToast, setBalances,
  } = useStore();

  const chain = CHAINS[activeChainId];
  const dexName = DEX_NAMES[activeChainId] || 'DEX';

  // Token selection
  const [tokenFrom, setTokenFrom] = useState(null);
  const [tokenTo, setTokenTo] = useState(null);
  const [amountIn, setAmountIn] = useState('');
  
  // Quote
  const [quote, setQuote] = useState(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const quoteTimerRef = useRef(null);
  
  // Slippage
  const [slippage, setSlippage] = useState(0.5);
  const [showSlippage, setShowSlippage] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('');
  
  // Token picker
  const [showPicker, setShowPicker] = useState(null); // 'from' | 'to' | null
  
  // Swap execution
  const [swapStep, setSwapStep] = useState('idle'); // idle | password | approving | swapping | success | error
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [swapError, setSwapError] = useState('');
  const [allQuotes, setAllQuotes] = useState([]); // Multi-DEX aggregator quotes
  
  // Quote refresh
  const [quoteAge, setQuoteAge] = useState(0); // seconds since last quote
  const quoteAgeRef = useRef(null);
  
  // Token picker search + import
  const [searchQuery, setSearchQuery] = useState('');
  const [importingToken, setImportingToken] = useState(false);
  const [customTokens, setCustomTokens] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kairos_custom_tokens') || '[]'); } catch { return []; }
  });

  // History + Favorites
  const [showHistory, setShowHistory] = useState(false);
  const [favorites, setFavorites] = useState(getSwapFavorites());

  // USD prices
  const [nativeUsdPrice, setNativeUsdPrice] = useState(0);

  // Available tokens
  const availableTokens = getSwapTokens(activeChainId, balances);

  // Fetch native USD price on mount/chain change
  useEffect(() => {
    getNativePrice(activeChainId).then(p => setNativeUsdPrice(p || 0)).catch(() => {});
  }, [activeChainId]);

  // Initialize default tokens
  useEffect(() => {
    if (availableTokens.length > 0 && !tokenFrom) {
      setTokenFrom(availableTokens[0]); // Native
      if (availableTokens.length > 1) {
        setTokenTo(availableTokens[1]);
      }
    }
  }, [availableTokens.length]);

  // ── Fetch quote with debounce ──
  const fetchQuote = useCallback(async () => {
    if (!tokenFrom || !tokenTo || !amountIn || parseFloat(amountIn) <= 0) {
      setQuote(null);
      setQuoteError('');
      return;
    }

    const fromBalance = parseFloat(tokenFrom.balance || '0');
    if (parseFloat(amountIn) > fromBalance) {
      setQuoteError('Saldo insuficiente');
      setQuote(null);
      return;
    }

    setIsQuoting(true);
    setQuoteError('');

    try {
      const fromAddr = tokenFrom.isNative ? 'native' : tokenFrom.address;
      const toAddr = tokenTo.isNative ? 'native' : tokenTo.address;
      
      const result = await getSwapQuote(
        activeChainId,
        fromAddr,
        toAddr,
        amountIn,
        tokenFrom.decimals || 18,
        tokenTo.decimals || 18,
      );
      setQuote(result);
      setQuoteError('');
      setQuoteAge(0);
      // Start quote age timer
      clearInterval(quoteAgeRef.current);
      quoteAgeRef.current = setInterval(() => {
        setQuoteAge(prev => prev + 1);
      }, 1000);
      // Fetch multi-DEX quotes in background
      try {
        const fromAddr = tokenFrom.isNative ? 'native' : tokenFrom.address;
        const toAddr = tokenTo.isNative ? 'native' : tokenTo.address;
        const multiQuotes = await getAggregatedQuotes(
          activeChainId, fromAddr, toAddr, amountIn,
          tokenFrom.decimals || 18, tokenTo.decimals || 18
        );
        setAllQuotes(multiQuotes);
      } catch { setAllQuotes([]); }
    } catch (err) {
      setQuote(null);
      setQuoteError(err.message || 'Error obteniendo cotización');
    } finally {
      setIsQuoting(false);
    }
  }, [tokenFrom, tokenTo, amountIn, activeChainId]);

  useEffect(() => {
    clearTimeout(quoteTimerRef.current);
    if (amountIn && parseFloat(amountIn) > 0 && tokenFrom && tokenTo) {
      quoteTimerRef.current = setTimeout(fetchQuote, 600);
    } else {
      setQuote(null);
      setQuoteError('');
    }
    return () => clearTimeout(quoteTimerRef.current);
  }, [amountIn, tokenFrom?.id, tokenTo?.id, fetchQuote]);

  // ── Flip tokens ──
  const flipTokens = () => {
    const temp = tokenFrom;
    setTokenFrom(tokenTo);
    setTokenTo(temp);
    setAmountIn('');
    setQuote(null);
  };

  // ── Set max amount ──
  const setMaxAmount = () => {
    if (!tokenFrom) return;
    let max = parseFloat(tokenFrom.balance || '0');
    // Leave some for gas if native
    if (tokenFrom.isNative) {
      max = Math.max(0, max - 0.005);
    }
    setAmountIn(max > 0 ? max.toString() : '');
  };

  // ── Select token from picker ──
  const selectToken = (token) => {
    if (showPicker === 'from') {
      if (tokenTo && token.id === tokenTo.id) {
        setTokenTo(tokenFrom);
      }
      setTokenFrom(token);
    } else {
      if (tokenFrom && token.id === tokenFrom.id) {
        setTokenFrom(tokenTo);
      }
      setTokenTo(token);
    }
    setShowPicker(null);
    setQuote(null);
    setAmountIn('');
  };

  // ── Start swap (request password) ──
  const startSwap = () => {
    if (!quote || quoteError) return;
    setSwapStep('password');
    setPassword('');
    setPasswordError('');
  };

  // ── Execute swap after password ──
  const confirmSwap = async () => {
    setPasswordError('');
    try {
      const vault = await unlockVault(password);
      const allAccounts = [...(vault.accounts || []), ...(vault.importedAccounts || [])];
      const account = allAccounts.find(a => a.address.toLowerCase() === activeAddress.toLowerCase());
      if (!account) throw new Error('Cuenta no encontrada');

      // Step 1: Approving (if token in)
      setSwapStep('swapping');

      const fromAddr = tokenFrom.isNative ? 'native' : tokenFrom.address;
      const toAddr = tokenTo.isNative ? 'native' : tokenTo.address;

      const result = await executeSwap({
        chainId: activeChainId,
        privateKey: account.privateKey,
        tokenIn: fromAddr,
        tokenOut: toAddr,
        amountIn,
        amountOutMin: quote.amountOut,
        decimalsIn: tokenFrom.decimals || 18,
        decimalsOut: tokenTo.decimals || 18,
        path: quote.path,
        slippage,
        useFeeOnTransfer: false,
      });

      setTxHash(result.hash);
      setSwapStep('success');
      setPassword('');

      // Save to swap history
      addSwapToHistory({
        hash: result.hash,
        fromSymbol: tokenFrom.symbol,
        toSymbol: tokenTo.symbol,
        amountIn,
        amountOut: quote?.amountOut,
        chainId: activeChainId,
        dex: quote?.dex || dexName,
      });

      // Refresh balances
      try {
        const newBalances = await getAllBalances(activeChainId, activeAddress);
        setBalances(newBalances);
      } catch {}
    } catch (err) {
      if (err.message === 'Contraseña incorrecta') {
        setPasswordError('Contraseña incorrecta');
        setSwapStep('password');
      } else {
        setSwapError(err.message || 'Error ejecutando swap');
        setSwapStep('error');
        setPassword('');
      }
    }
  };

  // ── Price impact color ──
  const priceImpactColor = (impact) => {
    const v = parseFloat(impact);
    if (v < 1) return 'text-green-400';
    if (v < 3) return 'text-yellow-400';
    if (v < 5) return 'text-orange-400';
    return 'text-red-400';
  };

  const canSwap = quote && !quoteError && !isQuoting && parseFloat(amountIn) > 0;

  return (
    <div className="screen-container">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-white">Swap</h1>
          <p className="text-[10px] text-dark-400 flex items-center gap-1 justify-center">
            <Zap size={10} className="text-kairos-400" />
            {dexName} en {chain.shortName}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-xl hover:bg-white/5"
          >
            <Clock size={18} className="text-dark-300" />
          </button>
          <button
            onClick={() => setShowSlippage(true)}
            className="p-2 -mr-2 rounded-xl hover:bg-white/5"
          >
            <Settings2 size={20} className="text-dark-300" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        {/* ── From Token ── */}
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-400">Vendes</span>
            {tokenFrom && (
              <button onClick={setMaxAmount} className="text-[10px] text-kairos-400 font-medium">
                Saldo: {formatBalance(tokenFrom.balance || '0')} — MAX
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-bold text-white placeholder-dark-600 outline-none min-w-0"
              inputMode="decimal"
            />
            <button
              onClick={() => setShowPicker('from')}
              className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl px-3 py-2 transition-colors shrink-0"
            >
              {tokenFrom ? (
                <>
                  <TokenIcon token={tokenFrom} chainId={activeChainId} size={24} />
                  <span className="font-semibold text-sm">{tokenFrom.symbol}</span>
                </>
              ) : (
                <span className="text-sm text-dark-300">Elegir</span>
              )}
              <ChevronDown size={14} className="text-dark-400" />
            </button>
          </div>
          {/* USD estimate for From */}
          {amountIn && parseFloat(amountIn) > 0 && tokenFrom?.isNative && nativeUsdPrice > 0 && (
            <p className="text-[10px] text-dark-500 mt-1 text-right">≈ {formatUSD(parseFloat(amountIn) * nativeUsdPrice)}</p>
          )}
          {amountIn && parseFloat(amountIn) > 0 && tokenFrom && !tokenFrom.isNative && tokenFrom.symbol?.includes('USD') && (
            <p className="text-[10px] text-dark-500 mt-1 text-right">≈ {formatUSD(parseFloat(amountIn))}</p>
          )}
        </div>

        {/* ── Flip Button ── */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={flipTokens}
            className="w-10 h-10 rounded-xl bg-dark-800 border border-white/10 flex items-center justify-center hover:bg-dark-700 active:scale-90 transition-all"
          >
            <ArrowDown size={16} className="text-kairos-400" />
          </button>
        </div>

        {/* ── To Token ── */}
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-400">Recibes</span>
            {tokenTo && (
              <span className="text-[10px] text-dark-500">
                Saldo: {formatBalance(tokenTo.balance || '0')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {isQuoting ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={20} className="text-kairos-400 animate-spin" />
                  <span className="text-dark-400 text-sm">Cotizando...</span>
                </div>
              ) : quote ? (
                <span className="text-2xl font-bold text-white">
                  {parseFloat(quote.amountOut).toFixed(6)}
                </span>
              ) : (
                <span className="text-2xl font-bold text-dark-600">0.0</span>
              )}
            </div>
            <button
              onClick={() => setShowPicker('to')}
              className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl px-3 py-2 transition-colors shrink-0"
            >
              {tokenTo ? (
                <>
                  <TokenIcon token={tokenTo} chainId={activeChainId} size={24} />
                  <span className="font-semibold text-sm">{tokenTo.symbol}</span>
                </>
              ) : (
                <span className="text-sm text-dark-300">Elegir</span>
              )}
              <ChevronDown size={14} className="text-dark-400" />
            </button>
          </div>
          {/* USD estimate for To */}
          {quote && tokenTo?.isNative && nativeUsdPrice > 0 && (
            <p className="text-[10px] text-dark-500 mt-1 text-right">≈ {formatUSD(parseFloat(quote.amountOut) * nativeUsdPrice)}</p>
          )}
          {quote && tokenTo && !tokenTo.isNative && tokenTo.symbol?.includes('USD') && (
            <p className="text-[10px] text-dark-500 mt-1 text-right">≈ {formatUSD(parseFloat(quote.amountOut))}</p>
          )}
        </div>

        {/* ── Quote Details ── */}
        <AnimatePresence>
          {quote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 bg-white/[0.02] rounded-xl p-3 space-y-2 border border-white/5">
                {/* Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">Tasa</span>
                  <span className="text-xs text-dark-200">
                    1 {tokenFrom?.symbol} ≈ {quote.effectivePrice.toFixed(6)} {tokenTo?.symbol}
                  </span>
                </div>

                {/* Price impact */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400 flex items-center gap-1">
                    Impacto
                    {parseFloat(quote.priceImpact) > 3 && (
                      <AlertTriangle size={10} className="text-orange-400" />
                    )}
                  </span>
                  <span className={`text-xs font-medium ${priceImpactColor(quote.priceImpact)}`}>
                    {quote.priceImpact}%
                  </span>
                </div>

                {/* Min received */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">Mínimo recibido</span>
                  <span className="text-xs text-dark-200">
                    {(parseFloat(quote.amountOut) * (1 - slippage / 100)).toFixed(6)} {tokenTo?.symbol}
                  </span>
                </div>

                {/* Slippage */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">Slippage</span>
                  <button
                    onClick={() => setShowSlippage(true)}
                    className="text-xs text-kairos-400"
                  >
                    {slippage}%
                  </button>
                </div>

                {/* Route */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">Ruta</span>
                  <span className="text-xs text-dark-300">
                    {quote.route.map((r, i) => (
                      <span key={i}>
                        {r.length > 10 ? r.slice(0, 6) + '...' : r}
                        {i < quote.route.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                  </span>
                </div>

                {/* DEX */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-400">DEX</span>
                  <span className="text-xs text-dark-200 flex items-center gap-1">
                    <Zap size={10} className="text-kairos-400" />
                    {quote.dex}
                  </span>
                </div>
              </div>

              {/* ── Multi-DEX Comparison (Aggregator) ── */}
              {allQuotes.length > 1 && (
                <div className="mt-3 bg-white/[0.02] rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-1 mb-2">
                    <Zap size={10} className="text-kairos-400" />
                    <span className="text-[10px] text-kairos-400 font-bold">COMPARACIÓN MULTI-DEX</span>
                    {allQuotes[0]?.savingsPercent && parseFloat(allQuotes[0].savingsPercent) > 0 && (
                      <span className="ml-auto text-[10px] text-green-400 font-bold">Ahorro: +{allQuotes[0].savingsPercent}%</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {allQuotes.slice(0, 4).map((q, i) => (
                      <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${
                        q.isBest ? 'bg-green-500/10 border border-green-500/20' : 'bg-dark-800/30'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: q.dexColor || '#666' }}></span>
                          <span className={q.isBest ? 'text-green-400 font-semibold' : 'text-dark-300'}>{q.dex}</span>
                          {q.isBest && <span className="text-[9px] bg-green-500/20 text-green-400 px-1 rounded">MEJOR</span>}
                        </div>
                        <span className={q.isBest ? 'text-green-400 font-bold' : 'text-dark-400'}>
                          {parseFloat(q.amountOut).toFixed(6)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ── */}
        {quoteError && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={14} className="text-red-400 shrink-0" />
            <span className="text-xs text-red-300">{quoteError}</span>
          </div>
        )}

        {/* ── Quote Freshness ── */}
        {quote && quoteAge > 0 && (
          <div className="mt-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${quoteAge < 10 ? 'bg-green-400' : quoteAge < 20 ? 'bg-yellow-400' : 'bg-red-400'}`} />
              <span className="text-[10px] text-dark-500">
                Cotización: {quoteAge}s
              </span>
            </div>
            <button
              onClick={fetchQuote}
              className="flex items-center gap-1 text-[10px] text-kairos-400 hover:text-kairos-300"
            >
              <RefreshCw size={10} /> Actualizar
            </button>
          </div>
        )}

        {/* ── High Impact Warning ── */}
        {quote && parseFloat(quote.priceImpact) > 5 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <AlertTriangle size={14} className="text-orange-400 shrink-0" />
            <span className="text-xs text-orange-300">
              Alto impacto de precio ({quote.priceImpact}%). Podrías perder valor significativo.
            </span>
          </div>
        )}
      </div>

      {/* ── Action Button ── */}
      <div className="px-5 pb-6 pt-3">
        <button
          onClick={startSwap}
          disabled={!canSwap}
          className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            canSwap
              ? 'bg-gradient-to-r from-kairos-500 to-kairos-400 text-dark-950 shadow-lg shadow-kairos-500/20'
              : 'bg-white/[0.06] text-dark-500 cursor-not-allowed'
          }`}
        >
          {isQuoting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Cotizando...
            </>
          ) : !tokenFrom || !tokenTo ? (
            'Selecciona los tokens'
          ) : !amountIn || parseFloat(amountIn) <= 0 ? (
            'Ingresa un monto'
          ) : quoteError ? (
            quoteError
          ) : canSwap ? (
            <>
              <ArrowDown size={16} />
              Swap {tokenFrom.symbol} → {tokenTo.symbol}
            </>
          ) : (
            'Swap'
          )}
        </button>
      </div>

      {/* ══════════ MODALS ══════════ */}
      
      {/* ── Token Picker Modal ── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/95 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-bold text-white">
                {showPicker === 'from' ? 'Token a vender' : 'Token a recibir'}
              </h2>
              <button onClick={() => { setShowPicker(null); setSearchQuery(''); }} className="p-2 rounded-xl hover:bg-white/5">
                <X size={20} className="text-dark-300" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 mb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, símbolo o dirección"
                  className="w-full bg-white/[0.04] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50"
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                  autoFocus
                />
              </div>
            </div>

            <div className="px-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              {/* Quick select popular tokens */}
              {!searchQuery && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {availableTokens.filter(t => t.isNative || t.hasBalance).slice(0, 6).map(token => (
                    <button
                      key={token.id}
                      onClick={() => { selectToken(token); setSearchQuery(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] transition-all"
                    >
                      <TokenIcon token={token} chainId={activeChainId} size={18} />
                      <span className="text-xs font-medium text-white">{token.symbol}</span>
                    </button>
                  ))}
                </div>
              )}

              {(() => {
                const q = searchQuery.toLowerCase().trim();
                const filtered = q
                  ? availableTokens.filter(t =>
                      t.symbol?.toLowerCase().includes(q) ||
                      t.name?.toLowerCase().includes(q) ||
                      t.address?.toLowerCase().includes(q)
                    )
                  : availableTokens;
                
                const isAddress = q.startsWith('0x') && q.length === 42;
                const hasResult = filtered.length > 0;

                return (
                  <>
                    {/* Token list */}
                    <div className="space-y-0.5">
                      {/* Tokens with balance first */}
                      {filtered.filter(t => t.isNative || parseFloat(t.balance || 0) > 0).length > 0 && (
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider px-1 py-1 mt-1">Con saldo</p>
                      )}
                      {filtered.filter(t => t.isNative || parseFloat(t.balance || 0) > 0).map((token) => {
                        const isSelected = 
                          (showPicker === 'from' && tokenFrom?.id === token.id) ||
                          (showPicker === 'to' && tokenTo?.id === token.id);
                        return (
                          <button
                            key={token.id}
                            onClick={() => { selectToken(token); setSearchQuery(''); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                              isSelected
                                ? 'bg-kairos-500/10 border border-kairos-500/30'
                                : 'hover:bg-white/[0.04] border border-transparent'
                            }`}
                          >
                            <TokenIcon token={token} chainId={activeChainId} size={36} />
                            <div className="flex-1 text-left">
                              <div className="font-semibold text-sm text-white">{token.symbol}</div>
                              <div className="text-xs text-dark-400">{token.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-dark-200">
                                {formatBalance(token.balance || '0')}
                              </div>
                            </div>
                            {isSelected && <CheckCircle size={16} className="text-kairos-400 shrink-0" />}
                          </button>
                        );
                      })}

                      {/* Popular tokens without balance */}
                      {filtered.filter(t => !t.isNative && parseFloat(t.balance || 0) <= 0).length > 0 && (
                        <p className="text-[10px] text-dark-500 uppercase tracking-wider px-1 py-1 mt-3">Populares</p>
                      )}
                      {filtered.filter(t => !t.isNative && parseFloat(t.balance || 0) <= 0).map((token) => (
                        <button
                          key={token.id}
                          onClick={() => { selectToken(token); setSearchQuery(''); }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] border border-transparent transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-lg">
                            {token.icon || '🪙'}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-sm text-dark-300">{token.symbol}</div>
                            <div className="text-xs text-dark-500">{token.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Import custom token by address */}
                    {isAddress && !hasResult && (
                      <button
                        onClick={async () => {
                          setImportingToken(true);
                          try {
                            const tokenInfo = await lookupToken(activeChainId, q);
                            const updated = [...customTokens, tokenInfo];
                            setCustomTokens(updated);
                            localStorage.setItem('kairos_custom_tokens', JSON.stringify(updated));
                            selectToken(tokenInfo);
                            setSearchQuery('');
                            showToast(`${tokenInfo.symbol} importado`, 'success');
                          } catch (err) {
                            showToast('Token no encontrado: ' + err.message, 'error');
                          }
                          setImportingToken(false);
                        }}
                        disabled={importingToken}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-kairos-500/10 border border-kairos-500/30 mt-3"
                      >
                        {importingToken ? (
                          <Loader2 size={20} className="text-kairos-400 animate-spin" />
                        ) : (
                          <Plus size={20} className="text-kairos-400" />
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-kairos-400">
                            {importingToken ? 'Importando...' : 'Importar Token'}
                          </p>
                          <p className="text-[10px] text-dark-400 truncate">{q}</p>
                        </div>
                      </button>
                    )}

                    {!isAddress && !hasResult && q && (
                      <div className="text-center py-8 text-dark-500 text-sm">
                        No se encontraron tokens para "{q}"
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Slippage Settings Modal ── */}
      <AnimatePresence>
        {showSlippage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/95 backdrop-blur-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-bold text-white">Configuración de Slippage</h2>
              <button onClick={() => setShowSlippage(false)} className="p-2 rounded-xl hover:bg-white/5">
                <X size={20} className="text-dark-300" />
              </button>
            </div>

            <div className="px-5">
              <p className="text-xs text-dark-400 mb-4">
                El slippage es la diferencia máxima aceptable entre el precio esperado y el precio real de ejecución.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[0.1, 0.5, 1.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => { setSlippage(val); setCustomSlippage(''); }}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      slippage === val && !customSlippage
                        ? 'bg-kairos-500/20 text-kairos-400 border border-kairos-500/30'
                        : 'bg-white/[0.04] text-dark-300 border border-transparent hover:bg-white/[0.08]'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => {
                    setCustomSlippage(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (val > 0 && val <= 50) setSlippage(val);
                  }}
                  placeholder="Personalizado"
                  className="w-full bg-white/[0.04] rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50"
                  inputMode="decimal"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 text-sm">%</span>
              </div>

              {slippage > 5 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <AlertTriangle size={14} className="text-orange-400 shrink-0" />
                  <span className="text-xs text-orange-300">
                    Slippage alto. Tu transacción podría ser frontrunned.
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowSlippage(false)}
                className="w-full mt-6 py-3 rounded-xl bg-kairos-500 text-dark-950 font-bold text-sm"
              >
                Guardar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Password / Swap Execution Modal ── */}
      <AnimatePresence>
        {swapStep !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/95 backdrop-blur-xl flex items-center justify-center px-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-dark-800 rounded-2xl p-6 border border-white/10"
            >
              {/* Close button (only for password/error/success) */}
              {['password', 'error', 'success'].includes(swapStep) && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => { setSwapStep('idle'); setPassword(''); setSwapError(''); }}
                    className="p-1 rounded-lg hover:bg-white/5"
                  >
                    <X size={16} className="text-dark-400" />
                  </button>
                </div>
              )}

              {/* Password step */}
              {swapStep === 'password' && (
                <>
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-kairos-500/10 flex items-center justify-center mx-auto mb-3">
                      <ArrowDown size={24} className="text-kairos-400" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Confirmar Swap</h3>
                    <p className="text-xs text-dark-400 mt-1">
                      {parseFloat(amountIn).toFixed(6)} {tokenFrom?.symbol} → {parseFloat(quote?.amountOut || 0).toFixed(6)} {tokenTo?.symbol}
                    </p>
                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && password && confirmSwap()}
                    placeholder="Contraseña de la wallet"
                    className="w-full bg-white/[0.04] rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50 mb-2"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-400 text-xs mb-2">{passwordError}</p>
                  )}

                  <button
                    onClick={confirmSwap}
                    disabled={!password}
                    className={`w-full py-3 rounded-xl font-bold text-sm mt-2 transition-all ${
                      password
                        ? 'bg-gradient-to-r from-kairos-500 to-kairos-400 text-dark-950'
                        : 'bg-white/[0.06] text-dark-500 cursor-not-allowed'
                    }`}
                  >
                    Confirmar Swap
                  </button>
                </>
              )}

              {/* Swapping step */}
              {(swapStep === 'approving' || swapStep === 'swapping') && (
                <div className="text-center py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 rounded-full bg-kairos-500/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Loader2 size={28} className="text-kairos-400" />
                  </motion.div>
                  <h3 className="font-bold text-white text-lg">
                    {swapStep === 'approving' ? 'Aprobando token...' : 'Ejecutando swap...'}
                  </h3>
                  <p className="text-xs text-dark-400 mt-2">
                    {swapStep === 'approving'
                      ? 'Autorizando al router para usar tus tokens'
                      : `Intercambiando en ${dexName}`}
                  </p>
                  <p className="text-[10px] text-dark-500 mt-4">No cierres esta ventana</p>
                </div>
              )}

              {/* Success step */}
              {swapStep === 'success' && (
                <div className="text-center py-2">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-green-400" />
                  </div>
                  <h3 className="font-bold text-white text-lg">¡Swap exitoso!</h3>
                  <p className="text-xs text-dark-400 mt-2 mb-4">
                    {parseFloat(amountIn).toFixed(6)} {tokenFrom?.symbol} → {parseFloat(quote?.amountOut || 0).toFixed(6)} {tokenTo?.symbol}
                  </p>

                  {txHash && (
                    <a
                      href={`${chain.blockExplorerUrl}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-kairos-400 mb-4"
                    >
                      Ver en explorador ↗
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setSwapStep('idle');
                      setAmountIn('');
                      setQuote(null);
                    }}
                    className="w-full py-3 rounded-xl bg-kairos-500 text-dark-950 font-bold text-sm"
                  >
                    Listo
                  </button>
                </div>
              )}

              {/* Error step */}
              {swapStep === 'error' && (
                <div className="text-center py-2">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={28} className="text-red-400" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Error en el swap</h3>
                  <p className="text-xs text-red-300 mt-2 mb-4 break-words max-h-24 overflow-y-auto">
                    {swapError}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSwapStep('idle'); setSwapError(''); }}
                      className="flex-1 py-3 rounded-xl bg-white/[0.06] text-dark-300 font-medium text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => { setSwapStep('password'); setSwapError(''); setPassword(''); }}
                      className="flex-1 py-3 rounded-xl bg-kairos-500 text-dark-950 font-bold text-sm"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Swap History Modal ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/95 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-bold text-white">Historial de Swaps</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 rounded-xl hover:bg-white/5">
                <X size={20} className="text-dark-300" />
              </button>
            </div>

            <div className="px-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              {(() => {
                const history = getSwapHistory();
                if (history.length === 0) {
                  return (
                    <div className="text-center py-16">
                      <Clock size={32} className="text-dark-600 mx-auto mb-3" />
                      <p className="text-dark-400 text-sm">Sin swaps recientes</p>
                      <p className="text-dark-500 text-xs mt-1">Tu historial aparecerá aquí</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {history.map((h, i) => {
                      const c = CHAINS[h.chainId];
                      return (
                        <div key={i} className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ArrowUpDown size={14} className="text-kairos-400" />
                              <span className="text-sm font-semibold text-white">
                                {h.fromSymbol} → {h.toSymbol}
                              </span>
                            </div>
                            <span className="text-[10px] text-dark-500">
                              {new Date(h.timestamp).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-dark-400">
                              {parseFloat(h.amountIn).toFixed(4)} {h.fromSymbol} → {parseFloat(h.amountOut).toFixed(4)} {h.toSymbol}
                            </span>
                            <span className="text-[10px] text-dark-500">{h.dex}</span>
                          </div>
                          {h.hash && c && (
                            <a
                              href={`${c.blockExplorerUrl}/tx/${h.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-kairos-400 mt-1.5"
                            >
                              <ExternalLink size={10} /> Ver transacción
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
