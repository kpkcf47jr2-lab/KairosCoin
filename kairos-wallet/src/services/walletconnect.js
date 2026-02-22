// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — WalletConnect v2 Service
//  Connect to dApps via WalletConnect protocol
// ═══════════════════════════════════════════════════════

import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { ethers } from 'ethers';
import { CHAINS } from '../constants/chains';
import { getProvider } from './blockchain';

const PROJECT_ID = '2b0ddf4a2e6e6a53f52d2bcb9a0c2e0f'; // WalletConnect Cloud project ID

let web3wallet = null;
let core = null;

// Event callbacks
let onSessionProposal = null;
let onSessionRequest = null;
let onSessionDelete = null;

/**
 * Initialize WalletConnect
 */
export async function initWalletConnect() {
  if (web3wallet) return web3wallet;

  try {
    core = new Core({ projectId: PROJECT_ID });
    
    web3wallet = await Web3Wallet.init({
      core,
      metadata: {
        name: 'Kairos Wallet',
        description: 'Billetera DeFi multi-chain',
        url: 'https://kairos-wallet.netlify.app',
        icons: ['https://kairos-wallet.netlify.app/icons/logo-192.png'],
      },
    });

    // Set up event listeners
    web3wallet.on('session_proposal', (proposal) => {
      if (onSessionProposal) onSessionProposal(proposal);
    });

    web3wallet.on('session_request', (request) => {
      if (onSessionRequest) onSessionRequest(request);
    });

    web3wallet.on('session_delete', (event) => {
      if (onSessionDelete) onSessionDelete(event);
    });

    return web3wallet;
  } catch (err) {
    console.error('WalletConnect init error:', err);
    throw err;
  }
}

/**
 * Set event handlers
 */
export function setWCHandlers({ onProposal, onRequest, onDelete }) {
  onSessionProposal = onProposal;
  onSessionRequest = onRequest;
  onSessionDelete = onDelete;
}

/**
 * Pair with a dApp using WC URI
 */
export async function pair(uri) {
  const wc = await initWalletConnect();
  await wc.pair({ uri });
}

/**
 * Approve a session proposal
 */
export async function approveSession(proposal, address, chainIds) {
  const wc = await initWalletConnect();

  // Build namespaces
  const chains = chainIds.map(id => `eip155:${id}`);
  const accounts = chainIds.map(id => `eip155:${id}:${address}`);
  const methods = [
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sign',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v4',
  ];
  const events = ['chainChanged', 'accountsChanged'];

  const approvedNamespaces = buildApprovedNamespaces({
    proposal: proposal.params,
    supportedNamespaces: {
      eip155: { chains, methods, events, accounts },
    },
  });

  const session = await wc.approveSession({
    id: proposal.id,
    namespaces: approvedNamespaces,
  });

  return session;
}

/**
 * Reject a session proposal
 */
export async function rejectSession(proposalId) {
  const wc = await initWalletConnect();
  await wc.rejectSession({
    id: proposalId,
    reason: getSdkError('USER_REJECTED'),
  });
}

/**
 * Handle a session request (sign, send transaction, etc.)
 */
export async function handleSessionRequest(request, privateKey) {
  const wc = await initWalletConnect();
  const { topic, id, params } = request;
  const { request: req, chainId: wcChainId } = params;
  const chainId = parseInt(wcChainId.split(':')[1]);
  const provider = getProvider(chainId);
  const wallet = new ethers.Wallet(privateKey, provider);

  let result;

  try {
    switch (req.method) {
      case 'personal_sign': {
        const message = req.params[0];
        result = await wallet.signMessage(
          ethers.isHexString(message) ? ethers.getBytes(message) : message
        );
        break;
      }

      case 'eth_sign': {
        const message = req.params[1];
        result = await wallet.signMessage(ethers.getBytes(message));
        break;
      }

      case 'eth_signTypedData':
      case 'eth_signTypedData_v4': {
        const typedData = JSON.parse(req.params[1]);
        const { domain, types, message } = typedData;
        // Remove EIP712Domain from types
        const cleanTypes = { ...types };
        delete cleanTypes.EIP712Domain;
        result = await wallet.signTypedData(domain, cleanTypes, message);
        break;
      }

      case 'eth_sendTransaction': {
        const txParams = req.params[0];
        const tx = await wallet.sendTransaction({
          to: txParams.to,
          value: txParams.value || '0x0',
          data: txParams.data || '0x',
          gasLimit: txParams.gas || txParams.gasLimit,
        });
        result = tx.hash;
        break;
      }

      case 'eth_signTransaction': {
        const signTxParams = req.params[0];
        result = await wallet.signTransaction({
          to: signTxParams.to,
          value: signTxParams.value || '0x0',
          data: signTxParams.data || '0x',
          gasLimit: signTxParams.gas || signTxParams.gasLimit,
        });
        break;
      }

      default:
        throw new Error(`Método no soportado: ${req.method}`);
    }

    await wc.respondSessionRequest({ topic, response: { id, jsonrpc: '2.0', result } });
    return { success: true, result };
  } catch (err) {
    await wc.respondSessionRequest({
      topic,
      response: { id, jsonrpc: '2.0', error: getSdkError('USER_REJECTED') },
    });
    return { success: false, error: err.message };
  }
}

/**
 * Reject a session request
 */
export async function rejectSessionRequest(topic, id) {
  const wc = await initWalletConnect();
  await wc.respondSessionRequest({
    topic,
    response: { id, jsonrpc: '2.0', error: getSdkError('USER_REJECTED') },
  });
}

/**
 * Get active sessions
 */
export async function getActiveSessions() {
  const wc = await initWalletConnect();
  return Object.values(wc.getActiveSessions());
}

/**
 * Disconnect a session
 */
export async function disconnectSession(topic) {
  const wc = await initWalletConnect();
  await wc.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') });
}

/**
 * Disconnect all sessions
 */
export async function disconnectAll() {
  const sessions = await getActiveSessions();
  for (const session of sessions) {
    try {
      await disconnectSession(session.topic);
    } catch {}
  }
}
