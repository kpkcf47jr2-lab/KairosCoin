// Kairos Trade — Trading Engine (Bot Execution Core)
// Monitors market conditions and executes trades based on strategy rules

import { calculateEMA, calculateRSI, calculateMACD, detectCrossover } from './indicators';
import { marketData } from './marketData';
import { brokerService } from './broker';

class TradingEngine {
  constructor() {
    this.activeBots = new Map();
    this.intervals = new Map();
  }

  // ─── Start a bot ───
  async startBot(bot, onTrade, onLog) {
    if (this.activeBots.has(bot.id)) return;

    onLog?.(`🤖 Bot "${bot.name}" iniciado en ${bot.pair}`);
    this.activeBots.set(bot.id, { bot, running: true });

    // Monitor loop — check every interval based on timeframe
    const checkInterval = this._getCheckInterval(bot.timeframe);

    const monitor = async () => {
      if (!this.activeBots.get(bot.id)?.running) return;

      try {
        // Get candles
        const candles = await marketData.getCandles(bot.pair, bot.timeframe, 100);
        const closes = candles.map(c => c.close);
        const currentPrice = closes[closes.length - 1];

        // Evaluate strategy
        const signal = this._evaluateStrategy(bot.strategy, candles, closes);

        if (signal) {
          onLog?.(`📊 Señal detectada: ${signal.type.toUpperCase()} a $${currentPrice}`);

          // Calculate position size
          const positionSize = this._calculatePositionSize(bot, currentPrice);

          // Execute order
          const order = {
            symbol: bot.pair,
            side: signal.type,
            type: 'market',
            quantity: positionSize,
            price: currentPrice,
            stopLoss: signal.type === 'buy'
              ? currentPrice * (1 - parseFloat(bot.strategy.stopLoss) / 100)
              : currentPrice * (1 + parseFloat(bot.strategy.stopLoss) / 100),
            takeProfit: signal.type === 'buy'
              ? currentPrice * (1 + parseFloat(bot.strategy.takeProfit) / 100)
              : currentPrice * (1 - parseFloat(bot.strategy.takeProfit) / 100),
          };

          onTrade?.(order);
          onLog?.(`✅ Orden ejecutada: ${signal.type.toUpperCase()} ${positionSize} ${bot.pair} @ $${currentPrice}`);
        }
      } catch (err) {
        onLog?.(`❌ Error: ${err.message}`);
      }
    };

    // Run immediately then on interval
    await monitor();
    const interval = setInterval(monitor, checkInterval);
    this.intervals.set(bot.id, interval);
  }

  // ─── Stop a bot ───
  stopBot(botId) {
    const active = this.activeBots.get(botId);
    if (active) {
      active.running = false;
      this.activeBots.delete(botId);
    }
    const interval = this.intervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(botId);
    }
  }

  // ─── Evaluate strategy rules ───
  _evaluateStrategy(strategy, candles, closes) {
    if (!strategy?.entry?.indicator) return null;

    const len = closes.length;
    const indicator = strategy.entry.indicator;

    switch (indicator) {
      case 'ema_cross':
      case 'ema_cross_rsi': {
        const fast = strategy.entry.params?.fastEma || strategy.entry.params?.fast || 20;
        const slow = strategy.entry.params?.slowEma || strategy.entry.params?.slow || 50;
        const emaFast = calculateEMA(closes, fast);
        const emaSlow = calculateEMA(closes, slow);
        const cross = detectCrossover(emaFast, emaSlow, len - 1);

        // If also requires RSI
        if (indicator === 'ema_cross_rsi') {
          const rsiPeriod = strategy.entry.params?.rsiPeriod || 14;
          const rsi = calculateRSI(closes, rsiPeriod);
          const currentRSI = rsi[len - 1];
          const oversold = strategy.entry.params?.rsiOversold || 30;
          const overbought = strategy.exit?.params?.rsiOverbought || 70;

          if (cross === 'bullish_cross' && currentRSI < oversold) return { type: 'buy' };
          if (cross === 'bearish_cross' && currentRSI > overbought) return { type: 'sell' };
          // Check exit condition with RSI alone
          if (currentRSI > overbought) return { type: 'sell' };
          if (currentRSI < oversold) return { type: 'buy' };
        } else {
          if (cross === 'bullish_cross') return { type: 'buy' };
          if (cross === 'bearish_cross') return { type: 'sell' };
        }
        break;
      }

      case 'rsi': {
        const period = strategy.entry.params?.period || 14;
        const rsi = calculateRSI(closes, period);
        const current = rsi[len - 1];
        if (current < (strategy.entry.params?.oversold || 30)) return { type: 'buy' };
        if (current > (strategy.entry.params?.overbought || 70)) return { type: 'sell' };
        break;
      }

      case 'macd_cross': {
        const { macd, signal } = calculateMACD(closes);
        const cross = detectCrossover(macd, signal, len - 1);
        if (cross === 'bullish_cross') return { type: 'buy' };
        if (cross === 'bearish_cross') return { type: 'sell' };
        break;
      }

      default:
        return null;
    }

    return null;
  }

  // ─── Position sizing ───
  _calculatePositionSize(bot, price) {
    const balance = bot.balance || 1000;
    const riskPercent = parseFloat(bot.riskPercent || 2) / 100;
    const amount = (balance * riskPercent) / price;
    return Math.round(amount * 1e8) / 1e8; // 8 decimal places
  }

  // ─── Get check interval based on timeframe ───
  _getCheckInterval(timeframe) {
    const intervals = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 300000, // Check every 5 min for hourly
      '4h': 900000,
      '1d': 3600000,
    };
    return intervals[timeframe] || 300000;
  }

  // ─── Get active bots count ───
  getActiveBotCount() {
    return this.activeBots.size;
  }
}

export const tradingEngine = new TradingEngine();
export default tradingEngine;
