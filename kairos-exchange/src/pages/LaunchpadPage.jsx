import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, Shield, Zap, Users, ExternalLink, ChevronRight, Star, Clock, TrendingUp } from 'lucide-react';

const UPCOMING_PROJECTS = [
  {
    name: 'KairosCoin',
    symbol: 'KAIROS',
    logo: '/kairos-token.png',
    description: 'USD-pegged stablecoin — 1 KAIROS = 1 USD. Lower fees than USDT/USDC.',
    descriptionEs: 'Stablecoin anclado al USD — 1 KAIROS = 1 USD. Comisiones más bajas que USDT/USDC.',
    status: 'live',
    raised: '$10B',
    chain: 'BSC',
    website: 'https://kairos-777.com',
    contract: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
    featured: true,
  },
];

const LAUNCH_BENEFITS = [
  { icon: Shield, titleEn: 'Audited Launch', titleEs: 'Lanzamiento Auditado', descEn: 'Every project is reviewed before listing on KairosSwap', descEs: 'Cada proyecto es revisado antes de listarse en KairosSwap' },
  { icon: Zap, titleEn: 'Instant Liquidity', titleEs: 'Liquidez Instantánea', descEn: 'Pool created automatically on KairosSwap AMM', descEs: 'Pool creado automáticamente en KairosSwap AMM' },
  { icon: Users, titleEn: 'Community First', titleEs: 'Comunidad Primero', descEn: 'Fair launch model — no insider allocations', descEs: 'Modelo de lanzamiento justo — sin asignaciones internas' },
  { icon: TrendingUp, titleEn: 'Marketing Support', titleEs: 'Soporte de Marketing', descEn: 'Featured on Kairos Exchange for maximum visibility', descEs: 'Destacado en Kairos Exchange para máxima visibilidad' },
];

export default function LaunchpadPage() {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
          <Rocket className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold text-brand-400">Kairos Launchpad</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          {isEs ? 'Lanza Tu Token en' : 'Launch Your Token on'}{' '}
          <span className="text-brand-400">KairosSwap</span>
        </h1>
        <p className="text-sm text-white/40 max-w-lg mx-auto">
          {isEs
            ? 'La plataforma de lanzamiento de tokens en BNB Chain. Liquidez instantánea, visibilidad máxima, comisiones mínimas.'
            : 'The token launch platform on BNB Chain. Instant liquidity, maximum visibility, minimal fees.'}
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LAUNCH_BENEFITS.map((b, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-brand-500/20 transition-all group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20 transition-colors">
                <b.icon className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{isEs ? b.titleEs : b.titleEn}</h3>
                <p className="text-xs text-white/40 mt-0.5">{isEs ? b.descEs : b.descEn}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Featured Project: KAIROS */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-brand-400" />
          {isEs ? 'Proyecto Destacado' : 'Featured Project'}
        </h2>
        {UPCOMING_PROJECTS.filter(p => p.featured).map(project => (
          <div key={project.symbol} className="relative bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 rounded-2xl p-5 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/5 rounded-full blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={project.logo} alt={project.symbol} className="w-12 h-12 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-extrabold text-white">{project.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-bold">${project.symbol}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> LIVE
                  </span>
                </div>
                <p className="text-sm text-white/50 mb-3">{isEs ? project.descriptionEs : project.description}</p>
                <div className="flex items-center gap-4 text-xs text-white/30">
                  <span>{isEs ? 'Cadena' : 'Chain'}: <strong className="text-white/60">{project.chain}</strong></span>
                  <span>{isEs ? 'Suministro' : 'Supply'}: <strong className="text-white/60">{project.raised}</strong></span>
                  <a href={project.website} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 flex items-center gap-1">
                    Website <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <a href={`/pools`} className="btn-primary px-5 py-2.5 text-sm font-bold flex items-center gap-2">
                {isEs ? 'Agregar Liquidez' : 'Add Liquidity'} <ChevronRight className="w-4 h-4" />
              </a>
              <a href={`https://bscscan.com/token/${project.contract}`} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
                BscScan <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Apply to Launch */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-center">
        <Rocket className="w-10 h-10 text-brand-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">{isEs ? '¿Tienes un proyecto?' : 'Have a project?'}</h3>
        <p className="text-sm text-white/40 mb-4 max-w-md mx-auto">
          {isEs
            ? 'Lanza tu token en KairosSwap. Pool de liquidez instantáneo, visibilidad en el Exchange, y soporte de marketing.'
            : 'Launch your token on KairosSwap. Instant liquidity pool, Exchange visibility, and marketing support.'}
        </p>

        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="btn-primary px-6 py-3 text-sm font-bold">
            {isEs ? 'Aplicar para Lanzamiento' : 'Apply for Launch'} <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        ) : (
          <div className="max-w-md mx-auto space-y-3 text-left animate-fade-in">
            <input type="text" placeholder={isEs ? 'Nombre del Proyecto' : 'Project Name'} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-brand-500/40" />
            <input type="text" placeholder={isEs ? 'Símbolo del Token (ej: ABC)' : 'Token Symbol (e.g., ABC)'} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-brand-500/40" />
            <input type="text" placeholder={isEs ? 'Dirección del Contrato en BSC' : 'Contract Address on BSC'} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-brand-500/40" />
            <input type="email" placeholder={isEs ? 'Email de contacto' : 'Contact Email'} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-brand-500/40" />
            <textarea placeholder={isEs ? 'Describe tu proyecto (roadmap, equipo, tokenomics)' : 'Describe your project (roadmap, team, tokenomics)'} rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-brand-500/40 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10">
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => { setShowForm(false); alert(isEs ? '✅ Solicitud enviada! Te contactaremos en 24-48h.' : '✅ Application sent! We\'ll contact you within 24-48h.'); }}
                className="flex-1 btn-primary px-4 py-3 text-sm font-bold"
              >
                {isEs ? 'Enviar Solicitud' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">{isEs ? 'Cómo Funciona' : 'How It Works'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { num: '1', titleEn: 'Apply', titleEs: 'Aplica', descEn: 'Submit your project for review. We verify the contract and tokenomics.', descEs: 'Envía tu proyecto para revisión. Verificamos el contrato y tokenomics.' },
            { num: '2', titleEn: 'Create Pool', titleEs: 'Crea Pool', descEn: 'We create a KairosSwap liquidity pool paired with KAIROS or BNB.', descEs: 'Creamos un pool de liquidez en KairosSwap pareado con KAIROS o BNB.' },
            { num: '3', titleEn: 'Go Live', titleEs: 'En Vivo', descEn: 'Your token is live on Kairos Exchange, tradeable by anyone.', descEs: 'Tu token está en vivo en Kairos Exchange, tradeable por cualquiera.' },
          ].map(step => (
            <div key={step.num} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-3 text-brand-400 font-extrabold text-lg">{step.num}</div>
              <h4 className="text-sm font-bold text-white mb-1">{isEs ? step.titleEs : step.titleEn}</h4>
              <p className="text-xs text-white/40">{isEs ? step.descEs : step.descEn}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
