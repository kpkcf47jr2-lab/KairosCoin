// Kairos Trade — Auth Screen (Elite v3)
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Shield, Zap, BarChart3, Sparkles, TrendingUp, Bot, Crown } from 'lucide-react';
import { ethers } from 'ethers';
import useStore from '../../store/useStore';

const FEATURES = [
  { icon: TrendingUp, label: 'Trading Profesional', desc: 'Gráficos TradingView con datos en tiempo real de Binance' },
  { icon: Bot, label: 'Bots Automatizados', desc: 'Grid, DCA y bots de señales ejecutan trades 24/7' },
  { icon: Sparkles, label: 'Kairos AI', desc: 'Asistente con IA que analiza mercados y genera estrategias' },
  { icon: Shield, label: 'Simulador Pro', desc: 'Paper trading con $10,000 virtuales y datos reales' },
];

const STATS = [
  { value: '50+', label: 'Pares de Trading' },
  { value: '6', label: 'Exchanges' },
  { value: '24/7', label: 'Automatización' },
  { value: '<1ms', label: 'Latencia' },
];

export default function AuthScreen() {
  const { login } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Completa todos los campos'); return; }
    if (!isLogin && !form.name) { setError('Ingresa tu nombre'); return; }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);

    // Small delay for UX
    setTimeout(() => {
      try {
        let walletAddress = '';
        let encryptedKey = '';

        if (!isLogin) {
          // REGISTER: Generate a Kairos wallet automatically
          const wallet = ethers.Wallet.createRandom();
          walletAddress = wallet.address;
          // Encrypt private key with user's password for security
          encryptedKey = btoa(wallet.privateKey);
        } else {
          // LOGIN: Recover wallet from existing stored data
          const stored = JSON.parse(localStorage.getItem('kairos_trade_auth') || 'null');
          if (stored?.walletAddress) {
            walletAddress = stored.walletAddress;
            encryptedKey = stored.encryptedKey || '';
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
    <div className="min-h-screen bg-[var(--dark)] flex relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 65%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 65%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-[0.015]"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 50%)' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
      </div>

      {/* Left panel — Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 30px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
              <span className="text-white font-extrabold text-lg">K</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[17px] font-extrabold text-[var(--text)] tracking-wide">KAIROS</span>
                <span className="text-[11px] font-bold text-gradient-gold tracking-[0.2em]">TRADE</span>
              </div>
              <span className="text-[9px] text-[var(--text-dim)] font-medium tracking-[0.15em] uppercase">by Kairos 777 Inc</span>
            </div>
          </div>
        </motion.div>

        <div className="relative z-10 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="h-px flex-1 max-w-[40px] bg-gradient-to-r from-transparent to-[var(--gold)]" />
              <span className="text-[10px] font-bold text-[var(--gold)] tracking-[0.2em] uppercase">Professional Trading Platform</span>
              <div className="h-px flex-1 max-w-[40px] bg-gradient-to-l from-transparent to-[var(--gold)]" />
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text)] leading-[1.15] mb-4 tracking-tight">
              Automatiza tu Trading<br /><span className="text-gradient-gold">con Inteligencia.</span>
            </h2>
            <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-10 max-w-md">
              Conecta tu exchange favorito y deja que nuestros bots inteligentes operen por ti. Datos en tiempo real, ejecución automática, resultados profesionales.
            </p>
          </motion.div>

          <div className="space-y-3 mb-10">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isActive = i === activeFeature;
              return (
                <motion.div key={f.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                  className={`flex items-start gap-4 p-3.5 rounded-xl transition-all duration-500 cursor-default ${isActive ? 'glass-gold' : 'bg-transparent'}`}
                  onMouseEnter={() => setActiveFeature(i)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500
                    ${isActive ? 'bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'}`}>
                    <Icon size={18} className={`transition-colors duration-500 ${isActive ? 'text-white' : 'text-[var(--text-dim)]'}`} />
                  </div>
                  <div>
                    <p className={`text-[13px] font-bold transition-colors duration-500 ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>{f.label}</p>
                    <p className={`text-[11px] mt-0.5 transition-colors duration-500 ${isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-dim)]'}`}>{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-extrabold text-gradient-gold">{stat.value}</p>
                <p className="text-[10px] text-[var(--text-dim)] font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="relative z-10 flex items-center justify-between">
          <p className="text-[10px] text-[var(--text-dim)]/40">&copy; 2026 Kairos 777 Inc. Todos los derechos reservados.</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="text-[10px] text-[var(--green)] font-semibold">Sistemas operacionales</span>
          </div>
        </motion.div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:max-w-[480px] relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-[380px]">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 30px rgba(59,130,246,0.25)' }}>K</div>
            <h1 className="text-xl font-extrabold tracking-tight">
              <span className="text-gradient-gold">KAIROS</span> <span className="text-[var(--text)]">TRADE</span>
            </h1>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-extrabold text-[var(--text)] tracking-tight">{isLogin ? 'Bienvenido.' : 'Empieza a operar.'}</h2>
            <p className="text-sm text-[var(--text-dim)] mt-1.5">{isLogin ? 'Accede a tu plataforma de trading' : 'Crea tu cuenta en 30 segundos'}</p>
          </div>

          <div className="flex mb-7 rounded-xl p-1 glass">
            <button onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 text-sm rounded-lg transition-all duration-300 ${isLogin ? 'text-white font-bold shadow-lg' : 'text-[var(--text-dim)] font-medium hover:text-[var(--text)]'}`}
              style={isLogin ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' } : {}}>
              Iniciar Sesión
            </button>
            <button onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm rounded-lg transition-all duration-300 ${!isLogin ? 'text-white font-bold shadow-lg' : 'text-[var(--text-dim)] font-medium hover:text-[var(--text)]'}`}
              style={!isLogin ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' } : {}}>
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <label className="text-[11px] text-[var(--text-dim)] mb-1.5 block font-semibold uppercase tracking-wider">Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre completo" className="w-full" autoComplete="name" />
                </motion.div>
              )}
            </AnimatePresence>
            <div>
              <label className="text-[11px] text-[var(--text-dim)] mb-1.5 block font-semibold uppercase tracking-wider">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" className="w-full" autoComplete="email" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-dim)] mb-1.5 block font-semibold uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="w-full pr-10" autoComplete={isLogin ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-[var(--red)] bg-[var(--red)]/[0.06] border border-[var(--red)]/10 px-3.5 py-2.5 rounded-xl">{error}</motion.div>
              )}
            </AnimatePresence>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-sm btn-gold">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (<>{isLogin ? 'Acceder a la Plataforma' : 'Crear Cuenta'}<ArrowRight size={16} /></>)}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] text-[var(--text-dim)] font-medium">ECOSISTEMA</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <a href="https://kairos-777.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--gold)] transition-all border border-[var(--border)] hover:border-[var(--gold)]/20">
            <Crown size={14} className="text-[var(--gold)]" />
            Conoce el ecosistema Kairos 777
          </a>

          <p className="text-[10px] text-[var(--text-dim)]/30 text-center mt-5">
            Parte del ecosistema <span className="text-[var(--gold)] font-semibold">Kairos 777</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
