import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { Plus, ExternalLink, CheckCircle, AlertCircle, Coins, ArrowRight, Shield, Zap } from 'lucide-react';

const LISTING_STEPS = [
  {
    titleEn: 'Deploy your ERC-20 token on BSC',
    titleEs: 'Despliega tu token ERC-20 en BSC',
    descEn: 'Your token contract must be verified on BscScan.',
    descEs: 'Tu contrato de token debe estar verificado en BscScan.',
  },
  {
    titleEn: 'Create a liquidity pool on KairosSwap',
    titleEs: 'Crea un pool de liquidez en KairosSwap',
    descEn: 'Pair your token with BNB or KAIROS and add initial liquidity.',
    descEs: 'Parea tu token con BNB o KAIROS y agrega liquidez inicial.',
  },
  {
    titleEn: 'Start trading instantly',
    titleEs: 'Empieza a tradear al instante',
    descEn: 'Once the pool has liquidity, anyone can swap your token on Kairos Exchange.',
    descEs: 'Una vez que el pool tiene liquidez, cualquiera puede intercambiar tu token en Kairos Exchange.',
  },
];

const PAIR_OPTIONS = [
  { symbol: 'KAIROS', label: 'KAIROS (Recommended)', labelEs: 'KAIROS (Recomendado)', recommended: true, desc: '0% listing fee • Featured in Exchange', descEs: '0% comisión de listado • Destacado en Exchange' },
  { symbol: 'BNB', label: 'BNB', labelEs: 'BNB', recommended: false, desc: 'Native gas token • High visibility', descEs: 'Token de gas nativo • Alta visibilidad' },
  { symbol: 'USDT', label: 'USDT', labelEs: 'USDT', recommended: false, desc: 'Standard stablecoin pair', descEs: 'Par estándar con stablecoin' },
];

export default function ListTokenPage() {
  const { t, i18n } = useTranslation();
  const { account } = useStore();
  const isEs = i18n.language === 'es';
  const [contractAddress, setContractAddress] = useState('');
  const [selectedPair, setSelectedPair] = useState('KAIROS');
  const [resolving, setResolving] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [error, setError] = useState('');

  const handleResolve = async () => {
    if (!contractAddress || contractAddress.length < 42) {
      setError(isEs ? 'Dirección de contrato inválida' : 'Invalid contract address');
      return;
    }
    setResolving(true);
    setError('');
    setTokenInfo(null);

    try {
      // Try to resolve token info from BscScan or on-chain
      const resp = await fetch(`https://api.bscscan.com/api?module=token&action=tokeninfo&contractaddress=${contractAddress}&apikey=YourApiKeyToken`);
      const data = await resp.json();

      if (data.result && data.result[0]) {
        setTokenInfo({
          name: data.result[0].tokenName || 'Unknown',
          symbol: data.result[0].symbol || '???',
          decimals: parseInt(data.result[0].divisor) || 18,
          totalSupply: data.result[0].totalSupply || '0',
        });
      } else {
        // Fallback — just show the address
        setTokenInfo({
          name: 'Token',
          symbol: contractAddress.slice(0, 6).toUpperCase(),
          decimals: 18,
          totalSupply: 'Unknown',
        });
      }
    } catch {
      setTokenInfo({
        name: 'Token',
        symbol: '???',
        decimals: 18,
        totalSupply: 'Unknown',
      });
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">{isEs ? 'Lista Tu Token' : 'List Your Token'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          {isEs ? 'Lista Tu Token en' : 'List Your Token on'}{' '}
          <span className="text-brand-400">Kairos Exchange</span>
        </h1>
        <p className="text-sm text-white/40 max-w-lg mx-auto">
          {isEs
            ? 'KairosSwap es permisionless. Cualquier token en BSC puede crear un pool y empezar a tradear al instante. Sin aprobación requerida.'
            : 'KairosSwap is permissionless. Any BSC token can create a pool and start trading instantly. No approval required.'}
        </p>
      </div>

      {/* Advantage: Pair with KAIROS banner */}
      <div className="bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <img src="/kairos-token.png" alt="KAIROS" className="w-8 h-8 object-contain" onError={(e) => { e.target.textContent = 'K'; e.target.className = 'text-brand-400 font-extrabold text-xl'; }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              {isEs ? '🌟 Par con KAIROS = Beneficios Premium' : '🌟 Pair with KAIROS = Premium Benefits'}
            </h3>
            <ul className="text-xs text-white/50 space-y-1">
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {isEs ? '0% comisión de listado (tokens pareados con KAIROS)' : '0% listing fee (KAIROS-paired tokens)'}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {isEs ? 'Destacado en la página principal del Exchange' : 'Featured on Exchange homepage'}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {isEs ? 'Acceso al Launchpad para máxima exposición' : 'Launchpad access for maximum exposure'}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {isEs ? 'Marketing gratuito en redes sociales de Kairos' : 'Free marketing on Kairos social media'}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3-Step Process */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">{isEs ? 'Proceso en 3 Pasos' : '3-Step Process'}</h2>
        <div className="space-y-3">
          {LISTING_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 text-brand-400 font-bold text-sm">{i + 1}</div>
              <div>
                <h4 className="text-sm font-bold text-white">{isEs ? step.titleEs : step.titleEn}</h4>
                <p className="text-xs text-white/40 mt-0.5">{isEs ? step.descEs : step.descEn}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token Resolver */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-brand-400" />
          {isEs ? 'Verificar Tu Token' : 'Verify Your Token'}
        </h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder={isEs ? 'Pega la dirección del contrato BSC (0x...)' : 'Paste BSC contract address (0x...)'}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-brand-500/40 font-mono"
          />
          <button onClick={handleResolve} disabled={resolving} className="btn-primary px-5 py-3 text-sm font-bold whitespace-nowrap">
            {resolving ? '...' : isEs ? 'Verificar' : 'Verify'}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 flex items-center gap-1 mb-3"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}

        {tokenInfo && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 animate-fade-in mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">{tokenInfo.symbol?.charAt(0)}</div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  {tokenInfo.symbol}
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-white/40">{tokenInfo.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pair Selection */}
        <h4 className="text-sm font-semibold text-white/60 mb-2">{isEs ? 'Selecciona el par base' : 'Select base pair'}</h4>
        <div className="space-y-2 mb-4">
          {PAIR_OPTIONS.map(opt => (
            <button
              key={opt.symbol}
              onClick={() => setSelectedPair(opt.symbol)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                selectedPair === opt.symbol
                  ? 'bg-brand-500/10 border-brand-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedPair === opt.symbol ? 'bg-brand-500/20' : 'bg-white/10'}`}>
                <span className={`text-sm font-bold ${selectedPair === opt.symbol ? 'text-brand-400' : 'text-white/50'}`}>
                  {opt.symbol === 'KAIROS' ? 'K' : opt.symbol.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  {isEs ? opt.labelEs : opt.label}
                  {opt.recommended && <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold">★ RECOMMENDED</span>}
                </div>
                <p className="text-xs text-white/40">{isEs ? opt.descEs : opt.desc}</p>
              </div>
              {selectedPair === opt.symbol && <CheckCircle className="w-5 h-5 text-brand-400" />}
            </button>
          ))}
        </div>

        {/* Action */}
        <a href="/pools" className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2">
          {isEs ? 'Ir a Crear Pool de Liquidez' : 'Go to Create Liquidity Pool'} <ArrowRight className="w-4 h-4" />
        </a>

        <p className="text-[10px] text-white/20 text-center mt-3">
          {isEs
            ? 'KairosSwap Factory: 0xB5891c54199d539CB8afd37BFA9E17370095b9D9 • Router: 0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6'
            : 'KairosSwap Factory: 0xB5891c54199d539CB8afd37BFA9E17370095b9D9 • Router: 0x4F8C99a49d04790Ea8C48CC60F88DB327e509Cd6'}
        </p>
      </div>

      {/* Direct link */}
      <div className="text-center text-xs text-white/30">
        {isEs ? '¿Necesitas ayuda?' : 'Need help?'}{' '}
        <a href="https://kairos-777.com" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
          {isEs ? 'Contacta a Kairos 777' : 'Contact Kairos 777'} <ExternalLink className="w-3 h-3 inline" />
        </a>
      </div>
    </div>
  );
}
