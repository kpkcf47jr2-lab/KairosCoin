// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Send Screen
//  Send native currency or tokens with gas estimation
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send as SendIcon, ChevronDown, AlertTriangle, Fuel, Check, BookOpen, ScanLine } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { sendNative, sendToken, estimateGasNative, estimateGasToken, waitForTransaction, resolveENS } from '../../services/blockchain';
import { formatBalance, formatUSD } from '../../services/prices';
import { isValidAddress, formatAddress, unlockVault } from '../../services/wallet';
import { CHAINS, KAIROS_TOKEN, GAS_PRESETS } from '../../constants/chains';
import { analyzeTxRisk, getRiskColor } from '../../services/security';
import TokenIcon from '../Common/TokenIcon';
import QRScanner from '../Common/QRScanner';
import { getContacts, getRecentContacts, touchContact } from '../../services/contacts';

export default function SendScreen() {
  const {
    activeAddress, activeChainId, balances, nativePrice, tokenPrices,
    navigate, goBack, showToast, getActiveAccount, addPendingTx, resolvePendingTx,
  } = useStore();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [gasPreset, setGasPreset] = useState('standard');
  const [gasEstimate, setGasEstimate] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'password' | 'success'
  const [sendPassword, setSendPassword] = useState('');
  const [sendPasswordError, setSendPasswordError] = useState('');

  const chain = CHAINS[activeChainId];
  const account = getActiveAccount();
  const [showContacts, setShowContacts] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [ensName, setEnsName] = useState(null);
  const [resolvingENS, setResolvingENS] = useState(false);
  const [txWarnings, setTxWarnings] = useState([]);
  const contacts = useMemo(() => getContacts(), []);
  const recentContacts = useMemo(() => getRecentContacts(3), []);

  // Listen for prefill address from contacts screen
  useEffect(() => {
    const handler = (e) => setRecipient(e.detail);
    window.addEventListener('kairos:prefill-address', handler);
    return () => window.removeEventListener('kairos:prefill-address', handler);
  }, []);

  // Default to native currency
  useEffect(() => {
    if (balances.native && !selectedToken) {
      setSelectedToken({ ...balances.native, isNative: true });
    }
  }, [balances.native]);

  const allTokens = useMemo(() => {
    const tokens = [];
    if (balances.native) tokens.push({ ...balances.native, isNative: true });
    if (balances.tokens) tokens.push(...balances.tokens.filter(t => t.hasBalance));
    return tokens;
  }, [balances]);

  // Get token price
  const tokenPrice = useMemo(() => {
    if (!selectedToken) return 0;
    if (selectedToken.isNative) return nativePrice;
    return tokenPrices[selectedToken.address?.toLowerCase()]?.usd || 0;
  }, [selectedToken, nativePrice, tokenPrices]);

  const usdValue = parseFloat(amount || 0) * tokenPrice;
  const finalRecipient = ensName || recipient;
  const isValid = isValidAddress(finalRecipient) && parseFloat(amount) > 0;

  // Resolve ENS names (.eth)
  useEffect(() => {
    if (!recipient) { setEnsName(null); return; }
    if (recipient.endsWith('.eth') || recipient.endsWith('.bnb')) {
      setResolvingENS(true);
      resolveENS(recipient).then(addr => {
        if (addr) setEnsName(addr);
        else setEnsName(null);
      }).finally(() => setResolvingENS(false));
    } else {
      setEnsName(null);
    }
  }, [recipient]);

  // Security warnings
  useEffect(() => {
    const finalRecipient = ensName || recipient;
    if (!finalRecipient || !isValidAddress(finalRecipient)) { setTxWarnings([]); return; }
    const risk = analyzeTxRisk({ from: activeAddress, to: finalRecipient, value: amount });
    setTxWarnings(risk.reasons);
  }, [recipient, ensName, amount, activeAddress]);

  // Estimate gas when form is valid
  useEffect(() => {
    if (!isValid || !selectedToken) return;
    
    const estimate = async () => {
      try {
        if (selectedToken.isNative) {
          const est = await estimateGasNative(activeChainId, activeAddress, finalRecipient, amount);
          setGasEstimate(est);
        } else {
          const est = await estimateGasToken(activeChainId, activeAddress, selectedToken.address, finalRecipient, amount, selectedToken.decimals);
          setGasEstimate(est);
        }
      } catch { }
    };
    
    const timeout = setTimeout(estimate, 500);
    return () => clearTimeout(timeout);
  }, [recipient, amount, selectedToken, activeChainId]);

  const handleSend = async () => {
    if (!account) return;

    // Verify password first
    setSendPasswordError('');
    try {
      await unlockVault(sendPassword);
    } catch {
      setSendPasswordError('Contraseña incorrecta');
      return;
    }

    setIsSending(true);
    
    try {
      let result;
      if (selectedToken.isNative) {
        result = await sendNative(activeChainId, account.privateKey, finalRecipient, amount, gasPreset);
      } else {
        result = await sendToken(
          activeChainId, account.privateKey, selectedToken.address,
          finalRecipient, amount, selectedToken.decimals, gasPreset
        );
      }

      addPendingTx(result);
      setTxResult(result);
      setStep('success');
      showToast('Transacción enviada', 'success');

      // Wait for confirmation in background
      waitForTransaction(activeChainId, result.hash).then(receipt => {
        resolvePendingTx(result.hash, receipt.status);
      });
    } catch (err) {
      showToast('Error: ' + (err.reason || err.message), 'error');
    }
    setIsSending(false);
  };

  const handleMax = () => {
    if (!selectedToken) return;
    if (selectedToken.isNative && gasEstimate) {
      // Leave some for gas
      const max = Math.max(0, parseFloat(selectedToken.balance) - parseFloat(gasEstimate.gasCostFormatted) * 1.5);
      setAmount(max.toFixed(8));
    } else {
      setAmount(selectedToken.balance);
    }
  };

  if (step === 'success') {
    return (
      <div className="screen-container items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">¡Transacción Enviada!</h2>
          <p className="text-dark-400 text-sm mb-4">
            {amount} {selectedToken?.symbol} enviados a
          </p>
          <p className="text-dark-300 text-xs font-mono mb-6">{formatAddress(recipient, 10)}</p>
          
          {txResult && (
            <a
              href={`${chain.blockExplorerUrl}/tx/${txResult.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-kairos-400 text-sm underline mb-6 block"
            >
              Ver en {chain.shortName}Scan →
            </a>
          )}

          <button onClick={() => navigate('dashboard')} className="kairos-button w-full py-4">
            Volver al Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="screen-container px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep('form')} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold">Confirmar Envío</h2>
        </div>

        <div className="flex-1">
          <div className="glass-card-strong p-5 mb-4">
            <div className="text-center mb-4">
              <p className="text-dark-400 text-xs mb-1">Enviando</p>
              <p className="text-3xl font-bold">{amount} <span className="text-kairos-400">{selectedToken?.symbol}</span></p>
              {tokenPrice > 0 && <p className="text-dark-400 text-sm">{formatUSD(usdValue)}</p>}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">De</span>
                <span className="font-mono text-xs">{formatAddress(activeAddress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Para</span>
                <span className="font-mono text-xs">{formatAddress(recipient)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Red</span>
                <span>{chain.icon} {chain.name}</span>
              </div>
              {gasEstimate && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Gas estimado</span>
                  <span>{parseFloat(gasEstimate.gasCostFormatted).toFixed(6)} {chain.nativeCurrency.symbol}</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-3 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-kairos-400 flex-shrink-0" />
            <p className="text-xs text-dark-300">
              Verifica la dirección del destinatario. Las transacciones en blockchain son irreversibles.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { setSendPassword(''); setSendPasswordError(''); setStep('password'); }}
            disabled={isSending}
            className="kairos-button w-full py-4 flex items-center justify-center gap-2"
          >
            <SendIcon size={18} />
            Confirmar y Enviar
          </button>
          <button onClick={() => setStep('form')} className="glass-button w-full py-3 text-center">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div className="screen-container px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep('confirm')} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold">Verificar Identidad</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-kairos-500/10 flex items-center justify-center mb-4">
            <SendIcon size={28} className="text-kairos-400" />
          </div>
          <p className="text-dark-300 text-sm text-center mb-6">
            Ingresa tu contraseña para autorizar el envío de {amount} {selectedToken?.symbol}
          </p>
          <input
            type="password"
            value={sendPassword}
            onChange={e => { setSendPassword(e.target.value); setSendPasswordError(''); }}
            placeholder="Contraseña"
            className="glass-input w-full text-center mb-2"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && sendPassword && handleSend()}
          />
          {sendPasswordError && (
            <p className="text-red-400 text-xs mb-2">{sendPasswordError}</p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSend}
            disabled={!sendPassword || isSending}
            className="kairos-button w-full py-4 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isSending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full"
              />
            ) : (
              <SendIcon size={18} />
            )}
            {isSending ? 'Enviando...' : 'Enviar Ahora'}
          </button>
          <button onClick={() => setStep('confirm')} className="glass-button w-full py-3 text-center">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={goBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">Enviar</h2>
      </div>

      <div className="flex-1 space-y-4">
        {/* Recipient */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-dark-400">Dirección del destinatario</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQRScanner(true)}
                className="flex items-center gap-1 text-xs text-kairos-400"
              >
                <ScanLine size={12} />
                Escanear
              </button>
              {contacts.length > 0 && (
                <button
                  onClick={() => setShowContacts(!showContacts)}
                  className="flex items-center gap-1 text-xs text-kairos-400"
                >
                  <BookOpen size={12} />
                  Contactos
                </button>
              )}
            </div>
          </div>
          <input
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="0x... o nombre.eth"
            className={`glass-input font-mono text-sm ${
              recipient && !isValidAddress(recipient) && !ensName && !recipient.endsWith('.eth') ? 'border-red-500/50' : ''
            }`}
          />
          {resolvingENS && (
            <p className="text-kairos-400 text-xs mt-1">Resolviendo ENS...</p>
          )}
          {ensName && (
            <p className="text-green-400 text-xs mt-1">✓ {formatAddress(ensName, 8)}</p>
          )}
          {recipient && !isValidAddress(recipient) && !ensName && !resolvingENS && !recipient.endsWith('.eth') && (
            <p className="text-red-400 text-xs mt-1">Dirección inválida</p>
          )}
          {txWarnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {txWarnings.map((w, i) => (
                <p key={i} className="text-orange-400 text-[11px] flex items-center gap-1">
                  <AlertTriangle size={10} /> {w}
                </p>
              ))}
            </div>
          )}

          {/* Quick contacts dropdown */}
          {showContacts && contacts.length > 0 && (
            <div className="mt-2 bg-white/[0.04] rounded-xl border border-white/5 overflow-hidden max-h-40 overflow-y-auto">
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setRecipient(c.address);
                    setShowContacts(false);
                    touchContact(c.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-kairos-500/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-kairos-400">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-white font-medium truncate block">{c.name}</span>
                    <span className="text-[10px] text-dark-500 font-mono">{formatAddress(c.address, 6)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Token selector */}
        <div>
          <label className="text-xs text-dark-400 mb-1 block">Token</label>
          <button
            onClick={() => setShowTokenPicker(!showTokenPicker)}
            className="glass-input flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {selectedToken && (
                <>
                  <TokenIcon token={selectedToken} chainId={activeChainId} size={24} />
                  <span>{selectedToken.symbol}</span>
                  <span className="text-dark-400 text-xs">
                    Bal: {formatBalance(selectedToken.balance)}
                  </span>
                </>
              )}
            </div>
            <ChevronDown size={16} className="text-dark-400" />
          </button>

          {showTokenPicker && (
            <div className="glass-card mt-1 p-2 max-h-40 overflow-y-auto">
              {allTokens.map(token => (
                <button
                  key={token.address || 'native'}
                  onClick={() => { setSelectedToken(token); setShowTokenPicker(false); }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm"
                >
                  <TokenIcon token={token} chainId={activeChainId} size={24} />
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-dark-400 text-xs ml-auto">{formatBalance(token.balance)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-dark-400">Cantidad</label>
            <button onClick={handleMax} className="text-xs text-kairos-400">MAX</button>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="glass-input text-2xl font-bold pr-20"
              step="any"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 font-medium">
              {selectedToken?.symbol || ''}
            </span>
          </div>
          {usdValue > 0 && (
            <p className="text-dark-400 text-xs mt-1">≈ {formatUSD(usdValue)}</p>
          )}
        </div>

        {/* Gas Presets */}
        <div>
          <label className="text-xs text-dark-400 mb-2 block flex items-center gap-1">
            <Fuel size={12} /> Velocidad de transacción
          </label>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(GAS_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setGasPreset(key)}
                className={`p-2 rounded-xl text-center transition-all ${
                  gasPreset === key
                    ? 'bg-kairos-500/15 border border-kairos-500/30'
                    : 'bg-white/5 border border-transparent'
                }`}
              >
                <span className="text-lg">{preset.icon}</span>
                <p className="text-[10px] mt-0.5 text-dark-300">{preset.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={() => setStep('confirm')}
        disabled={!isValid || !selectedToken || parseFloat(amount || 0) <= 0}
        className="kairos-button w-full py-4 mt-4 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <SendIcon size={18} />
        Revisar Transacción
      </button>

      {/* QR Scanner */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(data) => {
          // Handle ethereum: URIs or plain addresses
          const match = data.match(/^(?:ethereum:)?(0x[a-fA-F0-9]{40})/);
          if (match) {
            setRecipient(match[1]);
            showToast('Dirección escaneada', 'success');
          } else {
            setRecipient(data);
          }
        }}
        title="Escanear dirección"
      />
    </div>
  );
}
