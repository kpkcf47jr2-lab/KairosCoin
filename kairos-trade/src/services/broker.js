// Kairos Trade — Broker Service (Elite v4)
// Real execution on Binance (HMAC-SHA256) + Coinbase CDP (JWT/EC)
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

  // ─── Coinbase CDP: Build JWT from EC Private Key ───
  async _coinbaseJWT(creds, method, path) {
    const keyName = creds.apiKey;
    const privateKeyPem = creds.apiSecret;

    // JWT Header
    const header = { alg: 'ES256', kid: keyName, nonce: crypto.randomUUID(), typ: 'JWT' };

    // JWT Payload — Coinbase CDP requires 'uri' field: "METHOD host/path"
    const now = Math.floor(Date.now() / 1000);
    const uri = `${method} api.coinbase.com${path}`;
    const payload = {
      sub: keyName,
      iss: 'coinbase-cloud',
      aud: ['cdp_service'],
      nbf: now,
      exp: now + 120,
      uri,
    };

    const toB64url = (str) => btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const objToB64url = (obj) => toB64url(JSON.stringify(obj));
    const bufToB64url = (buf) => toB64url(String.fromCharCode(...new Uint8Array(buf)));
    const headerB64 = objToB64url(header);
    const payloadB64 = objToB64url(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    // Import EC key and sign
    const key = await this._importECKey(privateKeyPem);

    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(signingInput)
    );

    return `${signingInput}.${bufToB64url(sig)}`;
  }

  // Parse SEC1 PEM (BEGIN EC PRIVATE KEY) → extract d, x, y → import as JWK
  async _importECKey(pem) {
    // Clean PEM: remove headers and all literal \n
    const pemClean = pem
      .replace(/-----BEGIN (?:EC )?PRIVATE KEY-----/g, '')
      .replace(/-----END (?:EC )?PRIVATE KEY-----/g, '')
      .replace(/\\n/g, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\s/g, '');

    const der = Uint8Array.from(atob(pemClean), c => c.charCodeAt(0));

    // If it's PKCS8 format (BEGIN PRIVATE KEY), import directly
    if (pem.includes('BEGIN PRIVATE KEY') && !pem.includes('EC PRIVATE KEY')) {
      return crypto.subtle.importKey(
        'pkcs8', der.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, ['sign']
      );
    }

    // SEC1 EC format: parse ASN.1 to extract raw key material
    // Structure: SEQUENCE { version(1), d(32 bytes), [0]curveOid, [1]publicKey(65 bytes) }
    const d = this._extractEC_d(der);
    const pubPoint = this._extractEC_pub(der);

    if (!d || d.length !== 32) {
      throw new Error(`Clave EC inválida: se esperaban 32 bytes para d, se encontraron ${d?.length || 0}`);
    }

    const bytesToB64url = (bytes) =>
      btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      d: bytesToB64url(d),
    };

    // If public key present (65 bytes: 04 || x(32) || y(32))
    if (pubPoint && pubPoint.length === 65 && pubPoint[0] === 0x04) {
      jwk.x = bytesToB64url(pubPoint.slice(1, 33));
      jwk.y = bytesToB64url(pubPoint.slice(33, 65));
    } else {
      // Without public key, Web Crypto can't import. Derive it.
      // Try PKCS8 wrapping as fallback
      return this._importECKeyPkcs8Wrap(der);
    }

    return crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );
  }

  // Extract 32-byte private key 'd' from SEC1 DER
  _extractEC_d(der) {
    // Find OCTET STRING (tag 0x04) after version INTEGER (02 01 01)
    // Typical: 30 77 02 01 01 04 20 <32 bytes d>
    for (let i = 0; i < der.length - 34; i++) {
      if (der[i] === 0x02 && der[i + 1] === 0x01 && der[i + 2] === 0x01 &&
          der[i + 3] === 0x04 && der[i + 4] === 0x20) {
        return der.slice(i + 5, i + 5 + 32);
      }
    }
    return null;
  }

  // Extract public key point from SEC1 DER
  _extractEC_pub(der) {
    // Look for context tag [1] (0xA1) followed by BIT STRING (0x03)
    for (let i = 0; i < der.length - 67; i++) {
      if (der[i] === 0xA1 && der[i + 2] === 0x03 && der[i + 3] === 0x42 && der[i + 4] === 0x00) {
        return der.slice(i + 5, i + 5 + 65);
      }
    }
    return null;
  }

  // Fallback: wrap SEC1 DER in PKCS8 envelope
  async _importECKeyPkcs8Wrap(sec1Der) {
    // PKCS8 = SEQUENCE { version(0), AlgorithmIdentifier(EC P-256), OCTET STRING(SEC1) }
    const octetLen = sec1Der.length;
    const algoId = new Uint8Array([
      0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    ]);
    const ver = new Uint8Array([0x02, 0x01, 0x00]);
    const octetHeader = this._asn1Len(0x04, octetLen);
    const totalInner = ver.length + algoId.length + octetHeader.length + octetLen;
    const seqHeader = this._asn1Len(0x30, totalInner);

    const pkcs8 = new Uint8Array(seqHeader.length + totalInner);
    let off = 0;
    pkcs8.set(seqHeader, off); off += seqHeader.length;
    pkcs8.set(ver, off); off += ver.length;
    pkcs8.set(algoId, off); off += algoId.length;
    pkcs8.set(octetHeader, off); off += octetHeader.length;
    pkcs8.set(sec1Der, off);

    return crypto.subtle.importKey(
      'pkcs8', pkcs8.buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );
  }

  // ASN.1 tag + length header
  _asn1Len(tag, len) {
    if (len < 128) return new Uint8Array([tag, len]);
    if (len < 256) return new Uint8Array([tag, 0x81, len]);
    return new Uint8Array([tag, 0x82, (len >> 8) & 0xff, len & 0xff]);
  }

  // ─── Coinbase CDP Signed Request (via Netlify proxy to bypass CORS) ───
  async _coinbaseRequest(creds, method, path, body = null) {
    const jwt = await this._coinbaseJWT(creds, method, path);

    // Use serverless proxy to bypass CORS — JWT signed client-side, keys never leave browser
    const proxyUrl = '/api/coinbase-proxy';
    try {
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt, method, path, body }),
      });

      let data;
      const text = await res.text();
      try { data = JSON.parse(text); } catch { data = { error: text }; }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Coinbase HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('Error de red al conectar con el proxy. Reintenta en unos segundos.');
      }
      throw err;
    }
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
        case 'coinbase': {
          // Real test: list accounts via Coinbase CDP API
          const accounts = await this._coinbaseRequest(creds, 'GET', '/api/v3/brokerage/accounts');
          this.connections.set(broker.id, {
            creds, config, connected: true,
            permissions: ['read', 'trade'],
            accounts: accounts.accounts || [],
          });
          return {
            success: true,
            message: `Connected to Coinbase (${(accounts.accounts || []).length} accounts)`,
            permissions: ['read', 'trade'],
          };
        }
        default: {
          await fetch(config.baseUrl);
          this.connections.set(broker.id, { creds, config, connected: true, permissions: [] });
          return { success: true, message: `Connected to ${config.name}` };
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

    if (conn.config.id === 'coinbase') {
      try {
        const data = await this._coinbaseRequest(conn.creds, 'GET', '/api/v3/brokerage/accounts');
        return (data.accounts || [])
          .filter(a => parseFloat(a.available_balance?.value || 0) > 0 || parseFloat(a.hold?.value || 0) > 0)
          .map(a => ({
            asset: a.currency,
            free: a.available_balance?.value || '0',
            locked: a.hold?.value || '0',
            total: (parseFloat(a.available_balance?.value || 0) + parseFloat(a.hold?.value || 0)).toString(),
          }));
      } catch (err) {
        console.error('Coinbase getBalances error:', err);
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

    if (conn.config.id === 'coinbase') {
      try {
        // Coinbase Advanced Trade API — Create Order
        // https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_postorder
        const productId = symbol.replace(/([A-Z]+)(USDT|USDC|USD|BTC|ETH)$/i, '$1-$2').toUpperCase();

        const orderConfig = {};
        if (type === 'market') {
          if (side.toLowerCase() === 'buy') {
            // Market buy: specify quote_size (USD amount)
            orderConfig.market_market_ioc = {
              quote_size: (parseFloat(quantity) * parseFloat(price || 0)).toFixed(2),
            };
          } else {
            // Market sell: specify base_size (crypto amount)
            orderConfig.market_market_ioc = {
              base_size: parseFloat(quantity).toString(),
            };
          }
        } else if (type === 'limit') {
          orderConfig.limit_limit_gtc = {
            base_size: parseFloat(quantity).toString(),
            limit_price: parseFloat(price).toFixed(2),
          };
        }

        const orderBody = {
          client_order_id: crypto.randomUUID(),
          product_id: productId,
          side: side.toUpperCase(),
          order_configuration: orderConfig,
        };

        const result = await this._coinbaseRequest(conn.creds, 'POST', '/api/v3/brokerage/orders', orderBody);

        const orderResult = result.success_response || result;
        const orderId = orderResult.order_id || orderResult.id || Date.now().toString(36);

        // Fetch filled details if available
        let filledPrice = parseFloat(price || 0);
        let filledQty = parseFloat(quantity);
        let orderStatus = 'pending';

        if (result.success) {
          // Get order details to confirm fill
          try {
            const details = await this._coinbaseRequest(conn.creds, 'GET', `/api/v3/brokerage/orders/historical/${orderId}`);
            const order = details.order || details;
            filledPrice = parseFloat(order.average_filled_price || order.filled_price || price || 0);
            filledQty = parseFloat(order.filled_size || order.filled_value || quantity);
            orderStatus = (order.status || 'FILLED').toLowerCase();
          } catch {
            orderStatus = 'filled'; // Market orders usually fill immediately
          }
        } else {
          // Order might have error
          const errMsg = result.error_response?.error || result.error || 'Unknown error';
          throw new Error(`Coinbase order failed: ${errMsg}`);
        }

        return {
          id: orderId,
          clientOrderId: orderBody.client_order_id,
          symbol: productId,
          side: side.toLowerCase(),
          type,
          quantity: filledQty,
          price: filledPrice,
          filledPrice,
          filledQty,
          status: orderStatus,
          timestamp: new Date().toISOString(),
          broker: 'Coinbase',
          real: true,
        };
      } catch (err) {
        console.error('Coinbase placeOrder error:', err);
        throw err;
      }
    }

    // Simulated execution for unsupported brokers
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
