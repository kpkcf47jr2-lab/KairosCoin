// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Gas Tracker Dashboard
//  Real-time gas prices across ALL networks in one view
//  MetaMask only shows current chain — we show everything
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Fuel, RefreshCw, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getProvider } from '../../services/blockchain';
import { CHAINS, CHAIN_ORDER, GAS_PRESETS } from '../../constants/chains';
import { ethers } from 'ethers';

export default function GasTrackerScreen() {
  const { goBack, activeChainId } = useStore();
  const [gasPrices, setGasPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAllGas = useCallback(async () => {
    setLoading(true);
    const prices = {};

    const promises = CHAIN_ORDER.map(async (chainId) => {
      try {
        const provider = getProvider(chainId);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice ? parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')) : 0;
        const maxPriorityFee = feeData.maxPriorityFeePerGas
          ? parseFloat(ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'))
          : 0;

        // Calculate costs for a simple transfer (21000 gas)
        const transferCostWei = feeData.gasPrice ? feeData.gasPrice * 21000n : 0n;
        const transferCost = parseFloat(ethers.formatEther(transferCostWei));

        // ERC-20 transfer (~65000 gas)
        const tokenCostWei = feeData.gasPrice ? feeData.gasPrice * 65000n : 0n;
        const tokenCost = parseFloat(ethers.formatEther(tokenCostWei));

        // Swap cost (~150000 gas)
        const swapCostWei = feeData.gasPrice ? feeData.gasPrice * 150000n : 0n;
        const swapCost = parseFloat(ethers.formatEther(swapCostWei));

        prices[chainId] = {
          gasPrice: gasPrice.toFixed(2),
          maxPriorityFee: maxPriorityFee.toFixed(2),
          transferCost,
          tokenCost,
          swapCost,
          level: gasPrice < 5 ? 'low' : gasPrice < 30 ? 'medium' : gasPrice < 100 ? 'high' : 'extreme',
          supportsEIP1559: !!feeData.maxFeePerGas,
        };
      } catch {
        prices[chainId] = { gasPrice: '—', level: 'unknown', error: true };
      }
    });

    await Promise.allSettled(promises);
    setGasPrices(prices);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllGas();
    const interval = setInterval(fetchAllGas, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchAllGas]);

  const getLevelColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'extreme': return 'text-red-400';
      default: return 'text-dark-400';
    }
  };

  const getLevelBg = (level) => {
    switch (level) {
      case 'low': return 'bg-green-500/10 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'high': return 'bg-orange-500/10 border-orange-500/20';
      case 'extreme': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-dark-800/50 border-dark-700';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'low': return <TrendingDown className="text-green-400" size={14} />;
      case 'medium': return <Minus className="text-yellow-400" size={14} />;
      case 'high': return <TrendingUp className="text-orange-400" size={14} />;
      case 'extreme': return <TrendingUp className="text-red-400" size={14} />;
      default: return <Minus className="text-dark-400" size={14} />;
    }
  };

  const getLevelLabel = (level) => {
    switch (level) {
      case 'low': return '🟢 Bajo';
      case 'medium': return '🟡 Normal';
      case 'high': return '🟠 Alto';
      case 'extreme': return '🔴 Muy Alto';
      default: return '⚪ —';
    }
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-2">
            <Fuel className="text-kairos-400" size={20} />
            <h1 className="text-lg font-bold text-white">Gas Tracker</h1>
          </div>
        </div>
        <button
          onClick={fetchAllGas}
          className="text-dark-400 hover:text-kairos-400 transition-colors"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Last update */}
        {lastUpdate && (
          <div className="flex items-center gap-1 text-dark-500 text-xs">
            <Clock size={10} />
            <span>Actualizado: {lastUpdate.toLocaleTimeString()}</span>
            <span className="ml-auto text-dark-600">Auto-refresh: 15s</span>
          </div>
        )}

        {/* Gas Legend */}
        <div className="flex gap-2 flex-wrap">
          {['low', 'medium', 'high', 'extreme'].map(level => (
            <span key={level} className={`px-2 py-0.5 rounded text-[10px] font-bold ${getLevelColor(level)} bg-dark-800`}>
              {getLevelLabel(level)}
            </span>
          ))}
        </div>

        {/* Gas Cards */}
        {CHAIN_ORDER.map((chainId) => {
          const chain = CHAINS[chainId];
          const gas = gasPrices[chainId];
          const isActive = chainId === activeChainId;

          return (
            <motion.div
              key={chainId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-4 border transition-all ${
                isActive ? 'border-kairos-500/50 bg-kairos-500/5' : getLevelBg(gas?.level)
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{chain.icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{chain.shortName}</p>
                    <p className="text-dark-500 text-[10px]">{chain.name}</p>
                  </div>
                  {isActive && (
                    <span className="px-1.5 py-0.5 bg-kairos-500/20 text-kairos-400 text-[9px] font-bold rounded">
                      ACTIVA
                    </span>
                  )}
                </div>
                <div className="text-right flex items-center gap-2">
                  {gas && !gas.error && getLevelIcon(gas.level)}
                  <div>
                    <p className={`font-bold text-lg ${getLevelColor(gas?.level)}`}>
                      {gas?.gasPrice || '—'}
                    </p>
                    <p className="text-dark-500 text-[10px]">Gwei</p>
                  </div>
                </div>
              </div>

              {gas && !gas.error && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-dark-900/50 rounded-lg p-2 text-center">
                    <p className="text-dark-400 text-[9px] mb-0.5">Enviar</p>
                    <p className="text-white text-xs font-semibold">
                      {gas.transferCost < 0.0001 ? '<0.0001' : gas.transferCost.toFixed(4)}
                    </p>
                    <p className="text-dark-500 text-[9px]">{chain.nativeCurrency.symbol}</p>
                  </div>
                  <div className="bg-dark-900/50 rounded-lg p-2 text-center">
                    <p className="text-dark-400 text-[9px] mb-0.5">Token TX</p>
                    <p className="text-white text-xs font-semibold">
                      {gas.tokenCost < 0.0001 ? '<0.0001' : gas.tokenCost.toFixed(4)}
                    </p>
                    <p className="text-dark-500 text-[9px]">{chain.nativeCurrency.symbol}</p>
                  </div>
                  <div className="bg-dark-900/50 rounded-lg p-2 text-center">
                    <p className="text-dark-400 text-[9px] mb-0.5">Swap</p>
                    <p className="text-white text-xs font-semibold">
                      {gas.swapCost < 0.0001 ? '<0.0001' : gas.swapCost.toFixed(4)}
                    </p>
                    <p className="text-dark-500 text-[9px]">{chain.nativeCurrency.symbol}</p>
                  </div>
                </div>
              )}

              {gas?.supportsEIP1559 && (
                <div className="mt-2 flex items-center gap-1 text-dark-500 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  EIP-1559 • Priority: {gas.maxPriorityFee} Gwei
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Gas Tips */}
        <div className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/50">
          <h3 className="text-white font-semibold text-sm mb-2">💡 Tips para Ahorrar Gas</h3>
          <ul className="space-y-1 text-dark-400 text-xs">
            <li>• BSC, Polygon y Arbitrum tienen gas ultra-bajo (&lt;1 Gwei)</li>
            <li>• Las TX son más baratas en fines de semana</li>
            <li>• Usa "Económico" en gas preset para TX no urgentes</li>
            <li>• Los batch de aprobaciones ahorran hasta 40% de gas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
