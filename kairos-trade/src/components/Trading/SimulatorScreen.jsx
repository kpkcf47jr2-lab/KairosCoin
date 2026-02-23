// Kairos Trade — Paper Trading Simulator Screen
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, TrendingUp, TrendingDown,
  DollarSign, Target, Shield, Award, BarChart3, ArrowUpRight, ArrowDownRight, X
} from 'lucide-react';
import useStore from '../../store/useStore';
import simulator from '../../services/simulator';
import { POPULAR_PAIRS } from '../../constants';

export default function SimulatorScreen() {
  const { selectedPair, currentPrice, setPage } = useStore();
  const [state, setState] = useState(simulator.getState());
  const [perf, setPerf] = useState(simulator.getPerformance());
  const [form, setForm] = useState({ quantity: '', stopLoss: '', takeProfit: '', side: 'buy' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Auto-update positions every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await simulator.updatePositions();
      setState({ ...updated });
      setPerf(simulator.getPerformance());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(async () => {
    const updated = await simulator.updatePositions();
    setState({ ...updated });
    setPerf(simulator.getPerformance());
  }, []);

  const handleTrade = async () => {
    if (!form.quantity || !currentPrice) return;
    setLoading(true);
    try {
      const result = await simulator.openPosition(selectedPair, form.side, parseFloat(form.quantity), {
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
      });
      setMsg({ type: 'success', text: result.message });
      setForm({ ...form, quantity: '', stopLoss: '', takeProfit: '' });
      await refresh();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setLoading(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleClose = async (posId) => {
    try {
      const result = await simulator.closePosition(posId);
      setMsg({ type: result.trade.pnl >= 0 ? 'success' : 'error', text: result.message });
      await refresh();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleReset = () => {
    simulator.reset(10000);
    setState(simulator.getState());
    setPerf(simulator.getPerformance());
    setMsg({ type: 'success', text: 'Simulador reiniciado con $10,000' });
    setTimeout(() => setMsg(null), 2000);
  };

  const returnPct = perf.returnPct || 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Play size={20} className="text-[var(--gold)]" />
            Paper Trading Simulator
          </h1>
          <p className="text-sm text-[var(--text-dim)]">Practica con datos reales, sin arriesgar dinero real</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-1.5 bg-[var(--dark-3)] text-[var(--text-dim)] rounded-lg text-xs hover:text-[var(--text)] transition-colors">
            Actualizar
          </button>
          <button onClick={handleReset} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--red)]/20 text-[var(--red)] rounded-lg text-xs font-bold hover:bg-[var(--red)]/30 transition-colors">
            <RotateCcw size={12} /> Reiniciar
          </button>
        </div>
      </div>

      {/* Toast message */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-xl text-sm font-bold text-center ${
              msg.type === 'success' ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--red)]/20 text-[var(--red)]'
            }`}
          >
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance grid */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Balance', value: `$${perf.balance?.toFixed(2)}`, icon: DollarSign, color: 'var(--gold)' },
          { label: 'Equity', value: `$${perf.equity?.toFixed(2)}`, icon: BarChart3, color: 'var(--blue)' },
          { label: 'Retorno', value: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`, icon: returnPct >= 0 ? TrendingUp : TrendingDown, color: returnPct >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Win Rate', value: `${(perf.winRate || 0).toFixed(0)}%`, icon: Award, color: 'var(--gold)' },
          { label: 'Trades', value: perf.totalTrades || 0, icon: Target, color: 'var(--text)' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3 text-center"
            >
              <Icon size={16} style={{ color: s.color }} className="mx-auto mb-1" />
              <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[var(--text-dim)]">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'P&L Total', value: `${perf.totalPnl >= 0 ? '+' : ''}$${(perf.totalPnl || 0).toFixed(2)}`, color: (perf.totalPnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Mejor Trade', value: `+$${(perf.bestTrade || 0).toFixed(2)}`, color: 'var(--green)' },
          { label: 'Peor Trade', value: `$${(perf.worstTrade || 0).toFixed(2)}`, color: 'var(--red)' },
          { label: 'Max Drawdown', value: `${(perf.maxDrawdown || 0).toFixed(1)}%`, color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3">
            <p className="text-xs text-[var(--text-dim)]">{s.label}</p>
            <p className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Open position form */}
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold">Abrir Posición (Demo)</h3>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--gold)]">{selectedPair}</span>
            <span className="text-sm font-mono">${currentPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '---'}</span>
            <button onClick={() => setPage('chart')} className="text-xs text-[var(--gold)] hover:underline ml-auto">
              Ver gráfico →
            </button>
          </div>

          {/* Buy/Sell */}
          <div className="flex gap-1 bg-[var(--dark-3)] rounded-lg p-1">
            <button
              onClick={() => setForm({ ...form, side: 'buy' })}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${form.side === 'buy' ? 'bg-[var(--green)] text-white' : 'text-[var(--text-dim)]'}`}
            >
              COMPRAR
            </button>
            <button
              onClick={() => setForm({ ...form, side: 'sell' })}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${form.side === 'sell' ? 'bg-[var(--red)] text-white' : 'text-[var(--text-dim)]'}`}
            >
              VENDER
            </button>
          </div>

          <div>
            <label className="text-xs text-[var(--text-dim)] mb-1 block">Cantidad</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="Ej: 0.01"
              className="w-full text-sm"
            />
            {form.quantity && currentPrice && (
              <p className="text-[10px] text-[var(--text-dim)] mt-1">
                Costo: ${(parseFloat(form.quantity) * currentPrice).toFixed(2)} de ${perf.balance?.toFixed(2)} disponible
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[var(--text-dim)] mb-1 flex items-center gap-1">
                <Shield size={10} /> Stop Loss
              </label>
              <input
                type="number"
                value={form.stopLoss}
                onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
                placeholder="Precio"
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-dim)] mb-1 flex items-center gap-1">
                <Target size={10} /> Take Profit
              </label>
              <input
                type="number"
                value={form.takeProfit}
                onChange={(e) => setForm({ ...form, takeProfit: e.target.value })}
                placeholder="Precio"
                className="w-full text-xs"
              />
            </div>
          </div>

          <button
            onClick={handleTrade}
            disabled={!form.quantity || !currentPrice || loading}
            className={`w-full py-3 font-bold rounded-xl text-sm transition-colors disabled:opacity-50 ${
              form.side === 'buy' ? 'bg-[var(--green)] text-white' : 'bg-[var(--red)] text-white'
            }`}
          >
            {loading ? 'Ejecutando...' : `${form.side === 'buy' ? 'Comprar' : 'Vender'} ${selectedPair.replace('USDT', '')} (Demo)`}
          </button>
        </div>

        {/* Open positions */}
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">Posiciones Abiertas ({state.positions.length})</h3>
          {state.positions.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)] text-center py-8">Sin posiciones abiertas</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {state.positions.map(pos => (
                <div key={pos.id} className="bg-[var(--dark-3)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${pos.side === 'buy' ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--red)]/20 text-[var(--red)]'}`}>
                        {pos.side.toUpperCase()}
                      </span>
                      <span className="text-sm font-bold">{pos.symbol}</span>
                    </div>
                    <button
                      onClick={() => handleClose(pos.id)}
                      className="px-2 py-0.5 bg-[var(--dark-4)] text-[var(--text-dim)] rounded text-[10px] hover:bg-[var(--red)]/20 hover:text-[var(--red)] transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-[var(--text-dim)]">Entrada</span>
                      <p className="font-mono">${pos.entryPrice?.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-dim)]">Actual</span>
                      <p className="font-mono">${pos.currentPrice?.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-dim)]">P&L</span>
                      <p className={`font-mono font-bold ${pos.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl?.toFixed(2)} ({pos.pnlPercent?.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Closed trades history */}
      {state.closedTrades.length > 0 && (
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="p-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-bold">Historial de Trades (Demo)</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-dim)] border-b border-[var(--border)]">
                  <th className="text-left p-2">Par</th>
                  <th className="text-left p-2">Lado</th>
                  <th className="text-right p-2">Entrada</th>
                  <th className="text-right p-2">Salida</th>
                  <th className="text-right p-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {state.closedTrades.slice().reverse().map(t => (
                  <tr key={t.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--dark-3)]">
                    <td className="p-2 font-bold">{t.symbol}</td>
                    <td className="p-2">
                      <span className={t.side === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                        {t.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono">${t.entryPrice?.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">${t.exitPrice?.toFixed(2)}</td>
                    <td className={`p-2 text-right font-mono font-bold ${t.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demo disclaimer */}
      <div className="text-center text-xs text-[var(--text-dim)] pb-4">
        <p>⚠️ Esto es un simulador con datos reales del mercado. No se usa dinero real.</p>
        <p className="text-[var(--gold)] mt-1">Practica tus estrategias sin riesgo.</p>
      </div>
    </div>
  );
}
