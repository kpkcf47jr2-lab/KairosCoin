// Kairos Trade — Trading Engine (Bot Execution Core)
// Monitors market conditions and executes REAL trades via connected broker

import { calculateEMA, calculateRSI, calculateMACD, detectCrossover } from './indicators';
import { marketData } from './marketData';
import { brokerService } from './broker';
import { executeScript } from './kairosScript';
import { toApiPair } from '../utils/pairUtils';

class TradingEngine {
  constructor() {
    this.activeBots = new Map();
    this.intervals = new Map();
    this.positions = new Map(); // Track open positions per bot { botId -> { side, entryPrice, quantity, entryTime } }
  }

  // ─── Auto-reconnect broker if needed ───
  async _ensureBrokerConnected(bot) {
    if (!bot.brokerId) return false;
    if (brokerService.connections.has(bot.brokerId)) return true;

    // Try to reconnect from stored broker data
    try {
      const useStore = (await import('../store/useStore')).default;
      const broker = useStore.getState().brokers.find(b => b.id === bot.brokerId);
      if (broker && broker.connected) {
        await brokerService.connect(broker);
        return true;
      }
    } catch (err) {
      console.warn('Auto-reconnect failed:', err.message);
    }
    return false;
  }

  // ─── Start a bot ───
  async startBot(bot, onTrade, onLog) {
    if (this.activeBots.has(bot.id)) return;

    onLog?.(`🤖 Bot "${bot.name}" iniciado en ${bot.pair}`);

    // Auto-reconnect broker
    const brokerReady = await this._ensureBrokerConnected(bot);
    if (bot.brokerId) {
      onLog?.(brokerReady
        ? `🔗 Broker conectado — modo REAL activado`
        : `⚠️ Broker no disponible — modo DEMO`);
    }

    this.activeBots.set(bot.id, { bot, running: true });

    // Monitor loop — check every interval based on timeframe
    const checkInterval = this._getCheckInterval(bot.timeframe);

    const monitor = async () => {
      if (!this.activeBots.get(bot.id)?.running) return;

      try {
        // Get candles (convert KAIROS pair → API pair for Binance)
        const apiPair = toApiPair(bot.pair);
        const candles = await marketData.getCandles(apiPair, bot.timeframe, 100);
        const closes = candles.map(c => c.close);
        const currentPrice = closes[closes.length - 1];

        // Evaluate strategy
        const signal = this._evaluateStrategy(bot.strategy, candles, closes);

        if (signal) {
          const openPosition = this.positions.get(bot.id);

          // Check if this signal closes an existing position
          if (openPosition && openPosition.side !== signal.type) {
            // CLOSE position — calculate real P&L
            const entryPrice = openPosition.entryPrice;
            const exitPrice = currentPrice;
            const qty = openPosition.quantity;
            let profit;

            if (openPosition.side === 'buy') {
              profit = (exitPrice - entryPrice) * qty;
            } else {
              profit = (entryPrice - exitPrice) * qty;
            }

            onLog?.(`📊 Cerrando posición: ${openPosition.side.toUpperCase()} → ${signal.type.toUpperCase()} | Entrada: $${entryPrice.toFixed(2)} → Salida: $${exitPrice.toFixed(2)} | P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);

            // Build close order
            const closeOrder = {
              symbol: toApiPair(bot.pair),
              side: signal.type,
              type: 'market',
              quantity: qty,
              price: currentPrice,
            };

            // Execute close on broker
            if (bot.brokerId && brokerService.connections.has(bot.brokerId)) {
              try {
                onLog?.(`🔄 Cerrando posición REAL en broker...`);
                const result = await brokerService.placeOrder(bot.brokerId, closeOrder);
                const realProfit = result.filledPrice
                  ? (openPosition.side === 'buy'
                    ? (result.filledPrice - entryPrice) * qty
                    : (entryPrice - result.filledPrice) * qty)
                  : profit;
                onLog?.(`✅ Posición cerrada: P&L real ${realProfit >= 0 ? '+' : ''}$${realProfit.toFixed(2)}`);
                onTrade?.({ ...closeOrder, ...result, profit: realProfit, real: true, action: 'close' });
              } catch (err) {
                onLog?.(`❌ Error cerrando posición: ${err.message}`);
                onTrade?.({ ...closeOrder, profit, status: 'error', error: err.message, action: 'close' });
              }
            } else {
              onLog?.(`📝 [DEMO] Posición cerrada: P&L ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);
              onTrade?.({ ...closeOrder, profit, status: 'filled', simulated: true, action: 'close' });
            }

            this.positions.delete(bot.id);
          }

          // Open NEW position (if no position is open)
          if (!this.positions.has(bot.id)) {
            onLog?.(`📊 Señal detectada: ${signal.type.toUpperCase()} a $${currentPrice}`);

            const positionSize = this._calculatePositionSize(bot, currentPrice);

            const order = {
              symbol: toApiPair(bot.pair),
              side: signal.type,
              type: 'market',
              quantity: positionSize,
              price: currentPrice,
              stopLoss: signal.type === 'buy'
                ? currentPrice * (1 - parseFloat(bot.strategy?.stopLoss || 2) / 100)
                : currentPrice * (1 + parseFloat(bot.strategy?.stopLoss || 2) / 100),
              takeProfit: signal.type === 'buy'
                ? currentPrice * (1 + parseFloat(bot.strategy?.takeProfit || 4) / 100)
                : currentPrice * (1 - parseFloat(bot.strategy?.takeProfit || 4) / 100),
            };

            // Execute on broker
            if (bot.brokerId && brokerService.connections.has(bot.brokerId)) {
              try {
                onLog?.(`🔄 Ejecutando orden REAL en broker...`);
                const result = await brokerService.placeOrder(bot.brokerId, order);
                const fillPrice = result.filledPrice || currentPrice;
                onLog?.(`✅ ORDEN REAL ejecutada: ${result.side?.toUpperCase()} ${result.filledQty || positionSize} @ $${fillPrice} [${result.status}]`);

                // Track open position
                this.positions.set(bot.id, {
                  side: signal.type,
                  entryPrice: fillPrice,
                  quantity: result.filledQty || positionSize,
                  entryTime: Date.now(),
                  orderId: result.id,
                });

                onTrade?.({ ...order, ...result, real: true, action: 'open' });
              } catch (err) {
                onLog?.(`❌ Error ejecutando orden real: ${err.message}`);
                onTrade?.({ ...order, status: 'error', error: err.message });
              }
            } else {
              // Demo mode
              onLog?.(`📝 [DEMO] Orden: ${signal.type.toUpperCase()} ${positionSize} @ $${currentPrice}`);

              this.positions.set(bot.id, {
                side: signal.type,
                entryPrice: currentPrice,
                quantity: positionSize,
                entryTime: Date.now(),
                simulated: true,
              });

              onTrade?.({ ...order, status: 'filled', simulated: true, action: 'open' });
            }
          }
        }

        // Check stop-loss / take-profit for open positions
        const pos = this.positions.get(bot.id);
        if (pos) {
          const sl = pos.side === 'buy'
            ? pos.entryPrice * (1 - parseFloat(bot.strategy?.stopLoss || 2) / 100)
            : pos.entryPrice * (1 + parseFloat(bot.strategy?.stopLoss || 2) / 100);
          const tp = pos.side === 'buy'
            ? pos.entryPrice * (1 + parseFloat(bot.strategy?.takeProfit || 4) / 100)
            : pos.entryPrice * (1 - parseFloat(bot.strategy?.takeProfit || 4) / 100);

          const hitSL = pos.side === 'buy' ? currentPrice <= sl : currentPrice >= sl;
          const hitTP = pos.side === 'buy' ? currentPrice >= tp : currentPrice <= tp;

          if (hitSL || hitTP) {
            const exitSide = pos.side === 'buy' ? 'sell' : 'buy';
            const profit = pos.side === 'buy'
              ? (currentPrice - pos.entryPrice) * pos.quantity
              : (pos.entryPrice - currentPrice) * pos.quantity;

            onLog?.(`${hitSL ? '🛑 STOP-LOSS' : '🎯 TAKE-PROFIT'} alcanzado a $${currentPrice.toFixed(2)} | P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);

            const closeOrder = {
              symbol: toApiPair(bot.pair),
              side: exitSide,
              type: 'market',
              quantity: pos.quantity,
              price: currentPrice,
            };

            if (bot.brokerId && brokerService.connections.has(bot.brokerId)) {
              try {
                const result = await brokerService.placeOrder(bot.brokerId, closeOrder);
                const realProfit = result.filledPrice
                  ? (pos.side === 'buy'
                    ? (result.filledPrice - pos.entryPrice) * pos.quantity
                    : (pos.entryPrice - result.filledPrice) * pos.quantity)
                  : profit;
                onTrade?.({ ...closeOrder, ...result, profit: realProfit, real: true, action: 'close', reason: hitSL ? 'stop_loss' : 'take_profit' });
              } catch (err) {
                onLog?.(`❌ Error cerrando por ${hitSL ? 'SL' : 'TP'}: ${err.message}`);
              }
            } else {
              onTrade?.({ ...closeOrder, profit, status: 'filled', simulated: true, action: 'close', reason: hitSL ? 'stop_loss' : 'take_profit' });
            }

            this.positions.delete(bot.id);
          }
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
    // Clear tracked position
    this.positions.delete(botId);
  }

  // ─── Evaluate strategy rules ───
  _evaluateStrategy(strategy, candles, closes) {
    // Custom Kairos Script
    if (strategy?.type === 'custom_script' && strategy?.code) {
      const result = executeScript(strategy.code, candles);
      if (result.error) {
        console.warn('[KairosScript] Error:', result.error);
        return null;
      }
      return result.signal; // { type: 'buy' } or { type: 'sell' } or null
    }

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
