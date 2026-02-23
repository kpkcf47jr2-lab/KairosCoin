// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Cross-Chain Bridge Screen
//  Bridge tokens between BSC, Base, Arbitrum, Polygon, ETH
//  Powered by LI.FI Protocol
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowDown, RefreshCw, ChevronDown, Clock, Shield,
  Zap, Check, Loader, ExternalLink, AlertTriangle, ArrowLeftRight
} from 'lucide-react';
import { ethers } from 'ethers';
import { useStore } from '../../store/useStore';
import { CHAINS, CHAIN_ORDER } from '../../constants/chains';
import { ChainIcon } from '../Common/TokenIcon';
import {
  getBridgeQuote, executeBridge, getBridgeStatus,
  formatBridgeAmount, NATIVE_TOKEN, BRIDGE_CHAINS
} from '../../services/bridge';
import { getNativePrice, formatUSD } from '../../services/prices';
import { unlockVault } from '../../services/wallet';
import { useTranslation } from '../../services/i18n';

// Bridge stages
const STAGES = {
  FORM: 'form',
  QUOTE: 'quote',
  CONFIRM: 'confirm',
  PASSWORD: 'password',
  BRIDGING: 'bridging',
  MONITORING: 'monitoring',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function BridgeScreen() {
  const { t } = useTranslation();
  const { activeAddress, activeChainId, navigate, showToast, getActiveAccount } = useStore();

  // Form state
  const [fromChainId, setFromChainId] = useState(activeChainId);
  const [toChainId, setToChainId] = useState(
    activeChainId === 56 ? 8453 : 56
  );
  const [amount, setAmount] = useState('');
  const [nativeBalance, setNativeBalance] = useState('0');
  const [nativePrice, setNativePrice] = useState(0);
  const [password, setPassword] = useState('');

  // Quote state
  const [quote, setQuote] = useState(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  // UI state
  const [stage, setStage] = useState(STAGES.FORM);
  const [showFromChainPicker, setShowFromChainPicker] = useState(false);
  const [showToChainPicker, setShowToChainPicker] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [bridgeStatus, setBridgeStatus] = useState(null);
  const [error, setError] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState(null);

  const fromChain = CHAINS[fromChainId];
  const toChain = CHAINS[toChainId];

  // Fetch balance on chain change
  useEffect(() => {
    if (!activeAddress || !fromChainId) return;
    const chain = CHAINS[fromChainId];
    if (!chain) return;

    const provider = new ethers.JsonRpcProvider(chain.rpcUrls[0]);
    provider.getBalance(activeAddress).then(bal => {
      setNativeBalance(ethers.formatEther(bal));
    }).catch(() => setNativeBalance('0'));

    getNativePrice(fromChainId).then(price => {
      setNativePrice(price);
    }).catch(() => {});
  }, [activeAddress, fromChainId]);

  // Swap from/to chains
  const handleSwapChains = useCallback(() => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setQuote(null);
    setQuoteError(null);
  }, [fromChainId, toChainId]);

  // Get quote
  const handleGetQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Ingresa una cantidad válida', 'error');
      return;
    }

    setIsLoadingQuote(true);
    setQuoteError(null);
    setQuote(null);

    try {
      const fromAmountWei = ethers.parseEther(amount).toString();
      
      const q = await getBridgeQuote({
        fromChainId,
        toChainId,
        fromToken: NATIVE_TOKEN,
        toToken: NATIVE_TOKEN,
        fromAmount: fromAmountWei,
        fromAddress: activeAddress,
      });

      setQuote(q);
      setStage(STAGES.QUOTE);
    } catch (err) {
      console.error('[Bridge] Quote error:', err);
      setQuoteError(err.message || 'No se pudo obtener cotización');
    } finally {
      setIsLoadingQuote(false);
    }
  }, [amount, fromChainId, toChainId, activeAddress]);

  // Execute bridge
  const handleBridge = useCallback(async () => {
    if (!password) {
      showToast('Ingresa tu contraseña', 'error');
      return;
    }

    setStage(STAGES.BRIDGING);
    setError(null);

    try {
      // Verify password
      await unlockVault(password);

      // Get private key from vault
      const account = getActiveAccount();
      if (!account?.privateKey) throw new Error('Account not found');

      // Create signer on source chain
      const provider = new ethers.JsonRpcProvider(fromChain.rpcUrls[0]);
      const signer = new ethers.Wallet(account.privateKey, provider);

      // Execute bridge
      const result = await executeBridge(quote, signer);
      setTxHash(result.hash);

      if (result.status === 'success') {
        setStage(STAGES.MONITORING);
        // Start monitoring
        monitorBridge(result.hash);
      } else {
        throw new Error('Transaction failed on source chain');
      }
    } catch (err) {
      console.error('[Bridge] Execute error:', err);
      setError(err.message || 'Bridge failed');
      setStage(STAGES.ERROR);
    }
  }, [password, quote, activeAddress, fromChain]);

  // Monitor bridge completion
  const monitorBridge = useCallback(async (hash) => {
    const destProvider = new ethers.JsonRpcProvider(toChain.rpcUrls[0]);
    const startBalance = await destProvider.getBalance(activeAddress);

    for (let i = 0; i < 120; i++) { // 10 min max
      await new Promise(r => setTimeout(r, 5000));

      // Check destination balance
      try {
        const newBalance = await destProvider.getBalance(activeAddress);
        if (newBalance > startBalance) {
          const received = newBalance - startBalance;
          setReceivedAmount(ethers.formatEther(received));
          setStage(STAGES.SUCCESS);
          return;
        }
      } catch {}

      // Check LI.FI status
      try {
        const status = await getBridgeStatus(hash, fromChainId, toChainId);
        setBridgeStatus(status.status);
        if (status.status === 'DONE') {
          const bal = await destProvider.getBalance(activeAddress);
          const received = bal - startBalance;
          setReceivedAmount(ethers.formatEther(received));
          setStage(STAGES.SUCCESS);
          return;
        }
        if (status.status === 'FAILED') {
          setError('Bridge transfer failed');
          setStage(STAGES.ERROR);
          return;
        }
      } catch {}
    }

    // Timeout — still might arrive
    showToast('Bridge en proceso — puede tardar más', 'warning');
    setStage(STAGES.SUCCESS);
  }, [activeAddress, toChain, fromChainId, toChainId]);

  // ── Render ────────────────────────────────────────────────

  // Chain Picker Modal
  const ChainPickerModal = ({ isOpen, onClose, onSelect, excludeChainId }) => {
    if (!isOpen) return null;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300 }}
          className="w-full max-w-md bg-dark-800 rounded-t-3xl p-6"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-white mb-4">Seleccionar Red</h3>
          <div className="space-y-2 max-h-64 overflow-auto">
            {BRIDGE_CHAINS.filter(id => id !== excludeChainId).map(chainId => {
              const c = CHAINS[chainId];
              return (
                <button
                  key={chainId}
                  onClick={() => { onSelect(chainId); onClose(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-dark-700 transition-colors"
                >
                  <ChainIcon chainId={chainId} size={32} />
                  <div className="text-left">
                    <div className="text-white font-medium">{c.name}</div>
                    <div className="text-dark-400 text-xs">{c.nativeCurrency.symbol}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('dashboard')} className="icon-btn">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-kairos-400" />
            Bridge
          </h1>
          <p className="text-dark-400 text-xs">Mueve tokens entre cadenas</p>
        </div>
      </div>

      {/* ─── FORM STAGE ─────────────────────────────────── */}
      {(stage === STAGES.FORM || stage === STAGES.QUOTE) && (
        <div className="space-y-4">
          {/* From Chain */}
          <div className="card-dark p-4">
            <div className="text-dark-400 text-xs mb-2">Desde</div>
            <button
              onClick={() => setShowFromChainPicker(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-700 hover:bg-dark-600 transition-colors"
            >
              <ChainIcon chainId={fromChainId} size={28} />
              <span className="text-white font-medium flex-1 text-left">{fromChain?.name}</span>
              <ChevronDown className="w-4 h-4 text-dark-400" />
            </button>

            {/* Amount input */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setQuote(null); setQuoteError(null); }}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl text-white font-bold outline-none placeholder-dark-600"
                />
                <span className="text-dark-300 font-medium">{fromChain?.nativeCurrency?.symbol}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-dark-400 text-xs">
                  ≈ {formatUSD(parseFloat(amount || 0) * nativePrice)}
                </span>
                <button
                  onClick={() => {
                    const max = Math.max(0, parseFloat(nativeBalance) - 0.002);
                    setAmount(max.toFixed(6));
                    setQuote(null);
                  }}
                  className="text-kairos-400 text-xs font-medium hover:text-kairos-300"
                >
                  MAX: {parseFloat(nativeBalance).toFixed(4)} {fromChain?.nativeCurrency?.symbol}
                </button>
              </div>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleSwapChains}
              className="w-10 h-10 rounded-full bg-kairos-500 flex items-center justify-center
                         hover:bg-kairos-400 transition-colors shadow-lg shadow-kairos-500/30"
            >
              <ArrowDown className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* To Chain */}
          <div className="card-dark p-4">
            <div className="text-dark-400 text-xs mb-2">Hacia</div>
            <button
              onClick={() => setShowToChainPicker(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-700 hover:bg-dark-600 transition-colors"
            >
              <ChainIcon chainId={toChainId} size={28} />
              <span className="text-white font-medium flex-1 text-left">{toChain?.name}</span>
              <ChevronDown className="w-4 h-4 text-dark-400" />
            </button>

            {/* Quote result */}
            {quote && (
              <div className="mt-3">
                <div className="text-2xl text-white font-bold">
                  ~{formatBridgeAmount(quote.toAmount)} {toChain?.nativeCurrency?.symbol}
                </div>
                <div className="text-dark-400 text-xs">
                  Min: {formatBridgeAmount(quote.toAmountMin)} {toChain?.nativeCurrency?.symbol}
                </div>
              </div>
            )}
          </div>

          {/* Quote details */}
          {quote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-dark p-4 space-y-2"
            >
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Bridge</span>
                <span className="text-white font-medium capitalize">{quote.bridge}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Gas estimado</span>
                <span className="text-white">${quote.gasCostUSD}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Fee del bridge</span>
                <span className="text-white">${quote.feeCostUSD}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Tiempo estimado
                </span>
                <span className="text-white">{quote.executionDuration}s</span>
              </div>
            </motion.div>
          )}

          {/* Quote error */}
          {quoteError && (
            <div className="card-dark p-3 border border-red-500/30">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {quoteError}
              </p>
            </div>
          )}

          {/* Action button */}
          {!quote ? (
            <button
              onClick={handleGetQuote}
              disabled={isLoadingQuote || !amount || parseFloat(amount) <= 0}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50"
            >
              {isLoadingQuote ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Obteniendo cotización...
                </span>
              ) : (
                'Obtener Cotización'
              )}
            </button>
          ) : (
            <button
              onClick={() => setStage(STAGES.PASSWORD)}
              className="btn-primary w-full py-4 text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                Bridge {amount} {fromChain?.nativeCurrency?.symbol}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ─── PASSWORD STAGE ──────────────────────────────── */}
      {stage === STAGES.PASSWORD && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="card-dark p-6 text-center">
            <Shield className="w-12 h-12 text-kairos-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-1">Confirmar Bridge</h3>
            <p className="text-dark-300 text-sm mb-4">
              {amount} {fromChain?.nativeCurrency?.symbol} ({fromChain?.name}) → {toChain?.name}
            </p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña de tu wallet"
              className="input-dark w-full text-center"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleBridge()}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStage(STAGES.QUOTE); setPassword(''); }}
              className="flex-1 btn-secondary py-3"
            >
              Cancelar
            </button>
            <button
              onClick={handleBridge}
              disabled={!password}
              className="flex-1 btn-primary py-3 disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── BRIDGING / MONITORING STAGE ─────────────────── */}
      {(stage === STAGES.BRIDGING || stage === STAGES.MONITORING) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 space-y-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <ArrowLeftRight className="w-16 h-16 text-kairos-400" />
          </motion.div>

          <div className="text-center">
            <h3 className="text-white font-bold text-xl mb-2">
              {stage === STAGES.BRIDGING ? 'Enviando transacción...' : 'Bridge en progreso...'}
            </h3>
            <p className="text-dark-300 text-sm">
              {stage === STAGES.MONITORING
                ? `Esperando confirmación en ${toChain?.name}...`
                : `Confirmando en ${fromChain?.name}...`
              }
            </p>
            {bridgeStatus && (
              <p className="text-kairos-400 text-xs mt-2">Status: {bridgeStatus}</p>
            )}
          </div>

          {txHash && (
            <a
              href={`${fromChain?.blockExplorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-kairos-400 text-sm flex items-center gap-1 hover:text-kairos-300"
            >
              Ver en explorador <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </motion.div>
      )}

      {/* ─── SUCCESS STAGE ───────────────────────────────── */}
      {stage === STAGES.SUCCESS && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-400" />
          </div>

          <div className="text-center">
            <h3 className="text-white font-bold text-xl mb-2">¡Bridge Exitoso!</h3>
            <p className="text-dark-300 text-sm">
              {receivedAmount
                ? `Recibido: ${parseFloat(receivedAmount).toFixed(6)} ${toChain?.nativeCurrency?.symbol}`
                : `Transferencia completada a ${toChain?.name}`
              }
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => {
                setStage(STAGES.FORM);
                setAmount('');
                setQuote(null);
                setTxHash(null);
                setPassword('');
              }}
              className="flex-1 btn-secondary py-3"
            >
              Otro Bridge
            </button>
            <button
              onClick={() => navigate('dashboard')}
              className="flex-1 btn-primary py-3"
            >
              Dashboard
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── ERROR STAGE ─────────────────────────────────── */}
      {stage === STAGES.ERROR && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>

          <div className="text-center">
            <h3 className="text-white font-bold text-xl mb-2">Error</h3>
            <p className="text-dark-300 text-sm max-w-xs">{error}</p>
          </div>

          <button
            onClick={() => {
              setStage(STAGES.FORM);
              setError(null);
              setPassword('');
            }}
            className="btn-primary py-3 px-8"
          >
            Reintentar
          </button>
        </motion.div>
      )}

      {/* Chain Picker Modals */}
      <AnimatePresence>
        <ChainPickerModal
          isOpen={showFromChainPicker}
          onClose={() => setShowFromChainPicker(false)}
          onSelect={(id) => { setFromChainId(id); setQuote(null); }}
          excludeChainId={toChainId}
        />
        <ChainPickerModal
          isOpen={showToChainPicker}
          onClose={() => setShowToChainPicker(false)}
          onSelect={(id) => { setToChainId(id); setQuote(null); }}
          excludeChainId={fromChainId}
        />
      </AnimatePresence>
    </div>
  );
}
