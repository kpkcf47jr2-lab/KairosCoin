// Kairos Extension — Unlock Screen
// Password entry to decrypt vault

import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import useStore from '../store/useStore';

export default function UnlockScreen() {
  const unlock = useStore(s => s.unlock);
  const resetWallet = useStore(s => s.resetWallet);
  const loading = useStore(s => s.loading);

  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!password) return;
    unlock(password);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-10 bg-dark-400">
      {/* Lock Icon */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-kairos-400/20 to-kairos-600/20 flex items-center justify-center mb-6 border border-kairos-400/20">
        <Lock className="w-7 h-7 text-kairos-400" />
      </div>

      <h1 className="text-xl font-bold text-white mb-1">Wallet Bloqueada</h1>
      <p className="text-xs text-gray-400 mb-8">Introduce tu contraseña para continuar</p>

      <form onSubmit={handleUnlock} className="w-full space-y-3">
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full px-4 py-3.5 pr-10 text-sm rounded-xl"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-3.5 text-gray-500"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="btn-gold w-full py-3.5 rounded-xl text-sm font-bold"
        >
          {loading ? 'Desencriptando...' : 'Desbloquear'}
        </button>
      </form>

      <button
        onClick={() => {
          if (confirm('⚠️ Esto eliminará toda tu wallet de este dispositivo. ¿Estás seguro?')) {
            resetWallet();
          }
        }}
        className="mt-6 text-[11px] text-gray-500 hover:text-red-400 transition-colors"
      >
        ¿Olvidaste tu contraseña? Resetear wallet
      </button>
    </div>
  );
}
