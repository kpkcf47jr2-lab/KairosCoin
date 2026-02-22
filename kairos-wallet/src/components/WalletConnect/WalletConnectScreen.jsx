// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — WalletConnect Screen
//  Scan QR / paste URI, manage dApp connections
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, QrCode, Link2, Unlink, Shield, CheckCircle,
  X, AlertTriangle, Loader2, Globe, ExternalLink, Lock, ScanLine,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS, CHAIN_ORDER } from '../../constants/chains';
import { unlockVault, formatAddress } from '../../services/wallet';
import QRScanner from '../Common/QRScanner';
import {
  initWalletConnect, pair, approveSession, rejectSession,
  handleSessionRequest, rejectSessionRequest, getActiveSessions,
  disconnectSession, setWCHandlers,
} from '../../services/walletconnect';

export default function WalletConnectScreen() {
  const { activeAddress, activeChainId, goBack, showToast, navigate } = useStore();
  const [sessions, setSessions] = useState([]);
  const [wcUri, setWcUri] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Proposal modal
  const [pendingProposal, setPendingProposal] = useState(null);

  // Request modal
  const [pendingRequest, setPendingRequest] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize WalletConnect
  useEffect(() => {
    const init = async () => {
      try {
        setWCHandlers({
          onProposal: (proposal) => setPendingProposal(proposal),
          onRequest: (request) => setPendingRequest(request),
          onDelete: () => refreshSessions(),
        });
        await initWalletConnect();
        setIsInitialized(true);
        refreshSessions();
      } catch (err) {
        setInitError(err.message || 'Error inicializando WalletConnect');
      }
    };
    init();
  }, []);

  const refreshSessions = async () => {
    try {
      const active = await getActiveSessions();
      setSessions(active);
    } catch {}
  };

  // ── Connect with URI ──
  const connectWithUri = async () => {
    if (!wcUri.trim()) return;
    setIsConnecting(true);
    try {
      await pair(wcUri.trim());
      setWcUri('');
      showToast('Conectando con dApp...', 'info');
    } catch (err) {
      showToast('Error: ' + (err.message || 'URI inválido'), 'error');
    }
    setIsConnecting(false);
  };

  // ── Approve proposal ──
  const handleApproveProposal = async () => {
    if (!pendingProposal) return;
    setIsProcessing(true);
    try {
      await approveSession(pendingProposal, activeAddress, CHAIN_ORDER);
      showToast('dApp conectada', 'success');
      setPendingProposal(null);
      refreshSessions();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
    setIsProcessing(false);
  };

  // ── Reject proposal ──
  const handleRejectProposal = async () => {
    if (!pendingProposal) return;
    try {
      await rejectSession(pendingProposal.id);
    } catch {}
    setPendingProposal(null);
  };

  // ── Handle request (needs password for signing) ──
  const handleApproveRequest = async () => {
    if (!pendingRequest || !password) return;
    setPasswordError('');
    setIsProcessing(true);
    try {
      const vault = await unlockVault(password);
      const allAccounts = [...(vault.accounts || []), ...(vault.importedAccounts || [])];
      const account = allAccounts.find(a => a.address.toLowerCase() === activeAddress.toLowerCase());
      if (!account) throw new Error('Cuenta no encontrada');

      const result = await handleSessionRequest(pendingRequest, account.privateKey);
      if (result.success) {
        showToast('Solicitud aprobada', 'success');
      } else {
        showToast('Error: ' + result.error, 'error');
      }
      setPendingRequest(null);
      setPassword('');
    } catch (err) {
      if (err.message === 'Contraseña incorrecta') {
        setPasswordError('Contraseña incorrecta');
      } else {
        showToast('Error: ' + err.message, 'error');
        setPendingRequest(null);
        setPassword('');
      }
    }
    setIsProcessing(false);
  };

  // ── Reject request ──
  const handleRejectRequest = async () => {
    if (!pendingRequest) return;
    try {
      await rejectSessionRequest(pendingRequest.topic, pendingRequest.id);
    } catch {}
    setPendingRequest(null);
    setPassword('');
  };

  // ── Disconnect session ──
  const handleDisconnect = async (topic) => {
    try {
      await disconnectSession(topic);
      showToast('dApp desconectada', 'success');
      refreshSessions();
    } catch (err) {
      showToast('Error desconectando', 'error');
    }
  };

  // Helper to get request description
  const getRequestDescription = (request) => {
    if (!request) return '';
    const method = request.params?.request?.method || '';
    const descriptions = {
      'personal_sign': 'Firmar mensaje',
      'eth_sign': 'Firmar mensaje',
      'eth_signTypedData': 'Firmar datos tipados',
      'eth_signTypedData_v4': 'Firmar datos tipados (v4)',
      'eth_sendTransaction': 'Enviar transacción',
      'eth_signTransaction': 'Firmar transacción',
    };
    return descriptions[method] || method;
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <h1 className="font-bold text-white">WalletConnect</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Init Error */}
        {initError && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={14} className="text-red-400 shrink-0" />
            <span className="text-xs text-red-300">{initError}</span>
          </div>
        )}

        {/* Connect Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={16} className="text-kairos-400" />
            <span className="text-sm font-semibold text-white">Conectar dApp</span>
          </div>
          <p className="text-xs text-dark-400 mb-3">
            Pega el URI de WalletConnect de cualquier dApp (OpenSea, Uniswap, Aave, etc.)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={wcUri}
              onChange={(e) => setWcUri(e.target.value)}
              placeholder="wc:..."
              className="flex-1 bg-white/[0.04] rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50 font-mono text-xs min-w-0"
              disabled={!isInitialized}
            />
            <button
              onClick={() => setShowQRScanner(true)}
              className="px-3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/10 transition-colors shrink-0"
            >
              <ScanLine size={16} className="text-kairos-400" />
            </button>
            <button
              onClick={connectWithUri}
              disabled={!wcUri.trim() || isConnecting || !isInitialized}
              className={`px-4 py-3 rounded-xl font-bold text-sm shrink-0 transition-all ${
                wcUri.trim() && isInitialized
                  ? 'bg-kairos-500 text-dark-950'
                  : 'bg-white/[0.06] text-dark-500 cursor-not-allowed'
              }`}
            >
              {isConnecting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Conectar'
              )}
            </button>
          </div>
        </div>

        {/* Active Sessions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} className="text-kairos-400" />
            <span className="text-sm font-semibold text-white">
              Sesiones activas ({sessions.length})
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <QrCode size={24} className="text-dark-400" />
              </div>
              <p className="text-dark-400 text-sm mb-1">Sin conexiones</p>
              <p className="text-dark-500 text-xs">Conecta una dApp usando el URI de arriba</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const metadata = session.peer?.metadata || {};
                return (
                  <div
                    key={session.topic}
                    className="bg-white/[0.03] rounded-xl p-3 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      {metadata.icons?.[0] ? (
                        <img
                          src={metadata.icons[0]}
                          alt=""
                          className="w-10 h-10 rounded-xl bg-white/5"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Globe size={20} className="text-dark-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white truncate">
                          {metadata.name || 'dApp'}
                        </p>
                        <p className="text-[10px] text-dark-500 truncate">{metadata.url || ''}</p>
                      </div>
                      <button
                        onClick={() => handleDisconnect(session.topic)}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Desconectar"
                      >
                        <Unlink size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 flex items-start gap-2 px-3 py-2 rounded-xl bg-kairos-500/5 border border-kairos-500/10">
          <Shield size={14} className="text-kairos-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-dark-400">
            Siempre verifica la URL y nombre de la dApp antes de aprobar. Kairos Wallet te pedirá contraseña para cada firma.
          </p>
        </div>
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* Session Proposal Modal */}
      <AnimatePresence>
        {pendingProposal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/95 backdrop-blur-xl flex items-center justify-center px-5"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-sm bg-dark-800 rounded-2xl p-6 border border-white/10"
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-kairos-500/10 flex items-center justify-center mx-auto mb-3">
                  <Link2 size={24} className="text-kairos-400" />
                </div>
                <h3 className="font-bold text-white text-lg">Solicitud de conexión</h3>
                <p className="text-xs text-dark-400 mt-1">
                  {pendingProposal.params?.proposer?.metadata?.name || 'dApp'} quiere conectarse
                </p>
                <p className="text-[10px] text-dark-500 mt-1">
                  {pendingProposal.params?.proposer?.metadata?.url || ''}
                </p>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[10px] text-dark-400 mb-2">Permisos solicitados:</p>
                <ul className="space-y-1">
                  <li className="text-xs text-dark-300 flex items-center gap-1">
                    <CheckCircle size={10} className="text-green-400" /> Ver tu dirección
                  </li>
                  <li className="text-xs text-dark-300 flex items-center gap-1">
                    <CheckCircle size={10} className="text-green-400" /> Solicitar firmas
                  </li>
                  <li className="text-xs text-dark-300 flex items-center gap-1">
                    <CheckCircle size={10} className="text-green-400" /> Enviar transacciones
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRejectProposal}
                  className="flex-1 py-3 rounded-xl bg-white/[0.06] text-dark-300 font-medium text-sm"
                >
                  Rechazar
                </button>
                <button
                  onClick={handleApproveProposal}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-xl bg-kairos-500 text-dark-950 font-bold text-sm flex items-center justify-center"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Aprobar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Request Modal (sign, send, etc.) */}
      <AnimatePresence>
        {pendingRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/95 backdrop-blur-xl flex items-center justify-center px-5"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-sm bg-dark-800 rounded-2xl p-6 border border-white/10"
            >
              <div className="text-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                  <Lock size={24} className="text-orange-400" />
                </div>
                <h3 className="font-bold text-white text-lg">{getRequestDescription(pendingRequest)}</h3>
                <p className="text-xs text-dark-400 mt-1">
                  Confirma con tu contraseña para aprobar
                </p>
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && password && handleApproveRequest()}
                placeholder="Contraseña de la wallet"
                className="w-full bg-white/[0.04] rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50 mb-2"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-xs mb-2">{passwordError}</p>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleRejectRequest}
                  className="flex-1 py-3 rounded-xl bg-white/[0.06] text-dark-300 font-medium text-sm"
                >
                  Rechazar
                </button>
                <button
                  onClick={handleApproveRequest}
                  disabled={!password || isProcessing}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center ${
                    password
                      ? 'bg-kairos-500 text-dark-950'
                      : 'bg-white/[0.06] text-dark-500 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Aprobar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner for WalletConnect URI */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(data) => {
          if (data.startsWith('wc:')) {
            setWcUri(data);
            showToast('URI de WalletConnect escaneado', 'success');
            // Auto-connect
            setTimeout(() => connectWithUri(), 300);
          } else {
            showToast('QR no es un URI de WalletConnect', 'error');
          }
        }}
        title="Escanear WalletConnect QR"
      />
    </div>
  );
}
