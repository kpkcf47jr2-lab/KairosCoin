// Kairos Extension — Import Wallet Screen
// Import via mnemonic phrase or private key

import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Key, FileText } from 'lucide-react';
import useStore from '../store/useStore';

export default function ImportWallet() {
  const navigate = useStore(s => s.navigate);
  const importWallet = useStore(s => s.importWallet);
  const loading = useStore(s => s.loading);

  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [tab, setTab] = useState('mnemonic'); // mnemonic | privateKey

  const handleImport = () => {
    if (!input.trim() || !password || password !== confirmPwd || password.length < 8) return;
    importWallet(input, password);
  };

  return (
    <div className="flex flex-col h-full px-5 py-4 bg-dark-400">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('welcome')} className="p-1.5 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <h1 className="text-base font-bold text-white">Importar Wallet</h1>
      </div>

      {/* Tab Switch */}
      <div className="flex bg-dark-300 rounded-xl p-1 mb-4">
        <button
          onClick={() => { setTab('mnemonic'); setInput(''); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
            tab === 'mnemonic' ? 'bg-kairos-400/15 text-kairos-400' : 'text-gray-500'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Frase Secreta
        </button>
        <button
          onClick={() => { setTab('privateKey'); setInput(''); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${
            tab === 'privateKey' ? 'bg-kairos-400/15 text-kairos-400' : 'text-gray-500'
          }`}
        >
          <Key className="w-3.5 h-3.5" /> Clave Privada
        </button>
      </div>

      {/* Input */}
      {tab === 'mnemonic' ? (
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribe tus 12 o 24 palabras separadas por espacios..."
          rows={4}
          className="w-full px-4 py-3 text-sm rounded-xl resize-none mb-3"
          spellCheck={false}
          autoComplete="off"
        />
      ) : (
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="0x... tu clave privada"
          className="w-full px-4 py-3 text-sm rounded-xl mb-3 font-mono"
          spellCheck={false}
          autoComplete="off"
        />
      )}

      {/* Password */}
      <p className="text-[11px] text-gray-500 mb-2">Crea una contraseña para este dispositivo:</p>

      <div className="relative mb-2">
        <input
          type={showPwd ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña (mín. 8 caracteres)"
          className="w-full px-4 py-3 pr-10 text-sm rounded-xl"
        />
        <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-gray-500">
          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <input
        type="password"
        value={confirmPwd}
        onChange={e => setConfirmPwd(e.target.value)}
        placeholder="Confirmar contraseña"
        className="w-full px-4 py-3 text-sm rounded-xl mb-4"
      />

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={loading || !input.trim() || password.length < 8 || password !== confirmPwd}
        className="btn-gold w-full py-3 rounded-xl text-sm font-bold mt-auto"
      >
        {loading ? 'Importando...' : 'Importar Wallet'}
      </button>
    </div>
  );
}
