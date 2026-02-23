// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Staking Hub Screen
//  Real on-chain staking: Lido, PancakeSwap, GMX, BENQI
//  MetaMask's staking is basic — ours is a full hub
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, Lock, ExternalLink, Zap, Shield, ChevronRight, Coins } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getStakingProtocols, stakeLido, getLidoAPR, getStakingPositions } from '../../services/staking';
import { getNativeBalance } from '../../services/blockchain';
import { unlockVault } from '../../services/wallet';
import PasswordConfirm from '../Common/PasswordConfirm';
import { CHAINS } from '../../constants/chains';

export default function StakingScreen() {
  const { goBack, activeChainId, showToast, getActiveAccount, addPendingTx } = useStore();
  const account = getActiveAccount();
  const [protocols, setProtocols] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [lidoAPR, setLidoAPR] = useState('3.5');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const chain = CHAINS[activeChainId];

  useEffect(() => {
    const prots = getStakingProtocols(activeChainId);
    setProtocols(prots);

    // Fetch positions
    if (account?.address) {
      getStakingPositions(account.address).then(setPositions).catch(() => {}).finally(() => setLoadingPositions(false));
    }

    // Fetch Lido APR
    getLidoAPR().then(setLidoAPR);
  }, [activeChainId, account?.address]);

  const handleSelectProtocol = async (protocol) => {
    setSelectedProtocol(protocol);
    setAmount('');
    if (protocol.asset === chain?.nativeCurrency?.symbol || protocol.asset === 'ETH' || protocol.asset === 'BNB' || protocol.asset === 'AVAX' || protocol.asset === 'MATIC') {
      try {
        const bal = await getNativeBalance(activeChainId, account.address);
        setBalance(bal);
      } catch { setBalance('0'); }
    }
  };

  const handleStake = () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Ingresa una cantidad válida', 'error');
      return;
    }
    if (parseFloat(amount) > parseFloat(balance)) {
      showToast('Balance insuficiente', 'error');
      return;
    }
    setShowPassword(true);
  };

  const handleConfirmStake = async (password) => {
    setShowPassword(false);
    setLoading(true);
    try {
      const vault = await unlockVault(password);
      const acc = [...vault.accounts, ...vault.importedAccounts].find(
        a => a.address.toLowerCase() === account.address.toLowerCase()
      );
      if (!acc?.privateKey) throw new Error('No se encontró la clave privada');

      let tx;
      if (selectedProtocol.id === 'lido-eth') {
        tx = await stakeLido(acc.privateKey, amount);
      } else {
        // For other protocols, open their website
        window.open(selectedProtocol.website, '_blank');
        setLoading(false);
        return;
      }

      addPendingTx(tx);
      showToast(`⚡ Staking de ${amount} ${selectedProtocol.asset} iniciado`, 'success');
      setAmount('');
      setSelectedProtocol(null);
    } catch (err) {
      showToast(err.message || 'Error al hacer staking', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isWatchOnly = account && !account.privateKey;

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800">
        <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <Coins className="text-kairos-400" size={20} />
          <h1 className="text-lg font-bold text-white">Staking Hub</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Your Positions */}
        {positions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-dark-300 mb-3 flex items-center gap-2">
              <Lock size={14} /> TUS POSICIONES
            </h2>
            {positions.map((pos, i) => (
              <div key={i} className="bg-dark-800/50 rounded-xl p-4 border border-dark-700 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{pos.logo}</span>
                    <div>
                      <p className="text-white font-semibold">{pos.protocol}</p>
                      <p className="text-dark-400 text-xs">{pos.reward} en {CHAINS[pos.chainId]?.shortName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{parseFloat(pos.staked).toFixed(6)}</p>
                    <p className="text-dark-400 text-xs">{pos.reward}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Protocols */}
        <div>
          <h2 className="text-sm font-semibold text-dark-300 mb-3 flex items-center gap-2">
            <TrendingUp size={14} /> PROTOCOLOS EN {chain?.shortName || 'RED'}
          </h2>

          {protocols.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="mx-auto text-dark-500 mb-3" size={40} />
              <p className="text-dark-400">No hay protocolos de staking en esta red</p>
              <p className="text-dark-500 text-sm mt-1">Cambia a Ethereum o BSC para más opciones</p>
            </div>
          ) : (
            <div className="space-y-3">
              {protocols.map((protocol) => (
                <motion.button
                  key={protocol.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectProtocol(protocol)}
                  className={`w-full bg-dark-800/50 rounded-xl p-4 border transition-all text-left ${
                    selectedProtocol?.id === protocol.id
                      ? 'border-kairos-500 bg-kairos-500/5'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{protocol.logo}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold">{protocol.name}</p>
                          {protocol.type === 'liquid' && (
                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">
                              LÍQUIDO
                            </span>
                          )}
                        </div>
                        <p className="text-dark-400 text-xs mt-0.5">{protocol.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-green-400 font-bold text-sm">
                        {protocol.id === 'lido-eth' ? `${lidoAPR}%` : protocol.aprRange}
                      </p>
                      <p className="text-dark-500 text-[10px]">APR</p>
                    </div>
                  </div>

                  {/* Expanded: Stake form */}
                  <AnimatePresence>
                    {selectedProtocol?.id === protocol.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-dark-700 space-y-3" onClick={e => e.stopPropagation()}>
                          {/* Info badges */}
                          <div className="flex gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-dark-700 rounded-lg text-dark-300 text-xs flex items-center gap-1">
                              <Shield size={10} /> Mín: {protocol.minStake} {protocol.asset}
                            </span>
                            <span className="px-2 py-1 bg-dark-700 rounded-lg text-dark-300 text-xs flex items-center gap-1">
                              <Zap size={10} /> Recibe: {protocol.reward}
                            </span>
                          </div>

                          {/* Amount input */}
                          <div className="relative">
                            <input
                              type="number"
                              value={amount}
                              onChange={e => setAmount(e.target.value)}
                              placeholder={`Cantidad de ${protocol.asset}`}
                              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-dark-400 focus:border-kairos-500 focus:outline-none"
                            />
                            <button
                              onClick={() => setAmount(balance)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-kairos-400 text-xs font-bold"
                            >
                              MAX
                            </button>
                          </div>
                          <p className="text-dark-500 text-xs">
                            Balance: {parseFloat(balance).toFixed(6)} {protocol.asset}
                          </p>

                          {/* Stake button or external link */}
                          {protocol.id === 'lido-eth' ? (
                            <button
                              onClick={handleStake}
                              disabled={loading || isWatchOnly || !amount || parseFloat(amount) <= 0}
                              className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-kairos-500 to-kairos-600 text-dark-950 hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                            >
                              {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>⏳</motion.span>
                                  Procesando...
                                </span>
                              ) : isWatchOnly ? (
                                '🔒 Cuenta de solo lectura'
                              ) : (
                                `Stake ${amount || '0'} ${protocol.asset}`
                              )}
                            </button>
                          ) : (
                            <a
                              href={protocol.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-dark-700 text-white hover:bg-dark-600 flex items-center justify-center gap-2"
                            >
                              <ExternalLink size={14} /> Abrir en {protocol.name}
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* All Chains Overview */}
        <div>
          <h2 className="text-sm font-semibold text-dark-300 mb-3">⚡ TODAS LAS OPORTUNIDADES</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { chain: 'ETH', name: 'Lido', apr: `${lidoAPR}%`, logo: '🔵' },
              { chain: 'BSC', name: 'PancakeSwap', apr: '5-15%', logo: '🥞' },
              { chain: 'ARB', name: 'GMX', apr: '8-20%', logo: '🟢' },
              { chain: 'AVAX', name: 'BENQI', apr: '5-7%', logo: '❄️' },
            ].map((item, i) => (
              <div key={i} className="bg-dark-800/30 rounded-lg p-3 border border-dark-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <span>{item.logo}</span>
                  <span className="text-white text-xs font-semibold">{item.name}</span>
                </div>
                <p className="text-green-400 text-xs font-bold">{item.apr} APR</p>
                <p className="text-dark-500 text-[10px]">{item.chain}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Password Confirm */}
      {showPassword && (
        <PasswordConfirm
          title="Confirmar Staking"
          message={`Stake ${amount} ${selectedProtocol?.asset} en ${selectedProtocol?.name}`}
          onConfirm={handleConfirmStake}
          onCancel={() => setShowPassword(false)}
        />
      )}
    </div>
  );
}
