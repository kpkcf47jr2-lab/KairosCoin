// Kairos Trade — Zustand Store
import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants';

const loadJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
};

const saveJSON = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const useStore = create((set, get) => ({
  // ─── Auth ───
  user: loadJSON(STORAGE_KEYS.AUTH, null),
  isAuthenticated: !!loadJSON(STORAGE_KEYS.AUTH, null),

  login: (userData) => {
    saveJSON(STORAGE_KEYS.AUTH, userData);
    set({ user: userData, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    set({ user: null, isAuthenticated: false });
  },

  // ─── Navigation ───
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),

  // ─── Brokers ───
  brokers: loadJSON(STORAGE_KEYS.BROKERS, []),
  activeBroker: null,

  addBroker: (broker) => {
    const encrypted = {
      ...broker,
      id: Date.now().toString(36),
      apiKey: btoa(broker.apiKey),
      apiSecret: btoa(broker.apiSecret),
      passphrase: broker.passphrase ? btoa(broker.passphrase) : undefined,
      connected: false,
      addedAt: new Date().toISOString(),
    };
    const updated = [...get().brokers, encrypted];
    saveJSON(STORAGE_KEYS.BROKERS, updated);
    set({ brokers: updated });
    return encrypted;
  },

  removeBroker: (id) => {
    const updated = get().brokers.filter(b => b.id !== id);
    saveJSON(STORAGE_KEYS.BROKERS, updated);
    set({ brokers: updated, activeBroker: get().activeBroker?.id === id ? null : get().activeBroker });
  },

  setActiveBroker: (broker) => set({ activeBroker: broker }),

  updateBrokerStatus: (id, connected) => {
    const updated = get().brokers.map(b => b.id === id ? { ...b, connected } : b);
    saveJSON(STORAGE_KEYS.BROKERS, updated);
    set({ brokers: updated });
  },

  // ─── Bots ───
  bots: loadJSON(STORAGE_KEYS.BOTS, []),

  addBot: (bot) => {
    const newBot = {
      ...bot,
      id: Date.now().toString(36),
      status: 'stopped',
      trades: 0,
      pnl: 0,
      winRate: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().bots, newBot];
    saveJSON(STORAGE_KEYS.BOTS, updated);
    set({ bots: updated });
    return newBot;
  },

  updateBot: (id, updates) => {
    const updated = get().bots.map(b => b.id === id ? { ...b, ...updates } : b);
    saveJSON(STORAGE_KEYS.BOTS, updated);
    set({ bots: updated });
  },

  removeBot: (id) => {
    const updated = get().bots.filter(b => b.id !== id);
    saveJSON(STORAGE_KEYS.BOTS, updated);
    set({ bots: updated });
  },

  // ─── Trading ───
  selectedPair: 'BTCKAIROS',
  selectedTimeframe: '1h',
  currentPrice: null,
  priceChange24h: null,
  orderBook: { bids: [], asks: [] },
  positions: loadJSON(STORAGE_KEYS.POSITIONS, []),
  orders: loadJSON(STORAGE_KEYS.ORDERS, []),
  tradeHistory: loadJSON(STORAGE_KEYS.TRADE_HISTORY, []),

  setSelectedPair: (pair) => set({ selectedPair: pair }),
  setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
  setCurrentPrice: (price) => set({ currentPrice: price }),
  setPriceChange24h: (change) => set({ priceChange24h: change }),
  setOrderBook: (ob) => set({ orderBook: ob }),

  addPosition: (pos) => {
    const updated = [...get().positions, { ...pos, id: Date.now().toString(36) }];
    saveJSON(STORAGE_KEYS.POSITIONS, updated);
    set({ positions: updated });
  },
  closePosition: (id) => {
    const pos = get().positions.find(p => p.id === id);
    if (pos) {
      const price = get().currentPrice || pos.entryPrice;
      const pnl = pos.side === 'buy'
        ? (price - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - price) * pos.quantity;
      const closedTrade = { ...pos, closedAt: new Date().toISOString(), exitPrice: price, pnl };
      const updatedPositions = get().positions.filter(p => p.id !== id);
      const updatedHistory = [...get().tradeHistory, closedTrade];
      saveJSON(STORAGE_KEYS.POSITIONS, updatedPositions);
      saveJSON(STORAGE_KEYS.TRADE_HISTORY, updatedHistory);
      set({ positions: updatedPositions, tradeHistory: updatedHistory });
    }
  },

  addOrder: (order) => {
    const updated = [...get().orders, { ...order, id: Date.now().toString(36) }];
    saveJSON(STORAGE_KEYS.ORDERS, updated);
    set({ orders: updated });
  },
  cancelOrder: (id) => {
    const updated = get().orders.filter(o => o.id !== id);
    saveJSON(STORAGE_KEYS.ORDERS, updated);
    set({ orders: updated });
  },

  // ─── Strategies ───
  strategies: loadJSON(STORAGE_KEYS.STRATEGIES, []),

  seedDefaultStrategies: () => {
    const FACTORY_VERSION = 3; // bump to force refresh
    const existing = get().strategies;
    const prevVer = parseInt(localStorage.getItem('kairos_factory_ver') || '0');
    if (prevVer >= FACTORY_VERSION && existing.some(s => s.isFactory)) return;
    // Remove old factory strategies
    const userOnly = existing.filter(s => !s.isFactory);
    localStorage.setItem('kairos_factory_ver', String(FACTORY_VERSION));

    const defaults = [
      {
        id: 'factory_alpha',
        name: 'Kairos Alpha v1',
        type: 'custom_script',
        isFactory: true,
        description: 'Bot multi-señal agresivo — RSI zones + MACD momentum + volumen + mean reversion. Óptimo en 1m-5m.',
        code: `// ═══════════════════════════════════════════
// KAIROS ALPHA v1 — Multi-Signal Scalper
// Diseñado por Mario Isaac @ Kairos 777
// Timeframe recomendado: 1m / 5m
// ═══════════════════════════════════════════

config({ stopLoss: 1.2, takeProfit: 2.0 });

// ─── Indicadores ───
const r = rsi(14);
const emaFast = ema(8);
const emaMid = ema(21);
const emaSlow = ema(50);
const m = macd(12, 26, 9);
const bands = bb(20, 2);
const volAvg = avg(volume, 20);
const volNow = volume.value;
const volSpike = volNow > volAvg * 1.5;

// ─── Scoring system ───
let bullScore = 0;
let bearScore = 0;

// RSI zones
if (r < 30) bullScore += 3;
else if (r < 40) bullScore += 1;
if (r > 70) bearScore += 3;
else if (r > 60) bearScore += 1;

// EMA alignment
if (emaFast > emaMid && emaMid > emaSlow) bullScore += 2;
if (emaFast < emaMid && emaMid < emaSlow) bearScore += 2;

// EMA crossovers
if (crossover(emaFast, emaMid)) bullScore += 2;
if (crossunder(emaFast, emaMid)) bearScore += 2;

// MACD
if (m.histogram > 0 && m.histogram > m.histogram.prev(1)) bullScore += 1;
if (m.histogram < 0 && m.histogram < m.histogram.prev(1)) bearScore += 1;
if (crossover(m.line, m.signal)) bullScore += 2;
if (crossunder(m.line, m.signal)) bearScore += 2;

// Bollinger Bands mean reversion
if (price < bands.lower) bullScore += 2;
if (price > bands.upper) bearScore += 2;

// Volume confirmation
if (volSpike) {
  bullScore += 1;
  bearScore += 1;
}

// ─── Price action ───
const pctMove = percentChange(close, 3);
if (pctMove < -0.3) bullScore += 1;  // oversold bounce
if (pctMove > 0.3) bearScore += 1;  // overbought drop

log("📊 Bull: " + bullScore + " | Bear: " + bearScore + " | RSI: " + r.toFixed(1) + " | Vol: " + (volSpike ? "🔥SPIKE" : "normal"));

// ─── Execute trades ───
if (bullScore >= 5 && bearScore < 3) {
  log("🟢 COMPRA — Score " + bullScore + " [RSI:" + r.toFixed(0) + " MACD:" + m.histogram.toFixed(2) + "]");
  buy();
}

if (bearScore >= 5 && bullScore < 3) {
  log("🔴 VENTA — Score " + bearScore + " [RSI:" + r.toFixed(0) + " MACD:" + m.histogram.toFixed(2) + "]");
  sell();
}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'factory_scalper',
        name: 'Scalper RSI+EMA',
        type: 'custom_script',
        isFactory: true,
        description: 'Scalper con RSI y doble EMA crossover',
        code: `// Scalper — RSI + EMA cross
config({ stopLoss: 1.5, takeProfit: 2.5 });

const r = rsi(14);
const fast = ema(9);
const slow = ema(21);

log("RSI: " + r.toFixed(1) + " | EMA9: " + fast.toFixed(0) + " | EMA21: " + slow.toFixed(0));

if (r < 35 && crossover(fast, slow)) { log("🟢 COMPRA"); buy(); }
if (r > 65 && crossunder(fast, slow)) { log("🔴 VENTA"); sell(); }
if (r > 78) { log("🔴 RSI extremo"); sell(); }
if (r < 22) { log("🟢 RSI extremo bajo"); buy(); }`,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'factory_momentum',
        name: 'Momentum MACD+BB',
        type: 'custom_script',
        isFactory: true,
        description: 'Momentum trading con MACD y Bollinger Bands',
        code: `// Momentum MACD + Bollinger Bands
config({ stopLoss: 2, takeProfit: 3 });

const m = macd(12, 26, 9);
const bands = bb(20, 2);
const r = rsi(14);

log("MACD: " + m.histogram.toFixed(2) + " | BB: " + bands.lower.toFixed(0) + "-" + bands.upper.toFixed(0));

if (price < bands.lower && crossover(m.line, m.signal) && r < 40) {
  log("🟢 COMPRA — BB inferior + MACD alcista"); buy();
}
if (price > bands.upper && crossunder(m.line, m.signal) && r > 60) {
  log("🔴 VENTA — BB superior + MACD bajista"); sell();
}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'factory_sniper',
        name: 'Kairos Sniper 1m',
        type: 'custom_script',
        isFactory: true,
        description: 'Bot ultra-rápido para 1m — detecta micro-reversiones con RSI extremo + volumen. Genera señales frecuentes.',
        code: `// ═══════════════════════════════════════════
// KAIROS SNIPER — Ultra-Fast 1m Scalper
// Diseñado para timeframe 1m / 5m
// Genera señales frecuentes para trading activo
// ═══════════════════════════════════════════

config({ stopLoss: 0.8, takeProfit: 1.2 })

const r = rsi(7)
const r14 = rsi(14)
const fast = ema(5)
const mid = ema(13)
const slow = ema(34)
const m = macd(8, 21, 5)
const bands = bb(15, 2)

const volNow = volume.value
const volAvg5 = avg(volume, 5)
const volAvg20 = avg(volume, 20)
const momentum = percentChange(close, 3)
const momentum5 = percentChange(close, 5)

const trendUp = fast > mid && mid > slow
const trendDown = fast < mid && mid < slow

let go = "none"

// RSI EXTREMO — señal rápida
if (r < 25) go = "buy"
if (r > 75) go = "sell"

// MICRO-REVERSAL — RSI rebota desde extremo
if (r.prev(1) < 20 && r > 25 && momentum > 0) go = "buy"
if (r.prev(1) > 80 && r < 75 && momentum < 0) go = "sell"

// EMA CROSS rápido con confirmación
if (crossover(fast, mid) && r < 55 && r14 < 50) go = "buy"
if (crossunder(fast, mid) && r > 45 && r14 > 50) go = "sell"

// BB SQUEEZE + momentum
if (price < bands.lower && momentum5 < -0.15) go = "buy"
if (price > bands.upper && momentum5 > 0.15) go = "sell"

// MACD cross con volumen
if (crossover(m.line, m.signal) && volNow > volAvg5) go = "buy"
if (crossunder(m.line, m.signal) && volNow > volAvg5) go = "sell"

// FILTRO: no operar contra tendencia fuerte
if (go === "buy" && trendDown && r > 40) go = "none"
if (go === "sell" && trendUp && r < 60) go = "none"

log("⚡ RSI7:" + r.toFixed(0) + " EMA:" + (trendUp ? "↑" : trendDown ? "↓" : "→") + " Mom:" + momentum.toFixed(2) + "% Vol:" + (volNow > volAvg20 * 1.3 ? "🔥" : "·"))

if (go === "buy") {
  log("🟢 SNIPER BUY — RSI:" + r.toFixed(0) + " Price:$" + price.toFixed(2))
  buy()
}
if (go === "sell") {
  log("🔴 SNIPER SELL — RSI:" + r.toFixed(0) + " Price:$" + price.toFixed(2))
  sell()
}`,
        createdAt: new Date().toISOString(),
      },
    ];

    const updated = [...userOnly, ...defaults];
    saveJSON(STORAGE_KEYS.STRATEGIES, updated);
    set({ strategies: updated });
  },

  addStrategy: (strategy) => {
    const newStrat = { ...strategy, id: Date.now().toString(36), createdAt: new Date().toISOString() };
    const updated = [...get().strategies, newStrat];
    saveJSON(STORAGE_KEYS.STRATEGIES, updated);
    set({ strategies: updated });
    return newStrat;
  },

  removeStrategy: (id) => {
    const updated = get().strategies.filter(s => s.id !== id);
    saveJSON(STORAGE_KEYS.STRATEGIES, updated);
    set({ strategies: updated });
  },

  // ─── AI ───
  aiMessages: [],
  aiLoading: false,

  addAiMessage: (msg) => set({ aiMessages: [...get().aiMessages, msg] }),
  setAiLoading: (loading) => set({ aiLoading: loading }),
  clearAiMessages: () => set({ aiMessages: [] }),

  // ─── Settings ───
  settings: loadJSON(STORAGE_KEYS.SETTINGS, {
    theme: 'dark',
    language: 'es',
    notifications: true,
    soundAlerts: true,
    maxRiskPerTrade: 2,
    defaultLeverage: 1,
  }),

  updateSettings: (updates) => {
    const updated = { ...get().settings, ...updates };
    saveJSON(STORAGE_KEYS.SETTINGS, updated);
    set({ settings: updated });
  },

  // ─── UI ───
  sidebarOpen: true,
  aiPanelOpen: false,
  modalOpen: null,

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  toggleAiPanel: () => set({ aiPanelOpen: !get().aiPanelOpen }),
  setModal: (modal) => set({ modalOpen: modal }),
}));

export default useStore;
