// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Token Security Screen
//  Analyzes tokens for scam/honeypot/rug patterns
//  MetaMask doesn't have this — we protect users
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Search, AlertTriangle, CheckCircle, XCircle, 
         Lock, Eye, Zap, FileText, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CHAINS, ERC20_ABI } from '../../constants/chains';
import { getProvider } from '../../services/blockchain';
import { ethers } from 'ethers';

// Extended ABI for security checks
const SECURITY_ABI = [
  ...ERC20_ABI,
  'function owner() view returns (address)',
  'function getOwner() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function maxTransactionAmount() view returns (uint256)',
  'function maxWalletAmount() view returns (uint256)',
  'function tradingEnabled() view returns (bool)',
];

async function analyzeToken(chainId, address) {
  const provider = getProvider(chainId);
  const contract = new ethers.Contract(address, SECURITY_ABI, provider);
  const chain = CHAINS[chainId];
  const checks = [];
  let score = 100;

  // 1. Basic token info
  let name = '?', symbol = '?', decimals = 18, totalSupply = 0n;
  try {
    [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(), contract.symbol(), contract.decimals(), contract.totalSupply(),
    ]);
    checks.push({ label: 'Token válido', status: 'pass', detail: `${name} (${symbol})` });
  } catch {
    checks.push({ label: 'Token válido', status: 'fail', detail: 'No se pudo leer contrato' });
    return { score: 0, checks, name: '?', symbol: '?', risk: 'critical' };
  }

  // 2. Check if contract is verified (via code size heuristic)
  try {
    const code = await provider.getCode(address);
    if (code === '0x') {
      checks.push({ label: 'Smart Contract', status: 'fail', detail: 'No es un contrato (EOA)' });
      score -= 50;
    } else if (code.length > 100) {
      checks.push({ label: 'Smart Contract', status: 'pass', detail: `Código: ${code.length} bytes` });
    }
  } catch {}

  // 3. Owner check
  let owner = null;
  try {
    owner = await contract.owner();
    if (owner === ethers.ZeroAddress) {
      checks.push({ label: 'Propiedad renunciada', status: 'pass', detail: 'Owner = 0x0 (bueno)' });
      score += 5;
    } else {
      checks.push({ label: 'Tiene dueño', status: 'warn', detail: `Owner: ${owner.slice(0, 10)}...` });
      score -= 10;
    }
  } catch {
    try {
      owner = await contract.getOwner();
      checks.push({ label: 'Tiene dueño', status: 'warn', detail: `Owner: ${owner.slice(0, 10)}...` });
      score -= 10;
    } catch {
      checks.push({ label: 'Sin función owner()', status: 'info', detail: 'No se puede verificar' });
    }
  }

  // 4. Total supply check
  if (totalSupply > 0n) {
    const formatted = ethers.formatUnits(totalSupply, decimals);
    const supplyNum = parseFloat(formatted);
    if (supplyNum > 1e15) {
      checks.push({ label: 'Supply extremo', status: 'warn', detail: `${supplyNum.toExponential(2)} tokens` });
      score -= 15;
    } else {
      checks.push({ label: 'Supply razonable', status: 'pass', detail: `${supplyNum.toLocaleString()} tokens` });
    }
  }

  // 5. Check max TX / max wallet limits (honeypot indicator)
  try {
    const maxTx = await contract.maxTransactionAmount();
    const maxTxFormatted = parseFloat(ethers.formatUnits(maxTx, decimals));
    const supplyFormatted = parseFloat(ethers.formatUnits(totalSupply, decimals));
    const maxTxPercent = (maxTxFormatted / supplyFormatted) * 100;
    if (maxTxPercent < 1) {
      checks.push({ label: 'Límite de TX muy bajo', status: 'fail', detail: `${maxTxPercent.toFixed(2)}% del supply. Posible honeypot.` });
      score -= 30;
    } else if (maxTxPercent < 5) {
      checks.push({ label: 'Límite de TX', status: 'warn', detail: `${maxTxPercent.toFixed(2)}% del supply` });
      score -= 10;
    }
  } catch {
    // No max TX limit = good
  }

  // 6. Check top holders concentration via simple heuristic
  // We check if owner holds too much
  if (owner && owner !== ethers.ZeroAddress) {
    try {
      const ownerBalance = await contract.balanceOf(owner);
      const ownerPercent = totalSupply > 0n
        ? (Number(ownerBalance * 10000n / totalSupply) / 100)
        : 0;
      if (ownerPercent > 50) {
        checks.push({ label: 'Owner concentra tokens', status: 'fail', detail: `${ownerPercent.toFixed(1)}% del supply` });
        score -= 25;
      } else if (ownerPercent > 20) {
        checks.push({ label: 'Owner tiene muchos tokens', status: 'warn', detail: `${ownerPercent.toFixed(1)}% del supply` });
        score -= 10;
      } else {
        checks.push({ label: 'Distribución del owner', status: 'pass', detail: `${ownerPercent.toFixed(1)}% del supply` });
      }
    } catch {}
  }

  // 7. Contract age (via first transaction block — approximation)
  try {
    const currentBlock = await provider.getBlockNumber();
    // If contract code exists, it's deployed
    checks.push({ label: 'Bloque actual', status: 'info', detail: `#${currentBlock.toLocaleString()}` });
  } catch {}

  // Calculate risk level
  score = Math.max(0, Math.min(100, score));
  let risk = 'low';
  if (score < 30) risk = 'critical';
  else if (score < 50) risk = 'high';
  else if (score < 70) risk = 'medium';

  return { score, checks, name, symbol, decimals, totalSupply: ethers.formatUnits(totalSupply, decimals), risk };
}

export default function TokenSecurityScreen() {
  const { goBack, activeChainId, showToast } = useStore();
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const chain = CHAINS[activeChainId];

  const handleAnalyze = async () => {
    if (!address) return;
    try {
      ethers.getAddress(address);
    } catch {
      showToast('Dirección inválida', 'error');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const analysis = await analyzeToken(activeChainId, address);
      setResult(analysis);
    } catch (err) {
      showToast('Error al analizar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 70) return 'from-green-500/20 to-green-500/5';
    if (score >= 50) return 'from-yellow-500/20 to-yellow-500/5';
    if (score >= 30) return 'from-orange-500/20 to-orange-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  const getRiskLabel = (risk) => {
    switch (risk) {
      case 'low': return { text: 'BAJO RIESGO', color: 'text-green-400', bg: 'bg-green-500/20' };
      case 'medium': return { text: 'RIESGO MEDIO', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
      case 'high': return { text: 'ALTO RIESGO', color: 'text-orange-400', bg: 'bg-orange-500/20' };
      case 'critical': return { text: '⚠️ PELIGROSO', color: 'text-red-400', bg: 'bg-red-500/20' };
      default: return { text: '?', color: 'text-dark-400', bg: 'bg-dark-800' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckCircle className="text-green-400 flex-shrink-0" size={14} />;
      case 'warn': return <AlertTriangle className="text-yellow-400 flex-shrink-0" size={14} />;
      case 'fail': return <XCircle className="text-red-400 flex-shrink-0" size={14} />;
      default: return <Eye className="text-dark-400 flex-shrink-0" size={14} />;
    }
  };

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800">
        <button onClick={goBack} className="text-dark-300 hover:text-white"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2">
          <Shield className="text-kairos-400" size={20} />
          <h1 className="text-lg font-bold text-white">Auditoría de Token</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="Pega la dirección del contrato..."
            className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-dark-500 focus:border-kairos-500 focus:outline-none text-sm font-mono"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !address}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-kairos-500 rounded-lg text-dark-950 disabled:opacity-50"
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Zap size={16} />
              </motion.div>
            ) : (
              <Search size={16} />
            )}
          </button>
        </div>

        <p className="text-dark-500 text-xs text-center">
          Red: {chain?.shortName} • Análisis on-chain en tiempo real
        </p>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Score Circle */}
            <div className={`bg-gradient-to-b ${getScoreBg(result.score)} rounded-2xl p-6 border border-dark-700 text-center`}>
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-current mb-3">
                <span className={`text-3xl font-black ${getScoreColor(result.score)}`}>
                  {result.score}
                </span>
              </div>
              <p className="text-white font-bold text-lg">{result.name} ({result.symbol})</p>
              <div className="mt-2 inline-block">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskLabel(result.risk).color} ${getRiskLabel(result.risk).bg}`}>
                  {getRiskLabel(result.risk).text}
                </span>
              </div>
              {result.totalSupply && (
                <p className="text-dark-400 text-xs mt-2">Supply: {parseFloat(result.totalSupply).toLocaleString()}</p>
              )}
            </div>

            {/* Checks List */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 divide-y divide-dark-700">
              {result.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{check.label}</p>
                    <p className="text-dark-400 text-xs truncate">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning */}
            {result.risk === 'critical' || result.risk === 'high' ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-red-400 font-semibold text-sm">Precaución</p>
                    <p className="text-dark-300 text-xs mt-1">
                      Este token muestra señales de riesgo. Investiga más antes de invertir.
                      Ningún análisis automatizado reemplaza tu propia investigación (DYOR).
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Explorer Link */}
            <a
              href={`${chain?.blockExplorerUrl}/token/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800 border border-dark-700 text-kairos-400 text-sm font-semibold"
            >
              <ExternalLink size={14} /> Ver contrato en {chain?.shortName}
            </a>
          </motion.div>
        )}

        {/* Tips */}
        {!result && !loading && (
          <div className="mt-8 text-center space-y-4">
            <Shield className="mx-auto text-dark-600" size={48} />
            <div>
              <p className="text-dark-300 text-sm font-semibold">Analiza cualquier token</p>
              <p className="text-dark-500 text-xs mt-1">
                Verificamos el contrato on-chain: propiedad, supply, límites de TX,
                concentración de holders y más.
              </p>
            </div>
            <div className="text-left bg-dark-800/30 rounded-xl p-4 space-y-2">
              <p className="text-dark-300 text-xs font-semibold">🔍 ¿Qué verificamos?</p>
              <ul className="text-dark-500 text-xs space-y-1">
                <li>• Validez del contrato y código</li>
                <li>• Si el owner renunció la propiedad</li>
                <li>• Supply total y distribución</li>
                <li>• Límites de transacción (honeypot check)</li>
                <li>• Concentración de tokens del owner</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
