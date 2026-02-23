// Kairos Trade — Sidebar Navigation (BingX-style)
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BarChart3, Bot, Link2, Brain, History,
  Settings, Wallet, LogOut, ChevronLeft, ChevronRight, Zap,
  BarChart2, Play
} from 'lucide-react';
import useStore from '../../store/useStore';

const MAIN_NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'chart', icon: BarChart3, label: 'Trading' },
  { id: 'simulator', icon: Play, label: 'Simulador' },
  { id: 'bots', icon: Bot, label: 'Bots' },
  { id: 'strategies', icon: Zap, label: 'Estrategias' },
];

const TOOLS_NAV = [
  { id: 'ai', icon: Brain, label: 'Kairos AI' },
  { id: 'brokers', icon: Link2, label: 'Brokers' },
  { id: 'history', icon: History, label: 'Historial' },
];

const BOTTOM_NAV = [
  { id: 'wallet', icon: Wallet, label: 'Wallet' },
  { id: 'settings', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar() {
  const { currentPage, setPage, sidebarOpen, toggleSidebar, bots, brokers, logout } = useStore();

  const activeBots = bots.filter(b => b.status === 'active').length;
  const connectedBrokers = brokers.filter(b => b.connected).length;

  const getBadge = (id) => {
    if (id === 'bots') return activeBots;
    if (id === 'brokers') return connectedBrokers;
    return 0;
  };

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    const badge = getBadge(item.id);

    return (
      <button
        onClick={() => setPage(item.id)}
        title={!sidebarOpen ? item.label : undefined}
        className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 relative group
          ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
          ${isActive
            ? 'bg-[var(--gold)]/10 text-[var(--gold)]'
            : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.04]'
          }`}
      >
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--gold)] rounded-r-full"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
        {sidebarOpen && (
          <span className={`text-[13px] truncate ${isActive ? 'font-semibold' : 'font-normal'}`}>
            {item.label}
          </span>
        )}
        {badge > 0 && sidebarOpen && (
          <span className="ml-auto text-[10px] font-medium bg-[var(--gold)]/15 text-[var(--gold)] rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {badge}
          </span>
        )}
        {badge > 0 && !sidebarOpen && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--gold)] rounded-full" />
        )}
      </button>
    );
  };

  const SectionLabel = ({ label }) => (
    sidebarOpen ? (
      <p className="text-[10px] font-semibold text-[var(--text-dim)]/60 uppercase tracking-wider px-3 mb-1 mt-1">
        {label}
      </p>
    ) : (
      <div className="mx-auto w-5 h-px bg-[var(--border)] my-1.5" />
    )
  );

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 60 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full flex flex-col bg-[var(--dark-2)] relative shrink-0"
      style={{ borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 h-[52px] shrink-0 ${sidebarOpen ? 'px-4' : 'justify-center'}`} style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg bg-[var(--gold)] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">K</span>
        </div>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-[var(--text)] tracking-wide">KAIROS</span>
              <span className="text-[10px] font-medium text-[var(--gold)]">TRADE</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${sidebarOpen ? 'px-2' : 'px-1.5'}`}>
        <SectionLabel label="Principal" />
        {MAIN_NAV.map(item => <NavItem key={item.id} item={item} />)}

        <div className="pt-2">
          <SectionLabel label="Herramientas" />
          {TOOLS_NAV.map(item => <NavItem key={item.id} item={item} />)}
        </div>
      </nav>

      {/* Bottom section */}
      <div className={`py-2 space-y-0.5 ${sidebarOpen ? 'px-2' : 'px-1.5'}`} style={{ borderTop: '1px solid var(--border)' }}>
        {BOTTOM_NAV.map(item => <NavItem key={item.id} item={item} />)}
        <button
          onClick={logout}
          title={!sidebarOpen ? 'Salir' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg text-[var(--text-dim)] hover:text-[var(--red)] hover:bg-[var(--red)]/5 transition-all duration-150
            ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}`}
        >
          <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
          {sidebarOpen && <span className="text-[13px]">Salir</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 bg-[var(--dark-3)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--dark-4)] transition-all z-10"
      >
        {sidebarOpen ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
      </button>
    </motion.aside>
  );
}
