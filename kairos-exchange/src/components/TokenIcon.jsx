import { useState, useEffect } from 'react';
import { getTokenLogoURL, getTokenLogoSync, getAddressColor } from '../services/tokenLogo.js';

/**
 * TokenIcon — Smart token logo component
 * Displays token logo with automatic fallback:
 * 1. Known logoURI from token config
 * 2. Dynamic lookup by contract address
 * 3. Colored initial letter fallback
 */
export default function TokenIcon({ token, chainId, size = 24, className = '' }) {
  const [logoUrl, setLogoUrl] = useState(token?.logoURI || getTokenLogoSync(chainId, token?.address));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    // If token has a known logoURI, use it
    if (token?.logoURI) {
      setLogoUrl(token.logoURI);
      return;
    }
    // Try dynamic lookup
    if (token?.address && chainId) {
      const cached = getTokenLogoSync(chainId, token.address);
      if (cached) {
        setLogoUrl(cached);
      } else {
        getTokenLogoURL(chainId, token.address).then(url => {
          if (url) setLogoUrl(url);
          else setFailed(true);
        });
      }
    }
  }, [token?.address, token?.logoURI, chainId]);

  const sizeClass = `w-[${size}px] h-[${size}px]`;
  const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size };

  // Show image if we have a URL and it hasn't failed
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={token?.symbol || ''}
        className={`rounded-full ${className}`}
        style={sizeStyle}
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback: colored circle with initial
  const color = token?.isKairos ? '#3B82F6' : getAddressColor(token?.address);
  const initial = token?.isKairos ? 'K' : (token?.symbol?.charAt(0) || '?');

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold ${className}`}
      style={{
        ...sizeStyle,
        backgroundColor: `${color}20`,
        color: color,
        fontSize: Math.max(size * 0.4, 10),
      }}
    >
      {initial}
    </div>
  );
}
