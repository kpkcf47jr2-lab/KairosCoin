// Kairos Extension — Create Wallet Screen
// Generate mnemonic → confirm → set password

import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Eye, EyeOff, Shield } from 'lucide-react';
import useStore from '../store/useStore';

export default function CreateWallet() {
  const screen = useStore(s => s.screen);
  const navigate = useStore(s => s.navigate);
  const generateMnemonic = useStore(s => s.generateMnemonic);
  const confirmCreate = useStore(s => s.confirmCreate);
  const mnemonic = useStore(s => s.mnemonic);
  const loading = useStore(s => s.loading);

  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Step 1: Show mnemonic
  if (screen === 'create' && !mnemonic) {
    return (
      <div className="flex flex-col h-full px-5 py-4 bg-dark-400">
        <Header title="Crear Wallet" onBack={() => navigate('welcome')} />

        <div className="flex-1 flex flex-col items-center justify-center">
          <Shield className="w-14 h-14 text-kairos-400 mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Frase de Recuperación</h2>
          <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">
            Se va a generar una frase de 12 palabras. <br />
            <strong className="text-kairos-400">Guárdala en un lugar seguro.</strong> Nunca la compartas.
          </p>

          <button
            onClick={generateMnemonic}
            className="btn-gold px-8 py-3 rounded-xl text-sm font-bold"
          >
            Generar Frase Secreta
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Show words + confirm
  if (screen === 'create-confirm' && mnemonic && !confirmed) {
    const words = mnemonic.split(' ');
    return (
      <div className="flex flex-col h-full px-5 py-4 bg-dark-400">
        <Header title="Tu Frase Secreta" onBack={() => navigate('create')} />

        <p className="text-[11px] text-gray-400 text-center mb-3">
          Escribe estas 12 palabras en orden. No las pierdas.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {words.map((word, i) => (
            <div key={i} className="card px-2 py-1.5 text-center">
              <span className="text-[10px] text-gray-500">{i + 1}.</span>
              <span className="text-xs font-medium text-white ml-1">{word}</span>
            </div>
          ))}
        </div>

        <button
          onClick={async () => {
            await navigator.clipboard.writeText(mnemonic);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center justify-center gap-2 py-2 text-xs text-kairos-400 hover:text-kairos-300 transition-colors mb-4"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiada!' : 'Copiar frase'}
        </button>

        <button
          onClick={() => setConfirmed(true)}
          className="btn-gold w-full py-3 rounded-xl text-sm font-bold mt-auto"
        >
          Ya la guardé, continuar
        </button>
      </div>
    );
  }

  // Step 3: Set password
  return (
    <div className="flex flex-col h-full px-5 py-4 bg-dark-400">
      <Header title="Crea tu Contraseña" onBack={() => setConfirmed(false)} />

      <p className="text-xs text-gray-400 text-center mb-6">
        Esta contraseña protege tu wallet en este dispositivo.
      </p>

      <div className="space-y-3 flex-1">
        <div className="relative">
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
          className="w-full px-4 py-3 text-sm rounded-xl"
        />

        {/* Strength indicator */}
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4].map(level => (
            <div
              key={level}
              className={`h-1 flex-1 rounded-full transition-colors ${
                password.length >= level * 3
                  ? level <= 2 ? 'bg-red-500' : level === 3 ? 'bg-yellow-500' : 'bg-green-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => confirmCreate(password)}
        disabled={loading || password.length < 8 || password !== confirmPwd}
        className="btn-gold w-full py-3 rounded-xl text-sm font-bold mt-4"
      >
        {loading ? 'Encriptando...' : 'Crear Wallet'}
      </button>
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
        <ArrowLeft className="w-4 h-4 text-gray-400" />
      </button>
      <h1 className="text-base font-bold text-white">{title}</h1>
    </div>
  );
}
