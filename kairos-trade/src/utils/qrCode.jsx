// ═══════════════════════════════════════════════════════
//  Kairos Trade — Minimal QR Code Generator (Canvas)
//  Generates QR codes for wallet addresses without external deps
//  Uses Google Charts API for reliable QR generation
// ═══════════════════════════════════════════════════════

/**
 * Returns a Google Charts QR code image URL for the given text
 * @param {string} text - Text to encode
 * @param {number} size - Image size in pixels (default 200)
 * @returns {string} Image URL
 */
export function getQRCodeURL(text, size = 200) {
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=8&format=svg`;
}

/**
 * React component that renders a QR code image
 */
import { useState } from 'react';

export function QRCodeImage({ value, size = 192, className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const url = getQRCodeURL(value, size);

  if (error) {
    // Fallback: show truncated address with visual pattern
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size, background: 'white', borderRadius: 12 }}
      >
        <div className="text-center px-4">
          <div className="text-2xl font-black text-blue-600 mb-1">K</div>
          <div className="text-[8px] font-mono text-gray-500 break-all leading-tight">
            {value}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, background: 'white', borderRadius: 12 }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={url}
        alt="QR Code"
        width={size - 16}
        height={size - 16}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
      />
    </div>
  );
}
