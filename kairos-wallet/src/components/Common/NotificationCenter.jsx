// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Notification Center
//  Central hub for all wallet notifications
//  MetaMask has NOTHING like this
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, BellOff, Trash2, Check, CheckCheck, X,
  TrendingUp, Send, Download, Shield, AlertTriangle, Layers,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const NOTIF_KEY = 'kairos_notifications';
const MAX_NOTIFICATIONS = 100;

// Notification types
const NOTIF_TYPES = {
  tx_sent: { icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Envío' },
  tx_received: { icon: Download, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Recibido' },
  tx_failed: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Fallido' },
  price_alert: { icon: TrendingUp, color: 'text-kairos-400', bg: 'bg-kairos-500/10', label: 'Alerta' },
  security: { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Seguridad' },
  bridge: { icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-500/10', label: 'Bridge' },
  system: { icon: Bell, color: 'text-dark-300', bg: 'bg-white/5', label: 'Sistema' },
};

// ── Notification Storage ──
export function getNotifications() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { return []; }
}

export function addNotification({ type = 'system', title, message, data = {} }) {
  const notifs = getNotifications();
  notifs.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type,
    title,
    message,
    data,
    read: false,
    timestamp: Date.now(),
  });
  // Cap at MAX_NOTIFICATIONS
  if (notifs.length > MAX_NOTIFICATIONS) notifs.length = MAX_NOTIFICATIONS;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
  return notifs[0];
}

export function markRead(id) {
  const notifs = getNotifications();
  const n = notifs.find(n => n.id === id);
  if (n) n.read = true;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export function markAllRead() {
  const notifs = getNotifications().map(n => ({ ...n, read: true }));
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export function deleteNotification(id) {
  const notifs = getNotifications().filter(n => n.id !== id);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export function clearAllNotifications() {
  localStorage.setItem(NOTIF_KEY, '[]');
}

export function getUnreadCount() {
  return getNotifications().filter(n => !n.read).length;
}

// ── Notification Center Screen ──
export default function NotificationCenter() {
  const { goBack, showToast } = useStore();
  const [notifications, setNotifications] = useState(getNotifications());
  const [filter, setFilter] = useState('all'); // all | unread

  const refresh = () => setNotifications(getNotifications());

  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    markAllRead();
    refresh();
    showToast('Todas marcadas como leídas', 'success');
  };

  const handleClearAll = () => {
    clearAllNotifications();
    refresh();
    showToast('Notificaciones eliminadas', 'success');
  };

  const handleRead = (id) => {
    markRead(id);
    refresh();
  };

  const handleDelete = (id) => {
    deleteNotification(id);
    refresh();
  };

  const formatTime = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800">
        <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <Bell className="text-kairos-400" size={20} />
          <h1 className="text-lg font-bold text-white">Notificaciones</h1>
          {unreadCount > 0 && (
            <span className="bg-kairos-500 text-dark-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-kairos-400 hover:underline">
              <CheckCheck size={14} />
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleClearAll} className="text-xs text-dark-500 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 mx-4 mt-3 rounded-xl bg-white/5">
        {[
          { key: 'all', label: `Todas (${notifications.length})` },
          { key: 'unread', label: `Sin leer (${unreadCount})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === t.key ? 'bg-kairos-500/15 text-kairos-400' : 'text-dark-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {displayed.length === 0 ? (
          <div className="text-center py-16">
            <BellOff className="mx-auto text-dark-600 mb-3" size={40} />
            <p className="text-dark-400 text-sm">
              {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {displayed.map((n, i) => {
              const config = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
              const Icon = config.icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    n.read
                      ? 'bg-dark-800/30 border-dark-700/30'
                      : 'bg-dark-800/60 border-dark-700/60'
                  }`}
                  onClick={() => !n.read && handleRead(n.id)}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                    <Icon size={16} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${n.read ? 'text-dark-300' : 'text-white'}`}>
                        {n.title}
                      </p>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-kairos-500 flex-shrink-0" />}
                    </div>
                    <p className="text-dark-500 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-dark-600 text-[10px] mt-1">{formatTime(n.timestamp)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                    className="text-dark-600 hover:text-red-400 flex-shrink-0 mt-1"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
