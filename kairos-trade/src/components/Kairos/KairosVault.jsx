// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Vault / Earn Component
//  Liquidity Provider interface: deposit KAIROS, earn yield from trading fees
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark, TrendingUp, DollarSign, Users, ArrowUpRight, ArrowDownRight,
  Wallet, Shield, Clock, Award, Lock, Unlock, ChevronDown, ChevronUp,
  RefreshCw, Info, Zap, PieChart, History, Star
} from 'lucide-react';
import useStore from '../../store/useStore';
import { API_HOST } from '../../constants';

const API_BASE = `${API_HOST}/api/vault`;

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

export default function KairosVault() {
  const { user, showToast } = useStore();
  const walletAddress = user?.walletAddress || '';
  const isConnected = !!walletAddress;

  // ── State ──
  const [vaultInfo, setVaultInfo] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [epochs, setEpochs] = useState([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('deposit'); // deposit, withdraw, history
  const [showInfo, setShowInfo] = useState(false);

  // ── Fetch vault info ──
  const fetchVaultInfo = useCallback(async () => {
    try {
      const data = await api('/info');
      setVaultInfo(data);
    } catch (err) { console.error('Vault info error:', err); }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const data = await api(`/account?wallet=${walletAddress}`);
      setUserInfo(data);
    } catch (err) { console.error('User vault error:', err); }
  }, [walletAddress]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await api('/leaderboard?limit=10');
      setLeaderboard(data);
    } catch (err) { console.error('Leaderboard error:', err); }
  }, []);

  const fetchEpochs = useCallback(async () => {
    try {
      const data = await api('/epochs?limit=20');
      setEpochs(data);
    } catch (err) { console.error('Epochs error:', err); }
  }, []);

  useEffect(() => {
    fetchVaultInfo();
    fetchLeaderboard();
    fetchEpochs();
    if (walletAddress) fetchUserInfo();

    const interval = setInterval(() => {
      fetchVaultInfo();
      if (walletAddress) fetchUserInfo();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchVaultInfo, fetchUserInfo, fetchLeaderboard, fetchEpochs, walletAddress]);

  // ── Deposit ──
  const handleDeposit = useCallback(async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) { showToast('Ingresa una cantidad válida', 'error'); return; }
    setLoading(true);
    try {
      const result = await api('/deposit', {
        method: 'POST',
        body: JSON.stringify({ wallet: walletAddress, amount }),
      });
      showToast(`Depositado: ${amount} KAIROS → ${result.sharesReceived.toFixed(4)} kKAIROS`, 'success');
      setDepositAmount('');
      fetchVaultInfo();
      fetchUserInfo();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  }, [depositAmount, walletAddress, showToast, fetchVaultInfo, fetchUserInfo]);

  // ── Withdraw ──
  const handleWithdraw = useCallback(async () => {
    const shares = parseFloat(withdrawShares);
    if (!shares || shares <= 0) { showToast('Ingresa la cantidad de shares', 'error'); return; }
    setLoading(true);
    try {
      const result = await api('/withdraw', {
        method: 'POST',
        body: JSON.stringify({ wallet: walletAddress, shares }),
      });
      showToast(`Retirado: ${result.kairosReturned.toFixed(4)} KAIROS (Ganancia: +${result.earned.toFixed(4)})`, 'success');
      setWithdrawShares('');
      fetchVaultInfo();
      fetchUserInfo();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  }, [withdrawShares, walletAddress, showToast, fetchVaultInfo, fetchUserInfo]);

  const formatK = (n) => {
    if (!n || n === 0) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toFixed(2);
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-blue-900/30 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/kairos-logo.png" alt="Kairos" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Kairos Vault
                <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap size={10} /> EARN
                </span>
              </h1>
              <p className="text-sm text-emerald-300">Provee liquidez y gana yield de trading fees</p>
            </div>
          </div>

          {isConnected && (
            <div className="flex items-center gap-2">
              <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Global Vault Stats ── */}
      {vaultInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="TVL (Total Value Locked)" value={`$${formatK(vaultInfo.tvl)}`} color="emerald" />
          <StatCard icon={TrendingUp} label="APY Estimado" value={`${vaultInfo.apy.toFixed(2)}%`} color="blue" />
          <StatCard icon={Users} label="Liquidity Providers" value={vaultInfo.totalProviders.toString()} color="purple" />
          <StatCard icon={Award} label="Precio kKAIROS" value={`$${vaultInfo.pricePerShare.toFixed(6)}`} color="amber" />
        </div>
      )}

      {/* ── How It Works ── */}
      <button onClick={() => setShowInfo(!showInfo)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white/60 hover:text-white/80 transition-colors">
        <span className="flex items-center gap-2"><Info size={14} /> ¿Cómo funciona el Vault?</span>
        {showInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StepCard step="1" title="Deposita KAIROS" desc="Deposita KAIROS en el Vault y recibe tokens kKAIROS que representan tu participación." />
              <StepCard step="2" title="Traders pagan fees" desc="Cada trade con apalancamiento genera fees. 70% fluye al vault, aumentando el valor de tu kKAIROS." />
              <StepCard step="3" title="Retira con yield" desc="Cuando retiras, tu kKAIROS vale más que cuando depositaste. La diferencia es tu ganancia." />
            </div>
            {vaultInfo && (
              <div className="flex gap-6 justify-center mt-3 pt-3 border-t border-zinc-800">
                <div className="text-center">
                  <p className="text-xs text-white/30">LP Reward</p>
                  <p className="text-sm font-bold text-emerald-400">{vaultInfo.feeSplit.vault}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/30">Treasury</p>
                  <p className="text-sm font-bold text-blue-400">{vaultInfo.feeSplit.treasury}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/30">Insurance</p>
                  <p className="text-sm font-bold text-amber-400">{vaultInfo.feeSplit.insurance}%</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      {isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* LEFT: User Position */}
          <div className="space-y-4">
            {/* My Position */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
                <Wallet size={14} /> Tu Posición
              </h3>
              {userInfo ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">kKAIROS Balance</span>
                    <span className="text-sm font-bold text-white">{userInfo.shares.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">Valor Actual</span>
                    <span className="text-sm font-bold text-emerald-400">${userInfo.currentValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">Total Depositado</span>
                    <span className="text-sm text-white/60">${userInfo.totalDeposited.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">Ganancia No Realizada</span>
                    <span className={`text-sm font-bold ${userInfo.unrealizedProfit > 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                      +${userInfo.unrealizedProfit.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">Total Ganado</span>
                    <span className="text-sm font-bold text-emerald-400">${userInfo.totalEarned.toFixed(4)}</span>
                  </div>
                  {userInfo.cooldownRemaining > 0 && (
                    <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-amber-900/20 border border-amber-500/20">
                      <Clock size={12} className="text-amber-400" />
                      <span className="text-xs text-amber-400">
                        Cooldown: {Math.ceil(userInfo.cooldownRemaining / 60)}min restantes
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-white/30">No tienes posición en el vault aún</p>
              )}
            </div>

            {/* Vault Stats Detail */}
            {vaultInfo && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
                  <PieChart size={14} /> Vault Stats
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-xs text-white/40">Total Fees Distribuidos</span><span className="text-xs text-emerald-400">${formatK(vaultInfo.totalFeesDistributed)}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-white/40">Fees al Treasury</span><span className="text-xs text-blue-400">${formatK(vaultInfo.totalTreasuryFees)}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-white/40">Fees al Insurance Fund</span><span className="text-xs text-amber-400">${formatK(vaultInfo.totalInsuranceFees)}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-white/40">Épocas</span><span className="text-xs text-white/60">{vaultInfo.currentEpoch}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-white/40">Capacidad Máx</span><span className="text-xs text-white/60">{formatK(vaultInfo.maxCapacity)}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-white/40">Depósito Mín</span><span className="text-xs text-white/60">{vaultInfo.minDeposit} KAIROS</span></div>
                </div>
              </div>
            )}
          </div>

          {/* CENTER: Deposit/Withdraw */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              {/* Tab Toggle */}
              <div className="flex gap-1 mb-4 p-1 rounded-lg bg-zinc-800">
                {['deposit', 'withdraw'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === tab
                      ? tab === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                      : 'text-white/40 hover:text-white/60'}`}>
                    {tab === 'deposit' ? '📥 Depositar' : '📤 Retirar'}
                  </button>
                ))}
              </div>

              {activeTab === 'deposit' ? (
                <div className="space-y-3">
                  <label className="text-xs text-white/40 block">Cantidad de KAIROS a depositar</label>
                  <div className="relative">
                    <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                      placeholder="100" min="1" step="0.01"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-emerald-500 outline-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">KAIROS</span>
                  </div>
                  {vaultInfo && depositAmount && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Recibirás aprox.</span>
                        <span className="text-emerald-400 font-mono">{(parseFloat(depositAmount) / (vaultInfo.pricePerShare || 1)).toFixed(4)} kKAIROS</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Precio por share</span>
                        <span className="text-white/60 font-mono">${vaultInfo.pricePerShare.toFixed(6)}</span>
                      </div>
                    </div>
                  )}
                  <button onClick={handleDeposit} disabled={loading || !depositAmount}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <><Lock size={14} /> Depositar en Vault</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs text-white/40 block">Cantidad de kKAIROS shares a retirar</label>
                  <div className="relative">
                    <input type="number" value={withdrawShares} onChange={e => setWithdrawShares(e.target.value)}
                      placeholder={userInfo ? userInfo.shares.toFixed(4) : '0'}
                      min="0.0001" step="0.0001"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">kKAIROS</span>
                  </div>
                  {userInfo && (
                    <button onClick={() => setWithdrawShares(userInfo.shares.toFixed(6))}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      Max: {userInfo.shares.toFixed(4)} kKAIROS
                    </button>
                  )}
                  {vaultInfo && withdrawShares && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Recibirás aprox.</span>
                        <span className="text-blue-400 font-mono">{(parseFloat(withdrawShares) * (vaultInfo.pricePerShare || 1)).toFixed(4)} KAIROS</span>
                      </div>
                    </div>
                  )}
                  <button onClick={handleWithdraw} disabled={loading || !withdrawShares}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <><Unlock size={14} /> Retirar del Vault</>}
                  </button>
                </div>
              )}
            </div>

            {/* Transaction History */}
            {userInfo?.transactions?.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
                  <History size={14} /> Historial
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {userInfo.transactions.slice(0, 10).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                      <div className="flex items-center gap-2">
                        {tx.type === 'DEPOSIT' ? (
                          <ArrowDownRight size={12} className="text-emerald-400" />
                        ) : (
                          <ArrowUpRight size={12} className="text-blue-400" />
                        )}
                        <span className="text-xs text-white/60">{tx.type}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-white">{tx.kairos_amount.toFixed(2)} KAIROS</p>
                        <p className="text-[10px] text-white/30">{new Date(tx.created_at + 'Z').toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Leaderboard + Epochs */}
          <div className="space-y-4">
            {/* Leaderboard */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
                <Star size={14} /> Top Liquidity Providers
              </h3>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.slice(0, 8).map((lp, i) => (
                    <div key={lp.wallet_address} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                          ${i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-zinc-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-white/40'}`}>
                          {i + 1}
                        </span>
                        <span className="text-xs text-white/50 font-mono">
                          {lp.wallet_address.slice(0, 6)}...{lp.wallet_address.slice(-4)}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">${formatK(lp.currentValue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30 text-center py-4">Sé el primer LP</p>
              )}
            </div>

            {/* Recent Epochs */}
            {epochs.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
                  <Zap size={14} /> Distribuciones Recientes
                </h3>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {epochs.slice(0, 10).map(ep => (
                    <div key={ep.epoch} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                      <div>
                        <span className="text-xs text-white/50">Época #{ep.epoch}</span>
                        <p className="text-[10px] text-white/25">{new Date(ep.created_at + 'Z').toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-400">+{ep.vault_share.toFixed(4)}</p>
                        <p className="text-[10px] text-white/30">PPS: ${ep.price_per_share.toFixed(6)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Not connected — guide to Wallet page */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Wallet Requerida</h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto mb-5">
            Necesitas tu Kairos Wallet activa para depositar en el Vault y ganar yield de trading fees.
          </p>
          <button
            onClick={() => useStore.getState().setPage('wallet')}
            className="px-6 py-3 rounded-xl text-sm font-bold text-black transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8972E)' }}
          >
            <span className="flex items-center gap-2"><Wallet size={16} /> Ir a Mi Wallet</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reusable Components ──

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    emerald: 'from-emerald-900/30 to-emerald-800/10 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-900/30 to-blue-800/10 border-blue-500/20 text-blue-400',
    purple: 'from-purple-900/30 to-purple-800/10 border-purple-500/20 text-purple-400',
    amber: 'from-amber-900/30 to-amber-800/10 border-amber-500/20 text-amber-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={colors[color].split(' ').pop()} />
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function StepCard({ step, title, desc }) {
  return (
    <div className="text-center p-3">
      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center mx-auto mb-2">{step}</div>
      <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
      <p className="text-xs text-white/40">{desc}</p>
    </div>
  );
}
