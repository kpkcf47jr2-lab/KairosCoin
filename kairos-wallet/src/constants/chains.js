// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Multi-Chain Configuration
//  Superior to MetaMask: More chains, better defaults
// ═══════════════════════════════════════════════════════

export const CHAINS = {
  // BNB Smart Chain (Primary — Kairos home chain)
  56: {
    id: 56,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org',
      'https://bsc-dataseed3.binance.org',
      'https://bsc-dataseed4.binance.org',
    ],
    blockExplorerUrl: 'https://bscscan.com',
    blockExplorerApiUrl: 'https://api.bscscan.com/api',
    color: '#F0B90B',
    icon: '⛓️',
    isDefault: true,
    dexRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap V2
    wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
  },
  // Ethereum Mainnet
  1: {
    id: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
    ],
    blockExplorerUrl: 'https://etherscan.io',
    blockExplorerApiUrl: 'https://api.etherscan.io/api',
    color: '#627EEA',
    icon: '💎',
    dexRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
    wrappedNative: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  },
  // Polygon
  137: {
    id: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon.llamarpc.com',
    ],
    blockExplorerUrl: 'https://polygonscan.com',
    blockExplorerApiUrl: 'https://api.polygonscan.com/api',
    color: '#8247E5',
    icon: '🟣',
    dexRouter: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    wrappedNative: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  },
  // Arbitrum One
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.llamarpc.com',
    ],
    blockExplorerUrl: 'https://arbiscan.io',
    blockExplorerApiUrl: 'https://api.arbiscan.io/api',
    color: '#28A0F0',
    icon: '🔵',
    dexRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
    wrappedNative: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
  },
  // Avalanche C-Chain
  43114: {
    id: 43114,
    name: 'Avalanche',
    shortName: 'AVAX',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche',
      'https://avalanche.public-rpc.com',
    ],
    blockExplorerUrl: 'https://snowtrace.io',
    blockExplorerApiUrl: 'https://api.snowscan.xyz/api',
    color: '#E84142',
    icon: '🔺',
    dexRouter: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', // Trader Joe
    wrappedNative: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
  },
  // Base
  8453: {
    id: 8453,
    name: 'Base',
    shortName: 'BASE',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
    ],
    blockExplorerUrl: 'https://basescan.org',
    blockExplorerApiUrl: 'https://api.basescan.org/api',
    color: '#0052FF',
    icon: '🔷',
    dexRouter: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86', // BaseSwap
    wrappedNative: '0x4200000000000000000000000000000000000006', // WETH
  },
};

export const DEFAULT_CHAIN_ID = 56;

export const CHAIN_ORDER = [56, 1, 137, 42161, 43114, 8453];

// ERC-20 ABI fragments we need
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

// Known KAIROS token addresses per chain
export const KAIROS_ADDRESSES = {
  56: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',     // BSC
  8453: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',   // Base
  42161: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',  // Arbitrum
  137: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9',     // Polygon
};

// KAIROS token on BSC (primary)
export const KAIROS_TOKEN = {
  address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  name: 'KairosCoin',
  symbol: 'KAIROS',
  decimals: 18,
  chainId: 56,
  logoURI: '/icons/kairos-token-128.png',
  isNative: false,
  isStablecoin: true,
};

// Helper: get KAIROS token config for any chain
export function getKairosToken(chainId) {
  const address = KAIROS_ADDRESSES[chainId];
  if (!address) return null;
  return {
    address,
    name: 'KairosCoin',
    symbol: 'KAIROS',
    decimals: 18,
    chainId,
    logoURI: '/icons/kairos-token-128.png',
    isNative: false,
    isStablecoin: true,
  };
}

// Popular tokens per chain (pre-loaded for user convenience)
export const DEFAULT_TOKENS = {
  56: [
    KAIROS_TOKEN,
    { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', name: 'BUSD', symbol: 'BUSD', decimals: 18, chainId: 56 },
    { address: '0x55d398326f99059fF775485246999027B3197955', name: 'Tether USD', symbol: 'USDT', decimals: 18, chainId: 56 },
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', name: 'USD Coin', symbol: 'USDC', decimals: 18, chainId: 56 },
    { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', name: 'Ethereum Token', symbol: 'ETH', decimals: 18, chainId: 56 },
    { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', name: 'BTCB Token', symbol: 'BTCB', decimals: 18, chainId: 56 },
  ],
  1: [
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'Tether USD', symbol: 'USDT', decimals: 6, chainId: 1 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'USD Coin', symbol: 'USDC', decimals: 6, chainId: 1 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'Dai', symbol: 'DAI', decimals: 18, chainId: 1 },
  ],
  137: [
    { address: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9', name: 'KairosCoin', symbol: 'KAIROS', decimals: 18, chainId: 137, logoURI: '/icons/kairos-token-128.png', isStablecoin: true },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', name: 'Tether USD', symbol: 'USDT', decimals: 6, chainId: 137 },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', name: 'USD Coin', symbol: 'USDC', decimals: 6, chainId: 137 },
  ],
  42161: [
    { address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3', name: 'KairosCoin', symbol: 'KAIROS', decimals: 18, chainId: 42161, logoURI: '/icons/kairos-token-128.png', isStablecoin: true },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', name: 'Tether USD', symbol: 'USDT', decimals: 6, chainId: 42161 },
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', name: 'USD Coin', symbol: 'USDC', decimals: 6, chainId: 42161 },
  ],
  43114: [
    { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', name: 'Tether USD', symbol: 'USDT', decimals: 6, chainId: 43114 },
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', name: 'USD Coin', symbol: 'USDC', decimals: 6, chainId: 43114 },
  ],
  8453: [
    { address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3', name: 'KairosCoin', symbol: 'KAIROS', decimals: 18, chainId: 8453, logoURI: '/icons/kairos-token-128.png', isStablecoin: true },
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USD Coin', symbol: 'USDC', decimals: 6, chainId: 8453 },
  ],
};

// Derivation paths
export const DERIVATION_BASE = "m/44'/60'/0'/0";

// Security
export const ENCRYPTION_ALGORITHM = 'AES-GCM';
export const KEY_DERIVATION_ITERATIONS = 600000;
export const SALT_LENGTH = 32;
export const IV_LENGTH = 16;

// Storage keys
export const STORAGE_KEYS = {
  ENCRYPTED_VAULT: 'kairos_vault',
  SETTINGS: 'kairos_settings',
  TOKENS: 'kairos_tokens',
  CONTACTS: 'kairos_contacts',
  TX_HISTORY: 'kairos_tx_history',
  ACTIVE_CHAIN: 'kairos_active_chain',
  ACTIVE_WALLET: 'kairos_active_wallet',
  HAS_WALLET: 'kairos_has_wallet',
  THEME: 'kairos_theme',
};

// Transaction types
export const TX_TYPES = {
  SEND: 'send',
  RECEIVE: 'receive',
  SWAP: 'swap',
  APPROVE: 'approve',
  CONTRACT: 'contract',
};

// Gas presets
export const GAS_PRESETS = {
  slow: { label: 'Económico', multiplier: 0.8, icon: '🐢', waitTime: '~5 min' },
  standard: { label: 'Estándar', multiplier: 1.0, icon: '🚗', waitTime: '~1 min' },
  fast: { label: 'Rápido', multiplier: 1.3, icon: '🚀', waitTime: '~15 seg' },
  instant: { label: 'Instantáneo', multiplier: 1.8, icon: '⚡', waitTime: '~5 seg' },
};

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Kairos Wallet';
