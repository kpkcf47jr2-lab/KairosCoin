// Kairos Extension — dApp Connection Approval
// Popup shown when a site tries to connect

import React from 'react';
import { X, Check, Globe, Shield } from 'lucide-react';
import useStore from '../store/useStore';

export default function ConnectApproval() {
  const navigate = useStore(s => s.navigate);
  const activeAddress = useStore(s => s.activeAddress);
  const activeChainId = useStore(s => s.activeChainId);

  // In production, this would come from chrome.runtime messages
  const requestData = {
    origin: 'https://app.uniswap.org',
    favicon: null,
  };

  const shortAddr = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : '';

  const handleApprove = () => {
    try {
      chrome.runtime.sendMessage({
        type: 'CONNECT_SITE',
        data: { origin: requestData.origin },
      });
    } catch { /* popup mode */ }
    navigate('dashboard');
  };

  const handleReject = () => {
    try {
      chrome.runtime.sendMessage({
        type: 'CONNECTION_REJECTED',
        data: { origin: requestData.origin },
      });
    } catch { /* popup mode */ }
    navigate('dashboard');
  };

  return (
    <div className="flex flex-col items-center h-full px-6 py-6 bg-dark-400">
      {/* Logo */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-kairos-400 to-kairos-600 flex items-center justify-center mb-4 shadow-lg shadow-kairos-400/20">
        <span className="text-3xl font-bold text-dark-500">K</span>
      </div>

      <h1 className="text-lg font-bold text-white mb-1">Conexión Solicitada</h1>
      <p className="text-xs text-gray-400 text-center mb-6">
        Este sitio quiere conectarse a tu wallet
      </p>

      {/* Site Info */}
      <div className="w-full card p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-dark-300 flex items-center justify-center">
            <Globe className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{new URL(requestData.origin).hostname}</p>
            <p className="text-[11px] text-gray-500">{requestData.origin}</p>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="w-full card p-3 mb-4">
        <p className="text-[11px] text-gray-500 mb-2 font-medium">Este sitio podrá:</p>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-xs text-gray-300">
            <Check className="w-3 h-3 text-green-400" /> Ver tu dirección ({shortAddr})
          </li>
          <li className="flex items-center gap-2 text-xs text-gray-300">
            <Check className="w-3 h-3 text-green-400" /> Ver tu balance
          </li>
          <li className="flex items-center gap-2 text-xs text-gray-300">
            <Check className="w-3 h-3 text-green-400" /> Solicitar firmas de transacciones
          </li>
        </ul>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 w-full mb-4">
        <Shield className="w-3.5 h-3.5 text-kairos-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500">
          Nunca aprueba transacciones que no entiendas. La conexión se puede revocar en Configuración.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full mt-auto">
        <button
          onClick={handleReject}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-dark-200 hover:bg-dark-100 transition-colors"
        >
          Rechazar
        </button>
        <button
          onClick={handleApprove}
          className="flex-1 btn-gold py-3 rounded-xl text-sm font-bold"
        >
          Conectar
        </button>
      </div>
    </div>
  );
}
