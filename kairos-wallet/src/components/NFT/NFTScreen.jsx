// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — NFT Gallery Screen
//  Display NFTs with images, metadata, and details
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Image, RefreshCw, X, ExternalLink, Loader2, Grid,
  Send, Check, AlertTriangle,
} from 'lucide-react';
import { ethers } from 'ethers';
import { useStore } from '../../store/useStore';
import { CHAINS } from '../../constants/chains';
import { getNFTs, clearNFTCache, sendNFT } from '../../services/nft';
import { formatAddress, getSigner } from '../../services/wallet';

export default function NFTScreen() {
  const { activeAddress, activeChainId, goBack } = useStore();
  const chain = CHAINS[activeChainId];

  const [nfts, setNfts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState(null);

  // Fetch NFTs
  const fetchNFTs = async () => {
    setIsLoading(true);
    try {
      const result = await getNFTs(activeChainId, activeAddress);
      setNfts(result);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNFTs();
  }, [activeChainId, activeAddress]);

  const handleRefresh = () => {
    clearNFTCache(activeChainId, activeAddress);
    fetchNFTs();
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <h1 className="font-bold text-white">NFTs</h1>
        <button onClick={handleRefresh} className="p-2 -mr-2 rounded-xl hover:bg-white/5">
          <RefreshCw size={18} className={`text-dark-300 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Loading */}
        {isLoading && nfts.length === 0 && (
          <div className="text-center py-16">
            <Loader2 size={32} className="text-kairos-400 animate-spin mx-auto mb-4" />
            <p className="text-dark-400 text-sm">Buscando tus NFTs...</p>
            <p className="text-dark-500 text-[10px] mt-1">Esto puede tomar unos segundos</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && nfts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Image size={24} className="text-dark-400" />
            </div>
            <p className="text-dark-400 text-sm mb-1">No se encontraron NFTs</p>
            <p className="text-dark-500 text-xs">
              Tus NFTs ERC-721 en {chain.shortName} aparecerán aquí
            </p>
          </div>
        )}

        {/* NFT Grid */}
        {nfts.length > 0 && (
          <>
            <p className="text-xs text-dark-400 mb-3">{nfts.length} NFT{nfts.length !== 1 ? 's' : ''} en {chain.shortName}</p>
            <div className="grid grid-cols-2 gap-3">
              {nfts.map((nft, i) => (
                <motion.button
                  key={`${nft.contractAddress}_${nft.tokenId}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedNFT(nft)}
                  className="bg-white/[0.03] rounded-2xl overflow-hidden border border-white/5 hover:border-kairos-500/30 transition-colors text-left"
                >
                  {/* Image */}
                  <div className="aspect-square bg-white/[0.02] relative overflow-hidden">
                    {nft.image ? (
                      <img
                        src={nft.image}
                        alt={nft.nftName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`absolute inset-0 items-center justify-center bg-gradient-to-br from-kairos-500/10 to-purple-500/10 ${nft.image ? 'hidden' : 'flex'}`}
                    >
                      <Image size={32} className="text-dark-500" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-white truncate">{nft.nftName}</p>
                    <p className="text-[10px] text-dark-500 truncate">{nft.name}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── NFT Detail Modal ── */}
      <AnimatePresence>
        {selectedNFT && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/95 backdrop-blur-xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <button onClick={() => setSelectedNFT(null)} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
                <ArrowLeft size={20} className="text-dark-300" />
              </button>
              <h2 className="font-bold text-white text-sm truncate max-w-[200px]">{selectedNFT.nftName}</h2>
              <a
                href={`${chain.blockExplorerUrl}/token/${selectedNFT.contractAddress}?a=${selectedNFT.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 -mr-2 rounded-xl hover:bg-white/5"
              >
                <ExternalLink size={18} className="text-dark-400" />
              </a>
            </div>

            <div className="px-5 pb-8">
              {/* Large Image */}
              <div className="rounded-2xl overflow-hidden bg-white/[0.02] mb-4 border border-white/5">
                {selectedNFT.image ? (
                  <img
                    src={selectedNFT.image}
                    alt={selectedNFT.nftName}
                    className="w-full object-contain max-h-80"
                  />
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-kairos-500/10 to-purple-500/10">
                    <Image size={64} className="text-dark-500" />
                  </div>
                )}
              </div>

              {/* Name & Description */}
              <h3 className="text-lg font-bold text-white mb-1">{selectedNFT.nftName}</h3>
              <p className="text-xs text-dark-400 mb-3">{selectedNFT.name} ({selectedNFT.symbol})</p>
              {selectedNFT.description && (
                <p className="text-xs text-dark-300 mb-4 leading-relaxed">{selectedNFT.description}</p>
              )}

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3 border border-white/5">
                  <span className="text-xs text-dark-400">Contrato</span>
                  <span className="text-xs text-dark-200 font-mono">{formatAddress(selectedNFT.contractAddress, 6)}</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3 border border-white/5">
                  <span className="text-xs text-dark-400">Token ID</span>
                  <span className="text-xs text-dark-200">#{selectedNFT.tokenId}</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3 border border-white/5">
                  <span className="text-xs text-dark-400">Red</span>
                  <span className="text-xs text-dark-200">{chain.icon} {chain.name}</span>
                </div>
              </div>

              {/* Attributes */}
              {selectedNFT.attributes?.length > 0 && (
                <>
                  <h4 className="text-xs text-dark-400 uppercase tracking-wider mb-2">Atributos</h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {selectedNFT.attributes.map((attr, i) => (
                      <div key={i} className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5 text-center">
                        <p className="text-[10px] text-dark-500 uppercase">{attr.trait_type}</p>
                        <p className="text-xs font-semibold text-white truncate">{attr.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Send NFT button */}
              <SendNFTSection
                nft={selectedNFT}
                chainId={activeChainId}
                chain={chain}
                onSuccess={() => {
                  setSelectedNFT(null);
                  handleRefresh();
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Send NFT Sub-Component ─── */
function SendNFTSection({ nft, chainId, chain, onSuccess }) {
  const { vault, showToast } = useStore();
  const [showSendForm, setShowSendForm] = useState(false);
  const [toAddress, setToAddress] = useState('');
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState('');

  const handleSend = useCallback(async () => {
    setError('');
    if (!toAddress || !ethers.isAddress(toAddress)) {
      setError('Dirección inválida');
      return;
    }

    setSending(true);
    try {
      const signer = await getSigner(vault, chainId);
      const result = await sendNFT(
        chainId,
        signer.privateKey,
        nft.contractAddress,
        nft.tokenId,
        toAddress
      );
      setTxHash(result.hash);
      showToast('NFT enviado exitosamente', 'success');
    } catch (err) {
      setError(err.reason || err.message || 'Error al enviar NFT');
      showToast('Error al enviar NFT', 'error');
    } finally {
      setSending(false);
    }
  }, [toAddress, vault, chainId, nft, showToast]);

  if (txHash) {
    return (
      <div className="rounded-2xl bg-green-500/5 border border-green-500/10 p-4 text-center">
        <Check size={28} className="text-green-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-white mb-1">¡NFT Enviado!</p>
        <a href={`${chain.blockExplorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-kairos-400 hover:underline">
          Ver en Explorer <ExternalLink size={10} />
        </a>
        <button onClick={onSuccess}
          className="block w-full mt-3 py-2.5 rounded-xl text-sm font-bold text-white bg-kairos-500 hover:bg-kairos-600 transition-colors">
          Cerrar
        </button>
      </div>
    );
  }

  if (!showSendForm) {
    return (
      <button onClick={() => setShowSendForm(true)}
        className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
        <Send size={16} />
        Enviar NFT
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 space-y-3">
      <h4 className="text-sm font-bold text-white flex items-center gap-2">
        <Send size={14} className="text-kairos-400" />
        Enviar {nft.nftName}
      </h4>

      <div>
        <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1 block">Dirección destino</label>
        <input type="text" value={toAddress} onChange={e => setToAddress(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2.5 rounded-xl text-sm font-mono bg-white/[0.04] border border-white/[0.08] outline-none focus:border-kairos-500/30 text-white placeholder:text-dark-500" />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10">
          <AlertTriangle size={12} className="text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setShowSendForm(false)}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-dark-400 bg-white/[0.04] hover:bg-white/[0.06] transition-colors">
          Cancelar
        </button>
        <button onClick={handleSend} disabled={sending}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
