// Kairos Trade — Trading Engine (Bot Execution Core)
// Real-time WebSocket monitoring + REAL trade execution via connected broker
// Each bot gets a dedicated WebSocket for instant price updates
// Callbacks are stored in a registry so they survive component remounts

import { calculateEMA, calculateRSI, calculateMACD, detectCrossover } from './indicators';
import { marketData } from './marketData';
import { brokerService } from './broker';
import { executeScript } from './kairosScript';
import { toApiPair } from '../utils/pairUtils';
import { telegramService } from './telegram';
import { feeService } from './feeService';

const WS_ENDPOINTS = [
  'wss://stream.binance.us:9443/ws',
  'wss://stream.binance.com:9443/ws',
];

class TradingEngine {
  constructor() {
    this.activeBots = new Map();
    this.streams = new Map();       // WebSocket or interval per bot
    this.positions = new Map();     // Open positions: botId -> { side, entryPrice, quantity, entryTime }
    this.candles = new Map();       // Candle arrays per bot for indicator calculation
    this.lastHeartbeat = new Map(); // Throttle heartbeat logs
    this.logs = new Map();          // Internal log buffer per bot (survives navigation)
    this.callbacks = new Map();     // Callback registry per bot { onTrade, onLog }
    this.liveData = new Map();      // Real-time data per bot: { price, unrealizedPnl, position }
  }

  // ─── Internal log: stores + forwards to UI ───
  _log(botId, msg) {
    const logs = this.logs.get(botId) || [];
    const botData = this.activeBots.get(botId);
    logs.push({ message: msg, time: Date.now(), botName: botData?.bot?.name || 'Bot' });
    if (logs.length > 150) logs.splice(0, 50);
    this.logs.set(botId, logs);
    try { this.callbacks.get(botId)?.onLog?.(msg); } catch (e) { /* stale callback */ }
  }

  // ─── Internal trade forward ───
  _onTrade(botId, trade) {
    try { this.callbacks.get(botId)?.onTrade?.(trade); } catch (e) { /* stale callback */ }
  }

  // ─── Sync bot position to Zustand store (for OrdersPanel visibility) ───
  async _syncPositionToStore(bot, entryPrice, side, quantity, order) {
    try {
      const store = (await import('../store/useStore')).default;
      const state = store.getState();

      // Remove any existing position for this bot first (prevent duplicates)
      const existing = state.positions.filter(p => p.botId === bot.id);
      existing.forEach(p => state.closePosition(p.id));

      store.getState().addPosition({
        pair: bot.pair,
        side,
        quantity,
        entryPrice,
        currentPrice: entryPrice,
        stopLoss: order.stopLoss ? parseFloat(order.stopLoss.toFixed(2)) : null,
        takeProfit: order.takeProfit ? parseFloat(order.takeProfit.toFixed(2)) : null,
        botId: bot.id,
        botName: bot.name,
        time: Date.now(),
      });
    } catch {}
  }

  // ─── Remove bot position from store ───
  async _removePositionFromStore(botId) {
    try {
      const store = (await import('../store/useStore')).default;
      const state = store.getState();
      // Remove ALL positions for this bot (in case of duplicates)
      const botPositions = state.positions.filter(p => p.botId === botId);
      botPositions.forEach(p => state.closePosition(p.id));
    } catch {}
  }

  // ─── Update callbacks (call when component remounts) ───
  setCallbacks(botId, onTrade, onLog) {
    this.callbacks.set(botId, { onTrade, onLog });
  }

  // ─── Get stored logs for a bot ───
  getLogs(botId) {
    return this.logs.get(botId) || [];
  }

  // ─── Get all logs across all bots ───
  getAllLogs() {
    const all = [];
    for (const [botId, logs] of this.logs) {
      all.push(...logs.map(l => ({ ...l, botId })));
    }
    return all.sort((a, b) => a.time - b.time).slice(-100);
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

    // Register callbacks in registry (looked up dynamically, never stale)
    this.callbacks.set(bot.id, { onTrade, onLog });
    this.activeBots.set(bot.id, { bot, running: true });

    this._log(bot.id, `🤖 Bot "${bot.name}" iniciado en ${bot.pair}`);

    // Auto-reconnect broker
    const brokerReady = await this._ensureBrokerConnected(bot);
    if (bot.brokerId) {
      this._log(bot.id, brokerReady
        ? `🔗 Broker conectado — modo REAL activado`
        : `⚠️ Broker no disponible — modo DEMO`);
    } else {
      this._log(bot.id, `📋 Modo DEMO — Conecta un broker para operar en real`);
    }

    // Fetch initial candles for indicator calculation
    const apiPair = toApiPair(bot.pair);
    let initialCandles;
    try {
      initialCandles = await marketData.getCandles(apiPair, bot.timeframe, 100);
      this.candles.set(bot.id, initialCandles);
      const lastPrice = initialCandles[initialCandles.length - 1]?.close;
      this._log(bot.id, `📊 ${initialCandles.length} velas cargadas | Precio: $${lastPrice?.toFixed(2)} | TF: ${bot.timeframe}`);
    } catch (err) {
      this._log(bot.id, `❌ Error cargando datos: ${err.message}`);
      this._log(bot.id, `⏱️ Cambiando a modo polling...`);
      this._startPollingFallback(bot, apiPair);
      return;
    }

    // Run initial strategy evaluation
    const closes = initialCandles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];
    const signal = this._evaluateStrategy(bot.strategy, initialCandles, closes, bot.id);
    if (signal) {
      this._log(bot.id, `📊 Señal inicial: ${signal.type.toUpperCase()} a $${currentPrice.toFixed(2)}`);
      await this._handleSignal(bot, signal, currentPrice);
    } else {
      // Log current indicator values so user sees the bot is analyzing
      this._logIndicatorStatus(bot, closes);
    }

    // Connect real-time WebSocket
    this._connectBotStream(bot, apiPair);
  }

  // ─── Log indicator status (no signal, but show what the bot sees) ───
  _logIndicatorStatus(bot, closes) {
    const len = closes.length;
    const ind = bot.strategy?.entry?.indicator;
    try {
      if (ind === 'ema_cross' || ind === 'ema_cross_rsi') {
        const fast = bot.strategy.entry.params?.fastEma || bot.strategy.entry.params?.fast || 20;
        const slow = bot.strategy.entry.params?.slowEma || bot.strategy.entry.params?.slow || 50;
        const emaFast = calculateEMA(closes, fast);
        const emaSlow = calculateEMA(closes, slow);
        const diff = ((emaFast[len - 1] - emaSlow[len - 1]) / emaSlow[len - 1] * 100).toFixed(3);
        let info = `📈 EMA${fast}: $${emaFast[len - 1]?.toFixed(2)} | EMA${slow}: $${emaSlow[len - 1]?.toFixed(2)} | Diff: ${diff}%`;
        if (ind === 'ema_cross_rsi') {
          const rsi = calculateRSI(closes, bot.strategy.entry.params?.rsiPeriod || 14);
          info += ` | RSI: ${rsi[len - 1]?.toFixed(1)}`;
        }
        this._log(bot.id, `${info} — Sin señal, monitoreando...`);
      } else if (ind === 'rsi') {
        const rsi = calculateRSI(closes, bot.strategy.entry.params?.period || 14);
        this._log(bot.id, `📈 RSI: ${rsi[len - 1]?.toFixed(1)} — Sin señal, monitoreando...`);
      } else if (ind === 'macd_cross') {
        const { macd, signal } = calculateMACD(closes);
        this._log(bot.id, `📈 MACD: ${macd[len - 1]?.toFixed(2)} | Signal: ${signal[len - 1]?.toFixed(2)} — Sin señal, monitoreando...`);
      } else if (bot.strategy?.type === 'custom_script') {
        // Custom script — show key indicator values automatically
        const emaFast = calculateEMA(closes, 9);
        const emaSlow = calculateEMA(closes, 21);
        const rsiArr = calculateRSI(closes, 14);
        const p = closes[len - 1];
        const diff = ((emaFast[len - 1] - emaSlow[len - 1]) / emaSlow[len - 1] * 100).toFixed(3);
        this._log(bot.id, `📈 $${p?.toFixed(2)} | EMA9: $${emaFast[len - 1]?.toFixed(2)} | EMA21: $${emaSlow[len - 1]?.toFixed(2)} (${diff}%) | RSI: ${rsiArr[len - 1]?.toFixed(1)} — Sin señal`);
      } else {
        this._log(bot.id, `👀 Sin señal — Monitoreando en tiempo real...`);
      }
    } catch {
      this._log(bot.id, `👀 Sin señal — Monitoreando en tiempo real...`);
    }
  }

  // ─── Create dedicated WebSocket per bot ───
  _connectBotStream(bot, apiPair, retries = 0) {
    if (!this.activeBots.get(bot.id)?.running) return;

    const pair = apiPair.toLowerCase();
    const tf = bot.timeframe || '1m';

    // Use detected endpoint or try US first
    const wsBase = marketData._wsBase || WS_ENDPOINTS[0];
    const url = `${wsBase}/${pair}@ticker/${pair}@kline_${tf}`;

    this._log(bot.id, `🔌 Conectando stream: ${apiPair} @ ${tf}${retries > 0 ? ` (intento ${retries + 1})` : ''}...`);

    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      this._log(bot.id, `❌ Error WebSocket: ${err.message} — Cambiando a polling`);
      this._startPollingFallback(bot, apiPair);
      return;
    }

    let reconnectTimeout = null;

    ws.onopen = () => {
      this._log(bot.id, `⚡ Stream EN VIVO conectado — Datos instantáneos activos`);
      retries = 0;
    };

    ws.onmessage = (event) => {
      if (!this.activeBots.get(bot.id)?.running) return;

      try {
        const data = JSON.parse(event.data);

        // Real-time ticker — check SL/TP and heartbeat
        if (data.e === '24hrTicker') {
          const currentPrice = parseFloat(data.c);
          this._handleTick(bot, currentPrice);
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
            this._handleCandleClose(bot, candle);
          }
        }
      } catch (e) {
        console.error(`[Bot ${bot.id}] WS parse:`, e);
      }
    };

    ws.onerror = (err) => {
      console.error(`[Bot ${bot.id}] WS error`, err);
      // Try alternate endpoint on first error
      if (retries === 0) {
        const altBase = wsBase === WS_ENDPOINTS[0] ? WS_ENDPOINTS[1] : WS_ENDPOINTS[0];
        marketData._wsBase = altBase;
        this._log(bot.id, `🔄 Probando endpoint alternativo...`);
        try { ws.close(); } catch {}
        this._connectBotStream(bot, apiPair, 1);
        return;
      }
    };

    ws.onclose = () => {
      if (!this.activeBots.get(bot.id)?.running) return;

      if (retries < 5) {
        const delay = Math.min(2000 * (retries + 1), 10000);
        this._log(bot.id, `🔄 Reconectando en ${delay / 1000}s...`);
        reconnectTimeout = setTimeout(() => {
          this._connectBotStream(bot, apiPair, retries + 1);
        }, delay);
      } else {
        this._log(bot.id, `⚠️ WebSocket no disponible — Modo polling activado`);
        this._startPollingFallback(bot, apiPair);
      }
    };

    // Store WS reference for cleanup
    this.streams.set(bot.id, { ws, reconnectTimeout });
  }

  // ─── Get live data for a bot (called by UI) ───
  getLiveData(botId) {
    return this.liveData.get(botId) || null;
  }

  // ─── Handle real-time price tick ───
  _handleTick(bot, currentPrice) {
    // Update live data on EVERY tick (for real-time UI)
    const pos = this.positions.get(bot.id);
    if (pos) {
      const unrealizedPnl = pos.side === 'buy'
        ? (currentPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - currentPrice) * pos.quantity;
      const pnlPercent = pos.side === 'buy'
        ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
        : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100;
      this.liveData.set(bot.id, {
        price: currentPrice,
        unrealizedPnl,
        pnlPercent,
        position: { side: pos.side, entryPrice: pos.entryPrice, quantity: pos.quantity },
        time: Date.now(),
      });
    } else {
      this.liveData.set(bot.id, { price: currentPrice, unrealizedPnl: 0, pnlPercent: 0, position: null, time: Date.now() });
    }

    // Heartbeat log every 10 seconds
    const now = Date.now();
    const lastHB = this.lastHeartbeat.get(bot.id) || 0;
    if (now - lastHB > 10000) {
      this.lastHeartbeat.set(bot.id, now);
      if (pos) {
        const unrealizedPnl = pos.side === 'buy'
          ? (currentPrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - currentPrice) * pos.quantity;
        this._log(bot.id, `💓 $${currentPrice.toFixed(2)} | ${pos.side.toUpperCase()} @ $${pos.entryPrice.toFixed(2)} | P&L: ${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)}`);
      } else {
        this._log(bot.id, `💓 $${currentPrice.toFixed(2)} — Esperando señal...`);
      }
    }

    // Check SL/TP on EVERY tick (instant reaction)
    this._checkStopLossTakeProfit(bot, currentPrice);
  }

  // ─── Handle closed candle — evaluate strategy ───
  async _handleCandleClose(bot, candle) {
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

    this._log(bot.id, `🕯️ Vela cerrada: O:${candle.open.toFixed(2)} H:${candle.high.toFixed(2)} L:${candle.low.toFixed(2)} C:${candle.close.toFixed(2)}`);

    // Evaluate strategy
    const signal = this._evaluateStrategy(bot.strategy, botCandles, closes, bot.id);
    if (signal) {
      await this._handleSignal(bot, signal, currentPrice);
    } else {
      // Show indicator values so user knows bot is analyzing
      this._logIndicatorStatus(bot, closes);
    }
  }

  // ─── Handle trade signal (open/close positions) ───
  async _handleSignal(bot, signal, currentPrice) {
    const openPosition = this.positions.get(bot.id);

    // Close existing position if signal is opposite
    if (openPosition && openPosition.side !== signal.type) {
      await this._closePosition(bot, openPosition, currentPrice, signal.type);
    }

    // Open NEW position
    if (!this.positions.has(bot.id)) {
      await this._openPosition(bot, signal, currentPrice);
    }
  }

  // ─── Close position ───
  async _closePosition(bot, position, currentPrice, exitSide, reason) {
    const entryPrice = position.entryPrice;
    const qty = position.quantity;
    const rawProfit = position.side === 'buy'
      ? (currentPrice - entryPrice) * qty
      : (entryPrice - currentPrice) * qty;

    // Platform fee (0.05% of volume on close)
    const closeFee = feeService.applyVolumeFee(currentPrice, qty);
    const profit = rawProfit - closeFee;

    this._log(bot.id, `📊 Cerrando: ${position.side.toUpperCase()} → ${exitSide.toUpperCase()} | $${entryPrice.toFixed(2)} → $${currentPrice.toFixed(2)} | P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);

    const closeOrder = {
      symbol: toApiPair(bot.pair),
      side: exitSide,
      type: 'market',
      quantity: qty,
      price: currentPrice,
    };

    if (bot.brokerId && brokerService.connections.has(bot.brokerId)) {
      try {
        this._log(bot.id, `🔄 Cerrando posición REAL en broker...`);
        const result = await brokerService.placeOrder(bot.brokerId, closeOrder);
        const confirmed = result.confirmed !== false;
        const realExitPrice = (result.filledPrice && result.filledPrice > 0)
          ? result.filledPrice : currentPrice;
        const rawRealProfit = position.side === 'buy'
          ? (realExitPrice - entryPrice) * qty
          : (entryPrice - realExitPrice) * qty;
        const realProfit = rawRealProfit - closeFee;
        const statusIcon = confirmed ? '✅' : '⚠️';
        this._log(bot.id, `${statusIcon} Cerrada: P&L ${realProfit >= 0 ? '+' : ''}$${realProfit.toFixed(4)} [${result.status}] ID:${result.id || 'N/A'}`);
        this._onTrade(bot.id, { ...closeOrder, ...result, profit: realProfit, real: true, confirmed, action: 'close', reason });

        // Telegram notification
        telegramService.notifyTradeClose(bot.name, pos.side, bot.pair, entryPrice, realExitPrice, realProfit, reason);

        // Auto-refresh balance from broker after closing
        this._refreshBotBalance(bot);
      } catch (err) {
        this._log(bot.id, `❌ Error cerrando: ${err.message}`);
        this._onTrade(bot.id, { ...closeOrder, profit, status: 'error', error: err.message, action: 'close' });
      }
    } else {
      this._log(bot.id, `📝 [DEMO] Cerrada: P&L ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);
      this._onTrade(bot.id, { ...closeOrder, profit, status: 'filled', simulated: true, action: 'close', reason });
    }

    this.positions.delete(bot.id);
    this._removePositionFromStore(bot.id);
  }

  // ─── Open position ───
  async _openPosition(bot, signal, currentPrice) {
    // Short cooldown (5s): prevents double-fire on same candle, lets next candle evaluate fresh
    const lastFail = this._lastOrderFail?.get(bot.id) || 0;
    const cooldown = this._lastFailPermanent?.get(bot.id) ? 60000 : 5000; // 1min for balance issues, 5s for transient
    if (Date.now() - lastFail < cooldown) {
      return;
    }

    this._log(bot.id, `📊 Señal: ${signal.type.toUpperCase()} a $${currentPrice.toFixed(2)}`);

    const positionSize = this._calculatePositionSize(bot, currentPrice);

    // Sanity check: if position too small even after minimum, skip
    if (positionSize * currentPrice < 0.50) {
      this._log(bot.id, `⚠️ Balance insuficiente para operar (mínimo ~$1). Necesitas al menos $1.10 de saldo.`);
      this._lastOrderFail = this._lastOrderFail || new Map();
      this._lastFailPermanent = this._lastFailPermanent || new Map();
      this._lastOrderFail.set(bot.id, Date.now());
      this._lastFailPermanent.set(bot.id, true);
      return;
    }

    // Use script config SL/TP if available, otherwise bot strategy defaults
    const scriptCfg = this._scriptConfigs?.get(bot.id);
    const slPct = parseFloat(scriptCfg?.stopLoss || bot.strategy?.stopLoss || 2) / 100;
    const tpPct = parseFloat(scriptCfg?.takeProfit || bot.strategy?.takeProfit || 4) / 100;

    const order = {
      symbol: toApiPair(bot.pair),
      side: signal.type,
      type: 'market',
      quantity: positionSize,
      price: currentPrice,
      stopLoss: signal.type === 'buy'
        ? currentPrice * (1 - slPct)
        : currentPrice * (1 + slPct),
      takeProfit: signal.type === 'buy'
        ? currentPrice * (1 + tpPct)
        : currentPrice * (1 - tpPct),
    };

    if (bot.brokerId && brokerService.connections.has(bot.brokerId)) {
      try {
        this._log(bot.id, `🔄 Ejecutando orden REAL en broker...`);
        const result = await brokerService.placeOrder(bot.brokerId, order);
        const fillPrice = result.filledPrice || currentPrice;
        const confirmed = result.confirmed !== false;
        const statusIcon = confirmed ? '✅' : '⚠️';
        // Platform fee (0.05% of volume on open)
        feeService.applyVolumeFee(fillPrice, result.filledQty || positionSize);

        this._log(bot.id, `${statusIcon} REAL: ${result.side?.toUpperCase()} ${result.filledQty || positionSize} @ $${fillPrice.toFixed(2)} [${result.status}] ID:${result.id || 'N/A'}`);
        if (!confirmed) {
          this._log(bot.id, `⚠️ Orden no confirmada por el broker — el fill real puede diferir`);
        }
        // Clear cooldown on success
        this._lastOrderFail?.delete(bot.id);
        this._lastFailPermanent?.delete(bot.id);

        this.positions.set(bot.id, {
          side: signal.type,
          entryPrice: fillPrice,
          quantity: result.filledQty || positionSize,
          entryTime: Date.now(),
          orderId: result.id,
        });
        this._syncPositionToStore(bot, fillPrice, signal.type, result.filledQty || positionSize, order);
        this._onTrade(bot.id, { ...order, ...result, real: true, action: 'open' });

        // Telegram notification
        telegramService.notifyTradeOpen(bot.name, signal.type, bot.pair, fillPrice, result.filledQty || positionSize, bot.brokerName || bot.brokerId);

        // Auto-refresh balance from broker after trade
        this._refreshBotBalance(bot);
      } catch (err) {
        this._log(bot.id, `❌ Error orden: ${err.message}`);
        // Short cooldown (5s) — next candle re-evaluará la señal fresca
        this._lastOrderFail = this._lastOrderFail || new Map();
        this._lastOrderFail.set(bot.id, Date.now());
        // Detect permanent errors (balance/size) vs transient (network/rate-limit)
        this._lastFailPermanent = this._lastFailPermanent || new Map();
        const msg = err.message.toLowerCase();
        const isPermanent = msg.includes('insufficient') || msg.includes('size') || msg.includes('balance') || msg.includes('too small') || msg.includes('minimum');
        this._lastFailPermanent.set(bot.id, isPermanent);
        // Don't fire _onTrade for errors (don't count as trade)
      }
    } else {
      // Platform fee (0.05% of volume on open — demo)
      feeService.applyVolumeFee(currentPrice, positionSize);

      this._log(bot.id, `📝 [DEMO] ${signal.type.toUpperCase()} ${positionSize} @ $${currentPrice.toFixed(2)}`);
      this.positions.set(bot.id, {
        side: signal.type,
        entryPrice: currentPrice,
        quantity: positionSize,
        entryTime: Date.now(),
        simulated: true,
      });
      this._syncPositionToStore(bot, currentPrice, signal.type, positionSize, order);
      this._onTrade(bot.id, { ...order, status: 'filled', simulated: true, action: 'open' });
    }
  }

  // ─── Check SL/TP + Trailing Stop on every tick (real-time) ───
  async _checkStopLossTakeProfit(bot, currentPrice) {
    const pos = this.positions.get(bot.id);
    if (!pos) return;

    const scriptCfg = this._scriptConfigs?.get(bot.id);
    const slPct = parseFloat(scriptCfg?.stopLoss || bot.strategy?.stopLoss || 2) / 100;
    const tpPct = parseFloat(scriptCfg?.takeProfit || bot.strategy?.takeProfit || 4) / 100;

    // ── Trailing Stop Loss Logic ──
    // Activates when trailingStop is enabled on the bot or strategy
    const trailingEnabled = bot.trailingStop || bot.strategy?.trailingStop || scriptCfg?.trailingStop;
    const trailingPct = parseFloat(bot.trailingStopPct || bot.strategy?.trailingStopPct || scriptCfg?.trailingStopPct || slPct * 100) / 100;
    const trailingActivation = parseFloat(bot.trailingActivation || bot.strategy?.trailingActivation || scriptCfg?.trailingActivation || 0.5) / 100;

    let sl, effectiveTrailing = false;
    if (trailingEnabled) {
      // Track best price since entry
      if (!pos.bestPrice) pos.bestPrice = pos.entryPrice;
      if (pos.side === 'buy') {
        pos.bestPrice = Math.max(pos.bestPrice, currentPrice);
        // Activate trailing only after price moves X% in profit
        const profitPct = (currentPrice - pos.entryPrice) / pos.entryPrice;
        if (profitPct >= trailingActivation) {
          sl = pos.bestPrice * (1 - trailingPct);
          effectiveTrailing = true;
        } else {
          sl = pos.entryPrice * (1 - slPct); // Use regular SL until activation
        }
      } else {
        pos.bestPrice = Math.min(pos.bestPrice, currentPrice);
        const profitPct = (pos.entryPrice - currentPrice) / pos.entryPrice;
        if (profitPct >= trailingActivation) {
          sl = pos.bestPrice * (1 + trailingPct);
          effectiveTrailing = true;
        } else {
          sl = pos.entryPrice * (1 + slPct);
        }
      }
      // Update position in map with tracked best price
      this.positions.set(bot.id, pos);
    } else {
      sl = pos.side === 'buy'
        ? pos.entryPrice * (1 - slPct)
        : pos.entryPrice * (1 + slPct);
    }

    const tp = pos.side === 'buy'
      ? pos.entryPrice * (1 + tpPct)
      : pos.entryPrice * (1 - tpPct);

    const hitSL = pos.side === 'buy' ? currentPrice <= sl : currentPrice >= sl;
    const hitTP = pos.side === 'buy' ? currentPrice >= tp : currentPrice <= tp;

    // Update live data with trailing info
    if (effectiveTrailing) {
      const ld = this.liveData.get(bot.id);
      if (ld) {
        ld.trailingStop = sl;
        ld.bestPrice = pos.bestPrice;
        this.liveData.set(bot.id, ld);
      }
    }

    if (hitSL || hitTP) {
      const exitSide = pos.side === 'buy' ? 'sell' : 'buy';
      const reason = hitSL ? (effectiveTrailing ? 'trailing_stop' : 'stop_loss') : 'take_profit';
      const icon = hitSL ? (effectiveTrailing ? '📐 TRAILING-STOP' : '🛑 STOP-LOSS') : '🎯 TAKE-PROFIT';

      this._log(bot.id, `${icon} a $${currentPrice.toFixed(2)}${effectiveTrailing ? ` (best: $${pos.bestPrice?.toFixed(2)})` : ''}`);
      await this._closePosition(bot, pos, currentPrice, exitSide, reason);
    }
  }

  // ─── Polling fallback if WebSocket fails ───
  _startPollingFallback(bot, apiPair) {
    const checkInterval = this._getCheckInterval(bot.timeframe);
    this._log(bot.id, `⏱️ Polling cada ${checkInterval / 1000}s`);

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
          this._log(bot.id, `💓 $${currentPrice.toFixed(2)} | ${pos.side.toUpperCase()} @ $${pos.entryPrice.toFixed(2)} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
        } else {
          this._log(bot.id, `💓 $${currentPrice.toFixed(2)} — Esperando señal...`);
        }

        // Evaluate
        const signal = this._evaluateStrategy(bot.strategy, candles, closes, bot.id);
        if (signal) {
          await this._handleSignal(bot, signal, currentPrice);
        } else {
          this._logIndicatorStatus(bot, closes);
        }

        // Check SL/TP
        await this._checkStopLossTakeProfit(bot, currentPrice);
      } catch (err) {
        this._log(bot.id, `❌ Error: ${err.message}`);
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

    // Clear runtime data (keep logs for review)
    this.positions.delete(botId);
    this.candles.delete(botId);
    this.lastHeartbeat.delete(botId);
    this.callbacks.delete(botId);
    this.liveData.delete(botId);
  }

  // ─── Evaluate strategy rules ───
  _evaluateStrategy(strategy, candles, closes, botId) {
    // Custom Kairos Script
    if (strategy?.type === 'custom_script' && strategy?.code) {
      const result = executeScript(strategy.code, candles);

      // Surface script logs to the user
      if (result.logs?.length > 0) {
        result.logs.forEach(l => this._log(botId, `📝 ${l}`));
      }

      if (result.error) {
        this._log(botId, `❌ Script error: ${result.error}`);
        return null;
      }

      // Store script config for SL/TP
      if (result.config && botId) {
        this._scriptConfigs = this._scriptConfigs || new Map();
        this._scriptConfigs.set(botId, result.config);
      }

      if (result.signal) {
        this._log(botId, `🎯 Script señal: ${result.signal.type.toUpperCase()}`);
      }
      return result.signal;
    }

    if (!strategy?.entry?.indicator) return null;

    const len = closes.length;
    if (len < 50) return null; // Need enough data for indicators
    const indicator = strategy.entry.indicator;

    switch (indicator) {
      case 'ema_cross':
      case 'ema_cross_rsi': {
        const fast = strategy.entry.params?.fastEma || strategy.entry.params?.fast || 9;
        const slow = strategy.entry.params?.slowEma || strategy.entry.params?.slow || 21;
        const emaFast = calculateEMA(closes, fast);
        const emaSlow = calculateEMA(closes, slow);
        const cross = detectCrossover(emaFast, emaSlow, len - 1);

        if (indicator === 'ema_cross_rsi') {
          const rsiPeriod = strategy.entry.params?.rsiPeriod || 14;
          const rsi = calculateRSI(closes, rsiPeriod);
          const currentRSI = rsi[len - 1];
          const oversold = strategy.entry.params?.rsiOversold || 35;
          const overbought = strategy.exit?.params?.rsiOverbought || 65;

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

  // ─── Auto-refresh bot balance from real broker after trade ───
  async _refreshBotBalance(bot) {
    if (!bot.brokerId || !brokerService.connections.has(bot.brokerId)) return;
    try {
      const balances = await brokerService.getBalances(bot.brokerId);
      // Find USDT, USD, USDC — whatever the stablecoin balance is
      const stableNames = ['USDT', 'USD', 'USDC', 'BUSD', 'FDUSD'];
      const stableBal = balances.find(b => stableNames.includes(b.asset?.toUpperCase()));
      if (stableBal) {
        const newBalance = parseFloat(stableBal.free || stableBal.total || 0);
        if (newBalance > 0 && newBalance !== bot.balance) {
          this._log(bot.id, `💰 Balance actualizado: $${bot.balance?.toFixed(2)} → $${newBalance.toFixed(2)}`);
          bot.balance = newBalance;
          // Also update in store
          try {
            const { default: useStore } = await import('../store/useStore');
            const store = useStore.getState();
            const bots = store.bots || [];
            const updated = bots.map(b => b.id === bot.id ? { ...b, balance: newBalance } : b);
            useStore.setState({ bots: updated });
          } catch {}
        }
      }
    } catch (err) {
      // Non-critical, just log
      console.warn('[tradingEngine] Balance refresh failed:', err.message);
    }
  }

  // ─── Position sizing ───
  _calculatePositionSize(bot, price) {
    const balance = bot.balance || 1000;
    const riskPercent = parseFloat(bot.riskPercent || 2) / 100;
    let usdAmount = balance * riskPercent;

    // Enforce minimum order size ($1.10 for most exchanges)
    const MIN_ORDER_USD = 1.10;
    if (usdAmount < MIN_ORDER_USD) {
      usdAmount = Math.min(MIN_ORDER_USD, balance * 0.95);
      this._log(bot.id, `⚠️ Monto calculado muy bajo ($${(balance * riskPercent).toFixed(2)}), ajustado a $${usdAmount.toFixed(2)}`);
    }

    // Cap at 95% of balance (leave room for fees)
    if (usdAmount > balance * 0.95) {
      usdAmount = balance * 0.95;
    }

    // Log position size for transparency
    this._log(bot.id, `💰 Tamaño orden: $${usdAmount.toFixed(2)} USD (${riskPercent * 100}% de $${balance})`);

    const amount = usdAmount / price;
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
