import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import ChainSelector from '../components/ChainSelector';
import SwapCard from '../components/SwapCard';
import Stats from '../components/Stats';

export default function SwapPage() {
  const { t } = useTranslation();

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
      <SwapCard />
      <Stats />
    </>
  );
}
