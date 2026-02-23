// Kairos Trade — Dashboard
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Bot, Link2, BarChart3, Brain,
  DollarSign, Activity, Zap, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import useStore from '../../store/useStore';
import marketData from '../../services/marketData';
import { POPULAR_PAIRS } from '../../constants';

export default function Dashboard() {
  const { setPage, bots, brokers, tradeHistory, positions } = useStore();
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
          try {
            const ticker = await marketData.get24hrTicker(pair);
            return ticker;
          } catch { return null; }
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
    { label: 'Bots Activos', value: activeBots.length, icon: Bot, color: 'var(--gold)', action: 'bots' },
    { label: 'Brokers', value: `${connectedBrokers.length}/${brokers.length}`, icon: Link2, color: 'var(--blue)', action: 'brokers' },
    { label: 'Posiciones', value: positions.length, icon: Activity, color: 'var(--green)', action: 'history' },
    { label: 'P&L Total', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)', action: 'history' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-[var(--gold)]">Kairos</span> <span className="text-[var(--text)]">Trade</span>
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-0.5">Tu centro de control de trading automatizado</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.button
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setPage(stat.action)}
              className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 text-left hover:border-[var(--gold)]/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={20} style={{ color: stat.color }} />
                <ArrowUpRight size={14} className="text-[var(--text-dim)]" />
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">{stat.label}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Abrir Gráfico', icon: BarChart3, page: 'chart', desc: 'Trading chart profesional' },
          { label: 'Crear Bot', icon: Bot, page: 'bots', desc: 'Automatiza tu trading' },
          { label: 'Kairos AI', icon: Brain, page: 'ai', desc: 'Asistente inteligente' },
          { label: 'Conectar Broker', icon: Link2, page: 'brokers', desc: 'Vincula tu cuenta' },
          { label: 'Estrategias', icon: Zap, page: 'strategies', desc: 'Crea y gestiona' },
          { label: 'Historial', icon: Activity, page: 'history', desc: 'Trades y rendimiento' },
        ].map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              onClick={() => setPage(action.page)}
              className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 text-left hover:border-[var(--gold)]/20 transition-all group"
            >
              <Icon size={24} className="text-[var(--gold)] mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold">{action.label}</p>
              <p className="text-xs text-[var(--text-dim)]">{action.desc}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Market Overview */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold">Mercado en Tiempo Real</h2>
          <button onClick={() => setPage('chart')} className="text-xs text-[var(--gold)] hover:underline">
            Ver gráfico →
          </button>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--text-dim)] animate-pulse">Cargando mercado...</div>
          ) : marketOverview.map(ticker => (
            <button
              key={ticker.symbol}
              onClick={() => { useStore.getState().setSelectedPair(ticker.symbol); setPage('chart'); }}
              className="w-full flex items-center justify-between p-3 hover:bg-[var(--dark-3)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--dark-4)] flex items-center justify-center text-xs font-bold">
                  {ticker.symbol.replace('USDT', '').slice(0, 3)}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{ticker.symbol.replace('USDT', '')}</p>
                  <p className="text-xs text-[var(--text-dim)]">{ticker.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono">${ticker.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className={`text-xs font-mono flex items-center gap-0.5 justify-end ${ticker.changePercent >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {ticker.changePercent >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
