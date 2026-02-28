import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { TOKENS } from '../config/tokens';

export default function TokenSelector() {
  const { chainId, showTokenSelector, setShowTokenSelector, setSellToken, setBuyToken, sellToken, buyToken } = useStore();
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  const tokens = TOKENS[chainId] || [];
  const side = showTokenSelector; // 'sell' | 'buy'

  useEffect(() => {
    if (side) { setSearch(''); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [side]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tokens;
    const q = search.toLowerCase();
    return tokens.filter(t =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q)
    );
  }, [tokens, search]);

  if (!side) return null;

  const currentToken = side === 'sell' ? sellToken : buyToken;
  const otherToken = side === 'sell' ? buyToken : sellToken;

  const handleSelect = (token) => {
    if (side === 'sell') setSellToken(token);
    else setBuyToken(token);
    setShowTokenSelector(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowTokenSelector(null)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 bg-dark-200 border border-white/10 rounded-2xl shadow-2xl animate-slide-up max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">Select Token</h3>
          <button
            onClick={() => setShowTokenSelector(null)}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name or paste address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-brand-500/40 transition-colors"
          />
        </div>

        {/* Popular tokens */}
        <div className="px-4 pt-3 flex flex-wrap gap-1.5">
          {tokens.slice(0, 6).map(token => (
            <button
              key={token.address}
              onClick={() => handleSelect(token)}
              disabled={token.address === otherToken?.address}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${token.address === currentToken?.address
                  ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                  : token.address === otherToken?.address
                    ? 'bg-white/3 text-white/20 border-white/5 cursor-not-allowed'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
            >
              {token.logoURI && <img src={token.logoURI} alt="" className="w-4 h-4 rounded-full" onError={(e) => e.target.style.display='none'} />}
              {token.isKairos && !token.logoURI && <span className="text-brand-400 text-xs">◆</span>}
              {token.symbol}
            </button>
          ))}
        </div>

        {/* Token list */}
        <div className="mt-2 px-2 pb-2 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: '340px' }}>
          {filtered.length === 0 ? (
            <div className="text-center text-white/30 py-8 text-sm">No tokens found</div>
          ) : (
            filtered.map(token => {
              const isSelected = token.address === currentToken?.address;
              const isOther = token.address === otherToken?.address;
              return (
                <button
                  key={token.address}
                  onClick={() => !isOther && handleSelect(token)}
                  disabled={isOther}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isSelected ? 'bg-brand-500/10 border border-brand-500/20' :
                    isOther ? 'opacity-30 cursor-not-allowed' :
                    'hover:bg-white/5'
                  }`}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {token.logoURI ? (
                      <img src={token.logoURI} alt={token.symbol} className="w-9 h-9 rounded-full" onError={(e) => { e.target.style.display='none'; e.target.nextSibling && (e.target.nextSibling.style.display='flex'); }} />
                    ) : null}
                    <span className={`text-sm font-bold ${token.isKairos ? 'text-brand-400' : 'text-white/60'}`} style={token.logoURI ? { display: 'none' } : {}}>
                      {token.isKairos ? 'K' : token.symbol.charAt(0)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">{token.symbol}</span>
                      {token.isKairos && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-brand-500/20 text-brand-400 rounded-md">KAIROS</span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 truncate">{token.name}</p>
                  </div>

                  {/* Selected check */}
                  {isSelected && (
                    <span className="text-brand-400 text-lg">✓</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
