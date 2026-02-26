// Kairos Extension — Settings Screen
// Chain switch, export, lock, reset

import React, { useState } from 'react';
import { ArrowLeft, Lock, Trash2, Download, Shield, Globe, ChevronRight } from 'lucide-react';
import useStore from '../store/useStore';
import { CHAINS } from '../constants/chains';
import { decrypt } from '../services/encryption';
import { STORAGE_KEYS } from '../constants/chains';

export default function SettingsScreen() {
  const navigate = useStore(s => s.navigate);
  const lock = useStore(s => s.lock);
  const resetWallet = useStore(s => s.resetWallet);
  const activeChainId = useStore(s => s.activeChainId);
  const switchChain = useStore(s => s.switchChain);
  const activeAddress = useStore(s => s.activeAddress);

  const [showExport, setShowExport] = useState(false);
  const [exportPwd, setExportPwd] = useState('');
  const [exportedKey, setExportedKey] = useState(null);
  const [exportError, setExportError] = useState(null);

  const handleExport = async () => {
    setExportError(null);
    try {
      const encrypted = localStorage.getItem(STORAGE_KEYS.VAULT);
      const decrypted = await decrypt(encrypted, exportPwd);
      const vault = JSON.parse(decrypted);
      setExportedKey(vault.accounts[0].privateKey);
    } catch {
      setExportError('Contraseña incorrecta');
    }
  };

  return (
    <div className="flex flex-col h-full px-5 py-4 bg-dark-400 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('dashboard')} className="p-1.5 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <h1 className="text-base font-bold text-white">Configuración</h1>
      </div>

      {/* Network Section */}
      <SectionTitle icon={<Globe className="w-3.5 h-3.5" />} title="Red Activa" />
      <div className="space-y-1 mb-5">
        {Object.values(CHAINS).map(chain => (
          <button
            key={chain.id}
            onClick={() => switchChain(chain.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-colors ${
              chain.id === activeChainId
                ? 'bg-kairos-400/10 text-kairos-400 border border-kairos-400/20'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <span className="text-base">{chain.icon}</span>
            <div className="text-left">
              <p className="font-medium">{chain.name}</p>
              <p className="text-[10px] text-gray-500">Chain ID: {chain.id}</p>
            </div>
            {chain.id === activeChainId && <span className="ml-auto text-kairos-400">✓</span>}
          </button>
        ))}
      </div>

      {/* Security Section */}
      <SectionTitle icon={<Shield className="w-3.5 h-3.5" />} title="Seguridad" />

      {/* Export Private Key */}
      <button
        onClick={() => setShowExport(!showExport)}
        className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors mb-1"
      >
        <div className="flex items-center gap-2.5">
          <Download className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-300">Exportar Clave Privada</span>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showExport ? 'rotate-90' : ''}`} />
      </button>

      {showExport && (
        <div className="card p-3 mb-3">
          {!exportedKey ? (
            <>
              <p className="text-[11px] text-red-400 mb-2">
                ⚠️ Nunca compartas tu clave privada. Quien la tenga controla tus fondos.
              </p>
              <input
                type="password"
                value={exportPwd}
                onChange={e => setExportPwd(e.target.value)}
                placeholder="Introduce tu contraseña"
                className="w-full px-3 py-2 text-xs rounded-lg mb-2"
              />
              {exportError && <p className="text-[11px] text-red-400 mb-2">{exportError}</p>}
              <button onClick={handleExport} className="btn-gold w-full py-2 rounded-lg text-xs font-bold">
                Mostrar Clave
              </button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-red-400 mb-2">🔐 Tu clave privada:</p>
              <p className="text-[10px] font-mono text-white bg-dark-300 p-2 rounded-lg break-all select-all">
                {exportedKey}
              </p>
              <button
                onClick={() => { setExportedKey(null); setExportPwd(''); setShowExport(false); }}
                className="mt-2 text-[11px] text-gray-400 hover:text-white"
              >
                Ocultar
              </button>
            </>
          )}
        </div>
      )}

      {/* Lock Wallet */}
      <button
        onClick={lock}
        className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors mb-1"
      >
        <Lock className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-300">Bloquear Wallet</span>
      </button>

      {/* Reset Wallet */}
      <button
        onClick={() => {
          if (confirm('⚠️ Esto eliminará tu wallet de este dispositivo. ¿Estás seguro?')) {
            resetWallet();
          }
        }}
        className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
        <span className="text-xs text-red-400">Eliminar Wallet</span>
      </button>

      {/* Version */}
      <div className="mt-auto pt-4 pb-2 text-center">
        <p className="text-[10px] text-gray-600">Kairos Wallet Extension v1.0.0</p>
        <p className="text-[10px] text-gray-700">© 2026 Kairos 777 Inc</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-kairos-400">{icon}</span>
      <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
    </div>
  );
}
