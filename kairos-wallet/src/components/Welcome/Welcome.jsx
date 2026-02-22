// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Welcome Screen
//  First screen users see — premium onboarding
// ═══════════════════════════════════════════════════════

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Globe, ArrowRight, KeyRound, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../services/i18n';

export default function Welcome() {
  const navigate = useStore(s => s.navigate);
  const { t } = useTranslation();

  const features = [
    { icon: Shield, text: t('welcome.feat_security', 'Seguridad militar AES-256-GCM'), color: 'text-green-400' },
    { icon: Globe, text: t('welcome.feat_multichain', 'Multi-chain: BSC, ETH, Polygon y más'), color: 'text-blue-400' },
    { icon: Zap, text: t('welcome.feat_fast', 'Transacciones ultra-rápidas'), color: 'text-yellow-400' },
  ];

  return (
    <div className="screen-container px-6 py-8">
      {/* Logo + Brand */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative mb-8"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 w-28 h-28 rounded-full bg-kairos-500/20 blur-xl" />
          <img src="/icons/logo-128.png" alt="Kairos Wallet" className="w-28 h-28 relative z-10" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold mb-2"
        >
          <span className="kairos-text">Kairos</span>{' '}
          <span className="text-white">Wallet</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-dark-300 text-center text-sm mb-10 max-w-xs"
        >
          {t('welcome.subtitle', 'La wallet descentralizada de nueva generación. Tus claves, tus criptos, tu libertad.')}
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 mb-10 w-full max-w-xs"
        >
          {features.map((feat, i) => (
            <motion.div
              key={feat.text}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <feat.icon size={16} className={feat.color} />
              </div>
              <span className="text-sm text-dark-200">{feat.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="space-y-3 pb-4"
      >
        <button
          onClick={() => navigate('create')}
          className="kairos-button w-full flex items-center justify-center gap-2 py-4 text-base"
        >
          <Plus size={20} />
          {t('welcome.create')}
        </button>

        <button
          onClick={() => navigate('import')}
          className="glass-button w-full flex items-center justify-center gap-2 py-4 text-base text-white"
        >
          <KeyRound size={20} />
          {t('welcome.import')}
        </button>
      </motion.div>

      {/* Version */}
      <p className="text-center text-dark-500 text-xs mt-3">
        Kairos Wallet v1.0.0 — Powered by Kairos 777 Inc.
      </p>
    </div>
  );
}
