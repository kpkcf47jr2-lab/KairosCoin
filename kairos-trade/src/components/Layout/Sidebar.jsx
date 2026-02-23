// Kairos Trade — Sidebar Navigation
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BarChart3, Bot, Link2, Brain, History,
  Settings, Wallet, LogOut, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import useStore from '../../store/useStore';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'chart', icon: BarChart3, label: 'Trading Chart' },
  { id: 'bots', icon: Bot, label: 'Bots' },
  { id: 'strategies', icon: Zap, label: 'Estrategias' },
  { id: 'brokers', icon: Link2, label: 'Brokers' },
  { id: 'ai', icon: Brain, label: 'Kairos AI' },
  { id: 'history', icon: History, label: 'Historial' },
  { id: 'wallet', icon: Wallet, label: 'Wallet' },
  { id: 'settings', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar() {
  const { currentPage, setPage, sidebarOpen, toggleSidebar, bots, brokers, logout } = useStore();

  const activeBots = bots.filter(b => b.status === 'active').length;
  const connectedBrokers = brokers.filter(b => b.connected).length;

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 220 : 64 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col border-r border-[var(--border)] bg-[var(--dark-2)] relative"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--gold)] flex items-center justify-center text-black font-bold text-sm shrink-0">
          K
        </div>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
            <p className="text-sm font-bold text-[var(--gold)]">KAIROS</p>
            <p className="text-[10px] text-[var(--text-dim)] -mt-0.5">TRADE</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const badge = item.id === 'bots' ? activeBots : item.id === 'brokers' ? connectedBrokers : 0;

          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all relative
                ${isActive
                  ? 'text-[var(--gold)] bg-[var(--gold)]/10 border-r-2 border-[var(--gold)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--dark-3)]'
                }`}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && (
                <span className="truncate">{item.label}</span>
              )}
              {badge > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-[var(--gold)] text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[var(--border)] p-2">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-dim)] hover:text-[var(--red)] transition-colors rounded-lg"
        >
          <LogOut size={18} />
          {sidebarOpen && <span>Salir</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 w-6 h-6 bg-[var(--dark-3)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--gold)] transition-colors"
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </motion.aside>
  );
}
