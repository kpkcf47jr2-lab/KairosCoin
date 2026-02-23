// Kairos Trade — Broker Service (Elite v3)
// Real execution on Binance via HMAC-SHA256 signed requests
// Uses Web Crypto API (no external dependencies)
import { BROKERS } from '../constants';

class BrokerService {
  constructor() {
    this.connections = new Map();
  }

  // Decrypt stored credentials (base64)
  _decrypt(broker) {
    return {
      ...broker,
      apiKey: atob(broker.apiKey),
      apiSecret: atob(broker.apiSecret),
      passphrase: broker.passphrase ? atob(broker.passphrase) : undefined,
    };
  }

  // ─── HMAC-SHA256 Signing (Web Crypto API) ───
  async _hmacSign(secret, message) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ─── Binance Signed Request ───
  async _binanceSignedRequest(creds, method, endpoint, params = {}) {
    const timestamp = Date.now();
    const allParams = { ...params, timestamp, recvWindow: 5000 };
    const queryString = Object.entries(allParams)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    const signature = await this._hmacSign(creds.apiSecret, queryString);
    const signedQuery = `${queryString}&signature=${signature}`;

    const url = method === 'GET'
      ? `${BROKERS.binance.baseUrl}${endpoint}?${signedQuery}`
      : `${BROKERS.binance.baseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'X-MBX-APIKEY': creds.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (method === 'POST' || method === 'DELETE') {
      options.body = signedQuery;
    }

    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Binance ${endpoint}: ${data.msg || res.statusText} (${data.code || res.status})`);
    }
    return data;
  }

  // ─── Binance Public Request ───
  async _binancePublicRequest(endpoint, params = {}) {
    const queryString = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    const url = `${BROKERS.binance.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    return res.json();
  }

  // ─── Connect to broker ───
  async connect(broker) {
    const creds = this._decrypt(broker);
    const config = BROKERS[broker.brokerId];
    if (!config) throw new Error(`Unsupported broker: ${broker.brokerId}`);

    try {
      switch (broker.brokerId) {
        case 'binance': {
          // Real test: Ping + account info to verify API key
          await this._binancePublicRequest('/api/v3/ping');
          // Test signed endpoint
          const account = await this._binanceSignedRequest(creds, 'GET', '/api/v3/account');
          this.connections.set(broker.id, {
            creds, config, connected: true,
            permissions: account.permissions || [],
            accountType: account.accountType,
          });
          return {
            success: true,
            message: `Connected to Binance (${account.accountType})`,
            permissions: account.permissions,
          };
        }
        default: {
          await fetch(config.baseUrl);
          this.connections.set(broker.id, { creds, config, connected: true, permissions: [] });
          return { success: true, message: `Connected to ${config.name} (simulated)` };
        }
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // ─── Get REAL balances from Binance ───
  async getBalances(brokerId) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');

    if (conn.config.id === 'binance') {
      try {
        const account = await this._binanceSignedRequest(conn.creds, 'GET', '/api/v3/account');
        return account.balances
          .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
          .map(b => ({
            asset: b.asset,
            free: b.free,
            locked: b.locked,
            total: (parseFloat(b.free) + parseFloat(b.locked)).toString(),
          }));
      } catch (err) {
        console.error('Binance getBalances error:', err);
        throw err;
      }
    }

    // Fallback for unsupported brokers
    return [];
  }

  // ─── Place REAL order on Binance ───
  async placeOrder(brokerId, order) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');

    const { symbol, side, type, quantity, price, stopLoss, takeProfit } = order;
    if (!symbol || !side || !type || !quantity) {
      throw new Error('Missing required order fields');
    }

    if (conn.config.id === 'binance') {
      try {
        // Map order type to Binance format
        const binanceType = {
          market: 'MARKET',
          limit: 'LIMIT',
          stop_loss: 'STOP_LOSS_LIMIT',
        }[type] || 'MARKET';

        const params = {
          symbol: symbol,
          side: side.toUpperCase(),
          type: binanceType,
          quantity: quantity.toString(),
        };

        if (binanceType === 'LIMIT' || binanceType === 'STOP_LOSS_LIMIT') {
          params.timeInForce = 'GTC';
          params.price = parseFloat(price).toFixed(2);
        }
        if (binanceType === 'STOP_LOSS_LIMIT') {
          params.stopPrice = parseFloat(stopLoss || price).toFixed(2);
        }

        const result = await this._binanceSignedRequest(conn.creds, 'POST', '/api/v3/order', params);

        return {
          id: result.orderId?.toString(),
          clientOrderId: result.clientOrderId,
          symbol: result.symbol,
          side: result.side?.toLowerCase(),
          type: result.type?.toLowerCase(),
          quantity: parseFloat(result.origQty || quantity),
          price: parseFloat(result.price || price || 0),
          filledPrice: parseFloat(result.fills?.[0]?.price || result.price || 0),
          filledQty: parseFloat(result.executedQty || 0),
          status: result.status?.toLowerCase(),
          timestamp: new Date(result.transactTime || Date.now()).toISOString(),
          broker: 'Binance',
          raw: result,
        };
      } catch (err) {
        console.error('Binance placeOrder error:', err);
        throw err;
      }
    }

    // Simulated execution for other brokers
    return {
      id: Date.now().toString(36),
      symbol, side, type,
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : null,
      status: type === 'market' ? 'filled' : 'new',
      filledPrice: type === 'market' ? parseFloat(price || 0) : null,
      timestamp: new Date().toISOString(),
      broker: conn.config.name,
      simulated: true,
    };
  }

  // ─── Cancel REAL order on Binance ───
  async cancelOrder(brokerId, orderId, symbol) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');

    if (conn.config.id === 'binance') {
      try {
        const result = await this._binanceSignedRequest(conn.creds, 'DELETE', '/api/v3/order', {
          symbol, orderId,
        });
        return { success: true, orderId: result.orderId, status: result.status };
      } catch (err) {
        return { success: false, message: err.message };
      }
    }

    return { success: true, orderId, simulated: true };
  }

  // ─── Get open orders (real) ───
  async getOpenOrders(brokerId, symbol) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');

    if (conn.config.id === 'binance') {
      try {
        const params = symbol ? { symbol } : {};
        const orders = await this._binanceSignedRequest(conn.creds, 'GET', '/api/v3/openOrders', params);
        return orders.map(o => ({
          id: o.orderId?.toString(),
          symbol: o.symbol,
          side: o.side?.toLowerCase(),
          type: o.type?.toLowerCase(),
          quantity: parseFloat(o.origQty),
          price: parseFloat(o.price),
          filledQty: parseFloat(o.executedQty),
          status: o.status?.toLowerCase(),
          time: new Date(o.time).toISOString(),
        }));
      } catch (err) {
        return [];
      }
    }

    return [];
  }

  // ─── Get trade history (real) ───
  async getTradeHistory(brokerId, symbol, limit = 50) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');

    if (conn.config.id === 'binance') {
      try {
        const trades = await this._binanceSignedRequest(conn.creds, 'GET', '/api/v3/myTrades', { symbol, limit });
        return trades.map(t => ({
          id: t.id?.toString(),
          orderId: t.orderId?.toString(),
          symbol: t.symbol,
          side: t.isBuyer ? 'buy' : 'sell',
          price: parseFloat(t.price),
          quantity: parseFloat(t.qty),
          commission: parseFloat(t.commission),
          commissionAsset: t.commissionAsset,
          time: new Date(t.time).toISOString(),
          isMaker: t.isMaker,
        }));
      } catch (err) {
        return [];
      }
    }

    return [];
  }

  // ─── Get exchange info (filters, min qty, etc.) ───
  async getExchangeInfo(symbol) {
    try {
      const info = await this._binancePublicRequest('/api/v3/exchangeInfo', { symbol });
      const symbolInfo = info.symbols?.[0];
      if (!symbolInfo) return null;

      const lotSize = symbolInfo.filters?.find(f => f.filterType === 'LOT_SIZE');
      const priceFilter = symbolInfo.filters?.find(f => f.filterType === 'PRICE_FILTER');
      const minNotional = symbolInfo.filters?.find(f => f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL');

      return {
        symbol: symbolInfo.symbol,
        status: symbolInfo.status,
        baseAsset: symbolInfo.baseAsset,
        quoteAsset: symbolInfo.quoteAsset,
        minQty: lotSize ? parseFloat(lotSize.minQty) : 0,
        maxQty: lotSize ? parseFloat(lotSize.maxQty) : Infinity,
        stepSize: lotSize ? parseFloat(lotSize.stepSize) : 0,
        minPrice: priceFilter ? parseFloat(priceFilter.minPrice) : 0,
        tickSize: priceFilter ? parseFloat(priceFilter.tickSize) : 0,
        minNotional: minNotional ? parseFloat(minNotional.minNotional || minNotional.notional) : 0,
      };
    } catch {
      return null;
    }
  }

  // ─── Is connected? ───
  isConnected(brokerId) {
    return this.connections.has(brokerId);
  }

  // ─── Get connection info ───
  getConnection(brokerId) {
    return this.connections.get(brokerId);
  }

  // ─── Disconnect ───
  disconnect(brokerId) {
    this.connections.delete(brokerId);
  }
}

export const brokerService = new BrokerService();
export default brokerService;
