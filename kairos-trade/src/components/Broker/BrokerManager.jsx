// Kairos Trade — Broker Connection Manager
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Plus, Trash2, CheckCircle, XCircle, Eye, EyeOff, Shield } from 'lucide-react';
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

    const newBroker = addBroker({
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
    if (result.success) setActiveBroker(broker);
    setConnecting(null);
  };

  const handleDelete = (id) => {
    brokerService.disconnect(id);
    removeBroker(id);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Brokers Conectados</h1>
          <p className="text-sm text-[var(--text-dim)]">Conecta tu broker para ejecutar trades automáticamente</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] text-white font-bold rounded-xl hover:bg-[var(--gold-light)] transition-colors text-sm"
        >
          <Plus size={16} /> Agregar Broker
        </button>
      </div>

      {/* Security notice */}
      <div className="bg-[var(--gold)]/5 border border-[var(--gold)]/20 rounded-xl p-4 flex items-start gap-3">
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-bold">Nuevo Broker</h3>

              {/* Broker selector */}
              <div className="grid grid-cols-3 gap-2">
                {Object.values(BROKERS).map(b => (
                  <button
                    key={b.id}
                    onClick={() => setForm({ ...form, brokerId: b.id })}
                    className={`p-3 rounded-xl border text-center transition-all
                      ${form.brokerId === b.id
                        ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                        : 'border-[var(--border)] hover:border-[var(--gold)]/30'
                      }`}
                  >
                    <span className="text-2xl">{b.logo}</span>
                    <p className="text-sm font-bold mt-1">{b.name}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">{b.supportedMarkets.join(', ')}</p>
                  </button>
                ))}
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">Etiqueta (opcional)</label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Mi cuenta Binance"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">API Key</label>
                  <input
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder="Tu API Key"
                    className="w-full font-mono text-xs"
                  />
                </div>
                <div className="relative">
                  <label className="text-xs text-[var(--text-dim)] mb-1 block">API Secret</label>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={form.apiSecret}
                    onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                    placeholder="Tu API Secret"
                    className="w-full font-mono text-xs pr-10"
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-7 text-[var(--text-dim)]"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {BROKERS[form.brokerId]?.requiredFields.includes('passphrase') && (
                  <div>
                    <label className="text-xs text-[var(--text-dim)] mb-1 block">Passphrase</label>
                    <input
                      type="password"
                      value={form.passphrase}
                      onChange={(e) => setForm({ ...form, passphrase: e.target.value })}
                      placeholder="Passphrase"
                      className="w-full font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-[var(--red)]">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="flex-1 py-2.5 bg-[var(--gold)] text-white font-bold rounded-xl text-sm hover:bg-[var(--gold-light)] transition-colors"
                >
                  Guardar Broker
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 bg-[var(--dark-3)] text-[var(--text-dim)] rounded-xl text-sm hover:bg-[var(--dark-4)] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broker list */}
      {brokers.length === 0 ? (
        <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Link2 size={48} className="text-[var(--text-dim)] mx-auto mb-4" />
          <p className="text-[var(--text-dim)]">No hay brokers conectados</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">Agrega tu primer broker para empezar a operar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brokers.map(broker => {
            const config = BROKERS[broker.brokerId];
            return (
              <motion.div
                key={broker.id}
                layout
                className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config?.logo || '📊'}</span>
                  <div>
                    <p className="text-sm font-bold">{broker.label}</p>
                    <p className="text-xs text-[var(--text-dim)]">{config?.name} • API: {atob(broker.apiKey).slice(0, 8)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {broker.connected ? (
                    <span className="flex items-center gap-1 text-xs text-[var(--green)]">
                      <CheckCircle size={14} /> Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-dim)]">
                      <XCircle size={14} /> Desconectado
                    </span>
                  )}
                  <button
                    onClick={() => handleConnect(broker)}
                    disabled={connecting === broker.id}
                    className="px-3 py-1.5 bg-[var(--gold)]/20 text-[var(--gold)] rounded-lg text-xs font-bold hover:bg-[var(--gold)]/30 transition-colors disabled:opacity-50"
                  >
                    {connecting === broker.id ? '...' : broker.connected ? 'Reconectar' : 'Conectar'}
                  </button>
                  <button
                    onClick={() => handleDelete(broker.id)}
                    className="p-1.5 text-[var(--text-dim)] hover:text-[var(--red)] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
