// Kairos Trade — Trade History
import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, TrendingUp, TrendingDown, Download, Filter } from 'lucide-react';
import useStore from '../../store/useStore';

export default function TradeHistory() {
  const { tradeHistory, positions } = useStore();
  const [tab, setTab] = useState('open'); // open | closed

  const totalPnl = tradeHistory.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const wins = tradeHistory.filter(t => (t.pnl || 0) > 0).length;
  const winRate = tradeHistory.length > 0 ? (wins / tradeHistory.length * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Historial de Trading</h1>
          <p className="text-sm text-[var(--text-dim)]">
            {tradeHistory.length} trades cerrados • {positions.length} posiciones abiertas
          </p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--dark-3)] text-[var(--text-dim)] rounded-lg text-xs hover:text-[var(--text)] transition-colors">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--text-dim)]">Total Trades</p>
          <p className="text-lg font-bold">{tradeHistory.length}</p>
        </div>
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--text-dim)]">P&L Total</p>
          <p className={`text-lg font-bold ${totalPnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--text-dim)]">Win Rate</p>
          <p className="text-lg font-bold text-[var(--gold)]">{winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--text-dim)]">Posiciones Abiertas</p>
          <p className="text-lg font-bold text-[var(--blue)]">{positions.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--dark-3)] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('open')}
          className={`px-4 py-1.5 text-sm rounded-md ${tab === 'open' ? 'bg-[var(--gold)] text-black font-bold' : 'text-[var(--text-dim)]'}`}
        >
          Abiertas ({positions.length})
        </button>
        <button
          onClick={() => setTab('closed')}
          className={`px-4 py-1.5 text-sm rounded-md ${tab === 'closed' ? 'bg-[var(--gold)] text-black font-bold' : 'text-[var(--text-dim)]'}`}
        >
          Cerradas ({tradeHistory.length})
        </button>
      </div>

      {/* Trade list */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-dim)] text-xs">
              <th className="text-left p-3">Par</th>
              <th className="text-left p-3">Lado</th>
              <th className="text-right p-3">Entrada</th>
              <th className="text-right p-3">Cantidad</th>
              <th className="text-right p-3">P&L</th>
              <th className="text-right p-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {(tab === 'open' ? positions : tradeHistory).length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--text-dim)]">
                  {tab === 'open' ? 'Sin posiciones abiertas' : 'Sin trades cerrados'}
                </td>
              </tr>
            ) : (tab === 'open' ? positions : tradeHistory).map((trade, i) => (
              <tr key={trade.id || i} className="border-b border-[var(--border)] hover:bg-[var(--dark-3)] transition-colors">
                <td className="p-3 font-bold">{trade.symbol}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                    ${trade.side === 'buy' ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--red)]/20 text-[var(--red)]'}`}>
                    {trade.side?.toUpperCase()}
                  </span>
                </td>
                <td className="p-3 text-right font-mono">${trade.entryPrice?.toFixed(2)}</td>
                <td className="p-3 text-right font-mono">{trade.quantity}</td>
                <td className={`p-3 text-right font-mono font-bold ${(trade.pnl || 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                </td>
                <td className="p-3 text-right text-xs text-[var(--text-dim)]">
                  {new Date(trade.openedAt || trade.closedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
