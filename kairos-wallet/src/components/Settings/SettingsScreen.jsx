// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Settings Screen
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Shield, Globe, Bell, Palette, Info,
  ChevronRight, LogOut, Trash2, Key, Plus, Copy, Check, ExternalLink, Eye, EyeOff, AlertTriangle, Link2, FileText, Edit3, ShieldCheck, Clock, Binoculars, Fuel, Coins, Lock, Search, Cloud, CloudUpload, CloudDownload, Loader2
} from 'lucide-react';
import { createBackup, restoreBackup, checkBackupExists, deleteBackup } from '../../services/cloudBackup';
import { STORAGE_KEYS } from '../../constants/chains';
import { useStore } from '../../store/useStore';
import { formatAddress, resetWallet, addAccount, unlockVault, importWatchOnly, isValidAddress, changePassword } from '../../services/wallet';
import { CHAINS } from '../../constants/chains';
import { APP_VERSION } from '../../constants/chains';
import {
  getAutoLockTimeout, setAutoLockTimeout, getAutoLockOptions,
  isBiometricAvailable, isBiometricEnabled, enrollBiometric, removeBiometric,
} from '../../services/autolock';
import { getLanguage, setLanguage, getAvailableLanguages, t, useTranslation } from '../../services/i18n';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const {
    activeAddress, activeChainId, goBack, navigate, lock, showToast,
    getAllAccounts, setActiveAddress, vault,
  } = useStore();
  const [showAccounts, setShowAccounts] = useState(false);
  const [hasCopied, setHasCopied] = useState(null);
  const [showExportKey, setShowExportKey] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportedKey, setExportedKey] = useState(null);
  const [exportError, setExportError] = useState('');
  const [showKeyVisible, setShowKeyVisible] = useState(false);
  const [autoLockMs, setAutoLockMs] = useState(getAutoLockTimeout());
  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled());
  const [currentLang, setCurrentLang] = useState(getLanguage());
  const [showBackupSeed, setShowBackupSeed] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [revealedSeed, setRevealedSeed] = useState(null);
  const [backupError, setBackupError] = useState('');
  const [seedVisible, setSeedVisible] = useState(false);

  // Modal states for Add Account & Reset Wallet
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [addAccountPwd, setAddAccountPwd] = useState('');
  const [addAccountError, setAddAccountError] = useState('');
  const [addAccountLoading, setAddAccountLoading] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = first confirm, 2 = second confirm

  // Watch-only modal
  const [showWatchOnlyModal, setShowWatchOnlyModal] = useState(false);
  const [watchOnlyAddress, setWatchOnlyAddress] = useState('');
  const [watchOnlyName, setWatchOnlyName] = useState('');
  const [watchOnlyPwd, setWatchOnlyPwd] = useState('');
  const [watchOnlyError, setWatchOnlyError] = useState('');
  const [watchOnlyLoading, setWatchOnlyLoading] = useState(false);
  const [renameAddress, setRenameAddress] = useState(null);
  const [renameName, setRenameName] = useState('');
  // Change password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdLoading, setChangePwdLoading] = useState(false);

  // Cloud backup states
  const [showCloudBackup, setShowCloudBackup] = useState(false);
  const [cloudTab, setCloudTab] = useState('backup'); // 'backup' | 'restore'
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudRestoreAddr, setCloudRestoreAddr] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [cloudSuccess, setCloudSuccess] = useState('');
  const [backupExists, setBackupExists] = useState(null);

  const accounts = getAllAccounts();
  const chain = CHAINS[activeChainId];

  const handleCopyAddress = async (address) => {
    await navigator.clipboard.writeText(address);
    setHasCopied(address);
    showToast(t('common.copied'), 'success');
    setTimeout(() => setHasCopied(null), 2000);
  };

  const handleAddAccount = async () => {
    setShowAddAccountModal(true);
    setAddAccountPwd('');
    setAddAccountError('');
  };

  const handleAddAccountSubmit = async () => {
    if (!addAccountPwd) return;
    setAddAccountLoading(true);
    setAddAccountError('');
    try {
      const result = await addAccount(addAccountPwd, `Wallet ${accounts.length + 1}`);
      showToast(`Nueva wallet creada: ${formatAddress(result.address)}`, 'success');
      setShowAddAccountModal(false);
    } catch (err) {
      setAddAccountError(err.message || 'Contraseña incorrecta');
    }
    setAddAccountLoading(false);
  };

  const handleResetWallet = () => {
    setShowResetModal(true);
    setResetStep(1);
  };

  const handleResetConfirm = () => {
    if (resetStep === 1) {
      setResetStep(2);
    } else {
      resetWallet();
      navigate('welcome');
      showToast('Wallet eliminada', 'info');
      setShowResetModal(false);
    }
  };

  const handleViewExplorer = () => {
    window.open(`${chain.blockExplorerUrl}/address/${activeAddress}`, '_blank');
  };

  const handleExportPrivateKey = async () => {
    setExportError('');
    try {
      const vault = await unlockVault(exportPassword);
      const allAccounts = [...(vault.accounts || []), ...(vault.importedAccounts || [])];
      const currentAccount = allAccounts.find(a => a.address.toLowerCase() === activeAddress?.toLowerCase());
      if (!currentAccount) throw new Error('Cuenta no encontrada');
      setExportedKey(currentAccount.privateKey);
    } catch (err) {
      setExportError(err.message || 'Contraseña incorrecta');
    }
  };

  const handleCloseExport = () => {
    setShowExportKey(false);
    setExportPassword('');
    setExportedKey(null);
    setExportError('');
    setShowKeyVisible(false);
  };

  const handleWatchOnlySubmit = async () => {
    if (!watchOnlyPwd || !watchOnlyAddress) return;
    setWatchOnlyLoading(true);
    setWatchOnlyError('');
    try {
      if (!isValidAddress(watchOnlyAddress)) throw new Error('Dirección inválida');
      const result = await importWatchOnly(watchOnlyPwd, watchOnlyAddress, watchOnlyName || undefined);
      showToast(`Watch-only añadida: ${formatAddress(result.address)}`, 'success');
      setShowWatchOnlyModal(false);
      setWatchOnlyAddress('');
      setWatchOnlyName('');
      setWatchOnlyPwd('');
    } catch (err) {
      setWatchOnlyError(err.message);
    }
    setWatchOnlyLoading(false);
  };

  const handleCopyKey = async () => {
    if (exportedKey) {
      await navigator.clipboard.writeText(exportedKey);
      showToast('Clave privada copiada', 'success');
    }
  };

  const sections = [
    {
      title: t('settings.accounts'),
      items: [
        {
          icon: User,
          label: t('settings.accounts'),
          desc: `${accounts.length} wallet${accounts.length !== 1 ? 's' : ''}`,
          action: () => setShowAccounts(!showAccounts),
          color: 'text-blue-400',
        },
        {
          icon: ExternalLink,
          label: t('settings.explorer'),
          desc: chain.shortName + 'Scan',
          action: handleViewExplorer,
          color: 'text-green-400',
        },
      ],
    },
    {
      title: t('settings.security'),
      items: [
        {
          icon: Shield,
          label: t('settings.security'),
          desc: t('settings.encryption'),
          color: 'text-purple-400',
        },
        {
          icon: Key,
          label: t('settings.export_key'),
          desc: t('settings.requires_password'),
          action: () => setShowExportKey(true),
          color: 'text-orange-400',
        },
        {
          icon: FileText,
          label: t('settings.backup_seed', 'Frase Semilla'),
          desc: t('settings.backup_seed_desc', 'Ver tu frase de recuperación'),
          action: () => setShowBackupSeed(true),
          color: 'text-yellow-400',
        },
        {
          icon: Cloud,
          label: 'Backup en la Nube',
          desc: 'Respalda tu wallet encriptada',
          action: async () => {
            setShowCloudBackup(true);
            setCloudTab('backup');
            setCloudPassword('');
            setCloudError('');
            setCloudSuccess('');
            try {
              const check = await checkBackupExists(activeAddress);
              setBackupExists(check);
            } catch { setBackupExists({ exists: false }); }
          },
          color: 'text-sky-400',
        },
        {
          icon: Lock,
          label: 'Cambiar Contraseña',
          desc: 'Actualiza tu contraseña del vault',
          action: () => setShowChangePassword(true),
          color: 'text-pink-400',
        },
        {
          icon: Shield,
          label: t('settings.autolock'),
          desc: getAutoLockOptions().find(o => o.value === autoLockMs)?.label || '5 minutos',
          action: () => {
            // Cycle through options
            const options = getAutoLockOptions();
            const idx = options.findIndex(o => o.value === autoLockMs);
            const next = options[(idx + 1) % options.length];
            setAutoLockTimeout(next.value);
            setAutoLockMs(next.value);
            showToast(`Auto-lock: ${next.label}`, 'info');
          },
          color: 'text-cyan-400',
        },
        ...(isBiometricAvailable() ? [{
          icon: Shield,
          label: t('settings.biometric'),
          desc: biometricOn ? t('settings.biometric_on', 'Activada') : t('settings.biometric_off', 'Desactivada'),
          action: async () => {
            if (biometricOn) {
              removeBiometric();
              setBiometricOn(false);
              showToast('Biometría desactivada', 'info');
            } else {
              try {
                await enrollBiometric();
                setBiometricOn(true);
                showToast('Biometría activada', 'success');
              } catch (err) {
                showToast('Error: ' + err.message, 'error');
              }
            }
          },
          color: 'text-green-400',
        }] : []),
      ],
    },
    {
      title: t('settings.general', 'General'),
      items: [
        {
          icon: Clock,
          label: 'TX Pendientes',
          desc: 'Acelerar o cancelar transacciones',
          action: () => navigate('pending'),
          color: 'text-yellow-400',
        },
        {
          icon: Binoculars,
          label: 'Watch-Only',
          desc: 'Importar dirección de solo lectura',
          action: () => setShowWatchOnlyModal(true),
          color: 'text-teal-400',
        },
        {
          icon: Link2,
          label: t('settings.walletconnect'),
          desc: t('settings.connect_dapps'),
          action: () => navigate('walletconnect'),
          color: 'text-blue-400',
        },
        {
          icon: Globe,
          label: t('settings.network'),
          desc: `${chain.icon} ${chain.name}`,
          action: () => navigate('networks'),
          color: 'text-cyan-400',
        },
        {
          icon: ShieldCheck,
          label: t('settings.approvals', 'Aprobaciones'),
          desc: t('settings.approvals_desc', 'Gestionar permisos de tokens'),
          action: () => navigate('approvals'),
          color: 'text-orange-400',
        },
        {
          icon: Coins,
          label: 'Staking Hub',
          desc: 'Lido, PancakeSwap, GMX — gana yield',
          action: () => navigate('staking'),
          color: 'text-green-400',
        },
        {
          icon: Fuel,
          label: 'Gas Tracker',
          desc: 'Precios de gas en todas las redes',
          action: () => navigate('gas'),
          color: 'text-amber-400',
        },
        {
          icon: Search,
          label: 'Auditoría de Token',
          desc: 'Analiza tokens por scams/honeypots',
          action: () => navigate('tokenaudit'),
          color: 'text-red-400',
        },
        {
          icon: Fuel,
          label: 'RPC Health',
          desc: 'Estado de nodos RPC + latencia',
          action: () => navigate('rpchealth'),
          color: 'text-cyan-400',
        },
        {
          icon: Globe,
          label: t('settings.language'),
          desc: getAvailableLanguages().find(l => l.code === currentLang)?.flag + ' ' + getAvailableLanguages().find(l => l.code === currentLang)?.name,
          action: () => {
            const langs = getAvailableLanguages();
            const idx = langs.findIndex(l => l.code === currentLang);
            const next = langs[(idx + 1) % langs.length];
            setLanguage(next.code);
            setCurrentLang(next.code);
            showToast(`${next.flag} ${next.name}`, 'info');
          },
          color: 'text-pink-400',
        },
        {
          icon: Info,
          label: t('settings.about'),
          desc: `v${APP_VERSION} — Kairos 777 Inc.`,
          color: 'text-kairos-400',
        },
      ],
    },
    {
      title: t('settings.danger', 'Peligro'),
      items: [
        {
          icon: LogOut,
          label: t('settings.lock'),
          desc: t('settings.lock_desc'),
          action: lock,
          color: 'text-yellow-400',
        },
        {
          icon: Trash2,
          label: t('settings.delete'),
          desc: t('settings.delete_desc'),
          action: handleResetWallet,
          color: 'text-red-400',
          danger: true,
        },
      ],
    },
  ];

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={goBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">{t('settings.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 -mx-1 px-1">
        {sections.map(section => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <div className="glass-card overflow-hidden">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-all text-left ${
                    i > 0 ? 'border-t border-white/5' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl ${item.danger ? 'bg-red-500/10' : 'bg-white/5'} flex items-center justify-center`}>
                    <item.icon size={16} className={item.color} />
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${item.danger ? 'text-red-400' : ''}`}>{item.label}</span>
                    {item.desc && <p className="text-dark-400 text-xs">{item.desc}</p>}
                  </div>
                  <ChevronRight size={16} className="text-dark-500" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Accounts panel */}
        {showAccounts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass-card-strong p-4"
          >
            <h4 className="text-sm font-semibold mb-3">Mis Wallets</h4>
            <div className="space-y-2">
              {accounts.map(acc => (
                <div
                  key={acc.address}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                    acc.address === activeAddress ? 'bg-kairos-500/10 border border-kairos-500/20' : 'hover:bg-white/5'
                  }`}
                  onClick={() => setActiveAddress(acc.address)}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kairos-400 to-kairos-600 flex items-center justify-center text-xs font-bold text-dark-950">
                    {acc.name?.charAt(0) || 'W'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium truncate">{acc.name}</p>
                      {acc.isWatchOnly && (
                        <span className="text-[8px] bg-teal-500/15 text-teal-400 px-1.5 py-0.5 rounded font-bold">👁 WATCH</span>
                      )}
                      {acc.isImported && (
                        <span className="text-[8px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded font-bold">IMPORTADA</span>
                      )}
                    </div>
                    <p className="text-dark-400 text-xs font-mono">{formatAddress(acc.address, 6)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyAddress(acc.address); }}
                    className="text-dark-400"
                  >
                    {hasCopied === acc.address ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRenameAddress(acc.address); setRenameName(acc.name || ''); }}
                    className="text-dark-400 hover:text-dark-200 p-1"
                  >
                    <Edit3 size={14} />
                  </button>
                  {acc.address === activeAddress && (
                    <div className="w-2 h-2 rounded-full bg-kairos-400" />
                  )}
                </div>
              ))}

              <button
                onClick={handleAddAccount}
                className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-white/10 text-dark-400 hover:text-white hover:border-kairos-500/30 transition-all"
              >
                <Plus size={16} />
                <span className="text-sm">Agregar Wallet</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Rename Account Modal */}
        <AnimatePresence>
          {renameAddress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
              onClick={() => setRenameAddress(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="glass-card-strong p-5 w-full max-w-sm"
              >
                <h3 className="text-base font-bold mb-3">Renombrar Cuenta</h3>
                <input
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  placeholder="Nombre de la cuenta"
                  className="glass-input mb-3 text-sm"
                  autoFocus
                  maxLength={30}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setRenameAddress(null)}
                    className="glass-button flex-1 py-2.5 text-center text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!vault || !renameName.trim()) return;
                      // Update name in vault
                      const accs = vault.accounts || [];
                      const imported = vault.importedAccounts || [];
                      for (const a of [...accs, ...imported]) {
                        if (a.address.toLowerCase() === renameAddress.toLowerCase()) {
                          a.name = renameName.trim();
                          break;
                        }
                      }
                      showToast(`Renombrado a "${renameName.trim()}"`, 'success');
                      setRenameAddress(null);
                    }}
                    disabled={!renameName.trim()}
                    className="kairos-button flex-1 py-2.5 text-sm disabled:opacity-40"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Private Key Modal */}
        <AnimatePresence>
          {showExportKey && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
              onClick={handleCloseExport}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card-strong p-6 w-full max-w-sm"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold mb-1">Exportar Clave Privada</h3>
                <p className="text-dark-400 text-xs mb-4">{formatAddress(activeAddress)}</p>

                {!exportedKey ? (
                  <>
                    <div className="glass-card p-3 mb-4 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-dark-300">
                        Nunca compartas tu clave privada. Cualquiera con ella tiene control total de tus fondos.
                      </p>
                    </div>
                    <input
                      type="password"
                      value={exportPassword}
                      onChange={e => { setExportPassword(e.target.value); setExportError(''); }}
                      placeholder="Ingresa tu contraseña"
                      className="glass-input mb-3 text-sm"
                      autoFocus
                    />
                    {exportError && <p className="text-red-400 text-xs mb-3">{exportError}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleCloseExport} className="glass-button flex-1 py-3 text-center text-sm">Cancelar</button>
                      <button
                        onClick={handleExportPrivateKey}
                        disabled={!exportPassword}
                        className="kairos-button flex-1 py-3 text-sm disabled:opacity-40"
                      >Desbloquear</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="glass-card p-3 mb-4 flex items-start gap-2 border border-red-500/30">
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-red-300 font-medium">
                        NO compartas esta clave. Cualquiera con ella puede robar todos tus fondos.
                      </p>
                    </div>
                    <div className="bg-dark-900/80 rounded-xl p-3 mb-4 relative">
                      <p className="font-mono text-xs break-all select-all" style={{ filter: showKeyVisible ? 'none' : 'blur(5px)' }}>
                        {exportedKey}
                      </p>
                      <button
                        onClick={() => setShowKeyVisible(!showKeyVisible)}
                        className="absolute top-2 right-2 text-dark-400"
                      >
                        {showKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCloseExport} className="glass-button flex-1 py-3 text-center text-sm">Cerrar</button>
                      <button onClick={handleCopyKey} className="kairos-button flex-1 py-3 text-sm flex items-center justify-center gap-1">
                        <Copy size={14} /> Copiar
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center pb-4">
          <img src="/icons/logo-128.png" alt="Kairos" className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-dark-500 text-[10px]">
            Kairos Wallet v{APP_VERSION}<br />
            © 2026 Kairos 777 Inc. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Backup Seed Phrase Modal */}
      <AnimatePresence>
        {showBackupSeed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
            onClick={() => { setShowBackupSeed(false); setBackupPassword(''); setRevealedSeed(null); setBackupError(''); setSeedVisible(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card-strong p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-1">{t('settings.backup_seed', 'Frase Semilla')}</h3>
              <p className="text-dark-400 text-xs mb-4">{t('settings.backup_seed_modal_desc', 'Tu frase de recuperación de 12 palabras')}</p>

              {!revealedSeed ? (
                <>
                  <div className="glass-card p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-dark-300">
                      {t('settings.seed_warning', 'Nunca compartas tu frase semilla. Cualquiera con ella tiene control total de tus fondos.')}
                    </p>
                  </div>
                  <input
                    type="password"
                    value={backupPassword}
                    onChange={e => { setBackupPassword(e.target.value); setBackupError(''); }}
                    placeholder={t('unlock.password')}
                    className="glass-input mb-3 text-sm"
                    autoFocus
                  />
                  {backupError && <p className="text-red-400 text-xs mb-3">{backupError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => { setShowBackupSeed(false); setBackupPassword(''); setBackupError(''); }} className="glass-button flex-1 py-3 text-center text-sm">{t('common.cancel')}</button>
                    <button
                      onClick={async () => {
                        setBackupError('');
                        try {
                          const vault = await unlockVault(backupPassword);
                          if (vault.mnemonic) {
                            setRevealedSeed(vault.mnemonic);
                          } else {
                            setBackupError(t('settings.no_seed', 'Wallet importada sin frase semilla'));
                          }
                        } catch {
                          setBackupError(t('unlock.wrong_password'));
                        }
                      }}
                      disabled={!backupPassword}
                      className="kairos-button flex-1 py-3 text-sm disabled:opacity-40"
                    >{t('unlock.unlock')}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="glass-card p-3 mb-4 flex items-start gap-2 border border-red-500/30">
                    <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-300 font-medium">
                      {t('settings.seed_danger', 'NO compartas estas palabras. Escríbelas en papel y guárdalas en un lugar seguro.')}
                    </p>
                  </div>
                  <div className="bg-dark-900/80 rounded-xl p-4 mb-4 relative">
                    <div className={`grid grid-cols-3 gap-2 ${seedVisible ? '' : 'blur-sm'}`}>
                      {revealedSeed.split(' ').map((word, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-dark-500 w-4 text-right">{i + 1}</span>
                          <span className="text-xs font-mono text-white">{word}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setSeedVisible(!seedVisible)}
                      className="absolute top-2 right-2 text-dark-400 p-1"
                    >
                      {seedVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowBackupSeed(false); setBackupPassword(''); setRevealedSeed(null); setSeedVisible(false); }} className="glass-button flex-1 py-3 text-center text-sm">{t('common.close')}</button>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(revealedSeed);
                        showToast(t('common.copied'), 'success');
                      }}
                      className="kairos-button flex-1 py-3 text-sm flex items-center justify-center gap-1"
                    >
                      <Copy size={14} /> {t('common.copy')}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── Add Account Password Modal ── */}
        {showAddAccountModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6"
            onClick={() => setShowAddAccountModal(false)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="glass-card w-full max-w-sm p-6 rounded-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4">
                <Plus size={18} className="text-kairos-400" />
                <h3 className="font-bold text-white">Nueva Wallet</h3>
              </div>
              <p className="text-dark-400 text-sm mb-4">Ingresa tu contraseña para crear una nueva wallet:</p>
              <input
                type="password"
                value={addAccountPwd}
                onChange={e => setAddAccountPwd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddAccountSubmit()}
                placeholder="Contraseña"
                className="glass-input w-full py-3 mb-2"
                autoFocus
              />
              {addAccountError && <p className="text-red-400 text-xs mb-2">{addAccountError}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowAddAccountModal(false)} className="glass-button flex-1 py-3 text-center text-sm">Cancelar</button>
                <button onClick={handleAddAccountSubmit} disabled={!addAccountPwd || addAccountLoading}
                  className="kairos-button flex-1 py-3 text-sm disabled:opacity-40">
                  {addAccountLoading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Reset Wallet Confirmation Modal ── */}
        {showResetModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6"
            onClick={() => setShowResetModal(false)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="glass-card w-full max-w-sm p-6 rounded-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-red-400" />
                <h3 className="font-bold text-red-400">{resetStep === 1 ? '⚠️ PELIGRO' : '¿ESTÁS SEGURO?'}</h3>
              </div>
              <p className="text-dark-300 text-sm mb-6">
                {resetStep === 1
                  ? 'Esto eliminará tu wallet de este dispositivo permanentemente. ¿Tienes tu frase semilla guardada?'
                  : '¿ESTÁS COMPLETAMENTE SEGURO? No hay vuelta atrás. Tu wallet será eliminada permanentemente.'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowResetModal(false)} className="glass-button flex-1 py-3 text-center text-sm">Cancelar</button>
                <button onClick={handleResetConfirm}
                  className="flex-1 py-3 text-sm font-semibold rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                  {resetStep === 1 ? 'Continuar' : 'Sí, eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Watch-Only Import Modal ── */}
        {showWatchOnlyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6"
            onClick={() => setShowWatchOnlyModal(false)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="glass-card w-full max-w-sm p-6 rounded-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4">
                <Binoculars size={18} className="text-teal-400" />
                <h3 className="font-bold text-white">Importar Watch-Only</h3>
              </div>
              <p className="text-dark-400 text-xs mb-4">
                Solo lectura — puedes ver balances e historial pero no enviar transacciones.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={watchOnlyAddress}
                  onChange={e => setWatchOnlyAddress(e.target.value)}
                  placeholder="0x... dirección"
                  className="glass-input w-full text-sm font-mono"
                  autoFocus
                />
                <input
                  type="text"
                  value={watchOnlyName}
                  onChange={e => setWatchOnlyName(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className="glass-input w-full text-sm"
                />
                <input
                  type="password"
                  value={watchOnlyPwd}
                  onChange={e => setWatchOnlyPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleWatchOnlySubmit()}
                  placeholder="Contraseña"
                  className="glass-input w-full text-sm"
                />
              </div>
              {watchOnlyError && <p className="text-red-400 text-xs mt-2">{watchOnlyError}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowWatchOnlyModal(false)} className="glass-button flex-1 py-3 text-center text-sm">Cancelar</button>
                <button onClick={handleWatchOnlySubmit} disabled={!watchOnlyPwd || !watchOnlyAddress || watchOnlyLoading}
                  className="kairos-button flex-1 py-3 text-sm disabled:opacity-40">
                  {watchOnlyLoading ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Cloud Backup Modal ── */}
        {showCloudBackup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6"
            onClick={() => setShowCloudBackup(false)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="glass-card w-full max-w-sm p-6 rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4">
                <Cloud size={18} className="text-sky-400" />
                <h3 className="font-bold text-white">Backup en la Nube</h3>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
                <button
                  onClick={() => { setCloudTab('backup'); setCloudError(''); setCloudSuccess(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    cloudTab === 'backup' ? 'bg-sky-500/20 text-sky-400' : 'text-dark-400 hover:text-white'
                  }`}
                >
                  <CloudUpload size={14} /> Respaldar
                </button>
                <button
                  onClick={() => { setCloudTab('restore'); setCloudError(''); setCloudSuccess(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    cloudTab === 'restore' ? 'bg-green-500/20 text-green-400' : 'text-dark-400 hover:text-white'
                  }`}
                >
                  <CloudDownload size={14} /> Restaurar
                </button>
              </div>

              {cloudTab === 'backup' ? (
                <>
                  {backupExists?.exists && (
                    <div className="glass-card p-3 mb-3 flex items-start gap-2 border border-sky-500/20">
                      <Cloud size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
                      <div className="text-[11px]">
                        <p className="text-sky-300 font-medium">Backup existente</p>
                        <p className="text-dark-400">Último: {new Date(backupExists.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-dark-400 text-xs mb-3">
                    Tu vault se encriptará con doble capa (AES-256-GCM) antes de subir al servidor. Solo tú podrás desencriptarlo con tu contraseña de backup.
                  </p>
                  <input
                    type="password"
                    value={cloudPassword}
                    onChange={e => { setCloudPassword(e.target.value); setCloudError(''); }}
                    placeholder="Contraseña de backup (mín. 8 chars)"
                    className="glass-input w-full text-sm mb-3"
                    autoFocus
                  />
                  {cloudError && <p className="text-red-400 text-xs mb-2">{cloudError}</p>}
                  {cloudSuccess && <p className="text-green-400 text-xs mb-2">{cloudSuccess}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setShowCloudBackup(false)} className="glass-button flex-1 py-3 text-center text-sm">Cancelar</button>
                    <button
                      onClick={async () => {
                        if (cloudPassword.length < 8) { setCloudError('Mínimo 8 caracteres'); return; }
                        setCloudLoading(true); setCloudError(''); setCloudSuccess('');
                        try {
                          const encryptedVault = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_VAULT);
                          if (!encryptedVault) throw new Error('No hay vault local');
                          await createBackup(activeAddress, encryptedVault, cloudPassword);
                          setCloudSuccess('✅ Backup creado exitosamente');
                          setBackupExists({ exists: true, timestamp: new Date().toISOString() });
                          showToast('Backup en la nube creado', 'success');
                        } catch (err) {
                          setCloudError(err.message || 'Error al crear backup');
                        }
                        setCloudLoading(false);
                      }}
                      disabled={!cloudPassword || cloudLoading}
                      className="kairos-button flex-1 py-3 text-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {cloudLoading ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</> : <><CloudUpload size={14} /> Respaldar</>}
                    </button>
                  </div>
                  {backupExists?.exists && (
                    <button
                      onClick={async () => {
                        if (!confirm('¿Eliminar el backup de la nube?')) return;
                        setCloudLoading(true);
                        try {
                          await deleteBackup(activeAddress, cloudPassword);
                          setBackupExists({ exists: false });
                          showToast('Backup eliminado', 'info');
                        } catch (err) {
                          setCloudError(err.message);
                        }
                        setCloudLoading(false);
                      }}
                      className="w-full mt-3 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Eliminar backup de la nube
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-dark-400 text-xs mb-3">
                    Restaura tu wallet desde un backup en la nube. Necesitas la dirección y la contraseña de backup que usaste.
                  </p>
                  <input
                    type="text"
                    value={cloudRestoreAddr}
                    onChange={e => { setCloudRestoreAddr(e.target.value); setCloudError(''); }}
                    placeholder="0x... dirección de la wallet"
                    className="glass-input w-full text-sm font-mono mb-2"
                  />
                  <input
                    type="password"
                    value={cloudPassword}
                    onChange={e => { setCloudPassword(e.target.value); setCloudError(''); }}
                    placeholder="Contraseña de backup"
                    className="glass-input w-full text-sm mb-3"
                  />
                  {cloudError && <p className="text-red-400 text-xs mb-2">{cloudError}</p>}
                  {cloudSuccess && <p className="text-green-400 text-xs mb-2">{cloudSuccess}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setShowCloudBackup(false)} className="glass-button flex-1 py-3 text-center text-sm">Cancelar</button>
                    <button
                      onClick={async () => {
                        if (!cloudRestoreAddr || !cloudPassword) { setCloudError('Completa todos los campos'); return; }
                        setCloudLoading(true); setCloudError(''); setCloudSuccess('');
                        try {
                          const result = await restoreBackup(cloudRestoreAddr, cloudPassword);
                          // Save the decrypted vault to localStorage
                          localStorage.setItem(STORAGE_KEYS.ENCRYPTED_VAULT, result.vault);
                          localStorage.setItem(STORAGE_KEYS.HAS_WALLET, 'true');
                          setCloudSuccess('✅ Wallet restaurada. Recarga la app.');
                          showToast('Wallet restaurada desde la nube', 'success');
                        } catch (err) {
                          setCloudError(err.message || 'Error al restaurar');
                        }
                        setCloudLoading(false);
                      }}
                      disabled={!cloudRestoreAddr || !cloudPassword || cloudLoading}
                      className="kairos-button flex-1 py-3 text-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {cloudLoading ? <><Loader2 size={14} className="animate-spin" /> Restaurando...</> : <><CloudDownload size={14} /> Restaurar</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── Change Password Modal ── */}
        {showChangePassword && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6"
            onClick={() => setShowChangePassword(false)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="glass-card w-full max-w-sm p-6 rounded-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4">
                <Lock size={18} className="text-pink-400" />
                <h3 className="font-bold text-white">Cambiar Contraseña</h3>
              </div>
              <p className="text-dark-400 text-xs mb-4">
                La nueva contraseña protegerá tu vault. Mínimo 8 caracteres.
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  value={oldPwd}
                  onChange={e => setOldPwd(e.target.value)}
                  placeholder="Contraseña actual"
                  className="glass-input w-full text-sm"
                  autoFocus
                />
                <input
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Nueva contraseña (mín. 8 chars)"
                  className="glass-input w-full text-sm"
                />
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      // handleChangePassword inline
                      (async () => {
                        if (newPwd !== confirmPwd) { setChangePwdError('Las contraseñas no coinciden'); return; }
                        setChangePwdLoading(true);
                        setChangePwdError('');
                        try {
                          await changePassword(oldPwd, newPwd);
                          showToast('✅ Contraseña cambiada exitosamente', 'success');
                          setShowChangePassword(false);
                          setOldPwd(''); setNewPwd(''); setConfirmPwd('');
                        } catch (err) {
                          setChangePwdError(err.message);
                        }
                        setChangePwdLoading(false);
                      })();
                    }
                  }}
                  placeholder="Confirmar nueva contraseña"
                  className="glass-input w-full text-sm"
                />
              </div>
              {changePwdError && <p className="text-red-400 text-xs mt-2">{changePwdError}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setShowChangePassword(false); setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setChangePwdError(''); }} className="glass-button flex-1 py-3 text-center text-sm">Cancelar</button>
                <button onClick={async () => {
                  if (newPwd !== confirmPwd) { setChangePwdError('Las contraseñas no coinciden'); return; }
                  setChangePwdLoading(true);
                  setChangePwdError('');
                  try {
                    await changePassword(oldPwd, newPwd);
                    showToast('✅ Contraseña cambiada exitosamente', 'success');
                    setShowChangePassword(false);
                    setOldPwd(''); setNewPwd(''); setConfirmPwd('');
                  } catch (err) {
                    setChangePwdError(err.message);
                  }
                  setChangePwdLoading(false);
                }} disabled={!oldPwd || !newPwd || !confirmPwd || changePwdLoading}
                  className="kairos-button flex-1 py-3 text-sm disabled:opacity-40">
                  {changePwdLoading ? 'Cambiando...' : 'Cambiar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
