// Kairos Extension — Chain Constants
// Supported chains with RPC, native tokens, KAIROS addresses

export const CHAINS = {
  56: {
    id: 56,
    hexId: '0x38',
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    symbol: 'BNB',
    decimals: 18,
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.bscscan.com/api',
    icon: '🟡',
    color: '#F0B90B',
    kairos: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  },
  137: {
    id: 137,
    hexId: '0x89',
    name: 'Polygon',
    shortName: 'Polygon',
    symbol: 'POL',
    decimals: 18,
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    explorerApi: 'https://api.polygonscan.com/api',
    icon: '🟣',
    color: '#8247E5',
    kairos: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9',
  },
  8453: {
    id: 8453,
    hexId: '0x2105',
    name: 'Base',
    shortName: 'Base',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    explorerApi: 'https://api.basescan.org/api',
    icon: '🔵',
    color: '#0052FF',
    kairos: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  },
  42161: {
    id: 42161,
    hexId: '0xa4b1',
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    explorerApi: 'https://api.arbiscan.io/api',
    icon: '🔷',
    color: '#28A0F0',
    kairos: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  },
  1: {
    id: 1,
    hexId: '0x1',
    name: 'Ethereum',
    shortName: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://cloudflare-eth.com',
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io/api',
    icon: '💠',
    color: '#627EEA',
    kairos: null, // Not deployed yet
  },
  43114: {
    id: 43114,
    hexId: '0xa86a',
    name: 'Avalanche C-Chain',
    shortName: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    explorerApi: 'https://api.snowtrace.io/api',
    icon: '🔺',
    color: '#E84142',
    kairos: null,
  },
};

export const DEFAULT_CHAIN_ID = 56;
export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);

export const STORAGE_KEYS = {
  VAULT: 'kairos_ext_vault',
  ACTIVE_CHAIN: 'kairos_ext_chain',
  ACTIVE_WALLET: 'kairos_ext_wallet',
  SETTINGS: 'kairos_ext_settings',
  CONTACTS: 'kairos_ext_contacts',
  RECENT_TX: 'kairos_ext_recent_tx',
};

// ERC-20 minimal ABI
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

// KAIROS token info
export const KAIROS_TOKEN = {
  symbol: 'KAIROS',
  name: 'KairosCoin',
  decimals: 18,
  isStablecoin: true,
  logo: null, // Will use SVG
};

// Encryption constants
export const PBKDF2_ITERATIONS = 600000;
export const IV_LENGTH = 12;
export const SALT_LENGTH = 16;
