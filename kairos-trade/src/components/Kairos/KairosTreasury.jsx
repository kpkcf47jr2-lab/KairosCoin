// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Treasury Dashboard (Admin Panel)
//  Shows Kairos 777 Inc trading fee revenue in real time
//  Endpoint: GET /api/perps/treasury
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Landmark, DollarSign, TrendingUp, BarChart3, Clock,
  RefreshCw, ArrowUpRight, Percent, Users, Activity,
  Zap, Shield, AlertTriangle
} from 'lucide-react';
import useStore from '../../store/useStore';
import { isAdmin, ADMIN_CONFIG } from '../../constants';
import { feeService } from '../../services/feeService';

const API_HOST = 'https://kairos-api-u6k5.onrender.com';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, d = 2) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK = (n) => {
  if (!n) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export default function KairosTreasury() {
  const { showToast, user, setPage } = useStore();
  const [treasury, setTreasury] = useState(null);
  const [stats, setStats] = useState(null);
  const [platformFees, setPlatformFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    if (!isAdmin(user)) return;
    try {
      const [treasuryRes, statsRes] = await Promise.all([
        fetch(`${API_HOST}/api/perps/treasury`).then(r => r.json()),
        fetch(`${API_HOST}/api/perps/stats`).then(r => r.json()),
      ]);
      if (treasuryRes.success) setTreasury(treasuryRes.data);
      if (statsRes.success) setStats(statsRes.data);
      // Platform trading bot fees (local feeService)
      setPlatformFees(feeService.getStats());
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Treasury fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Admin Guard ──
  if (!isAdmin(user)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8">
          <Shield size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-zinc-400 mb-4">Solo administradores de {ADMIN_CONFIG.companyName} pueden acceder al Treasury.</p>
          <button onClick={() => setPage('dashboard')} className="px-4 py-2 bg-blue-600 rounded-lg text-white text-sm hover:bg-blue-500 transition">
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[var(--gold)] animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Cargando Treasury...</p>
        </div>
      </div>
    );
  }

  const breakdown = treasury?.breakdown || {};
  const openFees = breakdown.open_fee || { total: 0, count: 0 };
  const closeFees = breakdown.close_fee || { total: 0, count: 0 };
  const liqFees = breakdown.liquidation_fee || { total: 0, count: 0 };
  const totalRevenue = treasury?.totalRevenue || 0;
  const todayRevenue = treasury?.todayRevenue || 0;
  const feeRates = treasury?.feeRates || {};

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/30 flex items-center justify-center">
            <Landmark size={22} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Kairos 777 Treasury</h1>
            <p className="text-xs text-zinc-500">Ingresos por comisiones de trading</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[10px] text-zinc-600">
              Actualizado {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchData} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
            <RefreshCw size={14} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Main Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-400/80 uppercase tracking-wider">Revenue Total</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">{fmt(totalRevenue)} <span className="text-base text-amber-400">KAIROS</span></p>
          <p className="text-xs text-zinc-500 mt-1">≈ ${fmt(totalRevenue)} USD (1:1 peg)</p>
        </motion.div>

        {/* Today Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-green-400" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Revenue Hoy</span>
          </div>
          <p className="text-3xl font-bold text-green-400 font-mono">{fmt(todayRevenue)} <span className="text-base text-green-400/60">KAIROS</span></p>
          <p className="text-xs text-zinc-500 mt-1">Acumulado desde 00:00 UTC</p>
        </motion.div>

        {/* Volume & Trades */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-blue-400" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Actividad</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{fmtK(stats?.volume || 0)}</p>
          <p className="text-xs text-zinc-500">Volumen total • {stats?.positionsOpened || 0} trades</p>
        </motion.div>
      </div>

      {/* Fee Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Open Fees */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ArrowUpRight size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Open Fees</p>
                <p className="text-[10px] text-zinc-600">{feeRates.openFee} por posición</p>
              </div>
            </div>
          </div>
          <p className="text-xl font-bold text-blue-400 font-mono">{fmt(openFees.total)}</p>
          <p className="text-xs text-zinc-500 mt-1">{openFees.count} cobros</p>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (openFees.total / totalRevenue * 100) : 0}%` }} />
          </div>
        </div>

        {/* Close Fees */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Close Fees</p>
                <p className="text-[10px] text-zinc-600">{feeRates.closeFee} por cierre</p>
              </div>
            </div>
          </div>
          <p className="text-xl font-bold text-purple-400 font-mono">{fmt(closeFees.total)}</p>
          <p className="text-xs text-zinc-500 mt-1">{closeFees.count} cobros</p>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (closeFees.total / totalRevenue * 100) : 0}%` }} />
          </div>
        </div>

        {/* Liquidation Fees */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Liquidation Fees</p>
                <p className="text-[10px] text-zinc-600">{feeRates.liquidationFee} penalización</p>
              </div>
            </div>
          </div>
          <p className="text-xl font-bold text-red-400 font-mono">{fmt(liqFees.total)}</p>
          <p className="text-xs text-zinc-500 mt-1">{liqFees.count} liquidaciones</p>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (liqFees.total / totalRevenue * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Protocol Stats */}
      {stats && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity size={14} className="text-[var(--gold)]" />
            Estadísticas del Protocolo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Open Interest Long</p>
              <p className="text-sm font-bold text-green-400 font-mono">{fmtK(stats.openInterestLong)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Open Interest Short</p>
              <p className="text-sm font-bold text-red-400 font-mono">{fmtK(stats.openInterestShort)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Cuentas Activas</p>
              <p className="text-sm font-bold text-white font-mono">{stats.totalAccounts || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Liquidaciones</p>
              <p className="text-sm font-bold text-orange-400 font-mono">{stats.liquidations || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Fees Table */}
      {treasury?.recentFees?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={14} className="text-zinc-400" />
            Últimas Comisiones Cobradas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-600 border-b border-zinc-800">
                  <th className="text-left py-2 px-2 font-medium">Fecha</th>
                  <th className="text-left py-2 px-2 font-medium">Tipo</th>
                  <th className="text-left py-2 px-2 font-medium">Par</th>
                  <th className="text-left py-2 px-2 font-medium">Trader</th>
                  <th className="text-right py-2 px-2 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {treasury.recentFees.map((fee) => (
                  <tr key={fee.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2 px-2 text-zinc-400 font-mono">
                      {new Date(fee.created_at + 'Z').toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        fee.fee_type === 'open_fee' ? 'bg-blue-500/10 text-blue-400' :
                        fee.fee_type === 'close_fee' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {fee.fee_type === 'open_fee' ? 'Apertura' :
                         fee.fee_type === 'close_fee' ? 'Cierre' : 'Liquidación'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-white font-medium">{fee.pair}</td>
                    <td className="py-2 px-2 text-zinc-500 font-mono">{fee.trader?.slice(0, 6)}...{fee.trader?.slice(-4)}</td>
                    <td className="py-2 px-2 text-right font-bold text-amber-400 font-mono">+{fmt(fee.amount)} K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Platform Bot Trading Fees (feeService) ═══ */}
      {platformFees && (
        <div className="bg-gradient-to-br from-green-500/5 to-emerald-600/5 border border-green-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap size={14} className="text-green-400" />
            Platform Trading Fees (Bots & Trading)
            <span className="ml-auto text-[10px] text-green-400/60 font-mono">{platformFees.feeRateDisplay} por operación</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Total Recaudado</p>
              <p className="text-lg font-bold text-green-400 font-mono">${fmt(platformFees.totalCollected, 4)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Hoy</p>
              <p className="text-lg font-bold text-white font-mono">${fmt(platformFees.today.fees, 4)}</p>
              <p className="text-[10px] text-zinc-500">{platformFees.today.trades} trades • Vol: {fmtK(platformFees.today.volume)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Últimos 7 Días</p>
              <p className="text-lg font-bold text-white font-mono">${fmt(platformFees.last7days.fees, 4)}</p>
              <p className="text-[10px] text-zinc-500">{platformFees.last7days.trades} trades</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Últimos 30 Días</p>
              <p className="text-lg font-bold text-white font-mono">${fmt(platformFees.last30days.fees, 4)}</p>
              <p className="text-[10px] text-zinc-500">{platformFees.last30days.trades} trades</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
              <Activity size={10} /> {platformFees.totalTrades} trades totales
            </span>
            {platformFees.pendingSync > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                <RefreshCw size={10} /> ${fmt(platformFees.pendingSync, 4)} pendiente de sync
              </span>
            )}
          </div>
        </div>
      )}

      {/* Fee Structure Info */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Percent size={14} className="text-[var(--gold)]" />
          Estructura de Comisiones — Kairos 777 Inc
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-green-400 font-bold mb-1">Platform Fee: 0.05%</p>
            <p className="text-zinc-500">Se cobra al abrir y cerrar trades en bots, simulador, grid, DCA y trading manual. Invisible para el usuario.</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-blue-400 font-bold mb-1">Open Fee: 0.10%</p>
            <p className="text-zinc-500">Se cobra al abrir una posición apalancada. Calculado sobre el tamaño total (collateral × leverage).</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-purple-400 font-bold mb-1">Close Fee: 0.10%</p>
            <p className="text-zinc-500">Se cobra al cerrar una posición. Calculado sobre el tamaño total de la posición.</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-red-400 font-bold mb-1">Liquidation Fee: 0.50%</p>
            <p className="text-zinc-500">Penalización cuando una posición es liquidada automáticamente por el monitor de riesgo.</p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 mt-3 text-center">
          Todas las comisiones se acumulan en el Treasury de Kairos 777 Inc • Los fondos son propiedad de la empresa
        </p>
      </div>
    </div>
  );
}
