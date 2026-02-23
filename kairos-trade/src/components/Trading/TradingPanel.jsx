// Kairos Trade — Trading Panel (Order Entry + Positions + Order Book)
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';
import useStore from '../../store/useStore';
import marketData from '../../services/marketData';
import { ORDER_TYPES } from '../../constants';

export default function TradingPanel() {
  const { selectedPair, currentPrice, positions, orders, addPosition, addOrder, closePosition, cancelOrder } = useStore();
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [form, setForm] = useState({ quantity: '', price: '', stopLoss: '', takeProfit: '' });
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [tab, setTab] = useState('order'); // order | positions | orders

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
    <div className="flex flex-col h-full" style={{ width: 300, borderLeft: '1px solid var(--border)' }}>
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] shrink-0">
        {['order', 'positions', 'orders'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-bold transition-colors
              ${tab === t ? 'text-[var(--gold)] border-b-2 border-[var(--gold)]' : 'text-[var(--text-dim)]'}`}
          >
            {t === 'order' ? 'Orden' : t === 'positions' ? `Pos (${positions.length})` : `Órd (${orders.length})`}
          </button>
        ))}
      </div>

      {tab === 'order' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Buy/Sell toggle */}
          <div className="flex gap-1 bg-[var(--dark-3)] rounded-lg p-1">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all
                ${side === 'buy' ? 'bg-[var(--green)] text-white' : 'text-[var(--text-dim)]'}`}
            >
              Comprar
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all
                ${side === 'sell' ? 'bg-[var(--red)] text-white' : 'text-[var(--text-dim)]'}`}
            >
              Vender
            </button>
          </div>

          {/* Order type */}
          <div className="flex gap-1">
            {['market', 'limit', 'stop_loss'].map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-1.5 text-xs rounded-md transition-colors
                  ${orderType === type ? 'bg-[var(--dark-4)] text-[var(--text)] font-bold' : 'text-[var(--text-dim)]'}`}
              >
                {type === 'market' ? 'Market' : type === 'limit' ? 'Limit' : 'Stop'}
              </button>
            ))}
          </div>

          {/* Price (for limit/stop) */}
          {orderType !== 'market' && (
            <div>
              <label className="text-xs text-[var(--text-dim)] mb-1 block">Precio</label>
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
            <label className="text-xs text-[var(--text-dim)] mb-1 block">Cantidad</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="0.001"
              className="w-full text-sm"
            />
            <div className="flex gap-1 mt-1">
              {['25%', '50%', '75%', '100%'].map(pct => (
                <button
                  key={pct}
                  className="flex-1 py-1 text-[10px] bg-[var(--dark-3)] rounded text-[var(--text-dim)] hover:text-[var(--text)]"
                >
                  {pct}
                </button>
              ))}
            </div>
          </div>

          {/* Stop Loss / Take Profit */}
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

          {/* Total */}
          <div className="bg-[var(--dark-3)] rounded-lg p-2 flex items-center justify-between">
            <span className="text-xs text-[var(--text-dim)]">Total</span>
            <span className="text-sm font-mono font-bold">${total.toFixed(2)}</span>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!form.quantity}
            className={`w-full py-3 font-bold rounded-xl text-sm transition-colors disabled:opacity-50
              ${side === 'buy'
                ? 'bg-[var(--green)] text-white hover:bg-[var(--green)]/80'
                : 'bg-[var(--red)] text-white hover:bg-[var(--red)]/80'
              }`}
          >
            {side === 'buy' ? 'Comprar' : 'Vender'} {selectedPair.replace('USDT', '')}
          </button>

          {/* Mini order book */}
          <div className="bg-[var(--dark-3)] rounded-lg p-2">
            <p className="text-[10px] text-[var(--text-dim)] mb-1 font-bold">Order Book</p>
            <div className="space-y-0.5 text-[10px] font-mono">
              {orderBook.asks.slice(0, 5).reverse().map((a, i) => (
                <div key={`a${i}`} className="flex justify-between text-[var(--red)]">
                  <span>${a.price.toFixed(2)}</span>
                  <span>{a.quantity.toFixed(4)}</span>
                </div>
              ))}
              <div className="text-center py-0.5 text-sm font-bold text-[var(--gold)]">
                ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '---'}
              </div>
              {orderBook.bids.slice(0, 5).map((b, i) => (
                <div key={`b${i}`} className="flex justify-between text-[var(--green)]">
                  <span>${b.price.toFixed(2)}</span>
                  <span>{b.quantity.toFixed(4)}</span>
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
            <p className="text-center text-sm text-[var(--text-dim)] py-8">Sin posiciones abiertas</p>
          ) : positions.map(pos => {
            const pnl = pos.side === 'buy'
              ? (currentPrice - pos.entryPrice) * pos.quantity
              : (pos.entryPrice - currentPrice) * pos.quantity;
            return (
              <div key={pos.id} className="bg-[var(--dark-3)] rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{pos.symbol}</span>
                  <span className={`text-xs font-bold ${pos.side === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {pos.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-dim)]">
                  <span>Entrada: ${pos.entryPrice}</span>
                  <span className={pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                    P&L: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => closePosition(pos.id)}
                  className="w-full mt-1 py-1 bg-[var(--dark-4)] text-[var(--text-dim)] rounded text-[10px] hover:bg-[var(--red)]/20 hover:text-[var(--red)] transition-colors"
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
            <p className="text-center text-sm text-[var(--text-dim)] py-8">Sin órdenes pendientes</p>
          ) : orders.map(order => (
            <div key={order.id} className="bg-[var(--dark-3)] rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{order.symbol}</span>
                <span className={`text-xs font-bold ${order.side === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {order.side.toUpperCase()} {order.type}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-dim)]">
                Precio: ${order.price} | Cantidad: {order.quantity}
              </div>
              <button
                onClick={() => cancelOrder(order.id)}
                className="w-full mt-1 py-1 bg-[var(--dark-4)] text-[var(--text-dim)] rounded text-[10px] hover:bg-[var(--red)]/20 hover:text-[var(--red)] transition-colors"
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
