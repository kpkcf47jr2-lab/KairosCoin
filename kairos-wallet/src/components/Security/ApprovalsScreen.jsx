// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Token Approval Manager
//  View and revoke token spending approvals
//  SUPERIOR to MetaMask: dedicated approval management
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Shield, AlertTriangle, Trash2, Loader,
  ExternalLink, RefreshCw, CheckCircle, Info
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS, ERC20_ABI } from '../../constants/chains';
import { getTokenApprovals, revokeApproval } from '../../services/blockchain';
import PasswordConfirm from '../Common/PasswordConfirm';
import { unlockVault } from '../../services/wallet';
import { useTranslation } from '../../services/i18n';

export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const {
    activeAddress, activeChainId, navigate, showToast,
    getActiveAccount, balances
  } = useStore();

  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revoking, setRevoking] = useState(null); // tokenAddress being revoked
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState(null);

  const chain = CHAINS[activeChainId];

  // Fetch approvals
  const fetchApprovals = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all token addresses from balances
      const tokenAddresses = (balances.tokens || [])
        .filter(t => t.address && parseFloat(t.balance) > 0)
        .map(t => t.address);

      if (tokenAddresses.length === 0) {
        setApprovals([]);
        setIsLoading(false);
        return;
      }

      const results = await getTokenApprovals(activeChainId, activeAddress, tokenAddresses);
      setApprovals(results);
    } catch (err) {
      console.error('[Approvals] Fetch error:', err);
      showToast('Error cargando approvals', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeChainId, activeAddress, balances]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Start revoke flow
  const handleRevoke = (approval) => {
    setPendingRevoke(approval);
    setShowPasswordModal(true);
  };

  // Execute revoke after password confirm
  const executeRevoke = async (password) => {
    setShowPasswordModal(false);
    if (!pendingRevoke) return;

    setRevoking(pendingRevoke.tokenAddress + pendingRevoke.spender);

    try {
      const account = getActiveAccount();
      if (!account?.privateKey) throw new Error('Account not found');

      await revokeApproval(
        activeChainId,
        account.privateKey,
        pendingRevoke.tokenAddress,
        pendingRevoke.spender
      );

      showToast(`Revocado ${pendingRevoke.tokenSymbol}`, 'success');
      // Remove from list
      setApprovals(prev =>
        prev.filter(a =>
          !(a.tokenAddress === pendingRevoke.tokenAddress && a.spender === pendingRevoke.spender)
        )
      );
    } catch (err) {
      showToast(err.message || 'Error al revocar', 'error');
    } finally {
      setRevoking(null);
      setPendingRevoke(null);
    }
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => navigate('settings')} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-white flex items-center gap-2">
            <Shield size={18} className="text-kairos-400" />
            {t('approvals.title', 'Aprobaciones de Tokens')}
          </h1>
          <p className="text-dark-400 text-xs">{chain?.name}</p>
        </div>
        <button
          onClick={fetchApprovals}
          className="p-2 rounded-xl hover:bg-white/5"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={`text-dark-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Info banner */}
        <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertTriangle size={14} className="text-orange-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-dark-300 leading-relaxed">
            {t('approvals.warning', 'Las aprobaciones permiten que contratos gasten tus tokens. Revoca las que ya no necesites para proteger tus fondos.')}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-8 h-8 text-kairos-400 animate-spin mb-3" />
            <p className="text-dark-400 text-sm">Escaneando aprobaciones...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && approvals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
            <p className="text-white font-medium mb-1">¡Todo limpio!</p>
            <p className="text-dark-400 text-sm text-center">
              No hay aprobaciones activas en {chain?.name}
            </p>
          </div>
        )}

        {/* Approvals list */}
        <div className="space-y-2">
          {approvals.map((approval, i) => {
            const isRevokingThis = revoking === (approval.tokenAddress + approval.spender);
            return (
              <motion.div
                key={`${approval.tokenAddress}-${approval.spender}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/[0.03] rounded-xl p-4 border border-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-white font-medium text-sm">{approval.tokenSymbol}</span>
                    <span className="text-dark-500 text-xs ml-2">→ {approval.spenderLabel}</span>
                  </div>
                  <button
                    onClick={() => handleRevoke(approval)}
                    disabled={isRevokingThis}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 
                             text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {isRevokingThis ? (
                      <Loader size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Revocar
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-dark-400">
                    {approval.isUnlimited ? (
                      <span className="text-orange-400 flex items-center gap-1">
                        <AlertTriangle size={10} /> Ilimitado
                      </span>
                    ) : (
                      `${approval.allowance} ${approval.tokenSymbol}`
                    )}
                  </span>
                  <a
                    href={`${chain?.blockExplorerUrl}/address/${approval.spender}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dark-500 hover:text-dark-300 flex items-center gap-1"
                  >
                    {approval.spender.slice(0, 6)}...{approval.spender.slice(-4)}
                    <ExternalLink size={10} />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Password Modal */}
      <PasswordConfirm
        isOpen={showPasswordModal}
        onConfirm={executeRevoke}
        onCancel={() => { setShowPasswordModal(false); setPendingRevoke(null); }}
        title="Revocar Aprobación"
        subtitle={pendingRevoke ? `Revocar ${pendingRevoke.tokenSymbol} → ${pendingRevoke.spenderLabel}` : ''}
        confirmLabel="Revocar"
      />
    </div>
  );
}
