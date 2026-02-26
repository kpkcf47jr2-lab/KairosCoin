// Kairos Extension — Receive Screen
// Show address + QR code

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import useStore from '../store/useStore';
import { CHAINS } from '../constants/chains';

export default function ReceiveScreen() {
  const navigate = useStore(s => s.navigate);
  const activeAddress = useStore(s => s.activeAddress);
  const activeChainId = useStore(s => s.activeChainId);

  const chain = CHAINS[activeChainId];
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple QR code using canvas (minimal implementation)
  useEffect(() => {
    if (!canvasRef.current || !activeAddress) return;
    drawQR(canvasRef.current, activeAddress);
  }, [activeAddress]);

  return (
    <div className="flex flex-col items-center h-full px-5 py-4 bg-dark-400">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 w-full">
        <button onClick={() => navigate('dashboard')} className="p-1.5 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <h1 className="text-base font-bold text-white">Recibir</h1>
      </div>

      {/* Chain Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-200 mb-4">
        <span>{chain?.icon}</span>
        <span className="text-xs font-medium text-gray-300">{chain?.name}</span>
      </div>

      {/* QR Code */}
      <div className="card p-4 mb-4">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="rounded-lg"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Info */}
      <p className="text-xs text-gray-400 text-center mb-3">
        Escanea el código QR o copia la dirección para recibir {chain?.symbol} y tokens
      </p>

      {/* Address */}
      <div className="w-full card p-3 mb-4">
        <p className="text-[11px] text-gray-500 mb-1">Tu dirección</p>
        <p className="text-xs font-mono text-white break-all leading-relaxed">{activeAddress}</p>
      </div>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="btn-gold w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? '¡Copiada!' : 'Copiar Dirección'}
      </button>

      {/* Warning */}
      <p className="text-[10px] text-gray-600 text-center mt-3">
        Solo envía tokens compatibles con {chain?.name}. Enviar tokens de otra red puede causar pérdida de fondos.
      </p>
    </div>
  );
}

// ── Simple QR renderer (uses Google Charts API) ──
function drawQR(canvas, data) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 200);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 200, 200);
    // Draw Kairos logo in center
    ctx.fillStyle = '#05050f';
    ctx.beginPath();
    ctx.arc(100, 100, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K', 100, 101);
  };
  img.src = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(data)}&choe=UTF-8`;
}
