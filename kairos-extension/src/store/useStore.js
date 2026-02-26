// Kairos Extension — Zustand Store
// Global state management for the extension popup

import { create } from 'zustand';
import { STORAGE_KEYS, DEFAULT_CHAIN_ID } from '../constants/chains';
import { encrypt, decrypt } from '../services/encryption';
import { createWallet, importFromMnemonic, importFromPrivateKey } from '../services/wallet';
import { getAllBalances } from '../services/blockchain';

const useStore = create((set, get) => ({
  // ── State ──
  screen: 'loading', // loading, welcome, create, create-confirm, import, unlock, dashboard, send, receive, settings, tx-approval, connect-approval
  isUnlocked: false,
  hasVault: false,
  activeAddress: null,
  activeChainId: DEFAULT_CHAIN_ID,
  privateKey: null, // Only in memory
  mnemonic: null, // Only in memory during create flow
  balances: { native: '0', kairos: null, nativeSymbol: 'BNB' },
  transactions: [],
  loading: false,
  error: null,

  // ── Navigation ──
  navigate: (screen) => set({ screen, error: null }),

  // ── Init ──
  initialize: async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VAULT);
      const hasVault = !!stored;
      set({ hasVault, screen: hasVault ? 'unlock' : 'welcome' });
    } catch (e) {
      set({ screen: 'welcome', error: e.message });
    }
  },

  // ── Create Wallet ──
  generateMnemonic: () => {
    const { mnemonic, address, privateKey } = createWallet();
    set({ mnemonic, activeAddress: address, privateKey, screen: 'create-confirm' });
  },

  confirmCreate: async (password) => {
    const { mnemonic, privateKey, activeAddress, activeChainId } = get();
    if (!mnemonic || !password) return;

    set({ loading: true, error: null });
    try {
      const vaultData = JSON.stringify({
        mnemonic,
        accounts: [{ address: activeAddress, privateKey }],
        activeChainId,
        createdAt: Date.now(),
      });

      const encrypted = await encrypt(vaultData, password);
      localStorage.setItem(STORAGE_KEYS.VAULT, encrypted);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET, activeAddress);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAIN, String(activeChainId));

      // Notify background
      try {
        await chrome.runtime.sendMessage({
          type: 'CREATE_VAULT',
          data: { encryptedVault: encrypted, address: activeAddress, decryptedVault: { accounts: [{ address: activeAddress }], activeChainId } },
        });
      } catch { /* popup mode only */ }

      set({
        isUnlocked: true,
        hasVault: true,
        screen: 'dashboard',
        loading: false,
        mnemonic: null, // Clear mnemonic from memory
      });

      // Fetch balances
      get().refreshBalances();
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  // ── Import Wallet ──
  importWallet: async (input, password) => {
    set({ loading: true, error: null });
    try {
      let result;
      if (input.includes(' ')) {
        result = importFromMnemonic(input);
      } else {
        result = importFromPrivateKey(input);
      }

      const { activeChainId } = get();
      const vaultData = JSON.stringify({
        mnemonic: input.includes(' ') ? input.trim().toLowerCase() : null,
        accounts: [{ address: result.address, privateKey: result.privateKey }],
        activeChainId,
        createdAt: Date.now(),
      });

      const encrypted = await encrypt(vaultData, password);
      localStorage.setItem(STORAGE_KEYS.VAULT, encrypted);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET, result.address);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAIN, String(activeChainId));

      try {
        await chrome.runtime.sendMessage({
          type: 'IMPORT_VAULT',
          data: { encryptedVault: encrypted, address: result.address, decryptedVault: { accounts: [{ address: result.address }], activeChainId } },
        });
      } catch { /* popup mode only */ }

      set({
        activeAddress: result.address,
        privateKey: result.privateKey,
        isUnlocked: true,
        hasVault: true,
        screen: 'dashboard',
        loading: false,
      });

      get().refreshBalances();
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  // ── Unlock ──
  unlock: async (password) => {
    set({ loading: true, error: null });
    try {
      const encrypted = localStorage.getItem(STORAGE_KEYS.VAULT);
      if (!encrypted) throw new Error('No vault found');

      const decrypted = await decrypt(encrypted, password);
      const vault = JSON.parse(decrypted);

      const account = vault.accounts[0];
      const chainId = vault.activeChainId || DEFAULT_CHAIN_ID;

      try {
        await chrome.runtime.sendMessage({
          type: 'UNLOCK',
          data: { password },
        });
      } catch { /* popup mode only */ }

      set({
        activeAddress: account.address,
        privateKey: account.privateKey,
        activeChainId: chainId,
        isUnlocked: true,
        screen: 'dashboard',
        loading: false,
      });

      get().refreshBalances();
    } catch (e) {
      set({ loading: false, error: 'Contraseña incorrecta' });
    }
  },

  // ── Lock ──
  lock: () => {
    try {
      chrome.runtime.sendMessage({ type: 'LOCK' });
    } catch { /* popup mode only */ }

    set({
      isUnlocked: false,
      privateKey: null,
      mnemonic: null,
      screen: 'unlock',
      balances: { native: '0', kairos: null, nativeSymbol: 'BNB' },
    });
  },

  // ── Chain Switch ──
  switchChain: async (chainId) => {
    set({ activeChainId: chainId });
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAIN, String(chainId));
    get().refreshBalances();
  },

  // ── Balances ──
  refreshBalances: async () => {
    const { activeChainId, activeAddress } = get();
    if (!activeAddress) return;

    try {
      const balances = await getAllBalances(activeChainId, activeAddress);
      set({ balances });
    } catch (e) {
      console.error('Balance refresh failed:', e);
    }
  },

  // ── Clear All ──
  resetWallet: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    set({
      screen: 'welcome',
      isUnlocked: false,
      hasVault: false,
      activeAddress: null,
      privateKey: null,
      mnemonic: null,
      balances: { native: '0', kairos: null, nativeSymbol: 'BNB' },
    });
  },

  // ── Errors ──
  clearError: () => set({ error: null }),
}));

export default useStore;
