// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Dashboard
//  Main screen: portfolio value, balances, quick actions
//  SUPERIOR to MetaMask: Beautiful, informative, fast
// ═══════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Download, ArrowLeftRight, Clock, Settings, ChevronDown,
  Copy, Check, RefreshCw, Plus, Eye, EyeOff, Shield, ExternalLink,
  Wallet, TrendingUp, TrendingDown, Lock, BookOpen, Image, Globe, CreditCard, Layers,
  Bell, Users, PieChart, Landmark,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getAllBalances } from '../../services/blockchain';
import { getNativePrice, getTokenPrices, getKairosPrice, formatUSD, formatBalance, formatChange } from '../../services/prices';
import { formatAddress } from '../../services/wallet';
import { CHAINS, CHAIN_ORDER, KAIROS_TOKEN } from '../../constants/chains';
import TokenIcon, { ChainIcon } from '../Common/TokenIcon';
import PWAInstallPrompt from '../Common/PWAInstallPrompt';
import PortfolioChart, { recordPortfolioValue } from './PortfolioChart';
import { discoverTokens } from '../../services/tokenDiscovery';
import { useTranslation } from '../../services/i18n';
import { checkAlerts, getActiveAlertCount } from '../../services/alerts';
import { getUnreadCount } from '../Common/NotificationCenter';

export default function Dashboard() {
  const { t } = useTranslation();
  const {
    activeAddress, activeChainId, balances, isLoadingBalances,
    nativePrice, tokenPrices, navigate, setBalances, setNativePrice,
    setTokenPrices, setActiveChain, showToast, lock, getActiveAccount,
    getTotalPortfolioValue, setTokenDetailData,
  } = useStore();

  const [hasCopied, setHasCopied] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertCount, setAlertCount] = useState(getActiveAlertCount());

  // Check for linked Trade account
  const linkedTrade = JSON.parse(localStorage.getItem('kairos_linked_trade') || 'null');

  const chain = CHAINS[activeChainId];
  const account = getActiveAccount();
  const portfolioValue = getTotalPortfolioValue();

  // Load balances
  const loadBalances = useCallback(async () => {
    if (!activeAddress) return;
    setIsRefreshing(true);
    
    try {
      const [balanceData, nativeP] = await Promise.all([
        getAllBalances(activeChainId, activeAddress),
        getNativePrice(activeChainId),
      ]);

      setBalances(balanceData);
      setNativePrice(nativeP);

      // Get token prices for tokens with balance
      const tokensWithBalance = balanceData.tokens.filter(t => t.hasBalance);
      const nonKairosAddresses = tokensWithBalance
        .filter(t => t.address.toLowerCase() !== KAIROS_TOKEN.address.toLowerCase())
        .map(t => t.address);
      
      // Fetch real prices from CoinGecko for non-KAIROS tokens
      const pricePromises = [];
      if (nonKairosAddresses.length > 0) {
        pricePromises.push(getTokenPrices(activeChainId, nonKairosAddresses));
      }
      
      // Fetch real KAIROS price from PancakeSwap DEX
      const hasKairos = tokensWithBalance.some(t => t.address.toLowerCase() === KAIROS_TOKEN.address.toLowerCase());
      if (hasKairos) {
        pricePromises.push(getKairosPrice());
      }

      const results = await Promise.all(pricePromises);
      let tokenPricesResult = {};
      let kairosIdx = 0;
      
      if (nonKairosAddresses.length > 0) {
        tokenPricesResult = results[kairosIdx] || {};
        kairosIdx++;
      }
      
      if (hasKairos && results[kairosIdx]) {
        const kairosPrice = results[kairosIdx];
        tokenPricesResult[KAIROS_TOKEN.address.toLowerCase()] = {
          usd: kairosPrice.usd,
          change24h: kairosPrice.change24h || 0,
        };
      }
      
      setTokenPrices(tokenPricesResult);

      // Run token auto-discovery in background (non-blocking)
      discoverTokens(activeChainId, activeAddress).catch(() => {});

      // Check price alerts
      try {
        const priceMap = {};
        if (nativeP > 0) priceMap[chain.nativeCurrency.symbol.toLowerCase()] = nativeP;
        for (const [addr, data] of Object.entries(tokenPricesResult)) {
          if (data.usd) priceMap[addr] = data.usd;
        }
        const triggered = checkAlerts(priceMap);
        if (triggered.length > 0) {
          showToast(`🔔 ${triggered.length} alerta(s) activada(s)!`, 'success');
        }
        setAlertCount(getActiveAlertCount());
      } catch {}
    } catch (err) {
      console.error('Failed to load balances:', err);
    }
    setIsRefreshing(false);
  }, [activeAddress, activeChainId]);

  useEffect(() => {
    loadBalances();
    const interval = setInterval(loadBalances, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadBalances]);

  // Record portfolio snapshots for chart
  useEffect(() => {
    if (portfolioValue > 0) {
      recordPortfolioValue(portfolioValue);
    }
  }, [portfolioValue]);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(activeAddress);
    setHasCopied(true);
    showToast(t('receive.address_copied'), 'success');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const getTokenPrice = (token) => {
    return tokenPrices[token.address?.toLowerCase()]?.usd || 0;
  };

  const getTokenChange = (token) => {
    return tokenPrices[token.address?.toLowerCase()]?.change24h || 0;
  };

  const allTokens = [
    ...(balances.native ? [{ ...balances.native, price: nativePrice }] : []),
    ...(balances.tokens || []),
  ];

  const tokensWithBalance = allTokens.filter(t => t.hasBalance || t.isNative);

  return (
    <div className="screen-container-scroll">
      {/* ── Top Bar ── */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          {/* Chain selector */}
          <button
            onClick={() => setShowChainPicker(!showChainPicker)}
            className="flex items-center gap-2 glass-button py-2 px-3 text-sm"
          >
            <ChainIcon chainId={activeChainId} size={18} />
            <span className="font-medium">{chain.shortName}</span>
            <ChevronDown size={14} className={`transition-transform ${showChainPicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={loadBalances} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
              <RefreshCw size={16} className={`text-dark-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => navigate('notifications')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center relative">
              <Bell size={16} className="text-dark-300" />
              {getUnreadCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-kairos-500 text-dark-950 text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {getUnreadCount()}
                </span>
              )}
            </button>
            <button onClick={() => navigate('settings')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
              <Settings size={16} className="text-dark-300" />
            </button>
            <button onClick={lock} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
              <Lock size={16} className="text-dark-300" />
            </button>
          </div>
        </div>

        {/* Chain picker dropdown */}
        <AnimatePresence>
          {showChainPicker && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute left-4 right-4 z-30 glass-card-strong p-2 mt-1"
            >
              {CHAIN_ORDER.map(id => {
                const c = CHAINS[id];
                return (
                  <button
                    key={id}
                    onClick={() => { setActiveChain(id); setShowChainPicker(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      id === activeChainId ? 'bg-kairos-500/10 text-kairos-400' : 'hover:bg-white/5'
                    }`}
                  >
                    <ChainIcon chainId={id} size={24} />
                    <span className="font-medium text-sm">{c.name}</span>
                    {id === activeChainId && <Check size={16} className="ml-auto text-kairos-400" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Address */}
        <button
          onClick={handleCopyAddress}
          className="flex items-center gap-2 mx-auto mb-4"
        >
          <Wallet size={14} className="text-dark-400" />
          <span className="text-dark-300 text-sm font-mono">{formatAddress(activeAddress)}</span>
          {hasCopied ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <Copy size={14} className="text-dark-400" />
          )}
        </button>
      </div>

      {/* ── Portfolio Value ── */}
      <div className="px-5 text-center mb-5 cursor-pointer" onClick={() => navigate('portfolio')}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-dark-400 text-xs">{t('dashboard.portfolio')}</span>
          <button onClick={(e) => { e.stopPropagation(); setHideBalance(!hideBalance); }}>
            {hideBalance ? <EyeOff size={12} className="text-dark-500" /> : <Eye size={12} className="text-dark-500" />}
          </button>
        </div>
        <h2 className="balance-text text-white">
          {hideBalance ? '••••••' : formatUSD(portfolioValue)}
        </h2>
        <p className="text-dark-600 text-[10px] mt-0.5">Toca para ver asignación</p>
      </div>

      {/* ── Portfolio Chart ── */}
      <PortfolioChart portfolioValue={portfolioValue} hideBalance={hideBalance} />

      {/* ── PWA Install ── */}
      <PWAInstallPrompt />

      {/* ── Quick Actions ── */}
      <div className="px-5 mb-5">
        {/* Kairos Trade banner — always visible */}
        <a
          href="https://kairos-trade.netlify.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full mb-3 p-3 rounded-xl transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))', border: '1px solid rgba(59,130,246,0.15)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Kairos 777</p>
            <p className="text-[10px] text-dark-400 truncate">
              {linkedTrade ? `Conectado · ${linkedTrade.email}` : 'Trading con AI · Bots · 10 Brokers'}
            </p>
          </div>
          <ExternalLink size={14} className="text-blue-400 shrink-0" />
        </a>

        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Send, label: t('action.send'), screen: 'send', color: 'bg-blue-500/10 text-blue-400' },
            { icon: Download, label: t('action.receive'), screen: 'receive', color: 'bg-green-500/10 text-green-400' },
            { icon: CreditCard, label: t('action.buy', 'Comprar'), screen: 'buy', color: 'bg-emerald-500/10 text-emerald-400' },
            { icon: ArrowLeftRight, label: t('action.swap'), screen: 'swap', color: 'bg-purple-500/10 text-purple-400' },
            { icon: Layers, label: 'Bridge', screen: 'bridge', color: 'bg-indigo-500/10 text-indigo-400' },
            { icon: Users, label: 'Multi-Send', screen: 'multisend', color: 'bg-cyan-500/10 text-cyan-400' },
            { icon: Globe, label: t('action.dapps'), screen: 'dapps', color: 'bg-orange-500/10 text-orange-400' },
            { icon: Image, label: t('action.nfts'), screen: 'nft', color: 'bg-pink-500/10 text-pink-400' },
            { icon: Lock, label: 'Staking', screen: 'staking', color: 'bg-teal-500/10 text-teal-400' },
            { icon: Landmark, label: 'Vault', screen: 'vault', color: 'bg-emerald-500/10 text-emerald-400' },
            { icon: PieChart, label: 'Portfolio', screen: 'portfolio', color: 'bg-violet-500/10 text-violet-400' },
            { icon: Bell, label: 'Alertas', screen: 'alerts', color: 'bg-kairos-500/10 text-kairos-400', badge: alertCount },
            { icon: Shield, label: 'Auditoría', screen: 'tokenaudit', color: 'bg-red-500/10 text-red-400' },
            { icon: TrendingUp, label: 'Gas', screen: 'gas', color: 'bg-amber-500/10 text-amber-400' },
            { icon: Clock, label: t('action.history'), screen: 'history', color: 'bg-kairos-500/10 text-kairos-400' },
            { icon: BookOpen, label: 'Contactos', screen: 'contacts', color: 'bg-sky-500/10 text-sky-400' },
            { icon: Settings, label: t('action.settings'), screen: 'settings', color: 'bg-white/5 text-dark-300' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.screen)}
              className="flex flex-col items-center gap-2 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all active:scale-95 relative"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.color}`}>
                <action.icon size={16} />
              </div>
              {action.badge > 0 && (
                <span className="absolute top-1 right-1 bg-kairos-500 text-dark-950 text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {action.badge}
                </span>
              )}
              <span className="text-[10px] text-dark-300">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Token List ── */}
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-dark-200">{t('dashboard.tokens')}</h3>
          <button
            onClick={() => navigate('tokens')}
            className="flex items-center gap-1 text-xs text-kairos-400"
          >
            <Plus size={14} />
            {t('dashboard.manage')}
          </button>
        </div>

        {isLoadingBalances && !balances.native ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="token-row animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/5" />
                <div className="flex-1">
                  <div className="h-4 w-20 bg-white/5 rounded mb-1" />
                  <div className="h-3 w-16 bg-white/5 rounded" />
                </div>
                <div className="text-right">
                  <div className="h-4 w-16 bg-white/5 rounded mb-1" />
                  <div className="h-3 w-12 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {tokensWithBalance.map((token, i) => {
              const price = token.isNative ? nativePrice : getTokenPrice(token);
              const change = token.isNative ? 0 : getTokenChange(token);
              const value = parseFloat(token.balance) * price;
              const symbol = token.isNative ? token.symbol : token.symbol;
              const isKairos = token.address?.toLowerCase() === KAIROS_TOKEN.address.toLowerCase();

              return (
                <motion.div
                  key={token.address || 'native'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="token-row cursor-pointer"
                  onClick={() => {
                    setTokenDetailData(token);
                    navigate('tokenDetail');
                  }}
                >
                  {/* Token icon */}
                  <TokenIcon token={token} chainId={activeChainId} size={40} showChainBadge={!token.isNative} />

                  {/* Token info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm truncate">{symbol}</span>
                      {isKairos && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-kairos-500/20 text-kairos-400">
                          STABLE
                        </span>
                      )}
                    </div>
                    <span className="text-dark-400 text-xs">
                      {price > 0 ? formatUSD(price) : '—'}
                      {change !== 0 && (
                        <span className={change > 0 ? ' text-green-400' : ' text-red-400'}>
                          {' '}{formatChange(change)}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Balance */}
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      {hideBalance ? '•••' : formatBalance(token.balance)}
                    </div>
                    <div className="text-dark-400 text-xs">
                      {hideBalance ? '•••' : (value > 0 ? formatUSD(value) : '—')}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {tokensWithBalance.length === 0 && !isLoadingBalances && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Wallet size={24} className="text-dark-400" />
                </div>
                <p className="text-dark-400 text-sm mb-1">{t('dashboard.no_tokens')}</p>
                <p className="text-dark-500 text-xs">{t('dashboard.no_tokens_desc')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
