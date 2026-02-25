// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Transaction History
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw, FileText, Download, Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getTransactionHistory, getTokenTransferHistory } from '../../services/blockchain';
import { formatAddress } from '../../services/wallet';
import { CHAINS } from '../../constants/chains';
import { exportTransactionsCSV } from '../../services/export';

export default function HistoryScreen() {
  const { activeAddress, activeChainId, goBack, navigate, showToast } = useStore();
  const setTxDetailData = useStore(s => s.setTxDetailData);
  const recentTransactions = useStore(s => s.recentTransactions);
  const pendingTransactions = useStore(s => s.pendingTransactions);
  const [explorerTxs, setExplorerTxs] = useState([]);
  const [tokenTxs, setTokenTxs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'tokens'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const chain = CHAINS[activeChainId];

  useEffect(() => {
    loadHistory();
  }, [activeAddress, activeChainId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [txs, tokenTransfers] = await Promise.all([
        getTransactionHistory(activeChainId, activeAddress),
        getTokenTransferHistory(activeChainId, activeAddress),
      ]);
      setExplorerTxs(txs);
      setTokenTxs(tokenTransfers);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setIsLoading(false);
  };

  // Merge explorer txs with local recent txs (deduplicate by hash)
  const transactions = useMemo(() => {
    const hashSet = new Set();
    const merged = [];

    // Pending txs first (for current chain)
    for (const tx of pendingTransactions) {
      if (tx.chainId === activeChainId || !tx.chainId) {
        if (!hashSet.has(tx.hash)) {
          hashSet.add(tx.hash);
          merged.push({ ...tx, isPending: true, timestamp: tx.timestamp || Date.now() });
        }
      }
    }

    // Explorer txs
    for (const tx of explorerTxs) {
      if (!hashSet.has(tx.hash)) {
        hashSet.add(tx.hash);
        merged.push(tx);
      }
    }

    // Local recent txs (fallback when explorer returns nothing)
    for (const tx of recentTransactions) {
      if ((tx.chainId === activeChainId || !tx.chainId) && !hashSet.has(tx.hash)) {
        hashSet.add(tx.hash);
        merged.push(tx);
      }
    }

    // Sort by timestamp desc
    merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return merged;
  }, [explorerTxs, recentTransactions, pendingTransactions, activeChainId]);

  // Filter by search query
  const filteredTxs = useMemo(() => {
    const list = tab === 'tokens' ? tokenTxs : transactions;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(tx =>
      tx.hash?.toLowerCase().includes(q) ||
      tx.from?.toLowerCase().includes(q) ||
      tx.to?.toLowerCase().includes(q) ||
      tx.tokenSymbol?.toLowerCase().includes(q) ||
      tx.value?.toString().includes(q)
    );
  }, [transactions, tokenTxs, tab, searchQuery]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Ahora mismo';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `Hace ${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold flex-1">Historial</h2>
        <button
          onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"
        >
          {showSearch ? <X size={16} className="text-dark-300" /> : <Search size={16} className="text-dark-300" />}
        </button>
        {transactions.length > 0 && (
          <button
            onClick={() => {
              const all = [...transactions, ...tokenTxs];
              const count = exportTransactionsCSV(all, activeChainId, activeAddress);
              showToast(`${count} transacciones exportadas`, 'success');
            }}
            className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"
            title="Exportar CSV"
          >
            <Download size={16} className="text-dark-300" />
          </button>
        )}
        <button onClick={loadHistory} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
          <RefreshCw size={16} className={`text-dark-300 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4"
        >
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por hash, dirección o token..."
              className="glass-input pl-10 pr-4 text-sm"
              autoFocus
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
            />
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-4">
        {[
          { key: 'all', label: `Todas (${transactions.length})` },
          { key: 'tokens', label: `Tokens (${tokenTxs.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-kairos-500/15 text-kairos-400' : 'text-dark-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto -mx-1">
        {isLoading ? (
          <div className="space-y-3 px-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/5" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-white/5 rounded mb-1" />
                  <div className="h-3 w-32 bg-white/5 rounded" />
                </div>
                <div className="h-4 w-16 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-dark-400" />
            </div>
            <p className="text-dark-400 text-sm">
              {searchQuery ? 'Sin resultados para esta búsqueda' : 'No hay transacciones todavía'}
            </p>
            <p className="text-dark-500 text-xs mt-1">
              {searchQuery ? 'Intenta con otro término' : 'Las transacciones aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 px-1">
            {filteredTxs.map((tx, i) => (
              <motion.button
                key={tx.hash + i}
                onClick={() => {
                  setTxDetailData(tx);
                  navigate('txdetail');
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all w-full text-left"
              >
                {/* Direction icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.isPending ? 'bg-yellow-500/10' : tx.isIncoming ? 'bg-green-500/10' : 'bg-blue-500/10'
                }`}>
                  {tx.isPending ? (
                    <RefreshCw size={18} className="text-yellow-400 animate-spin" />
                  ) : tx.isIncoming ? (
                    <ArrowDownLeft size={18} className="text-green-400" />
                  ) : (
                    <ArrowUpRight size={18} className="text-blue-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-sm">
                      {tx.isPending ? 'Pendiente' : tx.isIncoming ? 'Recibido' : 'Enviado'}
                    </span>
                    {tx.tokenSymbol && (
                      <span className="text-dark-400 text-xs">{tx.tokenSymbol}</span>
                    )}
                    {tx.isPending && (
                      <span className="text-yellow-400 text-[10px] bg-yellow-500/10 px-1.5 py-0.5 rounded animate-pulse">Pendiente</span>
                    )}
                    {tx.status === 'failed' && (
                      <span className="text-red-400 text-[10px] bg-red-500/10 px-1.5 py-0.5 rounded">Fallida</span>
                    )}
                  </div>
                  <span className="text-dark-400 text-xs">
                    {tx.isIncoming ? 'De: ' : 'Para: '}{formatAddress(tx.isIncoming ? tx.from : tx.to, 4)}
                    {' · '}{formatDate(tx.timestamp)}
                  </span>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <span className={`font-semibold text-sm ${tx.isIncoming ? 'text-green-400' : 'text-white'}`}>
                    {tx.isIncoming ? '+' : '-'}{parseFloat(tx.value).toFixed(4)}
                  </span>
                  <ExternalLink size={10} className="text-dark-500 ml-1 inline" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
