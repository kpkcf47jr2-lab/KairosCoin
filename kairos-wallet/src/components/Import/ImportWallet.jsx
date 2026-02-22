// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Import Wallet
//  Import via seed phrase or private key
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Key, BookOpen, Eye, EyeOff, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { validateMnemonic, createVault, importFromPrivateKey } from '../../services/wallet';
import { encrypt } from '../../services/encryption';
import { STORAGE_KEYS } from '../../constants/chains';

export default function ImportWallet() {
  const { navigate, setUnlocked, showToast } = useStore();
  const [mode, setMode] = useState(null); // 'seed' | 'key'
  const [seedPhrase, setSeedPhrase] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportSeed = async () => {
    const cleanSeed = seedPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!validateMnemonic(cleanSeed)) return showToast('Frase semilla inválida', 'error');
    if (password.length < 8) return showToast('Mínimo 8 caracteres', 'error');
    if (password !== confirmPassword) return showToast('Las contraseñas no coinciden', 'error');

    setIsImporting(true);
    try {
      await createVault(cleanSeed, password);
      const { unlockVault } = await import('../../services/wallet');
      const vault = await unlockVault(password);
      setUnlocked(vault, password);
      showToast('¡Wallet importada exitosamente! 🎉', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
    setIsImporting(false);
  };

  const handleImportKey = async () => {
    if (password.length < 8) return showToast('Mínimo 8 caracteres', 'error');
    if (password !== confirmPassword) return showToast('Las contraseñas no coinciden', 'error');

    setIsImporting(true);
    try {
      const wallet = importFromPrivateKey(privateKey.trim());
      
      const vault = {
        version: 1,
        createdAt: Date.now(),
        mnemonic: null,
        accounts: [],
        importedAccounts: [{
          name: 'Wallet Importada',
          address: wallet.address,
          privateKey: wallet.privateKey,
          path: null,
          index: null,
          isImported: true,
          createdAt: Date.now(),
        }],
      };

      const encrypted = await encrypt(JSON.stringify(vault), password);
      localStorage.setItem(STORAGE_KEYS.ENCRYPTED_VAULT, encrypted);
      localStorage.setItem(STORAGE_KEYS.HAS_WALLET, 'true');
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET, wallet.address);
      
      setUnlocked(vault, password);
      showToast('¡Wallet importada exitosamente! 🎉', 'success');
    } catch (err) {
      showToast('Clave privada inválida', 'error');
    }
    setIsImporting(false);
  };

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => mode ? setMode(null) : navigate('welcome')}
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">Importar Wallet</h2>
      </div>

      {!mode ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col gap-4"
        >
          <p className="text-dark-300 text-sm mb-4">
            ¿Cómo deseas importar tu wallet?
          </p>

          <button
            onClick={() => setMode('seed')}
            className="glass-card p-5 text-left hover:border-kairos-500/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-kairos-500/10 flex items-center justify-center">
                <BookOpen size={20} className="text-kairos-400" />
              </div>
              <div>
                <h3 className="font-semibold">Frase Semilla</h3>
                <p className="text-dark-400 text-xs">12 o 24 palabras de recuperación</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('key')}
            className="glass-card p-5 text-left hover:border-kairos-500/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Key size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Clave Privada</h3>
                <p className="text-dark-400 text-xs">Clave hexadecimal de tu wallet</p>
              </div>
            </div>
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col"
        >
          {/* Secret input */}
          <div className="mb-4">
            <label className="text-xs text-dark-400 mb-1 block">
              {mode === 'seed' ? 'Frase Semilla' : 'Clave Privada'}
            </label>
            <div className="relative">
              {mode === 'seed' ? (
                <textarea
                  value={seedPhrase}
                  onChange={e => setSeedPhrase(e.target.value)}
                  placeholder="Ingresa tus 12 o 24 palabras separadas por espacios"
                  className="glass-input font-mono text-sm h-28 resize-none pr-10"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  style={{ WebkitTextSecurity: showSecret ? 'none' : 'disc' }}
                />
              ) : (
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={privateKey}
                  onChange={e => setPrivateKey(e.target.value)}
                  placeholder="0x..."
                  className="glass-input font-mono text-sm pr-10"
                  autoComplete="off"
                />
              )}
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-3 text-dark-400"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-3 mb-6">
            <div>
              <label className="text-xs text-dark-400 mb-1 block">Nueva contraseña</label>
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
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={mode === 'seed' ? handleImportSeed : handleImportKey}
              disabled={isImporting || password.length < 8 || password !== confirmPassword}
              className="kairos-button w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full"
                  />
                  Importando...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Importar y Encriptar
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
