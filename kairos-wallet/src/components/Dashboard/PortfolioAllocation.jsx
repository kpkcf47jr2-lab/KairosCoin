// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Portfolio Allocation + P&L
//  Donut chart, allocation breakdown, P&L tracking
//  MetaMask shows NOTHING like this
// ═══════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, TrendingDown, PieChart, DollarSign, BarChart2,
  Globe, Loader2, RefreshCw,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS, CHAIN_ORDER, KAIROS_TOKEN } from '../../constants/chains';
import { formatUSD, formatBalance } from '../../services/prices';
import { getCrossChainPortfolio } from '../../services/crossChainPortfolio';
import TokenIcon, { ChainIcon } from '../Common/TokenIcon';

const CHART_COLORS = [
  '#D4AF37', '#22d3ee', '#a78bfa', '#f472b6', '#34d399',
  '#fb923c', '#60a5fa', '#facc15', '#f87171', '#94a3b8',
];

const PNL_KEY = 'kairos_pnl_history';

function loadPnlHistory() {
  try { return JSON.parse(localStorage.getItem(PNL_KEY) || '[]'); } catch { return []; }
}

function savePnlSnapshot(value) {
  const history = loadPnlHistory();
  const now = Date.now();
  // Max 1 snapshot per hour
  if (history.length > 0 && now - history[history.length - 1].t < 3600000) return;
  history.push({ t: now, v: value });
  // Keep last 720 entries (30 days × 24h)
  if (history.length > 720) history.splice(0, history.length - 720);
  localStorage.setItem(PNL_KEY, JSON.stringify(history));
}

// SVG Donut Chart
function DonutChart({ slices, size = 160, stroke = 28 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => {
        const dashLen = circ * s.pct;
        const dash = `${dashLen} ${circ - dashLen}`;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        );
        offset += dashLen;
        return el;
      })}
      {/* Inner background */}
      <circle cx={cx} cy={cy} r={r - stroke / 2 + 2} fill="transparent" />
    </svg>
  );
}

export default function PortfolioAllocation() {
  const {
    activeChainId, activeAddress, balances, tokenPrices, nativePrice, goBack,
    getTotalPortfolioValue,
  } = useStore();

  const chain = CHAINS[activeChainId];
  const portfolioValue = getTotalPortfolioValue();
  const [tab, setTab] = useState('allocation'); // allocation | crosschain | pnl
  const [crossChain, setCrossChain] = useState(null);
  const [loadingCross, setLoadingCross] = useState(false);

  // Record snapshot
  useEffect(() => {
    if (portfolioValue > 0) savePnlSnapshot(portfolioValue);
  }, [portfolioValue]);

  // Load cross-chain when tab is selected
  useEffect(() => {
    if (tab === 'crosschain' && !crossChain && activeAddress) {
      setLoadingCross(true);
      getCrossChainPortfolio(activeAddress)
        .then(data => setCrossChain(data))
        .catch(() => {})
        .finally(() => setLoadingCross(false));
    }
  }, [tab, activeAddress]);

  // Build allocation data
  const allocations = useMemo(() => {
    const items = [];
    
    // Native token
    if (balances.native) {
      const bal = parseFloat(balances.native.balance || 0);
      const value = bal * nativePrice;
      if (value > 0.01) {
        items.push({
          symbol: balances.native.symbol,
          balance: bal,
          value,
          isNative: true,
          token: balances.native,
        });
      }
    }

    // ERC-20 tokens
    if (balances.tokens) {
      for (const token of balances.tokens) {
        if (!token.hasBalance) continue;
        const price = tokenPrices[token.address.toLowerCase()]?.usd || 0;
        const bal = parseFloat(token.balance || 0);
        const value = bal * price;
        if (value > 0.01) {
          items.push({
            symbol: token.symbol,
            balance: bal,
            value,
            price,
            change24h: tokenPrices[token.address.toLowerCase()]?.change24h || 0,
            isNative: false,
            token,
          });
        }
      }
    }

    // Sort by value descending
    items.sort((a, b) => b.value - a.value);

    const total = items.reduce((s, i) => s + i.value, 0);
    return items.map((item, i) => ({
      ...item,
      pct: total > 0 ? item.value / total : 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [balances, tokenPrices, nativePrice]);

  // P&L calculations
  const pnlData = useMemo(() => {
    const history = loadPnlHistory();
    if (history.length === 0) return { day: 0, week: 0, month: 0 };
    
    const now = Date.now();
    const find = (ms) => {
      const target = now - ms;
      const entry = history.find(h => h.t >= target) || history[0];
      return entry.v;
    };

    return {
      day: portfolioValue - find(86400000),
      week: portfolioValue - find(604800000),
      month: portfolioValue - find(2592000000),
    };
  }, [portfolioValue]);

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800">
        <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <PieChart className="text-kairos-400" size={20} />
          <h1 className="text-lg font-bold text-white">Portfolio</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 mx-4 mt-4 rounded-xl bg-white/5">
        {[
          { key: 'allocation', label: 'Tokens', icon: PieChart },
          { key: 'crosschain', label: 'Multi-Chain', icon: Globe },
          { key: 'pnl', label: 'P&L', icon: BarChart2 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              tab === t.key ? 'bg-kairos-500/15 text-kairos-400' : 'text-dark-400'
            }`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'allocation' && (
          <>
            {/* Donut Chart */}
            <div className="flex justify-center py-4 relative">
              {allocations.length > 0 ? (
                <div className="relative">
                  <DonutChart slices={allocations} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-dark-400 text-xs">Total</p>
                    <p className="text-white font-bold text-lg">{formatUSD(portfolioValue)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <PieChart className="mx-auto text-dark-600" size={48} />
                  <p className="text-dark-500 text-sm mt-2">Sin activos con valor</p>
                </div>
              )}
            </div>

            {/* Allocation breakdown */}
            <div className="space-y-2">
              {allocations.map((item, i) => (
                <motion.div
                  key={item.symbol}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 bg-dark-800/50 rounded-xl p-3 border border-dark-700/50"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <TokenIcon token={item.token} chainId={activeChainId} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{item.symbol}</p>
                    <p className="text-dark-500 text-xs">{formatBalance(item.balance.toString())}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-bold">{formatUSD(item.value)}</p>
                    <p className="text-dark-400 text-xs">{(item.pct * 100).toFixed(1)}%</p>
                  </div>
                  {/* Mini bar */}
                  <div className="w-12 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.pct * 100}%`, backgroundColor: item.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {tab === 'crosschain' && (
          <>
            {loadingCross ? (
              <div className="text-center py-12">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                  <Loader2 className="mx-auto text-kairos-400" size={32} />
                </motion.div>
                <p className="text-dark-400 text-sm mt-3">Escaneando 6 blockchains...</p>
              </div>
            ) : crossChain ? (
              <>
                {/* Total across ALL chains */}
                <div className="text-center py-4">
                  <p className="text-dark-400 text-xs">Portfolio Total (6 Chains)</p>
                  <p className="text-white font-bold text-2xl mt-1">{formatUSD(crossChain.totalUSD)}</p>
                </div>

                {/* Chain donut */}
                {(() => {
                  const chainSlices = CHAIN_ORDER
                    .map(id => ({
                      chainId: id,
                      ...crossChain.chains[id],
                      pct: crossChain.totalUSD > 0 ? (crossChain.chains[id]?.totalUSD || 0) / crossChain.totalUSD : 0,
                      color: CHAINS[id]?.color || '#888',
                    }))
                    .filter(s => s.totalUSD > 0.01);
                  return chainSlices.length > 0 ? (
                    <div className="flex justify-center py-2 relative">
                      <div className="relative">
                        <DonutChart slices={chainSlices} size={140} stroke={24} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Globe className="text-dark-500" size={16} />
                          <p className="text-dark-400 text-[10px]">6 chains</p>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Per-chain breakdown */}
                <div className="space-y-2">
                  {CHAIN_ORDER.map((chainId, i) => {
                    const data = crossChain.chains[chainId];
                    if (!data || data.totalUSD < 0.01) return (
                      <div key={chainId} className="flex items-center gap-3 bg-dark-800/30 rounded-xl p-3 border border-dark-700/30 opacity-50">
                        <ChainIcon chainId={chainId} size={24} />
                        <div className="flex-1">
                          <p className="text-dark-400 text-sm">{CHAINS[chainId].shortName}</p>
                        </div>
                        <p className="text-dark-600 text-xs">$0.00</p>
                      </div>
                    );
                    return (
                      <motion.div
                        key={chainId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-dark-800/50 rounded-xl p-3 border border-dark-700/50"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <ChainIcon chainId={chainId} size={24} />
                          <div className="flex-1">
                            <p className="text-white text-sm font-semibold">{data.chainName}</p>
                            <p className="text-dark-500 text-xs">
                              {data.tokens?.length || 0} token{(data.tokens?.length || 0) !== 1 ? 's' : ''} con balance
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm font-bold">{formatUSD(data.totalUSD)}</p>
                            <p className="text-dark-400 text-xs">
                              {crossChain.totalUSD > 0 ? ((data.totalUSD / crossChain.totalUSD) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        </div>
                        {/* Native + tokens breakdown */}
                        <div className="ml-9 space-y-1">
                          {data.native && parseFloat(data.native.balance) > 0.0001 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-dark-400">{data.native.symbol}</span>
                              <span className="text-dark-300">{parseFloat(data.native.balance).toFixed(4)} · {formatUSD(data.native.usd)}</span>
                            </div>
                          )}
                          {(data.tokens || []).map(t => (
                            <div key={t.address} className="flex justify-between text-xs">
                              <span className="text-dark-400">{t.symbol}</span>
                              <span className="text-dark-300">{parseFloat(t.balance).toFixed(4)} · {formatUSD(t.usd)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Refresh button */}
                <button
                  onClick={() => {
                    setCrossChain(null);
                    setLoadingCross(true);
                    getCrossChainPortfolio(activeAddress)
                      .then(data => setCrossChain(data))
                      .finally(() => setLoadingCross(false));
                  }}
                  className="w-full py-2.5 rounded-xl bg-dark-800/50 text-dark-400 text-xs flex items-center justify-center gap-1.5 border border-dark-700/30"
                >
                  <RefreshCw size={12} /> Actualizar portfolio multi-chain
                </button>
              </>
            ) : (
              <div className="text-center py-12">
                <Globe className="mx-auto text-dark-600" size={40} />
                <p className="text-dark-500 text-sm mt-2">Error cargando datos multi-chain</p>
              </div>
            )}
          </>
        )}

        {tab === 'pnl' && (
          <>
            {/* Current value */}
            <div className="text-center py-4">
              <p className="text-dark-400 text-xs">Valor del Portfolio</p>
              <p className="text-white font-bold text-2xl mt-1">{formatUSD(portfolioValue)}</p>
            </div>

            {/* P&L cards */}
            <div className="space-y-3">
              {[
                { label: 'Últimas 24h', value: pnlData.day, emoji: '📅' },
                { label: 'Últimos 7 días', value: pnlData.week, emoji: '📆' },
                { label: 'Últimos 30 días', value: pnlData.month, emoji: '🗓️' },
              ].map(p => (
                <div
                  key={p.label}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    p.value >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.emoji}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{p.label}</p>
                      <p className="text-dark-500 text-xs">Ganancia/Pérdida</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {p.value >= 0 ? (
                        <TrendingUp size={14} className="text-green-400" />
                      ) : (
                        <TrendingDown size={14} className="text-red-400" />
                      )}
                      <span className={`font-bold text-sm ${p.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.value >= 0 ? '+' : ''}{formatUSD(Math.abs(p.value))}
                      </span>
                    </div>
                    {portfolioValue > 0 && (
                      <p className={`text-xs ${p.value >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                        {p.value >= 0 ? '+' : ''}{((p.value / portfolioValue) * 100).toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-dark-800/30 rounded-xl p-3 border border-dark-700/30">
              <p className="text-dark-500 text-xs text-center">
                💡 Los datos P&L se calculan desde snapshots de tu portfolio. Cuanto más uses la wallet, más preciso será.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
