// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Pending Transactions Manager
//  Speed-up, cancel, or track pending transactions
//  REAL on-chain operations (not simulations)
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Zap, XCircle, Clock, ExternalLink, RefreshCw,
  AlertTriangle, Check, Loader, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { speedUpTransaction, cancelTransaction, waitForTransaction, getProvider } from '../../services/blockchain';
import { unlockVault, formatAddress } from '../../services/wallet';
import { CHAINS } from '../../constants/chains';
import PasswordConfirm from '../Common/PasswordConfirm';

export default function PendingTxScreen() {
  const {
    activeChainId, pendingTransactions, goBack, showToast,
    getActiveAccount, resolvePendingTx, addPendingTx,
  } = useStore();

  const chain = CHAINS[activeChainId];
  const account = getActiveAccount();

  const [expandedTx, setExpandedTx] = useState(null);
  const [actionType, setActionType] = useState(null); // 'speedup' | 'cancel'
  const [targetTx, setTargetTx] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(null); // hash being processed
  const [txStatuses, setTxStatuses] = useState({});

  // Check pending TX statuses periodically
  useEffect(() => {
    if (pendingTransactions.length === 0) return;

    const checkStatuses = async () => {
      for (const tx of pendingTransactions) {
        if (tx.chainId !== activeChainId) continue;
        try {
          const provider = getProvider(tx.chainId);
          const receipt = await provider.getTransactionReceipt(tx.hash);
          if (receipt) {
            setTxStatuses(prev => ({
              ...prev,
              [tx.hash]: receipt.status === 1 ? 'confirmed' : 'failed',
            }));
            resolvePendingTx(tx.hash, receipt.status === 1 ? 'confirmed' : 'failed');
          }
        } catch { /* still pending */ }
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 10000);
    return () => clearInterval(interval);
  }, [pendingTransactions, activeChainId]);

  const chainPendingTxs = pendingTransactions.filter(tx => tx.chainId === activeChainId);

  const handleAction = (tx, type) => {
    setTargetTx(tx);
    setActionType(type);
    setShowPassword(true);
  };

  const handleConfirmAction = async (password) => {
    if (!targetTx || !actionType || !account) return;
    setShowPassword(false);
    setProcessing(targetTx.hash);

    try {
      // Verify password
      await unlockVault(password);

      let result;
      if (actionType === 'speedup') {
        result = await speedUpTransaction(activeChainId, account.privateKey, targetTx);
        showToast('TX acelerada enviada', 'success');
        // Track the replacement TX
        addPendingTx({
          ...targetTx,
          hash: result.hash,
          timestamp: Date.now(),
          status: 'pending',
          isSpeedUp: true,
          originalHash: targetTx.hash,
        });
      } else {
        result = await cancelTransaction(activeChainId, account.privateKey, targetTx.nonce);
        showToast('Cancelación enviada', 'success');
        addPendingTx({
          hash: result.hash,
          from: account.address,
          to: account.address,
          value: '0',
          chainId: activeChainId,
          timestamp: Date.now(),
          status: 'cancelling',
          isCancellation: true,
          originalHash: targetTx.hash,
        });
      }

      // Wait for confirmation in background
      waitForTransaction(activeChainId, result.hash).then(receipt => {
        resolvePendingTx(result.hash, receipt.status);
        // Also resolve the original
        resolvePendingTx(targetTx.hash, actionType === 'cancel' ? 'cancelled' : receipt.status);
      });
    } catch (err) {
      showToast('Error: ' + (err.reason || err.message), 'error');
    }

    setProcessing(null);
    setTargetTx(null);
    setActionType(null);
  };

  const getStatusBadge = (tx) => {
    const status = txStatuses[tx.hash] || tx.status;
    switch (status) {
      case 'confirmed':
        return <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">Confirmada</span>;
      case 'failed':
        return <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">Fallida</span>;
      case 'cancelling':
        return <span className="text-[10px] bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full">Cancelando...</span>;
      default:
        return <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Loader size={8} className="animate-spin" /> Pendiente</span>;
    }
  };

  const formatTime = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Hace segundos';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    return `Hace ${Math.floor(diff / 3600000)}h`;
  };

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={goBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold flex-1">Transacciones Pendientes</h2>
        <div className="px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 text-xs font-bold">
          {chainPendingTxs.length}
        </div>
      </div>

      {/* Info banner */}
      <div className="glass-card p-3 mb-4 flex items-start gap-2">
        <AlertTriangle size={16} className="text-kairos-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-dark-200 font-medium">Acciones reales en cadena</p>
          <p className="text-[10px] text-dark-400 mt-0.5">
            Acelerar re-envía la TX con más gas. Cancelar envía 0 a tu propia dirección con el mismo nonce.
            Ambas cuestan gas real.
          </p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {chainPendingTxs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-green-400" />
            </div>
            <p className="text-dark-300 text-sm">No hay transacciones pendientes</p>
            <p className="text-dark-500 text-xs mt-1">Todas las transacciones están confirmadas</p>
          </div>
        ) : (
          chainPendingTxs.map((tx, i) => {
            const isExpanded = expandedTx === tx.hash;
            const isProcessing = processing === tx.hash;
            const isPending = !txStatuses[tx.hash] && tx.status === 'pending';

            return (
              <motion.div
                key={tx.hash}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden"
              >
                {/* Main row */}
                <button
                  onClick={() => setExpandedTx(isExpanded ? null : tx.hash)}
                  className="w-full flex items-center gap-3 p-4"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.isCancellation ? 'bg-red-500/10' :
                    tx.isSpeedUp ? 'bg-yellow-500/10' :
                    'bg-blue-500/10'
                  }`}>
                    {isProcessing ? (
                      <Loader size={18} className="text-kairos-400 animate-spin" />
                    ) : tx.isCancellation ? (
                      <XCircle size={18} className="text-red-400" />
                    ) : tx.isSpeedUp ? (
                      <Zap size={18} className="text-yellow-400" />
                    ) : (
                      <Clock size={18} className="text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {tx.isCancellation ? 'Cancelación' :
                         tx.isSpeedUp ? 'Acelerada' :
                         `Envío → ${formatAddress(tx.to, 4)}`}
                      </span>
                      {getStatusBadge(tx)}
                    </div>
                    <span className="text-dark-500 text-xs">
                      {tx.value} {chain.nativeCurrency.symbol} · {formatTime(tx.timestamp)}
                    </span>
                  </div>

                  {isExpanded ? <ChevronUp size={16} className="text-dark-400" /> : <ChevronDown size={16} className="text-dark-400" />}
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-4 space-y-3">
                        {/* TX details */}
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-dark-400">Hash</span>
                            <a
                              href={`${chain.blockExplorerUrl}/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-kairos-400 font-mono flex items-center gap-1"
                            >
                              {formatAddress(tx.hash, 6)}
                              <ExternalLink size={10} />
                            </a>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-400">De</span>
                            <span className="font-mono text-dark-200">{formatAddress(tx.from, 6)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-400">Para</span>
                            <span className="font-mono text-dark-200">{formatAddress(tx.to, 6)}</span>
                          </div>
                          {tx.nonce !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-dark-400">Nonce</span>
                              <span className="text-dark-200">{tx.nonce}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons — only for truly pending */}
                        {isPending && !tx.isCancellation && !tx.isSpeedUp && (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleAction(tx, 'speedup')}
                              disabled={isProcessing}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium disabled:opacity-40"
                            >
                              <Zap size={14} />
                              Acelerar (+30% gas)
                            </button>
                            <button
                              onClick={() => handleAction(tx, 'cancel')}
                              disabled={isProcessing}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium disabled:opacity-40"
                            >
                              <XCircle size={14} />
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Password confirmation modal */}
      <PasswordConfirm
        isOpen={showPassword}
        onConfirm={handleConfirmAction}
        onCancel={() => { setShowPassword(false); setTargetTx(null); setActionType(null); }}
        title={actionType === 'speedup' ? 'Acelerar Transacción' : 'Cancelar Transacción'}
        message={
          actionType === 'speedup'
            ? 'Esto re-enviará la transacción con 30% más gas. Cuesta gas real.'
            : 'Esto enviará una transacción vacía con el mismo nonce para reemplazarla. Cuesta gas real.'
        }
        confirmText={actionType === 'speedup' ? 'Acelerar' : 'Cancelar TX'}
      />
    </div>
  );
}
