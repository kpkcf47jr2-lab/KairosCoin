// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Token Detail Screen
//  Full price chart, stats, and actions for a single token
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Send, Download, ArrowLeftRight, ExternalLink,
  TrendingUp, TrendingDown, Clock,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS, KAIROS_TOKEN } from '../../constants/chains';
import { formatUSD, formatBalance } from '../../services/prices';
import { getNativePriceHistory, getTokenPriceHistory, normalizeSparkline } from '../../services/charts';
import TokenIcon from '../Common/TokenIcon';

// Larger chart component (full-width)
function PriceChart({ points, width = 340, height = 180, color, negative }) {
  if (!points || points.length < 2) return null;

  const lineColor = negative ? '#ef4444' : color;
  const gradId = `chart_${Math.random().toString(36).slice(2, 8)}`;
  const stepX = width / (points.length - 1);
  const padding = 4;
  const usableHeight = height - padding * 2;

  const pathPoints = points.map((p, i) => ({
    x: i * stepX,
    y: padding + usableHeight * (1 - p),
  }));

  let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1];
    const curr = pathPoints[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
  }

  const areaD = d + ` L ${pathPoints[pathPoints.length - 1].x} ${height} L 0 ${height} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TIME_RANGES = [
  { label: '24H', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '1A', days: 365 },
];

export default function TokenDetailScreen() {
  const {
    activeChainId, navigate, goBack, nativePrice, tokenPrices, tokenDetailData,
  } = useStore();

  const chain = CHAINS[activeChainId];
  
  // Token data from store (set by Dashboard when clicking a token)
  const [token, setToken] = useState(tokenDetailData || null);
  const [selectedRange, setSelectedRange] = useState(7);
  const [chartData, setChartData] = useState(null);
  const [sparkline, setSparkline] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Also listen for late updates
  useEffect(() => {
    if (tokenDetailData && !token) {
      setToken(tokenDetailData);
    }
  }, [tokenDetailData]);

  // Fetch chart data
  useEffect(() => {
    if (!token) return;
    
    const fetchChart = async () => {
      setIsLoading(true);
      try {
        let data;
        if (token.isNative) {
          data = await getNativePriceHistory(activeChainId, selectedRange);
        } else {
          data = await getTokenPriceHistory(activeChainId, token.address, selectedRange);
        }
        
        if (data) {
          setChartData(data);
          const spark = normalizeSparkline(data.prices, 80);
          setSparkline(spark);
        }
      } catch {}
      setIsLoading(false);
    };
    
    fetchChart();
  }, [token, selectedRange, activeChainId]);

  if (!token) {
    return (
      <div className="screen-container items-center justify-center">
        <p className="text-dark-400">Cargando...</p>
      </div>
    );
  }

  const price = token.isNative ? nativePrice : (tokenPrices[token.address?.toLowerCase()]?.usd || 0);
  const balance = parseFloat(token.balance || '0');
  const value = balance * price;
  const change = chartData?.change24h || 0;
  const isNeg = change < 0;
  const isKairos = token.address?.toLowerCase() === KAIROS_TOKEN.address.toLowerCase();

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <div className="flex items-center gap-2">
          <TokenIcon token={token} chainId={activeChainId} size={28} />
          <span className="font-bold text-white">{token.symbol}</span>
          {isKairos && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-kairos-500/20 text-kairos-400">
              STABLE
            </span>
          )}
        </div>
        <a
          href={token.isNative ? chain.blockExplorerUrl : `${chain.blockExplorerUrl}/token/${token.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 -mr-2 rounded-xl hover:bg-white/5"
        >
          <ExternalLink size={18} className="text-dark-400" />
        </a>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Price & Change */}
        <div className="px-5 mb-2">
          <h2 className="text-3xl font-bold text-white">
            {price > 0 ? formatUSD(price) : '—'}
          </h2>
          {change !== 0 && (
            <div className={`flex items-center gap-1 mt-1 ${isNeg ? 'text-red-400' : 'text-green-400'}`}>
              {isNeg ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              <span className="text-sm font-medium">
                {isNeg ? '' : '+'}{change.toFixed(2)}%
              </span>
              <span className="text-xs text-dark-500">
                ({selectedRange === 1 ? '24h' : selectedRange === 7 ? '7d' : selectedRange === 30 ? '30d' : '1a'})
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="px-5 mb-4">
          <div className="h-44 bg-white/[0.02] rounded-2xl overflow-hidden flex items-end border border-white/5">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-dark-500 text-sm"
                >
                  Cargando gráfica...
                </motion.div>
              </div>
            ) : sparkline ? (
              <PriceChart
                points={sparkline.points}
                color="#d4a017"
                negative={isNeg}
                height={176}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-dark-500 text-xs">Sin datos de precio</p>
              </div>
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="px-5 mb-6">
          <div className="flex gap-2">
            {TIME_RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setSelectedRange(r.days)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  selectedRange === r.days
                    ? 'bg-kairos-500/20 text-kairos-400 border border-kairos-500/30'
                    : 'bg-white/[0.04] text-dark-400 border border-transparent'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Balance Section */}
        <div className="px-5 mb-6">
          <h3 className="text-xs text-dark-400 mb-2 uppercase tracking-wider">Tu saldo</h3>
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">
                  {formatBalance(token.balance || '0')} <span className="text-dark-400">{token.symbol}</span>
                </p>
                <p className="text-sm text-dark-400">
                  {value > 0 ? formatUSD(value) : '—'}
                </p>
              </div>
              <TokenIcon token={token} chainId={activeChainId} size={48} />
            </div>
          </div>
        </div>

        {/* Stats */}
        {sparkline && (
          <div className="px-5 mb-6">
            <h3 className="text-xs text-dark-400 mb-2 uppercase tracking-wider">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-dark-500 mb-1">Mínimo</p>
                <p className="text-sm font-semibold text-white">{formatUSD(sparkline.min)}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-dark-500 mb-1">Máximo</p>
                <p className="text-sm font-semibold text-white">{formatUSD(sparkline.max)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-5 mb-8">
          <div className="flex gap-3">
            <button
              onClick={() => navigate('send')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-medium"
            >
              <Send size={16} />
              Enviar
            </button>
            <button
              onClick={() => navigate('receive')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium"
            >
              <Download size={16} />
              Recibir
            </button>
            <button
              onClick={() => navigate('swap')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/10 text-purple-400 text-sm font-medium"
            >
              <ArrowLeftRight size={16} />
              Swap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
