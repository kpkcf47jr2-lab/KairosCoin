// Kairos Trade — Strategy Builder
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Trash2, Play, Copy, Share2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { INDICATORS, POPULAR_PAIRS, TIMEFRAMES } from '../../constants';

const STRATEGY_TEMPLATES = [
  {
    name: 'EMA Cross Classic',
    description: 'Cruces de EMA rápida/lenta — Tendencia',
    entry: { condition: 'EMA 20 cruza por encima de EMA 50', indicator: 'ema_cross', params: { fast: 20, slow: 50 } },
    exit: { condition: 'EMA 20 cruza por debajo de EMA 50', indicator: 'ema_cross', params: { fast: 20, slow: 50 } },
    stopLoss: '2', takeProfit: '4',
  },
  {
    name: 'RSI Reversal',
    description: 'Compra en sobreventa, vende en sobrecompra',
    entry: { condition: 'RSI < 30 (sobreventa)', indicator: 'rsi', params: { period: 14, oversold: 30 } },
    exit: { condition: 'RSI > 70 (sobrecompra)', indicator: 'rsi', params: { period: 14, overbought: 70 } },
    stopLoss: '1.5', takeProfit: '3',
  },
  {
    name: 'MACD Momentum',
    description: 'Cruce de línea MACD y señal',
    entry: { condition: 'MACD cruza por encima de señal', indicator: 'macd_cross', params: { fast: 12, slow: 26, signal: 9 } },
    exit: { condition: 'MACD cruza por debajo de señal', indicator: 'macd_cross', params: {} },
    stopLoss: '2', takeProfit: '4',
  },
  {
    name: 'Bollinger Bounce',
    description: 'Compra en banda inferior, vende en superior',
    entry: { condition: 'Precio toca Bollinger Band inferior', indicator: 'bb_bounce', params: { period: 20, stdDev: 2 } },
    exit: { condition: 'Precio toca Bollinger Band superior', indicator: 'bb_bounce', params: {} },
    stopLoss: '1', takeProfit: '2',
  },
  {
    name: 'EMA + RSI Combo',
    description: 'Más preciso: cruces de EMA confirmados con RSI',
    entry: { condition: 'EMA 20 > EMA 50 + RSI < 30', indicator: 'ema_cross_rsi', params: { fastEma: 20, slowEma: 50, rsiPeriod: 14, rsiOversold: 30 } },
    exit: { condition: 'RSI > 70', indicator: 'rsi', params: { rsiOverbought: 70 } },
    stopLoss: '2', takeProfit: '4',
  },
];

export default function StrategyBuilder() {
  const { strategies, addStrategy, removeStrategy, setPage } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    pair: 'BTCUSDT',
    timeframe: '1h',
    entryIndicator: 'ema_cross',
    entryCondition: '',
    exitIndicator: 'rsi',
    exitCondition: '',
    stopLoss: '2',
    takeProfit: '4',
  });

  const handleUseTemplate = (template) => {
    const strat = addStrategy({
      ...template,
      pair: 'BTCUSDT',
      timeframe: '1h',
    });
  };

  const handleCreate = () => {
    if (!form.name) return;
    addStrategy({
      name: form.name,
      pair: form.pair,
      timeframe: form.timeframe,
      entry: {
        condition: form.entryCondition || `${form.entryIndicator} signal`,
        indicator: form.entryIndicator,
        params: {},
      },
      exit: {
        condition: form.exitCondition || `${form.exitIndicator} signal`,
        indicator: form.exitIndicator,
        params: {},
      },
      stopLoss: form.stopLoss,
      takeProfit: form.takeProfit,
    });
    setForm({ name: '', pair: 'BTCUSDT', timeframe: '1h', entryIndicator: 'ema_cross', entryCondition: '', exitIndicator: 'rsi', exitCondition: '', stopLoss: '2', takeProfit: '4' });
    setShowCreate(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Estrategias de Trading</h1>
          <p className="text-sm text-[var(--text-dim)]">Crea, gestiona y aplica estrategias a tus bots</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-black font-bold rounded-xl hover:bg-[var(--gold-light)] transition-colors text-sm"
        >
          <Plus size={16} /> Crear Estrategia
        </button>
      </div>

      {/* Templates */}
      <div>
        <h2 className="text-sm font-bold mb-3">Plantillas Predefinidas</h2>
        <div className="grid grid-cols-3 gap-3">
          {STRATEGY_TEMPLATES.map((tmpl, i) => (
            <motion.div
              key={tmpl.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--gold)]/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-[var(--gold)]" />
                <h3 className="text-sm font-bold">{tmpl.name}</h3>
              </div>
              <p className="text-xs text-[var(--text-dim)] mb-3">{tmpl.description}</p>
              <div className="space-y-1 text-xs mb-3">
                <p><span className="text-[var(--green)]">▲</span> {tmpl.entry.condition}</p>
                <p><span className="text-[var(--red)]">▼</span> {tmpl.exit.condition}</p>
                <p className="text-[var(--text-dim)]">SL: {tmpl.stopLoss}% | TP: {tmpl.takeProfit}%</p>
              </div>
              <button
                onClick={() => handleUseTemplate(tmpl)}
                className="w-full py-1.5 bg-[var(--gold)]/20 text-[var(--gold)] rounded-lg text-xs font-bold hover:bg-[var(--gold)]/30 transition-colors"
              >
                Usar Plantilla
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-bold">Crear Estrategia Personalizada</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Nombre</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mi estrategia" className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Par</label>
                  <select value={form.pair} onChange={(e) => setForm({ ...form, pair: e.target.value })} className="w-full">
                    {POPULAR_PAIRS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Timeframe</label>
                  <select value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })} className="w-full">
                    {TIMEFRAMES.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--dark-3)] rounded-xl p-3">
                  <p className="text-xs font-bold text-[var(--green)] mb-2">▲ Condición de Entrada</p>
                  <select value={form.entryIndicator} onChange={(e) => setForm({ ...form, entryIndicator: e.target.value })} className="w-full mb-2 text-sm">
                    <option value="ema_cross">EMA Cross</option>
                    <option value="rsi">RSI</option>
                    <option value="macd_cross">MACD Cross</option>
                    <option value="ema_cross_rsi">EMA + RSI Combo</option>
                    <option value="bb_bounce">Bollinger Bounce</option>
                  </select>
                  <input value={form.entryCondition} onChange={(e) => setForm({ ...form, entryCondition: e.target.value })} placeholder="Describe la condición..." className="w-full text-xs" />
                </div>
                <div className="bg-[var(--dark-3)] rounded-xl p-3">
                  <p className="text-xs font-bold text-[var(--red)] mb-2">▼ Condición de Salida</p>
                  <select value={form.exitIndicator} onChange={(e) => setForm({ ...form, exitIndicator: e.target.value })} className="w-full mb-2 text-sm">
                    <option value="rsi">RSI</option>
                    <option value="ema_cross">EMA Cross</option>
                    <option value="macd_cross">MACD Cross</option>
                  </select>
                  <input value={form.exitCondition} onChange={(e) => setForm({ ...form, exitCondition: e.target.value })} placeholder="Describe la condición..." className="w-full text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Stop Loss (%)</label>
                  <input type="number" value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Take Profit (%)</label>
                  <input type="number" value={form.takeProfit} onChange={(e) => setForm({ ...form, takeProfit: e.target.value })} className="w-full" />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 py-2.5 bg-[var(--gold)] text-black font-bold rounded-xl text-sm">Crear Estrategia</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-[var(--dark-3)] text-[var(--text-dim)] rounded-xl text-sm">Cancelar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved strategies */}
      {strategies.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3">Mis Estrategias ({strategies.length})</h2>
          <div className="space-y-2">
            {strategies.map(strat => (
              <div key={strat.id} className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{strat.name}</p>
                  <p className="text-xs text-[var(--text-dim)]">
                    {strat.entry?.condition} | SL: {strat.stopLoss}% | TP: {strat.takeProfit}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage('bots')}
                    className="px-3 py-1.5 bg-[var(--green)]/20 text-[var(--green)] rounded-lg text-xs font-bold"
                  >
                    <Play size={12} className="inline mr-1" /> Usar en Bot
                  </button>
                  <button
                    onClick={() => removeStrategy(strat.id)}
                    className="p-1.5 text-[var(--text-dim)] hover:text-[var(--red)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
