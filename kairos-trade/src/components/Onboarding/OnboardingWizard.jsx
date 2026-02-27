// Kairos Trade — Onboarding Wizard (Post-Registration)
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, Rocket, Shield, Bot,
  BarChart3, Gift, Copy, Share2, X, Sparkles
} from 'lucide-react';
import useStore from '../../store/useStore';

/* ─── Onboarding Steps ─── */
const STEPS = [
  {
    id: 'welcome',
    icon: Rocket,
    color: '#3B82F6',
    title: '¡Bienvenido a Kairos 777!',
    subtitle: 'Tu plataforma de trading automatizado está lista.',
    body: 'Hemos creado tu cuenta con una wallet blockchain y 100 KAIROS de regalo. En los próximos pasos te mostraremos cómo sacar el máximo provecho.',
    tip: 'Tu wallet Kairos se generó automáticamente con encriptación de grado militar.',
  },
  {
    id: 'broker',
    icon: Shield,
    color: '#60A5FA',
    title: 'Conecta tu Broker',
    subtitle: 'Vincula tu exchange para operar en vivo.',
    body: 'Soportamos 10+ brokers: Binance, Bybit, Coinbase, Kraken, OKX, KuCoin, y más. Puedes empezar en modo simulador sin conectar un broker.',
    tip: 'Ve a Brokers → Agregar Broker y pega tus API keys. Nunca accedemos a tus fondos directamente.',
    action: 'brokers',
    actionLabel: 'Ir a Brokers',
  },
  {
    id: 'trade',
    icon: BarChart3,
    color: '#00DC82',
    title: 'Tu Primera Operación',
    subtitle: 'Abre tu primer trade en segundos.',
    body: 'Ve al Chart, selecciona un par (ej. BTCKAIROS), ajusta tu tamaño de posición y apalancamiento, y ejecuta. También puedes usar el Simulador para practicar sin riesgo.',
    tip: 'El Simulador usa precios reales pero con balance virtual — perfecto para aprender.',
    action: 'chart',
    actionLabel: 'Ir al Chart',
  },
  {
    id: 'bots',
    icon: Bot,
    color: '#A855F7',
    title: 'Automatiza con Bots',
    subtitle: 'Deja que los bots trabajen por ti 24/7.',
    body: 'Crea bots Grid, DCA o escribe scripts personalizados con Kairos Script. Los bots ejecutan trades automáticamente basados en tus reglas.',
    tip: 'Empieza con un Grid Bot en BTCKAIROS — configura rango de precio y número de grids.',
    action: 'bots',
    actionLabel: 'Crear un Bot',
  },
  {
    id: 'referral',
    icon: Gift,
    color: '#F59E0B',
    title: 'Invita y Gana',
    subtitle: 'Gana 20 KAIROS por cada amigo.',
    body: 'Comparte tu código de referido y gana 20 KAIROS por cada persona que se registre. Tus amigos también reciben 100 KAIROS de bienvenida.',
    tip: null,
    showReferral: true,
  },
];

/* ─── Step Indicator Dots ─── */
function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="relative">
          <motion.div
            className="w-2.5 h-2.5 rounded-full transition-all duration-300"
            style={{
              background: i === current ? '#3B82F6' : i < current ? '#3B82F6' : 'rgba(255,255,255,0.1)',
              scale: i === current ? 1.2 : 1,
            }}
          />
          {i < current && (
            <Check size={8} className="absolute inset-0 m-auto text-white" strokeWidth={3} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main Onboarding Wizard ─── */
export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const { user, setPage } = useStore();

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const referralCode = user?.referralCode || 'KAI-XXXXXXXX';
  const referralLink = `https://kairos-trade.netlify.app?ref=${referralCode}`;

  const handleNext = useCallback(() => {
    if (isLast) {
      // Mark onboarding as completed
      if (user?.id) {
        localStorage.setItem(`kairos_onboarding_done_${user.id}`, '1');
      }
      onComplete?.();
    } else {
      setStep(s => s + 1);
    }
  }, [isLast, onComplete, user?.id]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    if (user?.id) {
      localStorage.setItem(`kairos_onboarding_done_${user.id}`, '1');
    }
    onComplete?.();
  }, [onComplete, user?.id]);

  const handleAction = useCallback((page) => {
    if (user?.id) {
      localStorage.setItem(`kairos_onboarding_done_${user.id}`, '1');
    }
    setPage(page);
    onComplete?.();
  }, [setPage, onComplete, user?.id]);

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const handleShare = useCallback((platform) => {
    const msg = encodeURIComponent(`Únete a Kairos 777 — plataforma de trading automatizado con 10+ brokers y bots AI. Usa mi código ${referralCode} y recibe 100 KAIROS gratis: ${referralLink}`);
    const urls = {
      whatsapp: `https://wa.me/?text=${msg}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${msg}`,
      twitter: `https://twitter.com/intent/tweet?text=${msg}`,
    };
    window.open(urls[platform], '_blank');
  }, [referralCode, referralLink]);

  const Icon = currentStep.icon;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(20px)' }}
    >
      {/* Skip button */}
      <button onClick={handleSkip}
        className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/60 transition-colors"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <X size={12} />
        Saltar tutorial
      </button>

      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <StepDots current={step} total={STEPS.length} />
          <span className="text-[10px] text-white/20 font-semibold">{step + 1}/{STEPS.length}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl p-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(15,17,23,0.95), rgba(10,12,18,0.98))',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: `0 0 80px ${currentStep.color}10`,
            }}
          >
            {/* Background glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${currentStep.color}, transparent)` }} />

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 relative"
              style={{ background: `${currentStep.color}15`, border: `1px solid ${currentStep.color}25` }}>
              <Icon size={26} style={{ color: currentStep.color }} />
              <motion.div className="absolute inset-0 rounded-2xl"
                animate={{ opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ border: `1px solid ${currentStep.color}30` }} />
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold text-white mb-1">{currentStep.title}</h2>
            <p className="text-sm text-white/50 mb-4">{currentStep.subtitle}</p>
            <p className="text-sm text-white/35 leading-relaxed mb-5">{currentStep.body}</p>

            {/* Tip box */}
            {currentStep.tip && (
              <div className="rounded-xl p-3 mb-5 flex items-start gap-2.5"
                style={{ background: `${currentStep.color}08`, border: `1px solid ${currentStep.color}15` }}>
                <Sparkles size={14} className="shrink-0 mt-0.5" style={{ color: currentStep.color }} />
                <p className="text-xs text-white/40 leading-relaxed">{currentStep.tip}</p>
              </div>
            )}

            {/* Referral section (last step) */}
            {currentStep.showReferral && (
              <div className="space-y-3 mb-5">
                {/* Code */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl px-4 py-3 text-sm font-mono text-amber-400 font-bold tracking-wider"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    {referralCode}
                  </div>
                  <button onClick={() => handleCopy(referralCode)}
                    className="px-3 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-amber-400/60" />}
                  </button>
                </div>

                {/* Link */}
                <button onClick={() => handleCopy(referralLink)}
                  className="w-full text-left rounded-xl px-4 py-2.5 text-xs text-white/30 truncate hover:text-white/50 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {referralLink}
                </button>

                {/* Share buttons */}
                <div className="flex gap-2">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', bg: '#25D366' },
                    { id: 'telegram', label: 'Telegram', bg: '#0088cc' },
                    { id: 'twitter', label: 'X / Twitter', bg: '#1DA1F2' },
                  ].map(p => (
                    <button key={p.id} onClick={() => handleShare(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all hover:scale-[1.02]"
                      style={{ background: `${p.bg}15`, border: `1px solid ${p.bg}25` }}>
                      <Share2 size={12} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-2">
              {step > 0 ? (
                <button onClick={handleBack}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <ArrowLeft size={14} />
                  Atrás
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {/* Quick action button (navigate to feature) */}
                {currentStep.action && (
                  <button onClick={() => handleAction(currentStep.action)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                    style={{
                      color: currentStep.color,
                      background: `${currentStep.color}10`,
                      border: `1px solid ${currentStep.color}25`,
                    }}>
                    {currentStep.actionLabel}
                  </button>
                )}

                {/* Next / Finish button */}
                <button onClick={handleNext}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.03]"
                  style={{
                    background: isLast
                      ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                      : 'rgba(59,130,246,0.15)',
                    border: isLast ? 'none' : '1px solid rgba(59,130,246,0.25)',
                    boxShadow: isLast ? '0 0 30px rgba(59,130,246,0.3)' : 'none',
                  }}>
                  {isLast ? 'Empezar a Operar' : 'Siguiente'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
