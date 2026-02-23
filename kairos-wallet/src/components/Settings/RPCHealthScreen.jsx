// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — RPC Health Monitor
//  Visual RPC status with latency + block height
//  MetaMask doesn't show you this level of detail
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Activity, Wifi, WifiOff, RefreshCw, Server,
  Clock, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS, CHAIN_ORDER } from '../../constants/chains';
import { ethers } from 'ethers';

async function checkRPC(url, chainId) {
  const start = performance.now();
  try {
    const provider = new ethers.JsonRpcProvider(url, chainId, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000)),
    ]);
    const latency = Math.round(performance.now() - start);
    return { url, status: 'ok', latency, blockNumber, error: null };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return { url, status: 'error', latency, blockNumber: 0, error: err.message || 'Timeout' };
  }
}

export default function RPCHealthScreen() {
  const { goBack } = useStore();
  const [results, setResults] = useState({});
  const [isChecking, setIsChecking] = useState(false);
  const [expandedChain, setExpandedChain] = useState(null);

  const runCheck = async () => {
    setIsChecking(true);
    const allResults = {};

    for (const chainId of CHAIN_ORDER) {
      const chain = CHAINS[chainId];
      const rpcs = chain.rpcUrls || [chain.rpcUrl];
      const checks = await Promise.all(rpcs.map(url => checkRPC(url, chainId)));
      allResults[chainId] = checks;
    }

    setResults(allResults);
    setIsChecking(false);
  };

  useEffect(() => { runCheck(); }, []);

  const getChainHealth = (chainId) => {
    const checks = results[chainId];
    if (!checks) return 'unknown';
    const ok = checks.filter(c => c.status === 'ok');
    if (ok.length === checks.length) return 'healthy';
    if (ok.length > 0) return 'degraded';
    return 'down';
  };

  const getAvgLatency = (chainId) => {
    const checks = results[chainId]?.filter(c => c.status === 'ok');
    if (!checks?.length) return 0;
    return Math.round(checks.reduce((s, c) => s + c.latency, 0) / checks.length);
  };

  return (
    <div className="screen-container">
      <div className="flex items-center gap-3 p-4 border-b border-dark-800">
        <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <Activity className="text-kairos-400" size={20} />
          <h1 className="text-lg font-bold text-white">RPC Health</h1>
        </div>
        <button
          onClick={runCheck}
          disabled={isChecking}
          className="ml-auto text-dark-400 hover:text-white"
        >
          <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isChecking && Object.keys(results).length === 0 && (
          <div className="text-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <Activity className="mx-auto text-kairos-400" size={32} />
            </motion.div>
            <p className="text-dark-400 text-sm mt-3">Verificando RPCs...</p>
          </div>
        )}

        {CHAIN_ORDER.map(chainId => {
          const chain = CHAINS[chainId];
          const health = getChainHealth(chainId);
          const avgLatency = getAvgLatency(chainId);
          const checks = results[chainId] || [];
          const expanded = expandedChain === chainId;

          return (
            <motion.div
              key={chainId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={() => setExpandedChain(expanded ? null : chainId)}
                className="w-full bg-dark-800/50 rounded-xl p-3 border border-dark-700/50 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg`}
                    style={{ backgroundColor: chain.color + '15' }}
                  >
                    {chain.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-semibold">{chain.shortName}</p>
                      {health === 'healthy' && <CheckCircle size={12} className="text-green-400" />}
                      {health === 'degraded' && <AlertTriangle size={12} className="text-amber-400" />}
                      {health === 'down' && <WifiOff size={12} className="text-red-400" />}
                    </div>
                    <p className="text-dark-500 text-xs">
                      {checks.length} RPCs · {checks.filter(c => c.status === 'ok').length} activos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      avgLatency < 500 ? 'text-green-400' : avgLatency < 1500 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {avgLatency > 0 ? `${avgLatency}ms` : '—'}
                    </p>
                    <p className="text-dark-500 text-[10px]">latencia</p>
                  </div>
                </div>
              </button>

              {expanded && checks.length > 0 && (
                <div className="ml-4 mt-1 space-y-1">
                  {checks.map((rpc, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${
                        rpc.status === 'ok'
                          ? 'bg-green-500/5 border-green-500/10'
                          : 'bg-red-500/5 border-red-500/10'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${rpc.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-dark-300 font-mono truncate flex-1" title={rpc.url}>
                        {rpc.url.replace('https://', '').slice(0, 35)}...
                      </span>
                      <span className={`font-bold ${rpc.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                        {rpc.status === 'ok' ? `${rpc.latency}ms` : 'FAIL'}
                      </span>
                      {rpc.blockNumber > 0 && (
                        <span className="text-dark-500">#{rpc.blockNumber.toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        <div className="bg-dark-800/30 rounded-xl p-3 border border-dark-700/30 mt-4">
          <p className="text-dark-500 text-xs text-center">
            💡 FallbackProvider cambia automáticamente al siguiente RPC si uno falla.
            Verde = &lt;500ms · Amarillo = &lt;1500ms · Rojo = lento o caído.
          </p>
        </div>
      </div>
    </div>
  );
}
