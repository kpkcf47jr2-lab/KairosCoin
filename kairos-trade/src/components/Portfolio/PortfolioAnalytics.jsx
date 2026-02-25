// Kairos Trade — Portfolio Analytics (Elite Dashboard)
// Equity curve, P&L stats, drawdown, win rate, Sharpe ratio
import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BarChart3, Activity, Target, Shield,
  Calendar, DollarSign, Percent, Award, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Clock, Zap, Filter
} from 'lucide-react';
import useStore from '../../store/useStore';
import { tradingEngine } from '../../services/tradingEngine';

// ─── Mini sparkline component ───
function Sparkline({ data, color = '#D4AF37', height = 40, width = 120 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// ─── Equity chart (canvas) ───
function EquityChart({ trades, height = 280 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trades.length < 1) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Build equity curve
    const startBalance = 1000; // Normalized
    let equity = startBalance;
    const points = [{ x: 0, y: startBalance }];
    let maxEquity = startBalance;
    const drawdowns = [0];

    trades.forEach((t, i) => {
      equity += (t.pnl || 0);
      maxEquity = Math.max(maxEquity, equity);
      const dd = maxEquity > 0 ? ((maxEquity - equity) / maxEquity) * 100 : 0;
      drawdowns.push(dd);
      points.push({ x: i + 1, y: equity });
    });

    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    const rangeY = maxY - minY || 1;
    const pad = { top: 20, bottom: 40, left: 60, right: 20 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      // Labels
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      const val = maxY - (rangeY / 4) * i;
      ctx.fillText(`$${val.toFixed(0)}`, pad.left - 8, y + 3);
    }

    // Drawdown fill (bottom area)
    if (drawdowns.length > 1) {
      const maxDD = Math.max(...drawdowns) || 1;
      ctx.fillStyle = 'rgba(234,57,67,0.08)';
      ctx.beginPath();
      ctx.moveTo(pad.left, H - pad.bottom);
      drawdowns.forEach((dd, i) => {
        const x = pad.left + (i / Math.max(drawdowns.length - 1, 1)) * chartW;
        const y = H - pad.bottom - (dd / Math.max(maxDD, 1)) * (chartH * 0.3);
        ctx.lineTo(x, y);
      });
      ctx.lineTo(pad.left + chartW, H - pad.bottom);
      ctx.closePath();
      ctx.fill();
    }

    // Equity line
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad.left + (p.x / Math.max(points.length - 1, 1)) * chartW;
      const y = pad.top + (1 - (p.y - minY) / rangeY) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gradient fill under line
    const gradient = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    gradient.addColorStop(0, 'rgba(212,175,55,0.15)');
    gradient.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad.left + (p.x / Math.max(points.length - 1, 1)) * chartW;
      const y = pad.top + (1 - (p.y - minY) / rangeY) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + chartW, H - pad.bottom);
    ctx.lineTo(pad.left, H - pad.bottom);
    ctx.closePath();
    ctx.fill();

    // Dots on significant points
    const last = points[points.length - 1];
    const lx = pad.left + (last.x / Math.max(points.length - 1, 1)) * chartW;
    const ly = pad.top + (1 - (last.y - minY) / rangeY) * chartH;
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fill();

    // X-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(trades.length / 6));
    for (let i = 0; i < trades.length; i += step) {
      const x = pad.left + ((i + 1) / Math.max(points.length - 1, 1)) * chartW;
      const d = new Date(trades[i].closedAt || trades[i].time);
      ctx.fillText(d.toLocaleDateString('es', { day: '2-digit', month: 'short' }), x, H - pad.bottom + 16);
    }
  }, [trades, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      className="rounded-xl"
    />
  );
}

// ─── Distribution bar ───
function DistributionBar({ wins, losses, neutral }) {
  const total = wins + losses + neutral || 1;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-[var(--dark-4)]">
      <div style={{ width: `${(wins / total) * 100}%` }} className="bg-emerald-500" />
      <div style={{ width: `${(neutral / total) * 100}%` }} className="bg-yellow-500/50" />
      <div style={{ width: `${(losses / total) * 100}%` }} className="bg-red-500" />
    </div>
  );
}

export default function PortfolioAnalytics() {
  const { tradeHistory, bots, brokers } = useStore();
  const [timeFilter, setTimeFilter] = useState('all');
  const [botFilter, setBotFilter] = useState('all');

  // Get ALL trades from store + active bots
  const allTrades = useMemo(() => {
    let trades = [...(tradeHistory || [])];
    // Add any trades from trading engine logs
    return trades.sort((a, b) => {
      const tA = new Date(a.closedAt || a.time || 0).getTime();
      const tB = new Date(b.closedAt || b.time || 0).getTime();
      return tA - tB;
    });
  }, [tradeHistory]);

  // Filter trades by time
  const filteredTrades = useMemo(() => {
    let trades = allTrades;
    if (botFilter !== 'all') {
      trades = trades.filter(t => t.botId === botFilter || t.botName === botFilter);
    }
    if (timeFilter === 'today') {
      const today = new Date().setHours(0, 0, 0, 0);
      trades = trades.filter(t => new Date(t.closedAt || t.time).getTime() >= today);
    } else if (timeFilter === '7d') {
      const week = Date.now() - 7 * 86400000;
      trades = trades.filter(t => new Date(t.closedAt || t.time).getTime() >= week);
    } else if (timeFilter === '30d') {
      const month = Date.now() - 30 * 86400000;
      trades = trades.filter(t => new Date(t.closedAt || t.time).getTime() >= month);
    }
    return trades;
  }, [allTrades, timeFilter, botFilter]);

  // Compute analytics
  const stats = useMemo(() => {
    const trades = filteredTrades;
    if (trades.length === 0) return null;

    const wins = trades.filter(t => (t.pnl || 0) > 0);
    const losses = trades.filter(t => (t.pnl || 0) < 0);
    const neutral = trades.filter(t => (t.pnl || 0) === 0);

    const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalWinPnl = wins.reduce((s, t) => s + t.pnl, 0);
    const totalLossPnl = losses.reduce((s, t) => s + Math.abs(t.pnl), 0);
    const avgWin = wins.length > 0 ? totalWinPnl / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossPnl / losses.length : 0;
    const winRate = (wins.length / trades.length) * 100;
    const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0;

    // Max drawdown
    let peak = 0;
    let maxDD = 0;
    let equity = 0;
    const equityCurve = [];
    trades.forEach(t => {
      equity += (t.pnl || 0);
      equityCurve.push(equity);
      peak = Math.max(peak, equity);
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      maxDD = Math.max(maxDD, dd);
    });

    // Sharpe Ratio (simplified — annualized if daily PnL data)
    const returns = trades.map(t => t.pnl || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Best/worst trade
    const bestTrade = trades.reduce((best, t) => (t.pnl || 0) > (best.pnl || 0) ? t : best, trades[0]);
    const worstTrade = trades.reduce((worst, t) => (t.pnl || 0) < (worst.pnl || 0) ? t : worst, trades[0]);

    // Consecutive wins/losses
    let maxConsecWins = 0, maxConsecLosses = 0, curWins = 0, curLosses = 0;
    trades.forEach(t => {
      if (t.pnl > 0) { curWins++; curLosses = 0; maxConsecWins = Math.max(maxConsecWins, curWins); }
      else if (t.pnl < 0) { curLosses++; curWins = 0; maxConsecLosses = Math.max(maxConsecLosses, curLosses); }
    });

    // Avg hold time
    const avgHoldTime = trades.reduce((s, t) => {
      if (t.closedAt && t.time) {
        return s + (new Date(t.closedAt).getTime() - new Date(t.time).getTime());
      }
      return s;
    }, 0) / Math.max(trades.length, 1);

    // Daily PnL for chart
    const dailyPnl = {};
    trades.forEach(t => {
      const d = new Date(t.closedAt || t.time).toLocaleDateString();
      dailyPnl[d] = (dailyPnl[d] || 0) + (t.pnl || 0);
    });

    // Risk/Reward ratio
    const riskReward = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    // Expectancy
    const expectancy = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss);

    return {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      neutral: neutral.length,
      totalPnl,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown: maxDD,
      sharpeRatio,
      bestTrade,
      worstTrade,
      maxConsecWins,
      maxConsecLosses,
      equityCurve,
      avgHoldTime,
      dailyPnl,
      riskReward,
      expectancy,
    };
  }, [filteredTrades]);

  // Stat card subcomponent
  const StatCard = ({ icon: Icon, label, value, subtitle, color = 'var(--gold)', small = false }) => (
    <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[var(--text-dim)]">
        <Icon size={14} style={{ color }} />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`font-bold ${small ? 'text-base' : 'text-lg'}`} style={{ color }}>{value}</p>
      {subtitle && <p className="text-[10px] text-[var(--text-dim)]">{subtitle}</p>}
    </div>
  );

  const formatTime = (ms) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
    return `${(ms / 86400000).toFixed(1)}d`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity size={22} className="text-[var(--gold)]" /> Portfolio Analytics
          </h1>
          <p className="text-sm text-[var(--text-dim)]">Rendimiento detallado de tu trading</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="text-xs bg-[var(--dark-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--text)]"
          >
            <option value="all">Todo</option>
            <option value="today">Hoy</option>
            <option value="7d">7 días</option>
            <option value="30d">30 días</option>
          </select>
          <select
            value={botFilter}
            onChange={(e) => setBotFilter(e.target.value)}
            className="text-xs bg-[var(--dark-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--text)]"
          >
            <option value="all">Todos los Bots</option>
            {bots.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!stats ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 size={48} className="text-[var(--text-dim)] mb-4" />
          <h2 className="text-lg font-bold mb-2">Sin datos de trading aún</h2>
          <p className="text-sm text-[var(--text-dim)] max-w-md">
            Activa tus bots o ejecuta trades manuales para ver analytics detallados aquí.
          </p>
        </div>
      ) : (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard
              icon={DollarSign}
              label="P&L Total"
              value={`${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`}
              color={stats.totalPnl >= 0 ? '#10B981' : '#EF4444'}
              subtitle={`${stats.totalTrades} trades`}
            />
            <StatCard
              icon={Target}
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              color={stats.winRate >= 50 ? '#10B981' : '#EF4444'}
              subtitle={`${stats.wins}W / ${stats.losses}L`}
            />
            <StatCard
              icon={TrendingUp}
              label="Profit Factor"
              value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
              color={stats.profitFactor >= 1 ? '#10B981' : '#EF4444'}
              subtitle="Win$ / Loss$"
            />
            <StatCard
              icon={AlertTriangle}
              label="Max Drawdown"
              value={`${stats.maxDrawdown.toFixed(1)}%`}
              color={stats.maxDrawdown < 10 ? '#10B981' : stats.maxDrawdown < 25 ? '#F59E0B' : '#EF4444'}
              subtitle="Caída máxima"
            />
            <StatCard
              icon={Zap}
              label="Sharpe Ratio"
              value={stats.sharpeRatio.toFixed(2)}
              color={stats.sharpeRatio >= 1 ? '#10B981' : stats.sharpeRatio >= 0 ? '#F59E0B' : '#EF4444'}
              subtitle={stats.sharpeRatio >= 2 ? 'Excelente' : stats.sharpeRatio >= 1 ? 'Bueno' : 'Mejorable'}
            />
            <StatCard
              icon={Award}
              label="Expectancy"
              value={`$${stats.expectancy.toFixed(2)}`}
              color={stats.expectancy >= 0 ? '#10B981' : '#EF4444'}
              subtitle="$ esperado/trade"
            />
          </div>

          {/* Equity Curve */}
          <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <TrendingUp size={16} className="text-[var(--gold)]" /> Curva de Equity
              </h2>
              <div className="text-xs text-[var(--text-dim)]">
                {filteredTrades.length} trades • Drawdown en rojo
              </div>
            </div>
            <EquityChart trades={filteredTrades} />
          </div>

          {/* Win/Loss Distribution + Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Distribution */}
            <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <BarChart3 size={14} className="text-[var(--gold)]" /> Distribución
              </h3>
              <DistributionBar wins={stats.wins} losses={stats.losses} neutral={stats.neutral} />
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400">{stats.wins} wins ({stats.winRate.toFixed(0)}%)</span>
                {stats.neutral > 0 && <span className="text-yellow-400">{stats.neutral} neutral</span>}
                <span className="text-red-400">{stats.losses} losses ({(100 - stats.winRate).toFixed(0)}%)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[var(--dark)] rounded-lg p-3">
                  <p className="text-[10px] text-[var(--text-dim)] mb-1">Avg Win</p>
                  <p className="text-emerald-400 font-bold">+${stats.avgWin.toFixed(2)}</p>
                </div>
                <div className="bg-[var(--dark)] rounded-lg p-3">
                  <p className="text-[10px] text-[var(--text-dim)] mb-1">Avg Loss</p>
                  <p className="text-red-400 font-bold">-${stats.avgLoss.toFixed(2)}</p>
                </div>
                <div className="bg-[var(--dark)] rounded-lg p-3">
                  <p className="text-[10px] text-[var(--text-dim)] mb-1">Max Wins Seguidos</p>
                  <p className="text-emerald-400 font-bold">{stats.maxConsecWins}</p>
                </div>
                <div className="bg-[var(--dark)] rounded-lg p-3">
                  <p className="text-[10px] text-[var(--text-dim)] mb-1">Max Losses Seguidos</p>
                  <p className="text-red-400 font-bold">{stats.maxConsecLosses}</p>
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Shield size={14} className="text-[var(--gold)]" /> Métricas Clave
              </h3>
              
              {[
                { label: 'Risk/Reward Ratio', value: stats.riskReward === Infinity ? '∞' : `1:${stats.riskReward.toFixed(2)}`, good: stats.riskReward >= 1.5 },
                { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), good: stats.profitFactor >= 1.5 },
                { label: 'Tiempo Prom. en Trade', value: formatTime(stats.avgHoldTime), neutral: true },
                { label: 'Mejor Trade', value: `+$${(stats.bestTrade?.pnl || 0).toFixed(2)}`, good: true },
                { label: 'Peor Trade', value: `-$${Math.abs(stats.worstTrade?.pnl || 0).toFixed(2)}`, good: false },
                { label: 'Expectancy por Trade', value: `$${stats.expectancy.toFixed(2)}`, good: stats.expectancy > 0 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className="text-xs text-[var(--text-dim)]">{item.label}</span>
                  <span className={`text-sm font-bold ${item.neutral ? 'text-[var(--text)]' : item.good ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily PnL Heatmap */}
          <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-[var(--gold)]" /> P&L Diario
            </h3>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(stats.dailyPnl).slice(-60).map(([date, pnl], i) => {
                const intensity = Math.min(Math.abs(pnl) / (Math.max(...Object.values(stats.dailyPnl).map(Math.abs)) || 1), 1);
                const bg = pnl >= 0
                  ? `rgba(16,185,129,${0.15 + intensity * 0.6})`
                  : `rgba(239,68,68,${0.15 + intensity * 0.6})`;
                return (
                  <div
                    key={i}
                    className="w-8 h-8 rounded flex items-center justify-center text-[8px] font-bold cursor-default group relative"
                    style={{ background: bg }}
                    title={`${date}: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`}
                  >
                    {new Date(date).getDate()}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-[var(--text-dim)]">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500/30" /> Ganancia
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500/30" /> Pérdida
              </span>
              <span>Más intenso = mayor monto</span>
            </div>
          </div>

          {/* Recent Trades Table */}
          <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <Clock size={14} className="text-[var(--gold)]" /> Últimos Trades
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-dim)] border-b border-[var(--border)]">
                    <th className="text-left py-2 px-2">Par</th>
                    <th className="text-left py-2 px-2">Lado</th>
                    <th className="text-right py-2 px-2">Entrada</th>
                    <th className="text-right py-2 px-2">Salida</th>
                    <th className="text-right py-2 px-2">P&L</th>
                    <th className="text-right py-2 px-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.slice(-20).reverse().map((t, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-white/[0.02]">
                      <td className="py-2 px-2 font-mono">{t.pair || t.symbol || '—'}</td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {(t.side || '—').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono">${(t.entryPrice || 0).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono">${(t.exitPrice || 0).toFixed(2)}</td>
                      <td className={`py-2 px-2 text-right font-bold ${(t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(t.pnl || 0) >= 0 ? '+' : ''}${(t.pnl || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right text-[var(--text-dim)]">
                        {new Date(t.closedAt || t.time || Date.now()).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
