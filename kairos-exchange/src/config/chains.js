// ── Supported Chains ──
export const CHAINS = {
  56: {
    id: 56,
    name: 'BNB Chain',
    shortName: 'BSC',
    icon: '🟡',
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    color: '#F0B90B',
    wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    // 0x API chain name
    zeroXChain: 'bsc',
  },
  1: {
    id: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    icon: '🔷',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#627EEA',
    wrappedNative: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    zeroXChain: 'ethereum',
  },
  8453: {
    id: 8453,
    name: 'Base',
    shortName: 'Base',
    icon: '🔵',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#0052FF',
    wrappedNative: '0x4200000000000000000000000000000000000006', // WETH
    zeroXChain: 'base',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    icon: '🔹',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: '#28A0F0',
    wrappedNative: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    zeroXChain: 'arbitrum',
  },
  137: {
    id: 137,
    name: 'Polygon',
    shortName: 'POL',
    icon: '🟣',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    color: '#8247E5',
    wrappedNative: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WPOL
    zeroXChain: 'polygon',
  },
};

export const DEFAULT_CHAIN_ID = 56;
export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);
