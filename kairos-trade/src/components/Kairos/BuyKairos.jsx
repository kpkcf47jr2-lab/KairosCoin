// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Comprar KAIROS con Tarjeta (Stripe Checkout)
//  Permite a los usuarios comprar KairosCoin directamente desde la plataforma
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Shield, DollarSign, Zap, Loader2, CheckCircle2,
  AlertCircle, ExternalLink, ArrowRight, Wallet, Globe, Lock,
  TrendingUp, Star
} from 'lucide-react';
import useStore from '../../store/useStore';

const API_BASE = 'https://kairos-api-u6k5.onrender.com';
const QUICK_AMOUNTS = [25, 50, 100, 250, 500, 1000];
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;

export default function BuyKairos() {
  const { showToast, user } = useStore();

  // Auto-detect wallet from Kairos account
  const walletAddress = user?.walletAddress || '';
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, orderId, checkoutUrl, error }

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= MIN_AMOUNT && numAmount <= MAX_AMOUNT;
  const isValidWallet = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
  const canPurchase = isValidAmount && isValidWallet && !isLoading;

  // ── Stripe Checkout ──────────────────────────────────────────────────────
  const handleCheckout = useCallback(async () => {
    if (!canPurchase) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          amount: numAmount,
          currency: 'usd',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al crear checkout');
      }

      if (data.checkoutUrl) {
        setResult({ success: true, orderId: data.order?.id, checkoutUrl: data.checkoutUrl });
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        showToast?.('Redirigiendo a Stripe para completar tu compra...', 'success');
      } else {
        throw new Error('No se recibió URL de checkout');
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
      showToast?.(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, numAmount, canPurchase, showToast]);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'none' }}>
      <div className="max-w-2xl mx-auto">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 relative"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
            <span className="text-white text-3xl font-extrabold">K</span>
            <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: '0 0 40px rgba(59,130,246,0.3)' }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Comprar KairosCoin
          </h1>
          <p className="text-sm text-[var(--text-dim)] max-w-md mx-auto">
            Compra KAIROS directamente con tu tarjeta de crédito o débito. 1 KAIROS = 1 USD — Stablecoin respaldada.
          </p>
        </motion.div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Shield, label: 'Pago Seguro', desc: 'Stripe SSL 256-bit' },
            { icon: Zap, label: 'Entrega Inmediata', desc: 'Auto-mint a tu wallet' },
            { icon: DollarSign, label: '1:1 USD', desc: 'Precio fijo estable' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="p-3 rounded-xl text-center"
              style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.08)' }}>
              <Icon size={18} className="text-blue-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">{label}</p>
              <p className="text-[10px] text-blue-300/60">{desc}</p>
            </div>
          ))}
        </div>

        {/* Main Purchase Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(59,130,246,0.06) 0%, rgba(15,17,22,0.8) 100%)',
            border: '1px solid rgba(59,130,246,0.12)',
          }}
        >
          {/* Card Header */}
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Compra con Tarjeta</h2>
                <p className="text-xs text-blue-300/60">Visa, Mastercard, AMEX</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <Lock size={12} className="text-green-400" />
                <span className="text-[10px] font-bold text-green-400/80">SEGURO</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* Wallet Address — Auto-detected */}
            <div>
              <label className="block text-xs font-bold text-blue-300/80 mb-2">
                <Wallet size={12} className="inline mr-1.5" />
                Tu Wallet Kairos (BSC)
              </label>
              {isValidWallet ? (
                <div className="w-full px-4 py-3 rounded-xl text-sm font-mono flex items-center gap-2"
                  style={{ background: 'rgba(15,17,22,0.6)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--text)' }}>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>{walletAddress}</span>
                </div>
              ) : (
                <div className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(15,17,22,0.6)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--text-dim)' }}>
                  Wallet no disponible — cierra sesión y crea una nueva cuenta
                </div>
              )}
              {isValidWallet && (
                <p className="text-[10px] text-green-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Wallet detectada automáticamente — los KAIROS se depositarán aquí
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-blue-300/80 mb-2">
                <DollarSign size={12} className="inline mr-1.5" />
                Cantidad en USD (1 KAIROS = 1 USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  className="w-full pl-8 pr-20 py-3 rounded-xl text-sm font-bold transition-all duration-200"
                  style={{
                    background: 'rgba(15,17,22,0.6)',
                    border: amount
                      ? isValidAmount
                        ? '1px solid rgba(34,197,94,0.3)'
                        : '1px solid rgba(239,68,68,0.3)'
                      : '1px solid rgba(59,130,246,0.1)',
                    color: 'var(--text)',
                    outline: 'none',
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-blue-300/60 font-medium">
                  = {numAmount > 0 ? numAmount.toLocaleString() : '0'} KAIROS
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-dim)]/50 mt-1">
                Mín: ${MIN_AMOUNT} — Máx: ${MAX_AMOUNT.toLocaleString()} USD
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <label className="block text-xs font-bold text-blue-300/80 mb-2">Montos rápidos</label>
              <div className="grid grid-cols-6 gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    onClick={() => setAmount(String(qa))}
                    className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                      parseFloat(amount) === qa
                        ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                        : 'bg-white/[0.03] text-[var(--text-dim)] hover:bg-blue-500/10 hover:text-blue-300'
                    }`}
                  >
                    ${qa}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {numAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-xl p-4"
                style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.08)' }}
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-dim)]">Recibirás</span>
                    <span className="text-white font-bold">{numAmount.toLocaleString()} KAIROS</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-dim)]">Red</span>
                    <span className="text-blue-300 font-medium">BNB Smart Chain (BSC)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-dim)]">Método</span>
                    <span className="text-blue-300 font-medium">Tarjeta (Stripe)</span>
                  </div>
                  <div className="h-px bg-blue-500/10 my-1" />
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-bold">Total a pagar</span>
                    <span className="text-blue-400 font-extrabold text-lg">${numAmount.toLocaleString()} USD</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Purchase Button */}
            <button
              onClick={handleCheckout}
              disabled={!canPurchase}
              className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                canPurchase
                  ? 'text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99]'
                  : 'text-white/40 cursor-not-allowed'
              }`}
              style={{
                background: canPurchase
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                  : 'rgba(59,130,246,0.15)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Comprar {numAmount > 0 ? `${numAmount.toLocaleString()} KAIROS` : 'KAIROS'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Success Result */}
            <AnimatePresence>
              {result?.success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-green-400 mb-1">Checkout creado exitosamente</p>
                      <p className="text-xs text-[var(--text-dim)] mb-2">
                        Se abrió una ventana de Stripe para completar el pago. Si no se abrió, haz clic abajo.
                      </p>
                      <a
                        href={result.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Abrir Stripe Checkout
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              {result && !result.success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-400 mb-1">Error en checkout</p>
                      <p className="text-xs text-[var(--text-dim)]">{result.error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 grid grid-cols-2 gap-4"
        >
          <div className="p-4 rounded-xl" style={{ background: 'rgba(15,17,22,0.5)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Globe size={14} className="text-blue-400" />
              ¿Qué es KAIROS?
            </h3>
            <p className="text-xs text-[var(--text-dim)] leading-relaxed">
              KairosCoin es una stablecoin pegged 1:1 al USD. Cada token está respaldado por reservas verificables. 
              Desplegado en BSC, Base, Arbitrum y Polygon.
            </p>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'rgba(15,17,22,0.5)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Star size={14} className="text-blue-400" />
              Ventajas
            </h3>
            <ul className="text-xs text-[var(--text-dim)] space-y-1.5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-green-400 shrink-0" />
                Sin comisiones de compra
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-green-400 shrink-0" />
                Entrega automática a tu wallet
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-green-400 shrink-0" />
                Pago seguro con Stripe
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-green-400 shrink-0" />
                Disponible 24/7
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Powered by Stripe */}
        <div className="text-center mt-6 pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.04)' }}>
            <Lock size={12} className="text-blue-400/60" />
            <span className="text-[10px] text-blue-300/50 font-medium">Pagos procesados de forma segura por Stripe</span>
          </div>
        </div>

      </div>
    </div>
  );
}
