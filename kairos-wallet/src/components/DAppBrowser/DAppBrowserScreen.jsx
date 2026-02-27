// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — dApp Browser Screen
//  Browse popular dApps, favorites, open in browser
// ═══════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, ExternalLink, Star, Globe, X, TrendingUp,
  Repeat, Image, Coins, Gamepad2, ShoppingCart, LayoutGrid,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';
import { STORAGE_KEYS } from '../../constants/chains';

// ── Popular dApps ──
const DAPP_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: LayoutGrid },
  { id: 'defi', label: 'DeFi', icon: TrendingUp },
  { id: 'dex', label: 'DEX', icon: Repeat },
  { id: 'nft', label: 'NFT', icon: Image },
  { id: 'earn', label: 'Earn', icon: Coins },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
];

const DAPPS = [
  // ── Kairos Ecosystem (Featured) ──
  { name: 'Kairos Trade', url: 'https://kairos-trade.netlify.app', icon: '📈', category: 'defi', chains: [56, 1, 137, 42161, 43114, 8453], description: 'Trading con IA, bots y ejecución on-chain. ¡Conecta tu wallet!', featured: true },

  // DEX
  { name: 'PancakeSwap', url: 'https://pancakeswap.finance', icon: '🥞', category: 'dex', chains: [56, 1, 42161, 8453], description: 'DEX líder en BSC. Swap, staking y farming.' },
  { name: 'Uniswap', url: 'https://app.uniswap.org', icon: '🦄', category: 'dex', chains: [1, 137, 42161, 8453], description: 'El DEX más popular en Ethereum.' },
  { name: 'SushiSwap', url: 'https://www.sushi.com/swap', icon: '🍣', category: 'dex', chains: [1, 137, 42161, 43114], description: 'Multi-chain DEX con farming.' },
  { name: '1inch', url: 'https://app.1inch.io', icon: '🐴', category: 'dex', chains: [1, 56, 137, 42161, 43114, 8453], description: 'Agregador DEX — mejores precios.' },
  { name: 'Trader Joe', url: 'https://traderjoexyz.com', icon: '🏔️', category: 'dex', chains: [43114, 42161, 56], description: 'DEX principal de Avalanche.' },
  { name: 'Aerodrome', url: 'https://aerodrome.finance', icon: '✈️', category: 'dex', chains: [8453], description: 'DEX principal de Base.' },

  // DeFi / Lending
  { name: 'Aave', url: 'https://app.aave.com', icon: '👻', category: 'defi', chains: [1, 137, 42161, 43114, 8453], description: 'Préstamos y depósitos DeFi.' },
  { name: 'Compound', url: 'https://app.compound.finance', icon: '🏦', category: 'defi', chains: [1, 137, 42161, 8453], description: 'Protocolo de préstamos descentralizado.' },
  { name: 'Venus', url: 'https://app.venus.io', icon: '💛', category: 'defi', chains: [56], description: 'Préstamos y staking en BSC.' },
  { name: 'Lido', url: 'https://lido.fi', icon: '🌊', category: 'defi', chains: [1, 137], description: 'Liquid staking de ETH.' },
  { name: 'Beefy Finance', url: 'https://app.beefy.com', icon: '🐮', category: 'earn', chains: [56, 137, 42161, 43114, 8453], description: 'Auto-compounder multi-chain.' },
  { name: 'Stargate', url: 'https://stargate.finance', icon: '🌉', category: 'defi', chains: [1, 56, 137, 42161, 43114, 8453], description: 'Bridge cross-chain nativo.' },

  // NFT Marketplaces
  { name: 'OpenSea', url: 'https://opensea.io', icon: '🌊', category: 'nft', chains: [1, 137, 42161, 43114, 8453, 56], description: 'Marketplace NFT más grande.' },
  { name: 'Blur', url: 'https://blur.io', icon: '🟣', category: 'nft', chains: [1], description: 'Trading de NFTs para pros.' },
  { name: 'Element', url: 'https://element.market', icon: '⚡', category: 'nft', chains: [56, 137, 43114], description: 'Marketplace NFT multi-chain.' },

  // Gaming
  { name: 'Axie Infinity', url: 'https://app.axieinfinity.com', icon: '🎮', category: 'gaming', chains: [1], description: 'Juego P2E de batallas.' },
  { name: 'The Sandbox', url: 'https://www.sandbox.game', icon: '🏖️', category: 'gaming', chains: [1, 137], description: 'Metaverso y gaming P2E.' },
  { name: 'Gala Games', url: 'https://app.gala.games', icon: '🎲', category: 'gaming', chains: [1], description: 'Plataforma de juegos blockchain.' },

  // Earn / Yield
  { name: 'Pendle', url: 'https://app.pendle.finance', icon: '🔮', category: 'earn', chains: [1, 42161], description: 'Trading de yield tokenizado.' },
  { name: 'Convex Finance', url: 'https://www.convexfinance.com', icon: '🎯', category: 'earn', chains: [1], description: 'Boost para Curve LP.' },
  { name: 'Yearn Finance', url: 'https://yearn.fi', icon: '💎', category: 'earn', chains: [1, 137, 42161], description: 'Vaults automatizados de yield.' },
];

// ── Favorites Storage ──
const FAVORITES_KEY = 'kairos_favorite_dapps';

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch { return []; }
}

function toggleFavorite(url) {
  const favs = getFavorites();
  const idx = favs.indexOf(url);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(url);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return [...favs];
}

export default function DAppBrowserScreen() {
  const { activeChainId, goBack, showToast } = useStore();
  const chain = CHAINS[activeChainId];

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [favorites, setFavorites] = useState(getFavorites);
  const [selectedDApp, setSelectedDApp] = useState(null);

  // Filter dApps
  const filteredDApps = useMemo(() => {
    let list = DAPPS;

    // Filter by category
    if (category === 'favorites') {
      list = list.filter(d => favorites.includes(d.url));
    } else if (category !== 'all') {
      list = list.filter(d => d.category === category);
    }

    // Filter by chain
    list = list.filter(d => d.chains.includes(activeChainId));

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );
    }

    // Sort: favorites first
    list.sort((a, b) => {
      const aFav = favorites.includes(a.url) ? 0 : 1;
      const bFav = favorites.includes(b.url) ? 0 : 1;
      return aFav - bFav;
    });

    return list;
  }, [category, search, activeChainId, favorites]);

  const handleOpen = (dapp) => {
    window.open(dapp.url, '_blank', 'noopener,noreferrer');
  };

  const handleToggleFavorite = (url) => {
    const updated = toggleFavorite(url);
    setFavorites(updated);
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <h1 className="font-bold text-white">Explorar dApps</h1>
        <div className="w-9" />
      </div>

      {/* Search */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar dApps..."
            className="input-field pl-9 pr-9 text-sm h-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-dark-500" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="px-5 mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {/* Favorites tab */}
          <button
            onClick={() => setCategory('favorites')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              category === 'favorites'
                ? 'bg-kairos-500/20 text-kairos-400 border border-kairos-500/30'
                : 'bg-white/[0.03] text-dark-400 border border-white/5'
            }`}
          >
            <Star size={12} />
            Favoritos
            {favorites.length > 0 && (
              <span className="bg-kairos-500/30 text-kairos-300 text-[10px] px-1.5 rounded-full">{favorites.length}</span>
            )}
          </button>

          {DAPP_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat.id
                  ? 'bg-kairos-500/20 text-kairos-400 border border-kairos-500/30'
                  : 'bg-white/[0.03] text-dark-400 border border-white/5'
              }`}
            >
              <cat.icon size={12} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chain indicator */}
      <div className="px-5 mb-3">
        <p className="text-[10px] text-dark-500">
          Mostrando dApps compatibles con {chain.icon} {chain.shortName}
        </p>
      </div>

      {/* dApp List */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {filteredDApps.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Globe size={24} className="text-dark-400" />
            </div>
            <p className="text-dark-400 text-sm mb-1">
              {category === 'favorites' ? 'Sin favoritos aún' : 'No se encontraron dApps'}
            </p>
            <p className="text-dark-500 text-xs">
              {category === 'favorites'
                ? 'Marca dApps con ★ para acceder rápido'
                : 'Prueba con otra categoría o busca algo diferente'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDApps.map((dapp, i) => {
              const isFav = favorites.includes(dapp.url);
              return (
                <motion.div
                  key={dapp.url}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 border border-white/5 hover:border-kairos-500/20 transition-colors"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-xl flex-shrink-0">
                    {dapp.icon}
                  </div>

                  {/* Info */}
                  <button onClick={() => handleOpen(dapp)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{dapp.name}</p>
                      {isFav && <Star size={10} className="text-kairos-400 fill-kairos-400 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-dark-400 truncate">{dapp.description}</p>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleFavorite(dapp.url)}
                      className="p-2 rounded-lg hover:bg-white/5"
                    >
                      <Star
                        size={14}
                        className={isFav ? 'text-kairos-400 fill-kairos-400' : 'text-dark-500'}
                      />
                    </button>
                    <button
                      onClick={() => handleOpen(dapp)}
                      className="p-2 rounded-lg hover:bg-white/5"
                    >
                      <ExternalLink size={14} className="text-dark-400" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
