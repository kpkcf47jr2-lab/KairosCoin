// Kairos Trade — Broker Service
// Connects to broker APIs to read balances, execute orders, manage positions
import { BROKERS } from '../constants';

class BrokerService {
  constructor() {
    this.connections = new Map();
  }

  // Decrypt stored credentials
  _decrypt(broker) {
    return {
      ...broker,
      apiKey: atob(broker.apiKey),
      apiSecret: atob(broker.apiSecret),
      passphrase: broker.passphrase ? atob(broker.passphrase) : undefined,
    };
  }

  // ─── Binance ───
  async _binanceRequest(creds, endpoint, params = {}) {
    const url = new URL(`${BROKERS.binance.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    // For public endpoints
    const res = await fetch(url.toString(), {
      headers: { 'X-MBX-APIKEY': creds.apiKey },
    });
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    return res.json();
  }

  // ─── Connect to broker ───
  async connect(broker) {
    const creds = this._decrypt(broker);
    const config = BROKERS[broker.brokerId];
    if (!config) throw new Error(`Unsupported broker: ${broker.brokerId}`);

    try {
      // Test connection by fetching exchange info or account status
      switch (broker.brokerId) {
        case 'binance':
          await this._binanceRequest(creds, '/api/v3/ping');
          break;
        default:
          // Generic test — just verify API is reachable
          await fetch(config.baseUrl);
      }

      this.connections.set(broker.id, { creds, config, connected: true });
      return { success: true, message: `Connected to ${config.name}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // ─── Get balances ───
  async getBalances(brokerId) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');

    // For demo: return simulated balances
    // In production, this hits the real broker API with HMAC signatures
    return [
      { asset: 'BTC', free: '0.5432', locked: '0.0000' },
      { asset: 'ETH', free: '12.3456', locked: '0.0000' },
      { asset: 'USDT', free: '15000.00', locked: '500.00' },
      { asset: 'BNB', free: '25.00', locked: '0.0000' },
      { asset: 'SOL', free: '100.00', locked: '0.0000' },
    ];
  }

  // ─── Place order ───
  async placeOrder(brokerId, order) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');

    const { symbol, side, type, quantity, price, stopLoss, takeProfit } = order;

    // Validate order
    if (!symbol || !side || !type || !quantity) {
      throw new Error('Missing required order fields');
    }

    // In production: send signed request to broker API
    // For now: simulate order execution
    const executedOrder = {
      id: Date.now().toString(36),
      symbol,
      side,
      type,
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : null,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      status: type === 'market' ? 'filled' : 'open',
      filledPrice: type === 'market' ? parseFloat(price || 0) : null,
      timestamp: new Date().toISOString(),
      broker: conn.config.name,
    };

    return executedOrder;
  }

  // ─── Cancel order ───
  async cancelOrder(brokerId, orderId) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');
    return { success: true, orderId };
  }

  // ─── Get open orders ───
  async getOpenOrders(brokerId, symbol) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');
    return [];
  }

  // ─── Get positions ───
  async getPositions(brokerId) {
    const conn = this.connections.get(brokerId);
    if (!conn) throw new Error('Broker not connected');
    return [];
  }

  // ─── Disconnect ───
  disconnect(brokerId) {
    this.connections.delete(brokerId);
  }
}

export const brokerService = new BrokerService();
export default brokerService;
