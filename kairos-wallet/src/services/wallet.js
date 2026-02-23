// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Core Wallet Service
//  BIP-39 Mnemonic + BIP-44 HD Derivation
//  Generates and manages decentralized wallets
// ═══════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { encrypt, decrypt } from './encryption';
import { DERIVATION_BASE, STORAGE_KEYS } from '../constants/chains';

/**
 * Generate a new mnemonic phrase (12 or 24 words)
 * Uses ethers.js built-in Mnemonic (no Node.js deps)
 */
export function generateMnemonic(strength = 128) {
  const wordCount = strength === 256 ? 24 : 12;
  const entropy = ethers.randomBytes(strength / 8);
  const mnemonic = ethers.Mnemonic.fromEntropy(entropy);
  return mnemonic.phrase;
}

/**
 * Validate a mnemonic phrase
 */
export function validateMnemonic(mnemonic) {
  try {
    ethers.Mnemonic.fromPhrase(mnemonic.trim().toLowerCase());
    return true;
  } catch {
    return false;
  }
}

/**
 * Derive wallet from mnemonic at specific index
 * Uses ethers.js HDNodeWallet (pure JS, no Node.js streams)
 */
export function deriveWallet(mnemonic, index = 0) {
  const path = `${DERIVATION_BASE}/${index}`;
  const hdWallet = ethers.HDNodeWallet.fromPhrase(
    mnemonic.trim().toLowerCase(),
    undefined,
    path
  );
  
  return {
    address: hdWallet.address,
    privateKey: hdWallet.privateKey,
    publicKey: hdWallet.publicKey,
    path,
    index,
  };
}

/**
 * Import wallet from private key
 * @param {string} privateKey - Hex private key (with or without 0x)
 * @returns {{ address: string, privateKey: string }}
 */
export function importFromPrivateKey(privateKey) {
  const key = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
  const wallet = new ethers.Wallet(key);
  return {
    address: wallet.address,
    privateKey: key,
    publicKey: wallet.signingKey.publicKey,
    path: null,
    index: null,
  };
}

/**
 * Create vault (encrypted storage of mnemonic + accounts)
 */
export async function createVault(mnemonic, password, walletName = 'Wallet Principal') {
  const wallet = deriveWallet(mnemonic, 0);
  
  const vault = {
    version: 1,
    createdAt: Date.now(),
    mnemonic,
    accounts: [
      {
        name: walletName,
        address: wallet.address,
        privateKey: wallet.privateKey,
        path: wallet.path,
        index: 0,
        createdAt: Date.now(),
      }
    ],
    importedAccounts: [],
  };

  const encryptedVault = await encrypt(JSON.stringify(vault), password);
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_VAULT, encryptedVault);
  localStorage.setItem(STORAGE_KEYS.HAS_WALLET, 'true');
  localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET, wallet.address);
  
  return { address: wallet.address, name: walletName };
}

/**
 * Unlock vault with password
 */
export async function unlockVault(password) {
  const encryptedVault = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_VAULT);
  if (!encryptedVault) throw new Error('No wallet found');
  
  try {
    const decrypted = await decrypt(encryptedVault, password);
    return JSON.parse(decrypted);
  } catch (e) {
    throw new Error('Contraseña incorrecta');
  }
}

/**
 * Add a new derived account to the vault
 */
export async function addAccount(password, accountName) {
  const vault = await unlockVault(password);
  const nextIndex = vault.accounts.length;
  const wallet = deriveWallet(vault.mnemonic, nextIndex);
  
  vault.accounts.push({
    name: accountName || `Wallet ${nextIndex + 1}`,
    address: wallet.address,
    privateKey: wallet.privateKey,
    path: wallet.path,
    index: nextIndex,
    createdAt: Date.now(),
  });

  const encryptedVault = await encrypt(JSON.stringify(vault), password);
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_VAULT, encryptedVault);
  
  return { address: wallet.address, name: accountName };
}

/**
 * Import an external account by private key
 */
export async function importAccount(password, privateKey, accountName) {
  const vault = await unlockVault(password);
  const wallet = importFromPrivateKey(privateKey);
  
  // Check for duplicates
  const allAddresses = [
    ...vault.accounts.map(a => a.address.toLowerCase()),
    ...vault.importedAccounts.map(a => a.address.toLowerCase()),
  ];
  
  if (allAddresses.includes(wallet.address.toLowerCase())) {
    throw new Error('Esta wallet ya existe');
  }
  
  vault.importedAccounts.push({
    name: accountName || `Importada ${vault.importedAccounts.length + 1}`,
    address: wallet.address,
    privateKey: wallet.privateKey,
    path: null,
    index: null,
    isImported: true,
    createdAt: Date.now(),
  });

  const encryptedVault = await encrypt(JSON.stringify(vault), password);
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_VAULT, encryptedVault);
  
  return { address: wallet.address, name: accountName };
}

/**
 * Import a watch-only account (address only, no private key)
 * Can view balances and history but cannot sign transactions
 */
export async function importWatchOnly(password, address, accountName) {
  // Validate address
  const checksumAddress = ethers.getAddress(address);
  
  const vault = await unlockVault(password);
  
  // Check for duplicates
  const allAddresses = [
    ...vault.accounts.map(a => a.address.toLowerCase()),
    ...(vault.importedAccounts || []).map(a => a.address.toLowerCase()),
    ...(vault.watchOnlyAccounts || []).map(a => a.address.toLowerCase()),
  ];
  
  if (allAddresses.includes(checksumAddress.toLowerCase())) {
    throw new Error('Esta dirección ya existe');
  }
  
  if (!vault.watchOnlyAccounts) vault.watchOnlyAccounts = [];
  
  vault.watchOnlyAccounts.push({
    name: accountName || `Watch ${vault.watchOnlyAccounts.length + 1}`,
    address: checksumAddress,
    privateKey: null,
    path: null,
    index: null,
    isWatchOnly: true,
    createdAt: Date.now(),
  });

  const encryptedVault = await encrypt(JSON.stringify(vault), password);
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_VAULT, encryptedVault);
  
  return { address: checksumAddress, name: accountName, isWatchOnly: true };
}

/**
 * Remove a watch-only account
 */
export async function removeWatchOnly(password, address) {
  const vault = await unlockVault(password);
  if (!vault.watchOnlyAccounts) return;
  
  vault.watchOnlyAccounts = vault.watchOnlyAccounts.filter(
    a => a.address.toLowerCase() !== address.toLowerCase()
  );

  const encryptedVault = await encrypt(JSON.stringify(vault), password);
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_VAULT, encryptedVault);
}

/**
 * Get signer for transactions
 */
export function getSigner(privateKey, provider) {
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Check if wallet exists
 */
export function hasWallet() {
  return localStorage.getItem(STORAGE_KEYS.HAS_WALLET) === 'true';
}

/**
 * Get active wallet address
 */
export function getActiveWallet() {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_WALLET);
}

/**
 * Set active wallet
 */
export function setActiveWallet(address) {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET, address);
}

/**
 * Change vault password
 * Decrypts with old password, re-encrypts with new password
 */
export async function changePassword(oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
  }
  const vault = await unlockVault(oldPassword);
  const encryptedVault = await encrypt(JSON.stringify(vault), newPassword);
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_VAULT, encryptedVault);
  return true;
}

/**
 * Reset wallet (dangerous!)
 */
export function resetWallet() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

/**
 * Format address for display
 */
export function formatAddress(address, chars = 6) {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address) {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}
