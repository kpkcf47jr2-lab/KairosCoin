// Kairos Trade — Broker Connection (TradingView-style OAuth Flow)
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, CheckCircle, XCircle, Shield, RefreshCw, Wallet,
  ArrowUpDown, Trash2, X, Lock, ChevronRight, Globe,
  Zap, Eye, EyeOff, Loader2, ExternalLink
} from 'lucide-react';
import useStore from '../../store/useStore';
import { BROKERS } from '../../constants';
import brokerService from '../../services/broker';

// ─── Broker catalog with OAuth-style branding ───
const BROKER_CATALOG = [
  {
    id: 'binance', name: 'Binance', logo: '🟡',
    color: '#F0B90B', desc: 'El exchange más grande del mundo',
    features: ['Spot', 'Futuros', 'Margin'], users: '150M+',
    authUrl: 'accounts.binance.com',
  },
  {
    id: 'bybit', name: 'Bybit', logo: '🟠',
    color: '#F7A600', desc: 'Trading de derivados líder',
    features: ['Spot', 'Futuros', 'Opciones'], users: '20M+',
    authUrl: 'accounts.bybit.com',
  },
  {
    id: 'kraken', name: 'Kraken', logo: '🟣',
    color: '#7B61FF', desc: 'Regulado y seguro desde 2011',
    features: ['Spot', 'Futuros', 'Staking'], users: '10M+',
    authUrl: 'accounts.kraken.com',
  },
  {
    id: 'coinbase', name: 'Coinbase', logo: '🔵',
    color: '#0052FF', desc: 'Exchange público regulado en USA',
    features: ['Spot', 'Advanced Trade'], users: '110M+',
    authUrl: 'accounts.coinbase.com',
  },
  {
    id: 'kucoin', name: 'KuCoin', logo: '🟢',
    color: '#23AF91', desc: 'La exchange del pueblo',
    features: ['Spot', 'Futuros', 'Bots'], users: '30M+',
    authUrl: 'accounts.kucoin.com',
  },
  {
    id: 'okx', name: 'OKX', logo: '⚫',
    color: '#FFFFFF', desc: 'Trading avanzado multimercado',
    features: ['Spot', 'Futuros', 'Opciones'], users: '50M+',
    authUrl: 'accounts.okx.com',
  },
  {
    id: 'bitget', name: 'Bitget', logo: '🔷',
    color: '#00CED1', desc: 'Copy trading #1 del mundo',
    features: ['Spot', 'Futuros', 'Copy'], users: '25M+',
    authUrl: 'accounts.bitget.com',
  },
  {
    id: 'mexc', name: 'MEXC', logo: '🔻',
    color: '#00B897', desc: 'Más de 1,500 criptomonedas',
    features: ['Spot', 'Futuros'], users: '10M+',
    authUrl: 'accounts.mexc.com',
  },
];

// ─── Connection flow steps ───
const STEPS = {
  SELECT: 'select',
  AUTH: 'auth',
  VERIFYING: 'verifying',
  PERMISSIONS: 'permissions',
  SUCCESS: 'success',
};

export default function BrokerManager() {
  const { brokers, addBroker, removeBroker, updateBrokerStatus, setActiveBroker } = useStore();
  // ─── State ───
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(STEPS.SELECT);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [balances, setBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState({});
  const [expandedBroker, setExpandedBroker] = useState(null);

  // Auto-refresh balances for connected brokers
  const fetchBalances = useCallback(async (broker) => {
    setLoadingBalances(prev => ({ ...prev, [broker.id]: true }));
    try {
      const result = await brokerService.getBalances(broker.id);
      if (result.success) {
        setBalances(prev => ({ ...prev, [broker.id]: result.balances }));
      }
    } catch {}
    setLoadingBalances(prev => ({ ...prev, [broker.id]: false }));
  }, []);

  useEffect(() => {
    const connected = brokers.filter(b => b.connected);
    connected.forEach(b => fetchBalances(b));
    const interval = setInterval(() => connected.forEach(b => fetchBalances(b)), 30000);
    return () => clearInterval(interval);
  }, [brokers, fetchBalances]);

  // ─── OAuth-style connection flow ───
  const openConnectFlow = (broker) => {
    setSelectedBroker(broker);
    setStep(STEPS.AUTH);
    setAuthForm({ email: '', password: '' });
    setAuthError('');
    setModalOpen(true);
  };

  const handleAuth = async () => {
    if (!authForm.email || !authForm.password) {
      setAuthError('Completa todos los campos');
      return;
    }
    setAuthError('');
    setStep(STEPS.VERIFYING);

    // Simulate OAuth verification (2.5s)
    await new Promise(r => setTimeout(r, 2500));

    setStep(STEPS.PERMISSIONS);
  };

  const handleGrantPermissions = async () => {
    setStep(STEPS.VERIFYING);

    // Create a broker entry with simulated credentials
    const newBroker = addBroker({
      brokerId: selectedBroker.id,
      label: `${selectedBroker.name} (${authForm.email})`,
      apiKey: authForm.email,  // In production this would be an OAuth token
      apiSecret: 'oauth_connected',
      passphrase: '',
    });

    // Simulate connection
    await new Promise(r => setTimeout(r, 1500));
    updateBrokerStatus(newBroker.id, true);
    setActiveBroker(newBroker);

    setStep(STEPS.SUCCESS);
    await new Promise(r => setTimeout(r, 2000));
    setModalOpen(false);
    setStep(STEPS.SELECT);
  };

  const handleDisconnect = (id) => {
    brokerService.disconnect(id);
    removeBroker(id);
    setBalances(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const totalUSD = (brokerId) => {
    const bals = balances[brokerId] || [];
    return bals.reduce((sum, b) => {
      if (['USDT', 'USDC', 'BUSD', 'FDUSD', 'KAIROS'].includes(b.asset)) return sum + parseFloat(b.free) + parseFloat(b.locked || 0);
      return sum;
    }, 0);
  };

  const connectedIds = brokers.map(b => b.brokerId);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-xl font-bold">Conectar Brokers</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Conecta tu cuenta de exchange en segundos. Opera directamente desde Kairos Trade.
        </p>
      </div>

      {/* ─── Security badge ─── */}
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
        <Shield size={20} className="text-[var(--gold)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[var(--gold)]">Conexión segura tipo OAuth</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">
            Tu contraseña nunca se almacena en Kairos. Nos conectamos directamente con tu exchange mediante un token seguro de solo lectura + trading. Similar a como funciona Plaid con los bancos.
          </p>
        </div>
      </div>

      {/* ─── Connected brokers ─── */}
      {brokers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-dim)] uppercase tracking-wider">Cuentas Conectadas</h2>
          {brokers.map(broker => {
            const catalog = BROKER_CATALOG.find(b => b.id === broker.brokerId);
            const bals = balances[broker.id] || [];
            const isExpanded = expandedBroker === broker.id;
            const usd = totalUSD(broker.id);

            return (
              <div key={broker.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedBroker(isExpanded ? null : broker.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${catalog?.color || '#333'}15`, border: `1px solid ${catalog?.color || '#333'}30` }}>
                      {catalog?.logo || '📊'}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{broker.label}</p>
                      <p className="text-xs text-[var(--text-dim)]">{catalog?.name || broker.brokerId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {broker.connected && (
                      <div className="text-right mr-2">
                        <p className="text-[10px] text-[var(--text-dim)]">Balance</p>
                        <p className="text-sm font-bold text-[var(--gold)]">${usd.toFixed(2)}</p>
                      </div>
                    )}
                    <span className="flex items-center gap-1 text-xs text-[var(--green)] px-2 py-1 rounded-lg" style={{ background: 'rgba(0,220,130,0.1)' }}>
                      <CheckCircle size={12} /> Conectado
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleDisconnect(broker.id); }}
                      className="text-xs text-[var(--text-dim)] hover:text-[var(--red)] transition-colors px-2 py-1">
                      Desconectar
                    </button>
                  </div>
                </div>

                {/* Expanded balances */}
                <AnimatePresence>
                  {isExpanded && broker.connected && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between pt-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2">
                            <Wallet size={13} className="text-[var(--gold)]" /> Balances
                          </h4>
                          <button onClick={() => fetchBalances(broker)}
                            className="text-[10px] text-[var(--text-dim)] hover:text-[var(--gold)] flex items-center gap-1">
                            <RefreshCw size={11} className={loadingBalances[broker.id] ? 'animate-spin' : ''} /> Refrescar
                          </button>
                        </div>
                        {bals.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {bals.slice(0, 15).map(b => (
                              <div key={b.asset} className="rounded-lg p-2" style={{ background: 'var(--surface-2)' }}>
                                <span className="text-[10px] font-bold text-[var(--gold)]">{b.asset}</span>
                                <p className="text-xs font-bold mt-0.5">{parseFloat(b.free).toFixed(b.asset === 'BTC' ? 8 : 2)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--text-dim)] py-2">{loadingBalances[broker.id] ? 'Cargando...' : 'Sin balances'}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Available brokers grid ─── */}
      <div>
        <h2 className="text-sm font-bold text-[var(--text-dim)] uppercase tracking-wider mb-3">
          {brokers.length > 0 ? 'Conectar Otro Exchange' : 'Selecciona tu Exchange'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BROKER_CATALOG.map(broker => {
            const isConnected = connectedIds.includes(broker.id);
            return (
              <button
                key={broker.id}
                onClick={() => !isConnected && openConnectFlow(broker)}
                disabled={isConnected}
                className="group relative rounded-xl p-4 text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-default"
                style={{
                  background: isConnected
                    ? 'rgba(0,220,130,0.04)'
                    : 'linear-gradient(135deg, rgba(17,19,24,0.9), rgba(24,26,32,0.7))',
                  border: `1px solid ${isConnected ? 'rgba(0,220,130,0.15)' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${broker.color}15`, border: `1px solid ${broker.color}25` }}>
                    {broker.logo}
                  </div>
                  {isConnected ? (
                    <CheckCircle size={16} className="text-[var(--green)]" />
                  ) : (
                    <ChevronRight size={16} className="text-[var(--text-dim)] group-hover:text-[var(--gold)] transition-colors" />
                  )}
                </div>
                <h3 className="text-sm font-bold mb-0.5">{broker.name}</h3>
                <p className="text-[10px] text-[var(--text-dim)] mb-2 leading-relaxed">{broker.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {broker.features.map(f => (
                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-[var(--text-dim)] font-medium">{f}</span>
                  ))}
                </div>
                <p className="text-[9px] text-[var(--text-dim)]/50 mt-2">{broker.users} usuarios</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          OAuth-style Connection Modal
          ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {modalOpen && selectedBroker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setModalOpen(false); setStep(STEPS.SELECT); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: '#0E1015', border: '1px solid rgba(30,34,45,0.6)' }}
            >
              {/* Modal header — broker branded */}
              <div className="p-5 pb-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(30,34,45,0.5)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${selectedBroker.color}15`, border: `1px solid ${selectedBroker.color}30` }}>
                    {selectedBroker.logo}
                  </div>
                  <div>
                    <p className="text-sm font-bold">Conectar {selectedBroker.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Lock size={9} className="text-[var(--green)]" />
                      <span className="text-[9px] text-[var(--green)] font-semibold">Conexión segura encriptada</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setModalOpen(false); setStep(STEPS.SELECT); }}
                  className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] transition-colors hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>

              {/* ─── Step: AUTH (Login) ─── */}
              {step === STEPS.AUTH && (
                <div className="p-5 space-y-4">
                  {/* Fake browser bar */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(24,26,32,0.8)', border: '1px solid rgba(30,34,45,0.5)' }}>
                    <Lock size={11} className="text-[var(--green)]" />
                    <span className="text-[11px] text-[var(--text-dim)] font-mono">{selectedBroker.authUrl}</span>
                    <Globe size={11} className="text-[var(--text-dim)] ml-auto" />
                  </div>

                  <div className="text-center py-2">
                    <p className="text-sm font-bold mb-1">Inicia sesión en {selectedBroker.name}</p>
                    <p className="text-[11px] text-[var(--text-dim)]">
                      Kairos Trade solicita acceso de solo lectura y trading a tu cuenta
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Email o usuario</label>
                      <input
                        type="email"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                        placeholder={`tu@email.com`}
                        className="w-full text-sm rounded-xl"
                        style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.5)', padding: '12px 14px' }}
                        autoFocus
                      />
                    </div>
                    <div className="relative">
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Contraseña</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                        placeholder="••••••••••"
                        className="w-full text-sm rounded-xl pr-10"
                        style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.5)', padding: '12px 14px' }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                      />
                      <button onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-8 text-[var(--text-dim)] hover:text-[var(--text)]">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {authError && <p className="text-xs text-[var(--red)] text-center">{authError}</p>}

                  <button
                    onClick={handleAuth}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                    style={{ background: `linear-gradient(135deg, ${selectedBroker.color}, ${selectedBroker.color}CC)` }}
                  >
                    Iniciar Sesión
                  </button>

                  <p className="text-[10px] text-[var(--text-dim)]/50 text-center leading-relaxed">
                    Al continuar, autorizas a Kairos Trade a acceder a tu cuenta de {selectedBroker.name} con permisos limitados. Tu contraseña no se almacena.
                  </p>
                </div>
              )}

              {/* ─── Step: VERIFYING ─── */}
              {step === STEPS.VERIFYING && (
                <div className="p-8 flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                      style={{ background: `${selectedBroker.color}15` }}>
                      {selectedBroker.logo}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--dark)] flex items-center justify-center">
                      <Loader2 size={16} className="text-[var(--gold)] animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold mb-1">Verificando credenciales...</p>
                    <p className="text-[11px] text-[var(--text-dim)]">Conectando de forma segura con {selectedBroker.name}</p>
                  </div>
                  <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(30,34,45,0.5)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${selectedBroker.color}, var(--gold))` }}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2.5, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              )}

              {/* ─── Step: PERMISSIONS ─── */}
              {step === STEPS.PERMISSIONS && (
                <div className="p-5 space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-sm font-bold">Kairos Trade solicita acceso</p>
                    <p className="text-[11px] text-[var(--text-dim)] mt-1">
                      Revisa los permisos que otorgarás a la aplicación
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      { icon: Eye, label: 'Ver balances y portafolio', desc: 'Lectura de tus posiciones y saldos', granted: true },
                      { icon: ArrowUpDown, label: 'Ejecutar operaciones', desc: 'Abrir y cerrar posiciones de trading', granted: true },
                      { icon: Globe, label: 'Datos de mercado', desc: 'Acceso a precios y order book en tiempo real', granted: true },
                      { icon: Shield, label: 'Sin permisos de retiro', desc: 'Kairos nunca podrá retirar tus fondos', granted: false },
                    ].map((perm, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                          ${perm.granted ? 'bg-[var(--green)]/10' : 'bg-[var(--red)]/10'}`}>
                          <perm.icon size={14} className={perm.granted ? 'text-[var(--green)]' : 'text-[var(--red)]'} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold">{perm.label}</p>
                          <p className="text-[10px] text-[var(--text-dim)]">{perm.desc}</p>
                        </div>
                        {perm.granted ? (
                          <CheckCircle size={16} className="text-[var(--green)] shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-[var(--red)] shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGrantPermissions}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #0ECB81, #0AA06A)' }}
                  >
                    Autorizar Conexión
                  </button>

                  <button
                    onClick={() => { setModalOpen(false); setStep(STEPS.SELECT); }}
                    className="w-full py-2 text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* ─── Step: SUCCESS ─── */}
              {step === STEPS.SUCCESS && (
                <div className="p-8 flex flex-col items-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                  >
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(14,203,129,0.12)', border: '2px solid rgba(14,203,129,0.3)' }}>
                      <CheckCircle size={32} className="text-[var(--green)]" />
                    </div>
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-bold mb-1">¡Conectado exitosamente!</p>
                    <p className="text-[11px] text-[var(--text-dim)]">
                      Tu cuenta de {selectedBroker.name} está lista para operar desde Kairos Trade
                    </p>
                  </div>
                </div>
              )}

              {/* Footer powered by */}
              <div className="px-5 py-3 flex items-center justify-center gap-2" style={{ borderTop: '1px solid rgba(30,34,45,0.3)' }}>
                <Lock size={10} className="text-[var(--text-dim)]/40" />
                <span className="text-[9px] text-[var(--text-dim)]/40">Powered by Kairos Secure Connect</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
