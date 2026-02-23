// Kairos Trade — Sidebar Navigation (Premium v2)
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, BarChart3, Bot, Link2, Brain, History,
  Settings, Wallet, LogOut, ChevronLeft, ChevronRight, Zap,
  Play, Bell, Crown, User, Sparkles
} from 'lucide-react';
import useStore from '../../store/useStore';

const SECTIONS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Panel de control' },
      { id: 'chart', icon: BarChart3, label: 'Trading', desc: 'Gráficos en vivo' },
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

    return (
      <div className="relative">
        <button
          onClick={() => setPage(item.id)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          title={!sidebarOpen ? item.label : undefined}
          className={`w-full flex items-center rounded-xl transition-all duration-200 relative group
            ${sidebarOpen ? 'px-3 py-3 gap-3' : 'px-0 py-3 justify-center'}
            ${isActive
              ? 'text-white'
              : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
        >
          {/* Active background */}
          {isActive && (
            <motion.div
              layoutId="navBg"
              className="absolute inset-0 rounded-xl"
              style={{
                background: item.accent
                  ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(96,165,250,0.08))'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
                border: '1px solid rgba(59,130,246,0.15)',
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}

          {/* Active left bar */}
          {isActive && (
            <motion.div
              layoutId="activeBar"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
              style={{ background: 'linear-gradient(180deg, #60A5FA, #3B82F6)' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}

          {/* Icon container */}
          <div className={`relative z-10 flex items-center justify-center shrink-0 rounded-lg transition-all duration-200
            ${sidebarOpen ? 'w-8 h-8' : 'w-9 h-9'}
            ${isActive
              ? (item.accent ? 'bg-[var(--gold)]/20' : 'bg-white/[0.06]')
              : 'bg-transparent group-hover:bg-white/[0.04]'
            }`}
          >
            <Icon
              size={sidebarOpen ? 18 : 20}
              strokeWidth={isActive ? 2 : 1.5}
              className={`transition-colors ${isActive && item.accent ? 'text-[var(--gold-light)]' : ''}`}
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
                <span className={`text-[13px] truncate leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {item.accent && (
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
                <span className={`text-[10px] leading-tight truncate block mt-0.5 transition-colors
                  ${isActive ? 'text-[var(--text-dim)]' : 'text-[var(--text-dim)]/50'}`}>
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

  const SectionLabel = ({ label }) => (
    sidebarOpen ? (
      <div className="flex items-center gap-2 px-3 mb-2 mt-1">
        <p className="text-[10px] font-bold text-[var(--text-dim)]/40 uppercase tracking-[0.12em]">
          {label}
        </p>
        <div className="flex-1 h-px bg-[var(--border)]/50" />
      </div>
    ) : (
      <div className="mx-auto w-6 h-px bg-[var(--border)]/60 my-3" />
    )
  );

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col relative shrink-0"
      style={{
        borderRight: '1px solid var(--border)',
        background: 'linear-gradient(180deg, #111318 0%, #0D1017 100%)',
      }}
    >
      {/* Logo area */}
      <div
        className={`flex items-center shrink-0 ${sidebarOpen ? 'px-5 gap-3 h-[60px]' : 'justify-center h-[60px]'}`}
        style={{ borderBottom: '1px solid rgba(30,34,45,0.6)' }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
          <span className="text-white font-bold text-sm">K</span>
          <div className="absolute inset-0 rounded-xl" style={{ boxShadow: '0 0 20px rgba(59,130,246,0.25)' }} />
        </div>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.2 }}>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[15px] font-bold text-[var(--text)] tracking-wide">KAIROS</span>
                <span className="text-[10px] font-bold text-[var(--gold)] tracking-widest">TRADE</span>
              </div>
              <span className="text-[9px] text-[var(--text-dim)]/60 font-medium tracking-wider">BY KAIROS 777</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* User profile card */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-3 mt-4 mb-2 p-3 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(30,34,45,0.5))',
            border: '1px solid rgba(59,130,246,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--dark-4)] flex items-center justify-center">
              <User size={14} className="text-[var(--text-dim)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text)] truncate">{user?.name || 'Trader'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Crown size={9} className="text-[var(--gold)]" />
                <span className="text-[9px] font-bold text-[var(--gold)] uppercase tracking-wider">Free Plan</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Navigation */}
      <nav className={`flex-1 overflow-y-auto py-2 ${sidebarOpen ? 'px-3' : 'px-2'}`}
        style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map((section, si) => (
          <div key={section.label} className={si > 0 ? 'mt-5' : 'mt-1'}>
            <SectionLabel label={section.label} />
            <div className="space-y-0.5">
              {section.items.map(item => <NavItem key={item.id} item={item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div
        className={`py-3 ${sidebarOpen ? 'px-3' : 'px-2'}`}
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
          {sidebarOpen && <span className="text-[13px] font-medium">Cerrar Sesión</span>}

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
