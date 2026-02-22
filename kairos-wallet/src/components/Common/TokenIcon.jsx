// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Token Icon Component
//  Shows real token logos with elegant fallback
//  Handles loading, errors, and chain badges
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { getTokenLogoUrl, getNativeLogoUrl, getChainLogoUrl, markLogoFailed, hasLogoFailed } from '../../services/tokenLogos';
import { CHAINS, KAIROS_TOKEN } from '../../constants/chains';

// Generate consistent color from symbol
function symbolToColor(symbol) {
  if (!symbol) return '#666';
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA',
    '#F8C471', '#85C1E9', '#E59866', '#73C6B6', '#F1948A',
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Token icon component with real logos and fallback
 * @param {Object} props
 * @param {Object} props.token - Token object with address, symbol, isNative
 * @param {number} props.chainId - Current chain ID
 * @param {number} props.size - Icon size in pixels (default: 40)
 * @param {boolean} props.showChainBadge - Show chain indicator badge
 */
export default function TokenIcon({ token, chainId, size = 40, showChainBadge = false }) {
  const [imgError, setImgError] = useState(false);
  const [chainImgError, setChainImgError] = useState(false);

  if (!token) return null;

  const chain = CHAINS[chainId];
  const isKairos = token.address?.toLowerCase() === KAIROS_TOKEN.address.toLowerCase();
  const isNative = token.isNative;
  
  // Get logo URL
  let logoUrl = null;
  if (isNative) {
    logoUrl = getNativeLogoUrl(chainId);
  } else {
    logoUrl = getTokenLogoUrl(token, chainId);
  }
  
  // Check if previously failed
  if (logoUrl && hasLogoFailed(logoUrl)) {
    logoUrl = null;
  }

  const showImage = logoUrl && !imgError;
  const bgColor = isNative ? (chain?.color || '#666') : symbolToColor(token.symbol);
  const badgeSize = Math.max(14, size * 0.35);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {showImage ? (
        <img
          src={logoUrl}
          alt={token.symbol}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
          loading="lazy"
          onError={() => {
            markLogoFailed(logoUrl);
            setImgError(true);
          }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-bold text-white"
          style={{
            width: size,
            height: size,
            backgroundColor: bgColor + '25',
            color: bgColor,
            fontSize: size * 0.38,
          }}
        >
          {isKairos ? (
            <img src="/icons/kairos-token-128.png" alt="KAIROS" className="rounded-full" style={{ width: size, height: size }} />
          ) : (
            token.symbol?.charAt(0) || '?'
          )}
        </div>
      )}

      {/* Chain badge */}
      {showChainBadge && !isNative && chain && (
        <div
          className="absolute flex items-center justify-center rounded-full border-2 border-dark-950 overflow-hidden"
          style={{
            width: badgeSize,
            height: badgeSize,
            bottom: -1,
            right: -1,
            backgroundColor: chain.color,
          }}
        >
          {!chainImgError ? (
            <img
              src={getChainLogoUrl(chainId)}
              alt={chain.shortName}
              className="w-full h-full rounded-full object-cover"
              onError={() => setChainImgError(true)}
            />
          ) : (
            <span className="text-[6px] font-bold text-white">{chain.shortName?.charAt(0)}</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Chain icon component
 */
export function ChainIcon({ chainId, size = 24 }) {
  const [error, setError] = useState(false);
  const chain = CHAINS[chainId];
  const logoUrl = getChainLogoUrl(chainId);

  if (!chain) return null;

  if (logoUrl && !error) {
    return (
      <img
        src={logoUrl}
        alt={chain.name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, backgroundColor: chain.color, fontSize: size * 0.45 }}
    >
      {chain.shortName?.charAt(0)}
    </div>
  );
}
