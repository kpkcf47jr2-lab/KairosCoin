// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Receive Screen
//  QR Code + address display for receiving tokens
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '../../store/useStore';
import { formatAddress } from '../../services/wallet';
import { CHAINS } from '../../constants/chains';

export default function ReceiveScreen() {
  const { activeAddress, activeChainId, goBack, showToast } = useStore();
  const [hasCopied, setHasCopied] = useState(false);
  const chain = CHAINS[activeChainId];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeAddress);
    setHasCopied(true);
    showToast('Dirección copiada al portapapeles', 'success');
    setTimeout(() => setHasCopied(false), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi dirección Kairos Wallet',
          text: `Mi dirección en ${chain.name}: ${activeAddress}`,
        });
      } catch { }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={goBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">Recibir</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Chain info */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-lg">{chain.icon}</span>
          <span className="text-sm text-dark-300">{chain.name}</span>
        </div>

        {/* QR Code */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card-strong p-6 mb-6"
        >
          <div className="bg-white rounded-2xl p-4">
            <QRCodeSVG
              value={activeAddress}
              size={220}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: '/icons/logo-128.png',
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
        </motion.div>

        {/* Address */}
        <div className="text-center mb-6">
          <p className="text-dark-400 text-xs mb-2">Tu dirección</p>
          <p className="font-mono text-sm text-dark-200 break-all max-w-xs px-4">
            {activeAddress}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={handleCopy}
            className="kairos-button flex-1 flex items-center justify-center gap-2 py-3"
          >
            {hasCopied ? <Check size={16} /> : <Copy size={16} />}
            {hasCopied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleShare}
            className="glass-button flex-1 flex items-center justify-center gap-2 py-3 text-white"
          >
            <Share2 size={16} />
            Compartir
          </button>
        </div>

        {/* Warning */}
        <p className="text-dark-500 text-[10px] text-center mt-6 max-w-xs">
          Solo envía tokens de la red <strong className="text-dark-300">{chain.name}</strong> a esta dirección.
          Enviar tokens de otra red puede resultar en pérdida de fondos.
        </p>
      </div>
    </div>
  );
}
