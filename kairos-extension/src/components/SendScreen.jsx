// Kairos Extension — Send Screen
// Send native currency or ERC-20 tokens

import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import useStore from '../store/useStore';
import { CHAINS } from '../constants/chains';
import { sendNative, sendToken, estimateGas } from '../services/blockchain';
import { isValidAddress } from '../services/wallet';

export default function SendScreen() {
  const navigate = useStore(s => s.navigate);
  const activeAddress = useStore(s => s.activeAddress);
  const activeChainId = useStore(s => s.activeChainId);
  const privateKey = useStore(s => s.privateKey);
  const balances = useStore(s => s.balances);
  const refreshBalances = useStore(s => s.refreshBalances);

  const chain = CHAINS[activeChainId];

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('native'); // 'native' or 'kairos'
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [gasCost, setGasCost] = useState(null);

  const maxBalance = token === 'native' ? balances.native : (balances.kairos || '0');

  // Estimate gas when address changes
  useEffect(() => {
    if (!isValidAddress(to)) { setGasCost(null); return; }
    estimateGas(activeChainId, to, amount || '0').then(setGasCost).catch(() => setGasCost(null));
  }, [to, activeChainId, amount]);

  const handleSend = async () => {
    setError(null);
    if (!isValidAddress(to)) { setError('Dirección inválida'); return; }
    if (!amount || Number(amount) <= 0) { setError('Monto inválido'); return; }
    if (Number(amount) > Number(maxBalance)) { setError('Saldo insuficiente'); return; }
    if (to.toLowerCase() === activeAddress.toLowerCase()) { setError('No puedes enviarte a ti mismo'); return; }

    setSending(true);
    try {
      let tx;
      if (token === 'native') {
        tx = await sendNative(activeChainId, privateKey, to, amount);
      } else {
        const kairosAddr = chain.kairos;
        tx = await sendToken(activeChainId, privateKey, kairosAddr, to, amount, 18);
      }
      setTxHash(tx.hash);
      refreshBalances();
    } catch (e) {
      setError(e.reason || e.message || 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  // Success view
  if (txHash) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 bg-dark-400">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-lg font-bold text-white mb-2">¡Enviado!</h2>
        <p className="text-xs text-gray-400 mb-4 text-center">
          {amount} {token === 'native' ? chain.symbol : 'KAIROS'} enviados exitosamente
        </p>
        <a
          href={`${chain.explorer}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-kairos-400 hover:underline mb-6"
        >
          Ver en el explorador →
        </a>
        <button onClick={() => navigate('dashboard')} className="btn-gold w-full py-3 rounded-xl text-sm font-bold">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-5 py-4 bg-dark-400">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('dashboard')} className="p-1.5 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <h1 className="text-base font-bold text-white">Enviar</h1>
      </div>

      {/* Token Selector */}
      <div className="flex bg-dark-300 rounded-xl p-1 mb-4">
        <button
          onClick={() => setToken('native')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            token === 'native' ? 'bg-kairos-400/15 text-kairos-400' : 'text-gray-500'
          }`}
        >
          {chain.symbol}
        </button>
        {chain.kairos && (
          <button
            onClick={() => setToken('kairos')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              token === 'kairos' ? 'bg-kairos-400/15 text-kairos-400' : 'text-gray-500'
            }`}
          >
            KAIROS
          </button>
        )}
      </div>

      {/* To Address */}
      <label className="text-[11px] text-gray-500 mb-1">Dirección destino</label>
      <input
        type="text"
        value={to}
        onChange={e => setTo(e.target.value)}
        placeholder="0x..."
        className="w-full px-4 py-3 text-sm rounded-xl font-mono mb-3"
        spellCheck={false}
      />

      {/* Amount */}
      <label className="text-[11px] text-gray-500 mb-1">Cantidad</label>
      <div className="relative mb-2">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full px-4 py-3 pr-16 text-sm rounded-xl"
          step="any"
          min="0"
        />
        <button
          onClick={() => setAmount(maxBalance)}
          className="absolute right-2 top-2.5 text-[10px] text-kairos-400 bg-kairos-400/10 px-2 py-1 rounded-md font-bold"
        >
          MAX
        </button>
      </div>

      <p className="text-[11px] text-gray-500 mb-3">
        Disponible: <span className="text-white">{Number(maxBalance).toFixed(4)}</span> {token === 'native' ? chain.symbol : 'KAIROS'}
      </p>

      {/* Gas estimate */}
      {gasCost && (
        <p className="text-[11px] text-gray-500 mb-3">
          Gas estimado: ~{Number(gasCost).toFixed(6)} {chain.symbol}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={sending || !to || !amount}
        className="btn-gold w-full py-3.5 rounded-xl text-sm font-bold mt-auto"
      >
        {sending ? 'Enviando...' : `Enviar ${token === 'native' ? chain.symbol : 'KAIROS'}`}
      </button>
    </div>
  );
}
