// Kairos Trade — Alert Panel (Premium v2)
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Trash2, TrendingUp, TrendingDown, Activity,
  Zap, ChevronRight, AlertTriangle, CheckCircle, X
} from 'lucide-react';
import useStore from '../../store/useStore';
import alertService from '../../services/alerts';
import { formatPair } from '../../utils/pairUtils';

const SIGNAL_TYPES = [
  { id: 'ema_cross', label: 'EMA Cruce', desc: 'EMA 20/50 crossover', icon: Activity },
  { id: 'rsi_oversold', label: 'RSI Sobreventa', desc: 'RSI < 30', icon: TrendingDown },
  { id: 'rsi_overbought', label: 'RSI Sobrecompra', desc: 'RSI > 70', icon: TrendingUp },
  { id: 'macd_cross', label: 'MACD Cruce', desc: 'MACD/Signal crossover', icon: Zap },
  { id: 'volume_spike', label: 'Spike Volumen', desc: 'Volumen > 2x promedio', icon: AlertTriangle },
];

export default function AlertPanel() {
  const { selectedPair } = useStore();
  const [alerts, setAlerts] = useState([]);
  const [triggered, setTriggered] = useState([]);
  const [tab, setTab] = useState('active'); // active | triggered | create
  const [form, setForm] = useState({
    type: 'price',
    condition: 'above',
    price: '',
    signalType: 'ema_cross',
    repeat: false,
  });

  useEffect(() => {
    setAlerts(alertService.getAlerts());
    setTriggered(alertService.getTriggered());

    const unsub = alertService.subscribe(() => {
      setAlerts([...alertService.getAlerts()]);
      setTriggered([...alertService.getTriggered()]);
    });

    alertService.requestPermission();
    return unsub;
  }, []);

  const handleCreate = () => {
    if (form.type === 'price') {
      if (!form.price) return;
      alertService.addPriceAlert(selectedPair, form.condition, form.price, { repeat: form.repeat });
    } else {
      alertService.addSignalAlert(selectedPair, form.signalType, { repeat: form.repeat });
    }
    setAlerts([...alertService.getAlerts()]);
    setForm({ type: 'price', condition: 'above', price: '', signalType: 'ema_cross', repeat: false });
    setTab('active');
  };

  const handleDelete = (id) => {
    alertService.removeAlert(id);
    setAlerts([...alertService.getAlerts()]);
  };

  const activeAlerts = alerts.filter(a => a.active);
  const inactiveAlerts = alerts.filter(a => !a.active);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Bell size={18} className="text-[var(--gold)] shrink-0" />
            Alertas
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            {activeAlerts.length} alerta{activeAlerts.length !== 1 ? 's' : ''} activa{activeAlerts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setTab('create')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 shrink-0"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
        >
          <Plus size={14} />
          Nueva Alerta
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(24,26,32,0.8)', border: '1px solid rgba(30,34,45,0.5)' }}>
        {[
          { id: 'active', label: `Activas (${activeAlerts.length})` },
          { id: 'triggered', label: `Disparadas (${triggered.length})` },
          { id: 'create', label: 'Crear' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200
              ${tab === t.id ? 'text-white' : 'text-[var(--text-dim)]'}`}
            style={tab === t.id ? { background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))', border: '1px solid rgba(59,130,246,0.15)' } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Create alert form */}
      <AnimatePresence>
        {tab === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl p-5 space-y-4"
            style={{
              background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
              border: '1px solid rgba(30,34,45,0.5)',
            }}
          >
            <h3 className="text-sm font-bold">Crear Alerta para {formatPair(selectedPair)}</h3>

            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setForm({ ...form, type: 'price' })}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all
                  ${form.type === 'price' ? 'bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/20' : 'bg-[var(--dark-3)] text-[var(--text-dim)] border border-transparent'}`}
              >
                Precio
              </button>
              <button
                onClick={() => setForm({ ...form, type: 'signal' })}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all
                  ${form.type === 'signal' ? 'bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/20' : 'bg-[var(--dark-3)] text-[var(--text-dim)] border border-transparent'}`}
              >
                Señal Técnica
              </button>
            </div>

            {form.type === 'price' ? (
              <>
                {/* Condition */}
                <div className="flex gap-2">
                  {['above', 'below'].map(c => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, condition: c })}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5
                        ${form.condition === c
                          ? c === 'above' ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/15' : 'bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/15'
                          : 'bg-[var(--dark-3)] text-[var(--text-dim)] border border-transparent'
                        }`}
                    >
                      {c === 'above' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {c === 'above' ? 'Sube a' : 'Baja a'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-dim)] mb-1.5 block font-medium">Precio objetivo (USD)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="Ej: 100000"
                    className="w-full"
                    step="any"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {SIGNAL_TYPES.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setForm({ ...form, signalType: s.id })}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left
                        ${form.signalType === s.id ? 'bg-[var(--gold)]/10 border border-[var(--gold)]/15' : 'bg-[var(--dark-3)] border border-transparent hover:border-[var(--border)]'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.signalType === s.id ? 'bg-[var(--gold)]/15' : 'bg-[var(--dark-4)]'}`}>
                        <Icon size={14} className={form.signalType === s.id ? 'text-[var(--gold)]' : 'text-[var(--text-dim)]'} />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{s.label}</p>
                        <p className="text-[10px] text-[var(--text-dim)]">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Repeat toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-colors relative ${form.repeat ? 'bg-[var(--gold)]' : 'bg-[var(--dark-4)]'}`}
                onClick={() => setForm({ ...form, repeat: !form.repeat })}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.repeat ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-[var(--text-dim)]">Repetir alerta</span>
            </label>

            <button
              onClick={handleCreate}
              disabled={form.type === 'price' && !form.price}
              className="w-full py-3 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 15px rgba(59,130,246,0.25)' }}
            >
              Crear Alerta
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active alerts list */}
      {tab === 'active' && (
        <div className="space-y-2">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={40} className="mx-auto text-[var(--text-dim)]/20 mb-3" />
              <p className="text-sm text-[var(--text-dim)]">No hay alertas activas</p>
              <button onClick={() => setTab('create')} className="text-xs text-[var(--gold)] mt-2 font-semibold">
                Crear primera alerta →
              </button>
            </div>
          ) : activeAlerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl group"
              style={{
                background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
                border: '1px solid rgba(30,34,45,0.5)',
              }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: alert.type === 'price' ? 'rgba(59,130,246,0.08)' : 'rgba(139,92,246,0.08)' }}>
                {alert.type === 'price'
                  ? (alert.condition === 'above' ? <TrendingUp size={16} className="text-[var(--green)]" /> : <TrendingDown size={16} className="text-[var(--red)]" />)
                  : <Zap size={16} className="text-purple-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate">{alert.symbol}</p>
                <p className="text-[11px] text-[var(--text-dim)] truncate">{alert.message}</p>
              </div>
              <div className="flex items-center gap-2">
                {alert.repeat && (
                  <span className="text-[9px] font-bold text-[var(--gold)] bg-[var(--gold)]/10 px-1.5 py-0.5 rounded">↻</span>
                )}
                <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--red)] hover:bg-[var(--red)]/[0.06] transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Triggered alerts list */}
      {tab === 'triggered' && (
        <div className="space-y-2">
          {triggered.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle size={40} className="mx-auto text-[var(--text-dim)]/20 mb-3" />
              <p className="text-sm text-[var(--text-dim)]">No hay alertas disparadas</p>
            </div>
          ) : [...triggered].reverse().map((alert, i) => (
            <motion.div
              key={`${alert.id}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(14,203,129,0.04), rgba(17,19,24,0.6))',
                border: '1px solid rgba(14,203,129,0.08)',
              }}
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--green)]/[0.08] flex items-center justify-center shrink-0">
                <CheckCircle size={16} className="text-[var(--green)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate">{alert.symbol}</p>
                <p className="text-[11px] text-[var(--text-dim)] truncate">{alert.message}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-[var(--green)]">${alert.triggeredPrice?.toLocaleString()}</p>
                <p className="text-[9px] text-[var(--text-dim)]">
                  {new Date(alert.triggeredAt).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
