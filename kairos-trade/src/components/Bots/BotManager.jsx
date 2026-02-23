// Kairos Trade — Bot Management Panel
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, Play, Pause, Square, Trash2, Settings, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { tradingEngine } from '../../services/tradingEngine';
import { POPULAR_PAIRS, TIMEFRAMES } from '../../constants';

export default function BotManager() {
  const { bots, addBot, updateBot, removeBot, strategies, brokers } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({
    name: '',
    pair: 'BTCUSDT',
    timeframe: '1h',
    strategyId: '',
    brokerId: '',
    balance: '1000',
    riskPercent: '2',
    maxTrades: '10',
  });

  const handleCreate = () => {
    if (!form.name || !form.pair) return;

    const strategy = strategies.find(s => s.id === form.strategyId) || {
      name: 'EMA Cross + RSI',
      entry: {
        condition: 'EMA 20 cruza EMA 50 + RSI < 30',
        indicator: 'ema_cross_rsi',
        params: { fastEma: 20, slowEma: 50, rsiPeriod: 14, rsiOversold: 30 },
      },
      exit: {
        condition: 'RSI > 70',
        indicator: 'rsi',
        params: { rsiOverbought: 70 },
      },
      stopLoss: '2',
      takeProfit: '4',
    };

    addBot({
      name: form.name,
      pair: form.pair,
      timeframe: form.timeframe,
      strategy,
      brokerId: form.brokerId,
      balance: parseFloat(form.balance),
      riskPercent: parseFloat(form.riskPercent),
      maxTrades: parseInt(form.maxTrades),
    });

    setForm({ name: '', pair: 'BTCUSDT', timeframe: '1h', strategyId: '', brokerId: '', balance: '1000', riskPercent: '2', maxTrades: '10' });
    setShowCreate(false);
  };

  const handleStart = async (bot) => {
    updateBot(bot.id, { status: 'active' });
    tradingEngine.startBot(
      { ...bot, status: 'active' },
      (trade) => {
        setLogs(prev => [...prev, { type: 'trade', bot: bot.name, ...trade, time: new Date().toLocaleTimeString() }]);
      },
      (msg) => {
        setLogs(prev => [...prev, { type: 'log', bot: bot.name, message: msg, time: new Date().toLocaleTimeString() }]);
      }
    );
  };

  const handlePause = (bot) => {
    tradingEngine.stopBot(bot.id);
    updateBot(bot.id, { status: 'paused' });
  };

  const handleStop = (bot) => {
    tradingEngine.stopBot(bot.id);
    updateBot(bot.id, { status: 'stopped' });
  };

  const handleDelete = (bot) => {
    tradingEngine.stopBot(bot.id);
    removeBot(bot.id);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--green)';
      case 'paused': return 'var(--gold)';
      case 'error': return 'var(--red)';
      default: return 'var(--text-dim)';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'paused': return 'Pausado';
      case 'stopped': return 'Detenido';
      case 'error': return 'Error';
      default: return status;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Trading Bots</h1>
          <p className="text-sm text-[var(--text-dim)]">
            {bots.filter(b => b.status === 'active').length} activos de {bots.length} total
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black font-bold rounded-xl hover:bg-[var(--gold-light)] transition-colors text-sm"
        >
          <Plus size={16} /> Crear Bot
        </button>
      </div>

      {/* Create bot form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-bold">Nuevo Bot de Trading</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Nombre del Bot</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Mi Bot BTC"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Par</label>
                  <select
                    value={form.pair}
                    onChange={(e) => setForm({ ...form, pair: e.target.value })}
                    className="w-full"
                  >
                    {POPULAR_PAIRS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Timeframe</label>
                  <select
                    value={form.timeframe}
                    onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                    className="w-full"
                  >
                    {TIMEFRAMES.map(tf => (
                      <option key={tf.value} value={tf.value}>{tf.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Balance Asignado ($)</label>
                  <input
                    type="number"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    placeholder="1000"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Riesgo por Trade (%)</label>
                  <input
                    type="number"
                    value={form.riskPercent}
                    onChange={(e) => setForm({ ...form, riskPercent: e.target.value })}
                    placeholder="2"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Máx. Trades por Día</label>
                  <input
                    type="number"
                    value={form.maxTrades}
                    onChange={(e) => setForm({ ...form, maxTrades: e.target.value })}
                    placeholder="10"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Strategy info */}
              <div className="bg-[var(--dark-3)] rounded-xl p-3">
                <p className="text-xs text-[var(--text-dim)] mb-1">Estrategia Predeterminada</p>
                <p className="text-sm font-bold text-[var(--gold)]">EMA Cross + RSI</p>
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Compra: EMA 20 cruza EMA 50 + RSI &lt; 30 | Venta: RSI &gt; 70 | SL: 2% | TP: 4%
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 py-2.5 bg-[var(--gold)] text-black font-bold rounded-xl text-sm hover:bg-[var(--gold-light)] transition-colors"
                >
                  Crear Bot
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 bg-[var(--dark-3)] text-[var(--text-dim)] rounded-xl text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot list */}
      {bots.length === 0 ? (
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Bot size={48} className="text-[var(--text-dim)] mx-auto mb-4" />
          <p className="text-[var(--text-dim)]">No hay bots creados</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">Crea tu primer bot para automatizar tu trading</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map(bot => (
            <motion.div
              key={bot.id}
              layout
              className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--dark-3)] flex items-center justify-center">
                    <Bot size={20} style={{ color: getStatusColor(bot.status) }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{bot.name}</p>
                    <p className="text-xs text-[var(--text-dim)]">{bot.pair} • {bot.timeframe}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ color: getStatusColor(bot.status), background: `${getStatusColor(bot.status)}20` }}
                  >
                    {getStatusLabel(bot.status)}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="bg-[var(--dark-3)] rounded-lg p-2 text-center">
                  <p className="text-xs text-[var(--text-dim)]">Trades</p>
                  <p className="text-sm font-bold">{bot.trades || 0}</p>
                </div>
                <div className="bg-[var(--dark-3)] rounded-lg p-2 text-center">
                  <p className="text-xs text-[var(--text-dim)]">P&L</p>
                  <p className={`text-sm font-bold ${(bot.pnl || 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {(bot.pnl || 0) >= 0 ? '+' : ''}${(bot.pnl || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[var(--dark-3)] rounded-lg p-2 text-center">
                  <p className="text-xs text-[var(--text-dim)]">Win Rate</p>
                  <p className="text-sm font-bold">{(bot.winRate || 0).toFixed(0)}%</p>
                </div>
                <div className="bg-[var(--dark-3)] rounded-lg p-2 text-center">
                  <p className="text-xs text-[var(--text-dim)]">Balance</p>
                  <p className="text-sm font-bold">${bot.balance?.toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {bot.status !== 'active' ? (
                  <button
                    onClick={() => handleStart(bot)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[var(--green)]/20 text-[var(--green)] rounded-lg text-xs font-bold hover:bg-[var(--green)]/30 transition-colors"
                  >
                    <Play size={12} /> Iniciar
                  </button>
                ) : (
                  <button
                    onClick={() => handlePause(bot)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[var(--gold)]/20 text-[var(--gold)] rounded-lg text-xs font-bold hover:bg-[var(--gold)]/30 transition-colors"
                  >
                    <Pause size={12} /> Pausar
                  </button>
                )}
                <button
                  onClick={() => handleStop(bot)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--dark-3)] text-[var(--text-dim)] rounded-lg text-xs hover:bg-[var(--dark-4)] transition-colors"
                >
                  <Square size={12} /> Detener
                </button>
                <button
                  onClick={() => handleDelete(bot)}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 text-[var(--text-dim)] hover:text-[var(--red)] rounded-lg text-xs transition-colors"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Live logs */}
      {logs.length > 0 && (
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-bold">Actividad en Vivo</h3>
            <button onClick={() => setLogs([])} className="text-xs text-[var(--text-dim)]">Limpiar</button>
          </div>
          <div className="max-h-48 overflow-y-auto p-3 space-y-1 font-mono text-xs">
            {logs.slice(-50).reverse().map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[var(--text-dim)] shrink-0">{log.time}</span>
                <span className="text-[var(--gold)] shrink-0">[{log.bot}]</span>
                <span className="text-[var(--text)]">{log.message || `${log.side?.toUpperCase()} ${log.quantity} @ $${log.price}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
