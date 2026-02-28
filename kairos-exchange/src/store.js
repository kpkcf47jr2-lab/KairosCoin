/* ═══════════════════════════════════════════════════════════
   Kairos Exchange — Zustand Store (Full)
   Global state: wallet, chain, swap, history, portfolio, i18n
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { DEFAULT_CHAIN_ID, CHAINS } from './config/chains';
import { TOKENS, NATIVE_ADDRESS } from './config/tokens';
import { connectInjected, connectKairosWallet, setupWalletListeners, switchChain } from './services/wallet';
import { getCustomTokens } from './services/history';

const defaultTokens = TOKENS[DEFAULT_CHAIN_ID];
const defaultSell = defaultTokens?.find(t => t.isNative) || defaultTokens?.[0];
const defaultBuy = defaultTokens?.find(t => t.isKairos) || defaultTokens?.find(t => t.symbol === 'USDT') || defaultTokens?.[1];

export const useStore = create((set, get) => ({
  // ── Wallet ──
  account: null,
  provider: null,
  chainId: DEFAULT_CHAIN_ID,
  isConnecting: false,
  walletId: null,
  error: null,

  setAccount: (account) => set({ account }),
  setProvider: (provider) => set({ provider }),
  setChainId: async (chainId) => {
    const tokens = [...(TOKENS[chainId] || []), ...getCustomTokens(chainId)];
    const sell = tokens.find(t => t.isNative) || tokens[0];
    const buy = tokens.find(t => t.isKairos) || tokens.find(t => t.symbol === 'USDT') || tokens[1];
    set({ chainId, sellToken: sell, buyToken: buy, sellAmount: '', buyAmount: '', quote: null });
    // Auto switch chain on wallet
    const chain = CHAINS[chainId];
    if (get().account && chain) {
      try { await switchChain(chainId, chain); } catch {}
    }
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
  safeMode: true,
  txHash: null,
  txStatus: null, // null | 'pending' | 'confirming' | 'confirmed' | 'failed'

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
  setTxStatus: (txStatus) => set({ txStatus }),

  flipTokens: () => {
    const { sellToken, buyToken, buyAmount } = get();
    set({
      sellToken: buyToken, buyToken: sellToken,
      sellAmount: buyAmount || '', buyAmount: '', quote: null,
    });
  },

  // ── UI State ──
  showTokenSelector: null,
  showSettings: false,
  showWalletModal: false,
  showTxModal: false,
  setShowTokenSelector: (side) => set({ showTokenSelector: side }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowWalletModal: (show) => set({ showWalletModal: show }),
  setShowTxModal: (show) => set({ showTxModal: show }),

  // ── Connect Wallet (unified) ──
  connectWallet: async (walletOption) => {
    set({ isConnecting: true, error: null });
    try {
      let result;
      if (!walletOption || walletOption.type === 'injected') {
        result = await connectInjected();
      } else if (walletOption.id === 'kairos') {
        result = await connectKairosWallet();
        if (!result) { set({ isConnecting: false }); return; }
      } else if (walletOption.type === 'walletconnect') {
        result = await connectInjected();
      } else {
        result = await connectInjected();
      }

      const { account, provider, chainId, walletId } = result;
      set({ account, provider, chainId, walletId: walletId || walletOption?.id, isConnecting: false, showWalletModal: false });

      const tokens = TOKENS[chainId];
      if (tokens) {
        const sell = tokens.find(t => t.isNative) || tokens[0];
        const buy = tokens.find(t => t.isKairos) || tokens.find(t => t.symbol === 'USDT') || tokens[1];
        set({ sellToken: sell, buyToken: buy });
      }

      setupWalletListeners(
        (account) => set({ account }),
        (newChainId) => get().setChainId(newChainId),
        () => set({ account: null, provider: null, walletId: null }),
      );
    } catch (err) {
      set({ error: err.message, isConnecting: false });
    }
  },

  disconnectWallet: () => set({
    account: null, provider: null, walletId: null,
    sellAmount: '', buyAmount: '', quote: null, txHash: null, txStatus: null,
  }),

  // ── Language ──
  language: localStorage.getItem('kairos-lang') || 'es',
  setLanguage: (lang) => {
    localStorage.setItem('kairos-lang', lang);
    set({ language: lang });
  },
}));
