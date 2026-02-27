// Kairos Trade — Wallet Integration Page (Multi-Chain KAIROS)
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Send, Download, Copy, Check, ExternalLink, RefreshCw,
  ChevronRight, ChevronDown, Shield, Globe, ArrowUpRight,
  ArrowDownRight, AlertTriangle, Eye, EyeOff, QrCode, X, Loader2, Link2
} from 'lucide-react';
import { ethers } from 'ethers';
import useStore from '../../store/useStore';
import apiClient from '../../services/apiClient';
import { encrypt as vaultEncrypt } from '../../utils/keyVault';
import { getSessionKey, setSessionKey } from '../../utils/sessionVault';
import { KAIROS_COIN } from '../../constants';

/* ─── Chain Configurations ─── */
const CHAINS = [
  {
    id: 56, name: 'BNB Smart Chain', short: 'BSC', color: '#F0B90B',
    rpc: 'https://bsc-dataseed1.binance.org',
    rpcFallback: 'https://bsc-dataseed2.binance.org',
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.bscscan.com/api',
    nativeSymbol: 'BNB', nativeDecimals: 18,
    apiKey: '',
  },
  {
    id: 8453, name: 'Base', short: 'Base', color: '#0052FF',
    rpc: 'https://mainnet.base.org',
    rpcFallback: 'https://base.publicnode.com',
    explorer: 'https://basescan.org',
    explorerApi: 'https://api.basescan.org/api',
    nativeSymbol: 'ETH', nativeDecimals: 18,
    apiKey: '',
  },
  {
    id: 42161, name: 'Arbitrum One', short: 'ARB', color: '#28A0F0',
    rpc: 'https://arb1.arbitrum.io/rpc',
    rpcFallback: 'https://arbitrum.publicnode.com',
    explorer: 'https://arbiscan.io',
    explorerApi: 'https://api.arbiscan.io/api',
    nativeSymbol: 'ETH', nativeDecimals: 18,
    apiKey: '',
  },
  {
    id: 137, name: 'Polygon', short: 'MATIC', color: '#8247E5',
    rpc: 'https://polygon-rpc.com',
    rpcFallback: 'https://polygon.publicnode.com',
    explorer: 'https://polygonscan.com',
    explorerApi: 'https://api.polygonscan.com/api',
    nativeSymbol: 'POL', nativeDecimals: 18,
    apiKey: '',
  },
];

/* ─── ERC-20 minimal ABI ─── */
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

/* ─── Helpers ─── */
const shortenAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
const formatBalance = (bal) => {
  const n = parseFloat(bal);
  if (n === 0) return '0.00';
  if (n < 0.01) return n.toFixed(6);
  if (n < 1) return n.toFixed(4);
  if (n < 1000) return n.toFixed(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

/* ─── Get provider with fallback ─── */
const getProvider = (chain) => {
  try {
    return new ethers.JsonRpcProvider(chain.rpc, chain.id);
  } catch {
    return new ethers.JsonRpcProvider(chain.rpcFallback, chain.id);
  }
};

/* ─── Get KAIROS balance on a specific chain ─── */
const getKairosBalance = async (chain, address) => {
  try {
    const kairosAddr = KAIROS_COIN.addresses[chain.id];
    if (!kairosAddr) return '0';
    const provider = getProvider(chain);
    const contract = new ethers.Contract(kairosAddr, ERC20_ABI, provider);
    const bal = await contract.balanceOf(address);
    return ethers.formatUnits(bal, KAIROS_COIN.decimals);
  } catch (err) {
    console.warn(`Failed to get KAIROS balance on ${chain.short}:`, err.message);
    return '0';
  }
};

/* ─── Get native balance ─── */
const getNativeBalance = async (chain, address) => {
  try {
    const provider = getProvider(chain);
    const bal = await provider.getBalance(address);
    return ethers.formatUnits(bal, chain.nativeDecimals);
  } catch {
    return '0';
  }
};

/* ─── Send KAIROS transaction ─── */
const sendKairos = async (chain, privateKey, toAddress, amount) => {
  const kairosAddr = KAIROS_COIN.addresses[chain.id];
  if (!kairosAddr) throw new Error(`KAIROS no está desplegado en ${chain.name}`);

  const provider = getProvider(chain);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(kairosAddr, ERC20_ABI, wallet);

  const amountWei = ethers.parseUnits(amount.toString(), KAIROS_COIN.decimals);
  const tx = await contract.transfer(toAddress, amountWei);
  return tx;
};

/* ─── Get recent KAIROS transfers from explorer API ─── */
const getRecentTransfers = async (chain, address) => {
  try {
    const kairosAddr = KAIROS_COIN.addresses[chain.id];
    if (!kairosAddr) return [];
    const url = `${chain.explorerApi}?module=account&action=tokentx&contractaddress=${kairosAddr}&address=${address}&page=1&offset=10&sort=desc`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatUnits(tx.value || '0', parseInt(tx.tokenDecimal) || 18),
        timestamp: parseInt(tx.timeStamp) * 1000,
        chainId: chain.id,
        chainShort: chain.short,
        chainColor: chain.color,
        isIncoming: tx.to.toLowerCase() === address.toLowerCase(),
      }));
    }
    return [];
  } catch {
    return [];
  }
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT — WalletPage
   ══════════════════════════════════════════════════════════════ */
export default function WalletPage() {
  const { user } = useStore();
  const walletAddress = user?.walletAddress || '';
  const isAdmin = user?.role === 'admin';

  // State
  const [balances, setBalances] = useState({});       // { chainId: { kairos: '0', native: '0' } }
  const [totalKairos, setTotalKairos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showPK, setShowPK] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [securityUnlocked, setSecurityUnlocked] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const verifiedPasswordRef = useRef(null);
  const [openingWallet, setOpeningWallet] = useState(false);
  const [showImportPK, setShowImportPK] = useState(false);
  const [importPKValue, setImportPKValue] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Get private key from session memory (decrypted at login)
  const privateKey = useMemo(() => {
    try {
      // Primary: in-memory vault (set during login, cleared on tab close)
      const sessionPK = getSessionKey();
      if (sessionPK && sessionPK.startsWith('0x')) return sessionPK;
      // Fallback: legacy unencrypted keys (backward compat)
      if (user?.encryptedKey && !user.encryptedKey.startsWith('v1:')) {
        const decoded = atob(user.encryptedKey);
        if (decoded.startsWith('0x')) return decoded;
      }
      const stored = localStorage.getItem('kairos_trade_wallet');
      if (stored) {
        const { encryptedKey } = JSON.parse(stored);
        if (encryptedKey && !encryptedKey.startsWith('v1:')) {
          const decoded = atob(encryptedKey);
          if (decoded.startsWith('0x')) return decoded;
        }
      }
    } catch {}
    return null;
  }, [user?.encryptedKey]);

  /* ─── Load Balances ─── */
  const loadBalances = useCallback(async () => {
    if (!walletAddress) return;
    setRefreshing(true);

    const results = {};
    let total = 0;

    await Promise.all(
      CHAINS.map(async (chain) => {
        const [kairos, native] = await Promise.all([
          getKairosBalance(chain, walletAddress),
          getNativeBalance(chain, walletAddress),
        ]);
        results[chain.id] = { kairos, native };
        total += parseFloat(kairos) || 0;
      })
    );

    setBalances(results);
    setTotalKairos(total);
    setLoading(false);
    setRefreshing(false);
  }, [walletAddress]);

  useEffect(() => { loadBalances(); }, [loadBalances]);

  /* ─── Load History ─── */
  const loadHistory = useCallback(async () => {
    if (!walletAddress) return;
    setHistoryLoading(true);
    const allTx = [];
    await Promise.all(
      CHAINS.map(async (chain) => {
        const txs = await getRecentTransfers(chain, walletAddress);
        allTx.push(...txs);
      })
    );
    allTx.sort((a, b) => b.timestamp - a.timestamp);
    setHistory(allTx.slice(0, 20));
    setHistoryLoading(false);
  }, [walletAddress]);

  /* ─── Copy to clipboard ─── */
  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  /* ─── Verify password to unlock security panel ─── */
  const handleSecurityUnlock = async () => {
    if (!securityPassword) return;
    setVerifyingPassword(true);
    setSecurityError('');
    try {
      const res = await apiClient.post('/auth/login', {
        email: user?.email,
        password: securityPassword,
      });
      if (res.data?.success) {
        verifiedPasswordRef.current = securityPassword;
        setSecurityUnlocked(true);
        setSecurityPassword('');
        // Auto-lock after 60 seconds
        setTimeout(() => {
          setSecurityUnlocked(false);
          setShowPK(false);
          verifiedPasswordRef.current = null;
        }, 60000);
      } else {
        setSecurityError('Contraseña incorrecta');
      }
    } catch (err) {
      setSecurityError('Contraseña incorrecta');
    } finally {
      setVerifyingPassword(false);
    }
  };

  /* ─── Import existing wallet (admin: paste PK to make it Kairos-native) ─── */
  const importWallet = async () => {
    setImportError('');
    const pk = importPKValue.trim();
    if (!pk.startsWith('0x') || pk.length !== 66) {
      setImportError('Private key inválida. Debe empezar con 0x y tener 66 caracteres.');
      return;
    }
    const pwd = verifiedPasswordRef.current;
    if (!pwd) {
      setImportError('Sesión de seguridad expirada. Desbloquea de nuevo.');
      return;
    }
    setImporting(true);
    try {
      const imported = new ethers.Wallet(pk);
      const encKey = await vaultEncrypt(pk, pwd);
      localStorage.setItem('kairos_trade_wallet', JSON.stringify({ walletAddress: imported.address, encryptedKey: encKey }));
      setSessionKey(pk);
      // Update backend
      const host = import.meta.env.DEV ? '' : 'https://kairos-api-u6k5.onrender.com';
      await fetch(`${host}/api/auth/update-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ walletAddress: imported.address, encryptedKey: encKey }),
      });
      const { login } = useStore.getState();
      login({ ...user, walletAddress: imported.address, encryptedKey: encKey });
      setShowImportPK(false);
      setImportPKValue('');
    } catch (err) {
      setImportError('Error al importar: ' + err.message);
    }
    setImporting(false);
  };

  /* ─── Generate wallet for legacy accounts ─── */
  const [generating, setGenerating] = useState(false);
  const generateWallet = async () => {
    const pwd = verifiedPasswordRef.current || prompt('Ingresa tu contraseña para cifrar la wallet:');
    if (!pwd) return;
    setGenerating(true);
    try {
      const wallet = ethers.Wallet.createRandom();
      const newAddress = wallet.address;
      const newPK = wallet.privateKey;
      // Encrypt with AES-256-GCM (password-derived key)
      const encKey = await vaultEncrypt(newPK, pwd);
      localStorage.setItem('kairos_trade_wallet', JSON.stringify({ walletAddress: newAddress, encryptedKey: encKey }));
      setSessionKey(newPK);
      // Update backend
      const host = import.meta.env.DEV ? '' : 'https://kairos-api-u6k5.onrender.com';
      await fetch(`${host}/api/auth/update-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ walletAddress: newAddress, encryptedKey: encKey }),
      });
      // Update store
      const { login } = useStore.getState();
      login({ ...user, walletAddress: newAddress, encryptedKey: encKey });
    } catch (err) {
      console.error('Failed to generate wallet:', err);
    }
    setGenerating(false);
  };

  /* ─── No wallet ─── */
  if (!walletAddress) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center mx-auto mb-4">
            <Wallet size={28} className="text-[var(--gold)]" />
          </div>
          <h2 className="text-lg font-bold mb-2">Configura tu Wallet</h2>
          <p className="text-sm text-[var(--text-dim)] mb-6">
            Tu wallet KAIROS te permite recibir, enviar y operar con KAIROS en múltiples blockchains de forma segura.
          </p>
          <button
            onClick={generateWallet}
            disabled={generating}
            className="w-full py-3 rounded-xl text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8972E)' }}
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Generando...</>
            ) : (
              <><Wallet size={16} /> Generar Mi Wallet</>
            )}
          </button>
          <p className="text-[10px] text-[var(--text-dim)] mt-3">
            Se creará una wallet segura con clave privada encriptada en tu dispositivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ maxWidth: '100%' }}>

      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/15 flex items-center justify-center">
            <Wallet size={22} className="text-[var(--gold)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Kairos Wallet</h1>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #B8972E)', color: '#0D0D0D' }}>
                  Admin
                </span>
              )}
            </div>
            <button onClick={() => handleCopy(walletAddress)} className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors">
              {shortenAddress(walletAddress)}
              {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
            </button>
            {isAdmin && (
              <p className="text-[9px] text-[var(--gold)]/60 mt-0.5">Wallet de comisiones — Kairos 777 Inc</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadBalances} disabled={refreshing}
            className="p-2 rounded-xl transition-all hover:bg-white/5">
            <RefreshCw size={16} className={`text-[var(--text-dim)] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={async () => {
              setOpeningWallet(true);
              try {
                const res = await apiClient.post('/api/auth/cross-app-token', { target: 'wallet' });
                if (res.success) {
                  window.open(`https://kairos-wallet.netlify.app?cat=${res.data.crossAppToken}`, '_blank');
                } else {
                  window.open('https://kairos-wallet.netlify.app', '_blank');
                }
              } catch {
                window.open('https://kairos-wallet.netlify.app', '_blank');
              }
              setOpeningWallet(false);
            }}
            disabled={openingWallet}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--gold)] transition-all hover:bg-[var(--gold)]/10 disabled:opacity-50"
            style={{ border: '1px solid rgba(59,130,246,0.15)' }}>
            {openingWallet ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
            Wallet Completa
          </button>
        </div>
      </motion.div>

      {/* ─── Total Balance Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
          border: '1px solid rgba(59,130,246,0.12)',
        }}
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent)' }} />

        <p className="text-xs text-[var(--text-dim)] font-semibold uppercase tracking-wider mb-1">Balance Total KAIROS</p>
        {loading ? (
          <div className="h-10 w-48 rounded-lg bg-white/5 animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black text-white">{formatBalance(totalKairos)}</h2>
            <span className="text-sm font-bold text-[var(--gold)]">KAIROS</span>
          </div>
        )}
        <p className="text-xs text-[var(--text-dim)] mt-1">
          ≈ ${formatBalance(totalKairos)} USD <span className="text-[var(--text-dim)]/50">(1 KAIROS = 1 USD)</span>
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 mt-5">
          {isAdmin && !privateKey ? (
            <button
              onClick={() => setShowImportPK(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8972E)', boxShadow: '0 4px 20px rgba(212,175,55,0.3)' }}>
              <Download size={16} />
              Importar Wallet
            </button>
          ) : (
            <button onClick={() => setShowSend(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 20px rgba(59,130,246,0.2)' }}>
              <Send size={16} />
              Enviar
            </button>
          )}
          <button onClick={() => setShowReceive(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(0,220,130,0.15)', border: '1px solid rgba(0,220,130,0.2)' }}>
            <Download size={16} className="text-[var(--green)]" />
            <span className="text-[var(--green)]">Recibir</span>
          </button>
          <button onClick={() => { setShowHistory(true); loadHistory(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[var(--text-dim)] transition-all hover:scale-[1.02] hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Globe size={16} />
            Historial
          </button>
        </div>
      </motion.div>

      {/* ─── Admin Fee Wallet Banner ─── */}
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03))', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-[var(--gold)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--gold)] mb-1">Kairos Wallet — Administrador</p>
              <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                {!walletAddress && 'No tienes wallet vinculada. Genera una nueva o importa una existente para operar.'}
                {walletAddress && !privateKey && 'Wallet vinculada. Importa tu clave privada para enviar transacciones.'}
                {walletAddress && privateKey && 'Wallet activa — puedes enviar, recibir y operar directamente desde Kairos Trade.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Chain Balances ─── */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Shield size={14} className="text-[var(--gold)]" />
          Balances por Chain
        </h3>
        {CHAINS.map((chain, i) => {
          const bal = balances[chain.id] || { kairos: '0', native: '0' };
          const kairosVal = parseFloat(bal.kairos);
          return (
            <motion.div key={chain.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.005]"
              style={{
                background: `linear-gradient(135deg, ${chain.color}06, ${chain.color}02)`,
                border: `1px solid ${chain.color}15`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
                  style={{ background: `${chain.color}15`, color: chain.color }}>
                  {chain.short.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold">{chain.name}</p>
                  <p className="text-[10px] text-[var(--text-dim)]">
                    {formatBalance(bal.native)} {chain.nativeSymbol}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {loading ? (
                  <div className="h-5 w-20 rounded bg-white/5 animate-pulse" />
                ) : (
                  <>
                    <p className="text-sm font-bold" style={{ color: kairosVal > 0 ? 'white' : 'var(--text-dim)' }}>
                      {formatBalance(bal.kairos)} <span className="text-[10px] text-[var(--gold)]">KAIROS</span>
                    </p>
                    <a href={`${chain.explorer}/token/${KAIROS_COIN.addresses[chain.id]}?a=${walletAddress}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors flex items-center gap-1 justify-end">
                      Ver en explorer <ExternalLink size={8} />
                    </a>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Security Settings (Hidden by default) ─── */}
      {privateKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {/* Toggle button — subtle, doesn't scream "private key here" */}
          <button
            onClick={() => { setShowSecurityPanel(!showSecurityPanel); setShowPK(false); setSecurityError(''); }}
            className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all hover:scale-[1.005]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[var(--text-dim)]" />
              <span className="text-xs font-medium text-[var(--text-dim)]">Seguridad Avanzada</span>
            </div>
            <ChevronDown size={14} className={`text-[var(--text-dim)] transition-transform ${showSecurityPanel ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showSecurityPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl p-4 mt-2" style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.03), rgba(239,68,68,0.01))',
                  border: '1px solid rgba(239,68,68,0.08)',
                }}>
                  {!securityUnlocked ? (
                    /* ── Password gate ── */
                    <div>
                      <p className="text-[10px] text-[var(--text-dim)] mb-3">
                        Ingresa tu contraseña para acceder a la clave privada.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={securityPassword}
                          onChange={(e) => { setSecurityPassword(e.target.value); setSecurityError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleSecurityUnlock()}
                          placeholder="Contraseña"
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[var(--gold)]/40"
                        />
                        <button
                          onClick={handleSecurityUnlock}
                          disabled={verifyingPassword || !securityPassword}
                          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
                          style={{ background: 'rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.8)' }}
                        >
                          {verifyingPassword ? <Loader2 size={12} className="animate-spin" /> : 'Verificar'}
                        </button>
                      </div>
                      {securityError && (
                        <p className="text-[10px] text-red-400 mt-2">{securityError}</p>
                      )}
                    </div>
                  ) : (
                    /* ── Unlocked: show PK toggle ── */
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-red-400" />
                          <span className="text-xs font-bold text-red-400/80">Clave Privada</span>
                        </div>
                        <button onClick={() => setShowPK(!showPK)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold text-red-400/60 hover:text-red-400 transition-colors"
                          style={{ background: 'rgba(239,68,68,0.06)' }}>
                          {showPK ? <EyeOff size={10} /> : <Eye size={10} />}
                          {showPK ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                      {showPK && (
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-[10px] text-red-400/70 font-mono break-all bg-black/20 rounded-lg p-2">
                            {privateKey}
                          </code>
                          <button onClick={() => handleCopy(privateKey)} className="p-2 rounded-lg hover:bg-red-400/10">
                            <Copy size={12} className="text-red-400/50" />
                          </button>
                        </div>
                      )}
                      <p className="text-[9px] text-red-400/30 mt-2">
                        ⚠️ Nunca compartas tu clave privada.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── Quick Links ─── */}
      <div className="grid grid-cols-2 gap-2.5">
        <a href="https://kairos-wallet.netlify.app" target="_blank" rel="noopener noreferrer"
          className="rounded-xl p-4 text-left transition-all hover:scale-[1.02] block"
          style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
          <Wallet size={20} className="text-[var(--gold)] mb-2" />
          <p className="text-xs font-bold">Kairos Wallet</p>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Swap, Bridge, Staking, NFTs, WalletConnect</p>
        </a>
        <a href={`${CHAINS[0].explorer}/address/${walletAddress}`} target="_blank" rel="noopener noreferrer"
          className="rounded-xl p-4 text-left transition-all hover:scale-[1.02] block"
          style={{ background: 'rgba(240,185,11,0.04)', border: '1px solid rgba(240,185,11,0.1)' }}>
          <Globe size={20} className="text-amber-400 mb-2" />
          <p className="text-xs font-bold">BSCScan</p>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Ver todas las transacciones on-chain</p>
        </a>
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* ─── Import PK Modal (Admin) ─── */}
      <AnimatePresence>
        {showImportPK && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Download size={18} className="text-[var(--gold)]" />
                  Importar Wallet a Kairos
                </h3>
                <button onClick={() => { setShowImportPK(false); setImportPKValue(''); setImportError(''); }}
                  className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
              </div>
              <p className="text-xs text-[var(--text-dim)] mb-4 leading-relaxed">
                Pega tu clave privada para vincular tu wallet existente como wallet nativa de Kairos.
                La PK se encripta y almacena de forma segura en tu dispositivo.
              </p>
              <div className="mb-3">
                <label className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-1 block">Private Key</label>
                <input
                  type="password"
                  value={importPKValue}
                  onChange={e => { setImportPKValue(e.target.value); setImportError(''); }}
                  placeholder="0x..."
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 focus:border-[var(--gold)] focus:outline-none font-mono"
                />
              </div>
              {importError && (
                <div className="flex items-center gap-2 text-xs text-red-400 mb-3">
                  <AlertTriangle size={12} /> {importError}
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] text-amber-400/80 mb-4 p-2 rounded-lg" style={{ background: 'rgba(255,191,0,0.06)' }}>
                <Shield size={12} className="flex-shrink-0" />
                <span>Tu PK nunca se envía a ningún servidor. Se encripta localmente en tu navegador.</span>
              </div>
              <button
                onClick={importWallet}
                disabled={importing || !importPKValue.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8972E)' }}>
                {importing ? (
                  <><Loader2 size={16} className="animate-spin" /> Importando...</>
                ) : (
                  <><Wallet size={16} /> Importar y Vincular</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Send Modal ─── */}
      <AnimatePresence>
        {showSend && (
          <SendModal
            chains={CHAINS}
            walletAddress={walletAddress}
            privateKey={privateKey}
            onClose={() => setShowSend(false)}
            onSuccess={loadBalances}
          />
        )}
      </AnimatePresence>

      {/* ─── Receive Modal ─── */}
      <AnimatePresence>
        {showReceive && (
          <ReceiveModal
            walletAddress={walletAddress}
            onClose={() => setShowReceive(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── History Modal ─── */}
      <AnimatePresence>
        {showHistory && (
          <HistoryModal
            history={history}
            loading={historyLoading}
            walletAddress={walletAddress}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SEND MODAL
   ══════════════════════════════════════════════════════════════ */
function SendModal({ chains, walletAddress, privateKey, onClose, onSuccess }) {
  const [selectedChain, setSelectedChain] = useState(chains[0]);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    if (!toAddress || !ethers.isAddress(toAddress)) {
      setError('Dirección inválida');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    if (!privateKey) {
      setError('No se encontró la clave privada');
      return;
    }

    setSending(true);
    try {
      const tx = await sendKairos(selectedChain, privateKey, toAddress, amount);
      setTxHash(tx.hash);
      onSuccess?.();
    } catch (err) {
      setError(err.reason || err.message || 'Error al enviar transacción');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Send size={18} className="text-[var(--gold)]" />
            Enviar KAIROS
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={16} /></button>
        </div>

        {txHash ? (
          /* Success state */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-green-400" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">¡Transacción Enviada!</h4>
            <p className="text-xs text-[var(--text-dim)] mb-4">Tu transacción está siendo procesada en {selectedChain.name}</p>
            <a href={`${selectedChain.explorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
              style={{ border: '1px solid rgba(59,130,246,0.15)' }}>
              Ver en Explorer <ExternalLink size={12} />
            </a>
            <button onClick={onClose}
              className="block w-full mt-4 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
              Cerrar
            </button>
          </div>
        ) : (
          /* Send form */
          <div className="space-y-4">
            {/* Chain selector */}
            <div>
              <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5 block">Red</label>
              <div className="grid grid-cols-4 gap-1.5">
                {chains.map(c => (
                  <button key={c.id} onClick={() => setSelectedChain(c)}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all"
                    style={{
                      background: selectedChain.id === c.id ? `${c.color}20` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedChain.id === c.id ? c.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      color: selectedChain.id === c.id ? c.color : 'var(--text-dim)',
                    }}>
                    {c.short}
                  </button>
                ))}
              </div>
            </div>

            {/* To address */}
            <div>
              <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5 block">Dirección destino</label>
              <input type="text" value={toAddress} onChange={e => setToAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all focus:ring-2 focus:ring-[var(--gold)]/30"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>

            {/* Amount */}
            <div>
              <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5 block">Cantidad KAIROS</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--gold)]/30"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertTriangle size={12} />
                {typeof error === 'string' ? error : String(error)}
              </div>
            )}

            {/* Send button */}
            <button onClick={handleSend} disabled={sending}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 20px rgba(59,130,246,0.2)' }}>
              {sending ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando...</>
              ) : (
                <><Send size={16} /> Enviar {amount ? `${amount} KAIROS` : 'KAIROS'}</>
              )}
            </button>

            <p className="text-[9px] text-[var(--text-dim)]/50 text-center">
              Necesitas {selectedChain.nativeSymbol} en {selectedChain.name} para pagar el gas
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RECEIVE MODAL
   ══════════════════════════════════════════════════════════════ */
function ReceiveModal({ walletAddress, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Download size={18} className="text-green-400" />
            Recibir KAIROS
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={16} /></button>
        </div>

        {/* QR Code placeholder — using address visual */}
        <div className="w-48 h-48 rounded-2xl mx-auto mb-4 flex items-center justify-center relative overflow-hidden"
          style={{ background: 'white' }}>
          {/* Simple QR visual representation */}
          <div className="absolute inset-2 grid grid-cols-8 gap-[2px]">
            {Array.from({ length: 64 }).map((_, i) => {
              // Generate deterministic pattern from address
              const charCode = walletAddress.charCodeAt((i * 3) % walletAddress.length) || 0;
              const filled = (charCode + i) % 3 !== 0;
              return (
                <div key={i} className="rounded-[1px]"
                  style={{ background: filled ? '#000' : '#fff' }} />
              );
            })}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md">
              <span className="text-sm font-black text-blue-600">K</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-[var(--text-dim)] mb-3">
          Envía KAIROS a esta dirección en cualquier chain soportada
        </p>

        {/* Address */}
        <button onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-mono transition-all hover:bg-white/5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="truncate">{walletAddress}</span>
          {copied ? <Check size={14} className="text-green-400 shrink-0" /> : <Copy size={14} className="text-[var(--text-dim)] shrink-0" />}
        </button>

        {/* Supported chains */}
        <div className="flex justify-center gap-2 mt-4">
          {CHAINS.map(c => (
            <div key={c.id} className="px-2 py-1 rounded-md text-[9px] font-bold"
              style={{ background: `${c.color}15`, color: c.color }}>
              {c.short}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HISTORY MODAL
   ══════════════════════════════════════════════════════════════ */
function HistoryModal({ history, loading, walletAddress, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '80vh' }}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Globe size={18} className="text-[var(--gold)]" />
            Historial KAIROS
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: 'calc(80vh - 70px)' }}>
          {loading && (
            <div className="py-8 text-center">
              <Loader2 size={24} className="animate-spin text-[var(--gold)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-dim)]">Cargando transacciones...</p>
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="py-8 text-center">
              <Globe size={32} className="text-[var(--text-dim)]/30 mx-auto mb-2" />
              <p className="text-sm text-[var(--text-dim)]">No hay transacciones aún</p>
            </div>
          )}

          {!loading && history.map((tx, i) => {
            const chain = CHAINS.find(c => c.id === tx.chainId) || CHAINS[0];
            return (
              <a key={`${tx.hash}-${i}`}
                href={`${chain.explorer}/tx/${tx.hash}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/[0.03]"
                style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: tx.isIncoming ? 'rgba(0,220,130,0.1)' : 'rgba(59,130,246,0.1)' }}>
                    {tx.isIncoming
                      ? <ArrowDownRight size={16} className="text-green-400" />
                      : <ArrowUpRight size={16} className="text-blue-400" />
                    }
                  </div>
                  <div>
                    <p className="text-xs font-bold">
                      {tx.isIncoming ? 'Recibido' : 'Enviado'}
                      <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: `${chain.color}15`, color: chain.color }}>
                        {chain.short}
                      </span>
                    </p>
                    <p className="text-[10px] text-[var(--text-dim)] font-mono">
                      {tx.isIncoming ? `de ${shortenAddress(tx.from)}` : `a ${shortenAddress(tx.to)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${tx.isIncoming ? 'text-green-400' : 'text-white'}`}>
                    {tx.isIncoming ? '+' : '-'}{formatBalance(tx.value)} KAIROS
                  </p>
                  <p className="text-[9px] text-[var(--text-dim)]">
                    {new Date(tx.timestamp).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
