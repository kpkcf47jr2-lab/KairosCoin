// Kairos Trade — Strategy Builder (v2 — with Kairos Script Editor)
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Trash2, Play, Copy, Code2, Edit3, ChevronRight } from 'lucide-react';
import useStore from '../../store/useStore';
import { POPULAR_PAIRS, TIMEFRAMES } from '../../constants';
import StrategyEditor from '../Bots/StrategyEditor';

const PRESET_TEMPLATES = [
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
    name: 'EMA + RSI Combo',
    description: 'Más preciso: cruces de EMA confirmados con RSI',
    entry: { condition: 'EMA 20 > EMA 50 + RSI < 30', indicator: 'ema_cross_rsi', params: { fastEma: 20, slowEma: 50, rsiPeriod: 14, rsiOversold: 30 } },
    exit: { condition: 'RSI > 70', indicator: 'rsi', params: { rsiOverbought: 70 } },
    stopLoss: '2', takeProfit: '4',
  },
];

export default function StrategyBuilder() {
  const { strategies, addStrategy, removeStrategy, setPage } = useStore();
  const [showEditor, setShowEditor] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [activeTab, setActiveTab] = useState('custom'); // 'custom' | 'preset'

  const customStrategies = strategies.filter(s => s.type === 'custom_script');
  const presetStrategies = strategies.filter(s => s.type !== 'custom_script');

  const handleUseTemplate = (template) => {
    addStrategy({ ...template, pair: 'BTCUSDT', timeframe: '1h' });
  };

  const handleEditStrategy = (strategy) => {
    setEditingStrategy(strategy);
    setShowEditor(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Estrategias de Trading</h1>
          <p className="text-sm text-[var(--text-dim)]">
            Crea estrategias con código o usa plantillas predefinidas
          </p>
        </div>
        <button onClick={() => { setEditingStrategy(null); setShowEditor(true); }}
          className="flex items-center gap-2 px-4 py-2 btn-gold rounded-xl text-sm">
          <Code2 size={16} /> Crear con Código
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--dark-3)] rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === 'custom' ? 'bg-[var(--gold)] text-white font-bold' : 'text-[var(--text-dim)]'
          }`}>
          <Code2 size={14} /> Custom Scripts ({customStrategies.length})
        </button>
        <button onClick={() => setActiveTab('preset')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === 'preset' ? 'bg-[var(--gold)] text-white font-bold' : 'text-[var(--text-dim)]'
          }`}>
          <Zap size={14} /> Predefinidas ({presetStrategies.length})
        </button>
      </div>

      {/* Custom Scripts Tab */}
      {activeTab === 'custom' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Hero CTA */}
          <div className="rounded-xl p-6 text-center" style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(59,130,246,0.08) 100%)',
            border: '1px solid rgba(168,85,247,0.15)',
          }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <Code2 size={24} className="text-[#A855F7]" />
            </div>
            <h2 className="text-lg font-bold mb-1">Kairos Script</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
              Escribe tu propia estrategia con código simple, o pídele a ChatGPT que la genere por ti.
              Más fácil que Pine Script, más potente que MQL.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => { setEditingStrategy(null); setShowEditor(true); }}
                className="flex items-center gap-2 px-5 py-2.5 btn-gold rounded-xl text-sm font-bold">
                <Code2 size={14} /> Crear Estrategia
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { step: '1', title: 'Pide a ChatGPT', desc: 'Dile qué estrategia quieres con nuestro prompt optimizado', color: '#A855F7' },
              { step: '2', title: 'Pega el Código', desc: 'Copia el código que te generó y pégalo en el editor', color: '#3B82F6' },
              { step: '3', title: 'Activa el Bot', desc: 'Testea con backtest y asígnala a un Script Bot', color: '#00DC82' },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="rounded-xl p-4 flex gap-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
                  {step}
                </div>
                <div>
                  <p className="text-xs font-bold mb-0.5">{title}</p>
                  <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Custom strategy list */}
          {customStrategies.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Mis Scripts ({customStrategies.length})</h3>
              {customStrategies.map(strat => (
                <motion.div key={strat.id} layout
                  className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      <Code2 size={18} className="text-[#A855F7]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{strat.name}</p>
                      <p className="text-[10px] text-[var(--text-dim)]">
                        {strat.code?.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length || 0} líneas de lógica
                        {' • '}Creada: {new Date(strat.createdAt).toLocaleDateString('es')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleEditStrategy(strat)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#A855F7' }}>
                      <Edit3 size={12} /> Editar
                    </button>
                    <button onClick={() => setPage('bots')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[var(--green)]/10 text-[var(--green)] rounded-lg text-xs font-bold border border-[var(--green)]/20">
                      <Play size={12} /> Usar en Bot
                    </button>
                    <button onClick={() => removeStrategy(strat.id)}
                      className="p-1.5 text-[var(--text-dim)] hover:text-[var(--red)] transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Code2 size={32} className="text-[var(--text-dim)]/20 mx-auto mb-3" />
              <p className="text-sm text-[var(--text-dim)]">No tienes scripts custom aún</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">Crea tu primera estrategia personalizada</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Preset Templates Tab */}
      {activeTab === 'preset' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {PRESET_TEMPLATES.map((tmpl, i) => (
              <motion.div key={tmpl.name}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--gold)]/30 transition-colors">
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
                <button onClick={() => handleUseTemplate(tmpl)}
                  className="w-full py-1.5 bg-[var(--gold)]/20 text-[var(--gold)] rounded-lg text-xs font-bold hover:bg-[var(--gold)]/30 transition-colors">
                  Usar Plantilla
                </button>
              </motion.div>
            ))}
          </div>

          {/* Saved preset strategies */}
          {presetStrategies.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Guardadas ({presetStrategies.length})</h3>
              {presetStrategies.map(strat => (
                <div key={strat.id} className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{strat.name}</p>
                    <p className="text-xs text-[var(--text-dim)]">
                      {strat.entry?.condition} | SL: {strat.stopLoss}% | TP: {strat.takeProfit}%
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setPage('bots')}
                      className="px-3 py-1.5 bg-[var(--green)]/20 text-[var(--green)] rounded-lg text-xs font-bold">
                      <Play size={12} className="inline mr-1" /> Usar en Bot
                    </button>
                    <button onClick={() => removeStrategy(strat.id)} className="p-1.5 text-[var(--text-dim)] hover:text-[var(--red)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Strategy Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setShowEditor(false); setEditingStrategy(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <StrategyEditor
                initialCode={editingStrategy?.code}
                initialName={editingStrategy?.name}
                editMode={!!editingStrategy}
                onClose={() => { setShowEditor(false); setEditingStrategy(null); }}
                onSave={(strategy) => {
                  addStrategy(strategy);
                  setShowEditor(false);
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
