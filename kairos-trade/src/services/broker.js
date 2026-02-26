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

  // ─── HMAC-SHA256 → Base64 (for Kraken, OKX, KuCoin) ───
  async _hmacSignB64(secret, message, isB64Secret = false) {
    const encoder = new TextEncoder();
    let keyData;
    if (isB64Secret) {
      const bin = atob(secret);
      keyData = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) keyData[i] = bin.charCodeAt(i);
    } else {
      keyData = encoder.encode(secret);
    }
    const key = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  }

  // ─── HMAC-SHA512 → Base64 (for Kraken) ───
  async _hmacSignSHA512B64(secretB64, message) {
    const bin = atob(secretB64);
    const keyData = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) keyData[i] = bin.charCodeAt(i);
    const key = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false, ['sign']
    );
    // Kraken expects: HMAC-SHA512( base64decode(secret), path + SHA256(nonce + postData) )
    const msgData = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const sig = await crypto.subtle.sign('HMAC', key, msgData);
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  }

  // ─── SHA-256 digest (for Kraken nonce signing) ───
  async _sha256(message) {
    const data = new TextEncoder().encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
  }

  // ─── Universal Proxy Request (for non-Binance/Coinbase brokers) ───
  async _proxyRequest(url, method, headers = {}, body = null) {
    const res = await fetch('/api/broker-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method, headers, body }),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    if (!res.ok) throw new Error(data.error || data.message || data.msg || `HTTP ${res.status}`);
    return data;
  }

  // ════════════════════════════════════════════════════════
  // ─── BYBIT v5 (HMAC-SHA256) ───
  // ════════════════════════════════════════════════════════
  async _bybitRequest(creds, method, endpoint, params = {}) {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    let queryString = '';
    let bodyStr = '';

    if (method === 'GET') {
      queryString = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
    } else {
      bodyStr = JSON.stringify(params);
    }

    const preSign = `${timestamp}${creds.apiKey}${recvWindow}${method === 'GET' ? queryString : bodyStr}`;
    const signature = await this._hmacSign(creds.apiSecret, preSign);

    const url = `${BROKERS.bybit.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
    const headers = {
      'X-BAPI-API-KEY': creds.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'Content-Type': 'application/json',
    };

    const data = await this._proxyRequest(url, method, headers, method !== 'GET' ? params : null);
    if (data.retCode !== 0 && data.retCode !== undefined) {
      throw new Error(`Bybit: ${data.retMsg || 'Unknown error'} (${data.retCode})`);
    }
    return data.result || data;
  }

  // ════════════════════════════════════════════════════════
  // ─── KRAKEN (HMAC-SHA512 with nonce) ───
  // ════════════════════════════════════════════════════════
  async _krakenRequest(creds, endpoint, params = {}) {
    const nonce = Date.now().toString();
    const postData = new URLSearchParams({ ...params, nonce }).toString();

    // Kraken signature: HMAC-SHA512( base64decode(secret), path + SHA256(nonce + postData) )
    const sha256Hash = await this._sha256(nonce + postData);
    const pathBytes = new TextEncoder().encode(endpoint);
    const sigInput = new Uint8Array(pathBytes.length + sha256Hash.length);
    sigInput.set(pathBytes, 0);
    sigInput.set(sha256Hash, pathBytes.length);
    const signature = await this._hmacSignSHA512B64(creds.apiSecret, sigInput);

    const url = `${BROKERS.kraken.baseUrl}${endpoint}`;
    const headers = {
      'API-Key': creds.apiKey,
      'API-Sign': signature,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const data = await this._proxyRequest(url, 'POST', headers, postData);
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken: ${data.error.join(', ')}`);
    }
    return data.result || data;
  }

  // ════════════════════════════════════════════════════════
  // ─── KUCOIN (HMAC-SHA256 + passphrase) ───
  // ════════════════════════════════════════════════════════
  async _kucoinRequest(creds, method, endpoint, params = {}) {
    const timestamp = Date.now().toString();
    let bodyStr = '';
    let queryString = '';

    if (method === 'GET' || method === 'DELETE') {
      queryString = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      if (queryString) endpoint = `${endpoint}?${queryString}`;
    } else {
      bodyStr = JSON.stringify(params);
    }

    const preSign = `${timestamp}${method}${endpoint}${bodyStr}`;
    const signature = await this._hmacSignB64(creds.apiSecret, preSign);
    const passphrase = await this._hmacSignB64(creds.apiSecret, creds.passphrase || '');

    const url = `${BROKERS.kucoin.baseUrl}${endpoint}`;
    const headers = {
      'KC-API-KEY': creds.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': passphrase,
      'KC-API-KEY-VERSION': '2',
      'Content-Type': 'application/json',
    };

    const data = await this._proxyRequest(url, method, headers, method !== 'GET' && method !== 'DELETE' ? params : null);
    if (data.code && data.code !== '200000') {
      throw new Error(`KuCoin: ${data.msg || 'Unknown error'} (${data.code})`);
    }
    return data.data || data;
  }

  // ════════════════════════════════════════════════════════
  // ─── OKX (HMAC-SHA256 + passphrase, ISO timestamp) ───
  // ════════════════════════════════════════════════════════
  async _okxRequest(creds, method, endpoint, params = {}) {
    const timestamp = new Date().toISOString();
    let bodyStr = '';
    let queryString = '';

    if (method === 'GET') {
      queryString = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      if (queryString) endpoint = `${endpoint}?${queryString}`;
    } else {
      bodyStr = JSON.stringify(params);
    }

    const preSign = `${timestamp}${method}${endpoint}${bodyStr}`;
    const signature = await this._hmacSignB64(creds.apiSecret, preSign);

    const url = `${BROKERS.okx.baseUrl}${endpoint}`;
    const headers = {
      'OK-ACCESS-KEY': creds.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': creds.passphrase || '',
      'Content-Type': 'application/json',
    };

    const data = await this._proxyRequest(url, method, headers, method !== 'GET' ? params : null);
    if (data.code && data.code !== '0') {
      throw new Error(`OKX: ${data.msg || 'Unknown error'} (${data.code})`);
    }
    return data.data || data;
  }

  // ════════════════════════════════════════════════════════
  // ─── BINGX (HMAC-SHA256, query string signing) ───
  // ════════════════════════════════════════════════════════
  async _bingxRequest(creds, method, endpoint, params = {}) {
    const timestamp = Date.now().toString();
    const allParams = { ...params, timestamp };
    const queryString = Object.entries(allParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    const signature = await this._hmacSign(creds.apiSecret, queryString);
    const signedQuery = `${queryString}&signature=${signature}`;

    const url = `${BROKERS.bingx.baseUrl}${endpoint}?${signedQuery}`;
    const headers = {
      'X-BX-APIKEY': creds.apiKey,
      'Content-Type': 'application/json',
    };

    const data = await this._proxyRequest(url, method, headers, method !== 'GET' ? params : null);
    if (data.code && data.code !== 0) {
      throw new Error(`BingX: ${data.msg || 'Unknown error'} (${data.code})`);
    }
    return data.data || data;
  }

  // ════════════════════════════════════════════════════════
  // ─── BITGET (HMAC-SHA256 + passphrase, like OKX) ───
  // ════════════════════════════════════════════════════════
  async _bitgetRequest(creds, method, endpoint, params = {}) {
    const timestamp = Date.now().toString();
    let bodyStr = '';
    let queryString = '';

    if (method === 'GET') {
      queryString = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      if (queryString) endpoint = `${endpoint}?${queryString}`;
    } else {
      bodyStr = JSON.stringify(params);
    }

    const preSign = `${timestamp}${method}${endpoint}${bodyStr}`;
    const signature = await this._hmacSignB64(creds.apiSecret, preSign);

    const url = `${BROKERS.bitget.baseUrl}${endpoint}`;
    const headers = {
      'ACCESS-KEY': creds.apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': creds.passphrase || '',
      'Content-Type': 'application/json',
      'locale': 'en-US',
    };

    const data = await this._proxyRequest(url, method, headers, method !== 'GET' ? params : null);
    if (data.code && data.code !== '00000') {
      throw new Error(`Bitget: ${data.msg || 'Unknown error'} (${data.code})`);
    }
    return data.data || data;
  }

  // ════════════════════════════════════════════════════════
  // ─── MEXC (HMAC-SHA256, Binance-style query signing) ───
  // ════════════════════════════════════════════════════════
  async _mexcRequest(creds, method, endpoint, params = {}) {
    const timestamp = Date.now();
    const allParams = { ...params, timestamp, recvWindow: 5000 };
    const queryString = Object.entries(allParams)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    const signature = await this._hmacSign(creds.apiSecret, queryString);
    const signedQuery = `${queryString}&signature=${signature}`;

    const url = method === 'GET'
      ? `${BROKERS.mexc.baseUrl}${endpoint}?${signedQuery}`
      : `${BROKERS.mexc.baseUrl}${endpoint}`;

    const headers = {
      'X-MEXC-APIKEY': creds.apiKey,
      'Content-Type': 'application/json',
    };

    const body = method !== 'GET' ? signedQuery : null;
    const data = await this._proxyRequest(url, method, headers, body);
    if (data.code && data.code !== 0 && data.code !== 200) {
      throw new Error(`MEXC: ${data.msg || 'Unknown error'} (${data.code})`);
    }
    return data;
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
          const accounts = await this._coinbaseRequest(creds, 'GET', '/api/v3/brokerage/accounts?limit=250');
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
        case 'bybit': {
          const wallet = await this._bybitRequest(creds, 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
          const coins = wallet?.list?.[0]?.coin?.length || 0;
          this.connections.set(broker.id, { creds, config, connected: true, permissions: ['read', 'trade'] });
          return { success: true, message: `Connected to Bybit (${coins} assets)`, permissions: ['read', 'trade'] };
        }
        case 'kraken': {
          const balance = await this._krakenRequest(creds, '/0/private/Balance');
          const assets = Object.keys(balance || {}).length;
          this.connections.set(broker.id, { creds, config, connected: true, permissions: ['read', 'trade'] });
          return { success: true, message: `Connected to Kraken (${assets} assets)`, permissions: ['read', 'trade'] };
        }
        case 'kucoin': {
          const accounts = await this._kucoinRequest(creds, 'GET', '/api/v1/accounts');
          const count = Array.isArray(accounts) ? accounts.length : 0;
          this.connections.set(broker.id, { creds, config, connected: true, permissions: ['read', 'trade'] });
          return { success: true, message: `Connected to KuCoin (${count} accounts)`, permissions: ['read', 'trade'] };
        }
        case 'okx': {
          const bal = await this._okxRequest(creds, 'GET', '/api/v5/account/balance');
          const assets = Array.isArray(bal) && bal[0]?.details ? bal[0].details.length : 0;
          this.connections.set(broker.id, { creds, config, connected: true, permissions: ['read', 'trade'] });
          return { success: true, message: `Connected to OKX (${assets} assets)`, permissions: ['read', 'trade'] };
        }
        case 'bingx': {
          const bal = await this._bingxRequest(creds, 'GET', '/openApi/spot/v1/account/balance');
          const assets = Array.isArray(bal?.balances) ? bal.balances.filter(b => parseFloat(b.free) > 0).length : 0;
          this.connections.set(broker.id, { creds, config, connected: true, permissions: ['read', 'trade'] });
          return { success: true, message: `Connected to BingX (${assets} assets)`, permissions: ['read', 'trade'] };
        }
        case 'bitget': {
          const acct = await this._bitgetRequest(creds, 'GET', '/api/v2/spot/account/assets');
          const assets = Array.isArray(acct) ? acct.filter(a => parseFloat(a.available) > 0).length : 0;
          this.connections.set(broker.id, { creds, config, connected: true, permissions: ['read', 'trade'] });
          return { success: true, message: `Connected to Bitget (${assets} assets)`, permissions: ['read', 'trade'] };
        }
        case 'mexc': {
          const acct = await this._mexcRequest(creds, 'GET', '/api/v3/account');
          const assets = Array.isArray(acct?.balances) ? acct.balances.filter(b => parseFloat(b.free) > 0).length : 0;
          this.connections.set(broker.id, { creds, config, connected: true, permissions: ['read', 'trade'] });
          return { success: true, message: `Connected to MEXC (${assets} assets)`, permissions: ['read', 'trade'] };
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
        const data = await this._coinbaseRequest(conn.creds, 'GET', '/api/v3/brokerage/accounts?limit=250');
        // Debug removed for production
        const allAccounts = (data.accounts || []).map(a => ({
          asset: a.currency,
          free: a.available_balance?.value || '0',
          locked: a.hold?.value || '0',
          total: (parseFloat(a.available_balance?.value || 0) + parseFloat(a.hold?.value || 0)).toString(),
          name: a.name,
        }));

        const filtered = allAccounts.filter(a => parseFloat(a.free) > 0 || parseFloat(a.locked) > 0);

        return filtered;
      } catch (err) { console.error('Coinbase getBalances:', err); throw err; }
    }

    if (conn.config.id === 'bybit') {
      try {
        const wallet = await this._bybitRequest(conn.creds, 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
        const coins = wallet?.list?.[0]?.coin || [];
        return coins
          .filter(c => parseFloat(c.walletBalance) > 0)
          .map(c => ({
            asset: c.coin,
            free: c.availableToWithdraw || c.walletBalance || '0',
            locked: (parseFloat(c.walletBalance || 0) - parseFloat(c.availableToWithdraw || 0)).toString(),
            total: c.walletBalance || '0',
          }));
      } catch (err) { console.error('Bybit getBalances:', err); throw err; }
    }

    if (conn.config.id === 'kraken') {
      try {
        const balance = await this._krakenRequest(conn.creds, '/0/private/Balance');
        // Kraken uses prefixes: XXBT for BTC, ZUSD for USD, etc.
        const krakenMap = { XXBT: 'BTC', XETH: 'ETH', ZUSD: 'USD', XXRP: 'XRP', XLTC: 'LTC', XXLM: 'XLM', XDOGE: 'DOGE' };
        return Object.entries(balance || {})
          .filter(([, v]) => parseFloat(v) > 0)
          .map(([k, v]) => ({
            asset: krakenMap[k] || k.replace(/^[XZ]/, ''),
            free: v,
            locked: '0',
            total: v,
          }));
      } catch (err) { console.error('Kraken getBalances:', err); throw err; }
    }

    if (conn.config.id === 'kucoin') {
      try {
        const accounts = await this._kucoinRequest(conn.creds, 'GET', '/api/v1/accounts', { type: 'trade' });
        return (Array.isArray(accounts) ? accounts : [])
          .filter(a => parseFloat(a.balance) > 0)
          .map(a => ({
            asset: a.currency,
            free: a.available || '0',
            locked: a.holds || '0',
            total: a.balance || '0',
          }));
      } catch (err) { console.error('KuCoin getBalances:', err); throw err; }
    }

    if (conn.config.id === 'okx') {
      try {
        const bal = await this._okxRequest(conn.creds, 'GET', '/api/v5/account/balance');
        const details = Array.isArray(bal) && bal[0]?.details ? bal[0].details : [];
        return details
          .filter(d => parseFloat(d.cashBal) > 0)
          .map(d => ({
            asset: d.ccy,
            free: d.availBal || d.cashBal || '0',
            locked: d.frozenBal || '0',
            total: d.cashBal || '0',
          }));
      } catch (err) { console.error('OKX getBalances:', err); throw err; }
    }

    if (conn.config.id === 'bingx') {
      try {
        const data = await this._bingxRequest(conn.creds, 'GET', '/openApi/spot/v1/account/balance');
        const balances = data?.balances || (Array.isArray(data) ? data : []);
        return balances
          .filter(b => parseFloat(b.free || b.available || 0) > 0)
          .map(b => ({
            asset: b.asset || b.currency,
            free: b.free || b.available || '0',
            locked: b.locked || b.freeze || '0',
            total: (parseFloat(b.free || b.available || 0) + parseFloat(b.locked || b.freeze || 0)).toString(),
          }));
      } catch (err) { console.error('BingX getBalances:', err); throw err; }
    }

    if (conn.config.id === 'bitget') {
      try {
        const data = await this._bitgetRequest(conn.creds, 'GET', '/api/v2/spot/account/assets');
        const assets = Array.isArray(data) ? data : [];
        return assets
          .filter(a => parseFloat(a.available || 0) > 0)
          .map(a => ({
            asset: a.coin || a.coinName,
            free: a.available || '0',
            locked: a.frozen || a.lock || '0',
            total: (parseFloat(a.available || 0) + parseFloat(a.frozen || a.lock || 0)).toString(),
          }));
      } catch (err) { console.error('Bitget getBalances:', err); throw err; }
    }

    if (conn.config.id === 'mexc') {
      try {
        const acct = await this._mexcRequest(conn.creds, 'GET', '/api/v3/account');
        const balances = Array.isArray(acct?.balances) ? acct.balances : [];
        return balances
          .filter(b => parseFloat(b.free || 0) > 0)
          .map(b => ({
            asset: b.asset,
            free: b.free || '0',
            locked: b.locked || '0',
            total: (parseFloat(b.free || 0) + parseFloat(b.locked || 0)).toString(),
          }));
      } catch (err) { console.error('MEXC getBalances:', err); throw err; }
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
          real: true,
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
        // Convert symbol: BTCUSDT → BTC-USDT (Coinbase format)
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


        // Coinbase returns { success: true/false, success_response: {...}, error_response: {...} }
        if (!result.success) {
          const errMsg = result.error_response?.error || result.failure_response?.error 
            || result.error_response?.message || result.error || 'Unknown error';
          const errDetail = result.error_response?.error_details || result.failure_response?.message || '';
          console.error('[COINBASE ORDER] FAILED:', errMsg, errDetail);
          throw new Error(`Coinbase order failed: ${errMsg}${errDetail ? ' — ' + errDetail : ''}`);
        }

        const orderResult = result.success_response || result;
        const orderId = orderResult.order_id || orderResult.id;
        if (!orderId) {
          console.error('[COINBASE ORDER] No order_id in response:', result);
          throw new Error('Coinbase: no order_id returned');
        }


        // Wait briefly for market order to fill, then fetch details
        let filledPrice = 0;
        let filledQty = 0;
        let orderStatus = 'unknown';

        // Retry up to 3 times to get fill details (market orders fill within ms)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 500));
            const details = await this._coinbaseRequest(conn.creds, 'GET', `/api/v3/brokerage/orders/historical/${orderId}`);

            const ord = details.order || details;
            orderStatus = (ord.status || '').toUpperCase();
            filledPrice = parseFloat(ord.average_filled_price || 0);
            filledQty = parseFloat(ord.filled_size || 0);
            if (orderStatus === 'FILLED' || orderStatus === 'CANCELLED' || filledQty > 0) break;
          } catch (detailErr) {
            console.warn(`[COINBASE ORDER] Detail fetch attempt ${attempt + 1} failed:`, detailErr.message);
          }
        }

        // If we still couldn't confirm fill, mark as unconfirmed
        if (filledQty === 0 && filledPrice === 0) {
          console.warn('[COINBASE ORDER] Could not confirm fill for', orderId, '- status:', orderStatus);
          // Use local price as estimate but flag it
          filledPrice = parseFloat(price || 0);
          filledQty = parseFloat(quantity);
          orderStatus = 'UNCONFIRMED';
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
          status: orderStatus.toLowerCase(),
          confirmed: orderStatus !== 'UNCONFIRMED',
          timestamp: new Date().toISOString(),
          broker: 'Coinbase',
          real: true,
        };
      } catch (err) {
        console.error('[COINBASE ORDER] placeOrder error:', err.message);
        throw err;
      }
    }

    // ─── BYBIT v5 ───
    if (conn.config.id === 'bybit') {
      try {
        const productId = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1$2').toUpperCase();
        const orderParams = {
          category: 'spot',
          symbol: productId,
          side: side.charAt(0).toUpperCase() + side.slice(1).toLowerCase(),
          orderType: type === 'market' ? 'Market' : 'Limit',
          qty: quantity.toString(),
        };
        if (type === 'market' && side.toLowerCase() === 'buy') {
          // Bybit spot market buy: use quote qty
          orderParams.marketUnit = 'quoteCoin';
          orderParams.qty = (parseFloat(quantity) * parseFloat(price || 0)).toFixed(2);
        }
        if (type === 'limit') {
          orderParams.price = parseFloat(price).toFixed(2);
          orderParams.timeInForce = 'GTC';
        }
        const result = await this._bybitRequest(conn.creds, 'POST', '/v5/order/create', orderParams);
        const orderId = result.orderId || Date.now().toString(36);
        // Get fill details
        let filledPrice = parseFloat(price || 0);
        let filledQty = parseFloat(quantity);
        try {
          await new Promise(r => setTimeout(r, 500)); // Wait for fill
          const detail = await this._bybitRequest(conn.creds, 'GET', '/v5/order/realtime', { category: 'spot', orderId });
          const o = detail?.list?.[0];
          if (o) {
            filledPrice = parseFloat(o.avgPrice || o.price || price || 0);
            filledQty = parseFloat(o.cumExecQty || quantity);
          }
        } catch {}
        return {
          id: orderId, symbol: productId, side: side.toLowerCase(), type,
          quantity: filledQty, price: filledPrice, filledPrice, filledQty,
          status: 'filled', timestamp: new Date().toISOString(), broker: 'Bybit', real: true,
        };
      } catch (err) { console.error('Bybit placeOrder:', err); throw err; }
    }

    // ─── KRAKEN ───
    if (conn.config.id === 'kraken') {
      try {
        // Kraken pair format: XBTUSDT, ETHUSDT
        const krakenPair = symbol.replace('BTC', 'XBT');
        const params = {
          pair: krakenPair,
          type: side.toLowerCase(),
          ordertype: type === 'market' ? 'market' : 'limit',
          volume: quantity.toString(),
        };
        if (type === 'limit') params.price = parseFloat(price).toFixed(2);
        const result = await this._krakenRequest(conn.creds, '/0/private/AddOrder', params);
        const txid = result?.txid?.[0] || Date.now().toString(36);
        return {
          id: txid, symbol: krakenPair, side: side.toLowerCase(), type,
          quantity: parseFloat(quantity), price: parseFloat(price || 0),
          filledPrice: parseFloat(price || 0), filledQty: parseFloat(quantity),
          status: 'filled', timestamp: new Date().toISOString(), broker: 'Kraken', real: true,
        };
      } catch (err) { console.error('Kraken placeOrder:', err); throw err; }
    }

    // ─── KUCOIN ───
    if (conn.config.id === 'kucoin') {
      try {
        // KuCoin pair: BTC-USDT
        const productId = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const params = {
          clientOid: crypto.randomUUID(),
          symbol: productId,
          side: side.toLowerCase(),
          type: type === 'market' ? 'market' : 'limit',
        };
        if (type === 'market') {
          if (side.toLowerCase() === 'buy') {
            params.funds = (parseFloat(quantity) * parseFloat(price || 0)).toFixed(2);
          } else {
            params.size = quantity.toString();
          }
        } else {
          params.price = parseFloat(price).toFixed(2);
          params.size = quantity.toString();
        }
        const result = await this._kucoinRequest(conn.creds, 'POST', '/api/v1/orders', params);
        const orderId = result?.orderId || Date.now().toString(36);
        return {
          id: orderId, symbol: productId, side: side.toLowerCase(), type,
          quantity: parseFloat(quantity), price: parseFloat(price || 0),
          filledPrice: parseFloat(price || 0), filledQty: parseFloat(quantity),
          status: 'filled', timestamp: new Date().toISOString(), broker: 'KuCoin', real: true,
        };
      } catch (err) { console.error('KuCoin placeOrder:', err); throw err; }
    }

    // ─── OKX ───
    if (conn.config.id === 'okx') {
      try {
        // OKX pair: BTC-USDT
        const productId = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const params = {
          instId: productId,
          tdMode: 'cash', // spot
          side: side.toLowerCase(),
          ordType: type === 'market' ? 'market' : 'limit',
          sz: quantity.toString(),
        };
        if (type === 'market' && side.toLowerCase() === 'buy') {
          params.tgtCcy = 'quote_ccy';
          params.sz = (parseFloat(quantity) * parseFloat(price || 0)).toFixed(2);
        }
        if (type === 'limit') params.px = parseFloat(price).toFixed(2);
        const result = await this._okxRequest(conn.creds, 'POST', '/api/v5/trade/order', params);
        const orderId = Array.isArray(result) ? result[0]?.ordId : result?.ordId || Date.now().toString(36);
        if (Array.isArray(result) && result[0]?.sCode !== '0') {
          throw new Error(`OKX order failed: ${result[0]?.sMsg}`);
        }
        return {
          id: orderId, symbol: productId, side: side.toLowerCase(), type,
          quantity: parseFloat(quantity), price: parseFloat(price || 0),
          filledPrice: parseFloat(price || 0), filledQty: parseFloat(quantity),
          status: 'filled', timestamp: new Date().toISOString(), broker: 'OKX', real: true,
        };
      } catch (err) { console.error('OKX placeOrder:', err); throw err; }
    }

    // ─── BINGX ───
    if (conn.config.id === 'bingx') {
      try {
        // BingX pair: BTC-USDT
        const productId = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const params = {
          symbol: productId,
          side: side.toUpperCase(),
          type: type === 'market' ? 'MARKET' : 'LIMIT',
        };
        if (type === 'market') {
          if (side.toLowerCase() === 'buy') {
            params.quoteOrderQty = (parseFloat(quantity) * parseFloat(price || 0)).toFixed(2);
          } else {
            params.quantity = parseFloat(quantity).toString();
          }
        } else {
          params.price = parseFloat(price).toFixed(2);
          params.quantity = parseFloat(quantity).toString();
        }
        const result = await this._bingxRequest(conn.creds, 'POST', '/openApi/spot/v1/trade/order', params);
        const orderId = result?.orderId || result?.data?.orderId || Date.now().toString(36);
        return {
          id: orderId?.toString(), symbol: productId, side: side.toLowerCase(), type,
          quantity: parseFloat(quantity), price: parseFloat(price || 0),
          filledPrice: parseFloat(result?.price || price || 0),
          filledQty: parseFloat(result?.executedQty || quantity),
          status: 'filled', timestamp: new Date().toISOString(), broker: 'BingX', real: true,
        };
      } catch (err) { console.error('BingX placeOrder:', err); throw err; }
    }

    // ─── BITGET ───
    if (conn.config.id === 'bitget') {
      try {
        const productId = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1$2').toUpperCase();
        const params = {
          symbol: productId,
          side: side.toLowerCase(),
          orderType: type === 'market' ? 'market' : 'limit',
          force: 'gtc',
          size: quantity.toString(),
        };
        if (type === 'market' && side.toLowerCase() === 'buy') {
          params.size = (parseFloat(quantity) * parseFloat(price || 0)).toFixed(2);
        }
        if (type === 'limit') params.price = parseFloat(price).toFixed(2);
        const result = await this._bitgetRequest(conn.creds, 'POST', '/api/v2/spot/trade/place-order', params);
        const orderId = result?.orderId || Date.now().toString(36);
        return {
          id: orderId?.toString(), symbol: productId, side: side.toLowerCase(), type,
          quantity: parseFloat(quantity), price: parseFloat(price || 0),
          filledPrice: parseFloat(price || 0), filledQty: parseFloat(quantity),
          status: 'filled', timestamp: new Date().toISOString(), broker: 'Bitget', real: true,
        };
      } catch (err) { console.error('Bitget placeOrder:', err); throw err; }
    }

    // ─── MEXC ───
    if (conn.config.id === 'mexc') {
      try {
        // MEXC uses Binance-style symbols: BTCUSDT
        const productId = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1$2').toUpperCase();
        const params = {
          symbol: productId,
          side: side.toUpperCase(),
          type: type === 'market' ? 'MARKET' : 'LIMIT',
        };
        if (type === 'market') {
          if (side.toLowerCase() === 'buy') {
            params.quoteOrderQty = (parseFloat(quantity) * parseFloat(price || 0)).toFixed(2);
          } else {
            params.quantity = parseFloat(quantity).toString();
          }
        } else {
          params.price = parseFloat(price).toFixed(2);
          params.quantity = parseFloat(quantity).toString();
          params.timeInForce = 'GTC';
        }
        const result = await this._mexcRequest(conn.creds, 'POST', '/api/v3/order', params);
        const orderId = result?.orderId || Date.now().toString(36);
        return {
          id: orderId?.toString(), symbol: productId, side: side.toLowerCase(), type,
          quantity: parseFloat(quantity), price: parseFloat(price || 0),
          filledPrice: parseFloat(result?.price || price || 0),
          filledQty: parseFloat(result?.executedQty || quantity),
          status: 'filled', timestamp: new Date().toISOString(), broker: 'MEXC', real: true,
        };
      } catch (err) { console.error('MEXC placeOrder:', err); throw err; }
    }

    // ─── WALLET / DEX ───
    if (conn.config.id === 'wallet') {
      try {
        const chainId = conn.chainId || 56;
        const privateKey = conn.creds.apiSecret;
        const result = await walletBroker.placeOrder(privateKey, chainId, {
          symbol, side, type: 'market', quantity, price
        });
        if (!result.success) throw new Error(result.error || 'DEX swap failed');
        return {
          id: result.txHash || Date.now().toString(36),
          symbol: result.symbol || symbol,
          side: side.toLowerCase(),
          type: 'market',
          quantity: parseFloat(result.amountIn || quantity),
          price: parseFloat(result.effectivePrice || price || 0),
          filledPrice: parseFloat(result.effectivePrice || price || 0),
          filledQty: parseFloat(result.amountOut || quantity),
          status: 'filled',
          timestamp: new Date().toISOString(),
          broker: 'Kairos Wallet',
          real: true,
          txHash: result.txHash,
          chain: result.chain,
        };
      } catch (err) { console.error('Wallet DEX placeOrder:', err); throw err; }
    }

    // Simulated execution for any remaining unsupported brokers
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

  // ─── Cancel order ───
  async cancelOrder(brokerId, orderId, symbol) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');

    if (conn.config.id === 'binance') {
      try {
        const result = await this._binanceSignedRequest(conn.creds, 'DELETE', '/api/v3/order', { symbol, orderId });
        return { success: true, orderId: result.orderId, status: result.status };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'coinbase') {
      try {
        await this._coinbaseRequest(conn.creds, 'POST', '/api/v3/brokerage/orders/batch_cancel', { order_ids: [orderId] });
        return { success: true, orderId };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'bybit') {
      try {
        await this._bybitRequest(conn.creds, 'POST', '/v5/order/cancel', { category: 'spot', symbol, orderId });
        return { success: true, orderId };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'kraken') {
      try {
        await this._krakenRequest(conn.creds, '/0/private/CancelOrder', { txid: orderId });
        return { success: true, orderId };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'kucoin') {
      try {
        await this._kucoinRequest(conn.creds, 'DELETE', `/api/v1/orders/${orderId}`);
        return { success: true, orderId };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'okx') {
      try {
        await this._okxRequest(conn.creds, 'POST', '/api/v5/trade/cancel-order', { instId: symbol, ordId: orderId });
        return { success: true, orderId };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'bingx') {
      try {
        await this._bingxRequest(conn.creds, 'POST', '/openApi/spot/v1/trade/cancel', { symbol, orderId });
        return { success: true, orderId };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'bitget') {
      try {
        await this._bitgetRequest(conn.creds, 'POST', '/api/v2/spot/trade/cancel-order', { symbol, orderId });
        return { success: true, orderId };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'mexc') {
      try {
        await this._mexcRequest(conn.creds, 'DELETE', '/api/v3/order', { symbol, orderId });
        return { success: true, orderId };
      } catch (err) { return { success: false, message: err.message }; }
    }
    if (conn.config.id === 'wallet') {
      return { success: false, message: 'DEX orders are instant swaps and cannot be cancelled' };
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

    if (conn.config.id === 'coinbase') {
      try {
        const productId = symbol
          ? symbol.replace(/([A-Z]+)(USDT|USDC|USD|BTC|ETH)$/i, '$1-$2').toUpperCase()
          : undefined;
        let url = '/api/v3/brokerage/orders/historical/batch?order_status=OPEN';
        if (productId) url += `&product_id=${productId}`;
        const data = await this._coinbaseRequest(conn.creds, 'GET', url);
        return (data.orders || []).map(o => ({
          id: o.order_id,
          symbol: o.product_id,
          side: o.side?.toLowerCase(),
          type: o.order_type?.toLowerCase(),
          quantity: parseFloat(o.order_configuration?.limit_limit_gtc?.base_size || 0),
          price: parseFloat(o.order_configuration?.limit_limit_gtc?.limit_price || o.average_filled_price || 0),
          filledQty: parseFloat(o.filled_size || 0),
          status: o.status?.toLowerCase(),
          time: o.created_time,
        }));
      } catch (err) {
        console.error('[COINBASE] getOpenOrders error:', err.message);
        return [];
      }
    }

    // ─── BYBIT v5 ───
    if (conn.config.id === 'bybit') {
      try {
        const params = { category: 'spot' };
        if (symbol) params.symbol = symbol;
        const data = await this._bybitRequest(conn.creds, 'GET', '/v5/order/realtime', params);
        return (data?.list || []).map(o => ({
          id: o.orderId,
          symbol: o.symbol,
          side: o.side?.toLowerCase(),
          type: o.orderType?.toLowerCase(),
          quantity: parseFloat(o.qty || 0),
          price: parseFloat(o.price || 0),
          filledQty: parseFloat(o.cumExecQty || 0),
          status: o.orderStatus?.toLowerCase(),
          time: o.createdTime ? new Date(parseInt(o.createdTime)).toISOString() : null,
        }));
      } catch (err) { console.error('Bybit getOpenOrders:', err.message); return []; }
    }

    // ─── KRAKEN ───
    if (conn.config.id === 'kraken') {
      try {
        const data = await this._krakenRequest(conn.creds, '/0/private/OpenOrders');
        const orders = data?.open || {};
        return Object.entries(orders).map(([txid, o]) => ({
          id: txid,
          symbol: o.descr?.pair || '',
          side: o.descr?.type?.toLowerCase(),
          type: o.descr?.ordertype?.toLowerCase(),
          quantity: parseFloat(o.vol || 0),
          price: parseFloat(o.descr?.price || 0),
          filledQty: parseFloat(o.vol_exec || 0),
          status: o.status?.toLowerCase() || 'open',
          time: o.opentm ? new Date(o.opentm * 1000).toISOString() : null,
        }));
      } catch (err) { console.error('Kraken getOpenOrders:', err.message); return []; }
    }

    // ─── KUCOIN ───
    if (conn.config.id === 'kucoin') {
      try {
        const params = { status: 'active' };
        if (symbol) params.symbol = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const data = await this._kucoinRequest(conn.creds, 'GET', '/api/v1/orders', params);
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        return items.map(o => ({
          id: o.id,
          symbol: o.symbol,
          side: o.side?.toLowerCase(),
          type: o.type?.toLowerCase(),
          quantity: parseFloat(o.size || 0),
          price: parseFloat(o.price || 0),
          filledQty: parseFloat(o.dealSize || 0),
          status: o.isActive ? 'open' : 'done',
          time: o.createdAt ? new Date(parseInt(o.createdAt)).toISOString() : null,
        }));
      } catch (err) { console.error('KuCoin getOpenOrders:', err.message); return []; }
    }

    // ─── OKX ───
    if (conn.config.id === 'okx') {
      try {
        const params = { instType: 'SPOT' };
        if (symbol) params.instId = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const data = await this._okxRequest(conn.creds, 'GET', '/api/v5/trade/orders-pending', params);
        const items = Array.isArray(data) ? data : [];
        return items.map(o => ({
          id: o.ordId,
          symbol: o.instId,
          side: o.side?.toLowerCase(),
          type: o.ordType?.toLowerCase(),
          quantity: parseFloat(o.sz || 0),
          price: parseFloat(o.px || 0),
          filledQty: parseFloat(o.accFillSz || 0),
          status: o.state?.toLowerCase() || 'open',
          time: o.cTime ? new Date(parseInt(o.cTime)).toISOString() : null,
        }));
      } catch (err) { console.error('OKX getOpenOrders:', err.message); return []; }
    }

    // ─── BINGX ───
    if (conn.config.id === 'bingx') {
      try {
        const params = {};
        if (symbol) params.symbol = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const data = await this._bingxRequest(conn.creds, 'GET', '/openApi/spot/v1/trade/openOrders', params);
        const orders = data?.orders || (Array.isArray(data) ? data : []);
        return orders.map(o => ({
          id: o.orderId?.toString(),
          symbol: o.symbol,
          side: o.side?.toLowerCase(),
          type: o.type?.toLowerCase(),
          quantity: parseFloat(o.origQty || 0),
          price: parseFloat(o.price || 0),
          filledQty: parseFloat(o.executedQty || 0),
          status: o.status?.toLowerCase() || 'open',
          time: o.time ? new Date(parseInt(o.time)).toISOString() : null,
        }));
      } catch (err) { console.error('BingX getOpenOrders:', err.message); return []; }
    }

    // ─── BITGET ───
    if (conn.config.id === 'bitget') {
      try {
        const params = {};
        if (symbol) params.symbol = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1$2').toUpperCase();
        const data = await this._bitgetRequest(conn.creds, 'GET', '/api/v2/spot/trade/unfilled-orders', params);
        const items = Array.isArray(data) ? data : [];
        return items.map(o => ({
          id: o.orderId,
          symbol: o.symbol,
          side: o.side?.toLowerCase(),
          type: o.orderType?.toLowerCase(),
          quantity: parseFloat(o.size || 0),
          price: parseFloat(o.price || 0),
          filledQty: parseFloat(o.baseVolume || 0),
          status: o.status?.toLowerCase() || 'open',
          time: o.cTime ? new Date(parseInt(o.cTime)).toISOString() : null,
        }));
      } catch (err) { console.error('Bitget getOpenOrders:', err.message); return []; }
    }

    // ─── MEXC ───
    if (conn.config.id === 'mexc') {
      try {
        const params = {};
        if (symbol) params.symbol = symbol;
        const data = await this._mexcRequest(conn.creds, 'GET', '/api/v3/openOrders', params);
        const orders = Array.isArray(data) ? data : [];
        return orders.map(o => ({
          id: o.orderId?.toString(),
          symbol: o.symbol,
          side: o.side?.toLowerCase(),
          type: o.type?.toLowerCase(),
          quantity: parseFloat(o.origQty || 0),
          price: parseFloat(o.price || 0),
          filledQty: parseFloat(o.executedQty || 0),
          status: o.status?.toLowerCase() || 'open',
          time: o.time ? new Date(o.time).toISOString() : null,
        }));
      } catch (err) { console.error('MEXC getOpenOrders:', err.message); return []; }
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

    if (conn.config.id === 'coinbase') {
      try {
        const productId = symbol
          ? symbol.replace(/([A-Z]+)(USDT|USDC|USD|BTC|ETH)$/i, '$1-$2').toUpperCase()
          : undefined;
        let url = `/api/v3/brokerage/orders/historical/fills?limit=${limit}`;
        if (productId) url += `&product_id=${productId}`;
        const data = await this._coinbaseRequest(conn.creds, 'GET', url);

        return (data.fills || []).map(f => ({
          id: f.trade_id || f.entry_id,
          orderId: f.order_id,
          symbol: f.product_id,
          side: f.side?.toLowerCase(),
          price: parseFloat(f.price || 0),
          quantity: parseFloat(f.size || f.size_in_quote || 0),
          commission: parseFloat(f.commission || 0),
          commissionAsset: f.product_id?.split('-')?.[1] || 'USD',
          time: f.trade_time,
          isMaker: false,
        }));
      } catch (err) {
        console.error('[COINBASE] getTradeHistory error:', err.message);
        return [];
      }
    }

    // ─── BYBIT v5 ───
    if (conn.config.id === 'bybit') {
      try {
        const params = { category: 'spot', limit: limit.toString() };
        if (symbol) params.symbol = symbol;
        const data = await this._bybitRequest(conn.creds, 'GET', '/v5/execution/list', params);
        return (data?.list || []).map(t => ({
          id: t.execId,
          orderId: t.orderId,
          symbol: t.symbol,
          side: t.side?.toLowerCase(),
          price: parseFloat(t.execPrice || 0),
          quantity: parseFloat(t.execQty || 0),
          commission: parseFloat(t.execFee || 0),
          commissionAsset: t.feeCurrency || '',
          time: t.execTime ? new Date(parseInt(t.execTime)).toISOString() : null,
          isMaker: t.isMaker === 'true' || t.isMaker === true,
        }));
      } catch (err) { console.error('Bybit getTradeHistory:', err.message); return []; }
    }

    // ─── KRAKEN ───
    if (conn.config.id === 'kraken') {
      try {
        const data = await this._krakenRequest(conn.creds, '/0/private/TradesHistory');
        const trades = data?.trades || {};
        return Object.entries(trades).slice(0, limit).map(([txid, t]) => ({
          id: txid,
          orderId: t.ordertxid,
          symbol: t.pair,
          side: t.type?.toLowerCase(),
          price: parseFloat(t.price || 0),
          quantity: parseFloat(t.vol || 0),
          commission: parseFloat(t.fee || 0),
          commissionAsset: '',
          time: t.time ? new Date(t.time * 1000).toISOString() : null,
          isMaker: t.maker === true,
        }));
      } catch (err) { console.error('Kraken getTradeHistory:', err.message); return []; }
    }

    // ─── KUCOIN ───
    if (conn.config.id === 'kucoin') {
      try {
        const params = {};
        if (symbol) params.symbol = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const data = await this._kucoinRequest(conn.creds, 'GET', '/api/v1/fills', params);
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        return items.slice(0, limit).map(t => ({
          id: t.tradeId || t.id,
          orderId: t.orderId,
          symbol: t.symbol,
          side: t.side?.toLowerCase(),
          price: parseFloat(t.price || 0),
          quantity: parseFloat(t.size || 0),
          commission: parseFloat(t.fee || 0),
          commissionAsset: t.feeCurrency || '',
          time: t.createdAt ? new Date(parseInt(t.createdAt)).toISOString() : null,
          isMaker: t.liquidity === 'maker',
        }));
      } catch (err) { console.error('KuCoin getTradeHistory:', err.message); return []; }
    }

    // ─── OKX ───
    if (conn.config.id === 'okx') {
      try {
        const params = { instType: 'SPOT' };
        if (symbol) params.instId = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const data = await this._okxRequest(conn.creds, 'GET', '/api/v5/trade/fills-history', params);
        const items = Array.isArray(data) ? data : [];
        return items.slice(0, limit).map(t => ({
          id: t.tradeId || t.billId,
          orderId: t.ordId,
          symbol: t.instId,
          side: t.side?.toLowerCase(),
          price: parseFloat(t.fillPx || 0),
          quantity: parseFloat(t.fillSz || 0),
          commission: Math.abs(parseFloat(t.fee || 0)),
          commissionAsset: t.feeCcy || '',
          time: t.ts ? new Date(parseInt(t.ts)).toISOString() : null,
          isMaker: t.execType === 'M',
        }));
      } catch (err) { console.error('OKX getTradeHistory:', err.message); return []; }
    }

    // ─── BINGX ───
    if (conn.config.id === 'bingx') {
      try {
        const params = { limit: limit.toString() };
        if (symbol) params.symbol = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1-$2').toUpperCase();
        const data = await this._bingxRequest(conn.creds, 'GET', '/openApi/spot/v1/trade/historyOrders', params);
        const orders = data?.orders || (Array.isArray(data) ? data : []);
        return orders.map(t => ({
          id: t.orderId?.toString(),
          orderId: t.orderId?.toString(),
          symbol: t.symbol,
          side: t.side?.toLowerCase(),
          price: parseFloat(t.price || t.avgPrice || 0),
          quantity: parseFloat(t.executedQty || t.origQty || 0),
          commission: parseFloat(t.commission || 0),
          commissionAsset: t.commissionAsset || '',
          time: t.time ? new Date(parseInt(t.time)).toISOString() : null,
          isMaker: false,
        }));
      } catch (err) { console.error('BingX getTradeHistory:', err.message); return []; }
    }

    // ─── BITGET ───
    if (conn.config.id === 'bitget') {
      try {
        const params = { limit: limit.toString() };
        if (symbol) params.symbol = symbol.replace(/([A-Z]+)(USDT|USDC|USD)$/i, '$1$2').toUpperCase();
        const data = await this._bitgetRequest(conn.creds, 'GET', '/api/v2/spot/trade/fills', params);
        const items = Array.isArray(data) ? data : [];
        return items.map(t => ({
          id: t.tradeId || t.fillId,
          orderId: t.orderId,
          symbol: t.symbol,
          side: t.side?.toLowerCase(),
          price: parseFloat(t.priceAvg || t.price || 0),
          quantity: parseFloat(t.size || 0),
          commission: parseFloat(t.fees || t.fee || 0),
          commissionAsset: t.feeCcy || '',
          time: t.cTime ? new Date(parseInt(t.cTime)).toISOString() : null,
          isMaker: t.tradeScope === 'maker',
        }));
      } catch (err) { console.error('Bitget getTradeHistory:', err.message); return []; }
    }

    // ─── MEXC ───
    if (conn.config.id === 'mexc') {
      try {
        const params = { limit };
        if (symbol) params.symbol = symbol;
        const data = await this._mexcRequest(conn.creds, 'GET', '/api/v3/myTrades', params);
        const trades = Array.isArray(data) ? data : [];
        return trades.map(t => ({
          id: t.id?.toString(),
          orderId: t.orderId?.toString(),
          symbol: t.symbol,
          side: t.isBuyer ? 'buy' : 'sell',
          price: parseFloat(t.price || 0),
          quantity: parseFloat(t.qty || 0),
          commission: parseFloat(t.commission || 0),
          commissionAsset: t.commissionAsset || '',
          time: t.time ? new Date(t.time).toISOString() : null,
          isMaker: t.isMaker === true,
        }));
      } catch (err) { console.error('MEXC getTradeHistory:', err.message); return []; }
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
