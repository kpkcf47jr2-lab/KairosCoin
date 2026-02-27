// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — WalletConnect dApp Client
//  Connects Trade (as a dApp) to external wallets like Kairos Wallet
//  Uses WalletConnect Sign Client v2
// ═══════════════════════════════════════════════════════════════════════════════

import SignClient from '@walletconnect/sign-client';

const PROJECT_ID = '2b0ddf4a2e6e6a53f52d2bcb9a0c2e0f'; // Same WC Cloud project
const METADATA = {
  name: 'Kairos Trade',
  description: 'AI-Powered Trading Platform — Trade crypto with bots, charts & on-chain execution',
  url: 'https://kairos-trade.netlify.app',
  icons: ['https://kairos-trade.netlify.app/icons/icon-192.png'],
};

// Supported chains (eip155 namespace)
const SUPPORTED_CHAINS = ['eip155:56', 'eip155:1', 'eip155:137', 'eip155:42161', 'eip155:43114', 'eip155:8453'];
const REQUIRED_METHODS = ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'];
const REQUIRED_EVENTS = ['chainChanged', 'accountsChanged'];

let client = null;
let activeSession = null;
let eventCallbacks = {};

// ── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'kairos_wc_session';

function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      topic: session.topic,
      namespaces: session.namespaces,
      peer: session.peer,
      expiry: session.expiry,
    }));
  } catch {}
}

function loadSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSavedSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Initialize ───────────────────────────────────────────────────────────────

export async function initWCClient() {
  if (client) return client;

  client = await SignClient.init({
    projectId: PROJECT_ID,
    metadata: METADATA,
  });

  // Listen for session events
  client.on('session_event', ({ topic, params }) => {
    const { event } = params;
    if (eventCallbacks.onSessionEvent) eventCallbacks.onSessionEvent(event);
  });

  client.on('session_update', ({ topic, params }) => {
    const { namespaces } = params;
    if (activeSession && activeSession.topic === topic) {
      activeSession = { ...activeSession, namespaces };
      saveSession(activeSession);
      if (eventCallbacks.onSessionUpdate) eventCallbacks.onSessionUpdate(activeSession);
    }
  });

  client.on('session_delete', ({ topic }) => {
    if (activeSession && activeSession.topic === topic) {
      activeSession = null;
      clearSavedSession();
      if (eventCallbacks.onDisconnect) eventCallbacks.onDisconnect();
    }
  });

  // Try to restore previous session
  const saved = loadSavedSession();
  if (saved?.topic) {
    try {
      const sessions = client.session.getAll();
      const match = sessions.find(s => s.topic === saved.topic);
      if (match) {
        activeSession = match;
        if (eventCallbacks.onReconnect) eventCallbacks.onReconnect(match);
      } else {
        clearSavedSession();
      }
    } catch {
      clearSavedSession();
    }
  }

  return client;
}

// ── Event Handlers ───────────────────────────────────────────────────────────

export function setCallbacks(cbs) {
  eventCallbacks = { ...eventCallbacks, ...cbs };
}

// ── Connect (generate pairing URI) ──────────────────────────────────────────

export async function connect() {
  const c = await initWCClient();

  const { uri, approval } = await c.connect({
    requiredNamespaces: {
      eip155: {
        chains: SUPPORTED_CHAINS,
        methods: REQUIRED_METHODS,
        events: REQUIRED_EVENTS,
      },
    },
  });

  // Return URI immediately for display, and a promise for the session
  return {
    uri,
    waitForApproval: async () => {
      const session = await approval();
      activeSession = session;
      saveSession(session);
      return session;
    },
  };
}

// ── Disconnect ──────────────────────────────────────────────────────────────

export async function disconnect() {
  if (!client || !activeSession) return;
  try {
    await client.disconnect({
      topic: activeSession.topic,
      reason: { code: 6000, message: 'User disconnected' },
    });
  } catch {}
  activeSession = null;
  clearSavedSession();
}

// ── Get Connected Account ───────────────────────────────────────────────────

export function getConnectedAccount() {
  if (!activeSession) return null;

  const ns = activeSession.namespaces?.eip155;
  if (!ns?.accounts?.length) return null;

  // Parse first account: "eip155:56:0xAbC..."
  const [namespace, chainId, address] = ns.accounts[0].split(':');
  
  // Get all connected chains
  const chains = [...new Set(ns.accounts.map(a => parseInt(a.split(':')[1])))];

  return {
    address,
    chainId: parseInt(chainId),
    chains,
    peerName: activeSession.peer?.metadata?.name || 'External Wallet',
    peerIcon: activeSession.peer?.metadata?.icons?.[0] || null,
  };
}

export function isConnected() {
  return !!activeSession;
}

export function getSession() {
  return activeSession;
}

// ── Send Transaction via WalletConnect ──────────────────────────────────────

export async function sendTransaction(chainId, txParams) {
  if (!client || !activeSession) throw new Error('Wallet not connected');

  const result = await client.request({
    topic: activeSession.topic,
    chainId: `eip155:${chainId}`,
    request: {
      method: 'eth_sendTransaction',
      params: [txParams],
    },
  });

  return result; // Returns tx hash
}

// ── Sign Message ────────────────────────────────────────────────────────────

export async function signMessage(address, message) {
  if (!client || !activeSession) throw new Error('Wallet not connected');

  // Determine chain from session accounts
  const ns = activeSession.namespaces?.eip155;
  const accountEntry = ns?.accounts?.find(a => a.toLowerCase().includes(address.toLowerCase()));
  const chainId = accountEntry ? accountEntry.split(':')[1] : '56';

  const result = await client.request({
    topic: activeSession.topic,
    chainId: `eip155:${chainId}`,
    request: {
      method: 'personal_sign',
      params: [message, address],
    },
  });

  return result;
}

// ── Sign Typed Data ─────────────────────────────────────────────────────────

export async function signTypedData(address, typedData) {
  if (!client || !activeSession) throw new Error('Wallet not connected');

  const ns = activeSession.namespaces?.eip155;
  const accountEntry = ns?.accounts?.find(a => a.toLowerCase().includes(address.toLowerCase()));
  const chainId = accountEntry ? accountEntry.split(':')[1] : '56';

  const result = await client.request({
    topic: activeSession.topic,
    chainId: `eip155:${chainId}`,
    request: {
      method: 'eth_signTypedData_v4',
      params: [address, typeof typedData === 'string' ? typedData : JSON.stringify(typedData)],
    },
  });

  return result;
}

// ── Utility: Format address ─────────────────────────────────────────────────

export function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
