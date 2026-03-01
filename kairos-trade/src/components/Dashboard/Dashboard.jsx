// Kairos Trade — Dashboard (Premium v3.1 — i18n + Analytics)
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Bot, Link2, BarChart3, Brain,
  DollarSign, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Sparkles, Play, Shield, ChevronRight, Gift, Copy, Check, Share2, Users,
  Clock, Target, AlertTriangle, Award, Percent, Flame, Eye
} from 'lucide-react';
import useStore from '../../store/useStore';
import marketData from '../../services/marketData';
import { tradingEngine } from '../../services/tradingEngine';
import { feeService } from '../../services/feeService';
import { isAdmin } from '../../constants';
import { toDisplayPair, getBase, formatPair } from '../../utils/pairUtils';
import useTranslation from '../../hooks/useTranslation';

// ─── Safe render helper — prevents Error #310 (objects as React children) ───
function safe(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
  if (React.isValidElement(val)) return val;
  if (Array.isArray(val)) return val;
  if (import.meta.env.DEV) console.error('[SAFE] Object caught as React child:', JSON.stringify(val).slice(0, 200));
  return String(val);
}

// ─── Mini sparkline (canvas) ───
function MiniSparkline({ data, color = '#D4AF37', height = 48, width = 140 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 4;
    const cW = width - pad * 2;
    const cH = height - pad * 2;
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, pad, 0, height - pad);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, color + '00');
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad + (i / (data.length - 1)) * cW;
      const y = pad + (1 - (v - min) / range) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad + cW, height - pad);
    ctx.lineTo(pad, height - pad);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    // Line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad + (i / (data.length - 1)) * cW;
      const y = pad + (1 - (v - min) / range) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Last dot
    const lastX = pad + cW;
    const lastY = pad + (1 - (data[data.length - 1] - min) / range) * cH;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [data, color, width, height]);
  return <canvas ref={canvasRef} style={{ width, height }} />;
}

// ─── Time ago helper ───
function timeSince(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function Dashboard() {
  const { setPage, bots, brokers, tradeHistory, positions, user } = useStore();
  const [marketOverview, setMarketOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveBotData, setLiveBotData] = useState({});
  const { t } = useTranslation();

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh live bot data every 2s
  useEffect(() => {
    const tick = () => {
      const data = {};
      tradingEngine.activeBots.forEach((val, key) => {
        data[key] = tradingEngine.liveData.get(key) || {};
      });
      setLiveBotData(data);
    };
    tick();
    const iv = setInterval(tick, 2000);
    return () => clearInterval(iv);
  }, [bots]);

  const loadMarketData = async () => {
    try {
      const topPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];
      const data = await Promise.all(
        topPairs.map(async (pair) => {
          try { return await marketData.get24hrTicker(pair); }
          catch { return null; }
        })
      );
      setMarketOverview(data.filter(Boolean));
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  };

  const activeBots = bots.filter(b => b.status === 'active');
  const totalPnl = tradeHistory.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const connectedBrokers = brokers.filter(b => b.connected);

  const stats = [
    { label: t('dashboard.activeBots'), value: activeBots.length, icon: Bot, color: '#3B82F6', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.02))', border: 'rgba(59,130,246,0.1)', action: 'bots' },
    { label: t('dashboard.brokers'), value: `${connectedBrokers.length}/${brokers.length}`, icon: Link2, color: '#A855F7', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.02))', border: 'rgba(168,85,247,0.1)', action: 'brokers' },
    { label: t('dashboard.positions'), value: positions.length, icon: Activity, color: '#00DC82', gradient: 'linear-gradient(135deg, rgba(0,220,130,0.1), rgba(0,220,130,0.02))', border: 'rgba(0,220,130,0.1)', action: 'history' },
    { label: t('dashboard.totalPnl'), value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? '#00DC82' : '#FF4757', gradient: totalPnl >= 0 ? 'linear-gradient(135deg, rgba(0,220,130,0.1), rgba(0,220,130,0.02))' : 'linear-gradient(135deg, rgba(255,71,87,0.1), rgba(255,71,87,0.02))', border: totalPnl >= 0 ? 'rgba(0,220,130,0.1)' : 'rgba(255,71,87,0.1)', action: 'history' },
  ];

  const quickActions = [
    { label: t('dashboard.trading'), icon: BarChart3, page: 'chart', desc: t('dashboard.tradingDesc'), color: '#3B82F6' },
    { label: t('dashboard.simulator'), icon: Play, page: 'simulator', desc: t('dashboard.simulatorDesc'), color: '#00DC82' },
    { label: t('dashboard.kairosAi'), icon: Sparkles, page: 'ai', desc: t('dashboard.kairosAiDesc'), color: '#A855F7' },
    { label: t('dashboard.createBot'), icon: Bot, page: 'bots', desc: t('dashboard.createBotDesc'), color: '#60A5FA' },
    { label: t('dashboard.strategies'), icon: Zap, page: 'strategies', desc: t('dashboard.strategiesDesc'), color: '#EC4899' },
    { label: t('dashboard.brokersAction'), icon: Shield, page: 'brokers', desc: t('dashboard.brokersActionDesc'), color: '#22D3EE' },
  ];

  // ─── Portfolio analytics (computed from tradeHistory) ───
  const portfolio = useMemo(() => {
    const trades = tradeHistory || [];
    if (trades.length === 0) return null;
    const wins = trades.filter(t => (t.pnl || 0) > 0);
    const losses = trades.filter(t => (t.pnl || 0) < 0);
    const winRate = (wins.length / trades.length) * 100;
    const totalWin = wins.reduce((s, t) => s + t.pnl, 0);
    const totalLoss = losses.reduce((s, t) => s + Math.abs(t.pnl), 0);
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;
    // Equity curve
    let equity = 0, peak = 0, maxDD = 0;
    const equityCurve = [];
    trades.forEach(t => {
      equity += (t.pnl || 0);
      equityCurve.push(equity);
      peak = Math.max(peak, equity);
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      maxDD = Math.max(maxDD, dd);
    });
    // Today's P&L
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayPnl = trades
      .filter(t => new Date(t.closedAt || t.time).getTime() >= todayStart)
      .reduce((s, t) => s + (t.pnl || 0), 0);
    // This week
    const weekStart = Date.now() - 7 * 86400000;
    const weekPnl = trades
      .filter(t => new Date(t.closedAt || t.time).getTime() >= weekStart)
      .reduce((s, t) => s + (t.pnl || 0), 0);
    return { winRate, profitFactor, maxDD, equityCurve, todayPnl, weekPnl, totalPnl, totalTrades: trades.length };
  }, [tradeHistory, totalPnl]);

  // Active bots list
  const activeBotsList = useMemo(() => bots.filter(b => b.status === 'active'), [bots]);

  // Recent activity (last 8 events)
  const recentActivity = useMemo(() => {
    const events = [];
    (tradeHistory || []).slice(-6).forEach(t => {
      events.push({
        type: 'trade',
        icon: t.pnl >= 0 ? TrendingUp : TrendingDown,
        color: t.pnl >= 0 ? '#10B981' : '#EF4444',
        text: `${t.side?.toUpperCase() || 'TRADE'} ${t.symbol || t.pair || '—'} → ${t.pnl >= 0 ? '+' : ''}$${(t.pnl || 0).toFixed(2)}`,
        time: t.closedAt || t.time,
      });
    });
    bots.filter(b => b.status === 'active').forEach(b => {
      events.push({
        type: 'bot',
        icon: Bot,
        color: '#3B82F6',
        text: `${b.name} running on ${b.pair}`,
        time: b.startedAt || b.createdAt,
      });
    });
    return events.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 8);
  }, [tradeHistory, bots]);

  // Admin treasury stats
  const treasuryStats = useMemo(() => {
    if (!isAdmin(user)) return null;
    try { return feeService.getStats(); } catch { return null; }
  }, [user]);

  return (
    <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 md:py-5 space-y-4 md:space-y-5" style={{ maxWidth: '100%' }}>
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <h1 className="text-[18px] md:text-[22px] font-bold tracking-tight truncate">
            Bienvenido, <span className="text-[var(--gold)]">{safe(user?.name) || 'Trader'}</span>
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-0.5 hidden sm:block">Tu centro de control de trading automatizado</p>
        </div>
        <button
          onClick={() => setPage('chart')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 btn-gold shrink-0"
        >
          <BarChart3 size={14} />
          Trading
        </button>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.button
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setPage(stat.action)}
              className="rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] group"
              style={{
                background: stat.gradient,
                border: `1px solid ${stat.border}`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${stat.color}15` }}>
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
                <ChevronRight size={14} className="text-[var(--text-dim)]/30 group-hover:text-[var(--text-dim)] transition-colors" />
              </div>
              <p className="text-[22px] font-bold leading-none truncate" style={{ color: stat.color }}>{safe(stat.value)}</p>
              <p className="text-[11px] text-[var(--text-dim)] mt-1.5 font-medium truncate">{safe(stat.label)}</p>
            </motion.button>
          );
        })}
      </div>

      {/* ═══ Portfolio Performance Widget ═══ */}
      {portfolio && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
            border: '1px solid rgba(30,34,45,0.5)',
          }}
        >
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(30,34,45,0.5)' }}>
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[var(--gold)]" />
              <h2 className="text-sm font-bold">Portfolio Performance</h2>
            </div>
            <button onClick={() => setPage('portfolio')} className="text-[11px] text-[var(--gold)] hover:text-[var(--gold-light)] font-semibold flex items-center gap-1 transition-colors">
              Analytics completos <ChevronRight size={12} />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
            {/* Mini chart */}
            <div className="flex items-center gap-4">
              <MiniSparkline
                data={portfolio.equityCurve}
                color={totalPnl >= 0 ? '#10B981' : '#EF4444'}
                width={180}
                height={56}
              />
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">Hoy</p>
                  <p className={`text-sm font-bold ${portfolio.todayPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {portfolio.todayPnl >= 0 ? '+' : ''}${portfolio.todayPnl.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">7 Días</p>
                  <p className={`text-sm font-bold ${portfolio.weekPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {portfolio.weekPnl >= 0 ? '+' : ''}${portfolio.weekPnl.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">Total</p>
                  <p className={`text-sm font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            {/* Quick KPIs */}
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Win Rate', value: `${portfolio.winRate.toFixed(0)}%`, color: portfolio.winRate >= 50 ? '#10B981' : '#EF4444', icon: Target },
                { label: 'Profit Factor', value: portfolio.profitFactor === Infinity ? '∞' : portfolio.profitFactor.toFixed(1), color: portfolio.profitFactor >= 1 ? '#10B981' : '#EF4444', icon: Award },
                { label: 'Max DD', value: `${portfolio.maxDD.toFixed(1)}%`, color: portfolio.maxDD < 15 ? '#10B981' : '#EF4444', icon: AlertTriangle },
              ].map((kpi, i) => {
                const I = kpi.icon;
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}15` }}>
                    <I size={13} style={{ color: kpi.color }} />
                    <div>
                      <p className="text-[9px] text-[var(--text-dim)] uppercase font-semibold">{safe(kpi.label)}</p>
                      <p className="text-sm font-bold" style={{ color: kpi.color }}>{safe(kpi.value)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ Active Bots Live ═══ */}
      {activeBotsList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <Bot size={14} className="text-blue-400" />
              Bots Activos
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                {activeBotsList.length} {safe(t('dashboard.running'))}
              </span>
            </h2>
            <button onClick={() => setPage('bots')} className="text-[11px] text-[var(--gold)] hover:text-[var(--gold-light)] font-semibold flex items-center gap-1 transition-colors">
              {safe(t('dashboard.viewAll'))} <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeBotsList.slice(0, 6).map(bot => {
              const live = liveBotData[bot.id] || {};
              const pnl = live.unrealizedPnl || 0;
              const pnlPct = live.pnlPercent || 0;
              const pos = live.position;
              return (
                <div
                  key={bot.id}
                  onClick={() => setPage('bots')}
                  className="rounded-xl p-3.5 cursor-pointer transition-all hover:scale-[1.01] group"
                  style={{
                    background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
                    border: `1px solid ${pnl >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold truncate max-w-[120px]">{safe(bot.name)}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-dim)]">{safe(bot.pair)}</span>
                  </div>
                  {pos ? (
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pos.side === 'buy' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {pos.side?.toUpperCase()} @ ${pos.entryPrice?.toFixed(2)}
                      </span>
                      <span className={`text-sm font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        <span className="text-[10px] ml-1">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-dim)]">Esperando señal...</span>
                      <Eye size={12} className="text-[var(--text-dim)]" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-dim)]">
                    <span>Trades: {bot.trades || 0}</span>
                    <span>WR: {(bot.winRate || 0).toFixed(0)}%</span>
                    {live.price && <span className="ml-auto font-mono">${live.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ Activity Feed + Admin Revenue (side by side on large screens) ═══ */}
      <div className={`grid gap-4 ${treasuryStats ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Activity Feed */}
        {recentActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
              border: '1px solid rgba(30,34,45,0.5)',
            }}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(30,34,45,0.5)' }}>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--gold)]" />
                <h2 className="text-sm font-bold">Actividad Reciente</h2>
              </div>
              <button onClick={() => setPage('history')} className="text-[11px] text-[var(--gold)] hover:text-[var(--gold-light)] font-semibold flex items-center gap-1 transition-colors">
                Ver historial <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-[var(--border)]/30">
              {recentActivity.map((evt, i) => {
                const I = evt.icon;
                const when = evt.time ? new Date(evt.time) : null;
                const ago = when ? timeSince(when) : '';
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.01] transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${evt.color}12` }}>
                      <I size={13} style={{ color: evt.color }} />
                    </div>
                    <p className="flex-1 text-xs truncate">{safe(evt.text)}</p>
                    <span className="text-[10px] text-[var(--text-dim)] shrink-0">{safe(ago)}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Admin Revenue Panel */}
        {treasuryStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.04), rgba(212,175,55,0.01))',
              border: '1px solid rgba(212,175,55,0.12)',
            }}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-amber-400" />
                <h2 className="text-sm font-bold">Platform Revenue</h2>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">ADMIN</span>
              </div>
              <button onClick={() => setPage('kairos-treasury')} className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors">
                Treasury <ChevronRight size={12} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.1)' }}>
                <p className="text-[10px] text-[var(--text-dim)] uppercase font-semibold mb-1">Total Recaudado</p>
                <p className="text-lg font-bold text-emerald-400">${safe(treasuryStats.totalCollected.toFixed(2))}</p>
                <p className="text-[10px] text-[var(--text-dim)]">{safe(treasuryStats.totalTrades)} trades</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                <p className="text-[10px] text-[var(--text-dim)] uppercase font-semibold mb-1">Hoy</p>
                <p className="text-lg font-bold text-blue-400">${safe(treasuryStats.today.fees.toFixed(2))}</p>
                <p className="text-[10px] text-[var(--text-dim)]">{safe(treasuryStats.today.trades)} trades • ${safe(treasuryStats.today.volume.toLocaleString())} vol</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.1)' }}>
                <p className="text-[10px] text-[var(--text-dim)] uppercase font-semibold mb-1">7 Días</p>
                <p className="text-lg font-bold text-purple-400">${safe(treasuryStats.last7days.fees.toFixed(2))}</p>
                <p className="text-[10px] text-[var(--text-dim)]">{safe(treasuryStats.last7days.trades)} trades</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.1)' }}>
                <p className="text-[10px] text-[var(--text-dim)] uppercase font-semibold mb-1">30 Días</p>
                <p className="text-lg font-bold text-amber-400">${safe(treasuryStats.last30days.fees.toFixed(2))}</p>
                <p className="text-[10px] text-[var(--text-dim)]">${safe(treasuryStats.last30days.volume.toLocaleString())} volumen</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-bold text-[var(--text)] mb-3 flex items-center gap-2">
          <Zap size={14} className="text-[var(--gold)]" />
          Acceso Rápido
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                onClick={() => setPage(action.page)}
                className="rounded-xl p-4 text-left transition-all duration-200 group hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
                  border: '1px solid rgba(30,34,45,0.5)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${action.color}30`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(30,34,45,0.5)'}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                  style={{ background: `${action.color}12` }}>
                  <Icon size={20} style={{ color: action.color }} />
                </div>
                <p className="text-[13px] font-bold text-[var(--text)] truncate">{safe(action.label)}</p>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5 truncate">{safe(action.desc)}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Market Overview */}
      <div className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
          border: '1px solid rgba(30,34,45,0.5)',
        }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(30,34,45,0.5)' }}>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[var(--gold)]" />
            <h2 className="text-sm font-bold">{safe(t('dashboard.realtimeMarket'))}</h2>
          </div>
          <button onClick={() => setPage('chart')} className="text-[11px] text-[var(--gold)] hover:text-[var(--gold-light)] font-semibold flex items-center gap-1 transition-colors">
            {safe(t('dashboard.viewChart'))} <ChevronRight size={12} />
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 px-3 md:px-4 py-2 text-[10px] font-bold text-[var(--text-dim)]/50 uppercase tracking-wider">
          <span>{safe(t('dashboard.pair'))}</span>
          <span className="text-right">{safe(t('dashboard.price'))}</span>
          <span className="text-right">{safe(t('dashboard.change24h'))}</span>
          <span className="text-right hidden md:block">{safe(t('dashboard.action'))}</span>
        </div>

        <div className="divide-y divide-[var(--border)]/30">
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--text-dim)] animate-pulse">{safe(t('dashboard.loadingMarket'))}</div>
          ) : marketOverview.map((ticker, i) => (
            <motion.button
              key={ticker.symbol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { useStore.getState().setSelectedPair(toDisplayPair(ticker.symbol)); setPage('chart'); }}
              className="group w-full grid grid-cols-3 md:grid-cols-4 gap-2 items-center px-3 md:px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              {/* Pair */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: ticker.changePercent >= 0
                      ? 'rgba(14,203,129,0.08)'
                      : 'rgba(246,70,93,0.08)',
                  }}>
                  <span className={ticker.changePercent >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                    {getBase(ticker.symbol).slice(0, 3)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-bold leading-none">{safe(getBase(ticker.symbol))}</p>
                  <p className="text-[10px] text-[var(--text-dim)]/50 mt-0.5">KAIROS</p>
                </div>
              </div>

              {/* Price */}
              <p className="text-[13px] font-mono font-semibold text-right">${ticker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>

              {/* Change */}
              <div className="flex items-center gap-1 justify-end">
                <span className={`flex items-center gap-0.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-md
                  ${ticker.changePercent >= 0 ? 'text-[var(--green)] bg-[var(--green)]/[0.08]' : 'text-[var(--red)] bg-[var(--red)]/[0.08]'}`}>
                  {ticker.changePercent >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                </span>
              </div>

              {/* Action */}
              <div className="text-right hidden md:block">
                <span className="text-[10px] font-semibold text-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--gold)]/10 px-2 py-1 rounded-md">
                  {safe(t('dashboard.trade'))} →
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Referral Card — Invite & Earn */}
      {user?.referralCode && <ReferralCard code={user.referralCode} />}
    </div>
  );
}

/* ─── Referral Sharing Card ─── */
function ReferralCard({ code }) {
  const [copied, setCopied] = useState(false);

  const link = `https://kairos-trade.netlify.app?ref=${code}`;

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const handleShare = useCallback((platform) => {
    const msg = encodeURIComponent(`Únete a Kairos 777 — trading automatizado con 10+ brokers y bots AI. Usa mi código ${code} y recibe 100 KAIROS gratis: ${link}`);
    const urls = {
      whatsapp: `https://wa.me/?text=${msg}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msg}`,
      twitter: `https://twitter.com/intent/tweet?text=${msg}`,
    };
    window.open(urls[platform], '_blank');
  }, [code, link]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(245,158,11,0.01))',
        border: '1px solid rgba(245,158,11,0.12)',
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <Gift size={16} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Invita y Gana</h3>
            <p className="text-[10px] text-[var(--text-dim)]">20 KAIROS por cada amigo</p>
          </div>
        </div>

        {/* Code + Copy */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 rounded-lg px-3 py-2 font-mono text-sm font-bold text-amber-400 tracking-wider"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}>
            {code}
          </div>
          <button onClick={() => handleCopy(code)}
            className="px-3 py-2 rounded-lg transition-all hover:scale-105"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-amber-400/60" />}
          </button>
        </div>

        {/* Link */}
        <button onClick={() => handleCopy(link)}
          className="w-full text-left rounded-lg px-3 py-2 text-[11px] text-[var(--text-dim)] truncate hover:text-white/50 transition-colors mb-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          {link}
        </button>

        {/* Share buttons */}
        <div className="flex gap-2">
          {[
            { id: 'whatsapp', label: 'WhatsApp', bg: '#25D366' },
            { id: 'telegram', label: 'Telegram', bg: '#0088cc' },
            { id: 'twitter', label: 'X', bg: '#1DA1F2' },
          ].map(p => (
            <button key={p.id} onClick={() => handleShare(p.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white transition-all hover:scale-[1.02]"
              style={{ background: `${p.bg}10`, border: `1px solid ${p.bg}20` }}>
              <Share2 size={10} />
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
