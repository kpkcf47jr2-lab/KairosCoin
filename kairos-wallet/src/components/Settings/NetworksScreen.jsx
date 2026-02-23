// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Custom Network Manager
//  Add, edit, delete custom RPCs and networks
//  MetaMask parity: testnets, L2s, custom chains
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Edit3, Globe, Check, X,
  Loader, AlertTriangle, ChevronRight, Wifi
} from 'lucide-react';
import { ethers } from 'ethers';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';
import { clearProviderCache } from '../../services/blockchain';
import { useTranslation } from '../../services/i18n';

const CUSTOM_CHAINS_KEY = 'kairos_custom_chains';

function getCustomChains() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_CHAINS_KEY) || '{}'); }
  catch { return {}; }
}

function saveCustomChains(chains) {
  localStorage.setItem(CUSTOM_CHAINS_KEY, JSON.stringify(chains));
}

export default function NetworksScreen() {
  const { t } = useTranslation();
  const { activeChainId, setActiveChain, navigate, showToast } = useStore();

  const [customChains, setCustomChains] = useState(getCustomChains());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChainId, setEditingChainId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    chainId: '',
    rpcUrl: '',
    symbol: '',
    blockExplorer: '',
  });
  const [testingRpc, setTestingRpc] = useState(false);
  const [rpcStatus, setRpcStatus] = useState(null); // 'ok' | 'error' | null
  const [saving, setSaving] = useState(false);

  const allChains = { ...CHAINS };
  Object.entries(customChains).forEach(([id, chain]) => {
    allChains[parseInt(id)] = chain;
  });

  const resetForm = () => {
    setForm({ name: '', chainId: '', rpcUrl: '', symbol: '', blockExplorer: '' });
    setRpcStatus(null);
    setTestingRpc(false);
  };

  // Test RPC connection
  const testRpc = useCallback(async () => {
    if (!form.rpcUrl) return;
    setTestingRpc(true);
    setRpcStatus(null);

    try {
      const provider = new ethers.JsonRpcProvider(form.rpcUrl);
      const network = await Promise.race([
        provider.getNetwork(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
      ]);
      
      // Auto-fill chain ID if empty
      if (!form.chainId) {
        setForm(f => ({ ...f, chainId: network.chainId.toString() }));
      }
      setRpcStatus('ok');
    } catch (err) {
      setRpcStatus('error');
    } finally {
      setTestingRpc(false);
    }
  }, [form.rpcUrl, form.chainId]);

  // Save custom network
  const handleSave = async () => {
    if (!form.name || !form.chainId || !form.rpcUrl || !form.symbol) {
      showToast('Completa todos los campos requeridos', 'error');
      return;
    }

    const chainId = parseInt(form.chainId);
    
    // Don't overwrite built-in chains
    if (CHAINS[chainId] && !editingChainId) {
      showToast(`La red ${CHAINS[chainId].name} ya existe como red predeterminada`, 'error');
      return;
    }

    setSaving(true);

    try {
      const newChain = {
        name: form.name,
        chainId,
        rpcUrls: [form.rpcUrl],
        blockExplorerUrl: form.blockExplorer || '',
        blockExplorerApiUrl: '',
        icon: '🌐',
        nativeCurrency: {
          name: form.symbol,
          symbol: form.symbol,
          decimals: 18,
        },
        isCustom: true,
      };

      const updated = { ...customChains, [chainId]: newChain };
      saveCustomChains(updated);
      setCustomChains(updated);
      clearProviderCache(chainId);

      showToast(`Red ${form.name} guardada`, 'success');
      setShowAddForm(false);
      setEditingChainId(null);
      resetForm();
    } catch (err) {
      showToast('Error al guardar red', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete custom network
  const handleDelete = (chainId) => {
    if (activeChainId === chainId) {
      showToast('No puedes eliminar la red activa', 'error');
      return;
    }
    const updated = { ...customChains };
    delete updated[chainId];
    saveCustomChains(updated);
    setCustomChains(updated);
    clearProviderCache(chainId);
    showToast('Red eliminada', 'success');
  };

  // Edit custom network
  const handleEdit = (chainId) => {
    const chain = customChains[chainId];
    if (!chain) return;
    setForm({
      name: chain.name,
      chainId: chainId.toString(),
      rpcUrl: chain.rpcUrls?.[0] || '',
      symbol: chain.nativeCurrency?.symbol || '',
      blockExplorer: chain.blockExplorerUrl || '',
    });
    setEditingChainId(chainId);
    setShowAddForm(true);
  };

  // Built-in + custom chains grouped
  const builtInChainIds = Object.keys(CHAINS).map(Number);
  const customChainIds = Object.keys(customChains).map(Number);

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => navigate('settings')} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-white flex items-center gap-2">
            <Globe size={18} className="text-kairos-400" />
            {t('networks.title', 'Redes')}
          </h1>
        </div>
        <button
          onClick={() => { resetForm(); setEditingChainId(null); setShowAddForm(true); }}
          className="p-2 rounded-xl bg-kairos-500/10 hover:bg-kairos-500/20"
        >
          <Plus size={16} className="text-kairos-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Built-in networks */}
        <p className="text-dark-500 text-xs font-medium mb-2 uppercase tracking-wider">
          Redes Predeterminadas
        </p>
        <div className="space-y-1 mb-6">
          {builtInChainIds.map(chainId => {
            const chain = CHAINS[chainId];
            const isActive = activeChainId === chainId;
            return (
              <button
                key={chainId}
                onClick={() => setActiveChain(chainId)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors
                  ${isActive ? 'bg-kairos-500/10 border border-kairos-500/20' : 'hover:bg-white/[0.03]'}`}
              >
                <span className="text-xl">{chain.icon}</span>
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-medium">{chain.name}</p>
                  <p className="text-dark-500 text-[10px]">Chain ID: {chainId}</p>
                </div>
                {isActive && <Check size={16} className="text-kairos-400" />}
              </button>
            );
          })}
        </div>

        {/* Custom networks */}
        {customChainIds.length > 0 && (
          <>
            <p className="text-dark-500 text-xs font-medium mb-2 uppercase tracking-wider">
              Redes Personalizadas
            </p>
            <div className="space-y-1 mb-6">
              {customChainIds.map(chainId => {
                const chain = customChains[chainId];
                const isActive = activeChainId === chainId;
                return (
                  <div
                    key={chainId}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors
                      ${isActive ? 'bg-kairos-500/10 border border-kairos-500/20' : 'bg-white/[0.02]'}`}
                  >
                    <button
                      onClick={() => setActiveChain(chainId)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <Globe size={20} className="text-dark-400" />
                      <div>
                        <p className="text-white text-sm font-medium">{chain.name}</p>
                        <p className="text-dark-500 text-[10px]">
                          {chain.nativeCurrency?.symbol} · Chain ID: {chainId}
                        </p>
                      </div>
                    </button>
                    <button onClick={() => handleEdit(chainId)} className="p-1.5 rounded-lg hover:bg-white/5">
                      <Edit3 size={14} className="text-dark-400" />
                    </button>
                    <button onClick={() => handleDelete(chainId)} className="p-1.5 rounded-lg hover:bg-red-500/10">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Network Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-dark-900 rounded-t-3xl p-6 max-h-[85vh] overflow-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  {editingChainId ? 'Editar Red' : 'Agregar Red'}
                </h3>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="p-1">
                  <X size={20} className="text-dark-400" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Network Name */}
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">Nombre de la Red *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Sepolia Testnet"
                    className="input-dark w-full"
                  />
                </div>

                {/* RPC URL */}
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">RPC URL *</label>
                  <div className="flex gap-2">
                    <input
                      value={form.rpcUrl}
                      onChange={e => { setForm(f => ({ ...f, rpcUrl: e.target.value })); setRpcStatus(null); }}
                      placeholder="https://rpc.example.com"
                      className="input-dark flex-1"
                    />
                    <button
                      onClick={testRpc}
                      disabled={!form.rpcUrl || testingRpc}
                      className="px-3 rounded-xl bg-dark-700 hover:bg-dark-600 text-xs text-dark-300 disabled:opacity-50"
                    >
                      {testingRpc ? <Loader size={14} className="animate-spin" /> : <Wifi size={14} />}
                    </button>
                  </div>
                  {rpcStatus === 'ok' && (
                    <p className="text-green-400 text-[10px] mt-1 flex items-center gap-1">
                      <Check size={10} /> Conexión exitosa
                    </p>
                  )}
                  {rpcStatus === 'error' && (
                    <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1">
                      <AlertTriangle size={10} /> No se pudo conectar
                    </p>
                  )}
                </div>

                {/* Chain ID */}
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">Chain ID *</label>
                  <input
                    value={form.chainId}
                    onChange={e => setForm(f => ({ ...f, chainId: e.target.value.replace(/\D/g, '') }))}
                    placeholder="e.g. 11155111"
                    className="input-dark w-full"
                    disabled={!!editingChainId}
                  />
                </div>

                {/* Currency Symbol */}
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">Símbolo de Moneda *</label>
                  <input
                    value={form.symbol}
                    onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                    placeholder="e.g. ETH"
                    className="input-dark w-full"
                    maxLength={10}
                  />
                </div>

                {/* Block Explorer */}
                <div>
                  <label className="text-dark-400 text-xs mb-1 block">Block Explorer URL (opcional)</label>
                  <input
                    value={form.blockExplorer}
                    onChange={e => setForm(f => ({ ...f, blockExplorer: e.target.value }))}
                    placeholder="https://sepolia.etherscan.io"
                    className="input-dark w-full"
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.chainId || !form.rpcUrl || !form.symbol}
                  className="btn-primary w-full py-3 mt-2 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size={16} className="animate-spin" /> Guardando...
                    </span>
                  ) : (
                    editingChainId ? 'Guardar Cambios' : 'Agregar Red'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
