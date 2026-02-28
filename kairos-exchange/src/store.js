/* ═══════════════════════════════════════════════════════════
   Kairos Exchange — Zustand Store
   Global state: wallet, chain, swap parameters
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { DEFAULT_CHAIN_ID } from './config/chains';
import { TOKENS, NATIVE_ADDRESS } from './config/tokens';

const defaultTokens = TOKENS[DEFAULT_CHAIN_ID];
const defaultSell = defaultTokens?.find(t => t.isNative) || defaultTokens?.[0];
const defaultBuy = defaultTokens?.find(t => t.isKairos) || defaultTokens?.find(t => t.symbol === 'USDT') || defaultTokens?.[1];

export const useStore = create((set, get) => ({
  // ── Wallet ──
  account: null,
  provider: null,
  chainId: DEFAULT_CHAIN_ID,
  isConnecting: false,
  error: null,

  setAccount: (account) => set({ account }),
  setProvider: (provider) => set({ provider }),
  setChainId: (chainId) => {
    const tokens = TOKENS[chainId] || [];
    const sell = tokens.find(t => t.isNative) || tokens[0];
    const buy = tokens.find(t => t.isKairos) || tokens.find(t => t.symbol === 'USDT') || tokens[1];
    set({ chainId, sellToken: sell, buyToken: buy, sellAmount: '', buyAmount: '', quote: null });
  },
  setConnecting: (isConnecting) => set({ isConnecting }),
  setError: (error) => set({ error }),

  // ── Swap State ──
  sellToken: defaultSell,
  buyToken: defaultBuy,
  sellAmount: '',
  buyAmount: '',
  quote: null,
  isQuoting: false,
  isSwapping: false,
  slippage: 0.5,
  safeMode: true,       // MEV protection (routes through private mempool)
  txHash: null,

  setSellToken: (token) => {
    const { buyToken } = get();
    if (token.address === buyToken?.address) {
      set({ sellToken: token, buyToken: get().sellToken, sellAmount: '', buyAmount: '', quote: null });
    } else {
      set({ sellToken: token, sellAmount: '', buyAmount: '', quote: null });
    }
  },
  setBuyToken: (token) => {
    const { sellToken } = get();
    if (token.address === sellToken?.address) {
      set({ buyToken: token, sellToken: get().buyToken, sellAmount: '', buyAmount: '', quote: null });
    } else {
      set({ buyToken: token, sellAmount: '', buyAmount: '', quote: null });
    }
  },
  setSellAmount: (sellAmount) => set({ sellAmount }),
  setBuyAmount: (buyAmount) => set({ buyAmount }),
  setQuote: (quote) => set({ quote }),
  setIsQuoting: (isQuoting) => set({ isQuoting }),
  setIsSwapping: (isSwapping) => set({ isSwapping }),
  setSlippage: (slippage) => set({ slippage }),
  setSafeMode: (safeMode) => set({ safeMode }),
  setTxHash: (txHash) => set({ txHash }),

  // ── Flip tokens ──
  flipTokens: () => {
    const { sellToken, buyToken, buyAmount } = get();
    set({
      sellToken: buyToken,
      buyToken: sellToken,
      sellAmount: buyAmount || '',
      buyAmount: '',
      quote: null,
    });
  },

  // ── UI State ──
  showTokenSelector: null, // 'sell' | 'buy' | null
  showSettings: false,
  setShowTokenSelector: (side) => set({ showTokenSelector: side }),
  setShowSettings: (show) => set({ showSettings: show }),

  // ── Connect Wallet ──
  connectWallet: async () => {
    if (!window.ethereum) {
      set({ error: 'No wallet detected. Install MetaMask or another EVM wallet.' });
      return;
    }
    set({ isConnecting: true, error: null });
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      set({ account: accounts[0], provider, chainId, isConnecting: false });

      // Set tokens for detected chain
      const tokens = TOKENS[chainId];
      if (tokens) {
        const sell = tokens.find(t => t.isNative) || tokens[0];
        const buy = tokens.find(t => t.isKairos) || tokens.find(t => t.symbol === 'USDT') || tokens[1];
        set({ sellToken: sell, buyToken: buy });
      }

      // Listen for changes
      window.ethereum.on('accountsChanged', (accs) => {
        if (accs.length === 0) set({ account: null, provider: null });
        else set({ account: accs[0] });
      });
      window.ethereum.on('chainChanged', (hex) => {
        const newChain = parseInt(hex, 16);
        get().setChainId(newChain);
      });
    } catch (err) {
      set({ error: err.message, isConnecting: false });
    }
  },

  disconnectWallet: () => set({
    account: null, provider: null, sellAmount: '', buyAmount: '', quote: null, txHash: null,
  }),
}));
