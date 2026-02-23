// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Buy Crypto Screen
//  On-ramp: buy crypto with fiat via providers
//  Transak SDK embedded + other provider redirects
// ═══════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CreditCard, ExternalLink, Shield, ChevronRight, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';
import { useTranslation } from '../../services/i18n';

// Transak config
const TRANSAK_API_KEY = '02324dee-49a4-4ba2-a42b-44eb70e40e5a'; // staging — switch to prod after KYB approval
const TRANSAK_ENV = 'STAGING'; // Change to 'PRODUCTION' after approval

// ── On-ramp providers with pre-configured URLs ──
const PROVIDERS = [
  {
    id: 'moonpay',
    name: 'MoonPay',
    icon: '🌙',
    description: 'Visa, Mastercard, Apple Pay, Google Pay',
    fees: '~3.5%',
    methods: ['💳 Tarjeta', '📱 Apple Pay', '🔵 Google Pay'],
    getUrl: (address, chainId) => {
      const currency = { 56: 'bnb_bsc', 1: 'eth', 137: 'matic_polygon', 42161: 'eth_arbitrum', 43114: 'avax_cchain', 8453: 'eth_base' }[chainId] || 'eth';
      return `https://www.moonpay.com/buy/${currency}?walletAddress=${address}`;
    },
    chains: [56, 1, 137, 42161, 43114, 8453],
  },
  {
    id: 'transak',
    name: 'Transak',
    icon: '💫',
    description: 'Visa, Mastercard, SEPA, transferencia',
    fees: '~1-5%',
    methods: ['💳 Tarjeta', '🏦 SEPA', '📱 Transferencia'],
    embedded: true, // Uses Transak SDK
    getUrl: (address, chainId) => {
      const network = { 56: 'bsc', 1: 'ethereum', 137: 'polygon', 42161: 'arbitrum', 43114: 'avalanche', 8453: 'base' }[chainId] || 'ethereum';
      const crypto = { 56: 'BNB', 1: 'ETH', 137: 'MATIC', 42161: 'ETH', 43114: 'AVAX', 8453: 'ETH' }[chainId] || 'ETH';
      return `https://global.transak.com/?walletAddress=${address}&network=${network}&defaultCryptoCurrency=${crypto}`;
    },
    chains: [56, 1, 137, 42161, 43114, 8453],
  },
  {
    id: 'ramp',
    name: 'Ramp Network',
    icon: '🚀',
    description: 'Visa, Mastercard, transferencia bancaria',
    fees: '~2.5%',
    methods: ['💳 Tarjeta', '🏦 Banco', '📱 Open Banking'],
    getUrl: (address, chainId) => {
      const asset = { 56: 'BSC_BNB', 1: 'ETH', 137: 'MATIC_MATIC', 42161: 'ARBITRUM_ETH', 43114: 'AVAX_AVAX', 8453: 'BASE_ETH' }[chainId] || 'ETH';
      return `https://app.ramp.network/?userAddress=${address}&swapAsset=${asset}`;
    },
    chains: [56, 1, 137, 42161, 43114, 8453],
  },
  {
    id: 'simplex',
    name: 'Simplex',
    icon: '💎',
    description: 'Visa, Mastercard, pagos instantáneos',
    fees: '~3.5-5%',
    methods: ['💳 Tarjeta', '📱 Apple Pay'],
    getUrl: (address, chainId) => {
      const crypto = { 56: 'BNB', 1: 'ETH', 137: 'MATIC', 42161: 'ETH', 43114: 'AVAX', 8453: 'ETH' }[chainId] || 'ETH';
      return `https://buy.simplex.com/?crypto=${crypto}&walletAddress=${address}`;
    },
    chains: [56, 1, 137],
  },
  {
    id: 'banxa',
    name: 'Banxa',
    icon: '🏦',
    description: 'Tarjeta, transferencia, PIX',
    fees: '~2-3%',
    methods: ['💳 Tarjeta', '🏦 Transferencia', '🇧🇷 PIX'],
    getUrl: (address, chainId) => {
      const coin = { 56: 'BNB', 1: 'ETH', 137: 'MATIC', 42161: 'ETH', 43114: 'AVAX', 8453: 'ETH' }[chainId] || 'ETH';
      return `https://checkout.banxa.com/?walletAddress=${address}&coinType=${coin}`;
    },
    chains: [56, 1, 137, 42161],
  },
];

export default function BuyCryptoScreen() {
  const { activeAddress, activeChainId, goBack, showToast } = useStore();
  const { t } = useTranslation();
  const chain = CHAINS[activeChainId];
  const [showTransak, setShowTransak] = useState(false);

  const availableProviders = useMemo(
    () => PROVIDERS.filter(p => p.chains.includes(activeChainId)),
    [activeChainId]
  );

  const openTransakWidget = useCallback(async () => {
    try {
      const { default: TransakSDK } = await import('@transak/transak-sdk');
      const networkMap = { 56: 'bsc', 1: 'ethereum', 137: 'polygon', 42161: 'arbitrum', 43114: 'avalanche', 8453: 'base' };
      const cryptoMap = { 56: 'BNB', 1: 'ETH', 137: 'MATIC', 42161: 'ETH', 43114: 'AVAX', 8453: 'ETH' };

      const transak = new TransakSDK({
        apiKey: TRANSAK_API_KEY,
        environment: TRANSAK_ENV,
        walletAddress: activeAddress,
        defaultNetwork: networkMap[activeChainId] || 'ethereum',
        defaultCryptoCurrency: cryptoMap[activeChainId] || 'ETH',
        themeColor: 'D4AF37',
        widgetHeight: '600px',
        widgetWidth: '100%',
      });

      transak.init();

      transak.on('TRANSAK_ORDER_SUCCESSFUL', (data) => {
        showToast('¡Compra exitosa! Los fondos llegarán pronto.', 'success');
        transak.close();
      });

      transak.on('TRANSAK_ORDER_FAILED', () => {
        showToast('La compra falló. Intenta de nuevo.', 'error');
      });

      transak.on('TRANSAK_WIDGET_CLOSE', () => {
        transak.close();
      });
    } catch (err) {
      console.error('[Buy] Transak SDK error:', err);
      // Fallback to URL redirect
      const provider = PROVIDERS.find(p => p.id === 'transak');
      if (provider) {
        window.open(provider.getUrl(activeAddress, activeChainId), '_blank', 'noopener,noreferrer');
      }
    }
  }, [activeAddress, activeChainId]);

  const handleBuy = (provider) => {
    if (provider.embedded && provider.id === 'transak') {
      openTransakWidget();
      return;
    }
    const url = provider.getUrl(activeAddress, activeChainId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <h1 className="font-bold text-white">{t('buy.title', 'Comprar Crypto')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Info card */}
        <div className="bg-gradient-to-r from-kairos-500/10 to-kairos-600/5 rounded-2xl p-4 mb-5 border border-kairos-500/10">
          <div className="flex items-start gap-3">
            <CreditCard size={20} className="text-kairos-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">{t('buy.subtitle', 'Compra crypto con tarjeta')}</p>
              <p className="text-[11px] text-dark-400 leading-relaxed">
                {t('buy.desc', 'Selecciona un proveedor para comprar crypto directo a tu wallet. Los fondos llegan en minutos.')}
              </p>
            </div>
          </div>
        </div>

        {/* Chain indicator */}
        <p className="text-[10px] text-dark-500 mb-3">
          {t('buy.receiving', 'Recibiendo en')} {chain.icon} {chain.name}
        </p>

        {/* Security notice */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
          <Shield size={12} className="text-green-400 shrink-0" />
          <p className="text-[10px] text-dark-400">
            {t('buy.security', 'Los proveedores son externos. Kairos Wallet nunca accede a tu información de pago.')}
          </p>
        </div>

        {/* Providers */}
        <div className="space-y-3">
          {availableProviders.map((provider, i) => (
            <motion.button
              key={provider.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleBuy(provider)}
              className="w-full bg-white/[0.03] rounded-2xl p-4 border border-white/5 hover:border-kairos-500/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-xl">
                  {provider.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{provider.name}</p>
                    {provider.embedded && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-kairos-500/20 text-kairos-400 font-medium">
                        INTEGRADO
                      </span>
                    )}
                    <span className="text-[10px] text-dark-500">{provider.fees}</span>
                  </div>
                  <p className="text-[10px] text-dark-400">{provider.description}</p>
                </div>
                <ExternalLink size={14} className="text-dark-500" />
              </div>
              <div className="flex flex-wrap gap-1.5 ml-13">
                {provider.methods.map(m => (
                  <span key={m} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] text-dark-400">
                    {m}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
