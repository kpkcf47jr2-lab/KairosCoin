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
  selectedPair: 'BTCUSDT',
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
