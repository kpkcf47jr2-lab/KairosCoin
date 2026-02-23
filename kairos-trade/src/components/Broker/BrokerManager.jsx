// Kairos Trade — Broker Connection Manager (Elite v3)
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Plus, Trash2, CheckCircle, XCircle, Eye, EyeOff, Shield, RefreshCw, Wallet, ArrowUpDown } from 'lucide-react';
import useStore from '../../store/useStore';
import { BROKERS } from '../../constants';
import brokerService from '../../services/broker';

export default function BrokerManager() {
  const { brokers, addBroker, removeBroker, updateBrokerStatus, setActiveBroker } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ brokerId: 'binance', apiKey: '', apiSecret: '', passphrase: '', label: '' });
  const [showSecret, setShowSecret] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState('');
  const [balances, setBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState({});
  const [expandedBroker, setExpandedBroker] = useState(null);
  const [recentTrades, setRecentTrades] = useState({});

  const handleAdd = () => {
    setError('');
    if (!form.apiKey || !form.apiSecret) {
      setError('API Key y Secret son obligatorios');
      return;
    }
    const brokerConfig = BROKERS[form.brokerId];
    if (brokerConfig.requiredFields.includes('passphrase') && !form.passphrase) {
      setError('Este broker requiere Passphrase');
      return;
    }

    addBroker({
      brokerId: form.brokerId,
      label: form.label || brokerConfig.name,
      apiKey: form.apiKey,
      apiSecret: form.apiSecret,
      passphrase: form.passphrase,
    });

    setForm({ brokerId: 'binance', apiKey: '', apiSecret: '', passphrase: '', label: '' });
    setShowAdd(false);
  };

  const handleConnect = async (broker) => {
    setConnecting(broker.id);
    const result = await brokerService.connect(broker);
    updateBrokerStatus(broker.id, result.success);
    if (result.success) {
      setActiveBroker(broker);
      // Fetch balances immediately after connecting
      fetchBalances(broker);
    }
    setConnecting(null);
  };

  const fetchBalances = useCallback(async (broker) => {
    setLoadingBalances(prev => ({ ...prev, [broker.id]: true }));
    try {
      const result = await brokerService.getBalances(broker.id);
      if (result.success) {
        setBalances(prev => ({ ...prev, [broker.id]: result.balances }));
      }
    } catch (e) { /* ignore */ }
    setLoadingBalances(prev => ({ ...prev, [broker.id]: false }));
  }, []);

  const fetchTrades = useCallback(async (broker) => {
    try {
      const result = await brokerService.getTradeHistory(broker.id, 'BTCUSDT', 10);
      if (result.success) {
        setRecentTrades(prev => ({ ...prev, [broker.id]: result.trades }));
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Auto-refresh balances for connected brokers
  useEffect(() => {
    const connected = brokers.filter(b => b.connected);
    connected.forEach(b => fetchBalances(b));
    const interval = setInterval(() => connected.forEach(b => fetchBalances(b)), 30000);
    return () => clearInterval(interval);
  }, [brokers, fetchBalances]);

  const handleDelete = (id) => {
    brokerService.disconnect(id);
    removeBroker(id);
    setBalances(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const totalUSD = (brokerId) => {
    const bals = balances[brokerId] || [];
    return bals.reduce((sum, b) => {
      if (['USDT', 'USDC', 'BUSD', 'FDUSD'].includes(b.asset)) return sum + parseFloat(b.free) + parseFloat(b.locked || 0);
      return sum;
    }, 0);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Brokers Conectados</h1>
          <p className="text-sm text-[var(--text-dim)]">
            {brokers.filter(b => b.connected).length} conectados de {brokers.length}
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 btn-gold rounded-xl text-sm">
          <Plus size={16} /> Agregar Broker
        </button>
      </div>

      {/* Security notice */}
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--gold-dark)', opacity: 0.08, position: 'absolute' }} />
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
        <Shield size={20} className="text-[var(--gold)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[var(--gold)]">Tus API Keys están seguras</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">
            Las claves se almacenan encriptadas localmente. Kairos Trade solo necesita permisos de lectura y trading.
            <strong className="text-[var(--text)]"> Nunca actives permisos de retiro.</strong>
          </p>
        </div>
      </div>

      {/* Add broker form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-5 space-y-5">
              <h3 className="text-sm font-bold">Nuevo Broker</h3>

              {/* Broker selector */}
              <div className="grid grid-cols-3 gap-2">
                {Object.values(BROKERS).map(b => (
                  <button key={b.id} onClick={() => setForm({ ...form, brokerId: b.id })}
                    className="p-3 rounded-xl text-center transition-all"
                    style={{
                      background: form.brokerId === b.id ? 'rgba(212,175,55,0.08)' : 'var(--surface-2)',
                      border: `1px solid ${form.brokerId === b.id ? 'var(--gold)' : 'var(--border)'}`,
                    }}>
                    <span className="text-2xl">{b.logo}</span>
                    <p className="text-sm font-bold mt-1">{b.name}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">{b.supportedMarkets.join(', ')}</p>
                  </button>
                ))}
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Etiqueta (opcional)</label>
                  <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Mi cuenta Binance" className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">API Key</label>
                  <input value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Tu API Key" className="w-full font-mono text-xs" />
                </div>
                <div className="relative">
                  <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">API Secret</label>
                  <input type={showSecret ? 'text' : 'password'} value={form.apiSecret}
                    onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder="Tu API Secret" className="w-full font-mono text-xs pr-10" />
                  <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-7 text-[var(--text-dim)]">
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {BROKERS[form.brokerId]?.requiredFields.includes('passphrase') && (
                  <div>
                    <label className="text-[10px] text-[var(--text-dim)] mb-1 block font-semibold uppercase tracking-wider">Passphrase</label>
                    <input type="password" value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} placeholder="Passphrase" className="w-full font-mono text-xs" />
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-[var(--red)]">{error}</p>}

              <div className="flex gap-2">
                <button onClick={handleAdd} className="flex-1 py-2.5 btn-gold rounded-xl text-sm">Guardar Broker</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-dim)]"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>Cancelar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broker list */}
      {brokers.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Link2 size={48} className="text-[var(--text-dim)]/20 mx-auto mb-4" />
          <p className="text-[var(--text-dim)]">No hay brokers conectados</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">Agrega tu primer broker para empezar a operar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brokers.map(broker => {
            const config = BROKERS[broker.brokerId];
            const bals = balances[broker.id] || [];
            const isExpanded = expandedBroker === broker.id;
            const usd = totalUSD(broker.id);

            return (
              <motion.div key={broker.id} layout className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {/* Header row */}
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedBroker(isExpanded ? null : broker.id)}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config?.logo || '📊'}</span>
                    <div>
                      <p className="text-sm font-bold">{broker.label}</p>
                      <p className="text-xs text-[var(--text-dim)]">{config?.name} • API: {atob(broker.apiKey).slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {broker.connected && bals.length > 0 && (
                      <div className="text-right mr-2">
                        <p className="text-xs text-[var(--text-dim)]">Balance Total</p>
                        <p className="text-sm font-bold text-[var(--gold)]">${usd.toFixed(2)} USD</p>
                      </div>
                    )}
                    {broker.connected ? (
                      <span className="flex items-center gap-1 text-xs text-[var(--green)] px-2 py-1 rounded-lg" style={{ background: 'rgba(0,220,130,0.1)' }}>
                        <CheckCircle size={12} /> Conectado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-dim)] px-2 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                        <XCircle size={12} /> Desconectado
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleConnect(broker); }} disabled={connecting === broker.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.2)' }}>
                      {connecting === broker.id ? '...' : broker.connected ? 'Reconectar' : 'Conectar'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(broker.id); }}
                      className="p-1.5 text-[var(--text-dim)] hover:text-[var(--red)] transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && broker.connected && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                        {/* Balances */}
                        <div className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2">
                              <Wallet size={14} className="text-[var(--gold)]" /> Balances en Tiempo Real
                            </h4>
                            <button onClick={() => fetchBalances(broker)}
                              className={`text-xs text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors flex items-center gap-1 ${loadingBalances[broker.id] ? 'animate-spin' : ''}`}>
                              <RefreshCw size={12} /> Refrescar
                            </button>
                          </div>
                          {bals.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {bals.slice(0, 12).map(b => (
                                <div key={b.asset} className="rounded-lg p-2.5" style={{ background: 'var(--surface-2)' }}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[var(--gold)]">{b.asset}</span>
                                    {parseFloat(b.locked || 0) > 0 && <span className="text-[9px] text-[var(--text-dim)]">🔒</span>}
                                  </div>
                                  <p className="text-sm font-bold mt-0.5">{parseFloat(b.free).toFixed(b.asset === 'BTC' ? 8 : 2)}</p>
                                  {parseFloat(b.locked || 0) > 0 && (
                                    <p className="text-[10px] text-[var(--text-dim)]">Bloq: {parseFloat(b.locked).toFixed(4)}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-dim)]">{loadingBalances[broker.id] ? 'Cargando...' : 'Sin balances disponibles'}</p>
                          )}
                        </div>

                        {/* Quick actions */}
                        <div className="flex gap-2">
                          <button onClick={() => fetchTrades(broker)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <ArrowUpDown size={12} /> Ver Últimos Trades
                          </button>
                        </div>

                        {/* Recent trades */}
                        {recentTrades[broker.id] && recentTrades[broker.id].length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">Últimos Trades</h4>
                            <div className="space-y-1">
                              {recentTrades[broker.id].slice(0, 5).map((t, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs" style={{ background: 'var(--surface-2)' }}>
                                  <span className={`font-bold ${t.isBuyer ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                                    {t.isBuyer ? 'COMPRA' : 'VENTA'}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">{parseFloat(t.qty).toFixed(6)}</span>
                                  <span className="font-mono">${parseFloat(t.price).toFixed(2)}</span>
                                  <span className="text-[var(--text-dim)]">{new Date(t.time).toLocaleTimeString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
