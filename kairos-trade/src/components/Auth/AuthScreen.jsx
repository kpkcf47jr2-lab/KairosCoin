// Kairos Trade — Auth Screen (Premium v4 — Decentralized Logo)
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Crown } from 'lucide-react';
import { ethers } from 'ethers';
import useStore from '../../store/useStore';

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
  { value: '10', label: 'Brokers' },
  { value: '24/7', label: 'Automation' },
  { value: '100%', label: 'Real Trading' },
];

export default function AuthScreen() {
  const { login } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Completa todos los campos'); return; }
    if (!isLogin && !form.name) { setError('Ingresa tu nombre'); return; }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);

    setTimeout(() => {
      try {
        let walletAddress = '';
        let encryptedKey = '';

        if (!isLogin) {
          // REGISTER: Generate a Kairos wallet automatically
          const wallet = ethers.Wallet.createRandom();
          walletAddress = wallet.address;
          encryptedKey = btoa(wallet.privateKey);
          // Also persist wallet separately so it survives logout
          localStorage.setItem('kairos_trade_wallet', JSON.stringify({ walletAddress, encryptedKey }));
        } else {
          // LOGIN: Try to recover wallet from multiple sources
          const stored = JSON.parse(localStorage.getItem('kairos_trade_auth') || 'null');
          const walletBackup = JSON.parse(localStorage.getItem('kairos_trade_wallet') || 'null');
          if (stored?.walletAddress) {
            walletAddress = stored.walletAddress;
            encryptedKey = stored.encryptedKey || '';
          } else if (walletBackup?.walletAddress) {
            walletAddress = walletBackup.walletAddress;
            encryptedKey = walletBackup.encryptedKey || '';
          }
          // If still no wallet (first-time login or data lost), generate one
          if (!walletAddress) {
            const wallet = ethers.Wallet.createRandom();
            walletAddress = wallet.address;
            encryptedKey = btoa(wallet.privateKey);
            localStorage.setItem('kairos_trade_wallet', JSON.stringify({ walletAddress, encryptedKey }));
          }
        }

        login({
          id: Date.now().toString(36),
          email: form.email,
          name: form.name || form.email.split('@')[0],
          plan: 'free',
          walletAddress,
          encryptedKey,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        setError('Error creando cuenta: ' + err.message);
      }
      setLoading(false);
    }, 800);
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
          /* ─────── SPLASH — Logo + Title ─────── */
          <motion.div key="splash" className="relative z-10 flex flex-col items-center text-center px-6"
            exit={{ opacity: 0, y: -40, scale: 0.95 }} transition={{ duration: 0.4 }}>

            {/* KairosCoin Logo — Large & Centered */}
            <motion.div className="relative mb-6"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
              <img src={KAIROS_LOGO} alt="KairosCoin" className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.3)]" />
              {/* Ambient ring pulse behind logo */}
              <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.05, 0.15] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full border border-[#3B82F6]/20" />
              </motion.div>
            </motion.div>

            {/* KAIROS text */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.8 }}>
              <h1 className="text-6xl sm:text-7xl font-black tracking-[0.25em] text-white relative"
                style={{ textShadow: '0 0 60px rgba(59,130,246,0.3), 0 0 120px rgba(59,130,246,0.1)' }}>
                KAIR<span className="relative inline-block align-middle" style={{ width: '0.85em', height: '0.85em', marginBottom: '0.05em' }}>
                  <img src={KAIROS_LOGO} alt="O" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </span>S
              </h1>
              <motion.div className="flex items-center justify-center gap-3 mt-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#3B82F6]/60" />
                <span className="text-[13px] font-bold tracking-[0.4em] text-[#3B82F6]/80 uppercase">Trade</span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#3B82F6]/60" />
              </motion.div>
              <motion.p className="text-[13px] text-white/30 mt-2 tracking-[0.15em] font-medium"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
                by Kairos 777 Inc
              </motion.p>
            </motion.div>

            {/* Tagline */}
            <motion.p className="text-lg sm:text-xl text-white/50 mt-8 max-w-md font-light leading-relaxed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
              Decentralized Leverage Trading.<br />
              <span className="text-[#3B82F6]/90 font-medium">100% Real. Zero Simulation.</span>
            </motion.p>

            {/* Stats row */}
            <motion.div className="flex gap-8 sm:gap-12 mt-10"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }}>
              {STATS.map((s, i) => (
                <div key={s.label} className="text-center">
                  <p className="text-xl sm:text-2xl font-black text-[#3B82F6]">{s.value}</p>
                  <p className="text-[10px] text-white/30 font-semibold tracking-wider uppercase mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.button onClick={() => setShowForm(true)}
              className="mt-12 group relative px-10 py-4 rounded-2xl text-white font-bold text-[15px] tracking-wide overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 40px rgba(59,130,246,0.3), 0 4px 20px rgba(59,130,246,0.2)' }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5 }}
              whileHover={{ boxShadow: '0 0 60px rgba(59,130,246,0.45), 0 8px 30px rgba(59,130,246,0.3)' }}>
              <span className="relative z-10 flex items-center gap-2">
                Comenzar a Operar
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </motion.button>

            {/* Ecosystem link */}
            <motion.a href="https://kairos-777.com" target="_blank" rel="noopener noreferrer"
              className="mt-6 flex items-center gap-2 text-[11px] text-white/20 hover:text-[#3B82F6]/60 transition-colors"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}>
              <Crown size={12} />
              <span>Ecosistema Kairos 777</span>
            </motion.a>

            {/* Footer — fixed at bottom of viewport */}
            <motion.div className="fixed bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-50 pointer-events-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00DC82] animate-pulse" />
                <span className="text-[10px] text-[#00DC82]/70 font-semibold">Sistemas operacionales</span>
              </div>
              <span className="text-[10px] text-white/10">|</span>
              <span className="text-[10px] text-white/15">&copy; 2026 Kairos 777 Inc</span>
            </motion.div>
          </motion.div>
        ) : (
          /* ─────── LOGIN/REGISTER FORM ─────── */
          <motion.div key="form" className="relative z-10 w-full max-w-[420px] px-6"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

            {/* Back to splash + mini logo */}
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setShowForm(false)}
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
            </div>

            <p className="text-[10px] text-white/15 text-center mt-6">
              Parte del ecosistema <span className="text-[#3B82F6]/40 font-semibold">Kairos 777</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
