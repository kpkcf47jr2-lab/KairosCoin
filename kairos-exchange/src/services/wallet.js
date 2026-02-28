/* ═══════════════════════════════════════════════════════════
   Kairos Exchange — Wallet Service
   WalletConnect v2 + MetaMask + Kairos Wallet (default)
   ═══════════════════════════════════════════════════════════ */
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';

const KAIROS_WALLET_URL = 'https://kairos-wallet.netlify.app';

// WalletConnect project ID (free tier)
const WC_PROJECT_ID = 'a0ef07fe48de9c6d8fb8a68e4eb9d960';

// Web3Modal singleton
let web3modal = null;

function getWeb3Modal() {
  if (web3modal) return web3modal;
  const metadata = {
    name: 'Kairos Exchange',
    description: 'DEX Aggregator - Best Prices Across 100+ DEXes',
    url: 'https://kairos-exchange-app.netlify.app',
    icons: ['https://kairos-exchange-app.netlify.app/favicon.svg'],
  };

  const ethersConfig = defaultConfig({ metadata });

  web3modal = createWeb3Modal({
    ethersConfig,
    chains: [
      { chainId: 56, name: 'BNB Smart Chain', currency: 'BNB', explorerUrl: 'https://bscscan.com', rpcUrl: 'https://bsc-dataseed.binance.org' },
      { chainId: 1, name: 'Ethereum', currency: 'ETH', explorerUrl: 'https://etherscan.io', rpcUrl: 'https://eth.llamarpc.com' },
      { chainId: 8453, name: 'Base', currency: 'ETH', explorerUrl: 'https://basescan.org', rpcUrl: 'https://mainnet.base.org' },
      { chainId: 42161, name: 'Arbitrum One', currency: 'ETH', explorerUrl: 'https://arbiscan.io', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
      { chainId: 137, name: 'Polygon', currency: 'MATIC', explorerUrl: 'https://polygonscan.com', rpcUrl: 'https://polygon-rpc.com' },
    ],
    projectId: WC_PROJECT_ID,
    enableAnalytics: false,
  });

  return web3modal;
}

// Wallet options with Kairos Wallet as default/recommended
export const WALLET_OPTIONS = [
  {
    id: 'kairos',
    name: 'Kairos Wallet',
    icon: '◆',
    brandColor: '#D4AF37',
    description: 'Official Kairos 777 Wallet',
    recommended: true,
    deepLink: `${KAIROS_WALLET_URL}/connect`,
    type: 'deeplink',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Popular browser extension',
    type: 'injected',
    checkInstalled: () => typeof window !== 'undefined' && !!window.ethereum?.isMetaMask,
    installUrl: 'https://metamask.io/download/',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '🛡️',
    description: 'Mobile & extension wallet',
    type: 'injected',
    checkInstalled: () => typeof window !== 'undefined' && !!window.trustwallet,
    installUrl: 'https://trustwallet.com/download',
  },
  {
    id: 'rabby',
    name: 'Rabby Wallet',
    icon: '🐰',
    description: 'The game-changing wallet for DeFi',
    type: 'injected',
    checkInstalled: () => typeof window !== 'undefined' && !!window.ethereum?.isRabby,
    installUrl: 'https://rabby.io/',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Self-custody crypto wallet',
    type: 'injected',
    checkInstalled: () => typeof window !== 'undefined' && !!window.ethereum?.isCoinbaseWallet,
    installUrl: 'https://www.coinbase.com/wallet',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Scan QR with mobile wallet',
    type: 'walletconnect',
  },
];

/**
 * Connect via injected provider (MetaMask, Trust, Rabby, etc.)
 */
export async function connectInjected() {
  if (!window.ethereum) throw new Error('No wallet detected');
  const { ethers } = await import('ethers');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  const network = await provider.getNetwork();
  return {
    account: accounts[0],
    provider,
    chainId: Number(network.chainId),
    walletId: window.ethereum.isMetaMask ? 'metamask' :
              window.ethereum.isRabby ? 'rabby' :
              window.ethereum.isCoinbaseWallet ? 'coinbase' : 'injected',
  };
}

/**
 * Connect via Kairos Wallet deep link
 * Opens Kairos Wallet app which returns signed authorization
 */
export async function connectKairosWallet() {
  // For desktop: open Kairos Wallet in iframe/popup
  // For mobile: redirect to deep link
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  if (isMobile) {
    // Deep link to Kairos Wallet app
    window.location.href = `${KAIROS_WALLET_URL}/connect?returnUrl=${encodeURIComponent(window.location.href)}`;
    return null; // Will receive response via URL callback
  }

  // Desktop: use postMessage communication with Kairos Wallet
  return new Promise((resolve, reject) => {
    const popup = window.open(
      `${KAIROS_WALLET_URL}/connect?origin=${encodeURIComponent(window.location.origin)}`,
      'KairosWallet',
      'width=420,height=680,popup=yes'
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for Kairos Exchange.'));
      return;
    }

    const handler = (event) => {
      if (event.origin !== new URL(KAIROS_WALLET_URL).origin) return;
      if (event.data?.type === 'KAIROS_WALLET_CONNECT') {
        window.removeEventListener('message', handler);
        popup.close();
        resolve(event.data);
      }
    };

    window.addEventListener('message', handler);

    // Timeout after 2 minutes
    setTimeout(() => {
      window.removeEventListener('message', handler);
      if (!popup.closed) popup.close();
      reject(new Error('Connection timed out'));
    }, 120000);
  });
}

/**
 * Connect via WalletConnect v2 (uses Web3Modal)
 */
export async function connectWalletConnect() {
  const modal = getWeb3Modal();
  await modal.open();

  // Wait for connection via polling
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes

    const check = setInterval(async () => {
      attempts++;
      const walletProvider = modal.getWalletProvider();

      if (walletProvider) {
        clearInterval(check);
        try {
          const { ethers } = await import('ethers');
          const provider = new ethers.BrowserProvider(walletProvider);
          const accounts = await provider.send('eth_requestAccounts', []);
          const network = await provider.getNetwork();
          resolve({
            account: accounts[0],
            provider,
            chainId: Number(network.chainId),
            walletId: 'walletconnect',
          });
        } catch (err) {
          reject(err);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
        reject(new Error('WalletConnect timed out'));
      }
    }, 1000);

    // Also listen for modal close
    const unsub = modal.subscribeEvents((event) => {
      if (event.data?.event === 'MODAL_CLOSE' && !modal.getWalletProvider()) {
        clearInterval(check);
        if (unsub) unsub();
        reject(new Error('Connection cancelled'));
      }
    });
  });
}

/**
 * Switch chain on the connected wallet
 */
export async function switchChain(chainId, chainConfig) {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (err) {
    if (err.code === 4902 && chainConfig) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${chainId.toString(16)}`,
          chainName: chainConfig.name,
          rpcUrls: [chainConfig.rpcUrl],
          nativeCurrency: chainConfig.nativeCurrency,
          blockExplorerUrls: [chainConfig.explorerUrl],
        }],
      });
    }
  }
}

/**
 * Setup wallet event listeners
 */
export function setupWalletListeners(onAccountChange, onChainChange, onDisconnect) {
  if (!window.ethereum) return () => {};

  const handleAccounts = (accs) => {
    if (accs.length === 0) onDisconnect();
    else onAccountChange(accs[0]);
  };
  const handleChain = (hex) => onChainChange(parseInt(hex, 16));
  const handleDisconnect = () => onDisconnect();

  window.ethereum.on('accountsChanged', handleAccounts);
  window.ethereum.on('chainChanged', handleChain);
  window.ethereum.on('disconnect', handleDisconnect);

  return () => {
    window.ethereum.removeListener('accountsChanged', handleAccounts);
    window.ethereum.removeListener('chainChanged', handleChain);
    window.ethereum.removeListener('disconnect', handleDisconnect);
  };
}
