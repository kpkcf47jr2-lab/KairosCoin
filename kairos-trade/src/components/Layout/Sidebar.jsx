// Kairos Trade — Sidebar Navigation (Premium v2.1 — Kairos First)
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, BarChart3, Bot, Link2, Brain, History,
  Settings, Wallet, LogOut, ChevronLeft, ChevronRight, Zap,
  Play, Bell, Crown, User, Sparkles, Activity, BookOpen,
  Shield, Grid3x3, CreditCard, TrendingUp, Landmark
} from 'lucide-react';
import useStore from '../../store/useStore';

const SECTIONS = [
  {
    label: 'Kairos',
    kairos: true,
    items: [
      { id: 'kairos-broker', icon: TrendingUp, label: 'Kairos Broker', desc: 'Trading con apalancamiento', kairos: true },
      { id: 'kairos-vault', icon: Landmark, label: 'Kairos Vault', desc: 'Provee liquidez y gana yield', kairos: true },
      { id: 'buy-kairos', icon: CreditCard, label: 'Comprar KAIROS', desc: 'Con tarjeta de crédito', kairos: true },
    ],
  },
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Panel de control' },
      { id: 'chart', icon: BarChart3, label: 'Trading', desc: 'Gráficos en vivo' },
      { id: 'multichart', icon: Grid3x3, label: 'Multi-Chart', desc: 'Vista profesional' },
      { id: 'simulator', icon: Play, label: 'Simulador', desc: 'Paper trading' },
    ],
  },
  {
    label: 'Automatización',
    items: [
      { id: 'bots', icon: Bot, label: 'Bots', desc: 'Trading automático' },
      { id: 'strategies', icon: Zap, label: 'Estrategias', desc: 'Crear y gestionar' },
      { id: 'ai', icon: Sparkles, label: 'Kairos AI', desc: 'Asistente IA', accent: true },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { id: 'portfolio', icon: Activity, label: 'Portfolio', desc: 'P&L y rendimiento' },
      { id: 'journal', icon: BookOpen, label: 'Journal', desc: 'Diario de trades' },
      { id: 'risk', icon: Shield, label: 'Riesgo', desc: 'Gestión de riesgo' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { id: 'brokers', icon: Link2, label: 'Brokers', desc: 'Conexiones API' },
      { id: 'history', icon: History, label: 'Historial', desc: 'Trades y reportes' },
      { id: 'alerts', icon: Bell, label: 'Alertas', desc: 'Notificaciones' },
    ],
  },
];

const BOTTOM_ITEMS = [
  { id: 'wallet', icon: Wallet, label: 'Wallet' },
  { id: 'settings', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar() {
  const { currentPage, setPage, sidebarOpen, toggleSidebar, bots, brokers, logout, user } = useStore();
  const [hoveredItem, setHoveredItem] = useState(null);

  const activeBots = bots.filter(b => b.status === 'active').length;
  const connectedBrokers = brokers.filter(b => b.connected).length;

  const getBadge = (id) => {
    if (id === 'bots') return activeBots;
    if (id === 'brokers') return connectedBrokers;
    return 0;
  };

  const NavItem = ({ item, compact = false }) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    const badge = getBadge(item.id);
    const isHovered = hoveredItem === item.id;
    const isKairos = item.kairos;

    return (
      <div className="relative">
        <button
          onClick={() => setPage(item.id)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          title={!sidebarOpen ? item.label : undefined}
          className={`w-full flex items-center rounded-xl transition-all duration-200 relative group
            ${sidebarOpen ? 'px-3 py-3 gap-3.5' : 'px-0 py-3 justify-center'}
            ${isActive
              ? 'text-white'
              : isKairos
                ? 'text-blue-300/80 hover:text-blue-200'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
        >
          {/* Active background */}
          {isActive && (
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: isKairos
                  ? 'linear-gradient(135deg, rgba(59,130,246,0.20), rgba(37,99,235,0.10))'
                  : item.accent
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(96,165,250,0.06))'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
                border: isKairos
                  ? '1px solid rgba(59,130,246,0.25)'
                  : '1px solid rgba(59,130,246,0.1)',
              }}
            />
          )}

          {/* Kairos hover glow */}
          {isKairos && !isActive && isHovered && (
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.04))',
                border: '1px solid rgba(59,130,246,0.12)',
              }}
            />
          )}

          {/* Active left bar */}
          {isActive && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
              style={{ background: isKairos
                ? 'linear-gradient(180deg, #60A5FA, #2563EB)'
                : 'linear-gradient(180deg, #60A5FA, #3B82F6)' }}
            />
          )}

          {/* Icon container */}
          <div className={`relative z-10 flex items-center justify-center shrink-0 rounded-lg transition-all duration-200
            ${sidebarOpen ? 'w-8 h-8' : 'w-9 h-9'}
            ${isActive
              ? isKairos
                ? 'bg-blue-500/20'
                : (item.accent ? 'bg-[var(--gold)]/20' : 'bg-white/[0.06]')
              : isKairos
                ? 'bg-blue-500/10'
                : 'bg-transparent group-hover:bg-white/[0.04]'
            }`}
          >
            <Icon
              size={sidebarOpen ? 18 : 20}
              strokeWidth={isActive ? 2 : 1.5}
              className={`transition-colors ${
                isKairos
                  ? (isActive ? 'text-blue-400' : 'text-blue-400/70')
                  : (isActive && item.accent ? 'text-[var(--gold-light)]' : '')
              }`}
            />
            {badge > 0 && !sidebarOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-[14px] h-[14px] bg-[var(--gold)] rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                {badge}
              </span>
            )}
          </div>

          {/* Label + description */}
          {sidebarOpen && (
            <div className="relative z-10 flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className={`text-[14px] truncate leading-tight ${isActive ? 'font-bold' : 'font-medium'} ${isKairos && !isActive ? 'text-blue-300/90' : ''}`}>
                  {item.label}
                </span>
                {isKairos && (
                  <span className="text-[8px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Kairos
                  </span>
                )}
                {item.accent && !isKairos && (
                  <span className="text-[8px] font-bold bg-[var(--gold)]/20 text-[var(--gold-light)] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Pro
                  </span>
                )}
                {badge > 0 && (
                  <span className="ml-auto text-[10px] font-semibold bg-[var(--gold)]/12 text-[var(--gold)] rounded-full px-2 py-0.5 min-w-[22px] text-center">
                    {badge}
                  </span>
                )}
              </div>
              {!compact && item.desc && (
                <span className={`text-[11px] leading-tight truncate block mt-0.5 transition-colors
                  ${isKairos
                    ? (isActive ? 'text-blue-300/60' : 'text-blue-400/40')
                    : (isActive ? 'text-[var(--text-dim)]' : 'text-[var(--text-dim)]/50')
                  }`}>
                  {item.desc}
                </span>
              )}
            </div>
          )}
        </button>

        {/* Tooltip for collapsed mode */}
        <AnimatePresence>
          {!sidebarOpen && isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
            >
              <div className="bg-[var(--dark-3)] border border-[var(--border-light)] px-3 py-2 rounded-lg shadow-xl">
                <p className="text-xs font-semibold text-[var(--text)] whitespace-nowrap">{item.label}</p>
                {item.desc && <p className="text-[10px] text-[var(--text-dim)] whitespace-nowrap">{item.desc}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SectionLabel = ({ label, kairos = false }) => (
    sidebarOpen ? (
      <div className="flex items-center gap-2 px-3 mb-2.5 mt-1">
        <p className={`text-[11px] font-bold uppercase tracking-[0.14em] whitespace-nowrap
          ${kairos ? 'text-blue-400/80' : 'text-[var(--text-dim)]/60'}`}>
          {label}
        </p>
        <div className={`flex-1 h-px ${kairos ? 'bg-blue-500/20' : 'bg-[var(--border)]/50'}`} />
      </div>
    ) : (
      <div className={`mx-auto w-6 h-px my-3 ${kairos ? 'bg-blue-500/30' : 'bg-[var(--border)]/60'}`} />
    )
  );

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 300 : 72 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col relative shrink-0"
      style={{
        borderRight: '1px solid var(--border)',
        background: 'linear-gradient(180deg, #0E1015 0%, #08090C 100%)',
      }}
    >
      {/* Logo area */}
      <div
        className={`flex items-center shrink-0 ${sidebarOpen ? 'px-7 gap-3.5 h-[68px]' : 'justify-center h-[68px]'}`}
        style={{ borderBottom: '1px solid rgba(30,34,45,0.6)' }}
      >
        <img src="/kairos-logo.png" alt="Kairos" className="w-10 h-10 object-contain shrink-0" />
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.2 }}>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-[17px] font-bold text-[var(--text)] tracking-wide">KAIROS</span>
                <span className="text-[11px] font-bold text-[var(--gold)] tracking-widest">TRADE</span>
              </div>
              <span className="text-[10px] text-[var(--text-dim)]/60 font-medium tracking-wider">BY KAIROS 777</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* User profile card */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-5 mt-4 mb-2 p-3.5 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(26,29,38,0.5))',
            border: '1px solid rgba(59,130,246,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--dark-4)] flex items-center justify-center">
              <User size={16} className="text-[var(--text-dim)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text)] truncate">{user?.name || 'Trader'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Crown size={10} className="text-[var(--gold)]" />
                <span className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-wider">Free Plan</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Navigation */}
      <nav className={`flex-1 overflow-y-auto py-3 ${sidebarOpen ? 'px-5' : 'px-2'}`}
        style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map((section, si) => (
          <div key={section.label} className={si > 0 ? 'mt-6' : 'mt-1'}>
            <SectionLabel label={section.label} kairos={section.kairos} />
            <div className="space-y-1">
              {section.items.map(item => <NavItem key={item.id} item={item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div
        className={`py-3 ${sidebarOpen ? 'px-5' : 'px-2'}`}
        style={{ borderTop: '1px solid rgba(30,34,45,0.6)' }}
      >
        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map(item => <NavItem key={item.id} item={item} compact />)}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          onMouseEnter={() => setHoveredItem('logout')}
          onMouseLeave={() => setHoveredItem(null)}
          title={!sidebarOpen ? 'Salir' : undefined}
          className={`w-full flex items-center rounded-xl text-[var(--text-dim)] hover:text-[var(--red)] transition-all duration-200 mt-1 relative
            ${sidebarOpen ? 'px-3 py-2.5 gap-3' : 'px-0 py-2.5 justify-center'}
            hover:bg-[var(--red)]/[0.06]`}
        >
          <div className={`flex items-center justify-center shrink-0 rounded-lg ${sidebarOpen ? 'w-8 h-8' : 'w-9 h-9'}`}>
            <LogOut size={sidebarOpen ? 16 : 18} strokeWidth={1.5} />
          </div>
          {sidebarOpen && <span className="text-[14px] font-medium">Cerrar Sesión</span>}

          {/* Logout tooltip */}
          <AnimatePresence>
            {!sidebarOpen && hoveredItem === 'logout' && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
              >
                <div className="bg-[var(--dark-3)] border border-[var(--border-light)] px-3 py-2 rounded-lg shadow-xl">
                  <p className="text-xs font-semibold text-[var(--red)] whitespace-nowrap">Cerrar Sesión</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 w-6 h-6 bg-[var(--dark-3)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 hover:bg-[var(--dark-4)] transition-all z-10 shadow-lg"
      >
        {sidebarOpen ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
      </button>
    </motion.aside>
  );
}
