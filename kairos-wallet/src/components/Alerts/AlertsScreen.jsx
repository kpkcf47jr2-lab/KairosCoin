// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Price Alerts Manager
//  Create, manage, and track price alerts
//  MetaMask doesn't have this — we do
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown,
  X, Check, Clock, AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';
import {
  getAlerts, getTriggeredAlerts, addAlert, removeAlert, toggleAlert,
  requestNotificationPermission, getActiveAlertCount,
} from '../../services/alerts';

export default function AlertsScreen() {
  const { goBack, activeChainId, showToast, balances, nativePrice, tokenPrices } = useStore();
  const chain = CHAINS[activeChainId];

  const [alerts, setAlerts] = useState([]);
  const [triggered, setTriggered] = useState([]);
  const [tab, setTab] = useState('active'); // active | history
  const [showCreate, setShowCreate] = useState(false);
  const [hasNotifPermission, setHasNotifPermission] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  // Create form
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [condition, setCondition] = useState('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);

  useEffect(() => {
    setAlerts(getAlerts());
    setTriggered(getTriggeredAlerts());
  }, []);

  const refresh = () => {
    setAlerts(getAlerts());
    setTriggered(getTriggeredAlerts());
  };

  // Build token list from current balances
  const tokenOptions = [];
  if (balances?.native) {
    tokenOptions.push({
      symbol: chain.nativeCurrency.symbol,
      address: null,
      price: nativePrice,
    });
  }
  if (balances?.tokens) {
    for (const t of balances.tokens) {
      if (!t.hasBalance) continue;
      const priceData = tokenPrices[t.address?.toLowerCase()];
      tokenOptions.push({
        symbol: t.symbol,
        address: t.address,
        price: priceData?.usd || 0,
      });
    }
  }

  const handleSelectToken = (opt) => {
    setTokenSymbol(opt.symbol);
    setTokenAddress(opt.address || '');
    setCurrentPrice(opt.price || 0);
    setTargetPrice('');
  };

  const handleCreate = () => {
    if (!tokenSymbol || !targetPrice || parseFloat(targetPrice) <= 0) {
      showToast('Completa todos los campos', 'error');
      return;
    }
    addAlert({
      tokenSymbol,
      tokenAddress,
      chainId: activeChainId,
      condition,
      targetPrice,
      currentPrice,
    });
    showToast(`🔔 Alerta creada: ${tokenSymbol} ${condition === 'above' ? '↑' : '↓'} $${targetPrice}`, 'success');
    setShowCreate(false);
    setTokenSymbol('');
    setTargetPrice('');
    refresh();
  };

  const handleDelete = (id) => {
    removeAlert(id);
    refresh();
    showToast('Alerta eliminada', 'info');
  };

  const handleToggle = (id) => {
    toggleAlert(id);
    refresh();
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setHasNotifPermission(granted);
    showToast(granted ? '🔔 Notificaciones activadas' : 'Notificaciones denegadas', granted ? 'success' : 'error');
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const activeAlerts = alerts.filter(a => a.active);
  const inactiveAlerts = alerts.filter(a => !a.active);

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-2">
            <Bell className="text-kairos-400" size={20} />
            <h1 className="text-lg font-bold text-white">Alertas de Precio</h1>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 rounded-xl bg-kairos-500/20 flex items-center justify-center text-kairos-400 hover:bg-kairos-500/30"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Notification permission banner */}
      {!hasNotifPermission && (
        <button
          onClick={handleEnableNotifications}
          className="mx-4 mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2 text-blue-400 text-xs"
        >
          <Bell size={14} />
          <span>Activa notificaciones para recibir alertas</span>
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 mx-4 mt-3 rounded-xl bg-white/5">
        {[
          { key: 'active', label: `Activas (${activeAlerts.length})` },
          { key: 'history', label: `Historial (${triggered.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-kairos-500/15 text-kairos-400' : 'text-dark-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tab === 'active' ? (
          <>
            {activeAlerts.length === 0 && inactiveAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="mx-auto text-dark-600 mb-3" size={40} />
                <p className="text-dark-400 text-sm">No tienes alertas</p>
                <p className="text-dark-500 text-xs mt-1">Crea una para recibir notificaciones de precio</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-kairos-500/20 text-kairos-400 text-sm font-semibold"
                >
                  + Crear Alerta
                </button>
              </div>
            ) : (
              <>
                {/* Active Alerts */}
                {activeAlerts.map(alert => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-dark-800/50 rounded-xl p-4 border border-dark-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          alert.condition === 'above' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {alert.condition === 'above' ? (
                            <TrendingUp className="text-green-400" size={18} />
                          ) : (
                            <TrendingDown className="text-red-400" size={18} />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{alert.tokenSymbol}</p>
                          <p className="text-dark-400 text-xs">
                            {alert.condition === 'above' ? 'Sube a' : 'Baja a'} ${alert.targetPrice}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(alert.id)}
                          className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400"
                        >
                          <BellOff size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(alert.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-dark-500 text-[10px]">
                      <Clock size={10} />
                      <span>Creada {formatDate(alert.createdAt)}</span>
                      <span>• Precio al crear: ${alert.currentPrice?.toFixed(4)}</span>
                    </div>
                  </motion.div>
                ))}

                {/* Paused Alerts */}
                {inactiveAlerts.length > 0 && (
                  <>
                    <p className="text-dark-500 text-xs font-semibold mt-4 mb-1">PAUSADAS</p>
                    {inactiveAlerts.map(alert => (
                      <div key={alert.id} className="bg-dark-800/30 rounded-xl p-3 border border-dark-700/50 opacity-60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BellOff size={14} className="text-dark-500" />
                            <span className="text-dark-400 text-sm">{alert.tokenSymbol} {alert.condition === 'above' ? '↑' : '↓'} ${alert.targetPrice}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleToggle(alert.id)} className="p-1 text-green-400"><Check size={12} /></button>
                            <button onClick={() => handleDelete(alert.id)} className="p-1 text-red-400"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          /* History Tab */
          <>
            {triggered.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto text-dark-600 mb-3" size={40} />
                <p className="text-dark-400 text-sm">No hay alertas disparadas</p>
              </div>
            ) : (
              triggered.map((alert, i) => (
                <div key={alert.id + i} className="bg-dark-800/30 rounded-xl p-3 border border-dark-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-kairos-500/10 flex items-center justify-center">
                      <Bell className="text-kairos-400" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">
                        {alert.tokenSymbol} {alert.condition === 'above' ? '↑' : '↓'} ${alert.targetPrice}
                      </p>
                      <p className="text-dark-400 text-xs">
                        Disparada a ${alert.triggeredPrice?.toFixed(4)} · {formatDate(alert.triggeredAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* ── Create Alert Modal ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-dark-900 w-full max-w-md rounded-t-3xl p-6 border-t border-dark-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Nueva Alerta</h3>
                <button onClick={() => setShowCreate(false)} className="text-dark-400"><X size={20} /></button>
              </div>

              {/* Token selector */}
              <p className="text-dark-400 text-xs mb-2">Token</p>
              <div className="flex gap-2 flex-wrap mb-4">
                {tokenOptions.map(opt => (
                  <button
                    key={opt.symbol}
                    onClick={() => handleSelectToken(opt)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      tokenSymbol === opt.symbol
                        ? 'bg-kairos-500/20 text-kairos-400 border border-kairos-500/40'
                        : 'bg-dark-800 text-dark-300 border border-dark-700'
                    }`}
                  >
                    {opt.symbol}
                    {opt.price > 0 && <span className="text-dark-500 text-xs ml-1">${opt.price.toFixed(2)}</span>}
                  </button>
                ))}
              </div>

              {/* Condition */}
              <p className="text-dark-400 text-xs mb-2">Cuando el precio...</p>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setCondition('above')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border ${
                    condition === 'above'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-dark-800 border-dark-700 text-dark-400'
                  }`}
                >
                  <TrendingUp size={14} /> Suba a
                </button>
                <button
                  onClick={() => setCondition('below')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border ${
                    condition === 'below'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-dark-800 border-dark-700 text-dark-400'
                  }`}
                >
                  <TrendingDown size={14} /> Baje a
                </button>
              </div>

              {/* Target price */}
              <p className="text-dark-400 text-xs mb-2">Precio objetivo (USD)</p>
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">$</span>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-8 pr-4 py-3 text-white placeholder-dark-500 focus:border-kairos-500 focus:outline-none"
                />
              </div>
              {currentPrice > 0 && (
                <p className="text-dark-500 text-xs mb-4">
                  Precio actual: ${currentPrice.toFixed(4)}
                  {targetPrice && (
                    <span className={condition === 'above' && parseFloat(targetPrice) > currentPrice ? ' text-green-400' :
                                     condition === 'below' && parseFloat(targetPrice) < currentPrice ? ' text-red-400' : ' text-yellow-400'}>
                      {' '}({((parseFloat(targetPrice || 0) / currentPrice - 1) * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
              )}

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={!tokenSymbol || !targetPrice || parseFloat(targetPrice) <= 0}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-kairos-500 to-kairos-400 text-dark-950 disabled:opacity-40 transition-all"
              >
                🔔 Crear Alerta
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
