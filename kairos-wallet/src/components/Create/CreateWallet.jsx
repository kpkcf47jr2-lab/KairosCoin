// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Create Wallet Flow
//  Generate mnemonic → backup → verify → set password
// ═══════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Copy, Check, Shield, AlertTriangle, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { generateMnemonic, createVault } from '../../services/wallet';

const STEPS = ['generate', 'backup', 'verify', 'password'];

export default function CreateWallet() {
  const { navigate, setUnlocked, showToast } = useStore();
  const [step, setStep] = useState(0);
  const [mnemonic] = useState(() => generateMnemonic(128));
  const [showSeed, setShowSeed] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [verifyWords, setVerifyWords] = useState({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [seedConfirmed, setSeedConfirmed] = useState(false);

  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);

  // Random words to verify
  const verifyIndices = useMemo(() => {
    const indices = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 12);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.sort((a, b) => a - b);
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(mnemonic);
    setHasCopied(true);
    showToast('Frase semilla copiada', 'success');
    setTimeout(() => setHasCopied(false), 3000);
  }, [mnemonic]);

  const isVerifyCorrect = verifyIndices.every(
    idx => verifyWords[idx]?.toLowerCase().trim() === words[idx]
  );

  const handleCreate = async () => {
    if (password.length < 8) return showToast('Mínimo 8 caracteres', 'error');
    if (password !== confirmPassword) return showToast('Las contraseñas no coinciden', 'error');
    
    setIsCreating(true);
    try {
      await createVault(mnemonic, password);
      const { unlockVault } = await import('../../services/wallet');
      const vault = await unlockVault(password);
      setUnlocked(vault, password);
      showToast('¡Wallet creada exitosamente! 🎉', 'success');
    } catch (err) {
      showToast('Error al crear wallet: ' + err.message, 'error');
    }
    setIsCreating(false);
  };

  const passwordStrength = useMemo(() => {
    if (password.length === 0) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    const levels = [
      { label: 'Muy débil', color: 'bg-red-500' },
      { label: 'Débil', color: 'bg-orange-500' },
      { label: 'Aceptable', color: 'bg-yellow-500' },
      { label: 'Fuerte', color: 'bg-green-500' },
      { label: 'Muy fuerte', color: 'bg-emerald-400' },
    ];
    return { score, ...levels[Math.min(score, 4)] };
  }, [password]);

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate('welcome')}
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Crear Wallet</h2>
          <p className="text-dark-400 text-xs">Paso {step + 1} de {STEPS.length}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
            <motion.div
              className="h-full bg-kairos-400"
              initial={{ width: '0%' }}
              animate={{ width: i <= step ? '100%' : '0%' }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {/* Step 1: Generate */}
        {step === 0 && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-kairos-400" />
                <h3 className="font-semibold text-sm">Frase Semilla de Recuperación</h3>
              </div>
              <p className="text-dark-300 text-xs leading-relaxed">
                Estas 12 palabras son la <strong className="text-white">ÚNICA forma</strong> de recuperar tu wallet.
                Escríbelas en papel y guárdalas en un lugar seguro.
                <strong className="text-red-400"> NUNCA las compartas con nadie.</strong>
              </p>
            </div>

            {/* Seed words */}
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-dark-400">Tu frase semilla</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSeed(!showSeed)}
                    className="flex items-center gap-1 text-xs text-kairos-400"
                  >
                    {showSeed ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showSeed ? 'Ocultar' : 'Revelar'}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-kairos-400"
                  >
                    {hasCopied ? <Check size={14} /> : <Copy size={14} />}
                    {hasCopied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {words.map((word, i) => (
                  <div key={i} className="seed-word">
                    <span className="text-dark-400 text-xs w-5">{i + 1}.</span>
                    <span className={showSeed ? 'text-white' : 'blur-sm select-none'}>
                      {word}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedConfirmed}
                  onChange={e => setSeedConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded accent-kairos-500"
                />
                <span className="text-xs text-dark-300">
                  He guardado mi frase semilla en un lugar seguro
                </span>
              </label>
              <button
                onClick={() => setStep(1)}
                disabled={!seedConfirmed}
                className="kairos-button w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Backup warning */}
        {step === 1 && (
          <motion.div
            key="backup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col items-center justify-center text-center"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <Shield size={40} className="text-red-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">⚠️ Recordatorio Importante</h3>
            <p className="text-dark-300 text-sm mb-2 max-w-xs">
              Si pierdes tu frase semilla, perderás acceso a tu wallet y todos tus fondos <strong className="text-white">para siempre</strong>.
            </p>
            <p className="text-dark-400 text-xs mb-8 max-w-xs">
              Kairos Wallet no almacena tu frase semilla. Solo tú tienes acceso.
            </p>
            <button
              onClick={() => setStep(2)}
              className="kairos-button w-full max-w-xs py-4"
            >
              Entendido, verificar ahora
            </button>
          </motion.div>
        )}

        {/* Step 3: Verify */}
        {step === 2 && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <h3 className="font-bold mb-2">Verifica tu frase semilla</h3>
            <p className="text-dark-400 text-xs mb-6">
              Ingresa las palabras en las posiciones indicadas
            </p>

            <div className="space-y-4 mb-8">
              {verifyIndices.map(idx => (
                <div key={idx}>
                  <label className="text-xs text-dark-400 mb-1 block">
                    Palabra #{idx + 1}
                  </label>
                  <input
                    type="text"
                    value={verifyWords[idx] || ''}
                    onChange={e => setVerifyWords(prev => ({ ...prev, [idx]: e.target.value }))}
                    placeholder={`Ingresa la palabra #${idx + 1}`}
                    className="glass-input font-mono"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <button
                onClick={() => setStep(3)}
                disabled={!isVerifyCorrect}
                className="kairos-button w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isVerifyCorrect ? '✓ Verificado — Continuar' : 'Verifica las palabras'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Password */}
        {step === 3 && (
          <motion.div
            key="password"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <div className="w-16 h-16 rounded-full bg-kairos-500/10 flex items-center justify-center mb-4 mx-auto">
              <Lock size={28} className="text-kairos-400" />
            </div>
            <h3 className="font-bold text-center mb-1">Protege tu Wallet</h3>
            <p className="text-dark-400 text-xs text-center mb-6">
              Esta contraseña encripta tu wallet en este dispositivo
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-dark-400 mb-1 block">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="glass-input pr-10"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i < passwordStrength.score ? passwordStrength.color : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="text-xs mt-1 text-dark-400">{passwordStrength.label}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-dark-400 mb-1 block">Confirmar contraseña</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="glass-input"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={handleCreate}
                disabled={isCreating || password.length < 8 || password !== confirmPassword}
                className="kairos-button w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full"
                    />
                    Creando wallet...
                  </>
                ) : (
                  'Crear Wallet'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
