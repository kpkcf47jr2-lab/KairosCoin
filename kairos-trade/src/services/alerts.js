// Kairos Trade — Smart Alert System
// Real-time price alerts + technical signal detection

import marketData from './marketData';
import { calculateEMA, calculateRSI, calculateMACD, detectCrossover } from './indicators';

const ALERTS_KEY = 'kairos_trade_alerts';

class AlertService {
  constructor() {
    this.alerts = this._load();
    this.triggered = [];
    this.monitoring = false;
    this.interval = null;
    this.callbacks = new Set();
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(ALERTS_KEY)) || []; }
    catch { return []; }
  }

  _save() {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(this.alerts));
  }

  // ─── Subscribe to alert events ───
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  _notify(alert) {
    this.callbacks.forEach(cb => cb(alert));

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification(`Kairos Trade — ${alert.symbol}`, {
        body: alert.message,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23D4AF37"/><text x="50" y="70" font-size="60" text-anchor="middle" fill="%230A0A0F" font-family="serif" font-weight="bold">K</text></svg>',
      });
    }
  }

  // ─── Request notification permission ───
  async requestPermission() {
    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  }

  // ─── Create price alert ───
  addPriceAlert(symbol, condition, price, options = {}) {
    const alert = {
      id: Date.now().toString(36),
      type: 'price',
      symbol,
      condition, // 'above' | 'below' | 'crosses'
      targetPrice: parseFloat(price),
      active: true,
      repeat: options.repeat || false,
      message: `${symbol} ${condition === 'above' ? '>' : '<'} $${price}`,
      createdAt: new Date().toISOString(),
    };
    this.alerts.push(alert);
    this._save();
    this._ensureMonitoring();
    return alert;
  }

  // ─── Create technical signal alert ───
  addSignalAlert(symbol, signalType, params = {}) {
    const descriptions = {
      ema_cross: `EMA ${params.fast || 20}/${params.slow || 50} Cross`,
      rsi_oversold: `RSI < ${params.threshold || 30}`,
      rsi_overbought: `RSI > ${params.threshold || 70}`,
      macd_cross: 'MACD Signal Cross',
      volume_spike: `Volume Spike > ${params.multiplier || 2}x avg`,
    };

    const alert = {
      id: Date.now().toString(36),
      type: 'signal',
      symbol,
      signalType,
      params,
      active: true,
      repeat: params.repeat || false,
      message: `${symbol}: ${descriptions[signalType] || signalType}`,
      createdAt: new Date().toISOString(),
    };
    this.alerts.push(alert);
    this._save();
    this._ensureMonitoring();
    return alert;
  }

  // ─── Remove alert ───
  removeAlert(id) {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this._save();
  }

  // ─── Get all alerts ───
  getAlerts() {
    return this.alerts;
  }

  // ─── Get triggered history ───
  getTriggered() {
    return this.triggered;
  }

  // ─── Start monitoring ───
  _ensureMonitoring() {
    if (this.monitoring) return;
    this.monitoring = true;

    this.interval = setInterval(() => this._check(), 15000); // Check every 15s
    this._check(); // Immediate first check
  }

  // ─── Stop monitoring ───
  stop() {
    this.monitoring = false;
    if (this.interval) clearInterval(this.interval);
  }

  // ─── Check all alerts ───
  async _check() {
    const active = this.alerts.filter(a => a.active);
    if (active.length === 0) return;

    // Group by symbol
    const bySymbol = {};
    active.forEach(a => {
      if (!bySymbol[a.symbol]) bySymbol[a.symbol] = [];
      bySymbol[a.symbol].push(a);
    });

    for (const [symbol, alerts] of Object.entries(bySymbol)) {
      try {
        const price = await marketData.getPrice(symbol);

        for (const alert of alerts) {
          let triggered = false;

          if (alert.type === 'price') {
            if (alert.condition === 'above' && price >= alert.targetPrice) triggered = true;
            if (alert.condition === 'below' && price <= alert.targetPrice) triggered = true;
          }

          if (alert.type === 'signal') {
            triggered = await this._checkSignal(symbol, alert);
          }

          if (triggered) {
            alert.triggeredAt = new Date().toISOString();
            alert.triggeredPrice = price;
            this.triggered.push({ ...alert });
            this._notify({
              ...alert,
              currentPrice: price,
              message: `🔔 ${alert.message} — Precio actual: $${price.toLocaleString()}`,
            });

            if (!alert.repeat) {
              alert.active = false;
            }
          }
        }
      } catch {}
    }

    this._save();
  }

  // ─── Check technical signal ───
  async _checkSignal(symbol, alert) {
    try {
      const candles = await marketData.getCandles(symbol, '1h', 60);
      const closes = candles.map(c => c.close);
      const len = closes.length;

      switch (alert.signalType) {
        case 'ema_cross': {
          const fast = calculateEMA(closes, alert.params.fast || 20);
          const slow = calculateEMA(closes, alert.params.slow || 50);
          const cross = detectCrossover(fast, slow, len - 1);
          return cross !== null;
        }
        case 'rsi_oversold': {
          const rsi = calculateRSI(closes, alert.params.period || 14);
          return rsi[len - 1] < (alert.params.threshold || 30);
        }
        case 'rsi_overbought': {
          const rsi = calculateRSI(closes, alert.params.period || 14);
          return rsi[len - 1] > (alert.params.threshold || 70);
        }
        case 'macd_cross': {
          const { macd, signal } = calculateMACD(closes);
          return detectCrossover(macd, signal, len - 1) !== null;
        }
        case 'volume_spike': {
          const volumes = candles.map(c => c.volume);
          const avgVol = volumes.slice(-20).reduce((s, v) => s + v, 0) / 20;
          return volumes[len - 1] > avgVol * (alert.params.multiplier || 2);
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}

export const alertService = new AlertService();
export default alertService;
