// Kairos Extension — Wallet Service
// BIP-39 Mnemonic + BIP-44 HD Wallet derivation using ethers.js v6

import { ethers } from 'ethers';

const HD_PATH = "m/44'/60'/0'/0/0";

/**
 * Generate a new 12-word mnemonic
 * @returns {{ mnemonic: string, address: string, privateKey: string }}
 */
export function createWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    mnemonic: wallet.mnemonic.phrase,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Import from mnemonic phrase
 * @param {string} mnemonic - 12/24 word BIP-39 phrase
 * @returns {{ address: string, privateKey: string }}
 */
export function importFromMnemonic(mnemonic) {
  const trimmed = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!ethers.Mnemonic.isValidMnemonic(trimmed)) {
    throw new Error('Invalid mnemonic phrase');
  }
  const wallet = ethers.HDNodeWallet.fromPhrase(trimmed, '', HD_PATH);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Import from private key
 * @param {string} privateKey - Hex private key
 * @returns {{ address: string, privateKey: string }}
 */
export function importFromPrivateKey(privateKey) {
  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(key);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Create signer from private key + provider
 * @param {string} privateKey
 * @param {import('ethers').JsonRpcProvider} provider
 * @returns {import('ethers').Wallet}
 */
export function getSigner(privateKey, provider) {
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Validate mnemonic
 * @param {string} mnemonic
 * @returns {boolean}
 */
export function isValidMnemonic(mnemonic) {
  try {
    return ethers.Mnemonic.isValidMnemonic(mnemonic.trim().toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Validate Ethereum address
 * @param {string} address
 * @returns {boolean}
 */
export function isValidAddress(address) {
  return ethers.isAddress(address);
}

/**
 * Generate multiple accounts from same mnemonic
 * @param {string} mnemonic
 * @param {number} count
 * @returns {Array<{ address: string, privateKey: string, index: number }>}
 */
export function deriveAccounts(mnemonic, count = 5) {
  const accounts = [];
  for (let i = 0; i < count; i++) {
    const path = `m/44'/60'/0'/0/${i}`;
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, '', path);
    accounts.push({
      address: wallet.address,
      privateKey: wallet.privateKey,
      index: i,
    });
  }
  return accounts;
}
