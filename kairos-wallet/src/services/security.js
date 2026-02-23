// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Phishing & Scam Detection Service
//  Protects users from malicious contracts and addresses
// ═══════════════════════════════════════════════════════

// Known scam/phishing contract patterns
const KNOWN_SCAM_SIGNATURES = [
  '0x00000000', // null function selector
  '0xa9059cbb', // transfer — when disguised as claim/airdrop
];

// Known malicious domains (WalletConnect dApp checking)
const PHISHING_DOMAINS = new Set([
  'metamask-wallet.org',
  'metamask-io.org',
  'pancakeswap-v3.com',
  'uniswap-v4.org',
  'airdrop-claim.org',
  'free-tokens.xyz',
  'nft-airdrop.xyz',
]);

// Suspicious address patterns (burn addresses, known drainers)
const SUSPICIOUS_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000001',
  '0x000000000000000000000000000000000000dead',
]);

// Cached verified contracts per chain
const verifiedCache = new Map();

/**
 * Check if a domain is a known phishing site
 */
export function isPhishingDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (PHISHING_DOMAINS.has(hostname)) return true;
    
    // Check for typosquatting patterns
    const suspicious = [
      /metamask/i, /pancakeswap/i, /uniswap/i, /opensea/i,
      /binance/i, /coinbase/i, /trustwallet/i,
    ];
    const legitimate = [
      'metamask.io', 'pancakeswap.finance', 'app.uniswap.org',
      'opensea.io', 'binance.com', 'coinbase.com', 'trustwallet.com',
    ];
    
    for (const pattern of suspicious) {
      if (pattern.test(hostname) && !legitimate.some(l => hostname.endsWith(l))) {
        return true; // Contains brand name but isn't the real domain
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Analyze a transaction for suspicious patterns
 * Returns risk assessment { level: 'safe'|'warning'|'danger', reasons: string[] }
 */
export function analyzeTxRisk(tx) {
  const reasons = [];
  let level = 'safe';

  // Check recipient
  if (tx.to) {
    const toLower = tx.to.toLowerCase();
    
    if (SUSPICIOUS_ADDRESSES.has(toLower)) {
      reasons.push('Dirección de destino sospechosa (burn address)');
      level = 'danger';
    }

    // Check if sending to self
    if (tx.from && toLower === tx.from.toLowerCase()) {
      reasons.push('Estás enviando a tu propia dirección');
      level = 'warning';
    }
  }

  // Check value — very large amounts
  if (tx.value) {
    const valueNum = parseFloat(tx.value);
    if (valueNum > 100) {
      reasons.push(`Monto alto: ${valueNum} — ¿estás seguro?`);
      if (level === 'safe') level = 'warning';
    }
  }

  // Check data field for suspicious patterns
  if (tx.data && tx.data !== '0x') {
    if (tx.data.length > 10000) {
      reasons.push('Datos de transacción inusualmente grandes');
      if (level === 'safe') level = 'warning';
    }
  }

  // Check for unlimited approval
  if (tx.data && tx.data.startsWith('0x095ea7b3')) {
    // approve(address,uint256)
    const amountHex = '0x' + tx.data.slice(74);
    if (amountHex === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' ||
        BigInt(amountHex) > BigInt('0xffffffffffffffffffffffffffff')) {
      reasons.push('⚠️ Aprobación ILIMITADA — el contrato podrá gastar TODOS tus tokens');
      level = 'danger';
    }
  }

  // First interaction with contract — no verification
  if (tx.to && tx.data && tx.data !== '0x') {
    reasons.push('Interacción con contrato inteligente — verifica la dirección');
    if (level === 'safe') level = 'warning';
  }

  return { level, reasons };
}

/**
 * Check if an address looks like a token honeypot
 * (token that can be bought but not sold)
 */
export async function checkHoneypot(chainId, tokenAddress) {
  try {
    // Use HoneypotIs API (free, no key needed)
    const chainSlug = { 56: 'bsc', 1: 'eth', 137: 'polygon' }[chainId];
    if (!chainSlug) return { isHoneypot: false, checked: false };

    const res = await fetch(
      `https://api.honeypot.is/v2/IsHoneypot?address=${tokenAddress}&chainID=${chainId}`
    );
    if (!res.ok) return { isHoneypot: false, checked: false };

    const data = await res.json();
    return {
      isHoneypot: data.honeypotResult?.isHoneypot || false,
      buyTax: data.simulationResult?.buyTax || 0,
      sellTax: data.simulationResult?.sellTax || 0,
      checked: true,
    };
  } catch {
    return { isHoneypot: false, checked: false };
  }
}

/**
 * Security score for a dApp/contract interaction
 * Higher = safer (0-100)
 */
export function getSecurityScore(params) {
  let score = 100;
  
  if (params.isNewContract) score -= 20;
  if (params.isUnverified) score -= 30;
  if (params.hasUnlimitedApproval) score -= 25;
  if (params.isPhishing) score -= 100;
  if (params.isHighValue) score -= 10;
  if (params.hasDataPayload) score -= 5;
  
  return Math.max(0, score);
}

/**
 * Format risk level for display
 */
export function getRiskColor(level) {
  switch (level) {
    case 'danger': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
    case 'warning': return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
    default: return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' };
  }
}
