// Kairos Trade — Paper Trading Simulator (Demo Mode)
// Users can practice trading with virtual money using REAL market data
// No risk, full learning experience

import marketData from './marketData';
import { calculateEMA, calculateRSI } from './indicators';

const STORAGE_KEY = 'kairos_trade_simulator';

class TradingSimulator {
  constructor() {
    this.state = this._load();
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch {}
    return this._defaultState();
  }

  _defaultState() {
    return {
      balance: 10000,
      initialBalance: 10000,
      positions: [],
      closedTrades: [],
      orders: [],
      equity: 10000,
      stats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnl: 0,
        bestTrade: 0,
        worstTrade: 0,
        avgWin: 0,
        avgLoss: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
      },
      equityHistory: [{ time: Date.now(), value: 10000 }],
      createdAt: new Date().toISOString(),
    };
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  // ─── Reset simulator ───
  reset(startingBalance = 10000) {
    this.state = this._defaultState();
    this.state.balance = startingBalance;
    this.state.initialBalance = startingBalance;
    this.state.equity = startingBalance;
    this.state.equityHistory = [{ time: Date.now(), value: startingBalance }];
    this._save();
    return this.state;
  }

  // ─── Open position ───
  async openPosition(symbol, side, quantity, options = {}) {
    const price = await marketData.getPrice(symbol);
    const cost = price * quantity;

    if (cost > this.state.balance) {
      throw new Error(`Fondos insuficientes. Necesitas $${cost.toFixed(2)}, tienes $${this.state.balance.toFixed(2)}`);
    }

    const position = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      symbol,
      side,
      quantity,
      entryPrice: price,
      currentPrice: price,
      cost,
      pnl: 0,
      pnlPercent: 0,
      stopLoss: options.stopLoss || null,
      takeProfit: options.takeProfit || null,
      leverage: options.leverage || 1,
      openedAt: new Date().toISOString(),
    };

    this.state.balance -= cost;
    this.state.positions.push(position);
    this._save();

    return { success: true, position, message: `${side.toUpperCase()} ${quantity} ${symbol} @ $${price.toFixed(2)}` };
  }

  // ─── Close position ───
  async closePosition(positionId) {
    const idx = this.state.positions.findIndex(p => p.id === positionId);
    if (idx === -1) throw new Error('Posición no encontrada');

    const pos = this.state.positions[idx];
    const exitPrice = await marketData.getPrice(pos.symbol);

    const pnl = pos.side === 'buy'
      ? (exitPrice - pos.entryPrice) * pos.quantity * pos.leverage
      : (pos.entryPrice - exitPrice) * pos.quantity * pos.leverage;

    const pnlPercent = (pnl / pos.cost) * 100;

    const closedTrade = {
      ...pos,
      exitPrice,
      pnl,
      pnlPercent,
      closedAt: new Date().toISOString(),
      duration: Date.now() - new Date(pos.openedAt).getTime(),
    };

    // Update balance and stats
    this.state.balance += pos.cost + pnl;
    this.state.positions.splice(idx, 1);
    this.state.closedTrades.push(closedTrade);
    this._updateStats(pnl);
    this._save();

    return { success: true, trade: closedTrade, message: `Cerrada: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(1)}%)` };
  }

  // ─── Place limit order ───
  async placeLimitOrder(symbol, side, quantity, targetPrice, options = {}) {
    const currentPrice = await marketData.getPrice(symbol);

    const order = {
      id: Date.now().toString(36),
      symbol,
      side,
      quantity,
      targetPrice,
      currentPrice,
      type: 'limit',
      stopLoss: options.stopLoss || null,
      takeProfit: options.takeProfit || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.state.orders.push(order);
    this._save();
    return { success: true, order };
  }

  // ─── Cancel order ───
  cancelOrder(orderId) {
    this.state.orders = this.state.orders.filter(o => o.id !== orderId);
    this._save();
    return { success: true };
  }

  // ─── Update positions with current prices ───
  async updatePositions() {
    let totalEquity = this.state.balance;

    for (const pos of this.state.positions) {
      try {
        const price = await marketData.getPrice(pos.symbol);
        pos.currentPrice = price;
        pos.pnl = pos.side === 'buy'
          ? (price - pos.entryPrice) * pos.quantity * (pos.leverage || 1)
          : (pos.entryPrice - price) * pos.quantity * (pos.leverage || 1);
        pos.pnlPercent = (pos.pnl / pos.cost) * 100;
        totalEquity += pos.cost + pos.pnl;

        // Check stop loss
        if (pos.stopLoss) {
          const hit = pos.side === 'buy' ? price <= pos.stopLoss : price >= pos.stopLoss;
          if (hit) {
            await this.closePosition(pos.id);
            continue;
          }
        }

        // Check take profit
        if (pos.takeProfit) {
          const hit = pos.side === 'buy' ? price >= pos.takeProfit : price <= pos.takeProfit;
          if (hit) {
            await this.closePosition(pos.id);
            continue;
          }
        }
      } catch {}
    }

    // Check pending limit orders
    for (const order of this.state.orders.filter(o => o.status === 'pending')) {
      try {
        const price = await marketData.getPrice(order.symbol);
        const triggered = order.side === 'buy'
          ? price <= order.targetPrice
          : price >= order.targetPrice;

        if (triggered) {
          order.status = 'filled';
          await this.openPosition(order.symbol, order.side, order.quantity, {
            stopLoss: order.stopLoss,
            takeProfit: order.takeProfit,
          });
        }
      } catch {}
    }

    // Remove filled orders
    this.state.orders = this.state.orders.filter(o => o.status === 'pending');

    this.state.equity = totalEquity;
    this.state.equityHistory.push({ time: Date.now(), value: totalEquity });

    // Keep last 500 equity points
    if (this.state.equityHistory.length > 500) {
      this.state.equityHistory = this.state.equityHistory.slice(-500);
    }

    this._save();
    return this.state;
  }

  // ─── Update stats ───
  _updateStats(pnl) {
    const s = this.state.stats;
    s.totalTrades++;
    s.totalPnl += pnl;

    if (pnl > 0) {
      s.wins++;
      s.bestTrade = Math.max(s.bestTrade, pnl);
    } else {
      s.losses++;
      s.worstTrade = Math.min(s.worstTrade, pnl);
    }

    s.avgWin = s.wins > 0 ? s.totalPnl / s.wins : 0;
    s.avgLoss = s.losses > 0 ? (s.totalPnl - s.avgWin * s.wins) / s.losses : 0;

    // Max drawdown
    const peakEquity = Math.max(...this.state.equityHistory.map(e => e.value));
    s.maxDrawdown = ((peakEquity - this.state.equity) / peakEquity) * 100;

    // Win rate
    s.winRate = s.totalTrades > 0 ? (s.wins / s.totalTrades) * 100 : 0;

    // Profit factor
    const grossProfit = this.state.closedTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(this.state.closedTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    s.profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  }

  // ─── Get state ───
  getState() {
    return this.state;
  }

  // ─── Get performance summary ───
  getPerformance() {
    const s = this.state;
    const returnPct = ((s.equity - s.initialBalance) / s.initialBalance) * 100;
    return {
      balance: s.balance,
      equity: s.equity,
      initialBalance: s.initialBalance,
      returnPct,
      openPositions: s.positions.length,
      pendingOrders: s.orders.length,
      ...s.stats,
    };
  }
}

export const simulator = new TradingSimulator();
export default simulator;
