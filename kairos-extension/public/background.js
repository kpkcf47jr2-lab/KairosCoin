// Kairos Wallet — Extension Background Service Worker
// Handles: persistent state, dApp connection requests, transaction signing

const STORAGE_KEY = 'kairos_extension_vault';

// ── State ──
let vault = null;
let isLocked = true;
let connectedSites = {};

// ── Listeners ──

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });
  return true; // Keep the channel open for async response
});

async function handleMessage(message, sender) {
  const { type, data } = message;

  switch (type) {
    // ── Vault Operations ──
    case 'GET_STATE':
      return {
        isLocked,
        hasVault: !!(await getStoredVault()),
        activeAddress: vault?.accounts?.[0]?.address || null,
        connectedSites: Object.keys(connectedSites),
      };

    case 'UNLOCK':
      return await unlockVault(data.password);

    case 'LOCK':
      vault = null;
      isLocked = true;
      return { success: true };

    case 'CREATE_VAULT':
      return await createVault(data);

    case 'IMPORT_VAULT':
      return await importVault(data);

    // ── dApp Connection ──
    case 'CONNECT_SITE':
      return await connectSite(data.origin);

    case 'DISCONNECT_SITE':
      delete connectedSites[data.origin];
      await chrome.storage.local.set({ connectedSites });
      return { success: true };

    case 'IS_CONNECTED':
      return { connected: !!connectedSites[data.origin] };

    // ── Transaction Signing ──
    case 'SIGN_TRANSACTION':
      return await signTransaction(data);

    case 'SIGN_MESSAGE':
      return await signMessage(data);

    case 'GET_ACCOUNTS':
      if (isLocked || !vault) return { accounts: [] };
      return { accounts: vault.accounts.map(a => a.address) };

    case 'GET_CHAIN_ID':
      return { chainId: vault?.activeChainId || '0x38' }; // BSC default

    case 'SWITCH_CHAIN':
      return await switchChain(data.chainId);

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

// ── Vault Management ──

async function getStoredVault() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || null;
}

async function createVault(data) {
  const { encryptedVault, address } = data;
  await chrome.storage.local.set({
    [STORAGE_KEY]: encryptedVault,
    kairos_active_address: address,
  });
  vault = data.decryptedVault;
  isLocked = false;
  return { success: true, address };
}

async function importVault(data) {
  const { encryptedVault, address } = data;
  await chrome.storage.local.set({
    [STORAGE_KEY]: encryptedVault,
    kairos_active_address: address,
  });
  vault = data.decryptedVault;
  isLocked = false;
  return { success: true, address };
}

async function unlockVault(password) {
  const stored = await getStoredVault();
  if (!stored) throw new Error('No vault found');

  // Decryption is handled in the popup with Web Crypto API
  // The popup sends the decrypted vault after confirming the password
  // This is a simplified flow — full implementation would decrypt here
  return { success: true, needsDecryption: true, encryptedVault: stored };
}

// ── dApp Connection ──

async function connectSite(origin) {
  if (isLocked || !vault) {
    // Open popup to unlock
    await chrome.action.openPopup();
    throw new Error('Wallet is locked');
  }

  connectedSites[origin] = {
    connectedAt: Date.now(),
    address: vault.accounts[0].address,
  };
  await chrome.storage.local.set({ connectedSites });

  return {
    success: true,
    address: vault.accounts[0].address,
    chainId: vault.activeChainId || '0x38',
  };
}

// ── Transaction Signing ──

async function signTransaction(data) {
  if (isLocked || !vault) throw new Error('Wallet is locked');

  // Open popup for user approval
  // In production, this would open a confirmation window
  return { success: true, needsApproval: true, txData: data };
}

async function signMessage(data) {
  if (isLocked || !vault) throw new Error('Wallet is locked');
  return { success: true, needsApproval: true, messageData: data };
}

// ── Chain Switching ──

async function switchChain(chainId) {
  if (vault) {
    vault.activeChainId = chainId;
  }
  return { success: true, chainId };
}

// ── Init: Restore connected sites ──
chrome.storage.local.get('connectedSites').then(result => {
  connectedSites = result.connectedSites || {};
});

// Auto-lock after 15 minutes of inactivity
let lockTimer;
function resetLockTimer() {
  clearTimeout(lockTimer);
  lockTimer = setTimeout(() => {
    vault = null;
    isLocked = true;
  }, 15 * 60 * 1000); // 15 min
}

// Reset timer on any message
chrome.runtime.onMessage.addListener(() => { resetLockTimer(); });
