// Kairos Extension — Transaction Approval
// Popup shown when a dApp requests a transaction

import React, { useState } from 'react';
import { AlertTriangle, X, Check, ExternalLink } from 'lucide-react';
import useStore from '../store/useStore';
import { CHAINS } from '../constants/chains';
import { ethers } from 'ethers';

export default function TxApproval() {
  const navigate = useStore(s => s.navigate);
  const activeChainId = useStore(s => s.activeChainId);
  const activeAddress = useStore(s => s.activeAddress);
  const privateKey = useStore(s => s.privateKey);

  const chain = CHAINS[activeChainId];
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  // In production, tx data would come from chrome.runtime messages
  // For now, use placeholder
  const txData = {
    to: '0x0000000000000000000000000000000000000000',
    value: '0',
    data: '0x',
    origin: 'https://example.com',
  };

  const handleApprove = async () => {
    setSigning(true);
    setError(null);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const tx = await wallet.sendTransaction({
        to: txData.to,
        value: ethers.parseEther(txData.value || '0'),
        data: txData.data || '0x',
      });

      // Send result back to content script
      try {
        await chrome.runtime.sendMessage({
          type: 'TX_APPROVED',
          data: { hash: tx.hash },
        });
      } catch { /* popup mode */ }

      navigate('dashboard');
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setSigning(false);
    }
  };

  const handleReject = () => {
    try {
      chrome.runtime.sendMessage({ type: 'TX_REJECTED' });
    } catch { /* popup mode */ }
    navigate('dashboard');
  };

  return (
    <div className="flex flex-col h-full px-5 py-4 bg-dark-400">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-white">Aprobar Transacción</h1>
        <button onClick={handleReject} className="p-1.5 rounded-lg hover:bg-white/5">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Origin */}
      <div className="card p-3 mb-3">
        <p className="text-[11px] text-gray-500 mb-1">Sitio solicitante</p>
        <p className="text-xs font-medium text-white">{txData.origin}</p>
      </div>

      {/* Transaction Details */}
      <div className="card p-3 mb-3 space-y-2">
        <div>
          <p className="text-[11px] text-gray-500">De</p>
          <p className="text-xs font-mono text-white">{activeAddress?.slice(0, 10)}...{activeAddress?.slice(-8)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Para</p>
          <p className="text-xs font-mono text-white">{txData.to?.slice(0, 10)}...{txData.to?.slice(-8)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Valor</p>
          <p className="text-xs font-bold text-white">{txData.value || '0'} {chain?.symbol}</p>
        </div>
        {txData.data && txData.data !== '0x' && (
          <div>
            <p className="text-[11px] text-gray-500">Data</p>
            <p className="text-[10px] font-mono text-gray-400 break-all">{txData.data.slice(0, 66)}...</p>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2 mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-yellow-400">
          Revisa los detalles antes de aprobar. Las transacciones son irreversibles.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2 mb-3">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-auto">
        <button
          onClick={handleReject}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-dark-200 hover:bg-dark-100 transition-colors"
        >
          Rechazar
        </button>
        <button
          onClick={handleApprove}
          disabled={signing}
          className="flex-1 btn-gold py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
        >
          {signing ? 'Firmando...' : <><Check className="w-4 h-4" /> Aprobar</>}
        </button>
      </div>
    </div>
  );
}
