// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Unlock Screen
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Fingerprint } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { unlockVault, resetWallet } from '../../services/wallet';
import { useTranslation } from '../../services/i18n';

export default function UnlockScreen() {
  const { setUnlocked, navigate, showToast } = useStore();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStep, setResetStep] = useState(1);

  // Brute-force protection: exponential delay after 5+ attempts
  const isLockedOut = Date.now() < lockoutUntil;

  const handleUnlock = async () => {
    if (!password || isLockedOut) return;
    setIsUnlocking(true);
    
    try {
      const vault = await unlockVault(password);
      setUnlocked(vault, password);
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      showToast(t('unlock.wrong_password'), 'error');
      // Lockout after 5 failed attempts: 5s, 10s, 20s, 30s...
      if (newAttempts >= 5) {
        const delaySec = Math.min(30, 5 * Math.pow(2, newAttempts - 5));
        setLockoutUntil(Date.now() + delaySec * 1000);
        setTimeout(() => setLockoutUntil(0), delaySec * 1000);
      }
    }
    setIsUnlocking(false);
  };

  const handleReset = () => {
    setShowResetConfirm(true);
    setResetStep(1);
  };

  const handleResetConfirm = () => {
    if (resetStep === 1) {
      setResetStep(2);
    } else {
      resetWallet();
      navigate('welcome');
      showToast('Wallet eliminada', 'info');
      setShowResetConfirm(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div className="screen-container items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm text-center"
      >
        {/* Logo */}
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-kairos-500/20 blur-xl mx-auto" />
            <img src="/icons/logo-128.png" alt="Kairos" className="w-20 h-20 mx-auto relative" />
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold mb-1">
          <span className="kairos-text">Kairos</span> Wallet
        </h1>
        <p className="text-dark-400 text-sm mb-8">{t('unlock.enter_password', 'Ingresa tu contraseña para desbloquear')}</p>

        {/* Password Input */}
        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('unlock.password')}
            className="glass-input text-center pr-10 py-4"
            autoFocus
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {attempts > 0 && (
          <p className="text-red-400 text-xs mb-4">
            {isLockedOut
              ? `Demasiados intentos. Espera unos segundos...`
              : attempts >= 5 
                ? `${attempts} intentos fallidos. ¿Olvidaste tu contraseña?`
                : `Intento ${attempts} — Contraseña incorrecta`
            }
          </p>
        )}

        <button
          onClick={handleUnlock}
          disabled={isUnlocking || !password || isLockedOut}
          className="kairos-button w-full py-4 mb-4 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isUnlocking ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full"
            />
          ) : (
            <Fingerprint size={20} />
          )}
          {isUnlocking ? t('unlock.decrypting', 'Descifrando...') : isLockedOut ? 'Bloqueado...' : t('unlock.unlock')}
        </button>

        {attempts >= 3 && (
          <button
            onClick={handleReset}
            className="text-red-400/60 text-xs hover:text-red-400 transition-colors"
          >
            Eliminar wallet y restaurar con frase semilla
          </button>
        )}
      </motion.div>

      {/* Reset Wallet Confirmation Modal */}
      {showResetConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6"
          onClick={() => setShowResetConfirm(false)}
        >
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            className="glass-card w-full max-w-sm p-6 rounded-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-red-400 mb-3">
              {resetStep === 1 ? '⚠️ ¿Estás seguro?' : '⚠️ Última confirmación'}
            </h3>
            <p className="text-dark-300 text-sm mb-5">
              {resetStep === 1
                ? 'Esto eliminará tu wallet de este dispositivo. Necesitarás tu frase semilla para recuperarla.'
                : '¿ESTÁS COMPLETAMENTE SEGURO? No hay vuelta atrás.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowResetConfirm(false)} className="glass-button flex-1 py-3 text-center text-sm">Cancelar</button>
              <button onClick={handleResetConfirm}
                className="flex-1 py-3 text-sm font-semibold rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                {resetStep === 1 ? 'Continuar' : 'Sí, eliminar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
