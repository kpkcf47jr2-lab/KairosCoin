// Kairos Trade — Mobile Pro Trading View (Coinbase/BingX Style)
// Full-screen trading experience optimized for mobile devices
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, X,
  ArrowUpCircle, ArrowDownCircle, Bot, BarChart3, 
  Layers, Shield, Target, Clock, DollarSign,
  CandlestickChart, Activity
} from 'lucide-react';
import useStore from '../../store/useStore';
import marketData from '../../services/marketData';
import { toApiPair, getBase, formatPair, QUOTE } from '../../utils/pairUtils';
import { TIMEFRAMES } from '../../constants';

const TradingChart = lazy(() => import('../Chart/TradingChart'));
const DepthChart = lazy(() => import('../Chart/DepthChart'));

/* ── Helpers ── */
function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '---';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function PnlText({ value, size = 'sm' }) {
  const v = Number(value) || 0;
  const color = v >= 0 ? 'var(--green)' : 'var(--red)';
  const prefix = v >= 0 ? '+' : '';
  return (
    <span style={{ color, fontSize: size === 'xs' ? '11px' : '13px' }} className="font-bold font-mono">
      {prefix}${fmt(v)}
    </span>
  );
}

/* ── Mini Loader ── */
function MiniLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   MOBILE ORDER SHEET  (Bottom Sheet)
   ═══════════════════════════════════════════ */
function MobileOrderSheet({ isOpen, onClose }) {
  const { selectedPair, currentPrice, addPosition, addOrder } = useStore();
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [form, setForm] = useState({ quantity: '', price: '', stopLoss: '', takeProfit: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const total = parseFloat(form.quantity || 0) * (orderType === 'market' ? (currentPrice || 0) : parseFloat(form.price || 0));

  const handleSubmit = () => {
    if (!form.quantity) return;
    const price = orderType === 'market' ? currentPrice : parseFloat(form.price);
    if (!price) return;

    if (orderType === 'market') {
      addPosition({
        symbol: selectedPair,
        side,
        quantity: parseFloat(form.quantity),
        entryPrice: price,
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
        openedAt: new Date().toISOString(),
      });
    } else {
      addOrder({
        symbol: selectedPair, side, type: orderType,
        quantity: parseFloat(form.quantity), price,
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
        status: 'open', createdAt: new Date().toISOString(),
      });
    }
    setForm({ quantity: '', price: '', stopLoss: '', takeProfit: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50" onClick={onClose}
      />
      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
        style={{ background: 'var(--surface)', maxHeight: '85vh', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border-light)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">{formatPair(selectedPair)}</span>
            <span className="text-sm font-mono font-bold" style={{ color: 'var(--gold)' }}>
              ${fmt(currentPrice)}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--dark-3)]">
            <X size={18} className="text-[var(--text-dim)]" />
          </button>
        </div>

        <div className="px-4 pb-6 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>
          {/* Buy/Sell toggle */}
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'var(--dark-3)', border: '1px solid var(--border)' }}>
            <button onClick={() => setSide('buy')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${side === 'buy' ? 'text-white' : 'text-[var(--text-dim)]'}`}
              style={side === 'buy' ? { background: 'linear-gradient(135deg, #0ECB81, #0AA06A)', boxShadow: '0 4px 15px rgba(14,203,129,0.3)' } : {}}>
              <div className="flex items-center justify-center gap-1.5">
                <ArrowUpCircle size={16} /> Long / Comprar
              </div>
            </button>
            <button onClick={() => setSide('sell')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${side === 'sell' ? 'text-white' : 'text-[var(--text-dim)]'}`}
              style={side === 'sell' ? { background: 'linear-gradient(135deg, #F6465D, #D32F4A)', boxShadow: '0 4px 15px rgba(246,70,93,0.3)' } : {}}>
              <div className="flex items-center justify-center gap-1.5">
                <ArrowDownCircle size={16} /> Short / Vender
              </div>
            </button>
          </div>

          {/* Order type pills */}
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--dark-3)]">
            {[['market', 'Market'], ['limit', 'Límite'], ['stop_loss', 'Stop']].map(([val, label]) => (
              <button key={val} onClick={() => setOrderType(val)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType === val ? 'bg-[var(--dark-5)] text-[var(--text)] shadow' : 'text-[var(--text-dim)]'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Price input (limit/stop only) */}
          {orderType !== 'market' && (
            <div>
              <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-bold uppercase tracking-wider">Precio</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder={currentPrice?.toString()} className="w-full text-sm" style={{ height: 44 }} />
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-bold uppercase tracking-wider">Cantidad ({getBase(selectedPair)})</label>
            <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
              placeholder="0.001" className="w-full text-sm" style={{ height: 44 }} />
            <div className="flex gap-1.5 mt-2">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct}
                  onClick={() => {
                    const price = orderType === 'market' ? currentPrice : parseFloat(form.price) || currentPrice;
                    if (price) setForm({ ...form, quantity: ((10000 * pct / 100) / price).toFixed(6) });
                  }}
                  className="flex-1 py-2 text-xs font-bold rounded-lg text-[var(--text-dim)] hover:text-[var(--gold)] transition-all"
                  style={{ background: 'var(--dark-3)', border: '1px solid var(--border)' }}>
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Advanced (SL/TP) toggle */}
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)] font-semibold">
            <Shield size={12} /> Stop Loss & Take Profit
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--red)] mb-1 flex items-center gap-1 font-bold uppercase">
                  <Shield size={9} /> SL
                </label>
                <input type="number" value={form.stopLoss} onChange={e => setForm({ ...form, stopLoss: e.target.value })}
                  placeholder="Precio" className="w-full text-xs" style={{ height: 40 }} />
              </div>
              <div>
                <label className="text-[10px] text-[var(--green)] mb-1 flex items-center gap-1 font-bold uppercase">
                  <Target size={9} /> TP
                </label>
                <input type="number" value={form.takeProfit} onChange={e => setForm({ ...form, takeProfit: e.target.value })}
                  placeholder="Precio" className="w-full text-xs" style={{ height: 40 }} />
              </div>
            </div>
          )}

          {/* Total */}
          <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--dark-3)', border: '1px solid var(--border)' }}>
            <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase">Total</span>
            <span className="text-base font-mono font-bold">${fmt(total)}</span>
          </div>

          {/* Submit button */}
          <button onClick={handleSubmit} disabled={!form.quantity}
            className="w-full py-4 font-bold rounded-xl text-base transition-all disabled:opacity-40 text-white"
            style={side === 'buy'
              ? { background: 'linear-gradient(135deg, #0ECB81, #0AA06A)', boxShadow: '0 4px 20px rgba(14,203,129,0.3)' }
              : { background: 'linear-gradient(135deg, #F6465D, #D32F4A)', boxShadow: '0 4px 20px rgba(246,70,93,0.3)' }}>
            {side === 'buy' ? '🟢 Comprar' : '🔴 Vender'} {getBase(selectedPair)}
          </button>

          {/* Paper trading badge */}
          <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[9px] font-bold text-amber-400 tracking-wider uppercase">Simulador — Paper Trading</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════
   MOBILE BOTTOM INFO PANEL (Positions/Bots)
   ═══════════════════════════════════════════ */
function MobileInfoPanel({ activeTab, onTabChange }) {
  const { positions, orders, bots, tradeHistory, currentPrice, closePosition, cancelOrder } = useStore();
  const activeBots = bots.filter(b => b.status === 'active');

  const botTrades = bots.flatMap(bot => {
    const trades = bot.tradeLog || bot.trades_log || [];
    return trades.map(t => ({ ...t, botName: bot.name }));
  }).sort((a, b) => new Date(b.time || b.timestamp || 0) - new Date(a.time || a.timestamp || 0));

  const tabs = [
    { id: 'positions', label: 'Posiciones', count: positions.length, icon: Layers },
    { id: 'orders', label: 'Órdenes', count: orders.length, icon: Clock },
    { id: 'bots', label: 'Bots', count: activeBots.length, icon: Bot },
    { id: 'history', label: 'Historial', count: tradeHistory.length, icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
      {/* Tab bar — scrollable horizontal */}
      <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)', WebkitOverflowScrolling: 'touch' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-1 px-3 py-2.5 text-[11px] font-bold whitespace-nowrap transition-colors shrink-0
                ${activeTab === t.id ? 'text-[var(--gold)]' : 'text-[var(--text-dim)]'}`}
              style={activeTab === t.id ? { borderBottom: '2px solid var(--gold)' } : { borderBottom: '2px solid transparent' }}>
              <Icon size={12} />
              {t.label}
              {t.count > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: activeTab === t.id ? 'var(--gold)' : 'var(--dark-4)', color: activeTab === t.id ? '#fff' : 'var(--text-dim)' }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content — scrollable */}
      <div className="overflow-y-auto" style={{ maxHeight: '35vh' }}>

        {/* ── Positions ── */}
        {activeTab === 'positions' && (
          <div className="p-2 space-y-1.5">
            {positions.length === 0 ? (
              <div className="text-center py-6">
                <Layers size={24} className="mx-auto mb-1.5 opacity-20" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs text-[var(--text-dim)]">Sin posiciones abiertas</p>
              </div>
            ) : positions.map(pos => {
              const pnl = pos.side === 'buy'
                ? (currentPrice - pos.entryPrice) * pos.quantity
                : (pos.entryPrice - currentPrice) * pos.quantity;
              const pnlPct = ((pnl / (pos.entryPrice * pos.quantity)) * 100);
              return (
                <div key={pos.id} className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ background: 'var(--dark-3)', border: `1px solid ${pnl >= 0 ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)'}` }}>
                  {/* Side indicator */}
                  <div className="w-1 h-10 rounded-full shrink-0"
                    style={{ background: pos.side === 'buy' ? 'var(--green)' : 'var(--red)' }} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">{formatPair(pos.symbol)}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pos.side === 'buy' ? 'text-[var(--green)] bg-[var(--green)]/[0.1]' : 'text-[var(--red)] bg-[var(--red)]/[0.1]'}`}>
                        {pos.side === 'buy' ? 'LONG' : 'SHORT'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--text-dim)]">Entrada: ${fmt(pos.entryPrice)}</span>
                      <span className="text-[10px] text-[var(--text-dim)]">Qty: {pos.quantity}</span>
                    </div>
                  </div>
                  {/* P&L */}
                  <div className="text-right shrink-0">
                    <PnlText value={pnl} size="sm" />
                    <div className="text-[9px] font-mono" style={{ color: pnl >= 0 ? 'var(--green)' : 'var(--red)', opacity: 0.7 }}>
                      {pnlPct >= 0 ? '+' : ''}{fmt(pnlPct, 1)}%
                    </div>
                  </div>
                  {/* Close button */}
                  <button onClick={() => closePosition(pos.id)}
                    className="p-1.5 rounded-lg shrink-0 hover:bg-[var(--red)]/[0.1]"
                    style={{ border: '1px solid rgba(246,70,93,0.15)' }}>
                    <X size={12} className="text-[var(--red)]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Orders ── */}
        {activeTab === 'orders' && (
          <div className="p-2 space-y-1.5">
            {orders.length === 0 ? (
              <div className="text-center py-6">
                <Clock size={24} className="mx-auto mb-1.5 opacity-20" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs text-[var(--text-dim)]">Sin órdenes pendientes</p>
              </div>
            ) : orders.map(order => (
              <div key={order.id} className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ background: 'var(--dark-3)', border: '1px solid var(--border)' }}>
                <div className="w-1 h-10 rounded-full shrink-0"
                  style={{ background: order.side === 'buy' ? 'var(--green)' : 'var(--red)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">{formatPair(order.symbol)}</span>
                    <span className="text-[9px] font-bold text-[var(--text-dim)] bg-[var(--dark-4)] px-1.5 py-0.5 rounded uppercase">
                      {order.type}
                    </span>
                    <span className={`text-[9px] font-bold ${order.side === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {order.side.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-dim)]">
                    ${fmt(order.price)} × {order.quantity}
                  </span>
                </div>
                <button onClick={() => cancelOrder(order.id)}
                  className="p-1.5 rounded-lg shrink-0 hover:bg-[var(--red)]/[0.1]"
                  style={{ border: '1px solid var(--border)' }}>
                  <X size={12} className="text-[var(--text-dim)]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Bots with live P&L ── */}
        {activeTab === 'bots' && (
          <div className="p-2 space-y-1.5">
            {bots.length === 0 ? (
              <div className="text-center py-6">
                <Bot size={24} className="mx-auto mb-1.5 opacity-20" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs text-[var(--text-dim)]">Sin bots configurados</p>
                <p className="text-[10px] text-[var(--text-dim)] mt-1">Crea un bot desde el menú principal</p>
              </div>
            ) : (
              <>
                {/* Summary card */}
                {activeBots.length > 0 && (
                  <div className="p-3 rounded-xl mb-1" style={{ background: 'linear-gradient(135deg, var(--dark-3), var(--dark-4))', border: '1px solid var(--border-light)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Activity size={14} className="text-[var(--gold)]" />
                        <span className="text-[11px] font-bold text-[var(--text)]">{activeBots.length} Bot{activeBots.length > 1 ? 's' : ''} Activo{activeBots.length > 1 ? 's' : ''}</span>
                      </div>
                      <PnlText value={bots.reduce((sum, b) => sum + (b.pnl || 0), 0)} size="sm" />
                    </div>
                  </div>
                )}

                {/* Bot list */}
                {bots.map(bot => {
                  const isActive = bot.status === 'active';
                  const pnl = bot.pnl || 0;
                  const trades = bot.totalTrades || (bot.tradeLog || bot.trades_log || []).length || 0;
                  const winRate = bot.winRate || 0;
                  return (
                    <div key={bot.id} className="p-2.5 rounded-xl"
                      style={{ background: 'var(--dark-3)', border: `1px solid ${isActive ? 'rgba(59,130,246,0.12)' : 'var(--border)'}` }}>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Bot size={14} style={{ color: isActive ? 'var(--gold)' : 'var(--text-dim)' }} />
                          <span className="text-xs font-bold truncate max-w-[120px]">{bot.name}</span>
                          <span className="text-[9px] text-[var(--text-dim)] bg-[var(--dark-4)] px-1.5 py-0.5 rounded font-mono">
                            {formatPair(bot.pair || bot.symbol || 'N/A')}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isActive ? 'text-[var(--green)] bg-[var(--green)]/[0.1]' : 'text-[var(--text-dim)] bg-[var(--dark-4)]'
                        }`}>
                          {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--green)] mr-1 animate-pulse" />}
                          {bot.status?.toUpperCase() || 'STOPPED'}
                        </span>
                      </div>
                      {/* Stats row */}
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[9px] text-[var(--text-dim)] block">P&L</span>
                          <PnlText value={pnl} size="xs" />
                        </div>
                        <div>
                          <span className="text-[9px] text-[var(--text-dim)] block">Trades</span>
                          <span className="text-[11px] font-bold font-mono">{trades}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[var(--text-dim)] block">Win Rate</span>
                          <span className="text-[11px] font-bold font-mono">{winRate}%</span>
                        </div>
                        <div className="ml-auto">
                          <span className="text-[9px] text-[var(--text-dim)] block">Balance</span>
                          <span className="text-[11px] font-bold font-mono">${fmt(bot.currentBalance || bot.balance || 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Recent bot trades */}
                {botTrades.length > 0 && (
                  <div className="mt-1">
                    <span className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-wider px-1">Últimas señales</span>
                    {botTrades.slice(0, 5).map((t, i) => (
                      <div key={i} className="flex items-center justify-between px-2 py-1.5 text-[10px]"
                        style={{ borderBottom: '1px solid rgba(30,34,45,0.3)' }}>
                        <span className="text-[var(--text-dim)]">{t.botName}</span>
                        <span className={`font-bold ${t.signal === 'BUY' || t.side === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {t.signal || t.side?.toUpperCase() || '?'}
                        </span>
                        <span className="font-mono text-[var(--text-dim)]">${fmt(t.price)}</span>
                        <PnlText value={t.pnl} size="xs" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── History ── */}
        {activeTab === 'history' && (
          <div className="p-2 space-y-1">
            {tradeHistory.length === 0 ? (
              <div className="text-center py-6">
                <BarChart3 size={24} className="mx-auto mb-1.5 opacity-20" style={{ color: 'var(--text-dim)' }} />
                <p className="text-xs text-[var(--text-dim)]">Sin historial de operaciones</p>
              </div>
            ) : tradeHistory.slice(0, 20).map((trade, i) => {
              const pnl = trade.pnl || ((trade.exitPrice - trade.entryPrice) * trade.quantity * (trade.side === 'buy' ? 1 : -1));
              return (
                <div key={trade.id || i} className="flex items-center gap-2 px-2 py-2 rounded-lg"
                  style={{ background: i % 2 === 0 ? 'var(--dark-3)' : 'transparent' }}>
                  <div className="w-1 h-8 rounded-full shrink-0"
                    style={{ background: trade.side === 'buy' ? 'var(--green)' : 'var(--red)' }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold">{formatPair(trade.symbol)}</span>
                    <span className="text-[9px] text-[var(--text-dim)] ml-1">{trade.side?.toUpperCase()}</span>
                  </div>
                  <PnlText value={pnl} size="xs" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   MAIN: MOBILE TRADE VIEW
   Chart (60%) + Info Panel (40%) + FAB buttons
   ═══════════════════════════════════════════ */
export default function MobileTradeView() {
  const { selectedPair, currentPrice, priceChange24h, positions, bots } = useStore();
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [infoTab, setInfoTab] = useState('positions');
  const [infoPanelExpanded, setInfoPanelExpanded] = useState(true);
  const [chartType, setChartType] = useState('chart'); // 'chart' | 'depth'

  const activeBots = bots.filter(b => b.status === 'active');
  const totalPnl = positions.reduce((sum, pos) => {
    const pnl = pos.side === 'buy'
      ? (currentPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - currentPrice) * pos.quantity;
    return sum + pnl;
  }, 0);

  const changeColor = (priceChange24h || 0) >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--dark)' }}>

      {/* ── Compact Pair/Price Header ── */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {/* Left: pair + price */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{formatPair(selectedPair)}</span>
          <span className="text-sm font-mono font-bold" style={{ color: 'var(--gold)' }}>
            ${fmt(currentPrice)}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: changeColor, background: `${changeColor}11` }}>
            {(priceChange24h || 0) >= 0 ? '+' : ''}{fmt(priceChange24h || 0, 1)}%
          </span>
        </div>

        {/* Right: chart type toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--dark-3)] rounded-lg p-0.5">
          <button onClick={() => setChartType('chart')}
            className={`p-1.5 rounded-md ${chartType === 'chart' ? 'bg-[var(--gold)] text-white' : 'text-[var(--text-dim)]'}`}>
            <CandlestickChart size={14} />
          </button>
          <button onClick={() => setChartType('depth')}
            className={`p-1.5 rounded-md ${chartType === 'depth' ? 'bg-[var(--gold)] text-white' : 'text-[var(--text-dim)]'}`}>
            <BarChart3 size={14} />
          </button>
        </div>
      </div>

      {/* ── Chart Area (takes remaining space) ── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <Suspense fallback={<MiniLoader />}>
          {chartType === 'chart' ? (
            <TradingChart />
          ) : (
            <DepthChart pair={selectedPair || 'BTCUSDT'} height={400} />
          )}
        </Suspense>

        {/* Quick P&L overlay (top-right of chart) */}
        {positions.length > 0 && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(11,14,17,0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--border)' }}>
            <Layers size={11} className="text-[var(--text-dim)]" />
            <span className="text-[10px] text-[var(--text-dim)]">{positions.length}</span>
            <PnlText value={totalPnl} size="xs" />
          </div>
        )}

        {/* Active bots indicator (top-left of chart) */}
        {activeBots.length > 0 && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(11,14,17,0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--border)' }}>
            <Bot size={11} className="text-[var(--gold)]" />
            <span className="text-[10px] text-[var(--text-dim)]">{activeBots.length} bot{activeBots.length > 1 ? 's' : ''}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
          </div>
        )}
      </div>

      {/* ── Buy/Sell FAB Buttons ── */}
      <div className="flex gap-2 px-3 py-2 shrink-0" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setOrderSheetOpen(true)}
          className="flex-1 py-3 text-sm font-bold rounded-xl text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #0ECB81, #0AA06A)', boxShadow: '0 2px 12px rgba(14,203,129,0.25)' }}>
          <ArrowUpCircle size={16} /> Comprar
        </button>
        <button onClick={() => setOrderSheetOpen(true)}
          className="flex-1 py-3 text-sm font-bold rounded-xl text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #F6465D, #D32F4A)', boxShadow: '0 2px 12px rgba(246,70,93,0.25)' }}>
          <ArrowDownCircle size={16} /> Vender
        </button>
        {/* Collapse/expand info panel */}
        <button onClick={() => setInfoPanelExpanded(!infoPanelExpanded)}
          className="px-3 py-3 rounded-xl shrink-0"
          style={{ background: 'var(--dark-3)', border: '1px solid var(--border)' }}>
          {infoPanelExpanded ? <ChevronDown size={16} className="text-[var(--text-dim)]" /> : <ChevronUp size={16} className="text-[var(--text-dim)]" />}
        </button>
      </div>

      {/* ── Bottom Info Panel (Positions/Orders/Bots/History) ── */}
      <AnimatePresence>
        {infoPanelExpanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <MobileInfoPanel activeTab={infoTab} onTabChange={setInfoTab} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Order Bottom Sheet ── */}
      <AnimatePresence>
        {orderSheetOpen && <MobileOrderSheet isOpen={orderSheetOpen} onClose={() => setOrderSheetOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
