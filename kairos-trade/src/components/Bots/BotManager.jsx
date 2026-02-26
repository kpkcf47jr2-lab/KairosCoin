// Kairos Trade — Bot Management Panel (Elite v3)
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, Play, Pause, Square, Trash2, Settings, TrendingUp, TrendingDown, AlertCircle, Grid3x3, DollarSign, Zap, Code2, Edit3, BarChart3, Link2, ArrowRight, ChevronDown } from 'lucide-react';
import useStore from '../../store/useStore';
import { tradingEngine } from '../../services/tradingEngine';
import gridBotEngine from '../../services/gridBot';
import dcaBotEngine from '../../services/dcaBot';
import { brokerService } from '../../services/broker';
import { POPULAR_PAIRS, TIMEFRAMES } from '../../constants';
import { formatPair } from '../../utils/pairUtils';
import StrategyEditor from './StrategyEditor';

const BOT_TYPES = [
  { id: 'signal', label: 'Signal Bot', icon: Zap, desc: 'Indicadores técnicos predefinidos', color: '#3B82F6' },
  { id: 'script', label: 'Script Bot', icon: Code2, desc: 'Estrategia personalizada con código', color: '#A855F7' },
  { id: 'grid', label: 'Grid Bot', icon: Grid3x3, desc: 'Compra y vende en niveles de precio', color: '#00DC82' },
  { id: 'dca', label: 'DCA Bot', icon: DollarSign, desc: 'Inversión a intervalos regulares', color: '#22D3EE' },
];

export default function BotManager() {
  const { bots, addBot, updateBot, removeBot, strategies, addStrategy, brokers, setPage, setSelectedPair } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showStrategyEditor, setShowStrategyEditor] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [botType, setBotType] = useState('signal');
  const [logs, setLogs] = useState([]);
  const [showLiveActivity, setShowLiveActivity] = useState(false);
  const [createError, setCreateError] = useState('');
  const [brokerBalances, setBrokerBalances] = useState({});
  const [livePnL, setLivePnL] = useState({});  // Real-time P&L per bot
  const [form, setForm] = useState({
    name: '', pair: 'BTCKAIROS', timeframe: '1h', strategyId: '', brokerId: '',
    balance: '1000', riskPercent: '2', maxTrades: '10',
    trailingStop: false, trailingStopPct: '1.5', trailingActivation: '0.5',
    // Grid bot fields
    upperPrice: '', lowerPrice: '', gridLines: '10',
    // DCA bot fields
    investmentPerOrder: '100', intervalMinutes: '60', maxOrders: '50',
    useRsiFilter: false, rsiThreshold: '40', usePriceDipFilter: false, dipPercent: '3',
    // Script bot fields
    scriptCode: '', scriptStrategyId: '',
  });

  // Fetch real balances from connected brokers (auto-reconnect if needed)
  const fetchBrokerBalances = useCallback(async () => {
    for (const broker of brokers.filter(b => b.connected)) {
      try {
        // Auto-reconnect if broker service lost the connection (e.g. page reload)
        if (!brokerService.connections?.has(broker.id)) {
          await brokerService.connect(broker);
        }
        const result = await brokerService.getBalances(broker.id);
        const balArr = Array.isArray(result) ? result : result?.balances || [];
        setBrokerBalances(prev => ({ ...prev, [broker.id]: { balances: balArr, loading: false, error: false } }));
      } catch (err) {
        console.warn('Balance fetch failed for', broker.id, err.message);
        setBrokerBalances(prev => ({ ...prev, [broker.id]: { balances: [], loading: false, error: true } }));
      }
    }
  }, [brokers]);

  useEffect(() => {
    fetchBrokerBalances();
    const interval = setInterval(fetchBrokerBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchBrokerBalances]);

  // Poll live P&L from trading engine every second
  useEffect(() => {
    const tick = setInterval(() => {
      const activeBots = bots.filter(b => b.status === 'active');
      if (activeBots.length === 0) return;
      const updates = {};
      activeBots.forEach(bot => {
        const live = tradingEngine.getLiveData(bot.id);
        if (live) updates[bot.id] = live;
      });
      if (Object.keys(updates).length > 0) {
        setLivePnL(prev => ({ ...prev, ...updates }));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [bots]);

  // Auto-restart active bots on mount (survives navigation + page refresh)
  useEffect(() => {
    const currentBots = useStore.getState().bots;
    const activeBotsList = currentBots.filter(b => b.status === 'active');

    for (const bot of activeBotsList) {
      if (tradingEngine.activeBots.has(bot.id)) {
        // Bot is already running — re-attach fresh callbacks
        tradingEngine.setCallbacks(bot.id,
          (trade) => addTrade(bot, trade),
          (msg) => addLog(bot, msg),
        );
      } else {
        // Bot shows active but engine lost it (page refresh) — restart
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
            onLog: (msg) => addLog(bot, msg),
            onTrade: (trade) => addTrade(bot, trade),
          });
        }
      }
    }

    // Load existing logs from engine buffer (survived navigation)
    const allLogs = tradingEngine.getAllLogs();
    if (allLogs.length > 0) {
      setLogs(prev => {
        if (prev.length > 0) return prev; // Don't double-add
        return allLogs.map(l => ({
          type: 'log', bot: l.botName, message: l.message,
          time: new Date(l.time).toLocaleTimeString(),
        }));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: get broker info for a bot
  const getBrokerForBot = (bot) => brokers.find(b => b.id === bot.brokerId);
  const getBrokerBalance = (brokerId) => brokerBalances[brokerId] || null;

  // Navigate to chart with bot's pair
  const goToChart = (bot) => {
    setSelectedPair(bot.pair);
    setPage('chart');
  };

  const handleCreate = () => {
    setCreateError('');

    // Auto-generate name if empty
    const botName = form.name.trim() || `Bot ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;

    if (!form.pair) {
      setCreateError('Selecciona un par de trading');
      return;
    }

    const botData = {
      name: botName,
      pair: form.pair,
      botType,
      brokerId: form.brokerId,
    };

    if (botType === 'signal') {
      const strategy = strategies.find(s => s.id === form.strategyId) || {
        name: 'EMA Cross 9/21',
        entry: { condition: 'EMA 9 cruza EMA 21', indicator: 'ema_cross', params: { fastEma: 9, slowEma: 21 } },
        exit: { condition: 'Cruce opuesto', indicator: 'ema_cross', params: { fastEma: 9, slowEma: 21 } },
        stopLoss: '2', takeProfit: '4',
      };
      Object.assign(botData, {
        timeframe: form.timeframe, strategy,
        balance: parseFloat(form.balance), riskPercent: parseFloat(form.riskPercent),
        maxTrades: parseInt(form.maxTrades),
        trailingStop: form.trailingStop,
        trailingStopPct: form.trailingStop ? parseFloat(form.trailingStopPct) : undefined,
        trailingActivation: form.trailingStop ? parseFloat(form.trailingActivation) : undefined,
      });
    } else if (botType === 'script') {
      // Custom script bot — uses Kairos Script engine
      if (!form.scriptStrategyId) {
        setCreateError('Selecciona una estrategia o crea una nueva');
        return;
      }
      const customStrategy = strategies.find(s => s.id === form.scriptStrategyId);
      if (!customStrategy?.code) {
        setCreateError('La estrategia seleccionada no tiene código. Edítala y guarda el código primero.');
        return;
      }
      Object.assign(botData, {
        timeframe: form.timeframe,
        strategy: { type: 'custom_script', code: customStrategy.code, name: customStrategy.name },
        balance: parseFloat(form.balance), riskPercent: parseFloat(form.riskPercent),
        maxTrades: parseInt(form.maxTrades),
        scriptName: customStrategy.name,
        trailingStop: form.trailingStop,
        trailingStopPct: form.trailingStop ? parseFloat(form.trailingStopPct) : undefined,
        trailingActivation: form.trailingStop ? parseFloat(form.trailingActivation) : undefined,
      });
    } else if (botType === 'grid') {
      if (!form.upperPrice || !form.lowerPrice) {
        setCreateError('Ingresa el precio superior e inferior para el grid');
        return;
      }
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
    setCreateError('');
  };

  const addLog = (bot, msg) => {
    setLogs(prev => [...prev.slice(-100), { type: 'log', bot: bot.name, message: msg, time: new Date().toLocaleTimeString() }]);
  };

  const addTrade = (bot, trade) => {
    // Don't count errors as trades
    if (trade.status === 'error') {
      setLogs(prev => [...prev.slice(-100), { type: 'error', bot: bot.name, message: `Error: ${trade.error}`, time: new Date().toLocaleTimeString() }]);
      return;
    }

    setLogs(prev => [...prev.slice(-100), { type: 'trade', bot: bot.name, ...trade, time: new Date().toLocaleTimeString() }]);
    // Update bot stats — only count successful trades
    const current = useStore.getState().bots.find(b => b.id === bot.id);
    if (current) {
      const trades = (current.trades || 0) + 1;
      const profit = parseFloat(trade.profit) || 0;
      const pnl = (current.pnl || 0) + profit;

      // Track win rate: only on close actions with profit data
      let winRate = current.winRate || 0;
      if (trade.action === 'close' && profit !== 0) {
        const totalClosed = (current._closedTrades || 0) + 1;
        const totalWins = (current._wins || 0) + (profit > 0 ? 1 : 0);
        winRate = totalClosed > 0 ? (totalWins / totalClosed) * 100 : 0;
        updateBot(bot.id, { trades, pnl, winRate, _closedTrades: totalClosed, _wins: totalWins });
      } else {
        updateBot(bot.id, { trades, pnl });
      }
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
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-5 py-4 md:py-5 space-y-4 md:space-y-5 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold">Trading Bots</h1>
          <p className="text-xs text-[var(--text-dim)]">
            {bots.filter(b => b.status === 'active').length} activos de {bots.length} total
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 btn-gold rounded-xl text-xs font-semibold shrink-0">
          <Plus size={14} /> Crear Bot
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BOT_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => setBotType(t.id)}
                      className={`p-3 rounded-xl text-center transition-all flex flex-col items-center justify-center min-w-0 ${botType === t.id ? 'ring-1' : 'hover:bg-[var(--surface-2)]'}`}
                      style={{
                        background: botType === t.id ? `${t.color}10` : 'var(--surface-2)',
                        borderColor: botType === t.id ? `${t.color}40` : 'var(--border)',
                        border: `1px solid ${botType === t.id ? t.color + '30' : 'var(--border)'}`,
                      }}>
                      <Icon size={20} style={{ color: t.color }} className="mb-1.5 shrink-0" />
                      <p className="text-xs font-bold truncate w-full" style={{ color: botType === t.id ? t.color : 'var(--text)' }}>{t.label}</p>
                      <p className="text-[10px] text-[var(--text-dim)] mt-0.5 truncate w-full">{t.desc}</p>
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
                    {POPULAR_PAIRS.map(p => <option key={p} value={p}>{formatPair(p)}</option>)}
                  </select>
                </div>
              </div>

              {/* Signal bot fields */}
              {botType === 'signal' && (
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
                  {/* Trailing Stop */}
                  <div className="bg-[var(--dark)] rounded-lg p-3 border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1">📐 Trailing Stop</p>
                        <p className="text-[10px] text-[var(--text-dim)]">SL que se mueve protegiendo ganancias</p>
                      </div>
                      <button
                        onClick={() => setForm({ ...form, trailingStop: !form.trailingStop })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${form.trailingStop ? 'bg-[var(--gold)]' : 'bg-[var(--dark-4)]'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.trailingStop ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {form.trailingStop && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className="text-[10px] text-[var(--text-dim)] mb-1 block">Trail Distance (%)</label>
                          <input type="number" step="0.1" value={form.trailingStopPct} onChange={(e) => setForm({ ...form, trailingStopPct: e.target.value })} className="w-full" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-dim)] mb-1 block">Activación (%)</label>
                          <input type="number" step="0.1" value={form.trailingActivation} onChange={(e) => setForm({ ...form, trailingActivation: e.target.value })} className="w-full" />
                        </div>
                      </div>
                    )}
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
                  {/* Trailing Stop */}
                  <div className="bg-[var(--dark)] rounded-lg p-3 border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1">📐 Trailing Stop</p>
                        <p className="text-[10px] text-[var(--text-dim)]">SL que se mueve protegiendo ganancias</p>
                      </div>
                      <button
                        onClick={() => setForm({ ...form, trailingStop: !form.trailingStop })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${form.trailingStop ? 'bg-[var(--gold)]' : 'bg-[var(--dark-4)]'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.trailingStop ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {form.trailingStop && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className="text-[10px] text-[var(--text-dim)] mb-1 block">Trail Distance (%)</label>
                          <input type="number" step="0.1" value={form.trailingStopPct} onChange={(e) => setForm({ ...form, trailingStopPct: e.target.value })} className="w-full" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-dim)] mb-1 block">Activación (%)</label>
                          <input type="number" step="0.1" value={form.trailingActivation} onChange={(e) => setForm({ ...form, trailingActivation: e.target.value })} className="w-full" />
                        </div>
                      </div>
                    )}
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

              {/* Broker selector — real execution */}
              {brokers.filter(b => b.connected).length > 0 && (
                <div>
                  <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Broker (ejecución real)</label>
                  <select value={form.brokerId} onChange={(e) => setForm({ ...form, brokerId: e.target.value })} className="w-full">
                    <option value="">Demo (sin broker)</option>
                    {brokers.filter(b => b.connected).map(b => (
                      <option key={b.id} value={b.id}>🟢 {b.name || b.broker} — Real</option>
                    ))}
                  </select>
                  {form.brokerId && (
                    <p className="text-[10px] text-[var(--red)] mt-1 font-semibold">⚠️ Este bot ejecutará órdenes REALES con dinero real</p>
                  )}
                </div>
              )}

              {createError && (
                <p className="text-xs text-[var(--red)] font-semibold px-1">⚠️ {createError}</p>
              )}
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 py-2.5 btn-gold rounded-xl text-sm font-bold text-center justify-center">Crear Bot</button>
                <button onClick={() => { setShowCreate(false); setCreateError(''); }} className="px-4 py-2.5 bg-[var(--surface-2)] text-[var(--text-dim)] rounded-xl text-sm border border-[var(--border)] text-center shrink-0">Cancelar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot list */}
      {bots.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Bot size={56} className="text-[var(--text-dim)]/20 mx-auto mb-5" />
          <p className="text-lg text-[var(--text-dim)] font-semibold">No hay bots creados</p>
          <p className="text-sm text-[var(--text-dim)] mt-2">Crea tu primer bot para automatizar tu trading</p>
          <button onClick={() => setShowCreate(true)} className="mt-5 px-6 py-3 btn-gold rounded-xl text-sm font-bold inline-flex items-center gap-2">
            <Plus size={16} /> Crear Bot
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bots.map(bot => {
            const typeInfo = getTypeInfo(bot.botType || 'signal');
            const TypeIcon = typeInfo.icon;
            const broker = getBrokerForBot(bot);
            const balanceData = bot.brokerId ? getBrokerBalance(bot.brokerId) : null;
            const strategyName = bot.scriptName || bot.strategy?.name || 'Default';

            return (
              <motion.div key={bot.id} layout className="rounded-2xl overflow-hidden min-w-0"
                style={{ background: 'var(--surface)', border: `1px solid ${bot.status === 'active' ? 'rgba(0,220,130,0.2)' : 'var(--border)'}` }}>

                {/* Bot header — clickable to go to chart */}
                <div className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => goToChart(bot)}>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${typeInfo.color}12`, border: `1px solid ${typeInfo.color}25` }}>
                        <TypeIcon size={24} style={{ color: typeInfo.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className="text-base font-bold truncate">{bot.name}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0"
                            style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-dim)] flex-wrap">
                          <span className="font-semibold text-[var(--text-secondary)]">{formatPair(bot.pair)}</span>
                          {bot.timeframe && <span>• {bot.timeframe}</span>}
                          <span>• {strategyName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                        style={{ color: getStatusColor(bot.status), background: `${getStatusColor(bot.status)}15`, border: `1px solid ${getStatusColor(bot.status)}20` }}>
                        {bot.status === 'active' ? '● Activo' : bot.status === 'paused' ? '❚❚ Pausado' : '■ Detenido'}
                      </span>
                      <ArrowRight size={16} className="text-[var(--text-dim)]" />
                    </div>
                  </div>

                  {/* Broker + Balance info */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {broker ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <Link2 size={13} className="text-[var(--green)] shrink-0" />
                        <span className="font-semibold text-[var(--text)]">{broker.label || broker.name || broker.broker}</span>
                        <span className="text-[var(--green)] font-bold">• Conectado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <span className="text-[var(--text-dim)]">📋 Modo Demo</span>
                      </div>
                    )}
                    {balanceData && balanceData.balances.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <DollarSign size={13} className="text-[var(--gold)] shrink-0" />
                        <span className="font-semibold text-[var(--text)]">
                          Saldo: {balanceData.balances.slice(0, 3).map(b => `${parseFloat(b.free).toFixed(4)} ${b.asset}`).join(' • ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                {/* Stats row — with LIVE unrealized P&L */}
                {(() => {
                  const live = livePnL[bot.id];
                  const closedPnl = parseFloat(bot.pnl) || 0;
                  const unrealized = live?.unrealizedPnl || 0;
                  const totalPnl = closedPnl + unrealized;
                  const pnlPct = live?.pnlPercent || 0;
                  const initial = parseFloat(bot.balance) || 0;
                  const currentBal = initial + totalPnl;
                  const isUp = totalPnl >= 0;
                  const hasPosition = !!live?.position;
                  return (
                <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border)', borderTop: '1px solid var(--border)' }}>
                  <div className="p-3 sm:p-3.5 text-center" style={{ background: 'var(--surface)' }}>
                    <p className="text-[10px] sm:text-xs text-[var(--text-dim)] mb-1">Trades</p>
                    <p className="text-base sm:text-lg font-bold">{bot.trades || 0}</p>
                  </div>
                  <div className="p-3 sm:p-3.5 text-center" style={{ background: 'var(--surface)' }}>
                    <p className="text-[10px] sm:text-xs text-[var(--text-dim)] mb-1">
                      {hasPosition ? '📊 P&L Vivo' : 'P&L'}
                    </p>
                    <p className={`text-base sm:text-lg font-bold ${isUp ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {isUp ? '+' : ''}${totalPnl.toFixed(2)}
                    </p>
                    {hasPosition && (
                      <p className={`text-[10px] font-bold ${pnlPct >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <div className="p-3 sm:p-3.5 text-center" style={{ background: 'var(--surface)' }}>
                    <p className="text-[10px] sm:text-xs text-[var(--text-dim)] mb-1">Win Rate</p>
                    <p className="text-base sm:text-lg font-bold text-[var(--gold)]">{(bot.winRate || 0).toFixed(0)}%</p>
                  </div>
                  <div className="p-3 sm:p-3.5 text-center" style={{ background: 'var(--surface)' }}>
                    <p className="text-[10px] sm:text-xs text-[var(--text-dim)] mb-1">Balance</p>
                    <div>
                      <p className={`text-base sm:text-lg font-bold ${currentBal >= initial ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        ${currentBal.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-[var(--text-dim)]">
                        Inicio: ${initial.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                  );
                })()}

                {/* Action buttons — bigger */}
                <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 flex-wrap items-center" style={{ borderTop: '1px solid var(--border)' }}>
                  {bot.status !== 'active' ? (
                    <button onClick={(e) => { e.stopPropagation(); handleStart(bot); }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--green)]/10 text-[var(--green)] rounded-xl text-sm font-bold hover:bg-[var(--green)]/20 transition-colors border border-[var(--green)]/20">
                      <Play size={15} className="shrink-0" /> Iniciar
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handlePause(bot); }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--gold)]/10 text-[var(--gold)] rounded-xl text-sm font-bold hover:bg-[var(--gold)]/20 transition-colors border border-[var(--gold)]/20">
                      <Pause size={15} className="shrink-0" /> Pausar
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleStop(bot); }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[var(--text-dim)] rounded-xl text-sm hover:text-[var(--text)] transition-colors"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <Square size={15} className="shrink-0" /> Detener
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); goToChart(bot); }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[var(--gold)] rounded-xl text-sm font-semibold hover:bg-[var(--gold)]/10 transition-colors"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--gold)/20' }}>
                    <BarChart3 size={15} className="shrink-0" /> Ver Gráfico
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(bot); }}
                    className="ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[var(--text-dim)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 rounded-xl text-sm transition-colors">
                    <Trash2 size={14} className="shrink-0" /> Eliminar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Live logs — collapsible */}
      {logs.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowLiveActivity(prev => !prev)}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--gold)]/5 transition-colors"
            style={{ borderBottom: showLiveActivity ? '1px solid var(--border)' : 'none' }}
          >
            <h3 className="text-base font-bold flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--green)] animate-pulse" />
              Actividad en Vivo
              <span className="text-xs font-normal text-[var(--text-dim)] ml-1">({logs.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              {showLiveActivity && (
                <span onClick={(e) => { e.stopPropagation(); setLogs([]); }} className="text-sm text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors px-3 py-1 rounded-lg hover:bg-[var(--gold)]/10">Limpiar</span>
              )}
              <ChevronDown
                size={18}
                className="text-[var(--text-dim)] transition-transform duration-300"
                style={{ transform: showLiveActivity ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {showLiveActivity && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="max-h-56 overflow-y-auto p-4 space-y-1.5 font-mono text-xs">
                  {logs.slice(-50).reverse().map((log, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="text-[var(--text-dim)] shrink-0">{log.time}</span>
                      <span className="text-[var(--gold)] shrink-0 font-semibold">[{log.bot}]</span>
                      <span className="text-[var(--text-secondary)]">{log.message || `${log.side?.toUpperCase()} ${log.quantity} @ $${log.price}`}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Mis Estrategias Custom */}
      {strategies.filter(s => s.type === 'custom_script').length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold flex items-center gap-2.5 min-w-0">
              <Code2 size={18} className="text-[#A855F7] shrink-0" /> Mis Estrategias
            </h2>
            <button onClick={() => setShowStrategyEditor(true)}
              className="text-sm text-[var(--text-dim)] hover:text-[#A855F7] transition-colors flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl hover:bg-[#A855F7]/10">
              <Plus size={14} /> Nueva
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strategies.filter(s => s.type === 'custom_script').map(s => (
              <div key={s.id} className="rounded-xl p-4 transition-colors hover:bg-[var(--dark-3)] min-w-0"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="text-sm font-bold text-[var(--text)] flex items-center gap-2 min-w-0 truncate">
                    <Code2 size={14} className="text-[#A855F7] shrink-0" /> <span className="truncate">{s.name}</span>
                  </span>
                  <button onClick={() => { setEditingStrategy(s); setShowStrategyEditor(true); }}
                    className="text-[var(--text-dim)] hover:text-[#A855F7] transition-colors shrink-0 p-1.5 rounded-lg hover:bg-[#A855F7]/10">
                    <Edit3 size={14} />
                  </button>
                </div>
                <p className="text-xs text-[var(--text-dim)] truncate">
                  {s.code?.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length || 0} líneas de lógica
                </p>
                <p className="text-[11px] text-[var(--text-dim)] mt-1.5 truncate">
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
