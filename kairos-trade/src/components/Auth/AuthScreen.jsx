// Kairos Trade — Auth Screen (Login/Register)
import { useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';

export default function AuthScreen() {
  const { login } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Completa todos los campos');
      return;
    }

    if (!isLogin && !form.name) {
      setError('Ingresa tu nombre');
      return;
    }

    setLoading(true);

    // Simulate auth (in production: connect to backend)
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
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--gold)] flex items-center justify-center text-black font-bold text-2xl mx-auto mb-4">
            K
          </div>
          <h1 className="text-2xl font-bold text-[var(--gold)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            KAIROS TRADE
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Trading automatizado con inteligencia artificial
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex mb-6 bg-[var(--dark-3)] rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${isLogin ? 'bg-[var(--gold)] text-black font-bold' : 'text-[var(--text-dim)]'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${!isLogin ? 'bg-[var(--gold)] text-black font-bold' : 'text-[var(--text-dim)]'}`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs text-[var(--text-dim)] mb-1 block">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre"
                  className="w-full"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--text-dim)] mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@email.com"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-dim)] mb-1 block">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full"
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--red)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--gold)] text-black font-bold rounded-xl hover:bg-[var(--gold-light)] transition-colors disabled:opacity-50"
            >
              {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Crear Cuenta'}
            </button>
          </form>

          <p className="text-xs text-[var(--text-dim)] text-center mt-4">
            Parte del ecosistema <span className="text-[var(--gold)]">Kairos 777</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
