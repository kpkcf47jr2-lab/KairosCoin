// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Portfolio Sparkline Chart
//  Lightweight SVG chart showing portfolio value history
//  No external chart library needed
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const STORAGE_KEY = 'kairos_portfolio_history';
const MAX_POINTS = 500; // Keep max 500 data points

// Time period configs
const PERIODS = [
  { key: '1H', label: '1H', ms: 60 * 60 * 1000 },
  { key: '1D', label: '1D', ms: 24 * 60 * 60 * 1000 },
  { key: '1W', label: '1W', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '1M', label: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'ALL', label: 'ALL', ms: Infinity },
];

/** Save a portfolio snapshot */
export function recordPortfolioValue(value) {
  if (typeof value !== 'number' || isNaN(value) || value < 0) return;
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const history = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    
    // Don't save more than once per 5 minutes
    const last = history[history.length - 1];
    if (last && (now - last.t) < 5 * 60 * 1000) {
      // Update the last entry if very recent
      history[history.length - 1] = { t: now, v: value };
    } else {
      history.push({ t: now, v: value });
    }
    
    // Trim to max points
    const trimmed = history.length > MAX_POINTS 
      ? history.slice(history.length - MAX_POINTS) 
      : history;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // Storage full or corrupt — reset
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}

/** Build SVG path from data points */
function buildPath(points, width, height, padding = 4) {
  if (points.length < 2) return { path: '', area: '', min: 0, max: 0 };
  
  const values = points.map(p => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  
  const coords = points.map((p, i) => ({
    x: padding + (i / (points.length - 1)) * chartW,
    y: padding + chartH - ((p.v - min) / range) * chartH,
  }));
  
  // Smooth curve using catmull-rom to bezier
  let path = `M ${coords[0].x} ${coords[0].y}`;
  
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  
  // Area fill path
  const lastCoord = coords[coords.length - 1];
  const area = path + ` L ${lastCoord.x} ${height} L ${coords[0].x} ${height} Z`;
  
  return { path, area, min, max };
}

export default function PortfolioChart({ portfolioValue, hideBalance }) {
  const [period, setPeriod] = useState('1D');
  const [history, setHistory] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      setHistory([]);
    }
  }, [portfolioValue]); // Reload when portfolio updates
  
  // Filter by period
  const filteredData = useMemo(() => {
    const periodConfig = PERIODS.find(p => p.key === period);
    if (!periodConfig) return history;
    
    const cutoff = periodConfig.ms === Infinity ? 0 : Date.now() - periodConfig.ms;
    const filtered = history.filter(p => p.t >= cutoff);
    
    // If we have less than 2 points, add the current value
    if (filtered.length < 2 && portfolioValue >= 0) {
      const now = Date.now();
      if (filtered.length === 0) {
        return [
          { t: now - periodConfig.ms * 0.9, v: portfolioValue },
          { t: now, v: portfolioValue },
        ];
      }
      return [...filtered, { t: now, v: portfolioValue }];
    }
    
    return filtered;
  }, [history, period, portfolioValue]);
  
  // Calculate change
  const change = useMemo(() => {
    if (filteredData.length < 2) return { amount: 0, percent: 0 };
    const first = filteredData[0].v;
    const last = filteredData[filteredData.length - 1].v;
    const amount = last - first;
    const percent = first > 0 ? ((last - first) / first) * 100 : 0;
    return { amount, percent };
  }, [filteredData]);
  
  const isPositive = change.amount >= 0;
  const isFlat = Math.abs(change.percent) < 0.01;
  
  const WIDTH = 320;
  const HEIGHT = 100;
  const { path, area } = buildPath(filteredData, WIDTH, HEIGHT);
  
  const lineColor = isFlat ? '#6b7280' : isPositive ? '#22c55e' : '#ef4444';
  const fillColor = isFlat ? '#6b728010' : isPositive ? '#22c55e15' : '#ef444415';
  
  return (
    <div className="px-5 mb-4">
      <div className="glass-card-strong p-3 overflow-hidden">
        {/* Change indicator */}
        {!hideBalance && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {isFlat ? (
                <Minus size={14} className="text-dark-400" />
              ) : isPositive ? (
                <TrendingUp size={14} className="text-green-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
              <span className={`text-xs font-medium ${
                isFlat ? 'text-dark-400' : isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {isPositive && !isFlat ? '+' : ''}
                ${Math.abs(change.amount).toFixed(2)}
                {' '}
                ({isPositive && !isFlat ? '+' : ''}{change.percent.toFixed(2)}%)
              </span>
            </div>
            
            {/* Hovered value */}
            {hoveredPoint && (
              <span className="text-[10px] text-dark-400 font-mono">
                ${hoveredPoint.v.toFixed(2)} · {new Date(hoveredPoint.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
        
        {/* SVG Chart */}
        <div 
          className="relative w-full"
          style={{ height: HEIGHT }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Gradient fill */}
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {path && (
              <>
                {/* Area fill */}
                <motion.path
                  d={area}
                  fill="url(#chartGrad)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
                
                {/* Line */}
                <motion.path
                  d={path}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </>
            )}
            
            {/* Grid lines (subtle) */}
            {[0.25, 0.5, 0.75].map(pct => (
              <line
                key={pct}
                x1="0" y1={HEIGHT * pct}
                x2={WIDTH} y2={HEIGHT * pct}
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="1"
              />
            ))}
          </svg>
          
          {hideBalance && (
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-md rounded-lg">
              <span className="text-dark-500 text-xs">Oculto</span>
            </div>
          )}
        </div>
        
        {/* Period selector */}
        <div className="flex items-center justify-center gap-1 mt-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                period === p.key
                  ? 'bg-kairos-500/20 text-kairos-400'
                  : 'text-dark-500 hover:text-dark-300 hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
