import React from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0, 3.0];

export default function SettingsPanel() {
  const { t } = useTranslation();
  const { slippage, setSlippage, safeMode, setSafeMode, showSettings, setShowSettings } = useStore();

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowSettings(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm mx-4 bg-dark-200 border border-white/10 rounded-2xl p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">{t('settings')}</h3>
          <button
            onClick={() => setShowSettings(false)}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Slippage */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">{t('slippage_tolerance')}</label>
          <div className="flex gap-2">
            {SLIPPAGE_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setSlippage(opt)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  slippage === opt
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                }`}
              >
                {opt}%
              </button>
            ))}
          </div>
          {slippage >= 3 && (
            <p className="text-[11px] text-yellow-400/70 mt-2">
              ⚠ {t('high_slippage_warn')}
            </p>
          )}
        </div>

        {/* Safe Mode (MEV Protection) */}
        <div className="mt-5 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs text-white/50 block">{t('safe_mode')}</label>
              <p className="text-[10px] text-white/30 mt-0.5">{t('safe_mode_desc')}</p>
            </div>
            <button
              onClick={() => setSafeMode(!safeMode)}
              className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                safeMode
                  ? 'bg-emerald-500/30 border border-emerald-500/40'
                  : 'bg-white/10 border border-white/10'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
                safeMode
                  ? 'left-[22px] bg-emerald-400'
                  : 'left-0.5 bg-white/40'
              }`} />
            </button>
          </div>
          {safeMode && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                <span>🛡️</span> {t('safe_mode_info')}
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">{t('aggregator_label')}</span>
            <span className="text-white/60">0x Protocol + Multi-DEX</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">{t('fee')}</span>
            <span className="text-brand-400">0.15%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">{t('safe_mode')}</span>
            <span className={safeMode ? 'text-emerald-400' : 'text-white/30'}>
              {safeMode ? '🛡️ Active' : 'Off'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">{t('protocol_label')}</span>
            <span className="text-white/60">Kairos Exchange v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
