// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Connect External Wallet (WalletConnect v2)
//  Modal for connecting Kairos Wallet or any WC-compatible wallet
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Link2, Copy, Check, Loader2, Smartphone, QrCode,
  ExternalLink, Shield, Unlink, Wallet, CheckCircle2, Zap,
} from 'lucide-react';
import {
  connect, disconnect, getConnectedAccount, isConnected, initWCClient, setCallbacks,
} from '../../services/walletConnectDApp';

// ── QR Code component (simple SVG generation) ────────────────────────────────
function QRDisplay({ value, size = 200 }) {
  // We'll use a simple text fallback + copy button since adding a QR lib
  // would bloat the bundle. Users can paste URI into their wallet.
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-48 h-48 rounded-2xl bg-white flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #fff 0%, #f3f4f6 100%)' }}
      >
        <QrCode className="w-20 h-20 text-gray-400" />
      </div>
      <p className="text-xs text-gray-500 text-center max-w-[240px]">
        Copia el URI y pégalo en Kairos Wallet → WalletConnect
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ConnectExternalWallet({ isOpen, onClose, onConnected }) {
  const [step, setStep] = useState('idle'); // idle | generating | waiting | connected | error
  const [wcUri, setWcUri] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [connectedInfo, setConnectedInfo] = useState(null);
  const approvalRef = useRef(null);

  // Initialize WC client on mount
  useEffect(() => {
    if (!isOpen) return;

    initWCClient().then(() => {
      // Check if already connected
      const account = getConnectedAccount();
      if (account) {
        setConnectedInfo(account);
        setStep('connected');
      }
    }).catch(() => {});

    // Set up disconnect callback
    setCallbacks({
      onDisconnect: () => {
        setConnectedInfo(null);
        setStep('idle');
        if (onConnected) onConnected(null);
      },
      onReconnect: (session) => {
        const account = getConnectedAccount();
        if (account) {
          setConnectedInfo(account);
          setStep('connected');
          if (onConnected) onConnected(account);
        }
      },
    });
  }, [isOpen]);

  // ── Generate pairing URI ──
  const handleConnect = useCallback(async () => {
    setStep('generating');
    setError('');
    try {
      const { uri, waitForApproval } = await connect();
      setWcUri(uri);
      setStep('waiting');
      approvalRef.current = waitForApproval;

      // Wait for wallet to approve
      const session = await waitForApproval();
      const account = getConnectedAccount();
      setConnectedInfo(account);
      setStep('connected');
      if (onConnected) onConnected(account);
    } catch (err) {
      if (err?.message?.includes('rejected') || err?.message?.includes('expired')) {
        setError('Conexión rechazada o expirada. Intenta de nuevo.');
      } else {
        setError(err?.message || 'Error al conectar');
      }
      setStep('error');
    }
  }, [onConnected]);

  // ── Disconnect ──
  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setConnectedInfo(null);
    setStep('idle');
    if (onConnected) onConnected(null);
  }, [onConnected]);

  // ── Copy URI ──
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(wcUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [wcUri]);

  // ── Open Kairos Wallet directly ──
  const openKairosWallet = useCallback(() => {
    // Open wallet with WC URI in query param for auto-pair
    const url = wcUri
      ? `https://kairos-wallet.netlify.app?wc=${encodeURIComponent(wcUri)}`
      : 'https://kairos-wallet.netlify.app';
    window.open(url, '_blank');
  }, [wcUri]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-[#0C0D10] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Conectar Wallet</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            <AnimatePresence mode="wait">

              {/* ── IDLE: Choose connection method ── */}
              {step === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <p className="text-sm text-gray-400 mb-4">
                    Conecta tu Kairos Wallet u otra wallet compatible para firmar transacciones on-chain de forma segura.
                  </p>

                  {/* Kairos Wallet (highlighted) */}
                  <button
                    onClick={handleConnect}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                      <img
                        src="https://kairos-wallet.netlify.app/icons/logo-128.png"
                        alt="Kairos Wallet"
                        className="w-8 h-8 rounded-lg"
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div className="w-8 h-8 rounded-lg bg-purple-500/30 items-center justify-center hidden">
                        <Wallet className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                          Kairos Wallet
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Multi-chain · AES-256 · WalletConnect v2</p>
                    </div>
                    <Zap className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {/* Generic WalletConnect */}
                  <button
                    onClick={handleConnect}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Link2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-left flex-1">
                      <span className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                        WalletConnect
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">MetaMask, Trust Wallet, Rainbow y más</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 mt-3 px-1">
                    <Shield className="w-3.5 h-3.5 text-green-500/60" />
                    <p className="text-[11px] text-gray-600">
                      Tu clave privada nunca sale de tu wallet. Trade solo envía solicitudes de firma.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ── GENERATING ── */}
              {step === 'generating' && (
                <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-8 gap-4"
                >
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                  <p className="text-sm text-gray-400">Generando conexión segura...</p>
                </motion.div>
              )}

              {/* ── WAITING: Show URI for pairing ── */}
              {step === 'waiting' && (
                <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <QRDisplay value={wcUri} />

                  {/* URI display + copy */}
                  <div className="w-full flex items-center gap-2 bg-white/5 rounded-lg p-2">
                    <code className="flex-1 text-[10px] text-gray-400 truncate font-mono">
                      {wcUri}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="shrink-0 p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>

                  {/* Open Kairos Wallet button */}
                  <button
                    onClick={openKairosWallet}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
                  >
                    <Smartphone className="w-4 h-4" />
                    Abrir Kairos Wallet
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    <p className="text-xs text-gray-500">Esperando aprobación en tu wallet...</p>
                  </div>
                </motion.div>
              )}

              {/* ── CONNECTED ── */}
              {step === 'connected' && connectedInfo && (
                <motion.div key="connected" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Success banner */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-300">Wallet Conectada</p>
                      <p className="text-xs text-green-400/60 mt-0.5">{connectedInfo.peerName}</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                      {connectedInfo.address?.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-white truncate">{connectedInfo.address}</p>
                      <p className="text-xs text-gray-500">
                        {connectedInfo.chains?.length || 1} cadena{connectedInfo.chains?.length > 1 ? 's' : ''} conectada{connectedInfo.chains?.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy()}
                      className="p-1.5 rounded-md hover:bg-white/10"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Chain badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {connectedInfo.chains?.map(id => (
                      <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                        {({ 56: 'BSC', 1: 'Ethereum', 137: 'Polygon', 42161: 'Arbitrum', 43114: 'Avalanche', 8453: 'Base' })[id] || `Chain ${id}`}
                      </span>
                    ))}
                  </div>

                  {/* Disconnect button */}
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                  >
                    <Unlink className="w-4 h-4" />
                    Desconectar
                  </button>
                </motion.div>
              )}

              {/* ── ERROR ── */}
              {step === 'error' && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 py-4"
                >
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-sm text-red-400 text-center">{error}</p>
                  <button
                    onClick={() => { setStep('idle'); setError(''); }}
                    className="px-6 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 transition-colors"
                  >
                    Intentar de nuevo
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
