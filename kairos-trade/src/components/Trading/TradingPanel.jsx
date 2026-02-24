// Kairos Trade — Trading Panel (Premium v2)
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Target, Shield, ChevronDown } from 'lucide-react';
import useStore from '../../store/useStore';
import marketData from '../../services/marketData';

export default function TradingPanel() {
  const { selectedPair, currentPrice, positions, orders, addPosition, addOrder, closePosition, cancelOrder } = useStore();
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [form, setForm] = useState({ quantity: '', price: '', stopLoss: '', takeProfit: '' });
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [tab, setTab] = useState('order');

  useEffect(() => {
    loadOrderBook();
    const interval = setInterval(loadOrderBook, 5000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const loadOrderBook = async () => {
    try {
      const ob = await marketData.getOrderBook(selectedPair, 10);
      setOrderBook(ob);
    } catch {}
  };

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
        symbol: selectedPair,
        side,
        type: orderType,
        quantity: parseFloat(form.quantity),
        price,
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
        status: 'open',
        createdAt: new Date().toISOString(),
      });
    }

    setForm({ quantity: '', price: '', stopLoss: '', takeProfit: '' });
  };

  const total = parseFloat(form.quantity || 0) * (orderType === 'market' ? (currentPrice || 0) : parseFloat(form.price || 0));

  return (
    <div className="flex flex-col h-full" style={{ width: 320, borderLeft: '1px solid rgba(30,34,45,0.6)' }}>
      {/* Tabs */}
      <div className="flex shrink-0 px-2 pt-2 gap-1"
        style={{ borderBottom: '1px solid rgba(30,34,45,0.4)' }}>
        {['order', 'positions', 'orders'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[11px] font-bold rounded-t-lg transition-all
              ${tab === t
                ? 'text-[var(--gold)] bg-[var(--gold)]/[0.06]'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            style={tab === t ? { borderBottom: '2px solid var(--gold)' } : { borderBottom: '2px solid transparent' }}
          >
            {t === 'order' ? 'Orden' : t === 'positions' ? `Pos (${positions.length})` : `Órd (${orders.length})`}
          </button>
        ))}
      </div>

      {tab === 'order' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Buy/Sell toggle */}
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(24,26,32,0.8)', border: '1px solid rgba(30,34,45,0.4)' }}>
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200
                ${side === 'buy' ? 'text-white shadow-lg' : 'text-[var(--text-dim)]'}`}
              style={side === 'buy' ? { background: 'linear-gradient(135deg, #0ECB81, #0AA06A)', boxShadow: '0 4px 12px rgba(14,203,129,0.25)' } : {}}
            >
              Comprar
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200
                ${side === 'sell' ? 'text-white shadow-lg' : 'text-[var(--text-dim)]'}`}
              style={side === 'sell' ? { background: 'linear-gradient(135deg, #F6465D, #D32F4A)', boxShadow: '0 4px 12px rgba(246,70,93,0.25)' } : {}}
            >
              Vender
            </button>
          </div>

          {/* Order type */}
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--dark-3)]">
            {['market', 'limit', 'stop_loss'].map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all
                  ${orderType === type
                    ? 'bg-[var(--dark-4)] text-[var(--text)] shadow-sm'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                  }`}
              >
                {type === 'market' ? 'Market' : type === 'limit' ? 'Límite' : 'Stop'}
              </button>
            ))}
          </div>

          {/* Price (for limit/stop) */}
          {orderType !== 'market' && (
            <div>
              <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Precio</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder={currentPrice?.toString()}
                className="w-full text-sm"
              />
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Cantidad</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="0.001"
              className="w-full text-sm"
            />
            <div className="flex gap-1 mt-1.5">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => {
                    // Calculate quantity based on an assumed balance of $10,000 for demo
                    const price = orderType === 'market' ? currentPrice : parseFloat(form.price) || currentPrice;
                    if (price) {
                      const balance = 10000; // Demo balance
                      const qty = (balance * (pct / 100)) / price;
                      setForm({ ...form, quantity: qty.toFixed(6) });
                    }
                  }}
                  className="flex-1 py-1.5 text-[10px] font-semibold rounded-md text-[var(--text-dim)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all"
                  style={{ background: 'rgba(14,16,21,0.6)', border: '1px solid var(--border)' }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Stop Loss / Take Profit */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-dim)] mb-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                <Shield size={9} className="text-[var(--red)]" /> SL
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
              <label className="text-[10px] text-[var(--text-dim)] mb-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                <Target size={9} className="text-[var(--green)]" /> TP
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

          {/* Total */}
          <div className="rounded-lg p-3 flex items-center justify-between"
            style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}>
            <span className="text-[10px] text-[var(--text-dim)] font-semibold uppercase tracking-wider">Total</span>
            <span className="text-sm font-mono font-bold">${total.toFixed(2)}</span>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!form.quantity}
            className="w-full py-3.5 font-bold rounded-xl text-sm transition-all duration-200 disabled:opacity-40 text-white"
            style={side === 'buy'
              ? { background: 'linear-gradient(135deg, #0ECB81, #0AA06A)', boxShadow: '0 4px 15px rgba(14,203,129,0.25)' }
              : { background: 'linear-gradient(135deg, #F6465D, #D32F4A)', boxShadow: '0 4px 15px rgba(246,70,93,0.25)' }
            }
          >
            {side === 'buy' ? 'Comprar' : 'Vender'} {selectedPair.replace('USDT', '')}
          </button>

          {/* Mini order book */}
          <div className="rounded-xl p-3"
            style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}>
            <p className="text-[10px] text-[var(--text-dim)] mb-2 font-bold uppercase tracking-wider">Order Book</p>
            <div className="space-y-[2px] text-[10px] font-mono">
              {orderBook.asks.slice(0, 5).reverse().map((a, i) => (
                <div key={`a${i}`} className="flex justify-between text-[var(--red)] py-0.5 px-1 rounded hover:bg-[var(--red)]/[0.04]">
                  <span>${a.price.toFixed(2)}</span>
                  <span className="text-[var(--text-dim)]">{a.quantity.toFixed(4)}</span>
                </div>
              ))}
              <div className="text-center py-1.5 text-[15px] font-bold text-[var(--gold)] my-1"
                style={{ background: 'rgba(59,130,246,0.04)', borderRadius: '6px' }}>
                ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '---'}
              </div>
              {orderBook.bids.slice(0, 5).map((b, i) => (
                <div key={`b${i}`} className="flex justify-between text-[var(--green)] py-0.5 px-1 rounded hover:bg-[var(--green)]/[0.04]">
                  <span>${b.price.toFixed(2)}</span>
                  <span className="text-[var(--text-dim)]">{b.quantity.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Positions tab */}
      {tab === 'positions' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {positions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={32} className="mx-auto text-[var(--text-dim)]/20 mb-2" />
              <p className="text-sm text-[var(--text-dim)]">Sin posiciones abiertas</p>
            </div>
          ) : positions.map(pos => {
            const pnl = pos.side === 'buy'
              ? (currentPrice - pos.entryPrice) * pos.quantity
              : (pos.entryPrice - currentPrice) * pos.quantity;
            return (
              <div key={pos.id} className="rounded-xl p-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
                  border: `1px solid ${pnl >= 0 ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)'}`,
                }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">{pos.symbol}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${pos.side === 'buy' ? 'text-[var(--green)] bg-[var(--green)]/[0.08]' : 'text-[var(--red)] bg-[var(--red)]/[0.08]'}`}>
                    {pos.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-dim)] mb-2">
                  <span>Entrada: ${pos.entryPrice}</span>
                  <span className={`font-bold ${pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    P&L: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => closePosition(pos.id)}
                  className="w-full py-1.5 rounded-lg text-[10px] font-semibold text-[var(--text-dim)] hover:text-[var(--red)] transition-all"
                  style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}
                >
                  Cerrar Posición
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={32} className="mx-auto text-[var(--text-dim)]/20 mb-2" />
              <p className="text-sm text-[var(--text-dim)]">Sin órdenes pendientes</p>
            </div>
          ) : orders.map(order => (
            <div key={order.id} className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(17,19,24,0.8), rgba(24,26,32,0.6))',
                border: '1px solid rgba(30,34,45,0.5)',
              }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{order.symbol}</span>
                <span className={`text-[10px] font-bold ${order.side === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {order.side.toUpperCase()} {order.type}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-dim)] mb-2">
                Precio: ${order.price} | Cantidad: {order.quantity}
              </div>
              <button
                onClick={() => cancelOrder(order.id)}
                className="w-full py-1.5 rounded-lg text-[10px] font-semibold text-[var(--text-dim)] hover:text-[var(--red)] transition-all"
                style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}
              >
                Cancelar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
