// Kairos Trade — Market Data Service (WebSocket + REST)
// Cascade: Binance.US → Binance.com → CoinGecko (ultimate fallback)
// Auto-detects geo-restrictions and switches provider seamlessly

const API_ENDPOINTS = [
  'https://api.binance.us/api/v3',
  'https://api.binance.com/api/v3',
];

const WS_ENDPOINTS = [
  'wss://stream.binance.us:9443/ws',
  'wss://stream.binance.com:9443/ws',
];

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// ─── Binance symbol → CoinGecko ID mapping ───
const SYMBOL_TO_GECKO = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot',
  AVAX: 'avalanche-2', MATIC: 'matic-network', LINK: 'chainlink',
  UNI: 'uniswap', SHIB: 'shiba-inu', LTC: 'litecoin', ATOM: 'cosmos',
  ARB: 'arbitrum', OP: 'optimism', APT: 'aptos', SUI: 'sui',
  NEAR: 'near', FIL: 'filecoin', ICP: 'internet-computer', TRX: 'tron',
  PEPE: 'pepe', WIF: 'dogwifcoin', RENDER: 'render-token', FET: 'fetch-ai',
  INJ: 'injective-protocol', TIA: 'celestia', SEI: 'sei-network',
  BONK: 'bonk', JUP: 'jupiter-exchange-solana', AAVE: 'aave',
  MKR: 'maker', CRV: 'curve-dao-token', LDO: 'lido-dao', SAND: 'the-sandbox',
  MANA: 'decentraland', AXS: 'axie-infinity', GALA: 'gala', ENS: 'ethereum-name-service',
  FTM: 'fantom', ALGO: 'algorand', HBAR: 'hedera-hashgraph', VET: 'vechain',
  EGLD: 'elrond-erd-2', EOS: 'eos', XLM: 'stellar', XMR: 'monero',
  BCH: 'bitcoin-cash', ETC: 'ethereum-classic', RUNE: 'thorchain',
};

// Extract base asset from Binance pair (BTCUSDT → BTC)
function parseBase(symbol) {
  const quotes = ['USDT', 'BUSD', 'USDC', 'USD', 'BTC', 'ETH', 'BNB'];
  for (const q of quotes) {
    if (symbol.endsWith(q) && symbol.length > q.length) {
      return symbol.slice(0, -q.length);
    }
  }
  return symbol;
}

function getGeckoId(symbol) {
  const base = parseBase(symbol);
  return SYMBOL_TO_GECKO[base] || base.toLowerCase();
}

class MarketDataService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnect = 5;
    this.candleCache = new Map();
    this._apiBase = null;       // resolved Binance endpoint
    this._wsBase = null;
    this._useCoinGecko = false; // true when Binance completely unavailable
    this._geckoRateLimit = 0;   // timestamp of last CG call (free tier = 10-30/min)
  }

  // ─── Auto-detect working API endpoint ───
  async _getAPI() {
    if (this._useCoinGecko) return 'coingecko';
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
          return base;
        }
      } catch { /* try next */ }
    }

    // Both Binance endpoints failed → switch to CoinGecko
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${COINGECKO_API}/ping`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        this._useCoinGecko = true;
        console.log('Kairos MarketData: using CoinGecko fallback');
        return 'coingecko';
      }
    } catch { /* all failed */ }

    // Last resort default
    this._apiBase = API_ENDPOINTS[0];
    this._wsBase = WS_ENDPOINTS[0];
    return this._apiBase;
  }

  // ─── CoinGecko rate-limited fetch ───
  async _geckoFetch(path) {
    const now = Date.now();
    const wait = Math.max(0, this._geckoRateLimit + 2200 - now); // ~27 req/min
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this._geckoRateLimit = Date.now();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${COINGECKO_API}${path}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    return res.json();
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
    const provider = await this._getAPI();

    // ── CoinGecko OHLC fallback ──
    if (provider === 'coingecko') {
      return this._getCandlesCoinGecko(symbol, interval, cacheKey);
    }

    // ── Binance primary ──
    try {
      const candles = await this._getCandlesBinance(provider, symbol, interval, limit);
      this.candleCache.set(cacheKey, { data: candles, ts: Date.now() });
      return candles;
    } catch (err) {
      // Reset and try alternate Binance endpoint
      if (this._apiBase) {
        this._apiBase = null;
        try {
          const altBase = await this._getAPI();
          if (altBase !== 'coingecko') {
            const candles = await this._getCandlesBinance(altBase, symbol, interval, limit);
            this.candleCache.set(cacheKey, { data: candles, ts: Date.now() });
            return candles;
          }
        } catch { /* fall through */ }
      }

      // Try CoinGecko before giving up
      try {
        return await this._getCandlesCoinGecko(symbol, interval, cacheKey);
      } catch { /* fall through */ }

      // Return cached if available
      const cached = this.candleCache.get(cacheKey);
      if (cached) return cached.data;
      throw err;
    }
  }

  async _getCandlesBinance(base, symbol, interval, limit) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${base}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map(k => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }

  async _getCandlesCoinGecko(symbol, interval, cacheKey) {
    const geckoId = getGeckoId(symbol);
    // CoinGecko OHLC: days param determines granularity
    // 1 → 30min candles, 7 → 4h, 30 → 4h, 90/180/365 → 4d
    const daysMap = { '1m': 1, '5m': 1, '15m': 1, '30m': 1, '1h': 7, '4h': 30, '1d': 365 };
    const days = daysMap[interval] || 30;

    const data = await this._geckoFetch(`/coins/${geckoId}/ohlc?vs_currency=usd&days=${days}`);
    const candles = data.map(([t, o, h, l, c]) => ({
      time: Math.floor(t / 1000),
      open: o, high: h, low: l, close: c, volume: 0,
    }));
    this.candleCache.set(cacheKey, { data: candles, ts: Date.now() });
    return candles;
  }

  // ─── REST: Get current price ───
  async getPrice(symbol) {
    const provider = await this._getAPI();
    if (provider === 'coingecko') {
      const geckoId = getGeckoId(symbol);
      const data = await this._geckoFetch(`/simple/price?ids=${geckoId}&vs_currencies=usd`);
      return data[geckoId]?.usd || 0;
    }
    try {
      const res = await fetch(`${provider}/ticker/price?symbol=${symbol}`);
      const data = await res.json();
      if (data.price) return parseFloat(data.price);
      throw new Error('No price');
    } catch {
      // Fallback to CoinGecko
      const geckoId = getGeckoId(symbol);
      const data = await this._geckoFetch(`/simple/price?ids=${geckoId}&vs_currencies=usd`);
      return data[geckoId]?.usd || 0;
    }
  }

  // ─── REST: Get 24hr ticker ───
  async get24hrTicker(symbol) {
    const provider = await this._getAPI();
    if (provider === 'coingecko') {
      return this._get24hrTickerCoinGecko(symbol);
    }
    try {
      const res = await fetch(`${provider}/ticker/24hr?symbol=${symbol}`);
      const data = await res.json();
      if (!data.lastPrice) throw new Error('No data');
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
    } catch {
      return this._get24hrTickerCoinGecko(symbol);
    }
  }

  async _get24hrTickerCoinGecko(symbol) {
    const geckoId = getGeckoId(symbol);
    const data = await this._geckoFetch(
      `/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );
    const md = data.market_data;
    return {
      symbol,
      price: md.current_price?.usd || 0,
      change: md.price_change_24h || 0,
      changePercent: md.price_change_percentage_24h || 0,
      high: md.high_24h?.usd || 0,
      low: md.low_24h?.usd || 0,
      volume: md.total_volume?.usd || 0,
      quoteVolume: md.total_volume?.usd || 0,
    };
  }

  // ─── REST: Get order book ───
  async getOrderBook(symbol, limit = 20) {
    const provider = await this._getAPI();
    if (provider === 'coingecko') {
      // CoinGecko has no order book — return empty
      return { bids: [], asks: [] };
    }
    try {
      const res = await fetch(`${provider}/depth?symbol=${symbol}&limit=${limit}`);
      const data = await res.json();
      return {
        bids: data.bids.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) })),
        asks: data.asks.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) })),
      };
    } catch {
      return { bids: [], asks: [] };
    }
  }

  // ─── REST: Search symbols ───
  async searchSymbols(query) {
    const provider = await this._getAPI();
    if (provider === 'coingecko') {
      const data = await this._geckoFetch(`/search?query=${encodeURIComponent(query)}`);
      return (data.coins || []).slice(0, 20).map(c => ({
        symbol: `${c.symbol.toUpperCase()}USDT`,
        base: c.symbol.toUpperCase(),
        quote: 'USDT',
      }));
    }
    try {
      const res = await fetch(`${provider}/exchangeInfo`);
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
    } catch {
      // Fallback to CoinGecko search
      const data = await this._geckoFetch(`/search?query=${encodeURIComponent(query)}`);
      return (data.coins || []).slice(0, 20).map(c => ({
        symbol: `${c.symbol.toUpperCase()}USDT`,
        base: c.symbol.toUpperCase(),
        quote: 'USDT',
      }));
    }
  }
}

export const marketData = new MarketDataService();
export default marketData;
