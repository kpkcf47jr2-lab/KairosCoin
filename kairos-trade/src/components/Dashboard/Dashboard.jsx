// Kairos Trade — Dashboard (Premium v2.1 — Growth)
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Bot, Link2, BarChart3, Brain,
  DollarSign, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Sparkles, Play, Shield, ChevronRight, Gift, Copy, Check, Share2, Users
} from 'lucide-react';
import useStore from '../../store/useStore';
import marketData from '../../services/marketData';
import { toDisplayPair, getBase, formatPair } from '../../utils/pairUtils';

export default function Dashboard() {
  const { setPage, bots, brokers, tradeHistory, positions, user } = useStore();
  const [marketOverview, setMarketOverview] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

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
    { label: 'Bots Activos', value: activeBots.length, icon: Bot, color: '#3B82F6', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.02))', border: 'rgba(59,130,246,0.1)', action: 'bots' },
    { label: 'Brokers', value: `${connectedBrokers.length}/${brokers.length}`, icon: Link2, color: '#A855F7', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.02))', border: 'rgba(168,85,247,0.1)', action: 'brokers' },
    { label: 'Posiciones', value: positions.length, icon: Activity, color: '#00DC82', gradient: 'linear-gradient(135deg, rgba(0,220,130,0.1), rgba(0,220,130,0.02))', border: 'rgba(0,220,130,0.1)', action: 'history' },
    { label: 'P&L Total', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? '#00DC82' : '#FF4757', gradient: totalPnl >= 0 ? 'linear-gradient(135deg, rgba(0,220,130,0.1), rgba(0,220,130,0.02))' : 'linear-gradient(135deg, rgba(255,71,87,0.1), rgba(255,71,87,0.02))', border: totalPnl >= 0 ? 'rgba(0,220,130,0.1)' : 'rgba(255,71,87,0.1)', action: 'history' },
  ];

  const quickActions = [
    { label: 'Trading', icon: BarChart3, page: 'chart', desc: 'Gráficos profesionales', color: '#3B82F6' },
    { label: 'Simulador', icon: Play, page: 'simulator', desc: 'Paper trading sin riesgo', color: '#00DC82' },
    { label: 'Kairos AI', icon: Sparkles, page: 'ai', desc: 'Asistente inteligente', color: '#A855F7' },
    { label: 'Crear Bot', icon: Bot, page: 'bots', desc: 'Automatiza tu trading', color: '#60A5FA' },
    { label: 'Estrategias', icon: Zap, page: 'strategies', desc: 'Crea y gestiona', color: '#EC4899' },
    { label: 'Brokers', icon: Shield, page: 'brokers', desc: 'Conecta tu cuenta', color: '#22D3EE' },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ maxWidth: '100%' }}>
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight truncate">
            Bienvenido, <span className="text-[var(--gold)]">{user?.name || 'Trader'}</span>
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-0.5">Tu centro de control de trading automatizado</p>
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
              <p className="text-[22px] font-bold leading-none truncate" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[11px] text-[var(--text-dim)] mt-1.5 font-medium truncate">{stat.label}</p>
            </motion.button>
          );
        })}
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
                <p className="text-[13px] font-bold text-[var(--text)] truncate">{action.label}</p>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5 truncate">{action.desc}</p>
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
            <h2 className="text-sm font-bold">Mercado en Tiempo Real</h2>
          </div>
          <button onClick={() => setPage('chart')} className="text-[11px] text-[var(--gold)] hover:text-[var(--gold-light)] font-semibold flex items-center gap-1 transition-colors">
            Ver gráfico <ChevronRight size={12} />
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[10px] font-bold text-[var(--text-dim)]/50 uppercase tracking-wider">
          <span>Par</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Cambio 24h</span>
          <span className="text-right">Acción</span>
        </div>

        <div className="divide-y divide-[var(--border)]/30">
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--text-dim)] animate-pulse">Cargando mercado...</div>
          ) : marketOverview.map((ticker, i) => (
            <motion.button
              key={ticker.symbol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { useStore.getState().setSelectedPair(toDisplayPair(ticker.symbol)); setPage('chart'); }}
              className="group w-full grid grid-cols-4 gap-2 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
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
                  <p className="text-[13px] font-bold leading-none">{getBase(ticker.symbol)}</p>
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
              <div className="text-right">
                <span className="text-[10px] font-semibold text-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--gold)]/10 px-2 py-1 rounded-md">
                  Trading →
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
    const msg = encodeURIComponent(`Únete a Kairos Trade — trading automatizado con 10+ brokers y bots AI. Usa mi código ${code} y recibe 100 KAIROS gratis: ${link}`);
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
