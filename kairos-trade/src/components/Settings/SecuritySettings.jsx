// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Security Settings Panel
//  2FA Setup/Disable • Change Password • Active Sessions • Auth Log
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldOff, Key, Lock, Eye, EyeOff,
  Monitor, Clock, MapPin, AlertTriangle, CheckCircle2,
  RefreshCw, Smartphone, Copy, Download
} from 'lucide-react';
import useStore from '../../store/useStore';
import apiClient from '../../services/apiClient';

const API_HOST = apiClient.host;

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

function authFetch(path, _token, opts = {}) {
  // Uses centralized apiClient with auto token refresh
  const method = opts.method || 'GET';
  if (method === 'GET') return apiClient.get(path);
  return apiClient.post(path, opts.body);
}

// ── OTP Input (6 digits) ────────────────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, '').slice(0, 6).split('');

  const handleChange = (i, ch) => {
    if (!/^\d?$/.test(ch)) return;
    const next = [...digits]; next[i] = ch;
    onChange(next.join('').replace(/\s/g, ''));
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    onChange(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6));
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={el => (refs.current[i] = el)}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-10 h-12 text-center text-lg font-bold text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500/60"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
        />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function SecuritySettings() {
  const { user, login } = useStore();
  const token = user?.accessToken;

  // ── State ──
  const [tab, setTab] = useState('2fa');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // 2FA
  const [qrCode, setQrCode] = useState('');
  const [otpUrl, setOtpUrl] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showSetup, setShowSetup] = useState(false);

  // Password
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [authLog, setAuthLog] = useState([]);

  useEffect(() => {
    if (tab === 'sessions' && token) {
      authFetch('/api/auth/sessions', token).then(r => r.success && setSessions(r.data || []));
      authFetch('/api/auth/log', token).then(r => r.success && setAuthLog(r.data || []));
    }
  }, [tab, token]);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 5000); };

  // ── 2FA Setup ──────────────────────────────────────────────────────────
  const start2FASetup = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/2fa/setup', token, { method: 'POST' });
      if (!res.success) throw new Error(res.error);
      setQrCode(res.data.qrCode);
      setOtpUrl(res.data.otpauthUrl || '');
      setShowSetup(true);
      setSetupCode('');
    } catch (err) {
      flash('error', err.message);
    }
    setLoading(false);
  };

  const confirm2FASetup = async () => {
    if (setupCode.length !== 6) { flash('error', 'Ingresa los 6 dígitos'); return; }
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/2fa/verify', token, { method: 'POST', body: { totpCode: setupCode } });
      if (!res.success) throw new Error(res.error);
      setBackupCodes(res.data.backupCodes || []);
      // Update local user
      login({ ...user, has2FA: true });
      flash('success', '2FA activado exitosamente');
      setShowSetup(false);
    } catch (err) {
      flash('error', err.message);
    }
    setLoading(false);
  };

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) { flash('error', 'Ingresa los 6 dígitos'); return; }
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/2fa/disable', token, { method: 'POST', body: { totpCode: disableCode } });
      if (!res.success) throw new Error(res.error);
      login({ ...user, has2FA: false });
      flash('success', '2FA desactivado');
      setDisableCode('');
    } catch (err) {
      flash('error', err.message);
    }
    setLoading(false);
  };

  // ── Password Change ────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (passwords.new.length < 8) { flash('error', 'Mínimo 8 caracteres'); return; }
    if (passwords.new !== passwords.confirm) { flash('error', 'Las contraseñas no coinciden'); return; }
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/change-password', token, {
        method: 'POST', body: { currentPassword: passwords.current, newPassword: passwords.new },
      });
      if (!res.success) throw new Error(res.error);
      flash('success', 'Contraseña cambiada. Inicia sesión de nuevo.');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      flash('error', err.message);
    }
    setLoading(false);
  };

  // ── Logout All Sessions ────────────────────────────────────────────────
  const logoutAll = async () => {
    setLoading(true);
    try {
      await authFetch('/api/auth/logout-all', token, { method: 'POST' });
      flash('success', 'Todas las sesiones cerradas');
      setSessions([]);
    } catch (err) {
      flash('error', err.message);
    }
    setLoading(false);
  };

  const TABS = [
    { id: '2fa', icon: Shield, label: '2FA' },
    { id: 'password', icon: Key, label: 'Contraseña' },
    { id: 'sessions', icon: Monitor, label: 'Sesiones' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Shield size={20} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Seguridad</h1>
          <p className="text-xs text-zinc-400">Protege tu cuenta con autenticación de dos factores y más</p>
        </div>
      </div>

      {/* Flash message */}
      <AnimatePresence>
        {msg.text && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
              msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
            {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'text-zinc-400 hover:text-zinc-300'
            }`}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: 2FA ── */}
      {tab === '2fa' && (
        <div className="space-y-4">
          {/* Status card */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user?.has2FA ? (
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <ShieldOff size={20} className="text-amber-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">Autenticación de Dos Factores (2FA)</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {user?.has2FA
                      ? 'Activado — tu cuenta tiene protección adicional'
                      : 'Desactivado — actívalo para proteger tu cuenta'}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                user?.has2FA ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
              }`}>
                {user?.has2FA ? 'ACTIVO' : 'INACTIVO'}
              </div>
            </div>
          </div>

          {/* 2FA Actions */}
          {!user?.has2FA ? (
            !showSetup ? (
              <button onClick={start2FASetup} disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 15px rgba(59,130,246,0.2)' }}>
                {loading ? <RefreshCw size={16} className="animate-spin mx-auto" /> : (
                  <span className="flex items-center gap-2 justify-center"><Smartphone size={16} /> Activar 2FA con App Autenticadora</span>
                )}
              </button>
            ) : (
              <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <h3 className="text-sm font-bold text-white text-center">Escanea este código QR</h3>
                <p className="text-xs text-zinc-400 text-center">Usa Google Authenticator, Authy o cualquier app TOTP</p>
                
                {qrCode && (
                  <div className="flex justify-center">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-xl" />
                  </div>
                )}

                <div className="text-center">
                  <p className="text-[11px] text-zinc-500 mb-2">Luego ingresa el código de 6 dígitos:</p>
                  <OTPInput value={setupCode} onChange={setSetupCode} />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { setShowSetup(false); setSetupCode(''); }}
                    className="flex-1 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    Cancelar
                  </button>
                  <button onClick={confirm2FASetup} disabled={loading || setupCode.length !== 6}
                    className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                    {loading ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Verificar y Activar'}
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-bold text-white">Desactivar 2FA</h3>
              <p className="text-xs text-zinc-400">Ingresa tu código actual para desactivar</p>
              <OTPInput value={disableCode} onChange={setDisableCode} />
              <button onClick={handleDisable2FA} disabled={loading || disableCode.length !== 6}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-red-400 disabled:opacity-50 transition-all"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {loading ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Desactivar 2FA'}
              </button>
            </div>
          )}

          {/* Backup codes */}
          {backupCodes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-amber-400">Códigos de Respaldo</h3>
              </div>
              <p className="text-xs text-zinc-400">Guarda estos códigos en un lugar seguro. Si pierdes tu teléfono, los necesitarás para acceder.</p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div key={i} className="text-center font-mono text-sm text-white px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>{code}</div>
                ))}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(backupCodes.join('\n')); flash('success', 'Copiados al portapapeles'); }}
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                <Copy size={12} /> Copiar todos
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ── TAB: Password ── */}
      {tab === 'password' && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Lock size={16} /> Cambiar Contraseña</h3>
          
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block font-semibold uppercase tracking-wider">Contraseña actual</label>
            <div className="relative">
              <input type={showCurr ? 'text' : 'password'} value={passwords.current}
                onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                className="w-full pr-10 text-sm text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500/40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.6rem 0.85rem' }} />
              <button type="button" onClick={() => setShowCurr(!showCurr)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                {showCurr ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block font-semibold uppercase tracking-wider">Nueva contraseña</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={passwords.new}
                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                className="w-full pr-10 text-sm text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500/40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.6rem 0.85rem' }} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {passwords.new && passwords.new.length < 8 && (
              <p className="text-[10px] text-amber-400 mt-1">Mínimo 8 caracteres</p>
            )}
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block font-semibold uppercase tracking-wider">Confirmar nueva</label>
            <input type="password" value={passwords.confirm}
              onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
              className="w-full text-sm text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500/40"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.6rem 0.85rem' }} />
            {passwords.confirm && passwords.confirm !== passwords.new && (
              <p className="text-[10px] text-red-400 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <button onClick={handleChangePassword} disabled={loading || !passwords.current || !passwords.new || passwords.new !== passwords.confirm}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 15px rgba(59,130,246,0.2)' }}>
            {loading ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Cambiar Contraseña'}
          </button>
        </div>
      )}

      {/* ── TAB: Sessions ── */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Sesiones Activas</h3>
            <button onClick={logoutAll} disabled={loading}
              className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1.5 transition-colors">
              <ShieldOff size={12} /> Cerrar Todas
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">No hay sesiones activas</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Monitor size={16} className="text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{s.user_agent?.slice(0, 60) || 'Unknown'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><MapPin size={9} /> {s.ip || '?'}</span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Clock size={9} /> {fmt(s.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Auth log */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white mb-3">Historial de Actividad</h3>
            {authLog.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Sin actividad registrada</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {authLog.slice(0, 20).map(l => (
                  <div key={l.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: l.success ? 'rgba(255,255,255,0.02)' : 'rgba(239,68,68,0.04)' }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${l.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-zinc-300 font-medium">{l.action}</span>
                    <span className="text-zinc-500 ml-auto">{fmt(l.created_at)}</span>
                    <span className="text-zinc-600">{l.ip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
