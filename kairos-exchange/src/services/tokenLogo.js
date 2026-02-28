/**
 * Dynamic Token Logo Resolver
 * Fetches token logos by contract address from multiple sources
 * Falls back through: known logos → Trust Wallet → BscScan → CoinGecko → generated avatar
 */

// ── Chain name mapping for Trust Wallet assets ──
const TRUST_WALLET_CHAINS = {
  56: 'smartchain',
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  8453: 'base',
};

// ── Known KAIROS addresses (always use local logo) ──
const KAIROS_ADDRESSES = [
  '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9',
].map(a => a.toLowerCase());

const KAIROS_LOGO = '/kairos-token.png';

// ── In-memory cache ──
const logoCache = new Map();

/**
 * Get token logo URL by chain + address
 * Tries multiple sources in order of reliability
 */
export async function getTokenLogoURL(chainId, address) {
  if (!address) return null;
  const key = `${chainId}-${address.toLowerCase()}`;

  // Check cache
  if (logoCache.has(key)) return logoCache.get(key);

  // KAIROS always uses local logo
  if (KAIROS_ADDRESSES.includes(address.toLowerCase())) {
    logoCache.set(key, KAIROS_LOGO);
    return KAIROS_LOGO;
  }

  // Try sources in order
  const sources = buildSourceURLs(chainId, address);

  for (const url of sources) {
    try {
      const ok = await checkImage(url);
      if (ok) {
        logoCache.set(key, url);
        return url;
      }
    } catch {
      // Continue to next source
    }
  }

  // No logo found — return null (component will show fallback initial)
  logoCache.set(key, null);
  return null;
}

/**
 * Synchronous version — returns cached value or null
 * Use this in render, then call async version in useEffect
 */
export function getTokenLogoSync(chainId, address) {
  if (!address) return null;
  if (KAIROS_ADDRESSES.includes(address.toLowerCase())) return KAIROS_LOGO;
  const key = `${chainId}-${address.toLowerCase()}`;
  return logoCache.get(key) ?? null;
}

/**
 * Build ordered list of logo source URLs to try
 */
function buildSourceURLs(chainId, address) {
  const urls = [];
  const chain = TRUST_WALLET_CHAINS[chainId];
  const checksumAddr = address; // Keep original case

  // 1. Trust Wallet assets (most reliable for popular tokens)
  if (chain) {
    urls.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${checksumAddr}/logo.png`);
  }

  // 2. PancakeSwap token images (BSC)
  if (chainId === 56) {
    urls.push(`https://tokens.pancakeswap.finance/images/${checksumAddr}.png`);
  }

  // 3. 1inch token logos
  urls.push(`https://tokens.1inch.io/v1.1/${chainId}/${address.toLowerCase()}.png`);

  // 4. Sushi token list
  urls.push(`https://raw.githubusercontent.com/sushiswap/list/master/logos/token-logos/network/${chainId}/${checksumAddr}.jpg`);

  return urls;
}

/**
 * Check if an image URL is valid (returns true if loadable)
 */
function checkImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    // Timeout after 3s
    const timer = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, 3000);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

/**
 * Generate a deterministic color from an address for fallback avatars
 */
export function getAddressColor(address) {
  if (!address) return '#3B82F6';
  const hash = address.slice(2, 8);
  const r = parseInt(hash.slice(0, 2), 16);
  const g = parseInt(hash.slice(2, 4), 16);
  const b = parseInt(hash.slice(4, 6), 16);
  // Ensure minimum brightness
  const bright = Math.max(r, g, b) < 100 ? 80 : 0;
  return `rgb(${r + bright}, ${g + bright}, ${b + bright})`;
}

/**
 * Preload logos for a list of tokens
 * Call this when chain changes to warm the cache
 */
export async function preloadTokenLogos(chainId, tokens) {
  const promises = tokens
    .filter(t => t.address && !KAIROS_ADDRESSES.includes(t.address.toLowerCase()))
    .filter(t => !t.logoURI) // Only preload tokens without known logos
    .map(t => getTokenLogoURL(chainId, t.address));
  await Promise.allSettled(promises);
}
