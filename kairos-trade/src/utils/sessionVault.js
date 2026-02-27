/**
 * sessionVault.js — In-memory private key storage
 * 
 * REPLACES sessionStorage for private keys.
 * Keys live only in JavaScript memory — no browser storage APIs.
 * Automatically cleared when tab closes (garbage collected).
 * Not accessible via DevTools Storage panel or XSS document.cookie tricks.
 */

let _pk = null;

export function setSessionKey(privateKey) {
  _pk = privateKey || null;
}

export function getSessionKey() {
  return _pk;
}

export function clearSessionKey() {
  _pk = null;
}
