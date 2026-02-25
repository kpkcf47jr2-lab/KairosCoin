// Kairos Trade — DCA Bot Engine
// Dollar Cost Averaging: buys a fixed $ amount at regular intervals
// Optionally applies conditions (RSI oversold, price dip, etc.)

import marketData from './marketData';
import { calculateRSI } from './indicators';
import { feeService } from './feeService';

class DCABotEngine {
  constructor() {
    this.activeBots = new Map();
  }

  /**
   * Start a DCA Bot
   * @param {Object} config - {
   *   id, pair, investmentPerOrder, intervalMinutes,
   *   maxOrders, useRsiFilter, rsiPeriod, rsiThreshold,
   *   usePriceDipFilter, dipPercent,
   *   onLog, onTrade
   * }
   */
  start(config) {
    if (this.activeBots.has(config.id)) return;

    const {
      pair, investmentPerOrder, intervalMinutes, maxOrders = 100,
      useRsiFilter = false, rsiPeriod = 14, rsiThreshold = 40,
      usePriceDipFilter = false, dipPercent = 3,
      onLog, onTrade,
    } = config;

    const state = {
      id: config.id,
      pair,
      investmentPerOrder,
      intervalMinutes,
      maxOrders,
      useRsiFilter,
      rsiPeriod,
      rsiThreshold,
      usePriceDipFilter,
      dipPercent,
      executedOrders: 0,
      totalInvested: 0,
      totalQuantity: 0,
      avgPrice: 0,
      prices: [],
      running: true,
      lastBuyPrice: null,
      startTime: Date.now(),
    };

    this.activeBots.set(config.id, state);
    onLog?.(`📊 DCA Bot started: $${investmentPerOrder} every ${intervalMinutes}min on ${pair}`);
    if (useRsiFilter) onLog?.(`📉 RSI filter enabled: buy when RSI < ${rsiThreshold}`);
    if (usePriceDipFilter) onLog?.(`📉 Dip filter enabled: buy when price drops ${dipPercent}%`);

    this._startMonitor(state, onLog, onTrade);
  }

  async _startMonitor(state, onLog, onTrade) {
    const executeBuy = async () => {
      if (!state.running) return;
      if (state.executedOrders >= state.maxOrders) {
        onLog?.(`🏁 Max orders reached (${state.maxOrders}). DCA Bot stopped.`);
        this.stop(state.id);
        return;
      }

      try {
        const ticker = await marketData.get24hrTicker(state.pair);
        const currentPrice = ticker.price;

        // Check RSI filter
        if (state.useRsiFilter) {
          try {
            const candles = await marketData.getCandles(state.pair, '1h', 100);
            const closes = candles.map(c => c.close);
            const rsi = calculateRSI(closes, state.rsiPeriod);
            const currentRSI = rsi[rsi.length - 1];

            if (currentRSI > state.rsiThreshold) {
              onLog?.(`⏸️ RSI ${currentRSI.toFixed(1)} > ${state.rsiThreshold} — skipping buy`);
              return;
            }
            onLog?.(`📉 RSI ${currentRSI.toFixed(1)} < ${state.rsiThreshold} — proceeding with buy`);
          } catch (err) {
            onLog?.(`⚠️ RSI check failed, proceeding anyway: ${err.message}`);
          }
        }

        // Check price dip filter
        if (state.usePriceDipFilter && state.lastBuyPrice) {
          const dropPercent = ((state.lastBuyPrice - currentPrice) / state.lastBuyPrice) * 100;
          if (dropPercent < state.dipPercent) {
            onLog?.(`⏸️ Price drop ${dropPercent.toFixed(2)}% < ${state.dipPercent}% — skipping buy`);
            return;
          }
          onLog?.(`📉 Price dropped ${dropPercent.toFixed(2)}% — proceeding with buy`);
        }

        // Execute buy
        const quantity = state.investmentPerOrder / currentPrice;
        // Platform fee on DCA buy (0.05% of volume)
        feeService.applyVolumeFee(currentPrice, quantity);
        state.executedOrders++;
        state.totalInvested += state.investmentPerOrder;
        state.totalQuantity += quantity;
        state.avgPrice = state.totalInvested / state.totalQuantity;
        state.lastBuyPrice = currentPrice;
        state.prices.push(currentPrice);

        onTrade?.({
          symbol: state.pair,
          side: 'buy',
          type: 'dca',
          quantity: +quantity.toFixed(8),
          price: currentPrice,
          dcaOrder: state.executedOrders,
          avgPrice: +state.avgPrice.toFixed(2),
        });

        onLog?.(`✅ DCA Buy #${state.executedOrders}: ${quantity.toFixed(6)} ${state.pair.replace('USDT', '')} @ $${currentPrice.toFixed(2)}`);
        onLog?.(`📊 Avg price: $${state.avgPrice.toFixed(2)} | Total invested: $${state.totalInvested.toFixed(2)}`);

      } catch (err) {
        onLog?.(`❌ Error: ${err.message}`);
      }
    };

    // Execute first buy immediately
    await executeBuy();

    // Then on interval
    const interval = setInterval(executeBuy, state.intervalMinutes * 60 * 1000);
    state._interval = interval;
  }

  stop(botId) {
    const state = this.activeBots.get(botId);
    if (state) {
      state.running = false;
      if (state._interval) clearInterval(state._interval);
      this.activeBots.delete(botId);
    }
  }

  getStats(botId) {
    const state = this.activeBots.get(botId);
    if (!state) return null;

    const currentValue = state.totalQuantity * (state.lastBuyPrice || 0);
    const unrealizedPnl = currentValue - state.totalInvested;

    return {
      executedOrders: state.executedOrders,
      maxOrders: state.maxOrders,
      totalInvested: state.totalInvested,
      totalQuantity: state.totalQuantity,
      avgPrice: state.avgPrice,
      currentPrice: state.lastBuyPrice,
      unrealizedPnl,
      unrealizedPnlPercent: state.totalInvested > 0 ? (unrealizedPnl / state.totalInvested * 100) : 0,
      runningTime: Date.now() - state.startTime,
    };
  }

  isRunning(botId) {
    return this.activeBots.has(botId);
  }
}

export const dcaBotEngine = new DCABotEngine();
export default dcaBotEngine;
