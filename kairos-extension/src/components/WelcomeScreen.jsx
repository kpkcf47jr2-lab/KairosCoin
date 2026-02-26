// Kairos Extension — Welcome Screen
// First screen: Create new wallet or import existing

import React from 'react';
import useStore from '../store/useStore';

export default function WelcomeScreen() {
  const navigate = useStore(s => s.navigate);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-10 bg-dark-400">
      {/* Logo */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-kairos-400 to-kairos-600 flex items-center justify-center mb-6 shadow-lg shadow-kairos-400/20">
        <span className="text-4xl font-bold text-dark-500">K</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-1">Kairos Wallet</h1>
      <p className="text-sm text-gray-400 text-center mb-10">
        Tu wallet multi-chain segura y elegante
      </p>

      {/* Actions */}
      <button
        onClick={() => navigate('create')}
        className="btn-gold w-full py-3.5 rounded-xl text-sm font-bold mb-3"
      >
        Crear Nueva Wallet
      </button>

      <button
        onClick={() => navigate('import')}
        className="w-full py-3.5 rounded-xl text-sm font-semibold text-kairos-400 bg-kairos-400/10 hover:bg-kairos-400/15 transition-colors border border-kairos-400/20"
      >
        Importar Wallet
      </button>

      {/* Version */}
      <p className="mt-auto text-[10px] text-gray-600">v1.0.0 · Kairos 777 Inc</p>
    </div>
  );
}
