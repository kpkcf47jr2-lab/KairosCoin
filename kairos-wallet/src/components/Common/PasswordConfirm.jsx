// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Reusable Password Confirmation Modal
//  Used by Send, Swap, Bridge, Approvals, WalletConnect
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { unlockVault } from '../../services/wallet';
import { useTranslation } from '../../services/i18n';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Show/hide the modal
 * @param {function} props.onConfirm - Called with password when confirmed
 * @param {function} props.onCancel - Called when cancelled
 * @param {string} [props.title] - Custom title
 * @param {string} [props.subtitle] - Custom subtitle text
 * @param {React.ReactNode} [props.details] - Optional detail component (tx summary)
 * @param {string} [props.confirmLabel] - Custom confirm button text
 * @param {boolean} [props.loading] - Show loading state on confirm
 */
export default function PasswordConfirm({
  isOpen,
  onConfirm,
  onCancel,
  title,
  subtitle,
  details,
  confirmLabel,
  loading = false,
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!password) {
      setError(t('error.enterPassword', 'Ingresa tu contraseña'));
      return;
    }
    
    setVerifying(true);
    setError('');
    
    try {
      await unlockVault(password);
      onConfirm(password);
    } catch {
      setError(t('error.wrongPassword', 'Contraseña incorrecta'));
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm bg-dark-900 rounded-2xl border border-white/5 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-kairos-400" />
              <h3 className="text-white font-bold">
                {title || t('confirm.title', 'Confirmar Acción')}
              </h3>
            </div>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/5">
              <X className="w-4 h-4 text-dark-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {subtitle && (
              <p className="text-dark-300 text-sm text-center">{subtitle}</p>
            )}

            {details && (
              <div className="bg-dark-800 rounded-xl p-3 text-sm">
                {details}
              </div>
            )}

            {/* Password input */}
            <div>
              <label className="text-dark-400 text-xs mb-1 block">
                {t('confirm.password', 'Contraseña de tu wallet')}
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && !verifying && !loading && handleConfirm()}
                  placeholder="••••••••"
                  className="input-dark w-full pr-10"
                  autoComplete="current-password"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-1">{error}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-4 border-t border-white/5">
            <button
              onClick={onCancel}
              className="flex-1 btn-secondary py-2.5"
              disabled={verifying || loading}
            >
              {t('action.cancel', 'Cancelar')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!password || verifying || loading}
              className="flex-1 btn-primary py-2.5 disabled:opacity-50"
            >
              {verifying || loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {verifying ? 'Verificando...' : 'Procesando...'}
                </span>
              ) : (
                confirmLabel || t('action.confirm', 'Confirmar')
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
