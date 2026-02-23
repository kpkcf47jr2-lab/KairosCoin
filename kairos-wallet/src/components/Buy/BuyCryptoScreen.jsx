// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Comprar KAIROS
//  Stripe Checkout — pago con tarjeta → auto-mint KAIROS
// ═══════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Shield, Zap, Loader2, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';

const API_BASE = 'https://kairos-api-u6k5.onrender.com';
const QUICK_AMOUNTS = [25, 50, 100, 250, 500, 1000];

export default function BuyCryptoScreen() {
  const { activeAddress, activeChainId, goBack, showToast } = useStore();
  const chain = CHAINS[activeChainId];

  const [stripeAmount, setStripeAmount] = useState('');
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  // ── Stripe Checkout ──
  const handleStripeCheckout = useCallback(async () => {
    const amount = parseFloat(stripeAmount);
    if (!amount || amount < 10) {
      showToast('Mínimo $10 USD', 'error');
      return;
    }
    if (amount > 50000) {
      showToast('Máximo $50,000 USD', 'error');
      return;
    }
    if (!activeAddress) {
      showToast('Conecta tu wallet primero', 'error');
      return;
    }

    setIsCreatingCheckout(true);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeAddress,
          amount,
          currency: 'usd',
        }),
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

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <h1 className="font-bold text-white">Comprar KAIROS</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">

        {/* ★ STRIPE — Comprar KAIROS con tarjeta ★ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#635BFF]/15 to-[#7A73FF]/5 rounded-2xl p-5 mb-5 border-2 border-[#635BFF]/30"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#635BFF]/20 flex items-center justify-center">
              <Zap size={20} className="text-[#635BFF]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">Pagar con Tarjeta</p>
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">
                  ACTIVO
                </span>
              </div>
              <p className="text-[10px] text-dark-400">Visa, Mastercard, Amex • Apple Pay • Google Pay</p>
            </div>
          </div>

          <p className="text-[11px] text-dark-400 mb-4 leading-relaxed">
            Paga con tarjeta de crédito/débito. KAIROS se acuña automáticamente 1:1 con USD y se envía directo a tu wallet.
          </p>

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_AMOUNTS.map(amt => (
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

          {/* Buy button */}
          <button
            onClick={handleStripeCheckout}
            disabled={isCreatingCheckout || !stripeAmount || parseFloat(stripeAmount) < 10}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#635BFF] to-[#7A73FF] text-white hover:shadow-lg hover:shadow-[#635BFF]/20"
          >
            {isCreatingCheckout ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creando sesión de pago...
              </>
            ) : (
              <>
                <CreditCard size={16} />
                Comprar {stripeAmount ? `$${parseFloat(stripeAmount).toLocaleString()} en ` : ''}KAIROS
              </>
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

        {/* Tip: Swap after buying */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-kairos-500/5 border border-kairos-500/10">
          <span className="text-sm">💡</span>
          <p className="text-[10px] text-dark-400">
            <strong className="text-kairos-400">Tip:</strong> Después de comprar KAIROS, ve a <strong className="text-white">Swap</strong> para intercambiarlos por BTC, ETH, BNB u otros tokens.
          </p>
        </div>

        {/* Security + Chain */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
          <Shield size={12} className="text-green-400 shrink-0" />
          <p className="text-[10px] text-dark-400">
            Pago procesado por Stripe. Kairos Wallet nunca accede a tu información bancaria ni datos de tarjeta.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
          <CheckCircle size={12} className="text-dark-500 shrink-0" />
          <p className="text-[10px] text-dark-500">
            Recibiendo en {chain?.icon} {chain?.name}
          </p>
        </div>
      </div>
    </div>
  );
}
