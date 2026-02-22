// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Token Logo Service
//  Real logos from TrustWallet Assets CDN + CoinGecko
//  Supports all major tokens across all chains
// ═══════════════════════════════════════════════════════

import { KAIROS_TOKEN } from '../constants/chains';

// TrustWallet Assets CDN — the best source for token logos
const TRUST_WALLET_CDN = 'https://raw.githubusercontent.com/nicholasVsternique/bsc-token-icons/refs/heads/main/tokens';

// Chain slug for TrustWallet assets
const CHAIN_SLUG = {
  56: 'smartchain',
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  43114: 'avalanchec',
  8453: 'base',
};

// Native currency logos (high quality CDN)
const NATIVE_LOGOS = {
  56: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',    // BNB
  1: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',          // ETH
  137: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',        // POL
  42161: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',      // ETH on Arbitrum
  43114: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans_BG.png', // AVAX
  8453: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',       // ETH on Base
};

// Chain icon logos (for chain selector)
export const CHAIN_LOGOS = {
  56: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  1: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  137: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  42161: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png?v=040',
  43114: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans_BG.png',
  8453: 'https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg',
};

// Known token logos — manually curated for the most popular tokens
// These override any CDN lookups for guaranteed quality
const KNOWN_TOKEN_LOGOS = {
  // BSC (56)
  '0xe9e7cea3dedca5984780bafc599bd69add087d56': 'https://assets.coingecko.com/coins/images/9576/small/BUSD.png',         // BUSD
  '0x55d398326f99059ff775485246999027b3197955': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',        // USDT BSC
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',         // USDC BSC
  '0x2170ed0880ac9a755fd29b2688956bd959f933f8': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',      // ETH BSC
  '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',         // BTCB
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',  // WBNB
  '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82': 'https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png', // CAKE
  '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',  // XRP BSC
  
  // Ethereum (1)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',        // USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',         // USDC
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',    // DAI
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png', // WBTC
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',    // LINK
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',         // UNI
  
  // Polygon (137)
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',        // USDT
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',         // USDC
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',      // WETH
  
  // Arbitrum (42161)
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',        // USDT
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',         // USDC
  '0x912ce59144191c1204e64559fe8253a0e49e6548': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png?v=040',              // ARB token
  
  // Avalanche (43114)
  '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',        // USDT
  '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',         // USDC
  
  // Base (8453)
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',         // USDC
};

// Cache for failed logo URLs (to avoid retrying)
const failedLogos = new Set();
const logoCache = new Map();

/**
 * Get the logo URL for a token
 * Priority: KAIROS logo → Known logos → TrustWallet CDN → Fallback
 */
export function getTokenLogoUrl(token, chainId) {
  if (!token) return null;
  
  // KAIROS token — always use the dedicated token logo (gold coin)
  if (token.address?.toLowerCase() === KAIROS_TOKEN.address.toLowerCase()) {
    return '/icons/kairos-token-128.png';
  }

  // If token has its own logoURI
  if (token.logoURI) return token.logoURI;

  const address = token.address?.toLowerCase();
  if (!address) return null;
  
  // Check cache
  if (logoCache.has(address)) return logoCache.get(address);

  // Check known logos
  if (KNOWN_TOKEN_LOGOS[address]) {
    logoCache.set(address, KNOWN_TOKEN_LOGOS[address]);
    return KNOWN_TOKEN_LOGOS[address];
  }

  // Try TrustWallet CDN
  const slug = CHAIN_SLUG[chainId];
  if (slug) {
    const url = `${TRUST_WALLET_CDN}/${address}/logo.png`;
    logoCache.set(address, url);
    return url;
  }

  return null;
}

/**
 * Get native currency logo URL
 */
export function getNativeLogoUrl(chainId) {
  return NATIVE_LOGOS[chainId] || null;
}

/**
 * Get chain logo URL
 */
export function getChainLogoUrl(chainId) {
  return CHAIN_LOGOS[chainId] || null;
}

/**
 * Mark a logo URL as failed (will show fallback next time)
 */
export function markLogoFailed(url) {
  failedLogos.add(url);
}

/**
 * Check if a logo has failed before
 */
export function hasLogoFailed(url) {
  return failedLogos.has(url);
}
