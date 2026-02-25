// Kairos Trade — Platform Fee Service (Kairos Treasury)
// Collects a micro-spread on each trade (0.05% of volume)
// Accumulates in a treasury that syncs to backend
// Revenue model: invisible to users, standard broker practice

const API_HOST = 'https://kairos-api-u6k5.onrender.com';

const TREASURY_KEY = 'kairos_treasury';
const FEE_RATE = 0.0005; // 0.05% — 5 basis points (Binance charges 0.1%)
const SYNC_INTERVAL = 60_000; // Sync to backend every 60s

class FeeService {
  constructor() {
    this.treasury = this._load();
    this._pendingSync = 0;
    this._syncTimer = null;
  }

  // ─── Fee rate getter ───
  getRate() {
    return FEE_RATE;
  }

  // ─── Calculate fee for a trade ───
  // volume = price * quantity (in USD)
  calculateFee(price, quantity) {
    const volume = Math.abs(price * quantity);
    return +(volume * FEE_RATE).toFixed(8);
  }

  // ─── Apply fee: deducts from PnL, adds to treasury ───
  // Returns { adjustedPnl, fee }
  applyFee(price, quantity, rawPnl) {
    const fee = this.calculateFee(price, quantity);
    const adjustedPnl = rawPnl - fee;

    this.treasury.totalCollected += fee;
    this.treasury.tradeCount += 1;
    this.treasury.lastTradeAt = Date.now();

    // Track daily stats
    const today = new Date().toISOString().slice(0, 10);
    if (!this.treasury.daily[today]) {
      this.treasury.daily[today] = { fees: 0, trades: 0, volume: 0 };
    }
    this.treasury.daily[today].fees += fee;
    this.treasury.daily[today].trades += 1;
    this.treasury.daily[today].volume += Math.abs(price * quantity);

    // Keep only last 90 days
    const keys = Object.keys(this.treasury.daily).sort();
    while (keys.length > 90) {
      delete this.treasury.daily[keys.shift()];
    }

    this._save();
    this._pendingSync += fee;
    this._scheduleSyncToBackend();

    return { adjustedPnl, fee };
  }

  // ─── Apply fee on volume only (for open-position or one-sided fee) ───
  applyVolumeFee(price, quantity) {
    const fee = this.calculateFee(price, quantity);

    this.treasury.totalCollected += fee;
    this.treasury.tradeCount += 1;
    this.treasury.lastTradeAt = Date.now();

    const today = new Date().toISOString().slice(0, 10);
    if (!this.treasury.daily[today]) {
      this.treasury.daily[today] = { fees: 0, trades: 0, volume: 0 };
    }
    this.treasury.daily[today].fees += fee;
    this.treasury.daily[today].trades += 1;
    this.treasury.daily[today].volume += Math.abs(price * quantity);

    const keys = Object.keys(this.treasury.daily).sort();
    while (keys.length > 90) {
      delete this.treasury.daily[keys.shift()];
    }

    this._save();
    this._pendingSync += fee;
    this._scheduleSyncToBackend();
    return fee;
  }

  // ─── Get treasury stats (for admin dashboard) ───
  getStats() {
    const today = new Date().toISOString().slice(0, 10);
    const todayStats = this.treasury.daily[today] || { fees: 0, trades: 0, volume: 0 };

    // Last 7 days
    const last7 = this._aggregateDays(7);
    // Last 30 days
    const last30 = this._aggregateDays(30);

    return {
      totalCollected: +this.treasury.totalCollected.toFixed(4),
      totalTrades: this.treasury.tradeCount,
      feeRate: FEE_RATE,
      feeRateDisplay: `${(FEE_RATE * 100).toFixed(2)}%`,
      lastTradeAt: this.treasury.lastTradeAt,
      today: {
        fees: +todayStats.fees.toFixed(4),
        trades: todayStats.trades,
        volume: +todayStats.volume.toFixed(2),
      },
      last7days: last7,
      last30days: last30,
      pendingSync: +this._pendingSync.toFixed(4),
    };
  }

  // ─── Admin: manually adjust treasury (correction) ───
  adminAdjust(amount, reason) {
    this.treasury.totalCollected += amount;
    this.treasury.adjustments = this.treasury.adjustments || [];
    this.treasury.adjustments.push({ amount, reason, at: Date.now() });
    this._save();
  }

  // ─── Internals ───

  _aggregateDays(n) {
    const result = { fees: 0, trades: 0, volume: 0 };
    const now = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const day = this.treasury.daily[key];
      if (day) {
        result.fees += day.fees;
        result.trades += day.trades;
        result.volume += day.volume;
      }
    }
    result.fees = +result.fees.toFixed(4);
    result.volume = +result.volume.toFixed(2);
    return result;
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(TREASURY_KEY));
      if (saved && typeof saved.totalCollected === 'number') return saved;
    } catch {}
    return {
      totalCollected: 0,
      tradeCount: 0,
      lastTradeAt: null,
      daily: {},
      syncedTotal: 0,
    };
  }

  _save() {
    try {
      localStorage.setItem(TREASURY_KEY, JSON.stringify(this.treasury));
    } catch {}
  }

  _scheduleSyncToBackend() {
    if (this._syncTimer) return;
    this._syncTimer = setTimeout(() => {
      this._syncToBackend();
      this._syncTimer = null;
    }, SYNC_INTERVAL);
  }

  async _syncToBackend() {
    if (this._pendingSync <= 0) return;
    const amount = this._pendingSync;
    try {
      const auth = JSON.parse(localStorage.getItem('kairos_trade_auth') || '{}');
      await fetch(`${API_HOST}/api/treasury/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          amount,
          trades: this.treasury.tradeCount,
          source: 'platform_fees',
        }),
      });
      this.treasury.syncedTotal += amount;
      this._pendingSync = 0;
      this._save();
    } catch {
      // Will retry on next sync cycle
    }
  }
}

export const feeService = new FeeService();
export default feeService;
