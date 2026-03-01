// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Safe Management Screen
//  View & manage your Gnosis Safe multisig wallet
//  Shows info, balances, owners, and can execute txs
// ═══════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Users, RefreshCw, Copy, Check,
  ExternalLink, Send, ChevronRight, Info, Lock,
  Wallet, AlertTriangle, Hash, Layers, Plus, Loader2, Key,
} from 'lucide-react';
import { ethers } from 'ethers';
import { useStore } from '../../store/useStore';
import { formatAddress, unlockVault } from '../../services/wallet';

// ── Safe Constants ──
const SAFE_ADDRESS = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';
const RELAYER_ADDRESS = '0xCee44904A6aA94dEa28754373887E07D4B6f4968'; // Backend relayer for auto mint/burn
const SAFE_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'function VERSION() view returns (string)',
  'function isOwner(address) view returns (bool)',
];

const BSC_RPCS = [
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-rpc.publicnode.com',
  'https://rpc.ankr.com/bsc',
];

const KAIROS_ADDRESS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';

// ── Raw RPC call helper ──
async function rpcCall(method, params) {
  for (const rpc of BSC_RPCS) {
    try {
      const resp = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
      });
      const json = await resp.json();
      if (json.result !== undefined) return json.result;
    } catch { continue; }
  }
  return null;
}

// ── ethCall helper ──
async function ethCall(to, data) {
  return rpcCall('eth_call', [{ to, data }, 'latest']);
}

// ── Decode address[] from ABI response ──
function decodeAddressArray(hex) {
  if (!hex || hex === '0x') return [];
  // Skip 0x + offset (64) + length (64), then each address is 64 chars padded
  const clean = hex.slice(2);
  const count = parseInt(clean.slice(64, 128), 16);
  const addrs = [];
  for (let i = 0; i < count; i++) {
    const start = 128 + (i * 64);
    addrs.push('0x' + clean.slice(start + 24, start + 64));
  }
  return addrs;
}

// ── Decode uint256 ──
function decodeUint(hex) {
  if (!hex || hex === '0x') return 0;
  return parseInt(hex, 16);
}

// ── Decode string ──
function decodeString(hex) {
  if (!hex || hex === '0x') return '';
  const clean = hex.slice(2);
  const offset = parseInt(clean.slice(0, 64), 16) * 2;
  const length = parseInt(clean.slice(offset, offset + 64), 16);
  const strHex = clean.slice(offset + 64, offset + 64 + length * 2);
  let str = '';
  for (let i = 0; i < strHex.length; i += 2) {
    str += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16));
  }
  return str;
}

// ── Function selectors ──
const SEL = {
  getOwners: '0xa0e67e2b',
  getThreshold: '0xe75235b8',
  nonce: '0xaffed0e0',
  VERSION: '0xffa1ad74',
  isOwner: '0x2f54bf6e',
  balanceOf: '0x70a08231',
};

function padAddress(addr) {
  return '0x' + addr.slice(2).toLowerCase().padStart(64, '0');
}

export default function SafeScreen() {
  const { navigate, activeAddress, showToast, getActiveAccount } = useStore();

  const [loading, setLoading] = useState(true);
  const [safeInfo, setSafeInfo] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // Add owner state
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [addOwnerPassword, setAddOwnerPassword] = useState('');
  const [addOwnerLoading, setAddOwnerLoading] = useState(false);
  const [addOwnerError, setAddOwnerError] = useState('');
  const [addOwnerTx, setAddOwnerTx] = useState(null);

  const loadSafeInfo = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all info in parallel using raw RPC
      const [ownersHex, thresholdHex, nonceHex, versionHex, bnbHex, kairosHex, isOwnerHex] = await Promise.all([
        ethCall(SAFE_ADDRESS, SEL.getOwners),
        ethCall(SAFE_ADDRESS, SEL.getThreshold),
        ethCall(SAFE_ADDRESS, SEL.nonce),
        ethCall(SAFE_ADDRESS, SEL.VERSION),
        rpcCall('eth_getBalance', [SAFE_ADDRESS, 'latest']),
        ethCall(KAIROS_ADDRESS, SEL.balanceOf + padAddress(SAFE_ADDRESS).slice(2)),
        activeAddress ? ethCall(SAFE_ADDRESS, SEL.isOwner + padAddress(activeAddress).slice(2)) : Promise.resolve('0x0'),
      ]);

      const owners = decodeAddressArray(ownersHex);
      const threshold = decodeUint(thresholdHex);
      const nonce = decodeUint(nonceHex);
      const version = decodeString(versionHex);
      const bnbBalance = bnbHex ? parseInt(bnbHex, 16) / 1e18 : 0;
      const kairosBalance = kairosHex && kairosHex !== '0x' && kairosHex !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        ? Number(BigInt(kairosHex)) / 1e18
        : 0;
      const ownerCheck = isOwnerHex && isOwnerHex !== '0x' ? decodeUint(isOwnerHex) === 1 : false;

      setSafeInfo({ owners, threshold, nonce, version, bnbBalance, kairosBalance });
      setIsOwner(ownerCheck);
    } catch (err) {
      console.error('Failed to load Safe info:', err);
      showToast('Error cargando info del Safe', 'error');
    }
    setLoading(false);
  }, [activeAddress, showToast]);

  useEffect(() => {
    loadSafeInfo();
  }, [loadSafeInfo]);

  const copyAddress = () => {
    navigator.clipboard?.writeText(SAFE_ADDRESS);
    setHasCopied(true);
    showToast('Dirección del Safe copiada', 'success');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const openExplorer = () => {
    window.open(`https://bscscan.com/address/${SAFE_ADDRESS}`, '_blank');
  };

  // ── Add Relayer as Safe Owner ──
  const handleAddRelayer = async () => {
    setAddOwnerError('');
    setAddOwnerTx(null);

    // 1. Verify password & get private key
    let vault;
    try {
      vault = await unlockVault(addOwnerPassword);
    } catch {
      setAddOwnerError('Contraseña incorrecta');
      return;
    }

    const account = vault.accounts?.find(a => a.address.toLowerCase() === activeAddress.toLowerCase())
      || vault.importedAccounts?.find(a => a.address.toLowerCase() === activeAddress.toLowerCase());
    if (!account?.privateKey) {
      setAddOwnerError('No se encontró la clave privada de esta wallet');
      return;
    }

    setAddOwnerLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
      const signer = new ethers.Wallet(account.privateKey, provider);

      const SAFE_EXEC_ABI = [
        'function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
        'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) returns (bool)',
        'function nonce() view returns (uint256)',
      ];
      const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_EXEC_ABI, signer);

      // 2. Encode addOwnerWithThreshold(relayer, 1) — keep threshold at 1
      const addOwnerData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [RELAYER_ADDRESS, 1]
      );
      const addOwnerCalldata = '0x0d582f13' + addOwnerData.slice(2); // addOwnerWithThreshold selector

      // 3. Get nonce & compute Safe TX hash
      const nonce = await safe.nonce();
      const safeTxHash = await safe.getTransactionHash(
        SAFE_ADDRESS, // to (self-call)
        0,            // value
        addOwnerCalldata,
        0,            // CALL
        0, 0, 0,      // gas params
        ethers.ZeroAddress, ethers.ZeroAddress,
        nonce
      );

      // 4. Sign (eth_sign style: v += 4)
      const sig = ethers.getBytes(await signer.signMessage(ethers.getBytes(safeTxHash)));
      sig[64] += 4;
      const adjustedSig = ethers.hexlify(sig);

      // 5. Execute
      const tx = await safe.execTransaction(
        SAFE_ADDRESS,
        0,
        addOwnerCalldata,
        0,
        0, 0, 0,
        ethers.ZeroAddress, ethers.ZeroAddress,
        adjustedSig,
        { gasLimit: 200000 }
      );

      setAddOwnerTx(tx.hash);
      showToast('Transacción enviada...', 'success');

      await tx.wait();
      showToast('Relayer agregado como owner', 'success');
      setShowAddOwner(false);
      setAddOwnerPassword('');
      loadSafeInfo(); // Refresh
    } catch (err) {
      console.error('addOwner error:', err);
      setAddOwnerError(err.reason || err.message || 'Error desconocido');
    }
    setAddOwnerLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-dark-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={() => navigate('dashboard')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield size={20} className="text-kairos-400" />
            Gnosis Safe
          </h1>
          <p className="text-xs text-dark-400">Multisig Wallet · BSC</p>
        </div>
        <button
          onClick={loadSafeInfo}
          className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 transition ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={16} className="text-dark-300" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
        {loading && !safeInfo ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={32} className="text-kairos-400 animate-spin mb-4" />
            <p className="text-dark-400 text-sm">Cargando Safe...</p>
          </div>
        ) : safeInfo ? (
          <>
            {/* Safe Address Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-kairos-500/10 to-kairos-600/5 rounded-2xl p-4 border border-kairos-500/20"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-kairos-400 uppercase tracking-wider">Safe Address</span>
                <span className="text-[10px] bg-kairos-500/20 text-kairos-400 px-2 py-0.5 rounded-full">
                  v{safeInfo.version}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-white flex-1 break-all">
                  {SAFE_ADDRESS}
                </p>
                <button onClick={copyAddress} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 shrink-0">
                  {hasCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-dark-300" />}
                </button>
                <button onClick={openExplorer} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 shrink-0">
                  <ExternalLink size={14} className="text-dark-300" />
                </button>
              </div>
            </motion.div>

            {/* Owner Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={`rounded-2xl p-4 border ${
                isOwner
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-yellow-500/5 border-yellow-500/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {isOwner ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Check size={20} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-400">Eres owner de este Safe</p>
                      <p className="text-xs text-dark-400">Puedes aprobar y ejecutar transacciones</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <AlertTriangle size={20} className="text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-yellow-400">No eres owner</p>
                      <p className="text-xs text-dark-400">Tu wallet actual no es owner del Safe</p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Balances */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/[0.03] rounded-2xl p-4 border border-white/5"
            >
              <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wallet size={14} />
                Balances del Safe
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-yellow-400">BNB</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">BNB</p>
                      <p className="text-[10px] text-dark-400">Native</p>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-white">{safeInfo.bnbBalance.toFixed(4)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-kairos-500/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-kairos-400">K</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">KAIROS</p>
                      <p className="text-[10px] text-dark-400">≈ ${safeInfo.kairosBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-white">{safeInfo.kairosBalance.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            {/* Safe Details */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/[0.03] rounded-2xl p-4 border border-white/5"
            >
              <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info size={14} />
                Detalles
              </h3>
              <div className="space-y-3">
                <DetailRow icon={Hash} label="Nonce (TXs ejecutadas)" value={safeInfo.nonce.toString()} />
                <DetailRow icon={Lock} label="Threshold" value={`${safeInfo.threshold} de ${safeInfo.owners.length}`} />
                <DetailRow icon={Layers} label="Red" value="BNB Smart Chain" />
                <DetailRow icon={Shield} label="Tipo" value={`Safe v${safeInfo.version}`} />
              </div>
            </motion.div>

            {/* Owners */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/[0.03] rounded-2xl p-4 border border-white/5"
            >
              <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={14} />
                Owners ({safeInfo.owners.length})
              </h3>
              <div className="space-y-2">
                {safeInfo.owners.map((owner, i) => {
                  const isYou = activeAddress && owner.toLowerCase() === activeAddress.toLowerCase();
                  return (
                    <div
                      key={owner}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        isYou ? 'bg-kairos-500/10 border border-kairos-500/20' : 'bg-white/[0.02]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isYou ? 'bg-kairos-500/20' : 'bg-white/5'
                      }`}>
                        <Users size={14} className={isYou ? 'text-kairos-400' : 'text-dark-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-white truncate">{owner}</p>
                        {isYou && <p className="text-[10px] text-kairos-400 font-medium">Tú</p>}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(owner);
                          showToast('Dirección copiada', 'success');
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 shrink-0"
                      >
                        <Copy size={12} className="text-dark-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Add Relayer Button — only show if relayer is not already an owner */}
            {isOwner && safeInfo && !safeInfo.owners.some(o => o.toLowerCase() === RELAYER_ADDRESS.toLowerCase()) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                {!showAddOwner ? (
                  <button
                    onClick={() => setShowAddOwner(true)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-kairos-500/10 border border-kairos-500/20 hover:bg-kairos-500/20 transition"
                  >
                    <div className="w-10 h-10 rounded-xl bg-kairos-500/20 flex items-center justify-center">
                      <Plus size={20} className="text-kairos-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-kairos-400">Agregar Relayer Automático</p>
                      <p className="text-[10px] text-dark-400">Permite mint/burn automático desde el backend</p>
                    </div>
                    <ChevronRight size={16} className="text-kairos-400" />
                  </button>
                ) : (
                  <div className="rounded-2xl bg-white/[0.03] border border-kairos-500/20 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Key size={14} className="text-kairos-400" />
                      Agregar Relayer como Owner #2
                    </h3>
                    <p className="text-[10px] text-dark-400">
                      Esto agregará la wallet del backend ({formatAddress(RELAYER_ADDRESS)}) como segundo owner del Safe.
                      El backend podrá hacer mint/burn automático. Tú puedes quitarlo en cualquier momento.
                    </p>
                    <input
                      type="password"
                      placeholder="Contraseña del wallet"
                      value={addOwnerPassword}
                      onChange={e => setAddOwnerPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-kairos-500/50"
                    />
                    {addOwnerError && (
                      <p className="text-xs text-red-400">{addOwnerError}</p>
                    )}
                    {addOwnerTx && (
                      <a
                        href={`https://bscscan.com/tx/${addOwnerTx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-kairos-400 underline block"
                      >
                        Ver TX en BscScan →
                      </a>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowAddOwner(false); setAddOwnerError(''); setAddOwnerPassword(''); }}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 text-dark-300 text-sm hover:bg-white/10 transition"
                        disabled={addOwnerLoading}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddRelayer}
                        disabled={!addOwnerPassword || addOwnerLoading}
                        className="flex-1 py-2.5 rounded-xl bg-kairos-500 text-dark-950 text-sm font-semibold hover:bg-kairos-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {addOwnerLoading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Firmando...
                          </>
                        ) : (
                          'Confirmar'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Relayer already added indicator */}
            {safeInfo && safeInfo.owners.some(o => o.toLowerCase() === RELAYER_ADDRESS.toLowerCase()) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="rounded-2xl bg-green-500/5 border border-green-500/20 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Check size={20} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-400">Relayer Activo</p>
                    <p className="text-[10px] text-dark-400">Mint/burn automático habilitado</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Admin Panel Button */}
            {isOwner && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
              >
                <button
                  onClick={() => navigate('admin')}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-kairos-500/20 to-purple-500/20 border border-kairos-500/30 hover:from-kairos-500/30 hover:to-purple-500/30 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-kairos-500/20 flex items-center justify-center">
                    <Shield size={20} className="text-kairos-400" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold text-kairos-400">Admin Panel</p>
                    <p className="text-[10px] text-dark-400">Mint, Burn, Pausar, Blacklist, Fees y más</p>
                  </div>
                  <ChevronRight size={16} className="text-kairos-400" />
                </button>
              </motion.div>
            )}

            {/* Security Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/10"
            >
              <h3 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-2">
                <Shield size={14} />
                ¿Qué es un Safe?
              </h3>
              <p className="text-xs text-dark-400 leading-relaxed">
                Un Gnosis Safe es una billetera multifirma en la blockchain. Funciona como una 
                caja fuerte digital: para mover fondos o ejecutar operaciones, se necesitan las 
                firmas de los owners (actualmente {safeInfo.threshold} de {safeInfo.owners.length}).
                Esto protege contra hackeos porque incluso si alguien consigue una clave privada, 
                no puede actuar sin las firmas necesarias.
              </p>
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] text-dark-500">🔒 Tu Safe se controla SOLO desde tu wallet</p>
                <p className="text-[10px] text-dark-500">🛡️ Contratos auditados por la comunidad Safe</p>
                <p className="text-[10px] text-dark-500">📱 Las claves se guardan en tu teléfono, no en servidores</p>
              </div>
            </motion.div>

            {/* BscScan Link */}
            <button
              onClick={openExplorer}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition"
            >
              <ExternalLink size={14} className="text-kairos-400" />
              <span className="text-sm text-kairos-400">Ver en BscScan</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle size={32} className="text-red-400 mb-4" />
            <p className="text-dark-400 text-sm">Error al cargar el Safe</p>
            <button
              onClick={loadSafeInfo}
              className="mt-3 px-4 py-2 rounded-xl bg-kairos-500/10 text-kairos-400 text-sm"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-dark-500" />
        <span className="text-xs text-dark-400">{label}</span>
      </div>
      <span className="text-xs font-medium text-white">{value}</span>
    </div>
  );
}
