// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Multi-Send (Batch Transactions)
//  Send to MULTIPLE recipients in one flow
//  MetaMask CANNOT do this — we can
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Users, Send, Loader2, CheckCircle, X, AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';
import { sendNative, sendToken, getNativeBalance, getTokenBalance } from '../../services/blockchain';
import { unlockVault, formatAddress, isValidAddress } from '../../services/wallet';
import { getContacts } from '../../services/contacts';
import PasswordConfirm from '../Common/PasswordConfirm';

export default function MultiSendScreen() {
  const { goBack, activeChainId, activeAddress, balances, showToast, getActiveAccount, addPendingTx } = useStore();
  const chain = CHAINS[activeChainId];
  const account = getActiveAccount();

  const [recipients, setRecipients] = useState([{ address: '', amount: '' }]);
  const [selectedToken, setSelectedToken] = useState('native'); // 'native' or token address
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [step, setStep] = useState('form'); // form | confirm | sending | done
  const [contactSuggestions, setContactSuggestions] = useState([]);
  const [activeRecipientIdx, setActiveRecipientIdx] = useState(-1);

  const isWatchOnly = account && !account.privateKey;

  // Token options
  const tokenOptions = [
    { id: 'native', symbol: chain?.nativeCurrency?.symbol, balance: balances?.native?.balance || '0', decimals: 18 },
    ...(balances?.tokens?.filter(t => t.hasBalance) || []).map(t => ({
      id: t.address, symbol: t.symbol, balance: t.balance || '0', decimals: t.decimals || 18, address: t.address,
    })),
  ];

  const activeToken = tokenOptions.find(t => t.id === selectedToken) || tokenOptions[0];

  const addRecipient = () => {
    if (recipients.length >= 20) {
      showToast('Máximo 20 destinatarios', 'error');
      return;
    }
    setRecipients([...recipients, { address: '', amount: '' }]);
  };

  const removeRecipient = (i) => {
    if (recipients.length <= 1) return;
    setRecipients(recipients.filter((_, idx) => idx !== i));
  };

  const updateRecipient = (i, field, value) => {
    const updated = [...recipients];
    updated[i] = { ...updated[i], [field]: value };
    setRecipients(updated);

    // Contact suggestions
    if (field === 'address' && value.length >= 2) {
      const contacts = getContacts().filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase()) ||
        c.address.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 3);
      setContactSuggestions(contacts);
      setActiveRecipientIdx(i);
    } else {
      setContactSuggestions([]);
    }
  };

  const selectContact = (contact, idx) => {
    updateRecipient(idx, 'address', contact.address);
    setContactSuggestions([]);
  };

  const setAllSameAmount = (amount) => {
    setRecipients(recipients.map(r => ({ ...r, amount })));
  };

  const totalAmount = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const maxBalance = parseFloat(activeToken?.balance || '0');

  const validate = () => {
    for (let i = 0; i < recipients.length; i++) {
      if (!isValidAddress(recipients[i].address)) {
        showToast(`Dirección inválida en fila ${i + 1}`, 'error');
        return false;
      }
      if (!recipients[i].amount || parseFloat(recipients[i].amount) <= 0) {
        showToast(`Cantidad inválida en fila ${i + 1}`, 'error');
        return false;
      }
    }
    if (totalAmount > maxBalance) {
      showToast('Balance insuficiente para el total', 'error');
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    setStep('confirm');
  };

  const handleSend = () => {
    setShowPassword(true);
  };

  const executeBatch = async (password) => {
    setShowPassword(false);
    setSending(true);
    setStep('sending');
    const txResults = [];

    try {
      const vault = await unlockVault(password);
      const allAccounts = [...(vault.accounts || []), ...(vault.importedAccounts || [])];
      const acc = allAccounts.find(a => a.address.toLowerCase() === activeAddress.toLowerCase());
      if (!acc?.privateKey) throw new Error('No se encontró la clave privada');

      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        try {
          let tx;
          if (selectedToken === 'native') {
            tx = await sendNative(activeChainId, acc.privateKey, r.address, r.amount, 'standard');
          } else {
            tx = await sendToken(activeChainId, acc.privateKey, activeToken.address, r.address, r.amount, activeToken.decimals, 'standard');
          }
          addPendingTx({
            hash: tx.hash,
            from: activeAddress,
            to: r.address,
            value: r.amount,
            type: 'send',
            chainId: activeChainId,
            timestamp: Date.now(),
            status: 'pending',
          });
          txResults.push({ index: i, address: r.address, amount: r.amount, hash: tx.hash, status: 'success' });
        } catch (err) {
          txResults.push({ index: i, address: r.address, amount: r.amount, error: err.message, status: 'error' });
        }
      }

      setResults(txResults);
      setStep('done');
      const successCount = txResults.filter(r => r.status === 'success').length;
      showToast(`✅ ${successCount}/${recipients.length} envíos completados`, 'success');
    } catch (err) {
      showToast(err.message || 'Error ejecutando batch', 'error');
      setSending(false);
      setStep('confirm');
    }
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800">
        <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <Users className="text-kairos-400" size={20} />
          <h1 className="text-lg font-bold text-white">Multi-Send</h1>
        </div>
        <span className="ml-auto text-dark-500 text-xs">{recipients.length} destinatario{recipients.length > 1 ? 's' : ''}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {step === 'form' && (
          <>
            {/* Token selector */}
            <div>
              <p className="text-dark-400 text-xs mb-2">Token a enviar</p>
              <div className="flex gap-2 flex-wrap">
                {tokenOptions.slice(0, 6).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedToken(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedToken === opt.id
                        ? 'bg-kairos-500/20 text-kairos-400 border-kairos-500/40'
                        : 'bg-dark-800 text-dark-300 border-dark-700'
                    }`}
                  >
                    {opt.symbol}
                    <span className="text-dark-500 text-xs ml-1">{parseFloat(opt.balance).toFixed(4)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipients list */}
            <div className="space-y-3">
              {recipients.map((r, i) => (
                <div key={i} className="bg-dark-800/50 rounded-xl p-3 border border-dark-700 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-dark-500 text-xs font-bold w-5">#{i + 1}</span>
                    <input
                      type="text"
                      value={r.address}
                      onChange={e => updateRecipient(i, 'address', e.target.value)}
                      placeholder="0x... dirección o nombre"
                      className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:border-kairos-500 focus:outline-none font-mono"
                    />
                    {recipients.length > 1 && (
                      <button onClick={() => removeRecipient(i)} className="text-red-400 hover:text-red-300">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {/* Contact suggestions */}
                  {activeRecipientIdx === i && contactSuggestions.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {contactSuggestions.map(c => (
                        <button
                          key={c.id}
                          onClick={() => selectContact(c, i)}
                          className="w-full text-left px-2 py-1 rounded bg-dark-700/50 text-xs text-dark-300 hover:bg-dark-600"
                        >
                          {c.name} — {formatAddress(c.address, 4)}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pl-7">
                    <input
                      type="number"
                      value={r.amount}
                      onChange={e => updateRecipient(i, 'amount', e.target.value)}
                      placeholder="Cantidad"
                      className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:border-kairos-500 focus:outline-none"
                    />
                    <span className="text-dark-500 text-xs">{activeToken?.symbol}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add / Split buttons */}
            <div className="flex gap-2">
              <button
                onClick={addRecipient}
                className="flex-1 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium flex items-center justify-center gap-1 hover:bg-dark-700"
              >
                <Plus size={14} /> Agregar
              </button>
              {recipients.length > 1 && (
                <button
                  onClick={() => {
                    const split = (maxBalance / recipients.length * 0.98).toFixed(6);
                    setAllSameAmount(split);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-300 text-sm font-medium hover:bg-dark-700"
                >
                  Dividir equitativo
                </button>
              )}
            </div>

            {/* Total */}
            <div className="bg-dark-800/30 rounded-xl p-3 border border-dark-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Total a enviar</span>
                <span className={`font-bold ${totalAmount > maxBalance ? 'text-red-400' : 'text-white'}`}>
                  {totalAmount.toFixed(6)} {activeToken?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-dark-500">Balance disponible</span>
                <span className="text-dark-400">{parseFloat(activeToken?.balance || 0).toFixed(6)} {activeToken?.symbol}</span>
              </div>
              {totalAmount > maxBalance && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertTriangle size={10} /> Balance insuficiente
                </p>
              )}
            </div>
          </>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            <div className="text-center py-4">
              <Users className="mx-auto text-kairos-400 mb-2" size={32} />
              <h2 className="text-white font-bold text-lg">Confirmar Multi-Send</h2>
              <p className="text-dark-400 text-sm mt-1">{recipients.length} envío{recipients.length > 1 ? 's' : ''} · {totalAmount.toFixed(6)} {activeToken?.symbol}</p>
            </div>

            {recipients.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-dark-800/50 rounded-lg p-3 border border-dark-700/50">
                <div>
                  <p className="text-white text-sm font-mono">{formatAddress(r.address, 6)}</p>
                  <p className="text-dark-500 text-xs">Destino #{i + 1}</p>
                </div>
                <p className="text-kairos-400 font-bold text-sm">{r.amount} {activeToken?.symbol}</p>
              </div>
            ))}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep('form')} className="flex-1 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-300 text-sm font-semibold">
                Editar
              </button>
              <button
                onClick={handleSend}
                disabled={isWatchOnly}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-kairos-500 to-kairos-400 text-dark-950 text-sm font-bold disabled:opacity-40"
              >
                {isWatchOnly ? '🔒 Solo lectura' : '🚀 Enviar Todo'}
              </button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="text-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <Loader2 className="mx-auto text-kairos-400" size={48} />
            </motion.div>
            <p className="text-white font-bold mt-4">Enviando transacciones...</p>
            <p className="text-dark-400 text-sm mt-1">Esto puede tomar un momento</p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3">
            <div className="text-center py-4">
              <CheckCircle className="mx-auto text-green-400 mb-2" size={40} />
              <h2 className="text-white font-bold text-lg">Multi-Send Completado</h2>
              <p className="text-dark-400 text-sm mt-1">
                {results.filter(r => r.status === 'success').length}/{results.length} exitosos
              </p>
            </div>

            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg p-3 border ${
                r.status === 'success' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
              }`}>
                <div className="flex items-center gap-2">
                  {r.status === 'success' ? (
                    <CheckCircle className="text-green-400" size={14} />
                  ) : (
                    <X className="text-red-400" size={14} />
                  )}
                  <div>
                    <p className="text-white text-xs font-mono">{formatAddress(r.address, 6)}</p>
                    <p className="text-dark-500 text-[10px]">
                      {r.status === 'success' ? r.hash?.slice(0, 16) + '...' : r.error?.slice(0, 40)}
                    </p>
                  </div>
                </div>
                <span className="text-dark-300 text-xs">{r.amount} {activeToken?.symbol}</span>
              </div>
            ))}

            <button onClick={goBack} className="w-full py-3 rounded-xl bg-kairos-500/20 text-kairos-400 text-sm font-bold mt-4">
              Listo
            </button>
          </div>
        )}
      </div>

      {/* Action Button (form step only) */}
      {step === 'form' && (
        <div className="p-4 border-t border-dark-800">
          <button
            onClick={handleConfirm}
            disabled={isWatchOnly || totalAmount <= 0 || totalAmount > maxBalance}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-kairos-500 to-kairos-400 text-dark-950 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Send size={14} /> Revisar {recipients.length} envío{recipients.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Password Confirm */}
      {showPassword && (
        <PasswordConfirm
          title="Confirmar Multi-Send"
          message={`Enviar ${totalAmount.toFixed(6)} ${activeToken?.symbol} a ${recipients.length} destinatarios`}
          onConfirm={executeBatch}
          onCancel={() => setShowPassword(false)}
        />
      )}
    </div>
  );
}
