import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import ChainSelector from '../components/ChainSelector';
import SwapCard from '../components/SwapCard';
import PriceChart from '../components/PriceChart';
import Stats from '../components/Stats';
import { Shield, Zap, DollarSign, ArrowRight, TrendingUp, CheckCircle } from 'lucide-react';

export default function SwapPage() {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === 'es';

  return (
    <>
      {/* Hero section */}
      <div className="text-center px-4 mt-4 sm:mt-6 mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          {t('best_price_every_swap').split('.')[0]}. <span className="text-brand-400">{t('best_price_every_swap').split('.')[1]?.trim() || 'Every Swap.'}</span>
        </h2>
        <p className="text-sm text-white/40 max-w-md mx-auto">{t('subtitle')}</p>
        <div className="mt-5"><ChainSelector /></div>
      </div>

      {/* ── KAIROS Stablecoin Banner — Above Swap ── */}
      <div className="max-w-lg mx-auto px-4 mb-4">
        <div className="relative bg-gradient-to-r from-brand-500/15 via-brand-500/8 to-brand-600/5 border border-brand-500/25 rounded-2xl p-4 overflow-hidden group hover:border-brand-500/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/10">
              <img src="/kairos-token.png" alt="KAIROS" className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-extrabold text-white">KAIROS</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> $1.00
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold">
                  {isEs ? 'STABLECOIN OFICIAL' : 'OFFICIAL STABLECOIN'}
                </span>
              </div>
              <p className="text-[11px] text-white/40 leading-tight">
                {isEs
                  ? '1 KAIROS = 1 USD • Fees 0.08% • Más barato que USDT/USDC'
                  : '1 KAIROS = 1 USD • 0.08% fees • Cheaper than USDT/USDC'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-3 flex-1 text-[10px] text-white/30">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {isEs ? 'Respaldado 1:1' : '1:1 Backed'}</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {isEs ? '0 slippage' : '0 slippage'}</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {isEs ? '4 cadenas' : '4 chains'}</span>
            </div>
            <Link to="/list-token" className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-0.5 whitespace-nowrap">
              {isEs ? 'Parea con KAIROS' : 'Pair with KAIROS'} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      <SwapCard />
      <PriceChart />
      <Stats />
    </>
  );
}
