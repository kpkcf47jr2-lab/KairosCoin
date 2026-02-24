// Kairos Trade — Broker Connection Manager (Guided API Key Flow)
// Beautiful UI + step-by-step tutorial + real API key connection
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Shield, RefreshCw, Wallet,
  Trash2, X, Lock, ChevronRight, ChevronLeft,
  Eye, EyeOff, Loader2, ExternalLink,
  ArrowRight, Info, Key, Zap
} from 'lucide-react';
import useStore from '../../store/useStore';
import { BROKERS } from '../../constants';
import brokerService from '../../services/broker';

// ─── Broker catalog with setup guides ───
const BROKER_CATALOG = [
  {
    id: 'binance', name: 'Binance', logo: '🟡',
    color: '#F0B90B', desc: 'El exchange más grande del mundo',
    features: ['Spot', 'Futuros', 'Margin'], users: '150M+',
    apiUrl: 'https://www.binance.com/en/my/settings/api-management',
    steps: [
      { title: 'Inicia sesión en Binance', desc: 'Ve a binance.com e inicia sesión en tu cuenta.' },
      { title: 'Ve a API Management', desc: 'Haz clic en tu perfil → "API Management" o usa el enlace directo de abajo.' },
      { title: 'Crea una nueva API Key', desc: 'Haz clic en "Create API" → Elige "System Generated Keys".' },
      { title: 'Configura permisos', desc: 'Activa solo "Enable Reading" y "Enable Spot & Margin Trading". NO actives retiros.' },
      { title: 'Copia tus claves', desc: 'Copia el API Key y Secret Key. El Secret solo se muestra UNA vez.' },
    ],
  },
  {
    id: 'bybit', name: 'Bybit', logo: '🟠',
    color: '#F7A600', desc: 'Trading de derivados líder',
    features: ['Spot', 'Futuros', 'Opciones'], users: '20M+',
    apiUrl: 'https://www.bybit.com/app/user/api-management',
    steps: [
      { title: 'Inicia sesión en Bybit', desc: 'Ve a bybit.com e inicia sesión.' },
      { title: 'Ve a API Management', desc: 'Perfil → "API" o usa el enlace directo de abajo.' },
      { title: 'Crea nueva API Key', desc: 'Clic en "Create New Key" → "System-generated API Keys".' },
      { title: 'Configura permisos', desc: 'Selecciona "Read-Write" para Trading. Deja desactivado "Withdrawal".' },
      { title: 'Copia tus claves', desc: 'Copia el API Key y API Secret antes de cerrar.' },
    ],
  },
  {
    id: 'kraken', name: 'Kraken', logo: '🟣',
    color: '#7B61FF', desc: 'Regulado y seguro desde 2011',
    features: ['Spot', 'Futuros', 'Staking'], users: '10M+',
    apiUrl: 'https://www.kraken.com/u/security/api',
    steps: [
      { title: 'Inicia sesión en Kraken', desc: 'Ve a kraken.com e inicia sesión.' },
      { title: 'Ve a API Settings', desc: 'Security → API → "Add Key".' },
      { title: 'Configura permisos', desc: 'Activa "Query Funds", "Query Orders", "Create/Modify Orders".' },
      { title: 'Guarda la clave', desc: 'Kraken te da un Key y un Private Key. Copia ambos.' },
    ],
  },
  {
    id: 'coinbase', name: 'Coinbase', logo: '🔵',
    color: '#0052FF', desc: 'Exchange público regulado en USA',
    features: ['Spot', 'Advanced Trade'], users: '110M+',
    apiUrl: 'https://portal.cdp.coinbase.com/access/api',
    steps: [
      { title: 'Inicia sesión en Coinbase', desc: 'Ve a portal.cdp.coinbase.com e inicia sesión.' },
      { title: 'Crea nueva API Key', desc: 'Haz clic en "Create API Key". Coinbase te dará un API Key Name y una EC Private Key.' },
      { title: 'Configura permisos', desc: 'Selecciona "View" y "Trade". NO actives "Transfer".' },
      { title: 'Copia tus 2 claves', desc: 'Copia el API Key Name (va en API KEY) y la EC Private Key completa (va en API SECRET). No necesitas Passphrase.' },
    ],
  },
  {
    id: 'kucoin', name: 'KuCoin', logo: '🟢',
    color: '#23AF91', desc: 'La exchange del pueblo',
    features: ['Spot', 'Futuros', 'Bots'], users: '30M+',
    apiUrl: 'https://www.kucoin.com/account/api',
    needsPassphrase: true,
    steps: [
      { title: 'Inicia sesión en KuCoin', desc: 'Ve a kucoin.com e inicia sesión.' },
      { title: 'Ve a API Management', desc: 'Account → API Management → "Create API".' },
      { title: 'Configura permisos y Passphrase', desc: 'Activa "General" y "Trade". Crea un passphrase. No actives "Transfer".' },
      { title: 'Copia tus 3 claves', desc: 'Necesitarás: API Key, API Secret y Passphrase.' },
    ],
  },
  {
    id: 'okx', name: 'OKX', logo: '⚫',
    color: '#FFFFFF', desc: 'Trading avanzado multimercado',
    features: ['Spot', 'Futuros', 'Opciones'], users: '50M+',
    apiUrl: 'https://www.okx.com/account/my-api',
    needsPassphrase: true,
    steps: [
      { title: 'Inicia sesión en OKX', desc: 'Ve a okx.com e inicia sesión.' },
      { title: 'Ve a API Settings', desc: 'Perfil → API → "Create API Key".' },
      { title: 'Configura permisos y Passphrase', desc: 'Selecciona "Read" y "Trade". Crea un passphrase. NO actives "Withdraw".' },
      { title: 'Copia tus 3 claves', desc: 'Necesitarás: API Key, Secret Key y Passphrase.' },
    ],
  },
  {
    id: 'bitget', name: 'Bitget', logo: '🔷',
    color: '#00CED1', desc: 'Copy trading #1 del mundo',
    features: ['Spot', 'Futuros', 'Copy'], users: '25M+',
    apiUrl: 'https://www.bitget.com/account/newapi',
    needsPassphrase: true,
    steps: [
      { title: 'Inicia sesión en Bitget', desc: 'Ve a bitget.com e inicia sesión.' },
      { title: 'Ve a API Management', desc: 'Account → API Management → "Create API".' },
      { title: 'Configura permisos y Passphrase', desc: 'Activa "Read" y "Trade". Crea passphrase. No actives "Transfer".' },
      { title: 'Copia tus 3 claves', desc: 'Necesitarás: API Key, Secret Key y Passphrase.' },
    ],
  },
  {
    id: 'mexc', name: 'MEXC', logo: '🔻',
    color: '#00B897', desc: 'Más de 1,500 criptomonedas',
    features: ['Spot', 'Futuros'], users: '10M+',
    apiUrl: 'https://www.mexc.com/ucenter/api',
    steps: [
      { title: 'Inicia sesión en MEXC', desc: 'Ve a mexc.com e inicia sesión.' },
      { title: 'Ve a API Management', desc: 'Account → API Management → "Create API Key".' },
      { title: 'Configura permisos', desc: 'Marca "Read" y "Trade". Sin permisos de retiro.' },
      { title: 'Copia tus claves', desc: 'Copia API Key y Secret Key.' },
    ],
  },
];

// ─── Flow steps ───
const FLOW = {
  SELECT: 'select',
  GUIDE: 'guide',
  KEYS: 'keys',
  VERIFYING: 'verifying',
  SUCCESS: 'success',
};

export default function BrokerManager() {
  const { brokers, addBroker, removeBroker, updateBrokerStatus, setActiveBroker } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(FLOW.SELECT);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [guideStep, setGuideStep] = useState(0);
  const [keyForm, setKeyForm] = useState({ apiKey: '', apiSecret: '', passphrase: '', label: '' });
  const [showSecret, setShowSecret] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [balances, setBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState({});
  const [expandedBroker, setExpandedBroker] = useState(null);

  // ─── Fetch balances ───
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

  // ─── Open connect flow ───
  const openFlow = (broker) => {
    setSelectedBroker(broker);
    setGuideStep(0);
    setStep(FLOW.GUIDE);
    setKeyForm({ apiKey: '', apiSecret: '', passphrase: '', label: '' });
    setKeyError('');
    setModalOpen(true);
  };

  // ─── Submit keys (REAL connection) ───
  const handleSubmitKeys = async () => {
    if (!keyForm.apiKey.trim() || !keyForm.apiSecret.trim()) {
      setKeyError('API Key y Secret son obligatorios');
      return;
    }
    if (selectedBroker.needsPassphrase && !keyForm.passphrase.trim()) {
      setKeyError('Este exchange requiere Passphrase');
      return;
    }
    setKeyError('');
    setStep(FLOW.VERIFYING);

    // Add broker to store (keys get encrypted via btoa in addBroker)
    const newBroker = addBroker({
      brokerId: selectedBroker.id,
      label: keyForm.label || selectedBroker.name,
      apiKey: keyForm.apiKey.trim(),
      apiSecret: keyForm.apiSecret.trim(),
      passphrase: keyForm.passphrase.trim() || undefined,
    });

    // Real connection via broker.js service
    try {
      const result = await brokerService.connect(newBroker);
      updateBrokerStatus(newBroker.id, result.success);
      if (result.success) {
        setActiveBroker(newBroker);
        fetchBalances(newBroker);
        setStep(FLOW.SUCCESS);
        setTimeout(() => { setModalOpen(false); setStep(FLOW.SELECT); }, 2500);
      } else {
        setStep(FLOW.KEYS);
        setKeyError('No se pudo conectar. Verifica que tus claves sean correctas y tengan los permisos adecuados.');
      }
    } catch (err) {
      setStep(FLOW.KEYS);
      setKeyError(`Error de conexión: ${err.message}`);
    }
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
  const closeModal = () => { setModalOpen(false); setStep(FLOW.SELECT); };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-xl font-bold">Conectar Exchange</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Conecta tu cuenta en 3 simples pasos. Te guiamos durante todo el proceso.
        </p>
      </div>

      {/* ─── Security badge ─── */}
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}>
        <Shield size={20} className="text-[var(--gold)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[var(--gold)]">Conexión segura con API Keys</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">
            Tu exchange genera claves especiales (API Keys) que solo permiten leer y operar — <strong className="text-[var(--text)]">nunca retirar fondos</strong>. Las claves se almacenan encriptadas solo en tu dispositivo. Kairos Trade nunca tiene acceso a tu contraseña ni a tus fondos directamente.
          </p>
        </div>
      </div>

      {/* ─── How it works — 3 steps ─── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { num: '1', title: 'Elige tu Exchange', desc: 'Selecciona de la lista', icon: Zap },
          { num: '2', title: 'Sigue la guía', desc: 'Te mostramos paso a paso', icon: Info },
          { num: '3', title: 'Pega tus claves', desc: 'Y listo, conectado', icon: Key },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}>
            <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--gold)', border: '1px solid rgba(59,130,246,0.15)' }}>
              {s.num}
            </div>
            <p className="text-xs font-bold mb-0.5">{s.title}</p>
            <p className="text-[10px] text-[var(--text-dim)]">{s.desc}</p>
          </div>
        ))}
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
                    {broker.connected ? (
                      <span className="flex items-center gap-1 text-xs text-[var(--green)] px-2 py-1 rounded-lg" style={{ background: 'rgba(0,220,130,0.1)' }}>
                        <CheckCircle size={12} /> Conectado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-dim)] px-2 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                        <XCircle size={12} /> Error
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDisconnect(broker.id); }}
                      className="text-xs text-[var(--text-dim)] hover:text-[var(--red)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--red)]/5">
                      <Trash2 size={14} />
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
                            <RefreshCw size={11} className={loadingBalances[broker.id] ? 'animate-spin' : ''} /> Actualizar
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
                onClick={() => !isConnected && openFlow(broker)}
                disabled={isConnected}
                className="group relative rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-default"
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
          Guided Connection Modal
          ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {modalOpen && selectedBroker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: '#0E1015', border: '1px solid rgba(30,34,45,0.6)' }}
            >
              {/* Modal header */}
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
                      <span className="text-[9px] text-[var(--green)] font-semibold">Conexión segura con API Keys</span>
                    </div>
                  </div>
                </div>
                <button onClick={closeModal}
                  className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] transition-colors hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>

              {/* ─── Step: GUIDE (Tutorial) ─── */}
              {step === FLOW.GUIDE && (
                <div className="p-5 space-y-4">
                  {/* Progress dots */}
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    {selectedBroker.steps.map((_, i) => (
                      <div key={i} className="transition-all duration-300"
                        style={{
                          width: i === guideStep ? 20 : 6,
                          height: 6,
                          borderRadius: 3,
                          background: i === guideStep ? selectedBroker.color : i < guideStep ? 'var(--green)' : 'rgba(30,34,45,0.6)',
                        }} />
                    ))}
                  </div>

                  {/* Step content */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={guideStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="rounded-xl p-4" style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${selectedBroker.color}15`, color: selectedBroker.color }}>
                            {guideStep + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold mb-1">{selectedBroker.steps[guideStep].title}</p>
                            <p className="text-xs text-[var(--text-dim)] leading-relaxed">{selectedBroker.steps[guideStep].desc}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Open exchange link */}
                  {guideStep === 0 && (
                    <a
                      href={selectedBroker.apiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                      style={{ background: `${selectedBroker.color}20`, color: selectedBroker.color, border: `1px solid ${selectedBroker.color}30` }}
                    >
                      <ExternalLink size={14} /> Abrir {selectedBroker.name} API Management
                    </a>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center gap-2">
                    {guideStep > 0 && (
                      <button onClick={() => setGuideStep(g => g - 1)}
                        className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                        style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}>
                        <ChevronLeft size={14} /> Anterior
                      </button>
                    )}
                    <div className="flex-1" />
                    {guideStep < selectedBroker.steps.length - 1 ? (
                      <button onClick={() => setGuideStep(g => g + 1)}
                        className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                        style={{ background: `linear-gradient(135deg, ${selectedBroker.color}, ${selectedBroker.color}CC)` }}>
                        Siguiente <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button onClick={() => setStep(FLOW.KEYS)}
                        className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg, #0ECB81, #0AA06A)' }}>
                        Ya tengo mis claves <ArrowRight size={14} />
                      </button>
                    )}
                  </div>

                  {/* Skip guide */}
                  <button onClick={() => setStep(FLOW.KEYS)}
                    className="w-full text-center text-[11px] text-[var(--text-dim)]/50 hover:text-[var(--text-dim)] transition-colors py-1">
                    Ya sé cómo hacerlo, ir directo a pegar claves →
                  </button>
                </div>
              )}

              {/* ─── Step: KEYS (Enter API keys) ─── */}
              {step === FLOW.KEYS && (
                <div className="p-5 space-y-4">
                  <div className="text-center mb-1">
                    <p className="text-sm font-bold">Pega tus API Keys de {selectedBroker.name}</p>
                    <p className="text-[11px] text-[var(--text-dim)] mt-1">
                      Las claves se encriptan y almacenan solo en tu dispositivo
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Label */}
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">
                        Nombre de la cuenta <span className="text-[var(--text-dim)]/40">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={keyForm.label}
                        onChange={(e) => setKeyForm({ ...keyForm, label: e.target.value })}
                        placeholder={`Mi cuenta ${selectedBroker.name}`}
                        className="w-full text-sm rounded-xl"
                        style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.5)', padding: '10px 14px' }}
                      />
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Key size={10} className="text-[var(--gold)]" /> API Key <span className="text-[var(--red)]">*</span>
                      </label>
                      <input
                        type="text"
                        value={keyForm.apiKey}
                        onChange={(e) => setKeyForm({ ...keyForm, apiKey: e.target.value })}
                        placeholder="Pega tu API Key aquí"
                        className="w-full text-sm font-mono rounded-xl"
                        style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.5)', padding: '10px 14px' }}
                        autoFocus
                      />
                    </div>

                    {/* API Secret */}
                    <div className="relative">
                      <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Lock size={10} className="text-[var(--gold)]" /> API Secret <span className="text-[var(--red)]">*</span>
                      </label>
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={keyForm.apiSecret}
                        onChange={(e) => setKeyForm({ ...keyForm, apiSecret: e.target.value })}
                        placeholder="Pega tu API Secret aquí"
                        className="w-full text-sm font-mono rounded-xl pr-10"
                        style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.5)', padding: '10px 14px' }}
                      />
                      <button onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-7 text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                        {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Passphrase (if needed) */}
                    {selectedBroker.needsPassphrase && (
                      <div>
                        <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider flex items-center gap-1">
                          <Shield size={10} className="text-[var(--gold)]" /> Passphrase <span className="text-[var(--red)]">*</span>
                        </label>
                        <input
                          type="password"
                          value={keyForm.passphrase}
                          onChange={(e) => setKeyForm({ ...keyForm, passphrase: e.target.value })}
                          placeholder="Pega tu Passphrase aquí"
                          className="w-full text-sm font-mono rounded-xl"
                          style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.5)', padding: '10px 14px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {keyError && (
                    <div className="rounded-lg px-3 py-2 text-xs text-[var(--red)] flex items-start gap-2" style={{ background: 'rgba(246,70,93,0.08)', border: '1px solid rgba(246,70,93,0.15)' }}>
                      <XCircle size={14} className="shrink-0 mt-0.5" /> {keyError}
                    </div>
                  )}

                  {/* Permissions reminder */}
                  <div className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.08)' }}>
                    <Info size={13} className="text-[var(--gold)] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                      Asegúrate de que tu API Key tenga permisos de <strong className="text-[var(--text)]">lectura</strong> y <strong className="text-[var(--text)]">trading</strong>. 
                      <strong className="text-[var(--red)]"> Nunca actives permisos de retiro.</strong>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => { setStep(FLOW.GUIDE); setGuideStep(0); }}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                      style={{ background: 'rgba(24,26,32,0.6)', border: '1px solid rgba(30,34,45,0.4)' }}>
                      <ChevronLeft size={14} /> Ver guía
                    </button>
                    <button
                      onClick={handleSubmitKeys}
                      disabled={!keyForm.apiKey || !keyForm.apiSecret}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #0ECB81, #0AA06A)' }}
                    >
                      Conectar {selectedBroker.name}
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Step: VERIFYING ─── */}
              {step === FLOW.VERIFYING && (
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
                    <p className="text-sm font-bold mb-1">Verificando conexión...</p>
                    <p className="text-[11px] text-[var(--text-dim)]">Conectando de forma segura con {selectedBroker.name}</p>
                  </div>
                  <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(30,34,45,0.5)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${selectedBroker.color}, var(--gold))` }}
                      initial={{ width: '0%' }}
                      animate={{ width: '90%' }}
                      transition={{ duration: 3, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {/* ─── Step: SUCCESS ─── */}
              {step === FLOW.SUCCESS && (
                <div className="p-8 flex flex-col items-center gap-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
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

              {/* Footer */}
              <div className="px-5 py-3 flex items-center justify-center gap-2" style={{ borderTop: '1px solid rgba(30,34,45,0.3)' }}>
                <Lock size={10} className="text-[var(--text-dim)]/40" />
                <span className="text-[9px] text-[var(--text-dim)]/40">Tus claves están encriptadas localmente</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
