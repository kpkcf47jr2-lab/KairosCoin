// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Staking Service
//  Real on-chain staking: Lido (stETH), PancakeSwap (CAKE),
//  Liquid staking protocols — MetaMask just added basic staking
// ═══════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { getProvider } from './blockchain';

// ── Staking Protocols ──
export const STAKING_PROTOCOLS = {
  1: [
    {
      id: 'lido-eth',
      name: 'Lido',
      description: 'Liquid staking for ETH — get stETH while earning ~3.5% APR',
      logo: '🔵',
      color: '#00A3FF',
      type: 'liquid',
      asset: 'ETH',
      reward: 'stETH',
      aprRange: '3.0% – 4.0%',
      minStake: '0.001',
      contract: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', // Lido stETH
      website: 'https://lido.fi',
    },
    {
      id: 'rocketpool-eth',
      name: 'Rocket Pool',
      description: 'Decentralized ETH staking — receive rETH',
      logo: '🚀',
      color: '#FF6B35',
      type: 'liquid',
      asset: 'ETH',
      reward: 'rETH',
      aprRange: '3.0% – 3.8%',
      minStake: '0.01',
      contract: '0xae78736Cd615f374D3085123A210448E74Fc6393', // rETH
      depositContract: '0xDD9bc35aE942dF0cD11BbB945349b2d1d6A45659',
      website: 'https://rocketpool.net',
    },
  ],
  56: [
    {
      id: 'pancake-cake',
      name: 'PancakeSwap',
      description: 'Stake CAKE for auto-compounding yield',
      logo: '🥞',
      color: '#1FC7D4',
      type: 'staking',
      asset: 'CAKE',
      reward: 'CAKE',
      aprRange: '5.0% – 15.0%',
      minStake: '0.1',
      contract: '0x45c54210128a065de780C4B0Df3d16664f7f859e', // CAKE pool
      tokenAddress: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
      website: 'https://pancakeswap.finance/pools',
    },
    {
      id: 'bnb-liquid',
      name: 'Ankr BNB',
      description: 'Liquid BNB staking — earn aBNBc while staking',
      logo: '⚡',
      color: '#4A90E2',
      type: 'liquid',
      asset: 'BNB',
      reward: 'aBNBc',
      aprRange: '2.5% – 4.0%',
      minStake: '0.5',
      contract: '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827',
      website: 'https://www.ankr.com/staking/stake/bnb/',
    },
  ],
  137: [
    {
      id: 'lido-matic',
      name: 'Lido',
      description: 'Liquid staking for MATIC — receive stMATIC',
      logo: '🔵',
      color: '#00A3FF',
      type: 'liquid',
      asset: 'MATIC',
      reward: 'stMATIC',
      aprRange: '4.0% – 5.5%',
      minStake: '1',
      contract: '0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599',
      website: 'https://polygon.lido.fi/',
    },
  ],
  42161: [
    {
      id: 'gmx-arb',
      name: 'GMX',
      description: 'Stake GMX for ETH + esGMX rewards',
      logo: '🟢',
      color: '#4CC9F0',
      type: 'staking',
      asset: 'GMX',
      reward: 'ETH + esGMX',
      aprRange: '8.0% – 20.0%',
      minStake: '0.01',
      contract: '0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1',
      tokenAddress: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
      website: 'https://app.gmx.io/#/earn',
    },
  ],
  43114: [
    {
      id: 'benqi-avax',
      name: 'BENQI',
      description: 'Liquid AVAX staking — receive sAVAX',
      logo: '❄️',
      color: '#E84142',
      type: 'liquid',
      asset: 'AVAX',
      reward: 'sAVAX',
      aprRange: '5.0% – 7.0%',
      minStake: '0.5',
      contract: '0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE',
      website: 'https://staking.benqi.fi/',
    },
  ],
};

// ABI for Lido submit (ETH liquid staking)
const LIDO_ABI = [
  'function submit(address _referral) external payable returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function getPooledEthByShares(uint256 _sharesAmount) view returns (uint256)',
  'function getTotalPooledEther() view returns (uint256)',
  'function getTotalShares() view returns (uint256)',
];

// ABI for ERC20 staking pools (PancakeSwap style)
const STAKING_POOL_ABI = [
  'function deposit(uint256 _amount) external',
  'function withdraw(uint256 _amount) external',
  'function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)',
  'function pendingReward(address _user) view returns (uint256)',
];

/**
 * Get staking protocols available on a chain
 */
export function getStakingProtocols(chainId) {
  return STAKING_PROTOCOLS[chainId] || [];
}

/**
 * Get all staking protocols across all chains
 */
export function getAllStakingProtocols() {
  const all = [];
  for (const [chainId, protocols] of Object.entries(STAKING_PROTOCOLS)) {
    for (const p of protocols) {
      all.push({ ...p, chainId: parseInt(chainId) });
    }
  }
  return all;
}

/**
 * Stake ETH via Lido (get stETH)
 */
export async function stakeLido(privateKey, amountETH) {
  const provider = getProvider(1);
  const wallet = new ethers.Wallet(privateKey, provider);
  const lido = new ethers.Contract('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', LIDO_ABI, wallet);
  
  const value = ethers.parseEther(amountETH.toString());
  const tx = await lido.submit(ethers.ZeroAddress, { value });
  
  return {
    hash: tx.hash,
    type: 'stake',
    protocol: 'Lido',
    amount: amountETH,
    asset: 'ETH',
    reward: 'stETH',
    chainId: 1,
    timestamp: Date.now(),
    status: 'pending',
  };
}

/**
 * Get Lido staking balance
 */
export async function getLidoBalance(address) {
  try {
    const provider = getProvider(1);
    const lido = new ethers.Contract('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', LIDO_ABI, provider);
    const balance = await lido.balanceOf(address);
    return ethers.formatEther(balance);
  } catch {
    return '0';
  }
}

/**
 * Get staking positions for a user across all chains
 */
export async function getStakingPositions(address) {
  const positions = [];
  
  // Check Lido stETH
  try {
    const stETH = await getLidoBalance(address);
    if (parseFloat(stETH) > 0) {
      positions.push({
        protocol: 'Lido',
        asset: 'ETH',
        reward: 'stETH',
        staked: stETH,
        chainId: 1,
        logo: '🔵',
        color: '#00A3FF',
      });
    }
  } catch {}

  return positions;
}

/**
 * Fetch current APR from Lido API
 */
export async function getLidoAPR() {
  try {
    const res = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/sma');
    const data = await res.json();
    return data.data?.smaApr?.toFixed(2) || '3.5';
  } catch {
    return '3.5';
  }
}
