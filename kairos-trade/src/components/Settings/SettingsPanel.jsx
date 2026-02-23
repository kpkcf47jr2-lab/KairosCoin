// Kairos Trade — Settings Panel
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Key, Shield, Globe, Bell, Volume2, Percent, Wallet } from 'lucide-react';
import useStore from '../../store/useStore';
import aiService from '../../services/ai';

export default function SettingsPanel() {
  const { settings, updateSettings, user } = useStore();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      aiService.setApiKey(apiKey.trim());
      updateSettings({ openaiKey: apiKey.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="text-sm text-[var(--text-dim)]">Configuración de tu plataforma</p>
      </div>

      {/* Profile */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Shield size={16} className="text-[var(--gold)]" /> Perfil
        </h2>
        <div className="space-y-2 text-sm">
          <p><span className="text-[var(--text-dim)]">Email:</span> {user?.email}</p>
          <p><span className="text-[var(--text-dim)]">Nombre:</span> {user?.name}</p>
          <p><span className="text-[var(--text-dim)]">Plan:</span> <span className="text-[var(--gold)]">{user?.plan?.toUpperCase()}</span></p>
        </div>
      </div>

      {/* AI Config */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Key size={16} className="text-[var(--gold)]" /> API Key de OpenAI
        </h2>
        <p className="text-xs text-[var(--text-dim)] mb-2">
          Opcional. Sin API key, Kairos AI usa análisis local integrado. Con API key, accedes a GPT-4 para análisis avanzado.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="flex-1 text-sm font-mono"
          />
          <button
            onClick={handleSaveApiKey}
            className="px-4 py-2 bg-[var(--gold)] text-white rounded-xl text-sm font-bold"
          >
            {saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Trading defaults */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Percent size={16} className="text-[var(--gold)]" /> Trading por Defecto
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--text-dim)] mb-1 block">Riesgo máx. por trade (%)</label>
            <input
              type="number"
              value={settings.maxRiskPerTrade}
              onChange={(e) => updateSettings({ maxRiskPerTrade: parseFloat(e.target.value) })}
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)] mb-1 block">Apalancamiento predeterminado</label>
            <input
              type="number"
              value={settings.defaultLeverage}
              onChange={(e) => updateSettings({ defaultLeverage: parseFloat(e.target.value) })}
              className="w-full text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Bell size={16} className="text-[var(--gold)]" /> Notificaciones
        </h2>
        <div className="space-y-3">
          {[
            { key: 'notifications', label: 'Notificaciones', desc: 'Alertas de trades y señales' },
            { key: 'soundAlerts', label: 'Sonido', desc: 'Alertas sonoras al ejecutar trades' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm">{item.label}</p>
                <p className="text-xs text-[var(--text-dim)]">{item.desc}</p>
              </div>
              <button
                onClick={() => updateSettings({ [item.key]: !settings[item.key] })}
                className={`w-12 h-6 rounded-full transition-colors relative
                  ${settings[item.key] ? 'bg-[var(--gold)]' : 'bg-[var(--dark-4)]'}`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform
                    ${settings[item.key] ? 'left-6' : 'left-0.5'}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet integration */}
      <div className="bg-[var(--dark-2)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Wallet size={16} className="text-[var(--gold)]" /> Kairos Wallet
        </h2>
        <p className="text-xs text-[var(--text-dim)] mb-3">
          Conecta tu Kairos Wallet para usar KAIROS Coin como método de pago y recibir recompensas.
        </p>
        <a
          href="https://kairos-wallet.netlify.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--gold)]/20 text-[var(--gold)] rounded-xl text-sm font-bold hover:bg-[var(--gold)]/30 transition-colors"
        >
          <Wallet size={14} /> Abrir Kairos Wallet
        </a>
      </div>

      {/* Version */}
      <div className="text-center text-xs text-[var(--text-dim)] pb-4">
        <p>Kairos Trade v1.0.0 • Kairos 777 Inc</p>
        <p className="text-[var(--gold)] mt-1">Powered by Kairos AI</p>
      </div>
    </div>
  );
}
