// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Token Admin Panel
//  Full admin control: Mint, Burn, Pause, Blacklist, Fees,
//  Transfer, BatchTransfer, etc. All through Gnosis Safe.
// ═══════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Shield, RefreshCw, Copy, Check, ExternalLink,
  Plus, Minus, Pause, Play, Ban, UserCheck, Settings,
  Send, DollarSign, Loader2, Lock, Unlock, AlertTriangle,
  Percent, Wallet, Coins, Flame, Eye, Users, X,
} from 'lucide-react';
import { ethers } from 'ethers';
import { useStore } from '../../store/useStore';
import { unlockVault } from '../../services/wallet';

// ── Constants ──
const SAFE_ADDRESS = '0xC84f261c7e7Cffdf3e9972faD88cE59400d5E5A8';
const KAIROS_ADDRESS = '0x14D41707269c7D8b8DFa5095b38824a46dA05da3';

const BSC_RPCS = [
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-rpc.publicnode.com',
];

const SAFE_ABI = [
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)',
  'function nonce() view returns (uint256)',
  'function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
  'function isOwner(address) view returns (bool)',
];

const TOKEN_ABI = [
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
  'function pause()',
  'function unpause()',
  'function blacklist(address account)',
  'function unBlacklist(address account)',
  'function setFeeBps(uint256 newFeeBps)',
  'function setReserveWallet(address newReserveWallet)',
  'function setFeeExempt(address account, bool exempt)',
  'function setMintCap(uint256 newCap)',
  'function setBurnCap(uint256 newCap)',
  'function transferOwnership(address newOwner)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function batchTransfer(address[] recipients, uint256[] amounts)',
  // View functions
  'function totalSupply() view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function totalBurned() view returns (uint256)',
  'function totalFeesCollected() view returns (uint256)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)',
  'function feeBps() view returns (uint256)',
  'function mintCap() view returns (uint256)',
  'function burnCap() view returns (uint256)',
  'function reserveWallet() view returns (address)',
  'function balanceOf(address) view returns (uint256)',
  'function isBlacklisted(address) view returns (bool)',
  'function feeExempt(address) view returns (bool)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];

// ── Provider helper ──
function getProvider() {
  return new ethers.JsonRpcProvider(BSC_RPCS[0]);
}

function getReadOnlyToken() {
  return new ethers.Contract(KAIROS_ADDRESS, TOKEN_ABI, getProvider());
}

// ── ADMIN SECTIONS ──
const SECTIONS = [
  { id: 'overview', icon: Eye, label: 'Resumen', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'mint', icon: Plus, label: 'Mint', color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'burn', icon: Flame, label: 'Burn', color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'transfer', icon: Send, label: 'Enviar', color: 'text-kairos-400', bg: 'bg-kairos-500/10' },
  { id: 'pause', icon: Pause, label: 'Pausar', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'blacklist', icon: Ban, label: 'Blacklist', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'fees', icon: Percent, label: 'Comisiones', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'caps', icon: Lock, label: 'Límites', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'settings', icon: Settings, label: 'Config', color: 'text-pink-400', bg: 'bg-pink-500/10' },
];

export default function AdminPanel() {
  const { navigate, activeAddress, showToast, getActiveAccount } = useStore();

  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [txError, setTxError] = useState('');
  const [password, setPassword] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  // Form fields
  const [mintTo, setMintTo] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [burnFrom, setBurnFrom] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [blacklistAddr, setBlacklistAddr] = useState('');
  const [checkAddr, setCheckAddr] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [newFeeBps, setNewFeeBps] = useState('');
  const [feeExemptAddr, setFeeExemptAddr] = useState('');
  const [feeExemptValue, setFeeExemptValue] = useState(true);
  const [newMintCap, setNewMintCap] = useState('');
  const [newBurnCap, setNewBurnCap] = useState('');
  const [newReserveWallet, setNewReserveWallet] = useState('');

  // ── Load token info ──
  const loadTokenInfo = useCallback(async () => {
    setLoading(true);
    try {
      const token = getReadOnlyToken();
      const provider = getProvider();
      const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);

      const [
        totalSupply, totalMinted, totalBurned, totalFees,
        owner, paused, feeBps, mintCap, burnCap, reserveWallet,
        safeBalance, ownerIsOwner,
      ] = await Promise.all([
        token.totalSupply(),
        token.totalMinted(),
        token.totalBurned(),
        token.totalFeesCollected(),
        token.owner(),
        token.paused(),
        token.feeBps(),
        token.mintCap(),
        token.burnCap(),
        token.reserveWallet(),
        token.balanceOf(SAFE_ADDRESS),
        activeAddress ? safe.isOwner(activeAddress) : Promise.resolve(false),
      ]);

      setTokenInfo({
        totalSupply: ethers.formatUnits(totalSupply, 18),
        totalMinted: ethers.formatUnits(totalMinted, 18),
        totalBurned: ethers.formatUnits(totalBurned, 18),
        totalFees: ethers.formatUnits(totalFees, 18),
        owner,
        paused,
        feeBps: Number(feeBps),
        mintCap: ethers.formatUnits(mintCap, 18),
        burnCap: ethers.formatUnits(burnCap, 18),
        reserveWallet,
        safeBalance: ethers.formatUnits(safeBalance, 18),
      });
      setIsOwner(ownerIsOwner);
    } catch (err) {
      console.error('Load token info error:', err);
      showToast('Error cargando info del token', 'error');
    }
    setLoading(false);
  }, [activeAddress, showToast]);

  useEffect(() => { loadTokenInfo(); }, [loadTokenInfo]);

  // ── Execute through Safe ──
  const executeSafeTx = async (encodedData, label) => {
    setTxError('');
    setTxResult(null);

    if (!password) { setTxError('Ingresa tu contraseña'); return; }

    let vault;
    try {
      vault = await unlockVault(password);
    } catch {
      setTxError('Contraseña incorrecta');
      return;
    }

    const account = vault.accounts?.find(a => a.address.toLowerCase() === activeAddress.toLowerCase())
      || vault.importedAccounts?.find(a => a.address.toLowerCase() === activeAddress.toLowerCase());
    if (!account?.privateKey) {
      setTxError('No se encontró la clave privada');
      return;
    }

    setTxLoading(true);
    try {
      const provider = getProvider();
      const signer = new ethers.Wallet(account.privateKey, provider);
      const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, signer);

      const nonce = await safe.nonce();
      const safeTxHash = await safe.getTransactionHash(
        KAIROS_ADDRESS, 0, encodedData, 0, 0, 0, 0,
        ethers.ZeroAddress, ethers.ZeroAddress, nonce
      );

      const rawSig = await signer.signMessage(ethers.getBytes(safeTxHash));
      const sigBytes = ethers.getBytes(rawSig);
      sigBytes[64] += 4;
      const signature = ethers.hexlify(sigBytes);

      const tx = await safe.execTransaction(
        KAIROS_ADDRESS, 0, encodedData, 0, 0, 0, 0,
        ethers.ZeroAddress, ethers.ZeroAddress, signature,
        { gasLimit: 500000n, gasPrice: ethers.parseUnits('3', 'gwei') }
      );

      showToast(`${label}: TX enviada...`, 'success');
      const receipt = await tx.wait(1);

      setTxResult({
        hash: receipt.hash,
        block: receipt.blockNumber,
        gas: receipt.gasUsed.toString(),
      });
      showToast(`${label} exitoso ✓`, 'success');
      setPassword('');

      // Refresh data
      setTimeout(() => loadTokenInfo(), 2000);
    } catch (err) {
      console.error(`${label} error:`, err);
      setTxError(err.reason || err.shortMessage || err.message || 'Error desconocido');
    }
    setTxLoading(false);
  };

  // ── Encode & Execute helpers ──
  const iface = new ethers.Interface(TOKEN_ABI);

  const handleMint = () => {
    if (!ethers.isAddress(mintTo)) { setTxError('Dirección inválida'); return; }
    if (!mintAmount || isNaN(mintAmount) || Number(mintAmount) <= 0) { setTxError('Cantidad inválida'); return; }
    const data = iface.encodeFunctionData('mint', [mintTo, ethers.parseUnits(mintAmount, 18)]);
    executeSafeTx(data, 'Mint');
  };

  const handleBurn = () => {
    if (!ethers.isAddress(burnFrom)) { setTxError('Dirección inválida'); return; }
    if (!burnAmount || isNaN(burnAmount) || Number(burnAmount) <= 0) { setTxError('Cantidad inválida'); return; }
    const data = iface.encodeFunctionData('burn', [burnFrom, ethers.parseUnits(burnAmount, 18)]);
    executeSafeTx(data, 'Burn');
  };

  const handleSend = () => {
    if (!ethers.isAddress(sendTo)) { setTxError('Dirección inválida'); return; }
    if (!sendAmount || isNaN(sendAmount) || Number(sendAmount) <= 0) { setTxError('Cantidad inválida'); return; }
    const data = iface.encodeFunctionData('transfer', [sendTo, ethers.parseUnits(sendAmount, 18)]);
    executeSafeTx(data, 'Transfer');
  };

  const handlePause = () => {
    const data = iface.encodeFunctionData('pause', []);
    executeSafeTx(data, 'Pause');
  };

  const handleUnpause = () => {
    const data = iface.encodeFunctionData('unpause', []);
    executeSafeTx(data, 'Unpause');
  };

  const handleBlacklist = () => {
    if (!ethers.isAddress(blacklistAddr)) { setTxError('Dirección inválida'); return; }
    const data = iface.encodeFunctionData('blacklist', [blacklistAddr]);
    executeSafeTx(data, 'Blacklist');
  };

  const handleUnblacklist = () => {
    if (!ethers.isAddress(blacklistAddr)) { setTxError('Dirección inválida'); return; }
    const data = iface.encodeFunctionData('unBlacklist', [blacklistAddr]);
    executeSafeTx(data, 'Unblacklist');
  };

  const handleSetFee = () => {
    if (!newFeeBps || isNaN(newFeeBps) || Number(newFeeBps) < 0 || Number(newFeeBps) > 100) {
      setTxError('Fee inválido (0-100 bps)'); return;
    }
    const data = iface.encodeFunctionData('setFeeBps', [Number(newFeeBps)]);
    executeSafeTx(data, 'Set Fee');
  };

  const handleSetFeeExempt = () => {
    if (!ethers.isAddress(feeExemptAddr)) { setTxError('Dirección inválida'); return; }
    const data = iface.encodeFunctionData('setFeeExempt', [feeExemptAddr, feeExemptValue]);
    executeSafeTx(data, feeExemptValue ? 'Fee Exempt' : 'Remove Fee Exempt');
  };

  const handleSetMintCap = () => {
    const val = newMintCap === '' || newMintCap === '0' ? '0' : newMintCap;
    const data = iface.encodeFunctionData('setMintCap', [ethers.parseUnits(val, 18)]);
    executeSafeTx(data, 'Set Mint Cap');
  };

  const handleSetBurnCap = () => {
    const val = newBurnCap === '' || newBurnCap === '0' ? '0' : newBurnCap;
    const data = iface.encodeFunctionData('setBurnCap', [ethers.parseUnits(val, 18)]);
    executeSafeTx(data, 'Set Burn Cap');
  };

  const handleSetReserveWallet = () => {
    if (!ethers.isAddress(newReserveWallet)) { setTxError('Dirección inválida'); return; }
    const data = iface.encodeFunctionData('setReserveWallet', [newReserveWallet]);
    executeSafeTx(data, 'Set Reserve Wallet');
  };

  // ── Check address status ──
  const handleCheckAddress = async () => {
    if (!ethers.isAddress(checkAddr)) { setCheckResult({ error: 'Dirección inválida' }); return; }
    try {
      const token = getReadOnlyToken();
      const [balance, blacklisted, exempt] = await Promise.all([
        token.balanceOf(checkAddr),
        token.isBlacklisted(checkAddr),
        token.feeExempt(checkAddr),
      ]);
      setCheckResult({
        balance: ethers.formatUnits(balance, 18),
        blacklisted,
        feeExempt: exempt,
      });
    } catch (err) {
      setCheckResult({ error: err.message });
    }
  };

  // ── RENDER ──
  return (
    <div className="h-full flex flex-col bg-dark-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={() => activeSection ? setActiveSection(null) : navigate('safe')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield size={20} className="text-kairos-400" />
            {activeSection ? SECTIONS.find(s => s.id === activeSection)?.label : 'Admin Panel'}
          </h1>
          <p className="text-xs text-dark-400">
            {activeSection ? 'KairosCoin · BSC' : 'Administración del Token'}
          </p>
        </div>
        <button
          onClick={loadTokenInfo}
          className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 transition ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={16} className="text-dark-300" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
        {loading && !tokenInfo ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="text-kairos-400 animate-spin mb-4" />
            <p className="text-dark-400 text-sm">Cargando datos del token...</p>
          </div>
        ) : !isOwner ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Lock size={40} className="text-red-400 mb-4" />
            <p className="text-white font-semibold mb-1">Acceso Denegado</p>
            <p className="text-dark-400 text-sm text-center">Tu wallet no es owner del Safe. Solo los owners pueden administrar el token.</p>
          </div>
        ) : !activeSection ? (
          /* ═══ SECTION MENU ═══ */
          <>
            {/* Quick Stats */}
            {tokenInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <StatCard label="Supply Total" value={formatNum(tokenInfo.totalSupply)} icon={Coins} color="text-kairos-400" />
                <StatCard label="Minted" value={formatNum(tokenInfo.totalMinted)} icon={Plus} color="text-green-400" />
                <StatCard label="Burned" value={formatNum(tokenInfo.totalBurned)} icon={Flame} color="text-red-400" />
                <StatCard label="Fees" value={formatNum(tokenInfo.totalFees)} icon={DollarSign} color="text-purple-400" />
                <StatCard
                  label="Estado"
                  value={tokenInfo.paused ? '⏸ Pausado' : '▶ Activo'}
                  icon={tokenInfo.paused ? Pause : Play}
                  color={tokenInfo.paused ? 'text-red-400' : 'text-green-400'}
                />
                <StatCard
                  label="Fee"
                  value={`${tokenInfo.feeBps} bps (${(tokenInfo.feeBps / 100).toFixed(2)}%)`}
                  icon={Percent}
                  color="text-purple-400"
                />
              </motion.div>
            )}

            {/* Action Grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <p className="text-xs text-dark-500 uppercase tracking-wider font-medium px-1">Acciones</p>
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => { setActiveSection(section.id); setTxError(''); setTxResult(null); setPassword(''); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition"
                >
                  <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center`}>
                    <section.icon size={20} className={section.color} />
                  </div>
                  <span className="text-sm font-medium text-white flex-1 text-left">{section.label}</span>
                  <ArrowLeft size={14} className="text-dark-500 rotate-180" />
                </button>
              ))}
            </motion.div>
          </>
        ) : (
          /* ═══ ACTIVE SECTION ═══ */
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* ─── OVERVIEW ─── */}
              {activeSection === 'overview' && tokenInfo && (
                <>
                  <InfoCard label="Total Supply" value={`${formatNum(tokenInfo.totalSupply)} KAIROS`} />
                  <InfoCard label="Total Minted" value={`${formatNum(tokenInfo.totalMinted)} KAIROS`} />
                  <InfoCard label="Total Burned" value={`${formatNum(tokenInfo.totalBurned)} KAIROS`} />
                  <InfoCard label="Fees Collected" value={`${formatNum(tokenInfo.totalFees)} KAIROS`} />
                  <InfoCard label="Owner" value={tokenInfo.owner} mono />
                  <InfoCard label="Reserve Wallet" value={tokenInfo.reserveWallet} mono />
                  <InfoCard label="Pausado" value={tokenInfo.paused ? 'Sí ⏸' : 'No ▶'} />
                  <InfoCard label="Fee" value={`${tokenInfo.feeBps} bps (${(tokenInfo.feeBps / 100).toFixed(2)}%)`} />
                  <InfoCard label="Mint Cap" value={tokenInfo.mintCap === '0.0' ? 'Sin límite ∞' : `${formatNum(tokenInfo.mintCap)} KAIROS`} />
                  <InfoCard label="Burn Cap" value={tokenInfo.burnCap === '0.0' ? 'Sin límite ∞' : `${formatNum(tokenInfo.burnCap)} KAIROS`} />
                  <InfoCard label="Balance del Safe" value={`${formatNum(tokenInfo.safeBalance)} KAIROS`} />

                  {/* Check Address */}
                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-3">
                    <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">Consultar Dirección</p>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={checkAddr}
                      onChange={e => setCheckAddr(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 font-mono focus:outline-none focus:border-kairos-500/50"
                    />
                    <button
                      onClick={handleCheckAddress}
                      className="w-full py-2.5 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition"
                    >
                      Consultar
                    </button>
                    {checkResult && !checkResult.error && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs text-dark-300">Balance: <span className="text-white font-mono">{formatNum(checkResult.balance)} KAIROS</span></p>
                        <p className="text-xs text-dark-300">Blacklisted: <span className={checkResult.blacklisted ? 'text-red-400' : 'text-green-400'}>{checkResult.blacklisted ? 'Sí ⛔' : 'No ✓'}</span></p>
                        <p className="text-xs text-dark-300">Fee Exempt: <span className={checkResult.feeExempt ? 'text-green-400' : 'text-dark-400'}>{checkResult.feeExempt ? 'Sí ✓' : 'No'}</span></p>
                      </div>
                    )}
                    {checkResult?.error && <p className="text-xs text-red-400">{checkResult.error}</p>}
                  </div>
                </>
              )}

              {/* ─── MINT ─── */}
              {activeSection === 'mint' && (
                <ActionForm
                  title="Crear Tokens (Mint)"
                  description="Crea nuevos tokens KAIROS y envíalos a cualquier dirección. Esto aumenta el total supply."
                  icon={Plus}
                  iconColor="text-green-400"
                  fields={[
                    { label: 'Dirección destino', value: mintTo, onChange: setMintTo, placeholder: '0x...', mono: true },
                    { label: 'Cantidad (KAIROS)', value: mintAmount, onChange: setMintAmount, placeholder: '1000000', type: 'number' },
                  ]}
                  password={password}
                  setPassword={setPassword}
                  onSubmit={handleMint}
                  submitLabel="Mint Tokens"
                  submitColor="bg-green-500 hover:bg-green-400"
                  loading={txLoading}
                  error={txError}
                  result={txResult}
                />
              )}

              {/* ─── BURN ─── */}
              {activeSection === 'burn' && (
                <ActionForm
                  title="Destruir Tokens (Burn)"
                  description="Destruye tokens KAIROS de cualquier dirección. Esto reduce el total supply."
                  icon={Flame}
                  iconColor="text-red-400"
                  fields={[
                    { label: 'Dirección origen', value: burnFrom, onChange: setBurnFrom, placeholder: '0x...', mono: true },
                    { label: 'Cantidad (KAIROS)', value: burnAmount, onChange: setBurnAmount, placeholder: '1000000', type: 'number' },
                  ]}
                  password={password}
                  setPassword={setPassword}
                  onSubmit={handleBurn}
                  submitLabel="Burn Tokens"
                  submitColor="bg-red-500 hover:bg-red-400"
                  loading={txLoading}
                  error={txError}
                  result={txResult}
                />
              )}

              {/* ─── TRANSFER ─── */}
              {activeSection === 'transfer' && (
                <ActionForm
                  title="Enviar Tokens"
                  description="Envía tokens KAIROS desde el Safe a cualquier dirección."
                  icon={Send}
                  iconColor="text-kairos-400"
                  fields={[
                    { label: 'Dirección destino', value: sendTo, onChange: setSendTo, placeholder: '0x...', mono: true },
                    { label: 'Cantidad (KAIROS)', value: sendAmount, onChange: setSendAmount, placeholder: '1000', type: 'number' },
                  ]}
                  password={password}
                  setPassword={setPassword}
                  onSubmit={handleSend}
                  submitLabel="Enviar"
                  submitColor="bg-kairos-500 hover:bg-kairos-400"
                  loading={txLoading}
                  error={txError}
                  result={txResult}
                  extra={tokenInfo ? (
                    <p className="text-[10px] text-dark-500">Balance del Safe: {formatNum(tokenInfo.safeBalance)} KAIROS</p>
                  ) : null}
                />
              )}

              {/* ─── PAUSE ─── */}
              {activeSection === 'pause' && (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-4 border ${tokenInfo?.paused ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tokenInfo?.paused ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                        {tokenInfo?.paused ? <Pause size={20} className="text-red-400" /> : <Play size={20} className="text-green-400" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${tokenInfo?.paused ? 'text-red-400' : 'text-green-400'}`}>
                          {tokenInfo?.paused ? 'Token PAUSADO' : 'Token ACTIVO'}
                        </p>
                        <p className="text-xs text-dark-400">
                          {tokenInfo?.paused ? 'Todas las transferencias están detenidas' : 'Las transferencias funcionan normalmente'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/5 rounded-2xl p-4 border border-yellow-500/10">
                    <p className="text-xs text-yellow-400 flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} />
                      <span className="font-semibold">Cuidado</span>
                    </p>
                    <p className="text-xs text-dark-400">
                      {tokenInfo?.paused
                        ? 'Despausar permitirá que todos los usuarios transfieran tokens nuevamente.'
                        : 'Pausar detendrá TODAS las transferencias de KAIROS inmediatamente. Usar solo en emergencias.'}
                    </p>
                  </div>

                  <PasswordInput password={password} setPassword={setPassword} />

                  <button
                    onClick={tokenInfo?.paused ? handleUnpause : handlePause}
                    disabled={!password || txLoading}
                    className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                      tokenInfo?.paused ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'
                    }`}
                  >
                    {txLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {tokenInfo?.paused ? 'Despausar Token ▶' : 'Pausar Token ⏸'}
                  </button>

                  <TxResultDisplay error={txError} result={txResult} />
                </div>
              )}

              {/* ─── BLACKLIST ─── */}
              {activeSection === 'blacklist' && (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-1">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Ban size={16} className="text-orange-400" />
                      Blacklist / Unblacklist
                    </p>
                    <p className="text-xs text-dark-400">
                      Bloquea o desbloquea una dirección. Las direcciones en blacklist no pueden enviar ni recibir KAIROS.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs text-dark-400">Dirección</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={blacklistAddr}
                      onChange={e => setBlacklistAddr(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 font-mono focus:outline-none focus:border-kairos-500/50"
                    />
                  </div>

                  <PasswordInput password={password} setPassword={setPassword} />

                  <div className="flex gap-3">
                    <button
                      onClick={handleBlacklist}
                      disabled={!password || !blacklistAddr || txLoading}
                      className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {txLoading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                      Bloquear
                    </button>
                    <button
                      onClick={handleUnblacklist}
                      disabled={!password || !blacklistAddr || txLoading}
                      className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {txLoading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                      Desbloquear
                    </button>
                  </div>

                  <TxResultDisplay error={txError} result={txResult} />
                </div>
              )}

              {/* ─── FEES ─── */}
              {activeSection === 'fees' && (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-2">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Percent size={16} className="text-purple-400" />
                      Comisiones
                    </p>
                    <p className="text-xs text-dark-400">
                      Fee actual: <span className="text-white font-medium">{tokenInfo?.feeBps} bps ({((tokenInfo?.feeBps || 0) / 100).toFixed(2)}%)</span>
                    </p>
                    <p className="text-xs text-dark-400">
                      Total recaudado: <span className="text-white font-medium">{formatNum(tokenInfo?.totalFees || '0')} KAIROS</span>
                    </p>
                  </div>

                  {/* Change Fee */}
                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-3">
                    <p className="text-xs text-dark-400 font-medium uppercase">Cambiar Fee</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="8"
                        value={newFeeBps}
                        onChange={e => setNewFeeBps(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-kairos-500/50"
                      />
                      <span className="self-center text-xs text-dark-500">bps (max 100)</span>
                    </div>
                  </div>

                  {/* Fee Exempt */}
                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-3">
                    <p className="text-xs text-dark-400 font-medium uppercase">Exentar de Fee</p>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={feeExemptAddr}
                      onChange={e => setFeeExemptAddr(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 font-mono focus:outline-none focus:border-kairos-500/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFeeExemptValue(true)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${feeExemptValue ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-dark-400'}`}
                      >
                        Exentar ✓
                      </button>
                      <button
                        onClick={() => setFeeExemptValue(false)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${!feeExemptValue ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-dark-400'}`}
                      >
                        Quitar Exención
                      </button>
                    </div>
                  </div>

                  <PasswordInput password={password} setPassword={setPassword} />

                  <div className="flex gap-3">
                    <button
                      onClick={handleSetFee}
                      disabled={!password || !newFeeBps || txLoading}
                      className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      Cambiar Fee
                    </button>
                    <button
                      onClick={handleSetFeeExempt}
                      disabled={!password || !feeExemptAddr || txLoading}
                      className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      {feeExemptValue ? 'Exentar' : 'Quitar'}
                    </button>
                  </div>

                  <TxResultDisplay error={txError} result={txResult} />
                </div>
              )}

              {/* ─── CAPS ─── */}
              {activeSection === 'caps' && (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-2">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Lock size={16} className="text-cyan-400" />
                      Límites de Mint / Burn
                    </p>
                    <p className="text-xs text-dark-400">
                      Mint Cap: <span className="text-white font-medium">{tokenInfo?.mintCap === '0.0' ? 'Sin límite ∞' : `${formatNum(tokenInfo?.mintCap)} KAIROS`}</span>
                    </p>
                    <p className="text-xs text-dark-400">
                      Burn Cap: <span className="text-white font-medium">{tokenInfo?.burnCap === '0.0' ? 'Sin límite ∞' : `${formatNum(tokenInfo?.burnCap)} KAIROS`}</span>
                    </p>
                    <p className="text-[10px] text-dark-500">0 = Sin límite (ilimitado)</p>
                  </div>

                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-3">
                    <p className="text-xs text-dark-400 font-medium uppercase">Mint Cap</p>
                    <input
                      type="number"
                      placeholder="0 (sin límite)"
                      value={newMintCap}
                      onChange={e => setNewMintCap(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-kairos-500/50"
                    />
                  </div>

                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-3">
                    <p className="text-xs text-dark-400 font-medium uppercase">Burn Cap</p>
                    <input
                      type="number"
                      placeholder="0 (sin límite)"
                      value={newBurnCap}
                      onChange={e => setNewBurnCap(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-kairos-500/50"
                    />
                  </div>

                  <PasswordInput password={password} setPassword={setPassword} />

                  <div className="flex gap-3">
                    <button
                      onClick={handleSetMintCap}
                      disabled={!password || txLoading}
                      className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      Set Mint Cap
                    </button>
                    <button
                      onClick={handleSetBurnCap}
                      disabled={!password || txLoading}
                      className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      Set Burn Cap
                    </button>
                  </div>

                  <TxResultDisplay error={txError} result={txResult} />
                </div>
              )}

              {/* ─── SETTINGS ─── */}
              {activeSection === 'settings' && (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-2">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Settings size={16} className="text-pink-400" />
                      Configuración Avanzada
                    </p>
                    <p className="text-xs text-dark-400">
                      Reserve Wallet actual: <span className="text-white font-mono text-[10px]">{tokenInfo?.reserveWallet}</span>
                    </p>
                  </div>

                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-3">
                    <p className="text-xs text-dark-400 font-medium uppercase">Cambiar Reserve Wallet</p>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={newReserveWallet}
                      onChange={e => setNewReserveWallet(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 font-mono focus:outline-none focus:border-kairos-500/50"
                    />
                    <p className="text-[10px] text-dark-500">Las comisiones se envían a esta wallet</p>
                  </div>

                  <PasswordInput password={password} setPassword={setPassword} />

                  <button
                    onClick={handleSetReserveWallet}
                    disabled={!password || !newReserveWallet || txLoading}
                    className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {txLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Cambiar Reserve Wallet
                  </button>

                  <TxResultDisplay error={txError} result={txResult} />

                  {/* Contract Links */}
                  <div className="space-y-2 pt-2">
                    <a
                      href={`https://bscscan.com/token/${KAIROS_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition"
                    >
                      <ExternalLink size={14} className="text-kairos-400" />
                      <span className="text-sm text-kairos-400">Ver Token en BscScan</span>
                    </a>
                    <a
                      href={`https://bscscan.com/address/${SAFE_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition"
                    >
                      <Shield size={14} className="text-blue-400" />
                      <span className="text-sm text-blue-400">Ver Safe en BscScan</span>
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  HELPER COMPONENTS
// ═══════════════════════════════════════════════════════

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className={color} />
        <span className="text-[10px] text-dark-500 uppercase">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white truncate">{value}</p>
    </div>
  );
}

function InfoCard({ label, value, mono }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 flex items-center justify-between">
      <span className="text-xs text-dark-400">{label}</span>
      <span className={`text-xs text-white ${mono ? 'font-mono text-[10px] max-w-[200px] truncate' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

function PasswordInput({ password, setPassword }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-dark-400">Contraseña del wallet</label>
      <input
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-kairos-500/50"
      />
    </div>
  );
}

function TxResultDisplay({ error, result }) {
  return (
    <>
      {error && (
        <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/10">
          <p className="text-xs text-red-400 flex items-center gap-2">
            <X size={14} />
            {error}
          </p>
        </div>
      )}
      {result && (
        <div className="bg-green-500/5 rounded-xl p-3 border border-green-500/10 space-y-1">
          <p className="text-xs text-green-400 flex items-center gap-2">
            <Check size={14} />
            Transacción confirmada
          </p>
          <a
            href={`https://bscscan.com/tx/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-kairos-400 underline"
          >
            {result.hash.slice(0, 20)}... → BscScan
          </a>
          <p className="text-[10px] text-dark-500">Block: {result.block} · Gas: {result.gas}</p>
        </div>
      )}
    </>
  );
}

function ActionForm({ title, description, icon: Icon, iconColor, fields, password, setPassword, onSubmit, submitLabel, submitColor, loading, error, result, extra }) {
  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 space-y-1">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          {title}
        </p>
        <p className="text-xs text-dark-400">{description}</p>
        {extra}
      </div>

      {fields.map((field, i) => (
        <div key={i} className="space-y-1">
          <label className="text-xs text-dark-400">{field.label}</label>
          <input
            type={field.type || 'text'}
            placeholder={field.placeholder}
            value={field.value}
            onChange={e => field.onChange(e.target.value)}
            className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-kairos-500/50 ${field.mono ? 'font-mono' : ''}`}
          />
        </div>
      ))}

      <PasswordInput password={password} setPassword={setPassword} />

      <button
        onClick={onSubmit}
        disabled={!password || loading}
        className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${submitColor}`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {submitLabel}
      </button>

      <TxResultDisplay error={error} result={result} />
    </div>
  );
}

function formatNum(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return '0';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
}
