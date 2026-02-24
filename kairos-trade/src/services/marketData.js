// Kairos Trade — Market Data Service (WebSocket + REST)
// Real-time price feeds from Binance public API (no API key needed)
// Auto-detects US restriction and falls back to Binance US

const API_ENDPOINTS = [
  'https://api.binance.us/api/v3',
  'https://api.binance.com/api/v3',
];

const WS_ENDPOINTS = [
  'wss://stream.binance.us:9443/ws',
  'wss://stream.binance.com:9443/ws',
];

class MarketDataService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnect = 5;
    this.candleCache = new Map();
    this._apiBase = null;   // resolved after first successful call
    this._wsBase = null;
  }

  // ─── Auto-detect working API endpoint ───
  async _getAPI() {
    if (this._apiBase) return this._apiBase;
    for (const base of API_ENDPOINTS) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${base}/ping`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          this._apiBase = base;
          this._wsBase = base.includes('binance.us') ? WS_ENDPOINTS[0] : WS_ENDPOINTS[1];
          console.log('Kairos MarketData: using', base);
          return base;
        }
      } catch { /* try next */ }
    }
    // Default to Binance US
    this._apiBase = API_ENDPOINTS[0];
    this._wsBase = WS_ENDPOINTS[0];
    return this._apiBase;
  }

  // ─── WebSocket for real-time prices ───
  connectStream(symbol, callbacks = {}) {
    const pair = symbol.toLowerCase();

    // Start with auto-detected endpoint, fallback to US
    const wsBase = this._wsBase || WS_ENDPOINTS[0];
    const url = `${wsBase}/${pair}@ticker/${pair}@kline_1m`;

    if (this.ws) this.ws.close();

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      callbacks.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === '24hrTicker') {
          callbacks.onTicker?.({
            symbol: data.s,
            price: parseFloat(data.c),
            change: parseFloat(data.p),
            changePercent: parseFloat(data.P),
            high: parseFloat(data.h),
            low: parseFloat(data.l),
            volume: parseFloat(data.v),
            quoteVolume: parseFloat(data.q),
          });
        }
        if (data.e === 'kline') {
          const k = data.k;
          callbacks.onCandle?.({
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            closed: k.x,
          });
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WS error:', err);
      // Try alternate WS endpoint
      if (wsBase === WS_ENDPOINTS[1] && this.reconnectAttempts === 0) {
        this._wsBase = WS_ENDPOINTS[0];
        this.connectStream(symbol, callbacks);
        return;
      }
      callbacks.onError?.(err);
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnect) {
        this.reconnectAttempts++;
        setTimeout(() => this.connectStream(symbol, callbacks), 2000 * this.reconnectAttempts);
      }
      callbacks.onDisconnect?.();
    };

    return () => this.disconnect();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── REST: Get klines/candles ───
  async getCandles(symbol, interval = '1h', limit = 500) {
    const cacheKey = `${symbol}_${interval}`;
    const base = await this._getAPI();

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const url = `${base}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const candles = data.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      this.candleCache.set(cacheKey, { data: candles, ts: Date.now() });
      return candles;
    } catch (err) {
      console.error('getCandles error:', err.message);
      // Try alternate endpoint if primary fails
      if (this._apiBase) {
        this._apiBase = null; // Reset to re-detect
        const altBase = await this._getAPI();
        if (altBase) {
          try {
            const res = await fetch(`${altBase}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
            if (res.ok) {
              const data = await res.json();
              const candles = data.map(k => ({
                time: Math.floor(k[0] / 1000), open: parseFloat(k[1]), high: parseFloat(k[2]),
                low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
              }));
              this.candleCache.set(cacheKey, { data: candles, ts: Date.now() });
              return candles;
            }
          } catch {}
        }
      }
      // Return cached if available
      const cached = this.candleCache.get(cacheKey);
      if (cached) return cached.data;
      throw err;
    }
  }

  // ─── REST: Get current price ───
  async getPrice(symbol) {
    const base = await this._getAPI();
    const res = await fetch(`${base}/ticker/price?symbol=${symbol}`);
    const data = await res.json();
    return parseFloat(data.price);
  }

  // ─── REST: Get 24hr ticker ───
  async get24hrTicker(symbol) {
    const base = await this._getAPI();
    const res = await fetch(`${base}/ticker/24hr?symbol=${symbol}`);
    const data = await res.json();
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      change: parseFloat(data.priceChange),
      changePercent: parseFloat(data.priceChangePercent),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
    };
  }

  // ─── REST: Get order book ───
  async getOrderBook(symbol, limit = 20) {
    const base = await this._getAPI();
    const res = await fetch(`${base}/depth?symbol=${symbol}&limit=${limit}`);
    const data = await res.json();
    return {
      bids: data.bids.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) })),
      asks: data.asks.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) })),
    };
  }

  // ─── REST: Search symbols ───
  async searchSymbols(query) {
    const base = await this._getAPI();
    const res = await fetch(`${base}/exchangeInfo`);
    const data = await res.json();
    const q = query.toUpperCase();
    return data.symbols
      .filter(s => s.status === 'TRADING' && (s.symbol.includes(q) || s.baseAsset.includes(q)))
      .slice(0, 20)
      .map(s => ({
        symbol: s.symbol,
        base: s.baseAsset,
        quote: s.quoteAsset,
      }));
  }
}

export const marketData = new MarketDataService();
export default marketData;
