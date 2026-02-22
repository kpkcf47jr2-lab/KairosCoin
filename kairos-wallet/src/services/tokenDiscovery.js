// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Token Auto-Discovery Service
//  Detects ERC-20 tokens via block explorer APIs
//  Stores discovered tokens in localStorage
// ═══════════════════════════════════════════════════════

import { CHAINS, DEFAULT_TOKENS } from '../constants/chains';

const STORAGE_KEY = 'kairos_discovered_tokens';
const DISCOVERY_COOLDOWN = 5 * 60 * 1000; // 5 min cooldown per chain
const lastDiscovery = {};

/** Load discovered tokens from storage */
export function getDiscoveredTokens(chainId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    return all[chainId] || [];
  } catch {
    return [];
  }
}

/** Save discovered tokens */
function saveDiscoveredTokens(chainId, tokens) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[chainId] = tokens;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage full
  }
}

/** Get all known token addresses for a chain (default + discovered) */
function getKnownAddresses(chainId) {
  const defaults = (DEFAULT_TOKENS[chainId] || []).map(t => t.address.toLowerCase());
  const discovered = getDiscoveredTokens(chainId).map(t => t.address.toLowerCase());
  return new Set([...defaults, ...discovered]);
}

/**
 * Discover new tokens by checking ERC-20 transfer history
 * Uses the block explorer tokentx API (same as getTokenTransferHistory)
 * Returns only NEW tokens not already in defaults or previously discovered
 */
export async function discoverTokens(chainId, address) {
  const chain = CHAINS[chainId];
  if (!chain?.blockExplorerApiUrl || !address) return [];

  // Cooldown check
  const key = `${chainId}-${address}`;
  const now = Date.now();
  if (lastDiscovery[key] && (now - lastDiscovery[key]) < DISCOVERY_COOLDOWN) {
    return getDiscoveredTokens(chainId);
  }
  lastDiscovery[key] = now;

  try {
    // Fetch recent token transfers (up to 100)
    const url = `${chain.blockExplorerApiUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return getDiscoveredTokens(chainId);
    }

    const knownAddresses = getKnownAddresses(chainId);
    const seen = new Set();
    const newTokens = [];

    for (const tx of data.result) {
      const addr = tx.contractAddress?.toLowerCase();
      if (!addr || knownAddresses.has(addr) || seen.has(addr)) continue;
      seen.add(addr);

      // Filter out spam/dust tokens with suspicious names
      const name = tx.tokenName || '';
      const symbol = tx.tokenSymbol || '';
      if (isLikelySpam(name, symbol)) continue;

      newTokens.push({
        address: tx.contractAddress,
        name: tx.tokenName || 'Unknown',
        symbol: tx.tokenSymbol || '???',
        decimals: Number(tx.tokenDecimal) || 18,
        chainId,
        discovered: true,
        discoveredAt: now,
      });
    }

    // Merge with existing discovered tokens
    const existing = getDiscoveredTokens(chainId);
    const existingAddrs = new Set(existing.map(t => t.address.toLowerCase()));
    const merged = [
      ...existing,
      ...newTokens.filter(t => !existingAddrs.has(t.address.toLowerCase())),
    ];

    // Cap at 50 discovered tokens per chain
    const capped = merged.slice(0, 50);
    saveDiscoveredTokens(chainId, capped);

    return capped;
  } catch (err) {
    console.error('Token discovery failed:', err);
    return getDiscoveredTokens(chainId);
  }
}

/** Remove a discovered token (user dismissed it) */
export function removeDiscoveredToken(chainId, tokenAddress) {
  const tokens = getDiscoveredTokens(chainId);
  const filtered = tokens.filter(
    t => t.address.toLowerCase() !== tokenAddress.toLowerCase()
  );
  saveDiscoveredTokens(chainId, filtered);
  return filtered;
}

/** Clear all discovered tokens */
export function clearDiscoveredTokens(chainId) {
  saveDiscoveredTokens(chainId, []);
}

/** Heuristics to filter spam/scam tokens */
function isLikelySpam(name, symbol) {
  const combined = `${name} ${symbol}`.toLowerCase();
  
  // Common spam patterns
  const spamPatterns = [
    /https?:\/\//,              // URLs in name
    /\.com|\.io|\.org|\.net/,   // Domains in name
    /visit|claim|airdrop/i,     // Phishing words
    /^\$/,                      // Starts with $
    /\$\d/,                     // Contains $ followed by number
    /free|bonus|reward/i,       // Too-good-to-be-true
    /\.eth$/,                   // ENS names as token names
  ];

  return spamPatterns.some(p => p.test(combined));
}
