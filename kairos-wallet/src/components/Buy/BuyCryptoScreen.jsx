// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Comprar & Vender KAIROS
//  Comprar: Stripe Checkout (auto-mint KAIROS)
//  Vender: Burn KAIROS → Stripe Connect → USD a tu banco
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CreditCard, Shield, DollarSign, Zap, Loader2,
  Banknote, CheckCircle2, AlertCircle, Clock, ExternalLink, RefreshCw,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';

const API_BASE = 'https://kairos-api-u6k5.onrender.com';
const QUICK_AMOUNTS_BUY = [25, 50, 100, 250, 500, 1000];
const QUICK_AMOUNTS_SELL = [25, 50, 100, 250, 500];
const MIN_REDEEM = 10;
const MAX_REDEEM = 25000;

export default function BuyCryptoScreen() {
  const { activeAddress, activeChainId, goBack, showToast } = useStore();
  const chain = CHAINS[activeChainId];
  const [mode, setMode] = useState('buy'); // 'buy' | 'sell'

  // ── Buy state ──
  const [stripeAmount, setStripeAmount] = useState('');
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  // ── Sell state ──
  const [sellAmount, setSellAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('standard'); // 'instant' | 'standard'
  const [accountStatus, setAccountStatus] = useState(null); // null | 'loading' | { onboarded, payoutsEnabled, ... }
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState(null); // { success, id, status, arrival, error }
  const [redeemHistory, setRedeemHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // ── Check Stripe Connect account status ──
  const checkAccountStatus = useCallback(async () => {
    if (!activeAddress) return;
    setAccountStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/redeem/account-status?wallet=${activeAddress}`);
      const data = await res.json();
      if (!res.ok) {
        setAccountStatus({ onboarded: false });
        return;
      }
      setAccountStatus(data);
    } catch {
      setAccountStatus({ onboarded: false });
    }
  }, [activeAddress]);

  useEffect(() => {
    if (mode === 'sell' && activeAddress) {
      checkAccountStatus();
    }
  }, [mode, activeAddress, checkAccountStatus]);

  // ── Start Stripe Connect onboarding ──
  const handleOnboarding = useCallback(async () => {
    if (!activeAddress) {
      showToast('Conecta tu wallet primero', 'error');
      return;
    }
    setIsOnboarding(true);
    try {
      const res = await fetch(`${API_BASE}/api/redeem/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeAddress,
          returnUrl: `${window.location.origin}/#/buy?onboard=complete`,
          refreshUrl: `${window.location.origin}/#/buy?onboard=refresh`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear cuenta');

      if (data.onboardingUrl) {
        window.open(data.onboardingUrl, '_blank', 'noopener,noreferrer');
        showToast('Completa tu verificación en Stripe', 'info');
      } else if (data.alreadyActive) {
        showToast('Tu cuenta ya está activa', 'success');
        checkAccountStatus();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsOnboarding(false);
    }
  }, [activeAddress, showToast, checkAccountStatus]);

  // ── Stripe Checkout (BUY) ──
  const handleStripeCheckout = useCallback(async () => {
    const amount = parseFloat(stripeAmount);
    if (!amount || amount < 10) { showToast('Mínimo $10 USD', 'error'); return; }
    if (amount > 50000) { showToast('Máximo $50,000 USD', 'error'); return; }
    if (!activeAddress) { showToast('Conecta tu wallet primero', 'error'); return; }

    setIsCreatingCheckout(true);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: activeAddress, amount, currency: 'usd' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error al crear checkout');
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        showToast('Redirigiendo a Stripe...', 'info');
      } else {
        throw new Error('No se recibió URL de checkout');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsCreatingCheckout(false);
    }
  }, [stripeAmount, activeAddress, showToast]);

  // ── Redeem KAIROS (SELL) ──
  const handleRedeem = useCallback(async () => {
    const amount = parseFloat(sellAmount);
    if (!amount || amount < MIN_REDEEM) { showToast(`Mínimo $${MIN_REDEEM} USD`, 'error'); return; }
    if (amount > MAX_REDEEM) { showToast(`Máximo $${MAX_REDEEM.toLocaleString()} USD`, 'error'); return; }
    if (!activeAddress) { showToast('Conecta tu wallet primero', 'error'); return; }

    setIsRedeeming(true);
    setRedemptionResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/redeem/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeAddress,
          amount,
          payoutMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al redimir');

      setRedemptionResult({
        success: true,
        id: data.redemptionId,
        status: data.status,
        arrival: data.arrival,
        method: data.payoutMethod,
        net: data.net,
        fee: data.fee,
      });
      setSellAmount('');
      showToast('KAIROS quemados. Pago en camino.', 'success');
    } catch (err) {
      setRedemptionResult({ success: false, error: err.message });
      showToast(err.message, 'error');
    } finally {
      setIsRedeeming(false);
    }
  }, [sellAmount, payoutMethod, activeAddress, showToast]);

  // ── Load redemption history ──
  const loadHistory = useCallback(async () => {
    if (!activeAddress) return;
    try {
      const res = await fetch(`${API_BASE}/api/redeem/history?wallet=${activeAddress}`);
      const data = await res.json();
      if (res.ok && data.redemptions) setRedeemHistory(data.redemptions);
    } catch { /* ignore */ }
  }, [activeAddress]);

  useEffect(() => {
    if (showHistory && activeAddress) loadHistory();
  }, [showHistory, activeAddress, loadHistory]);

  // ── Fee calculation ──
  const sellAmountParsed = parseFloat(sellAmount) || 0;
  const instantFee = payoutMethod === 'instant' ? Math.max(sellAmountParsed * 0.01, 0.50) : 0;
  const netAmount = Math.max(sellAmountParsed - instantFee, 0);

  const isAccountReady = accountStatus && accountStatus !== 'loading' && accountStatus.payoutsEnabled;

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <h1 className="font-bold text-white">
          {mode === 'buy' ? 'Comprar KAIROS' : 'Vender KAIROS'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Buy/Sell Toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-4">
          <button
            onClick={() => { setMode('buy'); setRedemptionResult(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === 'buy' ? 'bg-green-500/15 text-green-400' : 'text-dark-400'
            }`}
          >
            <CreditCard size={14} /> Comprar
          </button>
          <button
            onClick={() => { setMode('sell'); setRedemptionResult(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === 'sell' ? 'bg-orange-500/15 text-orange-400' : 'text-dark-400'
            }`}
          >
            <DollarSign size={14} /> Vender
          </button>
        </div>

        {/* ═══ BUY MODE ═══ */}
        {mode === 'buy' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#635BFF]/15 to-[#7A73FF]/5 rounded-2xl p-5 mb-5 border-2 border-[#635BFF]/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#635BFF]/20 flex items-center justify-center">
                  <Zap size={20} className="text-[#635BFF]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">Pagar con Tarjeta</p>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">ACTIVO</span>
                  </div>
                  <p className="text-[10px] text-dark-400">Visa, Mastercard, Amex • Apple Pay • Google Pay</p>
                </div>
              </div>

              <p className="text-[11px] text-dark-400 mb-4 leading-relaxed">
                Paga con tarjeta de crédito/débito. KAIROS se acuña automáticamente 1:1 con USD y se envía directo a tu wallet.
              </p>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK_AMOUNTS_BUY.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setStripeAmount(String(amt))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      stripeAmount === String(amt)
                        ? 'bg-[#635BFF]/30 text-[#A5A0FF] border border-[#635BFF]/40'
                        : 'bg-white/[0.04] text-dark-400 border border-white/5 hover:border-[#635BFF]/20'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 font-medium">$</span>
                <input
                  type="number"
                  value={stripeAmount}
                  onChange={(e) => setStripeAmount(e.target.value)}
                  placeholder="Monto en USD"
                  min="10"
                  max="50000"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-7 pr-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-[#635BFF]/50 transition-colors"
                />
                {stripeAmount && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-dark-400">
                    = {parseFloat(stripeAmount || 0).toLocaleString()} KAIROS
                  </span>
                )}
              </div>

              {/* Wallet display */}
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-[10px] text-dark-400 truncate">
                  {activeAddress ? `Recibir en: ${activeAddress.slice(0, 8)}...${activeAddress.slice(-6)}` : 'Conecta tu wallet'}
                </span>
              </div>

              <button
                onClick={handleStripeCheckout}
                disabled={isCreatingCheckout || !stripeAmount || parseFloat(stripeAmount) < 10}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#635BFF] to-[#7A73FF] text-white hover:shadow-lg hover:shadow-[#635BFF]/20"
              >
                {isCreatingCheckout ? (
                  <><Loader2 size={16} className="animate-spin" /> Creando sesión de pago...</>
                ) : (
                  <><CreditCard size={16} /> Comprar {stripeAmount ? `$${parseFloat(stripeAmount).toLocaleString()} en ` : ''}KAIROS</>
                )}
              </button>

              <p className="text-[9px] text-dark-500 text-center mt-2">
                🔒 Pago seguro con Stripe • 1 KAIROS = 1 USD • Mín $10 — Máx $50,000
              </p>
            </motion.div>

            {/* How it works */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 mb-5">
              <p className="text-xs font-semibold text-white mb-3">¿Cómo funciona?</p>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Ingresa el monto en USD que deseas comprar' },
                  { step: '2', text: 'Paga de forma segura con Stripe (tarjeta, Apple Pay, etc.)' },
                  { step: '3', text: 'KAIROS se acuña automáticamente y se envía a tu wallet' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#635BFF]/15 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#A5A0FF]">{step}</span>
                    </div>
                    <p className="text-[11px] text-dark-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-kairos-500/5 border border-kairos-500/10">
              <span className="text-sm">💡</span>
              <p className="text-[10px] text-dark-400">
                <strong className="text-kairos-400">Tip:</strong> Después de comprar KAIROS, ve a <strong className="text-white">Swap</strong> para intercambiarlos por BTC, ETH, BNB u otros tokens.
              </p>
            </div>
          </>
        )}

        {/* ═══ SELL MODE — Redimir KAIROS → USD ═══ */}
        {mode === 'sell' && (
          <>
            {/* Hero info card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 rounded-2xl p-4 mb-5 border border-orange-500/10"
            >
              <div className="flex items-start gap-3">
                <Banknote size={20} className="text-orange-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Redimir KAIROS por USD</p>
                  <p className="text-[11px] text-dark-400 leading-relaxed">
                    Quema tus KAIROS y recibe USD directamente en tu cuenta bancaria o tarjeta de débito. 1 KAIROS = 1 USD.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ── Account status / onboarding ── */}
            {accountStatus === 'loading' && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 size={16} className="animate-spin text-dark-400" />
                <span className="text-xs text-dark-400">Verificando cuenta...</span>
              </div>
            )}

            {accountStatus && accountStatus !== 'loading' && !accountStatus.payoutsEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] rounded-2xl p-5 mb-5 border border-white/5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Banknote size={20} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Configura tu cuenta de pago</p>
                    <p className="text-[10px] text-dark-400">Solo toma ~2 minutos</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {[
                    'Vincula tu cuenta bancaria o tarjeta de débito',
                    'Verifica tu identidad (requerido por regulaciones)',
                    'Listo — recibe pagos directos en USD',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-orange-400">{i + 1}</span>
                      </div>
                      <p className="text-[11px] text-dark-400">{text}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleOnboarding}
                  disabled={isOnboarding}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {isOnboarding ? (
                    <><Loader2 size={16} className="animate-spin" /> Creando cuenta...</>
                  ) : (
                    <><ExternalLink size={16} /> Configurar cuenta de pago</>
                  )}
                </button>

                {accountStatus.onboarded && !accountStatus.payoutsEnabled && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/10">
                    <Clock size={12} className="text-yellow-400 shrink-0" />
                    <p className="text-[10px] text-yellow-400">
                      Tu cuenta existe pero aún no está verificada.{' '}
                      <button onClick={handleOnboarding} className="underline font-semibold">
                        Completar verificación
                      </button>
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-center mt-3">
                  <button onClick={checkAccountStatus} className="text-[10px] text-dark-500 flex items-center gap-1 hover:text-dark-300">
                    <RefreshCw size={10} /> Verificar estado
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Redemption form (account ready) ── */}
            {isAccountReady && !redemptionResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-2xl p-5 mb-5 border-2 border-orange-500/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                    <DollarSign size={20} className="text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">Redimir KAIROS</p>
                      <span className="text-[8px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">VERIFICADO</span>
                    </div>
                    <p className="text-[10px] text-dark-400">
                      Cuenta conectada • Recibe USD en tu banco
                    </p>
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {QUICK_AMOUNTS_SELL.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setSellAmount(String(amt))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        sellAmount === String(amt)
                          ? 'bg-orange-500/30 text-orange-300 border border-orange-500/40'
                          : 'bg-white/[0.04] text-dark-400 border border-white/5 hover:border-orange-500/20'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                {/* Amount input */}
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 font-medium">$</span>
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="Cantidad de KAIROS a redimir"
                    min={MIN_REDEEM}
                    max={MAX_REDEEM}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-7 pr-4 py-3 text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                  {sellAmount && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-dark-400">
                      {parseFloat(sellAmount || 0).toLocaleString()} KAIROS
                    </span>
                  )}
                </div>

                {/* Payout method toggle */}
                <div className="mb-4">
                  <p className="text-[10px] text-dark-400 mb-2 font-medium">Método de pago:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPayoutMethod('standard')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-left border transition-all ${
                        payoutMethod === 'standard'
                          ? 'border-orange-500/30 bg-orange-500/10'
                          : 'border-white/5 bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <Banknote size={12} className={payoutMethod === 'standard' ? 'text-orange-400' : 'text-dark-500'} />
                        <span className={`text-xs font-semibold ${payoutMethod === 'standard' ? 'text-white' : 'text-dark-400'}`}>
                          Estándar
                        </span>
                      </div>
                      <p className="text-[9px] text-dark-500">1-2 días hábiles • Sin comisión</p>
                    </button>
                    <button
                      onClick={() => setPayoutMethod('instant')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-left border transition-all ${
                        payoutMethod === 'instant'
                          ? 'border-orange-500/30 bg-orange-500/10'
                          : 'border-white/5 bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <Zap size={12} className={payoutMethod === 'instant' ? 'text-orange-400' : 'text-dark-500'} />
                        <span className={`text-xs font-semibold ${payoutMethod === 'instant' ? 'text-white' : 'text-dark-400'}`}>
                          Instantáneo
                        </span>
                      </div>
                      <p className="text-[9px] text-dark-500">~30 seg a tarjeta • 1% + $0.50</p>
                    </button>
                  </div>
                </div>

                {/* Amount summary */}
                {sellAmountParsed >= MIN_REDEEM && (
                  <div className="bg-white/[0.03] rounded-xl p-3 mb-4 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-dark-400">KAIROS a quemar</span>
                      <span className="text-[10px] text-white font-medium">{sellAmountParsed.toLocaleString()} KAIROS</span>
                    </div>
                    {payoutMethod === 'instant' && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-dark-400">Comisión instantánea</span>
                        <span className="text-[10px] text-orange-400">-${instantFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[10px] text-dark-400 font-semibold">Recibes</span>
                      <span className="text-sm text-green-400 font-bold">${netAmount.toFixed(2)} USD</span>
                    </div>
                  </div>
                )}

                {/* Wallet display */}
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-[10px] text-dark-400 truncate">
                    {activeAddress ? `Quemando desde: ${activeAddress.slice(0, 8)}...${activeAddress.slice(-6)}` : 'Conecta tu wallet'}
                  </span>
                </div>

                {/* Redeem button */}
                <button
                  onClick={handleRedeem}
                  disabled={isRedeeming || !sellAmount || sellAmountParsed < MIN_REDEEM}
                  className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {isRedeeming ? (
                    <><Loader2 size={16} className="animate-spin" /> Procesando redención...</>
                  ) : (
                    <><DollarSign size={16} /> Redimir {sellAmount ? `${parseFloat(sellAmount).toLocaleString()} KAIROS` : 'KAIROS'}</>
                  )}
                </button>

                <p className="text-[9px] text-dark-500 text-center mt-2">
                  🔥 KAIROS se queman permanentemente • 1 KAIROS = 1 USD • Mín ${MIN_REDEEM} — Máx ${MAX_REDEEM.toLocaleString()}
                </p>
              </motion.div>
            )}

            {/* ── Redemption result ── */}
            <AnimatePresence>
              {redemptionResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`rounded-2xl p-5 mb-5 border-2 ${
                    redemptionResult.success
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {redemptionResult.success ? (
                      <CheckCircle2 size={24} className="text-green-400" />
                    ) : (
                      <AlertCircle size={24} className="text-red-400" />
                    )}
                    <div>
                      <p className={`text-sm font-bold ${redemptionResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {redemptionResult.success ? '¡Redención exitosa!' : 'Error en la redención'}
                      </p>
                      <p className="text-[10px] text-dark-400">
                        {redemptionResult.success
                          ? `ID: ${redemptionResult.id?.slice(0, 12)}...`
                          : redemptionResult.error}
                      </p>
                    </div>
                  </div>

                  {redemptionResult.success && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-dark-400">Estado</span>
                        <span className="text-[10px] text-green-400 font-medium">{redemptionResult.status}</span>
                      </div>
                      {redemptionResult.net && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-dark-400">Recibes</span>
                          <span className="text-[10px] text-white font-medium">${redemptionResult.net} USD</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-dark-400">Método</span>
                        <span className="text-[10px] text-white font-medium">
                          {redemptionResult.method === 'instant' ? '⚡ Instantáneo' : '🏦 Estándar'}
                        </span>
                      </div>
                      {redemptionResult.arrival && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-dark-400">Llegada estimada</span>
                          <span className="text-[10px] text-white font-medium">
                            {new Date(redemptionResult.arrival * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setRedemptionResult(null)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-white/[0.05] text-white hover:bg-white/[0.08] transition-colors"
                  >
                    {redemptionResult.success ? 'Redimir más' : 'Intentar de nuevo'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* How it works (sell) */}
            {isAccountReady && !redemptionResult && (
              <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 mb-5">
                <p className="text-xs font-semibold text-white mb-3">¿Cómo funciona la redención?</p>
                <div className="space-y-3">
                  {[
                    { step: '1', text: 'Ingresa la cantidad de KAIROS que deseas redimir' },
                    { step: '2', text: 'Elige pago estándar (gratis) o instantáneo (1% + $0.50)' },
                    { step: '3', text: 'Tus KAIROS se queman y USD se envía a tu cuenta bancaria' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-orange-400">{step}</span>
                      </div>
                      <p className="text-[11px] text-dark-400">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Redemption history toggle */}
            {isAccountReady && (
              <div className="mb-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-[11px] text-dark-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Clock size={12} /> {showHistory ? 'Ocultar' : 'Ver'} historial de redenciones
                </button>

                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {redeemHistory.length === 0 ? (
                        <p className="text-[10px] text-dark-500 text-center py-3">No tienes redenciones aún</p>
                      ) : (
                        redeemHistory.map(r => (
                          <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                            <div>
                              <p className="text-[11px] text-white font-medium">${r.amount} USD</p>
                              <p className="text-[9px] text-dark-500">
                                {new Date(r.created_at).toLocaleDateString()} • {r.payout_method === 'instant' ? '⚡' : '🏦'}
                              </p>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                              r.status === 'COMPLETED' || r.status === 'PAYOUT_SENT'
                                ? 'bg-green-500/15 text-green-400'
                                : r.status === 'PAYOUT_FAILED' || r.status === 'BURN_FAILED'
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-yellow-500/15 text-yellow-400'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Security notice */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
          <Shield size={12} className="text-green-400 shrink-0" />
          <p className="text-[10px] text-dark-400">
            {mode === 'buy'
              ? 'Pago procesado por Stripe. Kairos Wallet nunca accede a tu información bancaria ni datos de tarjeta.'
              : 'Pagos procesados por Stripe Connect. Tu información bancaria se maneja de forma segura por Stripe.'}
          </p>
        </div>

        {/* Chain indicator */}
        <p className="text-[10px] text-dark-500">
          {mode === 'buy' ? 'Recibiendo' : 'Redimiendo desde'} {chain?.icon} {chain?.name}
        </p>
      </div>
    </div>
  );
}
