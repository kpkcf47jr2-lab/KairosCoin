// Kairos Trade — Pair Conversion Utility
// KAIROS is a USD-pegged stablecoin (1 KAIROS = 1 USD)
// Display: BTCKAIROS, ETHKAIROS, etc.
// API (Binance): BTCUSDT, ETHUSDT, etc.

const QUOTE_DISPLAY = 'KAIROS';
const QUOTE_API = 'USDT';

/**
 * Convert display pair (BTCKAIROS) → API pair (BTCUSDT)
 */
export function toApiPair(displayPair) {
  if (!displayPair) return 'BTCUSDT';
  if (displayPair.endsWith(QUOTE_DISPLAY)) {
    return displayPair.replace(QUOTE_DISPLAY, QUOTE_API);
  }
  // Already an API pair or unknown format
  return displayPair;
}

/**
 * Convert API pair (BTCUSDT) → display pair (BTCKAIROS)
 */
export function toDisplayPair(apiPair) {
  if (!apiPair) return 'BTCKAIROS';
  if (apiPair.endsWith(QUOTE_API)) {
    return apiPair.replace(QUOTE_API, QUOTE_DISPLAY);
  }
  return apiPair;
}

/**
 * Get the base asset from a display pair
 * e.g. BTCKAIROS → BTC, ETHKAIROS → ETH
 */
export function getBase(pair) {
  if (!pair) return 'BTC';
  if (pair.endsWith(QUOTE_DISPLAY)) return pair.replace(QUOTE_DISPLAY, '');
  if (pair.endsWith(QUOTE_API)) return pair.replace(QUOTE_API, '');
  return pair.slice(0, 3);
}

/**
 * Format pair for display with separator
 * e.g. BTCKAIROS → BTC / KAIROS
 */
export function formatPair(pair) {
  const base = getBase(pair);
  return `${base} / ${QUOTE_DISPLAY}`;
}

/**
 * Check if pair is a KAIROS pair
 */
export function isKairosPair(pair) {
  return pair?.endsWith(QUOTE_DISPLAY);
}

export const QUOTE = QUOTE_DISPLAY;
