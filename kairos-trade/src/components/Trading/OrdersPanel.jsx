// Kairos Trade — Orders Panel (below chart)
import { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Bot } from 'lucide-react';
import useStore from '../../store/useStore';

export default function OrdersPanel() {
  const { positions, orders, tradeHistory, bots, currentPrice, closePosition, cancelOrder } = useStore();
  const [tab, setTab] = useState('positions');
  const [collapsed, setCollapsed] = useState(false);

  // Gather bot trades from all active/stopped bots
  const botTrades = bots.flatMap(bot => {
    const trades = bot.tradeLog || bot.trades_log || [];
    return trades.map(t => ({ ...t, botName: bot.name, botId: bot.id }));
  }).sort((a, b) => new Date(b.time || b.timestamp || 0) - new Date(a.time || a.timestamp || 0));

  const activeBots = bots.filter(b => b.status === 'active');

  const tabs = [
    { id: 'positions', label: 'Posiciones', count: positions.length },
    { id: 'orders', label: 'Órdenes', count: orders.length },
    { id: 'botTrades', label: 'Bot Trades', count: botTrades.length },
    { id: 'history', label: 'Historial', count: tradeHistory.length },
  ];

  if (collapsed) {
    return (
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer shrink-0 select-none"
        style={{ borderTop: '1px solid rgba(30,34,45,0.6)', background: 'rgba(14,16,21,0.95)' }}
        onClick={() => setCollapsed(false)}
      >
        <div className="flex items-center gap-3">
          {tabs.map(t => (
            <span key={t.id} className="text-[10px] text-[var(--text-dim)] font-medium">
              {t.label} <span className="text-[var(--text-dim)]/60">({t.count})</span>
            </span>
          ))}
        </div>
        <ChevronUp size={14} className="text-[var(--text-dim)]" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        height: 200,
        borderTop: '1px solid rgba(30,34,45,0.6)',
        background: 'rgba(14,16,21,0.95)',
      }}
    >
      {/* Tab bar */}
      <div className="flex items-center shrink-0 px-1" style={{ borderBottom: '1px solid rgba(30,34,45,0.4)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[11px] font-semibold transition-colors relative
              ${tab === t.id ? 'text-[var(--text)]' : 'text-[var(--text-dim)] hover:text-[var(--text-secondary)]'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold
                ${tab === t.id ? 'bg-[var(--gold)]/15 text-[var(--gold)]' : 'bg-white/5 text-[var(--text-dim)]'}`}>
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <div className="absolute bottom-0 left-1 right-1 h-[2px] rounded-t-full bg-[var(--gold)]" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text)] transition-colors mr-1"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {/* ── Positions ── */}
        {tab === 'positions' && (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider">
                <th className="text-left py-1.5 px-3 font-semibold">Par</th>
                <th className="text-left py-1.5 px-2 font-semibold">Lado</th>
                <th className="text-right py-1.5 px-2 font-semibold">Cantidad</th>
                <th className="text-right py-1.5 px-2 font-semibold">Entrada</th>
                <th className="text-right py-1.5 px-2 font-semibold">Actual</th>
                <th className="text-right py-1.5 px-2 font-semibold">P&L</th>
                <th className="text-right py-1.5 px-2 font-semibold">SL</th>
                <th className="text-right py-1.5 px-2 font-semibold">TP</th>
                <th className="text-right py-1.5 px-3 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-[var(--text-dim)]/50 text-xs">Sin posiciones abiertas</td></tr>
              ) : positions.map(pos => {
                const price = currentPrice || pos.entryPrice;
                const pnl = pos.side === 'buy'
                  ? (price - pos.entryPrice) * pos.quantity
                  : (pos.entryPrice - price) * pos.quantity;
                const pnlPct = ((pnl / (pos.entryPrice * pos.quantity)) * 100);
                return (
                  <tr key={pos.id} className="border-b border-[var(--border)]/30 hover:bg-white/[0.015] transition-colors">
                    <td className="py-1.5 px-3 font-bold text-[var(--text)]">{pos.symbol}</td>
                    <td className="py-1.5 px-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pos.side === 'buy' ? 'text-[var(--green)] bg-[var(--green)]/10' : 'text-[var(--red)] bg-[var(--red)]/10'}`}>
                        {pos.side === 'buy' ? 'LONG' : 'SHORT'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{pos.quantity}</td>
                    <td className="py-1.5 px-2 text-right font-mono">${Number(pos.entryPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-2 text-right font-mono">${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={`py-1.5 px-2 text-right font-mono font-bold ${pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} <span className="text-[9px] opacity-70">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-[var(--red)]">{pos.stopLoss ? `$${pos.stopLoss}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-[var(--green)]">{pos.takeProfit ? `$${pos.takeProfit}` : '—'}</td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        onClick={() => closePosition(pos.id)}
                        className="text-[10px] font-semibold text-[var(--text-dim)] hover:text-[var(--red)] px-2 py-1 rounded-md hover:bg-[var(--red)]/10 transition-all"
                      >
                        Cerrar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ── Orders ── */}
        {tab === 'orders' && (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider">
                <th className="text-left py-1.5 px-3 font-semibold">Par</th>
                <th className="text-left py-1.5 px-2 font-semibold">Tipo</th>
                <th className="text-left py-1.5 px-2 font-semibold">Lado</th>
                <th className="text-right py-1.5 px-2 font-semibold">Precio</th>
                <th className="text-right py-1.5 px-2 font-semibold">Cantidad</th>
                <th className="text-right py-1.5 px-2 font-semibold">Total</th>
                <th className="text-left py-1.5 px-2 font-semibold">Fecha</th>
                <th className="text-right py-1.5 px-3 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-[var(--text-dim)]/50 text-xs">Sin órdenes pendientes</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className="border-b border-[var(--border)]/30 hover:bg-white/[0.015] transition-colors">
                  <td className="py-1.5 px-3 font-bold text-[var(--text)]">{order.symbol}</td>
                  <td className="py-1.5 px-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-secondary)]">
                      {order.type === 'limit' ? 'LIMIT' : order.type === 'stop_loss' ? 'STOP' : 'MARKET'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2">
                    <span className={`text-[10px] font-bold ${order.side === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {order.side === 'buy' ? 'COMPRA' : 'VENTA'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono">${Number(order.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{order.quantity}</td>
                  <td className="py-1.5 px-2 text-right font-mono">${(order.price * order.quantity).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-[var(--text-dim)]">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="text-[10px] font-semibold text-[var(--text-dim)] hover:text-[var(--red)] px-2 py-1 rounded-md hover:bg-[var(--red)]/10 transition-all"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Bot Trades ── */}
        {tab === 'botTrades' && (
          <div>
            {/* Active bots summary */}
            {activeBots.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: '1px solid rgba(30,34,45,0.3)' }}>
                <Bot size={12} className="text-[var(--gold)]" />
                <span className="text-[10px] text-[var(--text-dim)]">
                  {activeBots.length} bot{activeBots.length > 1 ? 's' : ''} activo{activeBots.length > 1 ? 's' : ''}
                </span>
                {activeBots.map(bot => (
                  <span key={bot.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)] font-semibold">
                    {bot.name} • {bot.trades || 0} trades • P&L: {(bot.pnl || 0) >= 0 ? '+' : ''}${(bot.pnl || 0).toFixed(2)}
                  </span>
                ))}
              </div>
            )}
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider">
                  <th className="text-left py-1.5 px-3 font-semibold">Bot</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Par</th>
                  <th className="text-left py-1.5 px-2 font-semibold">Señal</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Precio</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Cantidad</th>
                  <th className="text-right py-1.5 px-2 font-semibold">P&L</th>
                  <th className="text-left py-1.5 px-3 font-semibold">Hora</th>
                </tr>
              </thead>
              <tbody>
                {botTrades.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-[var(--text-dim)]/50 text-xs">
                    {bots.length === 0 ? 'No hay bots configurados' : 'Los bots no han ejecutado trades aún'}
                  </td></tr>
                ) : botTrades.slice(0, 50).map((trade, i) => (
                  <tr key={i} className="border-b border-[var(--border)]/30 hover:bg-white/[0.015] transition-colors">
                    <td className="py-1.5 px-3 font-semibold text-[var(--gold)]">{trade.botName || 'Bot'}</td>
                    <td className="py-1.5 px-2 font-bold text-[var(--text)]">{trade.symbol || trade.pair || '—'}</td>
                    <td className="py-1.5 px-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                        ${trade.signal === 'buy' || trade.side === 'buy'
                          ? 'text-[var(--green)] bg-[var(--green)]/10'
                          : trade.signal === 'sell' || trade.side === 'sell'
                            ? 'text-[var(--red)] bg-[var(--red)]/10'
                            : 'text-[var(--text-dim)] bg-white/5'
                        }`}>
                        {(trade.signal || trade.side || 'HOLD').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      {trade.price ? `$${Number(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{trade.quantity || trade.amount || '—'}</td>
                    <td className={`py-1.5 px-2 text-right font-mono font-bold
                      ${(trade.pnl || 0) > 0 ? 'text-[var(--green)]' : (trade.pnl || 0) < 0 ? 'text-[var(--red)]' : 'text-[var(--text-dim)]'}`}>
                      {trade.pnl != null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-[var(--text-dim)]">
                      {(trade.time || trade.timestamp) ? new Date(trade.time || trade.timestamp).toLocaleString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── History ── */}
        {tab === 'history' && (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[var(--text-dim)] text-[10px] uppercase tracking-wider">
                <th className="text-left py-1.5 px-3 font-semibold">Par</th>
                <th className="text-left py-1.5 px-2 font-semibold">Lado</th>
                <th className="text-right py-1.5 px-2 font-semibold">Entrada</th>
                <th className="text-right py-1.5 px-2 font-semibold">Salida</th>
                <th className="text-right py-1.5 px-2 font-semibold">Cantidad</th>
                <th className="text-right py-1.5 px-2 font-semibold">P&L</th>
                <th className="text-left py-1.5 px-3 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[var(--text-dim)]/50 text-xs">Sin trades cerrados</td></tr>
              ) : [...tradeHistory].reverse().slice(0, 50).map((trade, i) => (
                <tr key={trade.id || i} className="border-b border-[var(--border)]/30 hover:bg-white/[0.015] transition-colors">
                  <td className="py-1.5 px-3 font-bold text-[var(--text)]">{trade.symbol}</td>
                  <td className="py-1.5 px-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${trade.side === 'buy' ? 'text-[var(--green)] bg-[var(--green)]/10' : 'text-[var(--red)] bg-[var(--red)]/10'}`}>
                      {trade.side === 'buy' ? 'LONG' : 'SHORT'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono">${Number(trade.entryPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-mono">${trade.exitPrice ? Number(trade.exitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{trade.quantity}</td>
                  <td className={`py-1.5 px-2 text-right font-mono font-bold ${(trade.pnl || 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                  </td>
                  <td className="py-1.5 px-3 text-[var(--text-dim)]">
                    {trade.closedAt ? new Date(trade.closedAt).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
