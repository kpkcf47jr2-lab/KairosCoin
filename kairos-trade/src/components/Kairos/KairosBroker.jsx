// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Kairos Broker (DEX Perpetual Trading)
//  Dual execution: DEX mode (Kairos Exchange) or Internal margin engine
//  KAIROS locked as collateral → Orders routed to Kairos Exchange → Real P&L
//  Smart contract: KairosPerps • Liquidation on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Shield, Zap, DollarSign, Loader2,
  AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Wallet, Lock, BarChart3, Target, Activity, History,
  RefreshCw, Plus, Minus, X, Eye, ChevronDown,
  ChevronUp, Settings
} from 'lucide-react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { ethers } from 'ethers';
import useStore from '../../store/useStore';
import { API_HOST } from '../../constants';

// ── Config ───────────────────────────────────────────────────────────────────
const API_MARGIN = `${API_HOST}/api/margin`;  // Internal margin engine
const API_PERPS  = `${API_HOST}/api/perps`;   // DEX route → Kairos Exchange
const PRICE_POLL_MS = 3000;
const ACCOUNT_POLL_MS = 5000;
const LEVERAGE_INTERNAL = [2, 3, 5, 10];
const LEVERAGE_DEX = [2, 3, 5, 10, 20, 50];

const PAIR_ICONS = {
  'BTC/KAIROS': '₿', 'ETH/KAIROS': 'Ξ', 'BNB/KAIROS': '◆', 'SOL/KAIROS': '◎',
  'XRP/KAIROS': '✕', 'DOGE/KAIROS': 'Ð', 'ADA/KAIROS': '₳', 'AVAX/KAIROS': 'A',
  'DOT/KAIROS': '●', 'LINK/KAIROS': '⬡', 'UNI/KAIROS': '🦄', 'LTC/KAIROS': 'Ł',
  'ATOM/KAIROS': '⚛', 'NEAR/KAIROS': 'N', 'APT/KAIROS': 'A', 'ARB/KAIROS': '◇',
  'SUI/KAIROS': '💧', 'SEI/KAIROS': 'S', 'AAVE/KAIROS': '👻', 'OP/KAIROS': '🔴',
  'FIL/KAIROS': 'F', 'ALGO/KAIROS': 'A', 'ICP/KAIROS': '∞', 'XLM/KAIROS': '✦',
  'ETC/KAIROS': 'Ξc', 'HBAR/KAIROS': 'ℏ', 'TIA/KAIROS': 'T', 'PEPE/KAIROS': '🐸',
  'SHIB/KAIROS': '🐕', 'BONK/KAIROS': '🐶', 'RENDER/KAIROS': 'R', 'ENA/KAIROS': 'E',
  'KAIROS/USDT': 'K',
};

// ── API Helper ───────────────────────────────────────────────────────────────
function createApi(base) {
  return async function api(endpoint, options = {}) {
    const url = `${base}${endpoint}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || data.details?.join(', ') || `API error ${res.status}`);
    return data;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function KairosBroker() {
  const { showToast, user, login } = useStore();

  // ── Wallet from Kairos account (auto-connected) ──
  const walletAddress = user?.walletAddress || '';
  const isConnected = !!walletAddress;

  // ── Execution mode: 'dex' = Kairos Exchange, 'internal' = Kairos margin engine ──
  const [execMode, setExecMode] = useState('dex');
  const API_BASE = execMode === 'dex' ? API_PERPS : API_MARGIN;
  const api = useMemo(() => createApi(API_BASE), [API_BASE]);
  const LEVERAGE_OPTIONS = execMode === 'dex' ? LEVERAGE_DEX : LEVERAGE_INTERNAL;

  // ── Account state (from backend) ──
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);

  // ── Market data (from backend) ──
  const [pairs, setPairs] = useState([]);
  const [prices, setPrices] = useState({});
  const [leverageTiers, setLeverageTiers] = useState({});

  // ── Trading form ──
  const [selectedPair, setSelectedPair] = useState('BTC/KAIROS');
  const [side, setSide] = useState('LONG');
  const [leverage, setLeverage] = useState(2);
  const [collateralInput, setCollateralInput] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Deposit/Withdraw ──
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState('prices'); // 'prices' | 'trade' | 'history'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [closingPositionId, setClosingPositionId] = useState(null);

  const priceIntervalRef = useRef(null);
  const accountIntervalRef = useRef(null);

  const numCollateral = parseFloat(collateralInput) || 0;
  const currentPrice = prices[selectedPair.replace('/', '')]?.price || 0;
  const positionSizeUsd = numCollateral * leverage;

  // ═════════════════════════════════════════════════════════════════════════
  //  DATA FETCHING — Real backend API calls
  // ═════════════════════════════════════════════════════════════════════════

  // Fetch prices (no auth needed)
  const fetchPrices = useCallback(async () => {
    try {
      const data = await api('/prices');
      setPrices(data.data || {});
    } catch { /* silent — prices may not be ready yet */ }
  }, []);

  // Fetch pairs + tier info
  const fetchPairs = useCallback(async () => {
    try {
      const data = await api('/pairs');
      setPairs(data.data?.pairs || []);
      if (data.data?.leverageTiers) setLeverageTiers(data.data.leverageTiers);
    } catch { /* silent */ }
  }, []);

  // Fetch account (requires wallet)
  const fetchAccount = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const data = await api(`/account?wallet=${walletAddress}`);
      setAccount(data.data);
    } catch { /* Account may not exist yet — that's OK */ }
  }, [walletAddress]);

  // Fetch open positions
  const fetchPositions = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const data = await api(`/positions?wallet=${walletAddress}`);
      setPositions(data.data || []);
    } catch { /* silent */ }
  }, [walletAddress]);

  // Fetch trade history
  const fetchHistory = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const data = await api(`/history?wallet=${walletAddress}&limit=30`);
      setTradeHistory(data.data || []);
    } catch { /* silent */ }
  }, [walletAddress]);

  // ── Polling setup ──
  useEffect(() => {
    fetchPrices();
    fetchPairs();
    priceIntervalRef.current = setInterval(fetchPrices, PRICE_POLL_MS);
    return () => clearInterval(priceIntervalRef.current);
  }, [fetchPrices, fetchPairs]);

  useEffect(() => {
    if (!walletAddress) return;
    setIsLoadingAccount(true);
    Promise.all([fetchAccount(), fetchPositions(), fetchHistory()]).finally(() => setIsLoadingAccount(false));
    accountIntervalRef.current = setInterval(() => {
      fetchAccount();
      fetchPositions();
    }, ACCOUNT_POLL_MS);
    return () => clearInterval(accountIntervalRef.current);
  }, [walletAddress, fetchAccount, fetchPositions, fetchHistory]);

  // ═════════════════════════════════════════════════════════════════════════
  //  TRADING ACTIONS — All hit real backend endpoints
  // ═════════════════════════════════════════════════════════════════════════

  const handleDeposit = useCallback(async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) { showToast('Ingresa una cantidad válida', 'error'); return; }
    setIsSubmitting(true);
    try {
      await api('/deposit', { method: 'POST', body: JSON.stringify({ wallet: walletAddress, amount }) });
      showToast(`${amount} KAIROS depositados como colateral`, 'success');
      setDepositAmount('');
      fetchAccount();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [depositAmount, walletAddress, showToast, fetchAccount]);

  const handleWithdraw = useCallback(async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) { showToast('Ingresa una cantidad válida', 'error'); return; }
    setIsSubmitting(true);
    try {
      await api('/withdraw', { method: 'POST', body: JSON.stringify({ wallet: walletAddress, amount }) });
      showToast(`${amount} KAIROS retirados del colateral`, 'success');
      setWithdrawAmount('');
      fetchAccount();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [withdrawAmount, walletAddress, showToast, fetchAccount]);

  const handleOpenPosition = useCallback(async () => {
    if (!numCollateral || numCollateral <= 0) { showToast('Ingresa colateral', 'error'); return; }
    if (!currentPrice) { showToast('Esperando precios...', 'error'); return; }

    setIsSubmitting(true);
    try {
      const body = {
        wallet: walletAddress,
        pair: selectedPair,
        side,
        leverage,
        collateral: numCollateral,
        orderType: 'MARKET',
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      };
      const res = await api('/open', { method: 'POST', body: JSON.stringify(body) });
      showToast(
        `${side} ${selectedPair} abierta — ${leverage}x — $${positionSizeUsd.toLocaleString()} posición`,
        'success'
      );
      setCollateralInput('');
      setStopLoss('');
      setTakeProfit('');
      fetchAccount();
      fetchPositions();
    } catch (err) {
      showToast('Error abriendo posición: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [walletAddress, selectedPair, side, leverage, numCollateral, currentPrice, stopLoss, takeProfit, positionSizeUsd, showToast, fetchAccount, fetchPositions]);

  const handleClosePosition = useCallback(async (positionId) => {
    setClosingPositionId(positionId);
    try {
      const res = await api('/close', { method: 'POST', body: JSON.stringify({ wallet: walletAddress, positionId }) });
      const pnl = res.data?.realizedPnl || res.data?.pnl || 0;
      showToast(
        `Posición cerrada — P&L: ${pnl >= 0 ? '+' : ''}$${parseFloat(pnl).toFixed(2)}`,
        pnl >= 0 ? 'success' : 'error'
      );
      fetchAccount();
      fetchPositions();
      fetchHistory();
    } catch (err) {
      showToast('Error cerrando posición: ' + err.message, 'error');
    } finally {
      setClosingPositionId(null);
    }
  }, [walletAddress, showToast, fetchAccount, fetchPositions, fetchHistory]);

  // ═════════════════════════════════════════════════════════════════════════
  //  COMPUTED VALUES
  // ═════════════════════════════════════════════════════════════════════════

  const totalUnrealizedPnl = useMemo(
    () => positions.reduce((sum, p) => sum + (parseFloat(p.unrealizedPnl) || 0), 0),
    [positions]
  );

  const liquidationPrice = useMemo(() => {
    if (!numCollateral || !currentPrice) return null;
    const maintenancePct = (leverageTiers[leverage]?.maintenanceMarginPct || 25) / 100;
    if (side === 'LONG') {
      return currentPrice * (1 - (1 / leverage) + maintenancePct / leverage);
    }
    return currentPrice * (1 + (1 / leverage) - maintenancePct / leverage);
  }, [numCollateral, currentPrice, leverage, side, leverageTiers]);

  // ═════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/kairos-logo.png" alt="Kairos" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Kairos Broker
                {execMode === 'dex' ? (
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" /> Kairos Exchange
                  </span>
                ) : (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">INTERNO</span>
                )}
              </h1>
              <p className="text-sm text-blue-300">
                {execMode === 'dex' ? 'Perpetuales — Precios reales Binance, P&L en KAIROS' : 'Leverage Trading con Reserva Kairos 777'}
              </p>
            </div>
          </div>

          {/* Wallet auto-connected from Kairos account */}
          {isConnected && (
            <div className="flex items-center gap-3">
              {/* Execution Mode Toggle */}
              <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setExecMode('dex')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${execMode === 'dex' ? 'bg-green-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                >
                  🌐 DEX
                </button>
                <button
                  onClick={() => setExecMode('internal')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${execMode === 'internal' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                >
                  🏛️ Interno
                </button>
              </div>

              <div className="bg-green-900/30 border border-green-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-300 font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* No wallet — auto-generate for legacy accounts */}
      {!isConnected && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Wallet Requerida</h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Necesitas tu Kairos Wallet activa para operar en el DEX con apalancamiento.
          </p>
          <button
            onClick={() => useStore.getState().setPage('wallet')}
            className="px-6 py-3 rounded-xl text-sm font-bold text-black transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8972E)' }}
          >
            <span className="flex items-center gap-2 justify-center"><Wallet size={16} /> Ir a Mi Wallet</span>
          </button>
        </div>
      )}

      {/* Connected — Main interface */}
      {isConnected && (
        <div className="flex flex-col gap-3">

          {/* DEX Mode Banner */}
          {execMode === 'dex' && (
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/20 rounded-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm">🔗</span>
                <span className="text-green-300 text-xs font-medium">Kairos Exchange — Precios reales de Binance en tiempo real</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-green-400/60">
                <span>Motor: Kairos Exchange</span>
                <span>•</span>
                <span>Colateral: KAIROS</span>
                <span>•</span>
                <span>Precios: Binance Live</span>
              </div>
            </div>
          )}

          {/* ── TOP: Chart + Order Panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* ── Chart ── */}
            <div className="lg:col-span-7">
              <BrokerChart pair={selectedPair} height={520} />
            </div>
            {/* ── Order Entry + Account ── */}
            <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '540px', scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              {/* Pair + Price header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{PAIR_ICONS[selectedPair] || '•'}</span>
                  <div>
                    <h3 className="text-white font-bold">{selectedPair}</h3>
                    <span className="text-xs text-zinc-500">Mercado</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white font-mono">
                    ${currentPrice ? currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                  </div>
                  {prices[selectedPair.replace('/', '')]?.change24h != null && (
                    <span className={`text-xs font-mono ${prices[selectedPair.replace('/', '')].change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {prices[selectedPair.replace('/', '')].change24h >= 0 ? '+' : ''}
                      {prices[selectedPair.replace('/', '')].change24h.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Side selector */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => setSide('LONG')}
                  className={`py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                    side === 'LONG'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}>
                  <ArrowUpRight className="w-4 h-4" /> LONG
                </button>
                <button onClick={() => setSide('SHORT')}
                  className={`py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                    side === 'SHORT'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}>
                  <ArrowDownRight className="w-4 h-4" /> SHORT
                </button>
              </div>

              {/* Leverage selector */}
              <div className="mb-4">
                <label className="text-xs text-zinc-500 mb-1.5 block flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Apalancamiento
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {LEVERAGE_OPTIONS.map(lev => (
                    <button key={lev} onClick={() => setLeverage(lev)}
                      className={`py-2 rounded-lg text-sm font-bold transition-all ${
                        leverage === lev
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}>
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Collateral input */}
              <div className="mb-4">
                <label className="text-xs text-zinc-500 mb-1.5 block flex items-center justify-between">
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Colateral (KAIROS)</span>
                  {account && (
                    <button onClick={() => setCollateralInput(String(Math.floor(account.freeMargin || 0)))}
                      className="text-blue-400 hover:text-blue-300 text-[10px]">
                      Max: {(account.freeMargin || 0).toFixed(0)}
                    </button>
                  )}
                </label>
                <input type="number" value={collateralInput} onChange={e => setCollateralInput(e.target.value)}
                  placeholder="Ej: 100" min="1" step="1"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />

                {/* Position info */}
                {numCollateral > 0 && currentPrice > 0 && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Tamaño posición</span>
                      <span className="text-white font-mono">${positionSizeUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Precio entrada</span>
                      <span className="text-white font-mono">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    {liquidationPrice && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Precio liquidación (est.)</span>
                        <span className="text-red-400 font-mono">${liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Advanced: SL / TP */}
              <div className="mb-4">
                <button onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Settings className="w-3 h-3" /> Avanzado
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1">Stop Loss ($)</label>
                          <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)}
                            placeholder="Precio SL"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1">Take Profit ($)</label>
                          <input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)}
                            placeholder="Precio TP"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-green-500 focus:outline-none" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit button */}
              <button
                onClick={handleOpenPosition}
                disabled={isSubmitting || !numCollateral || !currentPrice}
                className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${
                  side === 'LONG'
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'
                }`}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : side === 'LONG' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {isSubmitting ? 'Abriendo...' : `Abrir ${side} ${leverage}x`}
              </button>

              {/* Risk warning */}
              <div className="mt-3 bg-yellow-900/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-[10px] text-yellow-500/80 flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Trading apalancado = riesgo de pérdida total. Liquidación automática.</span>
              </div>
            </div>

            {/* Cuenta Margin */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" /> Cuenta Margin
                </h3>
                <button onClick={() => { fetchAccount(); fetchPositions(); }} className="text-zinc-500 hover:text-blue-400 transition-colors">
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              {isLoadingAccount && !account ? (
                <div className="flex items-center justify-center py-3 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  <AccountRow label="Colateral" value={`${(account?.totalCollateral || 0).toFixed(2)} KAIROS`} icon={<Lock className="w-3 h-3" />} />
                  <AccountRow label="Equity" value={`$${(account?.equity || 0).toFixed(2)}`} icon={<DollarSign className="w-3 h-3" />} />
                  <AccountRow label="Margen libre" value={`$${(account?.freeMargin || 0).toFixed(2)}`} icon={<Activity className="w-3 h-3" />}
                    color={(account?.freeMargin || 0) > 0 ? 'text-green-400' : 'text-zinc-400'} />
                  <AccountRow label="P&L no realizado"
                    value={`${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(2)}`}
                    icon={totalUnrealizedPnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    color={totalUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'} />
                </div>
              )}
            </div>

            {/* Depositar / Retirar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <button onClick={() => setShowDeposit(!showDeposit)}
                className="w-full flex items-center justify-between text-xs font-medium text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-blue-400" /> Depositar / Retirar
                </span>
                {showDeposit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <AnimatePresence>
                {showDeposit && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-2 space-y-2">
                      <div className="flex gap-2">
                        <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                          placeholder="Depositar KAIROS" min="1" step="1"
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
                        <button onClick={handleDeposit} disabled={isSubmitting || !depositAmount}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Dep
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                          placeholder="Retirar KAIROS" min="1" step="1"
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
                        <button onClick={handleWithdraw} disabled={isSubmitting || !withdrawAmount}
                          className="bg-red-600/80 hover:bg-red-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minus className="w-3 h-3" />} Ret
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            </div>{/* close col-span-5 */}
          </div>{/* close grid-cols-12 */}

          {/* ── BOTTOM: Prices / Positions / History ── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-zinc-800">
              {[
                { id: 'prices', label: 'Precios en Vivo', icon: Activity },
                { id: 'trade', label: 'Posiciones', icon: TrendingUp, count: positions.length },
                { id: 'history', label: 'Historial', icon: History },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto p-3" style={{ maxHeight: '280px', scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
              {/* Prices tab */}
              {activeTab === 'prices' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {Object.entries(prices).map(([symbol, data]) => (
                    <button key={symbol}
                      onClick={() => setSelectedPair(symbol.replace('USDT', '/KAIROS'))}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs transition-colors ${
                        selectedPair === symbol.replace('USDT', '/KAIROS')
                          ? 'bg-blue-900/30 border border-blue-500/30'
                          : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                      }`}>
                      <span className="text-lg">{PAIR_ICONS[symbol.replace('USDT', '/KAIROS')] || '•'}</span>
                      <span className="text-zinc-300 font-medium truncate w-full text-center">{symbol.replace('USDT', '/KAIROS')}</span>
                      <span className="text-white font-mono text-[11px]">${data.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className={`text-[10px] font-mono ${(data.change24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(data.change24h || 0) >= 0 ? '+' : ''}{(data.change24h || 0).toFixed(2)}%
                      </span>
                    </button>
                  ))}
                  {Object.keys(prices).length === 0 && (
                    <div className="col-span-full text-center py-6 text-zinc-500 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando precios...
                    </div>
                  )}
                </div>
              )}

              {/* Positions tab */}
              {activeTab === 'trade' && (
                <div>
                  {positions.length === 0 ? (
                    <div className="text-center py-8">
                      <Eye className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">Sin posiciones abiertas</p>
                      <p className="text-zinc-600 text-xs mt-1">Deposita colateral y abre tu primera operación</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                      {positions.map(pos => (
                        <PositionCard key={pos.id} position={pos}
                          onClose={handleClosePosition}
                          isClosing={closingPositionId === pos.id}
                          prices={prices} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* History tab */}
              {activeTab === 'history' && (
                <div>
                  {tradeHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">Sin historial</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                      {tradeHistory.map(trade => (
                        <HistoryCard key={trade.id} trade={trade} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BROKER CHART — Mini TradingView chart using lightweight-charts + Binance data
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];
const BINANCE_KLINES = [
  'https://api.binance.us/api/v3/klines',
  'https://api.binance.com/api/v3/klines',
];

function BrokerChart({ pair, height = 280 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const volRef = useRef(null);
  const wsRef = useRef(null);
  const [tf, setTf] = useState('15m');
  const [chartLoading, setChartLoading] = useState(true);

  const symbol = pair.replace('/', '');

  // Fetch klines from Binance (with fallback)
  const fetchKlines = useCallback(async (sym, interval) => {
    for (const base of BINANCE_KLINES) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(`${base}?symbol=${sym}&interval=${interval}&limit=300`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const raw = await res.json();
        if (!Array.isArray(raw)) continue;
        return raw.map(k => ({
          time: Math.floor(k[0] / 1000),
          open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
        }));
      } catch { continue; }
    }
    return [];
  }, []);

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height,
      layout: { background: { type: ColorType.Solid, color: '#09090b' }, textColor: '#71717a', fontFamily: 'Inter, monospace', fontSize: 10 },
      grid: { vertLines: { color: '#18181b' }, horzLines: { color: '#18181b' } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#3b82f6', width: 1, style: 2 }, horzLine: { color: '#3b82f6', width: 1, style: 2 } },
      timeScale: { borderColor: '#27272a', timeVisible: true, secondsVisible: false, rightOffset: 3, barSpacing: 6 },
      rightPriceScale: { borderColor: '#27272a', scaleMargins: { top: 0.1, bottom: 0.25 } },
    });
    const candle = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444', borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e80', wickDownColor: '#ef444480',
    });
    const vol = chart.addHistogramSeries({
      color: '#3b82f650', priceFormat: { type: 'volume' },
      priceScaleId: '', scaleMargins: { top: 0.8, bottom: 0 },
    });
    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;

    const ro = new ResizeObserver(([e]) => { try { chart.applyOptions({ width: e.contentRect.width }); } catch {} });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  // Load data on pair/tf change
  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);

    (async () => {
      const candles = await fetchKlines(symbol, tf);
      if (cancelled || !candleRef.current) return;
      candleRef.current.setData(candles);
      volRef.current.setData(candles.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#22c55e30' : '#ef444430' })));
      chartRef.current?.timeScale().fitContent();
      setChartLoading(false);
    })();

    // WebSocket for live candle updates
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    const wsUrls = ['wss://stream.binance.us:9443/ws', 'wss://stream.binance.com:9443/ws'];
    function tryWs(idx) {
      if (idx >= wsUrls.length || cancelled) return;
      try {
        const ws = new WebSocket(`${wsUrls[idx]}/${symbol.toLowerCase()}@kline_${tf}`);
        ws.onopen = () => { wsRef.current = ws; };
        ws.onmessage = (e) => {
          try {
            const { k } = JSON.parse(e.data);
            if (!k || !candleRef.current) return;
            candleRef.current.update({ time: Math.floor(k.t / 1000), open: +k.o, high: +k.h, low: +k.l, close: +k.c });
            volRef.current?.update({ time: Math.floor(k.t / 1000), value: +k.v, color: +k.c >= +k.o ? '#22c55e30' : '#ef444430' });
          } catch {}
        };
        ws.onerror = () => { ws.close(); tryWs(idx + 1); };
      } catch { tryWs(idx + 1); }
    }
    tryWs(0);

    return () => { cancelled = true; if (wsRef.current) { wsRef.current.close(); wsRef.current = null; } };
  }, [symbol, tf, fetchKlines]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Timeframe tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> {pair}
        </span>
        <div className="flex gap-1">
          {CHART_TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTf(t)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${tf === t ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {/* Chart container */}
      <div className="relative">
        <div ref={containerRef} style={{ width: '100%', height: height }} />
        {chartLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function AccountRow({ label, value, icon, color = 'text-white' }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-zinc-500 flex items-center gap-1.5">{icon} {label}</span>
      <span className={`text-xs font-mono font-medium ${color}`}>{value}</span>
    </div>
  );
}

function PositionCard({ position, onClose, isClosing, prices }) {
  const pos = position;
  const pnl = parseFloat(pos.unrealizedPnl) || 0;
  const pnlPct = parseFloat(pos.pnlPercent) || (pos.collateral ? (pnl / parseFloat(pos.collateral)) * 100 : 0);
  const isLong = (pos.side || pos.direction || '').toUpperCase() === 'LONG';
  const pair = pos.pair || pos.symbol || '';
  const currentPriceData = prices[pair.replace('/', '')] || {};

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{PAIR_ICONS[pair] || '•'}</span>
          <span className="text-sm font-bold text-white">{pair}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isLong ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {isLong ? 'LONG' : 'SHORT'} {pos.leverage}x
          </span>
        </div>
        <button onClick={() => onClose(pos.id)} disabled={isClosing}
          className="text-xs bg-zinc-800 hover:bg-red-600/80 text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1">
          {isClosing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          Cerrar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between text-zinc-400">
          <span>Entrada</span>
          <span className="text-white font-mono">${parseFloat(pos.entryPrice || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Actual</span>
          <span className="text-white font-mono">${(currentPriceData.price || parseFloat(pos.currentPrice || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Colateral</span>
          <span className="text-white font-mono">{parseFloat(pos.collateral || 0).toFixed(2)} K</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Tamaño</span>
          <span className="text-white font-mono">${parseFloat(pos.positionSizeUsd || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* P&L bar */}
      <div className={`mt-2 px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
        pnl >= 0 ? 'bg-green-900/20 border border-green-500/20' : 'bg-red-900/20 border border-red-500/20'
      }`}>
        <span className="text-[10px] text-zinc-400">P&L</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </span>
          <span className={`text-[10px] font-mono ${pnlPct >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
            ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* SL/TP indicators */}
      {(pos.stopLoss || pos.takeProfit) && (
        <div className="flex gap-2 mt-1.5 text-[10px]">
          {pos.stopLoss && (
            <span className="text-red-400/60">SL: ${parseFloat(pos.stopLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          )}
          {pos.takeProfit && (
            <span className="text-green-400/60">TP: ${parseFloat(pos.takeProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function HistoryCard({ trade }) {
  const pnl = parseFloat(trade.realizedPnl || trade.pnl || 0);
  const isLong = (trade.side || trade.direction || '').toUpperCase() === 'LONG';
  const pair = trade.pair || trade.symbol || '';
  const status = (trade.status || trade.closeReason || '').toUpperCase();
  const isLiquidated = status.includes('LIQUIDAT');

  return (
    <div className={`bg-zinc-900 border rounded-xl p-3 ${isLiquidated ? 'border-red-500/30' : 'border-zinc-800'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span>{PAIR_ICONS[pair] || '•'}</span>
          <span className="text-sm font-medium text-white">{pair}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isLong ? 'bg-green-900/30 text-green-400/70' : 'bg-red-900/30 text-red-400/70'
          }`}>
            {isLong ? 'LONG' : 'SHORT'} {trade.leverage}x
          </span>
          {isLiquidated && (
            <span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded font-bold">LIQUIDADO</span>
          )}
        </div>
        <span className={`text-xs font-bold font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </span>
      </div>

      <div className="flex gap-4 text-[10px] text-zinc-500">
        <span>Entrada: ${parseFloat(trade.entryPrice || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        <span>Salida: ${parseFloat(trade.exitPrice || trade.closePrice || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        <span>Colateral: {parseFloat(trade.collateral || 0).toFixed(2)}</span>
      </div>

      {trade.closedAt && (
        <div className="text-[10px] text-zinc-600 mt-1">
          {new Date(trade.closedAt || trade.closed_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
