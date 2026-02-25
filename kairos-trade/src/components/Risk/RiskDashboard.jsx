// Kairos Trade — Risk Dashboard (Elite Feature)
// Real-time exposure tracking, risk metrics, and portfolio heat map
import { useState, useMemo, useEffect } from 'react';
import {
  Shield, AlertTriangle, BarChart3, TrendingDown, TrendingUp,
  Activity, DollarSign, Percent, PieChart, Eye, Lock, Unlock
} from 'lucide-react';
import useStore from '../../store/useStore';
import { tradingEngine } from '../../services/tradingEngine';

// ─── Donut chart (SVG) ───
function DonutChart({ segments, size = 120, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {segments.map((seg, i) => {
        const dashLength = (seg.value / 100) * circumference;
        const dashOffset = -offset;
        offset += dashLength;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// ─── Risk meter ───
function RiskMeter({ value, max = 100, label }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct < 30 ? '#10B981' : pct < 60 ? '#F59E0B' : '#EF4444';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-[var(--text-dim)]">{label}</span>
        <span style={{ color }} className="font-bold">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-[var(--dark-4)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function RiskDashboard() {
  const { bots, brokers, positions, tradeHistory, settings } = useStore();
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute risk metrics
  const riskData = useMemo(() => {
    const activeBots = bots.filter(b => b.status === 'active');
    const connectedBrokers = brokers.filter(b => b.connected);
    const openPositions = positions || [];
    const trades = tradeHistory || [];

    // Total exposure (sum of all open positions' USD value)
    let totalExposure = 0;
    const exposureByPair = {};
    const exposureByBroker = {};

    openPositions.forEach(pos => {
      const value = (pos.quantity || 0) * (pos.currentPrice || pos.entryPrice || 0);
      totalExposure += value;
      const pair = pos.pair || 'Unknown';
      exposureByPair[pair] = (exposureByPair[pair] || 0) + value;
      const broker = pos.botName || 'Manual';
      exposureByBroker[broker] = (exposureByBroker[broker] || 0) + value;
    });

    // Add active bot positions from engine
    activeBots.forEach(bot => {
      const liveData = tradingEngine.getLiveData(bot.id);
      if (liveData?.position) {
        const value = (liveData.position.quantity || 0) * (liveData.price || liveData.position.entryPrice || 0);
        if (!openPositions.some(p => p.botId === bot.id)) {
          totalExposure += value;
          const pair = bot.pair || 'Unknown';
          exposureByPair[pair] = (exposureByPair[pair] || 0) + value;
        }
      }
    });

    // Estimated total balance
    const totalBalance = bots.reduce((s, b) => s + (b.balance || 0), 0) || 1000;

    // Current unrealized P&L
    let unrealizedPnl = 0;
    activeBots.forEach(bot => {
      const ld = tradingEngine.getLiveData(bot.id);
      if (ld?.unrealizedPnl) unrealizedPnl += ld.unrealizedPnl;
    });

    // Risk metrics from trade history
    const recentTrades = trades.slice(-100);
    const wins = recentTrades.filter(t => (t.pnl || 0) > 0).length;
    const losses = recentTrades.filter(t => (t.pnl || 0) < 0).length;
    const winRate = recentTrades.length > 0 ? (wins / recentTrades.length) * 100 : 0;

    // Max drawdown (from trade history)
    let peak = 0, maxDD = 0, equity = 0;
    trades.forEach(t => {
      equity += (t.pnl || 0);
      peak = Math.max(peak, equity);
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      maxDD = Math.max(maxDD, dd);
    });

    // Daily VaR (Value at Risk) — simplified historical method
    const dailyReturns = [];
    const dailyPnl = {};
    trades.forEach(t => {
      const d = new Date(t.closedAt || t.time).toLocaleDateString();
      dailyPnl[d] = (dailyPnl[d] || 0) + (t.pnl || 0);
    });
    Object.values(dailyPnl).forEach(pnl => {
      dailyReturns.push(pnl / Math.max(totalBalance, 1));
    });
    dailyReturns.sort((a, b) => a - b);
    const var95idx = Math.floor(dailyReturns.length * 0.05);
    const var95 = dailyReturns.length > 5 ? Math.abs(dailyReturns[var95idx] || 0) * 100 : 0;

    // Concentration risk
    const pairEntries = Object.entries(exposureByPair);
    const maxPairExposure = pairEntries.length > 0
      ? Math.max(...pairEntries.map(([, v]) => v)) / Math.max(totalExposure, 1) * 100
      : 0;

    // Leverage used
    const leverageUsed = totalBalance > 0 ? (totalExposure / totalBalance) : 0;

    // Risk score (0-100)
    let riskScore = 0;
    riskScore += Math.min(maxDD, 40); // Max drawdown contribution
    riskScore += Math.min(leverageUsed * 20, 30); // Leverage contribution
    riskScore += Math.min(maxPairExposure * 0.3, 20); // Concentration contribution
    riskScore += (100 - winRate) * 0.1; // Win rate contribution
    riskScore = Math.min(Math.max(riskScore, 0), 100);

    return {
      totalExposure,
      totalBalance,
      unrealizedPnl,
      winRate,
      maxDrawdown: maxDD,
      var95,
      maxPairExposure,
      leverageUsed,
      riskScore,
      activeBots: activeBots.length,
      openPositions: openPositions.length,
      exposureByPair,
      exposureByBroker,
      recentTrades: recentTrades.length,
    };
  }, [bots, brokers, positions, tradeHistory, refreshKey]);

  const riskLevel = riskData.riskScore < 30 ? 'Bajo' : riskData.riskScore < 60 ? 'Moderado' : 'Alto';
  const riskColor = riskData.riskScore < 30 ? '#10B981' : riskData.riskScore < 60 ? '#F59E0B' : '#EF4444';

  // Donut segments
  const pairSegments = (() => {
    const entries = Object.entries(riskData.exposureByPair);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const colors = ['#D4AF37', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return entries.map(([pair, value], i) => ({
      label: pair,
      value: (value / total) * 100,
      color: colors[i % colors.length],
    }));
  })();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield size={22} className="text-[var(--gold)]" /> Risk Dashboard
          </h1>
          <p className="text-sm text-[var(--text-dim)]">Gestión de riesgo en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5`}
            style={{ background: `${riskColor}20`, color: riskColor }}>
            <Shield size={12} />
            Riesgo {riskLevel} ({riskData.riskScore.toFixed(0)}/100)
          </div>
        </div>
      </div>

      {/* Main Risk Score */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-8">
          {/* Risk gauge */}
          <div className="relative">
            <svg width="140" height="80" viewBox="0 0 140 80">
              <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="var(--dark-4)" strokeWidth="8" strokeLinecap="round" />
              <path
                d="M 10 75 A 60 60 0 0 1 130 75"
                fill="none"
                stroke={riskColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(riskData.riskScore / 100) * 188} 188`}
              />
            </svg>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <p className="text-2xl font-black" style={{ color: riskColor }}>{riskData.riskScore.toFixed(0)}</p>
              <p className="text-[10px] text-[var(--text-dim)]">Risk Score</p>
            </div>
          </div>

          {/* Risk breakdown */}
          <div className="flex-1 space-y-2">
            <RiskMeter label="Max Drawdown" value={riskData.maxDrawdown} max={50} />
            <RiskMeter label="Apalancamiento" value={riskData.leverageUsed * 100} max={300} />
            <RiskMeter label="Concentración" value={riskData.maxPairExposure} max={100} />
            <RiskMeter label="VaR (95%)" value={riskData.var95} max={20} />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: 'Exposición Total', value: `$${riskData.totalExposure.toFixed(2)}`, color: 'var(--gold)' },
          { icon: Activity, label: 'P&L No Realizado', value: `${riskData.unrealizedPnl >= 0 ? '+' : ''}$${riskData.unrealizedPnl.toFixed(2)}`, color: riskData.unrealizedPnl >= 0 ? '#10B981' : '#EF4444' },
          { icon: Eye, label: 'Posiciones Abiertas', value: `${riskData.openPositions}`, color: '#3B82F6' },
          { icon: TrendingDown, label: 'Max Drawdown', value: `${riskData.maxDrawdown.toFixed(1)}%`, color: riskData.maxDrawdown < 10 ? '#10B981' : '#EF4444' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3">
              <div className="flex items-center gap-2 text-[var(--text-dim)] mb-1">
                <Icon size={14} style={{ color: item.color }} />
                <span className="text-[10px]">{item.label}</span>
              </div>
              <p className="text-base font-bold" style={{ color: item.color }}>{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* Exposure by Pair */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
            <PieChart size={14} className="text-[var(--gold)]" /> Exposición por Par
          </h3>
          {pairSegments.length > 0 ? (
            <div className="flex items-center gap-4">
              <DonutChart segments={pairSegments} />
              <div className="space-y-2 flex-1">
                {pairSegments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
                    <span className="text-xs flex-1">{seg.label}</span>
                    <span className="text-xs font-bold" style={{ color: seg.color }}>{seg.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-dim)] text-center py-6">Sin posiciones abiertas</p>
          )}
        </div>

        {/* Active Bots Risk */}
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-[var(--gold)]" /> Bots Activos — Riesgo
          </h3>
          {bots.filter(b => b.status === 'active').length > 0 ? (
            <div className="space-y-2">
              {bots.filter(b => b.status === 'active').map(bot => {
                const ld = tradingEngine.getLiveData(bot.id);
                const hasPosition = !!ld?.position;
                const pnl = ld?.unrealizedPnl || 0;
                const riskPct = bot.riskPercent || settings.maxRiskPerTrade || 2;
                return (
                  <div key={bot.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--dark)]">
                    <div className={`w-2 h-2 rounded-full ${hasPosition ? 'bg-[var(--gold)]' : 'bg-emerald-500'} animate-pulse`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{bot.name}</p>
                      <p className="text-[10px] text-[var(--text-dim)]">{bot.pair} • {riskPct}% riesgo</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {hasPosition ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : 'Esperando'}
                      </p>
                      <p className="text-[10px] text-[var(--text-dim)]">
                        {hasPosition ? `${ld.position.side.toUpperCase()} @ $${ld.position.entryPrice.toFixed(2)}` : '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-dim)] text-center py-6">No hay bots activos</p>
          )}
        </div>
      </div>

      {/* Risk Rules */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
          <Lock size={14} className="text-[var(--gold)]" /> Reglas de Riesgo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Riesgo Máx por Trade', value: `${settings.maxRiskPerTrade || 2}%`, status: true },
            { label: 'Apalancamiento Máx', value: `${settings.defaultLeverage || 1}x`, status: true },
            { label: 'Max Drawdown Permitido', value: '25%', status: riskData.maxDrawdown < 25 },
            { label: 'Máx Posiciones Simultáneas', value: `${bots.filter(b => b.status === 'active').length}`, status: true },
            { label: 'Trailing Stop', value: bots.some(b => b.trailingStop) ? 'Activo' : 'Inactivo', status: bots.some(b => b.trailingStop) },
            { label: 'Notificaciones', value: settings.notifications ? 'Activas' : 'Inactivas', status: settings.notifications },
          ].map((rule, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--dark)]">
              {rule.status
                ? <Lock size={12} className="text-emerald-400 shrink-0" />
                : <Unlock size={12} className="text-red-400 shrink-0" />
              }
              <div className="flex-1">
                <p className="text-[10px] text-[var(--text-dim)]">{rule.label}</p>
                <p className="text-xs font-bold">{rule.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
