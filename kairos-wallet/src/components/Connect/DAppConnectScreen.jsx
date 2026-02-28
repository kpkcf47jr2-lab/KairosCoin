// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — DApp Connect Screen
//  Handles connection requests from Kairos Exchange
//  via postMessage protocol (popup or redirect)
// ═══════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { getActiveWallet, hasWallet } from '../../services/wallet';

export default function DAppConnectScreen() {
  const { navigate, isUnlocked } = useStore();
  const [origin, setOrigin] = useState('');
  const [status, setStatus] = useState('waiting'); // waiting | approved | denied

  useEffect(() => {
    // Get origin from URL params
    const params = new URLSearchParams(window.location.search);
    const o = params.get('origin') || '';
    setOrigin(o);
  }, []);

  const handleApprove = () => {
    const walletAddress = getActiveWallet();
    if (!walletAddress) {
      alert('No hay wallet activa. Crea o importa una wallet primero.');
      return;
    }

    setStatus('approved');

    // Send wallet info back to the opener (Kairos Exchange)
    if (window.opener) {
      window.opener.postMessage({
        type: 'KAIROS_WALLET_CONNECT',
        account: walletAddress,
        walletId: 'kairos',
      }, origin || '*');

      // Close popup after a short delay
      setTimeout(() => window.close(), 1000);
    } else {
      // If not a popup (redirect flow), go to returnUrl
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl');
      if (returnUrl) {
        const url = new URL(returnUrl);
        url.searchParams.set('kairosWallet', walletAddress);
        window.location.href = url.toString();
      }
    }
  };

  const handleDeny = () => {
    setStatus('denied');
    if (window.opener) {
      window.opener.postMessage({ type: 'KAIROS_WALLET_DENIED' }, origin || '*');
      setTimeout(() => window.close(), 500);
    } else {
      navigate('dashboard');
    }
  };

  const handleGoToDashboard = () => {
    // Clean URL and go to dashboard
    window.history.replaceState({}, '', '/');
    navigate('dashboard');
  };

  // If wallet is not unlocked, show message
  if (!isUnlocked) {
    return (
      <div className="screen-container items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-kairos-500/20 flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Desbloquea tu Wallet</h2>
          <p className="text-dark-300 text-sm mb-6">
            Desbloquea tu Kairos Wallet para conectarte a la aplicación.
          </p>
          <button
            onClick={() => navigate('unlock')}
            className="btn-primary w-full py-3 rounded-xl font-semibold"
          >
            Desbloquear
          </button>
        </div>
      </div>
    );
  }

  const walletAddress = getActiveWallet();
  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'No wallet';

  const siteName = origin ? new URL(origin).hostname : 'Aplicación desconocida';

  return (
    <div className="screen-container items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-kairos-500 to-kairos-600 flex items-center justify-center shadow-lg shadow-kairos-500/25">
            <span className="text-4xl font-bold text-dark-950">◆</span>
          </div>
          <h2 className="text-xl font-bold text-white">Solicitud de Conexión</h2>
        </div>

        {/* Connection info card */}
        <div className="bg-dark-900/60 border border-white/10 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-lg">🌐</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">{siteName}</p>
              <p className="text-dark-400 text-xs truncate max-w-[200px]">{origin}</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-dark-300 text-xs mb-3">Quiere conectarse con tu wallet:</p>
            <div className="flex items-center gap-3 bg-dark-800/60 rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-kairos-500/20 flex items-center justify-center">
                <span className="text-kairos-400 font-bold text-sm">◆</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Kairos Wallet</p>
                <p className="text-dark-400 text-xs font-mono">{shortAddr}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 mt-4 pt-4">
            <p className="text-dark-400 text-xs">Permisos solicitados:</p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-center gap-2 text-xs text-dark-300">
                <span className="text-green-400">✓</span> Ver dirección de tu wallet
              </li>
              <li className="flex items-center gap-2 text-xs text-dark-300">
                <span className="text-green-400">✓</span> Ver saldos de tokens
              </li>
              <li className="flex items-center gap-2 text-xs text-dark-300">
                <span className="text-red-400">✗</span> No puede mover tus fondos
              </li>
            </ul>
          </div>
        </div>

        {/* Status messages */}
        {status === 'approved' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
          >
            <p className="text-green-400 text-sm font-medium">✓ Conectado exitosamente</p>
            <p className="text-dark-400 text-xs mt-1">Esta ventana se cerrará automáticamente...</p>
          </motion.div>
        )}

        {status === 'denied' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <p className="text-red-400 text-sm font-medium">Conexión rechazada</p>
          </motion.div>
        )}

        {/* Action buttons */}
        {status === 'waiting' && (
          <div className="space-y-3">
            <button
              onClick={handleApprove}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-kairos-500 to-kairos-600 text-dark-950 font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-kairos-500/25"
            >
              Conectar Wallet
            </button>
            <button
              onClick={handleDeny}
              className="w-full py-3 rounded-xl bg-dark-800/60 border border-white/10 text-white/60 font-medium text-sm hover:text-white hover:border-white/20 transition-all"
            >
              Rechazar
            </button>
          </div>
        )}

        {/* Go to dashboard link */}
        <button
          onClick={handleGoToDashboard}
          className="w-full mt-4 text-center text-xs text-dark-400 hover:text-white transition-colors"
        >
          Ir al Dashboard →
        </button>
      </motion.div>
    </div>
  );
}
