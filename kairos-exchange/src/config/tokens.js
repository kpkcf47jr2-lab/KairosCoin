// ── Native "address" placeholder ──
export const NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// ── KAIROS contract addresses per chain ──
export const KAIROS_ADDRESS = {
  56: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  1: null,
  8453: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  42161: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
  137: '0x9151B8C90B2F8a8DF82426E7E65d00563A75a6C9',
};

// ── Popular tokens per chain ──
const COMMON = {
  KAIROS: (chainId) => KAIROS_ADDRESS[chainId] ? {
    symbol: 'KAIROS',
    name: 'KairosCoin',
    address: KAIROS_ADDRESS[chainId],
    decimals: 18,
    logoURI: '/kairos-token.png',
    isKairos: true,
  } : null,
};

export const TOKENS = {
  // ── BSC ──
  56: [
    { symbol: 'BNB', name: 'BNB', address: NATIVE_ADDRESS, decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/symbol/bnb.png', isNative: true },
    COMMON.KAIROS(56),
    { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/0x55d398326f99059fF775485246999027B3197955.png' },
    { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d.png' },
    { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56.png' },
    { symbol: 'WBNB', name: 'Wrapped BNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/symbol/bnb.png' },
    { symbol: 'BTCB', name: 'Bitcoin BEP20', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c.png' },
    { symbol: 'ETH', name: 'Ethereum', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/0x2170Ed0880ac9A755fd29B2688956BD959F933F8.png' },
    { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82.png' },
    { symbol: 'XRP', name: 'XRP', address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE.png' },
    { symbol: 'DOGE', name: 'Dogecoin', address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', decimals: 8, logoURI: 'https://tokens.pancakeswap.finance/images/0xbA2aE424d960c26247Dd6c32edC70B295c744C43.png' },
    { symbol: 'SOL', name: 'Solana', address: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF', decimals: 18, logoURI: 'https://tokens.pancakeswap.finance/images/0x570A5D26f7765Ecb712C0924E4De545B89fD43dF.png' },
  ].filter(Boolean),

  // ── Ethereum ──
  1: [
    { symbol: 'ETH', name: 'Ether', address: NATIVE_ADDRESS, decimals: 18, logoURI: 'https://tokens.coingecko.com/ethereum/images/279/small/ethereum.png', isNative: true },
    { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, logoURI: 'https://tokens.coingecko.com/tether/images/325/small/Tether.png' },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, logoURI: 'https://tokens.coingecko.com/usd-coin/images/6319/small/usdc.png' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, logoURI: 'https://tokens.coingecko.com/wrapped-bitcoin/images/7598/small/wrapped_bitcoin_wbtc.png' },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, logoURI: 'https://tokens.coingecko.com/ethereum/images/279/small/ethereum.png' },
    { symbol: 'DAI', name: 'Dai', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png' },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg' },
    { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
    { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png' },
    { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png' },
  ],

  // ── Base ──
  8453: [
    { symbol: 'ETH', name: 'Ether', address: NATIVE_ADDRESS, decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', isNative: true },
    COMMON.KAIROS(8453),
    { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol: 'USDbC', name: 'USD Base Coin', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol: 'DAI', name: 'Dai', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png' },
  ].filter(Boolean),

  // ── Arbitrum ──
  42161: [
    { symbol: 'ETH', name: 'Ether', address: NATIVE_ADDRESS, decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', isNative: true },
    COMMON.KAIROS(42161),
    { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
    { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg' },
    { symbol: 'GMX', name: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/18323/small/arbit.png' },
  ].filter(Boolean),

  // ── Polygon ──
  137: [
    { symbol: 'POL', name: 'POL', address: NATIVE_ADDRESS, decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png', isNative: true },
    COMMON.KAIROS(137),
    { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8, logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
    { symbol: 'WMATIC', name: 'Wrapped MATIC', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
    { symbol: 'AAVE', name: 'Aave', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png' },
  ].filter(Boolean),
};

export function getTokenBySymbol(chainId, symbol) {
  return TOKENS[chainId]?.find(t => t.symbol === symbol) || null;
}
export function getTokenByAddress(chainId, address) {
  return TOKENS[chainId]?.find(t => t.address.toLowerCase() === address.toLowerCase()) || null;
}
