// Kairos Trade — Constants
export const APP_VERSION = '2.0.0';
export const APP_NAME = 'Kairos 777';

// Supported brokers
export const BROKERS = {
  binance: {
    id: 'binance',
    name: 'Binance',
    logo: '🟡',
    baseUrl: 'https://api.binance.com',
    wsUrl: 'wss://stream.binance.com:9443/ws',
    supportedMarkets: ['spot', 'futures'],
    requiredFields: ['apiKey', 'apiSecret'],
  },
  bybit: {
    id: 'bybit',
    name: 'Bybit',
    logo: '🟠',
    baseUrl: 'https://api.bybit.com',
    wsUrl: 'wss://stream.bybit.com/v5/public/spot',
    supportedMarkets: ['spot', 'futures', 'options'],
    requiredFields: ['apiKey', 'apiSecret'],
  },
  kraken: {
    id: 'kraken',
    name: 'Kraken',
    logo: '🟣',
    baseUrl: 'https://api.kraken.com',
    wsUrl: 'wss://ws.kraken.com',
    supportedMarkets: ['spot', 'futures'],
    requiredFields: ['apiKey', 'apiSecret'],
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase',
    logo: '🔵',
    baseUrl: 'https://api.coinbase.com',
    wsUrl: 'wss://ws-feed.exchange.coinbase.com',
    supportedMarkets: ['spot'],
    requiredFields: ['apiKey', 'apiSecret'],
  },
  kucoin: {
    id: 'kucoin',
    name: 'KuCoin',
    logo: '🟢',
    baseUrl: 'https://api.kucoin.com',
    wsUrl: 'wss://ws-api.kucoin.com',
    supportedMarkets: ['spot', 'futures'],
    requiredFields: ['apiKey', 'apiSecret', 'passphrase'],
  },
  okx: {
    id: 'okx',
    name: 'OKX',
    logo: '⚫',
    baseUrl: 'https://www.okx.com',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    supportedMarkets: ['spot', 'futures', 'options'],
    requiredFields: ['apiKey', 'apiSecret', 'passphrase'],
  },
  bingx: {
    id: 'bingx',
    name: 'BingX',
    logo: '🔶',
    baseUrl: 'https://open-api.bingx.com',
    wsUrl: 'wss://open-api-ws.bingx.com/market',
    supportedMarkets: ['spot', 'futures'],
    requiredFields: ['apiKey', 'apiSecret'],
  },
  bitget: {
    id: 'bitget',
    name: 'Bitget',
    logo: '🔷',
    baseUrl: 'https://api.bitget.com',
    wsUrl: 'wss://ws.bitget.com/spot/v1/stream/public',
    supportedMarkets: ['spot', 'futures', 'copy'],
    requiredFields: ['apiKey', 'apiSecret', 'passphrase'],
  },
  mexc: {
    id: 'mexc',
    name: 'MEXC',
    logo: '🔻',
    baseUrl: 'https://api.mexc.com',
    wsUrl: 'wss://wbs.mexc.com/ws',
    supportedMarkets: ['spot', 'futures'],
    requiredFields: ['apiKey', 'apiSecret'],
  },
  wallet: {
    id: 'wallet',
    name: 'Kairos Wallet',
    logo: '👛',
    baseUrl: 'dex',
    wsUrl: '',
    supportedMarkets: ['dex'],
    requiredFields: ['apiKey', 'apiSecret'],
    isDex: true,
  },
};

// Popular trading pairs (displayed as KAIROS, mapped to USDT for API calls)
export const POPULAR_PAIRS = [
  'BTCKAIROS', 'ETHKAIROS', 'BNBKAIROS', 'SOLKAIROS', 'XRPKAIROS',
  'ADAKAIROS', 'DOGEKAIROS', 'AVAXKAIROS', 'DOTKAIROS', 'MATICKAIROS',
  'LINKKAIROS', 'ATOMKAIROS', 'LTCKAIROS', 'UNIKAIROS', 'AAVEKAIROS',
  'ARBKAIROS', 'OPKAIROS', 'NEARKAIROS', 'SUIKAIROS', 'APTKAIROS',
];

// Timeframes
export const TIMEFRAMES = [
  { label: '1m', value: '1m', seconds: 60 },
  { label: '5m', value: '5m', seconds: 300 },
  { label: '15m', value: '15m', seconds: 900 },
  { label: '1H', value: '1h', seconds: 3600 },
  { label: '4H', value: '4h', seconds: 14400 },
  { label: '1D', value: '1d', seconds: 86400 },
  { label: '1W', value: '1w', seconds: 604800 },
];

// Technical indicators
export const INDICATORS = {
  ema: { name: 'EMA', params: [{ name: 'period', default: 20, min: 1, max: 500 }] },
  sma: { name: 'SMA', params: [{ name: 'period', default: 20, min: 1, max: 500 }] },
  rsi: { name: 'RSI', params: [{ name: 'period', default: 14, min: 1, max: 100 }] },
  macd: { name: 'MACD', params: [
    { name: 'fast', default: 12 },
    { name: 'slow', default: 26 },
    { name: 'signal', default: 9 },
  ]},
  bb: { name: 'Bollinger Bands', params: [
    { name: 'period', default: 20 },
    { name: 'stdDev', default: 2 },
  ]},
  vwap: { name: 'VWAP', params: [] },
  volume: { name: 'Volume', params: [] },
};

// Bot statuses
export const BOT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  ERROR: 'error',
};

// Order types
export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP_LOSS: 'stop_loss',
  TAKE_PROFIT: 'take_profit',
  TRAILING_STOP: 'trailing_stop',
};

// Order sides
export const ORDER_SIDES = {
  BUY: 'buy',
  SELL: 'sell',
};

// Strategy conditions
export const CONDITIONS = {
  CROSSES_ABOVE: 'crosses_above',
  CROSSES_BELOW: 'crosses_below',
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  EQUALS: 'equals',
};

// Brand
export const BRAND = {
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  dark: '#08090C',
  surface: '#0E1015',
  green: '#00DC82',
  red: '#FF4757',
  name: 'Kairos 777',
  company: 'Kairos 777 Inc',
  tagline: 'Professional AI-Powered Trading',
};

// Kairos Coin info
export const KAIROS_COIN = {
  symbol: 'KAIROS',
  name: 'KairosCoin',
  decimals: 18,
  addresses: {
    56: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
    8453: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
    42161: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
    137: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9',
  },
};

// ── Admin Configuration ──
// Only these emails have admin access (Treasury, global settings)
export const ADMIN_CONFIG = {
  emails: ['info@kairos-777.com'],
  companyName: 'Kairos 777 Inc',
  role: 'CEO & Founder',
  plan: 'enterprise',
};

export const isAdmin = (user) => {
  if (!user?.email) return false;
  return ADMIN_CONFIG.emails.includes(user.email.toLowerCase());
};

export const STORAGE_KEYS = {
  AUTH: 'kairos_trade_auth',
  BROKERS: 'kairos_trade_brokers',
  BOTS: 'kairos_trade_bots',
  SETTINGS: 'kairos_trade_settings',
  STRATEGIES: 'kairos_trade_strategies',
  POSITIONS: 'kairos_trade_positions',
  ORDERS: 'kairos_trade_orders',
  TRADE_HISTORY: 'kairos_trade_history',
};

// Per-user storage keys — isolates data between accounts
export const USER_SCOPED_KEYS = ['BROKERS', 'BOTS', 'SETTINGS', 'STRATEGIES', 'POSITIONS', 'ORDERS', 'TRADE_HISTORY'];

export const getUserKey = (baseKey, userId) => userId ? `${baseKey}_u_${userId}` : baseKey;
