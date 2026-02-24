// Kairos Trade — Trading Engine (Bot Execution Core)
// Real-time WebSocket monitoring + REAL trade execution via connected broker
// Each bot gets a dedicated WebSocket for instant price updates

import { calculateEMA, calculateRSI, calculateMACD, detectCrossover } from './indicators';
import { marketData } from './marketData';
import { brokerService } from './broker';
import { executeScript } from './kairosScript';
import { toApiPair } from '../utils/pairUtils';

const WS_ENDPOINTS = [
  'wss://stream.binance.us:9443/ws',
  'wss://stream.binance.com:9443/ws',
];

class TradingEngine {
  constructor() {
    this.activeBots = new Map();
    this.streams = new Map();       // WebSocket per bot
    this.positions = new Map();     // Open positions: botId -> { side, entryPrice, quantity, entryTime }
    this.candles = new Map();       // Candle arrays per bot for indicator calculation
    this.lastHeartbeat = new Map(); // Throttle heartbeat logs
  }

  // ─── Auto-reconnect broker if needed ───
  async _ensureBrokerConnected(bot) {
    if (!bot.brokerId) return false;
    if (brokerService.connections.has(bot.brokerId)) return true;

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

  // ─── Start a bot with real-time WebSocket ───
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

    // Fetch initial candles for indicator calculation
    const apiPair = toApiPair(bot.pair);
    let initialCandles;
    try {
      initialCandles = await marketData.getCandles(apiPair, bot.timeframe, 100);
      this.candles.set(bot.id, initialCandles);
      const lastPrice = initialCandles[initialCandles.length - 1]?.close;
      onLog?.(`📊 ${initialCandles.length} velas cargadas | Precio actual: $${lastPrice?.toFixed(2)}`);
    } catch (err) {
      onLog?.(`❌ Error cargando datos: ${err.message} — Intentando modo polling...`);
      this._startPollingFallback(bot, apiPair, onTrade, onLog);
      return;
    }

    // Run initial strategy evaluation
    const closes = initialCandles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];
    const signal = this._evaluateStrategy(bot.strategy, initialCandles, closes);
    if (signal) {
      onLog?.(`📊 Señal inicial: ${signal.type.toUpperCase()} a $${currentPrice.toFixed(2)}`);
      await this._handleSignal(bot, signal, currentPrice, onTrade, onLog);
    } else {
      onLog?.(`👀 Sin señal aún — Monitoreando en tiempo real...`);
    }

    // Connect real-time WebSocket
    this._connectBotStream(bot, apiPair, onTrade, onLog);
  }

  // ─── Create dedicated WebSocket per bot ───
  _connectBotStream(bot, apiPair, onTrade, onLog, retries = 0) {
    const pair = apiPair.toLowerCase();
    const tf = bot.timeframe || '1m';

    // Use detected endpoint or try US first
    const wsBase = marketData._wsBase || WS_ENDPOINTS[0];
    const url = `${wsBase}/${pair}@ticker/${pair}@kline_${tf}`;

    onLog?.(`🔌 Conectando stream tiempo real: ${apiPair} [${tf}]...`);

    const ws = new WebSocket(url);
    let reconnectTimeout = null;

    ws.onopen = () => {
      onLog?.(`⚡ Stream EN VIVO — Actualización instantánea activa`);
      retries = 0;
    };

    ws.onmessage = (event) => {
      if (!this.activeBots.get(bot.id)?.running) return;

      try {
        const data = JSON.parse(event.data);

        // Real-time ticker — check SL/TP and heartbeat
        if (data.e === '24hrTicker') {
          const currentPrice = parseFloat(data.c);
          this._handleTick(bot, currentPrice, onTrade, onLog);
        }

        // Kline — evaluate strategy on candle close
        if (data.e === 'kline') {
          const k = data.k;
          const candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          };

          if (k.x) {
            // Candle CLOSED — update array and evaluate strategy
            this._handleCandleClose(bot, candle, onTrade, onLog);
          }
        }
      } catch (e) {
        console.error(`[Bot ${bot.id}] WS parse error:`, e);
      }
    };

    ws.onerror = (err) => {
      console.error(`[Bot ${bot.id}] WS error:`, err);
      // Try alternate endpoint on first error
      if (retries === 0 && wsBase === WS_ENDPOINTS[0]) {
        marketData._wsBase = WS_ENDPOINTS[1];
        this._connectBotStream(bot, apiPair, onTrade, onLog, 1);
        return;
      }
    };

    ws.onclose = () => {
      if (!this.activeBots.get(bot.id)?.running) return;

      if (retries < 5) {
        const delay = Math.min(2000 * (retries + 1), 10000);
        onLog?.(`🔄 Reconectando stream en ${delay / 1000}s...`);
        reconnectTimeout = setTimeout(() => {
          this._connectBotStream(bot, apiPair, onTrade, onLog, retries + 1);
        }, delay);
      } else {
        onLog?.(`⚠️ WebSocket no disponible — Cambiando a modo polling`);
        this._startPollingFallback(bot, apiPair, onTrade, onLog);
      }
    };

    // Store WS reference for cleanup
    this.streams.set(bot.id, { ws, reconnectTimeout });
  }

  // ─── Handle real-time price tick ───
  _handleTick(bot, currentPrice, onTrade, onLog) {
    // Heartbeat every 10 seconds
    const now = Date.now();
    const lastHB = this.lastHeartbeat.get(bot.id) || 0;
    if (now - lastHB > 10000) {
      this.lastHeartbeat.set(bot.id, now);
      const pos = this.positions.get(bot.id);
      if (pos) {
        const unrealizedPnl = pos.side === 'buy'
          ? (currentPrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - currentPrice) * pos.quantity;
        onLog?.(`💓 $${currentPrice.toFixed(2)} | ${pos.side.toUpperCase()} @ $${pos.entryPrice.toFixed(2)} | P&L: ${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)}`);
      } else {
        onLog?.(`💓 $${currentPrice.toFixed(2)} — Esperando señal...`);
      }
    }

    // Check SL/TP on EVERY tick (instant reaction)
    this._checkStopLossTakeProfit(bot, currentPrice, onTrade, onLog);
  }

  // ─── Handle closed candle — evaluate strategy ───
  async _handleCandleClose(bot, candle, onTrade, onLog) {
    const botCandles = this.candles.get(bot.id) || [];

    // Append or update last candle
    if (botCandles.length > 0 && botCandles[botCandles.length - 1].time === candle.time) {
      botCandles[botCandles.length - 1] = candle;
    } else {
      botCandles.push(candle);
      if (botCandles.length > 200) botCandles.shift();
    }
    this.candles.set(bot.id, botCandles);

    const closes = botCandles.map(c => c.close);
    const currentPrice = candle.close;

    onLog?.(`🕯️ Vela cerrada: O:${candle.open.toFixed(2)} H:${candle.high.toFixed(2)} L:${candle.low.toFixed(2)} C:${candle.close.toFixed(2)} V:${candle.volume.toFixed(0)}`);

    // Evaluate strategy
    const signal = this._evaluateStrategy(bot.strategy, botCandles, closes);
    if (signal) {
      await this._handleSignal(bot, signal, currentPrice, onTrade, onLog);
    }
  }

  // ─── Handle trade signal (open/close positions) ───
  async _handleSignal(bot, signal, currentPrice, onTrade, onLog) {
    const openPosition = this.positions.get(bot.id);

    // Close existing position if signal is opposite
    if (openPosition && openPosition.side !== signal.type) {
      await this._closePosition(bot, openPosition, currentPrice, signal.type, onTrade, onLog);
    }

    // Open NEW position
    if (!this.positions.has(bot.id)) {
      await this._openPosition(bot, signal, currentPrice, onTrade, onLog);
    }
  }

  // ─── Close position ───
  async _closePosition(bot, position, currentPrice, exitSide, onTrade, onLog) {
    const entryPrice = position.entryPrice;
    const qty = position.quantity;
    const profit = position.side === 'buy'
      ? (currentPrice - entryPrice) * qty
      : (entryPrice - currentPrice) * qty;

    onLog?.(`📊 Cerrando: ${position.side.toUpperCase()} → ${exitSide.toUpperCase()} | $${entryPrice.toFixed(2)} → $${currentPrice.toFixed(2)} | P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);

    const closeOrder = {
      symbol: toApiPair(bot.pair),
      side: exitSide,
      type: 'market',
      quantity: qty,
      price: currentPrice,
    };

    if (bot.brokerId && brokerService.connections.has(bot.brokerId)) {
      try {
        onLog?.(`🔄 Cerrando posición REAL en broker...`);
        const result = await brokerService.placeOrder(bot.brokerId, closeOrder);
        const realProfit = result.filledPrice
          ? (position.side === 'buy'
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

  // ─── Open position ───
  async _openPosition(bot, signal, currentPrice, onTrade, onLog) {
    onLog?.(`📊 Señal: ${signal.type.toUpperCase()} a $${currentPrice.toFixed(2)}`);

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

    if (bot.brokerId && brokerService.connections.has(bot.brokerId)) {
      try {
        onLog?.(`🔄 Ejecutando orden REAL en broker...`);
        const result = await brokerService.placeOrder(bot.brokerId, order);
        const fillPrice = result.filledPrice || currentPrice;
        onLog?.(`✅ ORDEN REAL: ${result.side?.toUpperCase()} ${result.filledQty || positionSize} @ $${fillPrice} [${result.status}]`);

        this.positions.set(bot.id, {
          side: signal.type,
          entryPrice: fillPrice,
          quantity: result.filledQty || positionSize,
          entryTime: Date.now(),
          orderId: result.id,
        });
        onTrade?.({ ...order, ...result, real: true, action: 'open' });
      } catch (err) {
        onLog?.(`❌ Error ejecutando orden: ${err.message}`);
        onTrade?.({ ...order, status: 'error', error: err.message });
      }
    } else {
      onLog?.(`📝 [DEMO] ${signal.type.toUpperCase()} ${positionSize} @ $${currentPrice.toFixed(2)}`);
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

  // ─── Check SL/TP on every tick (real-time) ───
  async _checkStopLossTakeProfit(bot, currentPrice, onTrade, onLog) {
    const pos = this.positions.get(bot.id);
    if (!pos) return;

    const slPct = parseFloat(bot.strategy?.stopLoss || 2) / 100;
    const tpPct = parseFloat(bot.strategy?.takeProfit || 4) / 100;

    const sl = pos.side === 'buy'
      ? pos.entryPrice * (1 - slPct)
      : pos.entryPrice * (1 + slPct);
    const tp = pos.side === 'buy'
      ? pos.entryPrice * (1 + tpPct)
      : pos.entryPrice * (1 - tpPct);

    const hitSL = pos.side === 'buy' ? currentPrice <= sl : currentPrice >= sl;
    const hitTP = pos.side === 'buy' ? currentPrice >= tp : currentPrice <= tp;

    if (hitSL || hitTP) {
      const exitSide = pos.side === 'buy' ? 'sell' : 'buy';
      const reason = hitSL ? 'stop_loss' : 'take_profit';

      onLog?.(`${hitSL ? '🛑 STOP-LOSS' : '🎯 TAKE-PROFIT'} a $${currentPrice.toFixed(2)}`);
      await this._closePosition(bot, pos, currentPrice, exitSide,
        (trade) => onTrade?.({ ...trade, reason }),
        onLog
      );
    }
  }

  // ─── Polling fallback if WebSocket fails ───
  _startPollingFallback(bot, apiPair, onTrade, onLog) {
    const checkInterval = this._getCheckInterval(bot.timeframe);
    onLog?.(`⏱️ Modo polling — revisión cada ${checkInterval / 1000}s`);

    const monitor = async () => {
      if (!this.activeBots.get(bot.id)?.running) return;

      try {
        const candles = await marketData.getCandles(apiPair, bot.timeframe, 100);
        this.candles.set(bot.id, candles);
        const closes = candles.map(c => c.close);
        const currentPrice = closes[closes.length - 1];

        // Heartbeat
        const pos = this.positions.get(bot.id);
        if (pos) {
          const pnl = pos.side === 'buy'
            ? (currentPrice - pos.entryPrice) * pos.quantity
            : (pos.entryPrice - currentPrice) * pos.quantity;
          onLog?.(`💓 $${currentPrice.toFixed(2)} | ${pos.side.toUpperCase()} @ $${pos.entryPrice.toFixed(2)} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
        } else {
          onLog?.(`💓 $${currentPrice.toFixed(2)} — Esperando señal...`);
        }

        // Evaluate
        const signal = this._evaluateStrategy(bot.strategy, candles, closes);
        if (signal) {
          await this._handleSignal(bot, signal, currentPrice, onTrade, onLog);
        }

        // Check SL/TP
        this._checkStopLossTakeProfit(bot, currentPrice, onTrade, onLog);
      } catch (err) {
        onLog?.(`❌ Error: ${err.message}`);
      }
    };

    monitor();
    const interval = setInterval(monitor, checkInterval);
    this.streams.set(bot.id, { interval });
  }

  // ─── Stop a bot ───
  stopBot(botId) {
    const active = this.activeBots.get(botId);
    if (active) {
      active.running = false;
      this.activeBots.delete(botId);
    }

    // Close WebSocket or clear polling interval
    const stream = this.streams.get(botId);
    if (stream) {
      if (stream.ws) {
        try { stream.ws.close(); } catch {}
      }
      if (stream.reconnectTimeout) clearTimeout(stream.reconnectTimeout);
      if (stream.interval) clearInterval(stream.interval);
      this.streams.delete(botId);
    }

    // Clear data
    this.positions.delete(botId);
    this.candles.delete(botId);
    this.lastHeartbeat.delete(botId);
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
      return result.signal;
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

        if (indicator === 'ema_cross_rsi') {
          const rsiPeriod = strategy.entry.params?.rsiPeriod || 14;
          const rsi = calculateRSI(closes, rsiPeriod);
          const currentRSI = rsi[len - 1];
          const oversold = strategy.entry.params?.rsiOversold || 30;
          const overbought = strategy.exit?.params?.rsiOverbought || 70;

          if (cross === 'bullish_cross' && currentRSI < oversold) return { type: 'buy' };
          if (cross === 'bearish_cross' && currentRSI > overbought) return { type: 'sell' };
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
    return Math.round(amount * 1e8) / 1e8;
  }

  // ─── Get check interval (polling fallback) ───
  _getCheckInterval(timeframe) {
    const intervals = {
      '1m': 15000,
      '5m': 30000,
      '15m': 60000,
      '1h': 60000,
      '4h': 120000,
      '1d': 300000,
    };
    return intervals[timeframe] || 60000;
  }

  // ─── Get active bots count ───
  getActiveBotCount() {
    return this.activeBots.size;
  }
}

export const tradingEngine = new TradingEngine();
export default tradingEngine;
