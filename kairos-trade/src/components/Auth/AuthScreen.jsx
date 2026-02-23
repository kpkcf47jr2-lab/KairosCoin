// Kairos Trade — Auth Screen (Premium v2)
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Shield, Zap, BarChart3, Sparkles } from 'lucide-react';
import useStore from '../../store/useStore';

const FEATURES = [
  { icon: BarChart3, label: 'Trading en tiempo real', desc: 'Gráficos profesionales con datos de Binance' },
  { icon: Sparkles, label: 'Inteligencia artificial', desc: 'Análisis de mercado impulsado por IA' },
  { icon: Zap, label: 'Bots automatizados', desc: 'Automatiza tus estrategias 24/7' },
  { icon: Shield, label: 'Paper Trading', desc: 'Practica sin riesgo con dinero virtual' },
];

export default function AuthScreen() {
  const { login } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Completa todos los campos'); return; }
    if (!isLogin && !form.name) { setError('Ingresa tu nombre'); return; }
    setLoading(true);
    setTimeout(() => {
      login({
        id: Date.now().toString(36),
        email: form.email,
        name: form.name || form.email.split('@')[0],
        plan: 'free',
        createdAt: new Date().toISOString(),
      });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[var(--dark)] flex">
      {/* Left panel — Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0B0E11 0%, #111827 50%, #0B0E11 100%)',
        }}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 0 25px rgba(59,130,246,0.3)' }}>
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-[var(--text)]">KAIROS</span>
                <span className="text-xs font-bold text-[var(--gold)] tracking-widest">TRADE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Features */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold text-[var(--text)] leading-tight mb-2">
            Trading inteligente,<br />
            <span className="text-[var(--gold)]">resultados reales.</span>
          </h2>
          <p className="text-sm text-[var(--text-dim)] mb-8">
            La plataforma de trading automatizado más avanzada del ecosistema Kairos 777.
          </p>

          <div className="space-y-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.1)' }}>
                    <Icon size={16} className="text-[var(--gold)]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text)]">{f.label}</p>
                    <p className="text-[11px] text-[var(--text-dim)]">{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom */}
        <p className="text-[10px] text-[var(--text-dim)]/30 relative z-10">
          © 2026 Kairos 777 Inc. Todos los derechos reservados.
        </p>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
              K
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-[var(--gold)]">KAIROS</span> <span className="text-[var(--text)]">TRADE</span>
            </h1>
          </div>

          {/* Form title */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[var(--text)]">
              {isLogin ? 'Bienvenido de vuelta' : 'Crear cuenta'}
            </h2>
            <p className="text-sm text-[var(--text-dim)] mt-1">
              {isLogin ? 'Inicia sesión para continuar' : 'Empieza a operar en minutos'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex mb-6 rounded-xl p-1"
            style={{ background: 'rgba(24,26,32,0.8)', border: '1px solid rgba(30,34,45,0.5)' }}>
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm rounded-lg transition-all duration-200
                ${isLogin ? 'text-white font-bold shadow-lg' : 'text-[var(--text-dim)] font-medium'}`}
              style={isLogin ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)' } : {}}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm rounded-lg transition-all duration-200
                ${!isLogin ? 'text-white font-bold shadow-lg' : 'text-[var(--text-dim)] font-medium'}`}
              style={!isLogin ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)' } : {}}
            >
              Registrarse
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-[11px] text-[var(--text-dim)] mb-1.5 block font-medium">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre completo"
                  className="w-full"
                />
              </div>
            )}
            <div>
              <label className="text-[11px] text-[var(--text-dim)] mb-1.5 block font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@email.com"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-dim)] mb-1.5 block font-medium">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-[var(--red)] bg-[var(--red)]/[0.06] border border-[var(--red)]/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Crear Cuenta'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-[var(--text-dim)]/50 text-center mt-6">
            Parte del ecosistema <span className="text-[var(--gold)] font-semibold">Kairos 777</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
