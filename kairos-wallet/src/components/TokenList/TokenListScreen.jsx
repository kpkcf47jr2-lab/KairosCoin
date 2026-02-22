// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Token List / Token Management
//  Add custom tokens, view all tokens
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Plus, Check, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getTokenInfo } from '../../services/blockchain';
import { isValidAddress } from '../../services/wallet';
import { DEFAULT_TOKENS, KAIROS_TOKEN, STORAGE_KEYS } from '../../constants/chains';
import TokenIcon from '../Common/TokenIcon';

export default function TokenListScreen() {
  const { activeChainId, goBack, showToast } = useStore();
  const [search, setSearch] = useState('');
  const [customToken, setCustomToken] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Load custom tokens from localStorage
  const getStoredTokens = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TOKENS);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  };
  
  const [addedTokens, setAddedTokens] = useState(() => {
    const all = getStoredTokens();
    return all[activeChainId] || [];
  });

  const chainTokens = DEFAULT_TOKENS[activeChainId] || [];

  const handleSearch = async () => {
    const query = search.trim();
    if (!query) return;

    if (isValidAddress(query)) {
      setIsSearching(true);
      try {
        const info = await getTokenInfo(activeChainId, query);
        setCustomToken(info);
      } catch (err) {
        showToast('Token no encontrado en esta red', 'error');
        setCustomToken(null);
      }
      setIsSearching(false);
    }
  };

  const handleAddToken = () => {
    if (customToken) {
      const newTokens = [...addedTokens, customToken];
      setAddedTokens(newTokens);
      // Persist to localStorage
      const allStored = getStoredTokens();
      allStored[activeChainId] = newTokens;
      localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(allStored));
      showToast(`${customToken.symbol} agregado`, 'success');
      setCustomToken(null);
      setSearch('');
    }
  };

  const filteredTokens = chainTokens.filter(t =>
    !search || 
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="screen-container px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">Gestionar Tokens</h2>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar por nombre o pegar dirección del contrato"
          className="glass-input pl-9 text-sm"
        />
      </div>

      {/* Custom token found */}
      {customToken && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-strong p-4 mb-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">{customToken.symbol}</h4>
              <p className="text-dark-400 text-xs">{customToken.name}</p>
              <p className="text-dark-500 text-[10px] font-mono mt-1">
                Decimals: {customToken.decimals} · Supply: {parseFloat(customToken.totalSupply).toLocaleString()}
              </p>
            </div>
            <button onClick={handleAddToken} className="kairos-button py-2 px-4 text-sm">
              <Plus size={14} className="mr-1 inline" /> Agregar
            </button>
          </div>
        </motion.div>
      )}

      {isSearching && (
        <div className="text-center py-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-kairos-400 border-t-transparent rounded-full mx-auto"
          />
          <p className="text-dark-400 text-xs mt-2">Buscando token...</p>
        </div>
      )}

      {/* Token list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <p className="text-xs text-dark-400 mb-2">Tokens populares en esta red</p>
        {filteredTokens.map(token => {
          const isKairos = token.address.toLowerCase() === KAIROS_TOKEN.address.toLowerCase();
          return (
            <div
              key={token.address}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all"
            >
              <TokenIcon token={token} chainId={activeChainId} size={36} />
              <div className="flex-1">
                <span className="font-medium text-sm">{token.symbol}</span>
                {isKairos && (
                  <span className="ml-1 text-[8px] bg-kairos-500/20 text-kairos-400 px-1.5 py-0.5 rounded font-bold">
                    STABLE
                  </span>
                )}
                <p className="text-dark-400 text-xs">{token.name}</p>
              </div>
              <Check size={16} className="text-green-400" />
            </div>
          );
        })}

        {addedTokens.map(token => (
          <div key={token.address} className="flex items-center gap-3 p-3 rounded-xl bg-kairos-500/5">
            <TokenIcon token={token} chainId={activeChainId} size={36} />
            <div className="flex-1">
              <span className="font-medium text-sm">{token.symbol}</span>
              <span className="ml-1 text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                CUSTOM
              </span>
              <p className="text-dark-400 text-xs">{token.name}</p>
            </div>
            <Check size={16} className="text-kairos-400" />
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="glass-card p-3 mt-4 flex items-start gap-2">
        <AlertTriangle size={14} className="text-kairos-400 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-dark-400">
          Cualquier persona puede crear un token con cualquier nombre. Siempre verifica la dirección
          del contrato antes de interactuar con un token desconocido.
        </p>
      </div>
    </div>
  );
}
