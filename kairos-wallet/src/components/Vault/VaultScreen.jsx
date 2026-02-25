// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Yield Vault Screen
//  Deposit tokens to earn yield via Aave, Venus, Kairos
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, Wallet, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw, Shield, Zap, ChevronRight, X, AlertTriangle, Loader2,
  Percent, DollarSign, Clock, CheckCircle, Info
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';
import {
  getVaultTokens, getAllAPYs, getTokenBalance,
  getVaultPosition, getAllPositions, deposit, withdraw, estimateGas,
} from '../../services/vault';
import { unlockVault, formatAddress } from '../../services/wallet';

export default function VaultScreen() {
  const { activeAddress, activeChainId, goBack, showToast } = useStore();
  const chain = CHAINS[activeChainId];

  const [tab, setTab] = useState('deposit');      // 'deposit' | 'positions'
  const [tokens, setTokens] = useState([]);
  const [apys, setApys] = useState({});
  const [positions, setPositions] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Deposit/Withdraw modal
  const [selectedToken, setSelectedToken] = useState(null);
  const [modalAction, setModalAction] = useState('deposit'); // 'deposit' | 'withdraw'
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [gas, setGas] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [txSuccess, setTxSuccess] = useState('');

  // Total value
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  const loadData = useCallback(async () => {
    const vaultTokens = getVaultTokens(activeChainId);
    setTokens(vaultTokens);

    try {
      const [apyData, posData] = await Promise.all([
        getAllAPYs(activeChainId),
        getAllPositions(activeChainId, activeAddress),
      ]);
      setApys(apyData);
      setPositions(posData);

      // Calculate totals
      const prices = { USDT: 1, USDC: 1, DAI: 1, ETH: 2800, WETH: 2800, BTC: 95000, BTCB: 95000, WBTC: 95000, BNB: 650, POL: 0.45, ARB: 1.10, WAVAX: 35, KAIROS: 1 };
      let dep = 0, earn = 0;
      posData.forEach(p => {
        const price = prices[p.symbol] || 0;
        dep += p.deposited * price;
        earn += p.earned * price;
      });
      setTotalDeposited(dep);
      setTotalEarned(earn);

      // Load balances for all tokens
      const balPromises = vaultTokens.map(async t => {
        try {
          const bal = await getTokenBalance(activeChainId, activeAddress, t);
          return [t.symbol, bal];
        } catch { return [t.symbol, '0']; }
      });
      const bals = await Promise.all(balPromises);
      const balMap = {};
      bals.forEach(([sym, bal]) => { balMap[sym] = bal; });
      setBalances(balMap);
    } catch (err) {
      console.error('Vault load error:', err);
    }

    setLoading(false);
    setRefreshing(false);
  }, [activeChainId, activeAddress]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openModal = async (token, action) => {
    setSelectedToken(token);
    setModalAction(action);
    setAmount('');
    setPassword('');
    setTxError('');
    setTxSuccess('');
    setGas(null);

    try {
      const gasData = await estimateGas(activeChainId, token, action);
      setGas(gasData);
    } catch { /* ignore */ }
  };

  const closeModal = () => {
    setSelectedToken(null);
    setAmount('');
    setPassword('');
    setTxError('');
    setTxSuccess('');
  };

  const handleMaxAmount = () => {
    if (modalAction === 'deposit') {
      setAmount(balances[selectedToken?.symbol] || '0');
    } else {
      const pos = positions.find(p => p.symbol === selectedToken?.symbol);
      setAmount(pos ? pos.deposited.toString() : '0');
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setTxError('Ingresa un monto válido');
      return;
    }
    if (!password) {
      setTxError('Ingresa tu contraseña');
      return;
    }

    setTxLoading(true);
    setTxError('');
    setTxSuccess('');

    try {
      // Unlock vault to get private key
      const vault = await unlockVault(password);
      const allAccounts = [...(vault.accounts || []), ...(vault.importedAccounts || [])];
      const account = allAccounts.find(a => a.address.toLowerCase() === activeAddress.toLowerCase());
      if (!account) throw new Error('Cuenta no encontrada');

      let result;
      if (modalAction === 'deposit') {
        result = await deposit(activeChainId, account.privateKey, selectedToken, amount);
      } else {
        result = await withdraw(activeChainId, account.privateKey, selectedToken, amount);
      }

      setTxSuccess(
        modalAction === 'deposit'
          ? `✅ ${amount} ${selectedToken.symbol} depositados en ${result.protocol}`
          : `✅ ${amount} ${selectedToken.symbol} retirados de ${result.protocol}`
      );
      showToast(txSuccess || 'Transacción exitosa', 'success');

      // Refresh data
      setTimeout(() => {
        loadData();
        closeModal();
      }, 2000);
    } catch (err) {
      setTxError(err.message || 'Error en la transacción');
    }
    setTxLoading(false);
  };

  const formatUSD = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(2)}K`;
    return `$${val.toFixed(2)}`;
  };

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Yield Vault</h2>
          <p className="text-dark-400 text-xs">{chain?.icon} {chain?.shortName} · Gana intereses on-chain</p>
        </div>
        <button
          onClick={handleRefresh}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"
        >
          <RefreshCw size={16} className={`text-dark-300 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign size={14} className="text-kairos-400" />
            <span className="text-dark-400 text-xs">Depositado</span>
          </div>
          <p className="text-lg font-bold text-white">{formatUSD(totalDeposited)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-dark-400 text-xs">Ganancias</span>
          </div>
          <p className="text-lg font-bold text-green-400">+{formatUSD(totalEarned)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-4">
        {[
          { key: 'deposit', label: 'Depositar', icon: ArrowDownToLine },
          { key: 'positions', label: 'Mis Posiciones', icon: Wallet },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.key ? 'bg-kairos-500/15 text-kairos-400' : 'text-dark-400 hover:text-white'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5" />
                  <div className="flex-1">
                    <div className="h-4 w-20 bg-white/5 rounded mb-1" />
                    <div className="h-3 w-28 bg-white/5 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'deposit' ? (
          /* ── Deposit Tab: List all available vault tokens ── */
          <div className="space-y-2">
            {tokens.length === 0 ? (
              <div className="text-center py-12">
                <Shield size={32} className="text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400 text-sm">No hay vaults disponibles en esta red</p>
              </div>
            ) : tokens.map(token => {
              const apy = apys[token.symbol];
              const balance = balances[token.symbol] || '0';
              const hasBalance = parseFloat(balance) > 0.0001;

              return (
                <motion.button
                  key={token.symbol}
                  onClick={() => hasBalance ? openModal(token, 'deposit') : null}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full glass-card p-4 flex items-center gap-3 text-left transition-all ${
                    hasBalance ? 'hover:bg-white/[0.06] cursor-pointer' : 'opacity-50'
                  }`}
                >
                  {/* Token Icon */}
                  <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-xl">
                    {token.icon}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{token.symbol}</span>
                      {apy && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          apy.apy >= 3 ? 'bg-green-500/15 text-green-400' :
                          apy.apy >= 1 ? 'bg-yellow-500/15 text-yellow-400' :
                          'bg-dark-700 text-dark-300'
                        }`}>
                          {apy.apy.toFixed(1)}% APY
                        </span>
                      )}
                    </div>
                    <p className="text-dark-400 text-xs">
                      {apy?.protocol || token.protocol} · Bal: {parseFloat(balance).toFixed(4)}
                    </p>
                  </div>

                  {/* Action */}
                  {hasBalance && (
                    <div className="flex items-center gap-1 text-kairos-400">
                      <Zap size={14} />
                      <span className="text-xs font-medium">Depositar</span>
                    </div>
                  )}
                </motion.button>
              );
            })}

            {/* Info */}
            <div className="glass-card p-3 mt-4 flex items-start gap-2">
              <Info size={14} className="text-dark-400 mt-0.5 flex-shrink-0" />
              <p className="text-dark-400 text-[11px]">
                Los fondos se depositan directamente en protocolos DeFi auditados (Aave V3, Venus). 
                KAIROS genera yield del 5% APY desde el treasury de Kairos 777.
                Los intereses se acumulan en tiempo real.
              </p>
            </div>
          </div>
        ) : (
          /* ── Positions Tab: Show user's active vault positions ── */
          <div className="space-y-2">
            {positions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet size={32} className="text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400 text-sm">No tienes posiciones activas</p>
                <p className="text-dark-500 text-xs mt-1">Deposita tokens para empezar a ganar</p>
                <button
                  onClick={() => setTab('deposit')}
                  className="kairos-button mt-4 px-6 py-2.5 text-sm"
                >
                  Ver Vaults
                </button>
              </div>
            ) : positions.map(pos => (
              <motion.div
                key={pos.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">
                    {pos.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{pos.symbol}</span>
                      <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full font-bold">
                        {(apys[pos.symbol]?.apy || 0).toFixed(1)}% APY
                      </span>
                    </div>
                    <p className="text-dark-400 text-xs">{pos.protocol}</p>
                  </div>
                </div>

                {/* Position Details */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white/[0.03] rounded-lg p-2.5">
                    <p className="text-dark-400 text-[10px] mb-0.5">Depositado</p>
                    <p className="text-white text-sm font-semibold">
                      {pos.deposited.toFixed(4)} <span className="text-dark-400 text-xs">{pos.symbol}</span>
                    </p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-2.5">
                    <p className="text-dark-400 text-[10px] mb-0.5">Ganado</p>
                    <p className="text-green-400 text-sm font-semibold">
                      +{pos.earned.toFixed(6)} <span className="text-dark-400 text-xs">{pos.symbol}</span>
                    </p>
                  </div>
                </div>

                {/* Withdraw Button */}
                <button
                  onClick={() => openModal(pos, 'withdraw')}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowUpFromLine size={14} />
                  Retirar
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Deposit/Withdraw Modal ── */}
      <AnimatePresence>
        {selectedToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg glass-card-strong rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">
                    {selectedToken.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">
                      {modalAction === 'deposit' ? 'Depositar' : 'Retirar'} {selectedToken.symbol}
                    </h3>
                    <p className="text-dark-400 text-xs">
                      {apys[selectedToken.symbol]?.protocol || selectedToken.protocol} · {(apys[selectedToken.symbol]?.apy || 0).toFixed(1)}% APY
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              {txSuccess ? (
                /* Success State */
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-400" />
                  </div>
                  <p className="text-green-400 text-sm font-medium">{txSuccess}</p>
                </div>
              ) : (
                <>
                  {/* Amount Input */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-dark-400 text-xs">Monto</label>
                      <button
                        onClick={handleMaxAmount}
                        className="text-kairos-400 text-xs font-medium hover:underline"
                      >
                        MAX: {modalAction === 'deposit'
                          ? parseFloat(balances[selectedToken.symbol] || 0).toFixed(4)
                          : (positions.find(p => p.symbol === selectedToken.symbol)?.deposited || 0).toFixed(4)
                        }
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setTxError(''); }}
                        placeholder="0.00"
                        className="glass-input text-lg font-semibold pr-16"
                        style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                        autoFocus
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 text-sm font-medium">
                        {selectedToken.symbol}
                      </span>
                    </div>
                  </div>

                  {/* Gas Estimate */}
                  {gas && (
                    <div className="flex items-center justify-between text-xs text-dark-400 mb-3 px-1">
                      <span className="flex items-center gap-1"><Zap size={12} /> Gas estimado</span>
                      <span>{parseFloat(gas.gasCostFormatted).toFixed(5)} {chain?.nativeCurrency?.symbol}</span>
                    </div>
                  )}

                  {/* Yield Preview for deposits */}
                  {modalAction === 'deposit' && amount && parseFloat(amount) > 0 && (
                    <div className="glass-card p-3 mb-4 space-y-1.5">
                      <p className="text-dark-400 text-[10px] uppercase tracking-wider">Proyección de ganancias</p>
                      {[
                        { label: 'Diario', mult: 1/365 },
                        { label: 'Mensual', mult: 1/12 },
                        { label: 'Anual', mult: 1 },
                      ].map(period => {
                        const apy = apys[selectedToken.symbol]?.apy || 0;
                        const earned = parseFloat(amount) * (apy / 100) * period.mult;
                        return (
                          <div key={period.label} className="flex items-center justify-between">
                            <span className="text-dark-300 text-xs">{period.label}</span>
                            <span className="text-green-400 text-xs font-medium">
                              +{earned.toFixed(6)} {selectedToken.symbol}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Password */}
                  <div className="mb-4">
                    <label className="text-dark-400 text-xs mb-2 block">Contraseña de la wallet</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setTxError(''); }}
                      placeholder="Ingresa tu contraseña"
                      className="glass-input text-sm"
                      style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                    />
                  </div>

                  {/* Error */}
                  {txError && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-red-400 text-xs">{txError}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={txLoading || !amount || !password}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                      modalAction === 'deposit'
                        ? 'kairos-button'
                        : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                    }`}
                  >
                    {txLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Procesando...</>
                    ) : modalAction === 'deposit' ? (
                      <><ArrowDownToLine size={16} /> Depositar {selectedToken.symbol}</>
                    ) : (
                      <><ArrowUpFromLine size={16} /> Retirar {selectedToken.symbol}</>
                    )}
                  </button>

                  {/* Security Note */}
                  <div className="flex items-start gap-2 mt-4 px-1">
                    <Shield size={12} className="text-dark-500 mt-0.5 flex-shrink-0" />
                    <p className="text-dark-500 text-[10px]">
                      {selectedToken.protocol === 'kairos'
                        ? 'KAIROS Vault genera yield desde el treasury de Kairos 777 Inc. Retiros sin penalty.'
                        : `Tus fondos serán depositados directamente en ${apys[selectedToken.symbol]?.protocol || 'el protocolo'}. Tú mantienes la custodia.`
                      }
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
