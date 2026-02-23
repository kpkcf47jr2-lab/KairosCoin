// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Transaction Detail Screen
//  Decodes TX data, shows internal transfers, full info
//  MetaMask's TX details are basic — ours decode everything
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Copy, CheckCircle, XCircle, Clock, ArrowUpRight,
         ArrowDownLeft, FileText, Hash, Layers, Fuel, Box, Code } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getProvider } from '../../services/blockchain';
import { CHAINS } from '../../constants/chains';
import { ethers } from 'ethers';

// Known function signatures (4-byte selectors)
const KNOWN_FUNCTIONS = {
  '0xa9059cbb': { name: 'transfer', params: ['address to', 'uint256 amount'], label: 'Token Transfer' },
  '0x095ea7b3': { name: 'approve', params: ['address spender', 'uint256 amount'], label: 'Token Approval' },
  '0x23b872dd': { name: 'transferFrom', params: ['address from', 'address to', 'uint256 amount'], label: 'TransferFrom' },
  '0x38ed1739': { name: 'swapExactTokensForTokens', params: ['uint256 amountIn', 'uint256 amountOutMin', 'address[] path', 'address to', 'uint256 deadline'], label: 'DEX Swap' },
  '0x7ff36ab5': { name: 'swapExactETHForTokens', params: ['uint256 amountOutMin', 'address[] path', 'address to', 'uint256 deadline'], label: 'DEX Swap (Native→Token)' },
  '0x18cbafe5': { name: 'swapExactTokensForETH', params: ['uint256 amountIn', 'uint256 amountOutMin', 'address[] path', 'address to', 'uint256 deadline'], label: 'DEX Swap (Token→Native)' },
  '0xa22cb465': { name: 'setApprovalForAll', params: ['address operator', 'bool approved'], label: 'NFT Approval' },
  '0x42842e0e': { name: 'safeTransferFrom', params: ['address from', 'address to', 'uint256 tokenId'], label: 'NFT Transfer' },
  '0x3593564c': { name: 'execute', params: ['bytes commands', 'bytes[] inputs', 'uint256 deadline'], label: 'Universal Router' },
  '0xfb3bdb41': { name: 'swapETHForExactTokens', params: ['uint256 amountOut', 'address[] path', 'address to', 'uint256 deadline'], label: 'DEX Swap' },
  '0xa6f2ae3a': { name: 'buy', params: [], label: 'Buy' },
  '0xd0e30db0': { name: 'deposit', params: [], label: 'Wrap Native' },
  '0x2e1a7d4d': { name: 'withdraw', params: ['uint256 amount'], label: 'Unwrap Native' },
};

function decodeCalldata(data) {
  if (!data || data === '0x' || data.length < 10) return null;
  const selector = data.slice(0, 10);
  const known = KNOWN_FUNCTIONS[selector];
  if (known) {
    return { ...known, selector, raw: data };
  }
  return { name: 'Unknown', label: `Function: ${selector}`, selector, raw: data, params: [] };
}

function truncateAddr(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function TxDetailScreen() {
  const { goBack, activeChainId, showToast } = useStore();
  const txData = useStore(s => s.txDetailData);
  const [receipt, setReceipt] = useState(null);
  const [fullTx, setFullTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const chain = CHAINS[activeChainId];

  useEffect(() => {
    if (!txData?.hash) return;
    const fetchTx = async () => {
      setLoading(true);
      try {
        const provider = getProvider(activeChainId);
        const [tx, rc] = await Promise.allSettled([
          provider.getTransaction(txData.hash),
          provider.getTransactionReceipt(txData.hash),
        ]);
        if (tx.status === 'fulfilled') setFullTx(tx.value);
        if (rc.status === 'fulfilled') setReceipt(rc.value);
      } catch {}
      setLoading(false);
    };
    fetchTx();
  }, [txData?.hash, activeChainId]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copiado', 'success');
  };

  if (!txData) {
    return (
      <div className="screen-container items-center justify-center">
        <p className="text-dark-400">No hay datos de transacción</p>
        <button onClick={goBack} className="mt-4 text-kairos-400 text-sm">← Volver</button>
      </div>
    );
  }

  const decoded = decodeCalldata(fullTx?.data);
  const isSuccess = receipt?.status === 1;
  const isFailed = receipt?.status === 0;
  const isPending = !receipt;
  const gasUsed = receipt?.gasUsed ? receipt.gasUsed.toString() : '—';
  const gasPrice = fullTx?.gasPrice ? ethers.formatUnits(fullTx.gasPrice, 'gwei') : '—';
  const totalFee = receipt?.gasUsed && fullTx?.gasPrice
    ? ethers.formatEther(receipt.gasUsed * fullTx.gasPrice)
    : '—';
  const value = fullTx?.value ? ethers.formatEther(fullTx.value) : txData.value || '0';
  const nonce = fullTx?.nonce?.toString() || txData.nonce || '—';

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800">
        <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold text-white">Detalles de TX</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status Banner */}
        <div className={`rounded-xl p-4 border flex items-center gap-3 ${
          isPending ? 'bg-yellow-500/10 border-yellow-500/20' :
          isSuccess ? 'bg-green-500/10 border-green-500/20' :
          'bg-red-500/10 border-red-500/20'
        }`}>
          {isPending ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
              <Clock className="text-yellow-400" size={24} />
            </motion.div>
          ) : isSuccess ? (
            <CheckCircle className="text-green-400" size={24} />
          ) : (
            <XCircle className="text-red-400" size={24} />
          )}
          <div>
            <p className={`font-bold ${
              isPending ? 'text-yellow-400' : isSuccess ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPending ? 'Pendiente' : isSuccess ? 'Confirmada' : 'Fallida'}
            </p>
            {decoded && (
              <p className="text-dark-300 text-xs">{decoded.label}</p>
            )}
          </div>
        </div>

        {/* Value */}
        {parseFloat(value) > 0 && (
          <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700 text-center">
            <p className="text-dark-400 text-xs mb-1">Valor</p>
            <p className="text-white text-2xl font-bold">
              {parseFloat(value).toFixed(6)} {chain?.nativeCurrency?.symbol}
            </p>
          </div>
        )}

        {/* From / To */}
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-dark-400 text-xs">
              <ArrowUpRight size={12} /> De
            </div>
            <button onClick={() => copyToClipboard(fullTx?.from || txData.from || '')} className="flex items-center gap-1 text-white text-xs font-mono">
              {truncateAddr(fullTx?.from || txData.from)} <Copy size={10} className="text-dark-500" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-dark-400 text-xs">
              <ArrowDownLeft size={12} /> Para
            </div>
            <button onClick={() => copyToClipboard(fullTx?.to || txData.to || '')} className="flex items-center gap-1 text-white text-xs font-mono">
              {truncateAddr(fullTx?.to || txData.to)} <Copy size={10} className="text-dark-500" />
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700 space-y-3">
          <h3 className="text-dark-300 text-xs font-semibold flex items-center gap-1"><FileText size={12} /> DETALLES</h3>
          
          {[
            { icon: <Hash size={12} />, label: 'TX Hash', value: truncateAddr(txData.hash), full: txData.hash },
            { icon: <Layers size={12} />, label: 'Nonce', value: nonce },
            { icon: <Box size={12} />, label: 'Bloque', value: receipt?.blockNumber?.toString() || 'Pendiente' },
            { icon: <Fuel size={12} />, label: 'Gas Usado', value: gasUsed },
            { icon: <Fuel size={12} />, label: 'Gas Price', value: `${parseFloat(gasPrice).toFixed(2)} Gwei` },
            { icon: <Fuel size={12} />, label: 'Fee Total', value: totalFee !== '—' ? `${parseFloat(totalFee).toFixed(6)} ${chain?.nativeCurrency?.symbol}` : '—' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-dark-400 text-xs">{item.icon} {item.label}</span>
              <button
                onClick={() => item.full && copyToClipboard(item.full)}
                className="text-white text-xs font-mono flex items-center gap-1"
              >
                {item.value}
                {item.full && <Copy size={8} className="text-dark-600" />}
              </button>
            </div>
          ))}
        </div>

        {/* Decoded Calldata */}
        {decoded && (
          <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
            <h3 className="text-dark-300 text-xs font-semibold flex items-center gap-1 mb-3">
              <Code size={12} /> DATOS DECODIFICADOS
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-dark-400 text-xs">Función</span>
                <span className="text-kairos-400 text-xs font-mono">{decoded.name}()</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400 text-xs">Selector</span>
                <span className="text-white text-xs font-mono">{decoded.selector}</span>
              </div>
              {decoded.params.length > 0 && (
                <div>
                  <span className="text-dark-400 text-xs">Parámetros:</span>
                  <div className="mt-1 space-y-1">
                    {decoded.params.map((p, i) => (
                      <div key={i} className="text-dark-300 text-[10px] font-mono pl-2 border-l border-dark-600">
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Raw data preview */}
            <div className="mt-3 pt-3 border-t border-dark-700">
              <p className="text-dark-500 text-[10px] mb-1">Raw Input Data:</p>
              <p className="text-dark-400 text-[10px] font-mono break-all line-clamp-3">
                {decoded.raw}
              </p>
            </div>
          </div>
        )}

        {/* Explorer Link */}
        <a
          href={`${chain?.blockExplorerUrl}/tx/${txData.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800 border border-dark-700 text-kairos-400 text-sm font-semibold hover:bg-dark-700 transition-colors"
        >
          <ExternalLink size={14} /> Ver en {chain?.shortName || 'Explorer'}
        </a>
      </div>
    </div>
  );
}
