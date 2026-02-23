// Kairos Trade — Dashboard (Premium v2)
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Bot, Link2, BarChart3, Brain,
  DollarSign, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Sparkles, Play, Shield, ChevronRight
} from 'lucide-react';
import useStore from '../../store/useStore';
import marketData from '../../services/marketData';

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
    { label: 'Bots Activos', value: activeBots.length, icon: Bot, color: '#D4AF37', gradient: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.02))', border: 'rgba(212,175,55,0.1)', action: 'bots' },
    { label: 'Brokers', value: `${connectedBrokers.length}/${brokers.length}`, icon: Link2, color: '#A855F7', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.02))', border: 'rgba(168,85,247,0.1)', action: 'brokers' },
    { label: 'Posiciones', value: positions.length, icon: Activity, color: '#00DC82', gradient: 'linear-gradient(135deg, rgba(0,220,130,0.1), rgba(0,220,130,0.02))', border: 'rgba(0,220,130,0.1)', action: 'history' },
    { label: 'P&L Total', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? '#00DC82' : '#FF4757', gradient: totalPnl >= 0 ? 'linear-gradient(135deg, rgba(0,220,130,0.1), rgba(0,220,130,0.02))' : 'linear-gradient(135deg, rgba(255,71,87,0.1), rgba(255,71,87,0.02))', border: totalPnl >= 0 ? 'rgba(0,220,130,0.1)' : 'rgba(255,71,87,0.1)', action: 'history' },
  ];

  const quickActions = [
    { label: 'Trading', icon: BarChart3, page: 'chart', desc: 'Gráficos profesionales', color: '#D4AF37' },
    { label: 'Simulador', icon: Play, page: 'simulator', desc: 'Paper trading sin riesgo', color: '#00DC82' },
    { label: 'Kairos AI', icon: Sparkles, page: 'ai', desc: 'Asistente inteligente', color: '#A855F7' },
    { label: 'Crear Bot', icon: Bot, page: 'bots', desc: 'Automatiza tu trading', color: '#E8C84A' },
    { label: 'Estrategias', icon: Zap, page: 'strategies', desc: 'Crea y gestiona', color: '#EC4899' },
    { label: 'Brokers', icon: Shield, page: 'brokers', desc: 'Conecta tu cuenta', color: '#22D3EE' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            Bienvenido, <span className="text-[var(--gold)]">{user?.name || 'Trader'}</span>
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-0.5">Tu centro de control de trading automatizado</p>
        </div>
        <button
          onClick={() => setPage('chart')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 btn-gold"
        >
          <BarChart3 size={16} />
          Abrir Trading
        </button>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
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
              <p className="text-[22px] font-bold leading-none" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[11px] text-[var(--text-dim)] mt-1.5 font-medium">{stat.label}</p>
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
        <div className="grid grid-cols-3 gap-3">
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
                <p className="text-[13px] font-bold text-[var(--text)]">{action.label}</p>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5">{action.desc}</p>
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
        <div className="grid grid-cols-4 gap-4 px-4 py-2 text-[10px] font-bold text-[var(--text-dim)]/50 uppercase tracking-wider">
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
              onClick={() => { useStore.getState().setSelectedPair(ticker.symbol); setPage('chart'); }}
              className="group w-full grid grid-cols-4 gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
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
                    {ticker.symbol.replace('USDT', '').slice(0, 3)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-bold leading-none">{ticker.symbol.replace('USDT', '')}</p>
                  <p className="text-[10px] text-[var(--text-dim)]/50 mt-0.5">USDT</p>
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
    </div>
  );
}
