// Kairos Trade — Auth Screen (Premium v5 — Growth Landing + Onboarding)
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, ArrowRight, Crown, ShieldCheck, Bot, BarChart3,
  Zap, Sparkles, TrendingUp, Shield, Gift, Users, ChevronDown,
  ChevronRight, Globe, Lock, Cpu, DollarSign
} from 'lucide-react';
import { ethers } from 'ethers';
import useStore from '../../store/useStore';

/* ─── API Host ─── */
const API_HOST = 'https://kairos-api-u6k5.onrender.com';

/* ─── Kairos Logo (real PNG from wallet) ─── */
const KAIROS_LOGO = '/kairos-logo.png';

/* ─── Floating Particle Field ─── */
function ParticleField() {
  const particles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      dur: 15 + Math.random() * 25,
      delay: Math.random() * 8,
      opacity: 0.08 + Math.random() * 0.18,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute rounded-full bg-[#3B82F6]"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity }}
          animate={{ y: [0, -30, 0], x: [0, 15, -10, 0], opacity: [p.opacity, p.opacity * 1.8, p.opacity] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
    </div>
  );
}

/* ─── Animated Stats Bar ─── */
const STATS = [
  { value: '33+', label: 'Trading Pairs' },
  { value: '10', label: 'CEX Brokers' },
  { value: '24/7', label: 'AI Automation' },
  { value: '$0', label: 'Subscription' },
];

/* ─── Feature Cards for Landing ─── */
const FEATURES = [
  { icon: Bot, title: 'Bots Automáticos', desc: 'Trading 24/7 con estrategias personalizadas. Grid, DCA, y scripts avanzados.', color: '#3B82F6' },
  { icon: BarChart3, title: 'Gráficos Pro', desc: 'Charts en tiempo real con 7+ indicadores técnicos. Multi-chart y profundidad.', color: '#00DC82' },
  { icon: Sparkles, title: 'Kairos AI', desc: 'Asistente de trading inteligente que analiza tendencias y sugiere estrategias.', color: '#A855F7' },
  { icon: Shield, title: '10 Brokers Integrados', desc: 'Binance, Bybit, Coinbase, Kraken, OKX, KuCoin, y más. Un solo dashboard.', color: '#60A5FA' },
  { icon: Gift, title: '100 KAIROS Gratis', desc: 'Recibe 100 KAIROS al registrarte + 20 KAIROS por cada amigo que invites.', color: '#F59E0B' },
  { icon: Lock, title: 'Seguridad Total', desc: 'Encriptación bcrypt, JWT, 2FA. Tu wallet se genera automáticamente.', color: '#EF4444' },
];

/* ─── 2FA Code Input (6 digit boxes) ─── */
function TwoFAInput({ value, onChange }) {
  const inputRefs = useRef([]);
  const digits = value.padEnd(6, '').slice(0, 6).split('');

  const handleChange = useCallback((index, char) => {
    if (!/^\d?$/.test(char)) return;
    const next = [...digits];
    next[index] = char;
    const joined = next.join('');
    onChange(joined.replace(/\s/g, ''));
    if (char && index < 5) inputRefs.current[index + 1]?.focus();
  }, [digits, onChange]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }, [onChange]);

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={el => (inputRefs.current[i] = el)}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-11 h-14 text-center text-xl font-bold text-white rounded-xl outline-none transition-all duration-200 focus:ring-2 focus:ring-[#3B82F6]/60"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(59,130,246,0.15)',
            caretColor: '#3B82F6',
          }}
        />
      ))}
    </div>
  );
}

export default function AuthScreen() {
  const { login } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [signupBonus, setSignupBonus] = useState(null);

  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');

  // Read referral code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setIsLogin(false);
      setShowForm(true);
    }
  }, []);

  /* ─── API helper ─── */
  const apiFetch = async (path, body) => {
    const res = await fetch(`${API_HOST}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.message || data.error || 'Error del servidor');
    }
    return data;
  };

  /* ─── Complete login (shared by login + 2FA verify) ─── */
  const completeLogin = (data) => {
    const { user, accessToken, refreshToken } = data;
    // Persist wallet separately so it survives logout
    if (user.walletAddress) {
      localStorage.setItem('kairos_trade_wallet', JSON.stringify({
        walletAddress: user.walletAddress,
        encryptedKey: user.encryptedKey || '',
      }));
    }
    login({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      plan: user.plan || 'free',
      walletAddress: user.walletAddress || '',
      encryptedKey: user.encryptedKey || '',
      has2FA: user.has2FA || false,
      accessToken,
      refreshToken,
      createdAt: user.createdAt || new Date().toISOString(),
    });
  };

  /* ─── Submit: Register or Login ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) { setError('Completa todos los campos'); return; }
    if (!isLogin && !form.name) { setError('Ingresa tu nombre'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }

    setLoading(true);

    try {
      if (!isLogin) {
        /* ─── REGISTER ─── */
        const wallet = ethers.Wallet.createRandom();
        const walletAddress = wallet.address;
        const encryptedKey = btoa(wallet.privateKey);

        const data = await apiFetch('/api/auth/register', {
          email: form.email,
          password: form.password,
          name: form.name,
          walletAddress,
          encryptedKey,
          referralCode: referralCode || undefined,
        });

        // Persist wallet backup locally
        localStorage.setItem('kairos_trade_wallet', JSON.stringify({ walletAddress, encryptedKey }));

        // Show signup bonus notification
        if (data.data?.referral?.signupBonus) {
          setSignupBonus(data.data.referral.signupBonus.amount);
          setTimeout(() => setSignupBonus(null), 6000);
        }

        completeLogin(data.data);
      } else {
        /* ─── LOGIN ─── */
        const data = await apiFetch('/api/auth/login', {
          email: form.email,
          password: form.password,
        });

        if (data.requires2FA) {
          // Server requires 2FA — show OTP screen
          setTempToken(data.tempToken);
          setTotpCode('');
          setShow2FA(true);
        } else {
          completeLogin(data.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Submit: 2FA Verification ─── */
  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (totpCode.length !== 6) { setError('Ingresa los 6 dígitos'); return; }

    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/verify-2fa', {
        tempToken,
        totpCode,
      });
      completeLogin(data.data);
    } catch (err) {
      setError(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Exit 2FA screen ─── */
  const cancel2FA = () => {
    setShow2FA(false);
    setTotpCode('');
    setTempToken('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center relative overflow-hidden">

      {/* ── Background layers ── */}
      <ParticleField />
      <div className="absolute inset-0 pointer-events-none">
        {/* Deep radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 55%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 50%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, #050507 85%)' }} />
      </div>

      {/* ── Main Content ── */}
      <AnimatePresence mode="wait">
        {!showForm ? (
          /* ─────── LANDING PAGE — Scroll conversion ─────── */
          <motion.div key="splash" className="relative z-10 w-full h-full overflow-y-auto"
            exit={{ opacity: 0, y: -40, scale: 0.95 }} transition={{ duration: 0.4 }}
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>

            {/* ── Hero Section ── */}
            <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">

              {/* KairosCoin Logo */}
              <motion.div className="relative mb-6"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
                <img src={KAIROS_LOGO} alt="KairosCoin" className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.3)]" />
                <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.05, 0.15] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                  <div className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] rounded-full border border-[#3B82F6]/20" />
                </motion.div>
              </motion.div>

              {/* Brand */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}>
                <h1 className="text-5xl sm:text-6xl font-black tracking-[0.20em] text-white text-center"
                  style={{ textShadow: '0 0 60px rgba(59,130,246,0.3), 0 0 120px rgba(59,130,246,0.1)' }}>
                  KAIR<span className="relative inline-block align-middle" style={{ width: '0.92em', height: '0.92em', marginBottom: '0.02em' }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                      <defs>
                        <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#60A5FA" />
                          <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                      </defs>
                      <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="none" stroke="url(#nodeGrad)" strokeWidth="3" opacity="0.9" />
                      <line x1="50" y1="5" x2="50" y2="50" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
                      <line x1="93" y1="27.5" x2="50" y2="50" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
                      <line x1="93" y1="72.5" x2="50" y2="50" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
                      <line x1="50" y1="95" x2="50" y2="50" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
                      <line x1="7" y1="72.5" x2="50" y2="50" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
                      <line x1="7" y1="27.5" x2="50" y2="50" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
                      <circle cx="50" cy="50" r="6" fill="url(#nodeGrad)" />
                      <circle cx="50" cy="5" r="4" fill="#60A5FA" />
                      <circle cx="93" cy="27.5" r="4" fill="#60A5FA" />
                      <circle cx="93" cy="72.5" r="4" fill="#60A5FA" />
                      <circle cx="50" cy="95" r="4" fill="#60A5FA" />
                      <circle cx="7" cy="72.5" r="4" fill="#60A5FA" />
                      <circle cx="7" cy="27.5" r="4" fill="#60A5FA" />
                    </svg>
                  </span>S
                </h1>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#3B82F6]/60" />
                  <span className="text-[13px] font-bold tracking-[0.4em] text-[#3B82F6]/80 uppercase">Trade</span>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#3B82F6]/60" />
                </div>
              </motion.div>

              {/* Hero tagline */}
              <motion.div className="text-center mt-8 max-w-lg"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
                  Tu Plataforma de Trading
                  <span className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent"> Automatizado</span>
                </h2>
                <p className="text-sm sm:text-base text-white/40 mt-3 leading-relaxed">
                  Conecta 10+ brokers, despliega bots de trading con AI, y opera 33+ pares de crypto — todo desde un solo dashboard profesional.
                </p>
              </motion.div>

              {/* Stats row */}
              <motion.div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-8"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
                {STATS.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-xl sm:text-2xl font-black text-[#3B82F6]">{s.value}</p>
                    <p className="text-[10px] text-white/30 font-semibold tracking-wider uppercase mt-0.5">{s.label}</p>
                  </div>
                ))}
              </motion.div>

              {/* Double CTA */}
              <motion.div className="flex flex-col sm:flex-row gap-3 mt-10"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>
                <button onClick={() => { setShowForm(true); setIsLogin(false); }}
                  className="group relative px-8 py-4 rounded-2xl text-white font-bold text-[15px] tracking-wide overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 40px rgba(59,130,246,0.3), 0 4px 20px rgba(59,130,246,0.2)' }}>
                  <span className="relative z-10 flex items-center gap-2">
                    Crear Cuenta Gratis
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
                <button onClick={() => { setShowForm(true); setIsLogin(true); }}
                  className="px-8 py-4 rounded-2xl text-white/60 font-semibold text-[15px] tracking-wide transition-all duration-300 hover:text-white hover:scale-[1.02]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Ya tengo cuenta
                </button>
              </motion.div>

              {/* Signup bonus badge */}
              <motion.div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
                <Gift size={14} className="text-amber-400" />
                <span className="text-xs text-amber-400/90 font-semibold">Recibe 100 KAIROS gratis al registrarte</span>
              </motion.div>

              {/* Scroll hint */}
              <motion.div className="mt-10 flex flex-col items-center gap-1"
                initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 2.5 }}
                onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <span className="text-[10px] text-white/30 font-semibold tracking-wider uppercase cursor-pointer hover:text-white/50 transition">Descubre más</span>
                <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ChevronDown size={16} className="text-white/30" />
                </motion.div>
              </motion.div>
            </div>

            {/* ── Features Section ── */}
            <div id="features-section" className="px-6 pb-24 max-w-4xl mx-auto">
              <motion.div className="text-center mb-12"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  Todo lo que necesitas para
                  <span className="bg-gradient-to-r from-[#3B82F6] to-[#A855F7] bg-clip-text text-transparent"> operar como un pro</span>
                </h3>
                <p className="text-sm text-white/35 mt-3 max-w-md mx-auto">Sin suscripción, sin límites. Regístrate en 30 segundos y accede a herramientas de nivel institucional.</p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map((f, i) => (
                  <motion.div key={f.title}
                    className="rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: `linear-gradient(135deg, ${f.color}08, ${f.color}03)`,
                      border: `1px solid ${f.color}18`,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ borderColor: `${f.color}40` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${f.color}15` }}>
                      <f.icon size={20} style={{ color: f.color }} />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">{f.title}</h4>
                    <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Social proof */}
              <motion.div className="mt-12 text-center flex flex-col items-center"
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <div className="flex items-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">4</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Blockchains</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">BSC • Base • Arbitrum • Polygon</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Redes soportadas</p>
                  </div>
                </div>

                {/* Final CTA */}
                <button onClick={() => { setShowForm(true); setIsLogin(false); }}
                  className="group px-10 py-4 rounded-2xl text-white font-bold text-[15px] overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 40px rgba(59,130,246,0.3)' }}>
                  <span className="flex items-center gap-2">
                    Empieza Gratis Ahora
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                <a href="https://kairos-777.com" target="_blank" rel="noopener noreferrer"
                  className="mt-6 flex items-center gap-2 text-[11px] text-white/20 hover:text-[#3B82F6]/60 transition-colors">
                  <Crown size={12} />
                  <span>Ecosistema Kairos 777</span>
                </a>

                <p className="mt-4 text-[10px] text-white/15">&copy; 2026 Kairos 777 Inc &bull; by Mario Isaac</p>
              </motion.div>
            </div>

            {/* Fixed bottom bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
              <div className="flex items-center justify-center gap-4 py-3 pointer-events-auto"
                style={{ background: 'linear-gradient(to top, #050507 60%, transparent)' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00DC82] animate-pulse" />
                  <span className="text-[10px] text-[#00DC82]/70 font-semibold">Sistemas operacionales</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ─────── LOGIN/REGISTER FORM ─────── */
          <motion.div key="form" className="relative z-10 w-full max-w-[420px] px-6"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

            {/* Back to splash + mini logo */}
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => { setShowForm(false); setShow2FA(false); setError(''); }}
                className="flex items-center gap-2 text-[12px] text-white/30 hover:text-[#3B82F6] transition-colors">
                <ArrowRight size={14} className="rotate-180" />
                <span>Volver</span>
              </button>
              <div className="flex items-center gap-2.5">
                <img src={KAIROS_LOGO} alt="Kairos" className="w-8 h-8 object-contain" />
                <span className="text-[14px] font-extrabold text-white tracking-wider">KAIROS</span>
              </div>
            </div>

            {/* Glass card */}
            <div className="rounded-2xl p-7 sm:p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(59,130,246,0.1)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>

              <AnimatePresence mode="wait">
                {show2FA ? (
                  /* ─────── 2FA VERIFICATION SCREEN ─────── */
                  <motion.div key="2fa"
                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}>

                    <div className="flex flex-col items-center mb-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <ShieldCheck size={28} className="text-[#3B82F6]" />
                      </div>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">Verificación 2FA</h2>
                      <p className="text-sm text-white/35 mt-1.5 text-center">Ingresa el código de tu app autenticadora</p>
                    </div>

                    <form onSubmit={handle2FASubmit} className="space-y-5">
                      <TwoFAInput value={totpCode} onChange={setTotpCode} />

                      <AnimatePresence>
                        {error && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="text-xs text-[#FF4757] bg-[#FF4757]/[0.06] border border-[#FF4757]/10 px-3.5 py-2.5 rounded-xl text-center">{error}</motion.div>
                        )}
                      </AnimatePresence>

                      <button type="submit" disabled={loading || totpCode.length !== 6}
                        className="w-full py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-bold text-white hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 30px rgba(59,130,246,0.2), 0 4px 15px rgba(59,130,246,0.2)' }}>
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (<>Verificar<ArrowRight size={16} /></>)}
                      </button>

                      <button type="button" onClick={cancel2FA}
                        className="w-full text-center text-[12px] text-white/30 hover:text-[#3B82F6] transition-colors py-1">
                        Volver al login
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  /* ─────── NORMAL LOGIN / REGISTER ─────── */
                  <motion.div key="auth-form"
                    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.3 }}>

                    <div className="mb-6">
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">
                        {isLogin ? 'Bienvenido.' : 'Empieza a operar.'}
                      </h2>
                      <p className="text-sm text-white/35 mt-1.5">
                        {isLogin ? 'Accede a tu plataforma de trading' : 'Crea tu cuenta y recibe tu wallet'}
                      </p>
                    </div>

                    {/* Toggle */}
                    <div className="flex mb-6 rounded-xl p-1"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <button onClick={() => { setIsLogin(true); setError(''); }}
                        className={`flex-1 py-2.5 text-sm rounded-lg transition-all duration-300 ${isLogin ? 'text-white font-bold shadow-lg' : 'text-white/30 font-medium hover:text-white/60'}`}
                        style={isLogin ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 15px rgba(59,130,246,0.25)' } : {}}>
                        Iniciar Sesión
                      </button>
                      <button onClick={() => { setIsLogin(false); setError(''); }}
                        className={`flex-1 py-2.5 text-sm rounded-lg transition-all duration-300 ${!isLogin ? 'text-white font-bold shadow-lg' : 'text-white/30 font-medium hover:text-white/60'}`}
                        style={!isLogin ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 15px rgba(59,130,246,0.25)' } : {}}>
                        Registrarse
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <AnimatePresence mode="wait">
                        {!isLogin && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                            <label className="text-[11px] text-white/30 mb-1.5 block font-semibold uppercase tracking-wider">Nombre</label>
                            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                              placeholder="Tu nombre completo" className="w-full" autoComplete="name"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '0.75rem', padding: '0.65rem 0.85rem', fontSize: '0.875rem' }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div>
                        <label className="text-[11px] text-white/30 mb-1.5 block font-semibold uppercase tracking-wider">Email</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="tu@email.com" className="w-full" autoComplete="email"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '0.75rem', padding: '0.65rem 0.85rem', fontSize: '0.875rem' }} />
                      </div>
                      <div>
                        <label className="text-[11px] text-white/30 mb-1.5 block font-semibold uppercase tracking-wider">Contraseña</label>
                        <div className="relative">
                          <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••" className="w-full pr-10" autoComplete={isLogin ? 'current-password' : 'new-password'}
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '0.75rem', padding: '0.65rem 0.85rem', fontSize: '0.875rem' }} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#3B82F6] transition-colors">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <AnimatePresence mode="wait">
                        {!isLogin && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                            <label className="text-[11px] text-white/30 mb-1.5 block font-semibold uppercase tracking-wider">Código de Referido <span className="text-white/15">(opcional)</span></label>
                            <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                              placeholder="KAI-XXXXXXXX" className="w-full" maxLength={12}
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '0.75rem', padding: '0.65rem 0.85rem', fontSize: '0.875rem', letterSpacing: '0.05em' }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {error && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="text-xs text-[#FF4757] bg-[#FF4757]/[0.06] border border-[#FF4757]/10 px-3.5 py-2.5 rounded-xl">{error}</motion.div>
                        )}
                      </AnimatePresence>
                      <button type="submit" disabled={loading}
                        className="w-full py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-bold text-white hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 30px rgba(59,130,246,0.2), 0 4px 15px rgba(59,130,246,0.2)' }}>
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (<>{isLogin ? 'Acceder a la Plataforma' : 'Crear Cuenta'}<ArrowRight size={16} /></>)}
                      </button>
                    </form>

                    {/* Wallet info */}
                    {!isLogin && (
                      <motion.div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                        <span className="text-[11px] text-[#3B82F6]/70 font-medium">Tu Kairos Wallet se genera automáticamente al registrarte</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-[10px] text-white/15 text-center mt-6">
              Parte del ecosistema <span className="text-[#3B82F6]/40 font-semibold">Kairos 777</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signup Bonus Toast */}
      <AnimatePresence>
        {signupBonus && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.15))',
              border: '1px solid rgba(59,130,246,0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}>
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-sm font-bold text-white">¡Bienvenido a Kairos!</p>
              <p className="text-xs text-[#3B82F6]">+{signupBonus} KAIROS de regalo</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
