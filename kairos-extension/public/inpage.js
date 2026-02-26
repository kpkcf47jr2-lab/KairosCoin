// Kairos Wallet — Injected Provider (EIP-1193 compatible)
// This script is injected into web pages to provide window.kairos & window.ethereum

(function () {
  'use strict';

  if (window.kairos) return; // Already injected

  const CHAIN_MAP = {
    '0x38': { name: 'BNB Smart Chain', rpcUrl: 'https://bsc-dataseed1.binance.org', symbol: 'BNB', decimals: 18, explorer: 'https://bscscan.com' },
    '0x89': { name: 'Polygon', rpcUrl: 'https://polygon-rpc.com', symbol: 'POL', decimals: 18, explorer: 'https://polygonscan.com' },
    '0x2105': { name: 'Base', rpcUrl: 'https://mainnet.base.org', symbol: 'ETH', decimals: 18, explorer: 'https://basescan.org' },
    '0xa4b1': { name: 'Arbitrum One', rpcUrl: 'https://arb1.arbitrum.io/rpc', symbol: 'ETH', decimals: 18, explorer: 'https://arbiscan.io' },
    '0x1': { name: 'Ethereum', rpcUrl: 'https://cloudflare-eth.com', symbol: 'ETH', decimals: 18, explorer: 'https://etherscan.io' },
    '0xa86a': { name: 'Avalanche', rpcUrl: 'https://api.avax.network/ext/bc/C/rpc', symbol: 'AVAX', decimals: 18, explorer: 'https://snowtrace.io' },
  };

  let currentChainId = '0x38'; // BSC default
  let accounts = [];
  let isConnected = false;

  // ── Event Emitter ──
  const eventListeners = {};

  function emit(event, data) {
    const listeners = eventListeners[event] || [];
    listeners.forEach(fn => {
      try { fn(data); } catch (e) { console.error('Kairos event listener error:', e); }
    });
  }

  // ── Communication with extension ──
  function sendMessage(type, data = {}) {
    return new Promise((resolve, reject) => {
      window.postMessage({ source: 'kairos-inpage', type, data }, '*');

      const handler = (event) => {
        if (event.data?.source === 'kairos-content' && event.data?.responseType === type) {
          window.removeEventListener('message', handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };
      window.addEventListener('message', handler);

      // Timeout after 30s
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Request timed out'));
      }, 30000);
    });
  }

  // ── EIP-1193 Provider ──
  const provider = {
    isKairos: true,
    isMetaMask: false, // Don't impersonate MetaMask

    // EIP-1193: request method
    async request({ method, params = [] }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': {
          if (!isConnected) {
            const result = await sendMessage('CONNECT_SITE', { origin: window.location.origin });
            accounts = [result.address];
            currentChainId = result.chainId;
            isConnected = true;
            emit('connect', { chainId: currentChainId });
            emit('accountsChanged', accounts);
          }
          return accounts;
        }

        case 'eth_chainId':
          return currentChainId;

        case 'net_version':
          return String(parseInt(currentChainId, 16));

        case 'wallet_switchEthereumChain': {
          const chainId = params[0]?.chainId;
          if (!CHAIN_MAP[chainId]) {
            throw { code: 4902, message: `Chain ${chainId} not supported` };
          }
          const result = await sendMessage('SWITCH_CHAIN', { chainId });
          currentChainId = result.chainId;
          emit('chainChanged', currentChainId);
          return null;
        }

        case 'wallet_addEthereumChain': {
          const chainId = params[0]?.chainId;
          if (CHAIN_MAP[chainId]) return null; // Already supported
          throw { code: 4902, message: 'Cannot add custom chains yet' };
        }

        case 'eth_sendTransaction': {
          const tx = params[0];
          const result = await sendMessage('SIGN_TRANSACTION', {
            ...tx,
            chainId: currentChainId,
            origin: window.location.origin,
          });
          return result.hash;
        }

        case 'personal_sign': {
          const [message, address] = params;
          const result = await sendMessage('SIGN_MESSAGE', {
            message,
            address,
            method: 'personal_sign',
            origin: window.location.origin,
          });
          return result.signature;
        }

        case 'eth_sign': {
          const [address, message] = params;
          const result = await sendMessage('SIGN_MESSAGE', {
            message,
            address,
            method: 'eth_sign',
            origin: window.location.origin,
          });
          return result.signature;
        }

        case 'eth_signTypedData_v4': {
          const [address, typedData] = params;
          const result = await sendMessage('SIGN_MESSAGE', {
            typedData: typeof typedData === 'string' ? JSON.parse(typedData) : typedData,
            address,
            method: 'eth_signTypedData_v4',
            origin: window.location.origin,
          });
          return result.signature;
        }

        // ── Read-only RPC passthrough ──
        case 'eth_getBalance':
        case 'eth_getTransactionCount':
        case 'eth_getTransactionReceipt':
        case 'eth_getTransactionByHash':
        case 'eth_call':
        case 'eth_estimateGas':
        case 'eth_gasPrice':
        case 'eth_getBlockByNumber':
        case 'eth_blockNumber':
        case 'eth_getCode':
        case 'eth_getLogs': {
          const chain = CHAIN_MAP[currentChainId];
          if (!chain) throw new Error('Chain not supported');
          const response = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
          });
          const json = await response.json();
          if (json.error) throw json.error;
          return json.result;
        }

        default:
          throw { code: 4200, message: `Method ${method} not supported` };
      }
    },

    // EIP-1193: event methods
    on(event, callback) {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(callback);
    },

    removeListener(event, callback) {
      if (!eventListeners[event]) return;
      eventListeners[event] = eventListeners[event].filter(fn => fn !== callback);
    },

    removeAllListeners(event) {
      if (event) {
        delete eventListeners[event];
      } else {
        Object.keys(eventListeners).forEach(k => delete eventListeners[k]);
      }
    },

    // Legacy sendAsync
    sendAsync(payload, callback) {
      provider.request(payload).then(
        result => callback(null, { id: payload.id, jsonrpc: '2.0', result }),
        error => callback(error)
      );
    },

    // Legacy send
    send(methodOrPayload, paramsOrCallback) {
      if (typeof methodOrPayload === 'string') {
        return provider.request({ method: methodOrPayload, params: paramsOrCallback || [] });
      }
      return provider.sendAsync(methodOrPayload, paramsOrCallback);
    },

    // Legacy enable
    enable() {
      return provider.request({ method: 'eth_requestAccounts' });
    },
  };

  // ── Listen for messages from content script ──
  window.addEventListener('message', (event) => {
    if (event.data?.source !== 'kairos-content') return;

    if (event.data.type === 'ACCOUNTS_CHANGED') {
      accounts = event.data.accounts || [];
      emit('accountsChanged', accounts);
    }

    if (event.data.type === 'CHAIN_CHANGED') {
      currentChainId = event.data.chainId;
      emit('chainChanged', currentChainId);
    }

    if (event.data.type === 'DISCONNECT') {
      accounts = [];
      isConnected = false;
      emit('disconnect', { code: 4900, message: 'Disconnected' });
    }
  });

  // ── Expose globally ──
  window.kairos = provider;

  // EIP-6963: Provider Discovery
  const info = {
    uuid: 'kairos-wallet-7777',
    name: 'Kairos Wallet',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="%230a0a1a"/><text x="64" y="82" font-size="72" text-anchor="middle" fill="%23f7c948">K</text></svg>',
    rdns: 'com.kairos-777.wallet',
  };

  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: Object.freeze({ info, provider }),
  }));

  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({ info, provider }),
    }));
  });

  console.log('%c🏛️ Kairos Wallet injected', 'color: #f7c948; font-weight: bold;');
})();
