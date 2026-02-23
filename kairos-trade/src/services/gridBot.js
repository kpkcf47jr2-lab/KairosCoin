// Kairos Trade — Grid Bot Engine
// Implements grid trading strategy: places buy/sell orders at predefined price levels
// Creates a "grid" of limit orders above and below current price

import marketData from './marketData';

class GridBotEngine {
  constructor() {
    this.activeBots = new Map();
  }

  /**
   * Start a Grid Bot
   * @param {Object} config - { id, pair, upperPrice, lowerPrice, gridLines, investment, onLog, onTrade }
   */
  start(config) {
    if (this.activeBots.has(config.id)) return;

    const { pair, upperPrice, lowerPrice, gridLines, investment, onLog, onTrade } = config;

    // Calculate grid levels
    const priceStep = (upperPrice - lowerPrice) / (gridLines - 1);
    const levels = [];
    for (let i = 0; i < gridLines; i++) {
      levels.push(+(lowerPrice + priceStep * i).toFixed(2));
    }

    const investmentPerGrid = investment / (gridLines - 1);

    const state = {
      id: config.id,
      pair,
      levels,
      priceStep,
      investmentPerGrid,
      activeOrders: new Map(), // level -> order
      filledBuys: [], // levels where buy was filled
      totalProfit: 0,
      trades: 0,
      running: true,
      lastPrice: null,
    };

    this.activeBots.set(config.id, state);
    onLog?.(`📊 Grid Bot started: ${gridLines} levels from $${lowerPrice} to $${upperPrice}`);
    onLog?.(`💰 Investment per grid: $${investmentPerGrid.toFixed(2)}`);

    // Place initial grid orders based on current price
    this._startMonitor(state, onLog, onTrade);
  }

  async _startMonitor(state, onLog, onTrade) {
    const checkPrice = async () => {
      if (!state.running) return;

      try {
        const ticker = await marketData.get24hrTicker(state.pair);
        const currentPrice = ticker.price;
        const prevPrice = state.lastPrice;
        state.lastPrice = currentPrice;

        if (!prevPrice) {
          // First run — identify which levels to place buys vs sells
          onLog?.(`📈 Current price: $${currentPrice.toFixed(2)}`);
          for (const level of state.levels) {
            if (level < currentPrice) {
              // Place buy below current price
              state.activeOrders.set(level, { side: 'buy', price: level, status: 'pending' });
            } else if (level > currentPrice) {
              // Sell levels - will be activated after a buy fills
            }
          }
          const buyCount = state.activeOrders.size;
          onLog?.(`🟢 ${buyCount} buy orders placed below current price`);
          return;
        }

        // Check if price crossed any grid levels
        for (const level of state.levels) {
          const order = state.activeOrders.get(level);

          // Price dropped below a buy level = buy triggered
          if (order?.side === 'buy' && order.status === 'pending' && currentPrice <= level) {
            const qty = state.investmentPerGrid / level;
            order.status = 'filled';
            state.filledBuys.push(level);
            state.trades++;

            onTrade?.({
              symbol: state.pair,
              side: 'buy',
              type: 'grid',
              quantity: +qty.toFixed(6),
              price: level,
              gridLevel: level,
            });
            onLog?.(`✅ BUY filled at $${level} (qty: ${qty.toFixed(6)})`);

            // Place sell at the next level above
            const sellLevel = level + state.priceStep;
            if (sellLevel <= state.levels[state.levels.length - 1]) {
              state.activeOrders.set(sellLevel, {
                side: 'sell',
                price: sellLevel,
                status: 'pending',
                buyLevel: level,
                quantity: qty,
              });
              onLog?.(`📤 SELL order placed at $${sellLevel.toFixed(2)}`);
            }
          }

          // Price rose above a sell level = sell triggered
          if (order?.side === 'sell' && order.status === 'pending' && currentPrice >= level) {
            order.status = 'filled';
            const profit = (level - order.buyLevel) * order.quantity;
            state.totalProfit += profit;
            state.trades++;

            onTrade?.({
              symbol: state.pair,
              side: 'sell',
              type: 'grid',
              quantity: +order.quantity.toFixed(6),
              price: level,
              profit: +profit.toFixed(2),
              gridLevel: level,
            });
            onLog?.(`✅ SELL filled at $${level.toFixed(2)} — Profit: +$${profit.toFixed(2)}`);

            // Re-place the buy at the level below
            const rebuyLevel = level - state.priceStep;
            if (rebuyLevel >= state.levels[0]) {
              state.activeOrders.set(rebuyLevel, {
                side: 'buy',
                price: rebuyLevel,
                status: 'pending',
              });
              onLog?.(`📥 BUY order re-placed at $${rebuyLevel.toFixed(2)}`);
            }
          }
        }
      } catch (err) {
        onLog?.(`❌ Error: ${err.message}`);
      }
    };

    // Check every 10 seconds
    await checkPrice();
    const interval = setInterval(checkPrice, 10000);
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
    return {
      levels: state.levels.length,
      activeOrders: [...state.activeOrders.values()].filter(o => o.status === 'pending').length,
      filledBuys: state.filledBuys.length,
      totalProfit: state.totalProfit,
      trades: state.trades,
      lastPrice: state.lastPrice,
    };
  }

  isRunning(botId) {
    return this.activeBots.has(botId);
  }
}

export const gridBotEngine = new GridBotEngine();
export default gridBotEngine;
