/* ═══════════════════════════════════════════════════════════
   Kairos Exchange — Transaction History Service
   Stores swap history in localStorage with chain awareness
   ═══════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'kairos-exchange-history';
const MAX_HISTORY = 200;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {}
}

/**
 * Add a transaction to history
 */
export function addTransaction(tx) {
  const history = loadHistory();
  history.unshift({
    id: tx.hash || `tx-${Date.now()}`,
    hash: tx.hash,
    type: tx.type || 'swap',
    status: tx.status || 'pending',
    chainId: tx.chainId,
    timestamp: Date.now(),
    sellToken: tx.sellToken,
    buyToken: tx.buyToken,
    sellAmount: tx.sellAmount,
    buyAmount: tx.buyAmount,
    sellSymbol: tx.sellSymbol,
    buySymbol: tx.buySymbol,
    route: tx.route || [],
    gasUsed: tx.gasUsed,
    gasCostUsd: tx.gasCostUsd,
    fee: tx.fee || '0.15%',
    explorerUrl: tx.explorerUrl,
    account: tx.account,
  });
  saveHistory(history);
  return history;
}

/**
 * Update a transaction status
 */
export function updateTransaction(hash, updates) {
  const history = loadHistory();
  const idx = history.findIndex(tx => tx.hash === hash);
  if (idx >= 0) {
    history[idx] = { ...history[idx], ...updates };
    saveHistory(history);
  }
  return history;
}

/**
 * Get all transactions, optionally filtered
 */
export function getTransactions({ account, chainId, type, status } = {}) {
  let history = loadHistory();
  if (account) history = history.filter(tx => tx.account?.toLowerCase() === account.toLowerCase());
  if (chainId) history = history.filter(tx => tx.chainId === chainId);
  if (type && type !== 'all') history = history.filter(tx => tx.type === type);
  if (status) history = history.filter(tx => tx.status === status);
  return history;
}

/**
 * Clear all history
 */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get recent tokens used (for token selector)
 */
const RECENT_TOKENS_KEY = 'kairos-exchange-recent-tokens';
const MAX_RECENT = 8;

export function addRecentToken(chainId, token) {
  try {
    const all = JSON.parse(localStorage.getItem(RECENT_TOKENS_KEY) || '{}');
    const chain = all[chainId] || [];
    // Remove if already exists, add to front
    const filtered = chain.filter(t => t.address?.toLowerCase() !== token.address?.toLowerCase());
    filtered.unshift({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      logoURI: token.logoURI,
      isKairos: token.isKairos,
    });
    all[chainId] = filtered.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_TOKENS_KEY, JSON.stringify(all));
  } catch {}
}

export function getRecentTokens(chainId) {
  try {
    const all = JSON.parse(localStorage.getItem(RECENT_TOKENS_KEY) || '{}');
    return all[chainId] || [];
  } catch { return []; }
}

/**
 * Custom imported tokens
 */
const CUSTOM_TOKENS_KEY = 'kairos-exchange-custom-tokens';

export function addCustomToken(chainId, token) {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_TOKENS_KEY) || '{}');
    const chain = all[chainId] || [];
    if (chain.find(t => t.address?.toLowerCase() === token.address?.toLowerCase())) return;
    chain.push({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      logoURI: token.logoURI,
      isCustom: true,
    });
    all[chainId] = chain;
    localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(all));
  } catch {}
}

export function getCustomTokens(chainId) {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_TOKENS_KEY) || '{}');
    return all[chainId] || [];
  } catch { return []; }
}

export function removeCustomToken(chainId, address) {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_TOKENS_KEY) || '{}');
    const chain = all[chainId] || [];
    all[chainId] = chain.filter(t => t.address?.toLowerCase() !== address.toLowerCase());
    localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(all));
  } catch {}
}

/**
 * Referral system
 */
const REFERRAL_KEY = 'kairos-exchange-referral';

export function getReferralCode(account) {
  if (!account) return null;
  // Generate deterministic referral code from address
  return `KX-${account.slice(2, 8).toUpperCase()}`;
}

export function getReferralStats(account) {
  try {
    const all = JSON.parse(localStorage.getItem(REFERRAL_KEY) || '{}');
    return all[account?.toLowerCase()] || { referrals: 0, earnings: 0 };
  } catch { return { referrals: 0, earnings: 0 }; }
}

export function setReferredBy(code) {
  try {
    localStorage.setItem('kairos-exchange-referred-by', code);
  } catch {}
}

export function getReferredBy() {
  try {
    return localStorage.getItem('kairos-exchange-referred-by');
  } catch { return null; }
}
