// Kairos Trade — Bot Management Panel (Elite v3)
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, Play, Pause, Square, Trash2, Settings, TrendingUp, TrendingDown, AlertCircle, Grid3x3, DollarSign, Zap, Code2, Edit3 } from 'lucide-react';
import useStore from '../../store/useStore';
import { tradingEngine } from '../../services/tradingEngine';
import gridBotEngine from '../../services/gridBot';
import dcaBotEngine from '../../services/dcaBot';
import { POPULAR_PAIRS, TIMEFRAMES } from '../../constants';
import StrategyEditor from './StrategyEditor';

const BOT_TYPES = [
  { id: 'signal', label: 'Signal Bot', icon: Zap, desc: 'Indicadores técnicos predefinidos', color: '#3B82F6' },
  { id: 'script', label: 'Script Bot', icon: Code2, desc: 'Estrategia personalizada con código', color: '#A855F7' },
  { id: 'grid', label: 'Grid Bot', icon: Grid3x3, desc: 'Compra y vende en niveles de precio', color: '#00DC82' },
  { id: 'dca', label: 'DCA Bot', icon: DollarSign, desc: 'Inversión a intervalos regulares', color: '#22D3EE' },
];

export default function BotManager() {
  const { bots, addBot, updateBot, removeBot, strategies, addStrategy, brokers } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showStrategyEditor, setShowStrategyEditor] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [botType, setBotType] = useState('signal');
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({
    name: '', pair: 'BTCUSDT', timeframe: '1h', strategyId: '', brokerId: '',
    balance: '1000', riskPercent: '2', maxTrades: '10',
    // Grid bot fields
    upperPrice: '', lowerPrice: '', gridLines: '10',
    // DCA bot fields
    investmentPerOrder: '100', intervalMinutes: '60', maxOrders: '50',
    useRsiFilter: false, rsiThreshold: '40', usePriceDipFilter: false, dipPercent: '3',
    // Script bot fields
    scriptCode: '', scriptStrategyId: '',
  });

  const handleCreate = () => {
    if (!form.name || !form.pair) return;

    const botData = {
      name: form.name,
      pair: form.pair,
      botType,
      brokerId: form.brokerId,
    };

    if (botType === 'signal') {
      const strategy = strategies.find(s => s.id === form.strategyId) || {
        name: 'EMA Cross + RSI',
        entry: { condition: 'EMA 20 cruza EMA 50 + RSI < 30', indicator: 'ema_cross_rsi', params: { fastEma: 20, slowEma: 50, rsiPeriod: 14, rsiOversold: 30 } },
        exit: { condition: 'RSI > 70', indicator: 'rsi', params: { rsiOverbought: 70 } },
        stopLoss: '2', takeProfit: '4',
      };
      Object.assign(botData, {
        timeframe: form.timeframe, strategy,
        balance: parseFloat(form.balance), riskPercent: parseFloat(form.riskPercent),
        maxTrades: parseInt(form.maxTrades),
      });
    } else if (botType === 'script') {
      // Custom script bot — uses Kairos Script engine
      const customStrategy = strategies.find(s => s.id === form.scriptStrategyId);
      if (!customStrategy?.code) return; // Need a saved strategy with code
      Object.assign(botData, {
        timeframe: form.timeframe,
        strategy: { type: 'custom_script', code: customStrategy.code, name: customStrategy.name },
        balance: parseFloat(form.balance), riskPercent: parseFloat(form.riskPercent),
        maxTrades: parseInt(form.maxTrades),
        scriptName: customStrategy.name,
      });
    } else if (botType === 'grid') {
      Object.assign(botData, {
        upperPrice: parseFloat(form.upperPrice), lowerPrice: parseFloat(form.lowerPrice),
        gridLines: parseInt(form.gridLines), balance: parseFloat(form.balance),
      });
    } else if (botType === 'dca') {
      Object.assign(botData, {
        investmentPerOrder: parseFloat(form.investmentPerOrder),
        intervalMinutes: parseInt(form.intervalMinutes), maxOrders: parseInt(form.maxOrders),
        useRsiFilter: form.useRsiFilter, rsiThreshold: parseInt(form.rsiThreshold),
        usePriceDipFilter: form.usePriceDipFilter, dipPercent: parseFloat(form.dipPercent),
        balance: parseFloat(form.investmentPerOrder) * parseInt(form.maxOrders),
      });
    }

    addBot(botData);
    setShowCreate(false);
  };

  const addLog = (bot, msg) => {
    setLogs(prev => [...prev.slice(-100), { type: 'log', bot: bot.name, message: msg, time: new Date().toLocaleTimeString() }]);
  };

  const addTrade = (bot, trade) => {
    setLogs(prev => [...prev.slice(-100), { type: 'trade', bot: bot.name, ...trade, time: new Date().toLocaleTimeString() }]);
    // Update bot stats
    const current = useStore.getState().bots.find(b => b.id === bot.id);
    if (current) {
      const trades = (current.trades || 0) + 1;
      const pnl = (current.pnl || 0) + (trade.profit || 0);
      updateBot(bot.id, { trades, pnl });
    }
  };

  const handleStart = async (bot) => {
    updateBot(bot.id, { status: 'active' });
    const type = bot.botType || 'signal';

    if (type === 'signal' || type === 'script') {
      tradingEngine.startBot(
        { ...bot, status: 'active' },
        (trade) => addTrade(bot, trade),
        (msg) => addLog(bot, msg),
      );
    } else if (type === 'grid') {
      gridBotEngine.start({
        id: bot.id, pair: bot.pair,
        upperPrice: bot.upperPrice, lowerPrice: bot.lowerPrice,
        gridLines: bot.gridLines, investment: bot.balance,
        onLog: (msg) => addLog(bot, msg),
        onTrade: (trade) => addTrade(bot, trade),
      });
    } else if (type === 'dca') {
      dcaBotEngine.start({
        id: bot.id, pair: bot.pair,
        investmentPerOrder: bot.investmentPerOrder,
        intervalMinutes: bot.intervalMinutes, maxOrders: bot.maxOrders,
        useRsiFilter: bot.useRsiFilter, rsiThreshold: bot.rsiThreshold,
        usePriceDipFilter: bot.usePriceDipFilter, dipPercent: bot.dipPercent,
        onLog: (msg) => addLog(bot, msg),
        onTrade: (trade) => addTrade(bot, trade),
      });
    }
  };

  const handleStop = (bot) => {
    const type = bot.botType || 'signal';
    if (type === 'signal' || type === 'script') tradingEngine.stopBot(bot.id);
    else if (type === 'grid') gridBotEngine.stop(bot.id);
    else if (type === 'dca') dcaBotEngine.stop(bot.id);
    updateBot(bot.id, { status: 'stopped' });
  };

  const handlePause = (bot) => {
    handleStop(bot);
    updateBot(bot.id, { status: 'paused' });
  };

  const handleDelete = (bot) => {
    handleStop(bot);
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

  const getTypeInfo = (type) => BOT_TYPES.find(t => t.id === type) || BOT_TYPES[0];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Trading Bots</h1>
          <p className="text-sm text-[var(--text-dim)]">
            {bots.filter(b => b.status === 'active').length} activos de {bots.length} total
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 btn-gold rounded-xl text-sm">
          <Plus size={16} /> Crear Bot
        </button>
      </div>

      {/* Create bot form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-5 space-y-5">
              <h3 className="text-sm font-bold text-[var(--text)]">Nuevo Bot de Trading</h3>

              {/* Bot type selector */}
              <div className="grid grid-cols-3 gap-3">
                {BOT_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => setBotType(t.id)}
                      className={`p-3 rounded-xl text-left transition-all ${botType === t.id ? 'ring-1' : 'hover:bg-[var(--surface-2)]'}`}
                      style={{
                        background: botType === t.id ? `${t.color}10` : 'var(--surface-2)',
                        borderColor: botType === t.id ? `${t.color}40` : 'var(--border)',
                        border: `1px solid ${botType === t.id ? t.color + '30' : 'var(--border)'}`,
                      }}>
                      <Icon size={20} style={{ color: t.color }} className="mb-1.5" />
                      <p className="text-xs font-bold" style={{ color: botType === t.id ? t.color : 'var(--text)' }}>{t.label}</p>
                      <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{t.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Common fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Nombre</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mi Bot" className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Par</label>
                  <select value={form.pair} onChange={(e) => setForm({ ...form, pair: e.target.value })} className="w-full">
                    {POPULAR_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Signal bot fields */}
              {botType === 'signal' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Timeframe</label>
                    <select value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })} className="w-full">
                      {TIMEFRAMES.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Balance ($)</label>
                    <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Riesgo (%)</label>
                    <input type="number" value={form.riskPercent} onChange={(e) => setForm({ ...form, riskPercent: e.target.value })} className="w-full" />
                  </div>
                </div>
              )}

              {/* Script bot fields */}
              {botType === 'script' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Timeframe</label>
                      <select value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })} className="w-full">
                        {TIMEFRAMES.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Balance ($)</label>
                      <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Riesgo (%)</label>
                      <input type="number" value={form.riskPercent} onChange={(e) => setForm({ ...form, riskPercent: e.target.value })} className="w-full" />
                    </div>
                  </div>

                  {/* Strategy selector or create new */}
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Estrategia</label>
                    <div className="flex gap-2">
                      <select value={form.scriptStrategyId} onChange={(e) => setForm({ ...form, scriptStrategyId: e.target.value })} className="flex-1">
                        <option value="">Seleccionar estrategia...</option>
                        {strategies.filter(s => s.type === 'custom_script').map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button onClick={() => setShowStrategyEditor(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#A855F7' }}>
                        <Code2 size={13} /> {strategies.filter(s => s.type === 'custom_script').length > 0 ? 'Crear Nueva' : 'Crear Estrategia'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid bot fields */}
              {botType === 'grid' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Precio Superior ($)</label>
                    <input type="number" value={form.upperPrice} onChange={(e) => setForm({ ...form, upperPrice: e.target.value })} placeholder="100000" className="w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Precio Inferior ($)</label>
                    <input type="number" value={form.lowerPrice} onChange={(e) => setForm({ ...form, lowerPrice: e.target.value })} placeholder="90000" className="w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Niveles de Grid</label>
                    <input type="number" value={form.gridLines} onChange={(e) => setForm({ ...form, gridLines: e.target.value })} className="w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Inversión Total ($)</label>
                    <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="w-full" />
                  </div>
                </div>
              )}

              {/* DCA bot fields */}
              {botType === 'dca' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">$ por Compra</label>
                      <input type="number" value={form.investmentPerOrder} onChange={(e) => setForm({ ...form, investmentPerOrder: e.target.value })} className="w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Intervalo (min)</label>
                      <input type="number" value={form.intervalMinutes} onChange={(e) => setForm({ ...form, intervalMinutes: e.target.value })} className="w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Máx. Compras</label>
                      <input type="number" value={form.maxOrders} onChange={(e) => setForm({ ...form, maxOrders: e.target.value })} className="w-full" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                      <input type="checkbox" checked={form.useRsiFilter} onChange={(e) => setForm({ ...form, useRsiFilter: e.target.checked })}
                        className="w-4 h-4 rounded accent-[var(--gold)]" />
                      Filtro RSI (comprar solo si RSI &lt; {form.rsiThreshold})
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                      <input type="checkbox" checked={form.usePriceDipFilter} onChange={(e) => setForm({ ...form, usePriceDipFilter: e.target.checked })}
                        className="w-4 h-4 rounded accent-[var(--gold)]" />
                      Filtro de Caída (comprar cuando baje {form.dipPercent}%)
                    </label>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 py-2.5 btn-gold rounded-xl text-sm">Crear Bot</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-[var(--surface-2)] text-[var(--text-dim)] rounded-xl text-sm border border-[var(--border)]">Cancelar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot list */}
      {bots.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Bot size={48} className="text-[var(--text-dim)]/20 mx-auto mb-4" />
          <p className="text-[var(--text-dim)]">No hay bots creados</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">Crea tu primer bot para automatizar tu trading</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map(bot => {
            const typeInfo = getTypeInfo(bot.botType || 'signal');
            const TypeIcon = typeInfo.icon;
            return (
              <motion.div key={bot.id} layout className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${typeInfo.color}12`, border: `1px solid ${typeInfo.color}20` }}>
                      <TypeIcon size={20} style={{ color: typeInfo.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{bot.name}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                          style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-dim)]">{bot.pair}{bot.timeframe ? ` • ${bot.timeframe}` : ''}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{ color: getStatusColor(bot.status), background: `${getStatusColor(bot.status)}15` }}>
                    {bot.status === 'active' ? '● Activo' : bot.status === 'paused' ? '❚❚ Pausado' : '■ Detenido'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-2)' }}>
                    <p className="text-[10px] text-[var(--text-dim)]">Trades</p>
                    <p className="text-sm font-bold">{bot.trades || 0}</p>
                  </div>
                  <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-2)' }}>
                    <p className="text-[10px] text-[var(--text-dim)]">P&L</p>
                    <p className={`text-sm font-bold ${(bot.pnl || 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {(bot.pnl || 0) >= 0 ? '+' : ''}${(bot.pnl || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-2)' }}>
                    <p className="text-[10px] text-[var(--text-dim)]">Win Rate</p>
                    <p className="text-sm font-bold text-[var(--gold)]">{(bot.winRate || 0).toFixed(0)}%</p>
                  </div>
                  <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-2)' }}>
                    <p className="text-[10px] text-[var(--text-dim)]">Balance</p>
                    <p className="text-sm font-bold">${bot.balance?.toLocaleString() || '0'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {bot.status !== 'active' ? (
                    <button onClick={() => handleStart(bot)} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--green)]/10 text-[var(--green)] rounded-lg text-xs font-bold hover:bg-[var(--green)]/20 transition-colors border border-[var(--green)]/20">
                      <Play size={12} /> Iniciar
                    </button>
                  ) : (
                    <button onClick={() => handlePause(bot)} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--gold)]/10 text-[var(--gold)] rounded-lg text-xs font-bold hover:bg-[var(--gold)]/20 transition-colors border border-[var(--gold)]/20">
                      <Pause size={12} /> Pausar
                    </button>
                  )}
                  <button onClick={() => handleStop(bot)} className="flex items-center gap-1 px-3 py-1.5 text-[var(--text-dim)] rounded-lg text-xs hover:text-[var(--text)] transition-colors" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <Square size={12} /> Detener
                  </button>
                  <button onClick={() => handleDelete(bot)} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-[var(--text-dim)] hover:text-[var(--red)] rounded-lg text-xs transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Live logs */}
      {logs.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
              Actividad en Vivo
            </h3>
            <button onClick={() => setLogs([])} className="text-xs text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors">Limpiar</button>
          </div>
          <div className="max-h-48 overflow-y-auto p-3 space-y-1 font-mono text-[11px]">
            {logs.slice(-50).reverse().map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <span className="text-[var(--text-dim)] shrink-0">{log.time}</span>
                <span className="text-[var(--gold)] shrink-0 font-semibold">[{log.bot}]</span>
                <span className="text-[var(--text-secondary)]">{log.message || `${log.side?.toUpperCase()} ${log.quantity} @ $${log.price}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mis Estrategias Custom */}
      {strategies.filter(s => s.type === 'custom_script').length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Code2 size={16} className="text-[#A855F7]" /> Mis Estrategias
            </h2>
            <button onClick={() => setShowStrategyEditor(true)}
              className="text-xs text-[var(--text-dim)] hover:text-[#A855F7] transition-colors flex items-center gap-1">
              <Plus size={12} /> Nueva
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {strategies.filter(s => s.type === 'custom_script').map(s => (
              <div key={s.id} className="rounded-lg p-3 transition-colors hover:bg-[var(--dark-3)]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                    <Code2 size={12} className="text-[#A855F7]" /> {s.name}
                  </span>
                  <button onClick={() => { setEditingStrategy(s); setShowStrategyEditor(true); }}
                    className="text-[var(--text-dim)] hover:text-[#A855F7] transition-colors">
                    <Edit3 size={12} />
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-dim)]">
                  {s.code?.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length || 0} líneas de lógica
                </p>
                <p className="text-[9px] text-[var(--text-dim)] mt-1">
                  Creada: {new Date(s.createdAt).toLocaleDateString('es')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Editor Modal */}
      <AnimatePresence>
        {showStrategyEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setShowStrategyEditor(false); setEditingStrategy(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <StrategyEditor
                initialCode={editingStrategy?.code}
                initialName={editingStrategy?.name}
                editMode={!!editingStrategy}
                onClose={() => { setShowStrategyEditor(false); setEditingStrategy(null); }}
                onSave={(strategy) => {
                  const saved = addStrategy(strategy);
                  setForm(prev => ({ ...prev, scriptStrategyId: saved.id }));
                  setShowStrategyEditor(false);
                  setEditingStrategy(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
