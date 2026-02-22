// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — PWA Install Prompt
//  Show install banner when app is installable
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

let deferredPrompt = null;

// Capture the install event globally
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new Event('kairos:installable'));
  });
}

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('kairos_pwa_dismissed')) return;

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // If deferred prompt already exists
    if (deferredPrompt) {
      setShow(true);
      return;
    }

    const handleInstallable = () => setShow(true);
    window.addEventListener('kairos:installable', handleInstallable);
    return () => window.removeEventListener('kairos:installable', handleInstallable);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setShow(false);
    if (outcome === 'accepted') {
      sessionStorage.setItem('kairos_pwa_dismissed', '1');
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem('kairos_pwa_dismissed', '1');
  };

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="mx-5 mb-3 bg-gradient-to-r from-kairos-500/20 to-kairos-600/10 rounded-2xl p-3 border border-kairos-500/20 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-kairos-500/20 flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-kairos-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">Instalar Kairos Wallet</p>
          <p className="text-[10px] text-dark-400">Acceso directo desde tu pantalla de inicio</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-kairos-500 text-dark-950 text-xs font-bold rounded-lg flex-shrink-0"
        >
          Instalar
        </button>
        <button onClick={handleDismiss} className="p-1 flex-shrink-0">
          <X size={14} className="text-dark-500" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
