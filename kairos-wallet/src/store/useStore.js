// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Global State Store (Zustand)
//  Manages app state: wallet, balances, chain, settings
// ═══════════════════════════════════════════════════════

import { create } from 'zustand';
import { STORAGE_KEYS, DEFAULT_CHAIN_ID } from '../constants/chains';

export const useStore = create((set, get) => ({
  // ── Auth State ──
  isUnlocked: false,
  vault: null,
  activeAddress: localStorage.getItem(STORAGE_KEYS.ACTIVE_WALLET) || null,
  
  // ── Chain State ──
  activeChainId: parseInt(localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAIN)) || DEFAULT_CHAIN_ID,
  
  // ── Balance State ──
  balances: {},
  tokenPrices: {},
  nativePrice: 0,
  isLoadingBalances: false,
  
  // ── UI State ──
  currentScreen: 'loading',
  navigationStack: [], // full back-stack
  toastMessage: null,
  isBottomSheetOpen: false,
  bottomSheetContent: null,
  tokenDetailData: null, // Token passed to detail screen
  
  // ── Transaction State ──
  pendingTransactions: [],
  recentTransactions: JSON.parse(localStorage.getItem('kairos_recent_tx') || '[]'),
  
  // ── Actions ──
  setUnlocked: (vault, password) => set({ 
    isUnlocked: true, 
    vault, 
    activeAddress: vault.accounts[0]?.address || vault.importedAccounts[0]?.address,
    currentScreen: 'dashboard',
  }),
  
  lock: () => set({ 
    isUnlocked: false, 
    vault: null, 
    currentScreen: 'unlock',
  }),
  
  setActiveAddress: (address) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET, address);
    set({ activeAddress: address });
  },
  
  setActiveChain: (chainId) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAIN, chainId.toString());
    set({ activeChainId: chainId, balances: {}, isLoadingBalances: true });
  },
  
  setBalances: (balances) => set({ balances, isLoadingBalances: false }),
  
  setTokenPrices: (prices) => set({ tokenPrices: prices }),
  
  setNativePrice: (price) => set({ nativePrice: price }),
  
  navigate: (screen) => set(state => {
    // Prevent duplicate consecutive navigation
    if (state.currentScreen === screen) return {};
    // Cap stack at 20 entries to prevent memory leaks
    const stack = [...state.navigationStack, state.currentScreen];
    if (stack.length > 20) stack.splice(0, stack.length - 20);
    return { navigationStack: stack, currentScreen: screen };
  }),
  
  goBack: () => set(state => {
    const stack = [...state.navigationStack];
    const prev = stack.pop() || 'dashboard';
    return { currentScreen: prev, navigationStack: stack };
  }),
  
  showToast: (message, type = 'info') => {
    set({ toastMessage: { message, type, id: Date.now() } });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },
  
  openBottomSheet: (content) => set({ isBottomSheetOpen: true, bottomSheetContent: content }),
  closeBottomSheet: () => set({ isBottomSheetOpen: false, bottomSheetContent: null }),
  
  setTokenDetailData: (token) => set({ tokenDetailData: token }),
  
  addPendingTx: (tx) => set(state => ({ 
    pendingTransactions: [...state.pendingTransactions, tx] 
  })),
  
  resolvePendingTx: (hash, status) => set(state => {
    const resolved = state.pendingTransactions.find(tx => tx.hash === hash);
    const updated = [
      { ...resolved, status },
      ...state.recentTransactions,
    ].slice(0, 50);
    localStorage.setItem('kairos_recent_tx', JSON.stringify(updated));
    return {
      pendingTransactions: state.pendingTransactions.filter(tx => tx.hash !== hash),
      recentTransactions: updated,
    };
  }),
  
  // ── Computed ──
  getActiveAccount: () => {
    const { vault, activeAddress } = get();
    if (!vault) return null;
    const all = [...(vault.accounts || []), ...(vault.importedAccounts || [])];
    return all.find(a => a.address.toLowerCase() === activeAddress?.toLowerCase()) || all[0];
  },
  
  getAllAccounts: () => {
    const { vault } = get();
    if (!vault) return [];
    return [...(vault.accounts || []), ...(vault.importedAccounts || [])];
  },

  getTotalPortfolioValue: () => {
    const { balances, tokenPrices, nativePrice } = get();
    let total = 0;
    
    if (balances.native) {
      total += parseFloat(balances.native.balance || 0) * nativePrice;
    }
    
    if (balances.tokens) {
      for (const token of balances.tokens) {
        if (!token.hasBalance) continue;
        const priceData = tokenPrices[token.address.toLowerCase()];
        const price = priceData?.usd || 0;
        total += parseFloat(token.balance) * price;
      }
    }
    
    return total;
  },
}));
