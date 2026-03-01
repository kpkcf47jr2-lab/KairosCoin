// Kairos Trade — Sidebar Navigation (Premium v2.2 — i18n + Kairos First)
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, BarChart3, Bot, Link2, Brain, History,
  Settings, Wallet, LogOut, ChevronLeft, ChevronRight, Zap,
  Play, Bell, Crown, User, Sparkles, Activity, BookOpen,
  Shield, Grid3x3, CreditCard, TrendingUp, Landmark, ArrowLeftRight
} from 'lucide-react';
import useStore from '../../store/useStore';
import { isAdmin } from '../../constants';
import useTranslation from '../../hooks/useTranslation';

// Section/item IDs only — labels come from i18n
const SECTIONS = [
  {
    labelKey: 'kairos',
    kairos: true,
    items: [
      { id: 'kairos-broker', icon: TrendingUp, kairos: true },
      { id: 'kairos-vault', icon: Landmark, kairos: true },
      { id: 'kairos-treasury', icon: Crown, kairos: true, adminOnly: true },
      { id: 'buy-kairos', icon: CreditCard, kairos: true },
    ],
  },
  {
    labelKey: 'principal',
    items: [
      { id: 'dashboard', icon: LayoutDashboard },
      { id: 'chart', icon: BarChart3 },
      { id: 'multichart', icon: Grid3x3 },
      { id: 'heatmap', icon: Activity },
      { id: 'simulator', icon: Play },
    ],
  },
  {
    labelKey: 'automation',
    items: [
      { id: 'bots', icon: Bot },
      { id: 'strategies', icon: Zap },
      { id: 'ai', icon: Sparkles, accent: true },
    ],
  },
  {
    labelKey: 'analytics',
    items: [
      { id: 'portfolio', icon: Activity },
      { id: 'journal', icon: BookOpen },
      { id: 'risk', icon: Shield },
    ],
  },
  {
    labelKey: 'management',
    items: [
      { id: 'brokers', icon: Link2 },
      { id: 'history', icon: History },
      { id: 'alerts', icon: Bell },
    ],
  },
];

const BOTTOM_ITEMS = [
  { id: 'wallet', icon: Wallet },
  { id: 'settings', icon: Settings },
];

export default function Sidebar({ forceMobileOpen }) {
  const { currentPage, setPage, sidebarOpen, toggleSidebar, bots, brokers, logout, user } = useStore();
  const [hoveredItem, setHoveredItem] = useState(null);
  const { t, lang } = useTranslation();

  // On mobile overlay, always show expanded
  const isExpanded = forceMobileOpen || sidebarOpen;

  const activeBots = bots.filter(b => b.status === 'active').length;
  const connectedBrokers = brokers.filter(b => b.connected).length;
  const userIsAdmin = isAdmin(user);

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
    const label = t(`nav.${item.id}`);
    const desc = t(`nav.${item.id}-desc`);

    return (
      <div className="relative">
        <button
          onClick={() => setPage(item.id)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          title={!isExpanded ? label : undefined}
          className={`w-full flex items-center rounded-xl transition-all duration-200 relative group
            ${isExpanded ? 'px-3 py-3 gap-3.5' : 'px-0 py-3 justify-center'}
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
            ${isExpanded ? 'w-8 h-8' : 'w-9 h-9'}
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
              size={isExpanded ? 18 : 20}
              strokeWidth={isActive ? 2 : 1.5}
              className={`transition-colors ${
                isKairos
                  ? (isActive ? 'text-blue-400' : 'text-blue-400/70')
                  : (isActive && item.accent ? 'text-[var(--gold-light)]' : '')
              }`}
            />
            {badge > 0 && !isExpanded && (
              <span className="absolute -top-0.5 -right-0.5 w-[14px] h-[14px] bg-[var(--gold)] rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                {badge}
              </span>
            )}
          </div>

          {/* Label + description */}
          {isExpanded && (
            <div className="relative z-10 flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className={`text-[14px] truncate leading-tight ${isActive ? 'font-bold' : 'font-medium'} ${isKairos && !isActive ? 'text-blue-300/90' : ''}`}>
                  {label}
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
              {!compact && desc && !desc.startsWith('nav.') && (
                <span className={`text-[11px] leading-tight truncate block mt-0.5 transition-colors
                  ${isKairos
                    ? (isActive ? 'text-blue-300/60' : 'text-blue-400/40')
                    : (isActive ? 'text-[var(--text-dim)]' : 'text-[var(--text-dim)]/50')
                  }`}>
                  {desc}
                </span>
              )}
            </div>
          )}
        </button>

        {/* Tooltip for collapsed mode */}
        <AnimatePresence>
          {!isExpanded && isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
            >
              <div className="bg-[var(--dark-3)] border border-[var(--border-light)] px-3 py-2 rounded-lg shadow-xl">
                <p className="text-xs font-semibold text-[var(--text)] whitespace-nowrap">{label}</p>
                {desc && !desc.startsWith('nav.') && <p className="text-[10px] text-[var(--text-dim)] whitespace-nowrap">{desc}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SectionLabel = ({ label, kairos = false }) => (
    isExpanded ? (
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
      animate={{ width: isExpanded ? 300 : 72 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="h-full flex flex-col relative shrink-0"
      style={{
        borderRight: '1px solid var(--border)',
        background: 'linear-gradient(180deg, #0E1015 0%, #08090C 100%)',
      }}
    >
      {/* Logo area */}
      <div
        className={`flex items-center shrink-0 ${isExpanded ? 'px-7 gap-3.5 h-[68px]' : 'justify-center h-[68px]'}`}
        style={{ borderBottom: '1px solid rgba(30,34,45,0.6)' }}
      >
        <img src="/kairos-logo.png" alt="Kairos" className="w-10 h-10 object-contain shrink-0" />
        {isExpanded && (
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
      {isExpanded && (
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
                {userIsAdmin ? (
                  <>
                    <Shield size={10} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Admin</span>
                  </>
                ) : (
                  <>
                    <Crown size={10} className="text-[var(--gold)]" />
                    <span className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-wider">{user?.plan === 'enterprise' ? 'Enterprise' : 'Free Plan'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Navigation */}
      <nav className={`flex-1 overflow-y-auto py-3 ${isExpanded ? 'px-5' : 'px-2'}`}
        style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map((section, si) => {
          const visibleItems = section.items.filter(item => !item.adminOnly || userIsAdmin);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.labelKey} className={si > 0 ? 'mt-6' : 'mt-1'}>
              <SectionLabel label={t(`sidebar.${section.labelKey}`)} kairos={section.kairos} />
              <div className="space-y-1">
                {visibleItems.map(item => <NavItem key={item.id} item={item} />)}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className={`py-3 ${isExpanded ? 'px-5' : 'px-2'}`}
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
          title={!isExpanded ? t('nav.settings') : undefined}
          className={`w-full flex items-center rounded-xl text-[var(--text-dim)] hover:text-[var(--red)] transition-all duration-200 mt-1 relative
            ${isExpanded ? 'px-3 py-2.5 gap-3' : 'px-0 py-2.5 justify-center'}
            hover:bg-[var(--red)]/[0.06]`}
        >
          <div className={`flex items-center justify-center shrink-0 rounded-lg ${isExpanded ? 'w-8 h-8' : 'w-9 h-9'}`}>
            <LogOut size={isExpanded ? 16 : 18} strokeWidth={1.5} />
          </div>
          {isExpanded && <span className="text-[14px] font-medium">{lang === 'es' ? 'Cerrar Sesión' : 'Log Out'}</span>}

          {/* Logout tooltip */}
          <AnimatePresence>
            {!isExpanded && hoveredItem === 'logout' && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
              >
                <div className="bg-[var(--dark-3)] border border-[var(--border-light)] px-3 py-2 rounded-lg shadow-xl">
                  <p className="text-xs font-semibold text-[var(--red)] whitespace-nowrap">{lang === 'es' ? 'Cerrar Sesión' : 'Log Out'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Simple ↔ Pro toggle — above collapse */}
      <div className={`${isExpanded ? 'px-5' : 'px-2'} pb-3`} style={{ borderTop: '1px solid rgba(30,34,45,0.4)' }}>
        <div className={`flex items-center ${isExpanded ? 'gap-1' : 'flex-col gap-1'} bg-white/[0.02] border border-[var(--border)]/40 rounded-xl p-1 mt-3`}>
          <a href="https://kairos-exchange-app.netlify.app" target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-center gap-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/[0.04] transition-all
              ${isExpanded ? 'flex-1 px-3 py-2' : 'w-full py-2'}`}>
            <ArrowLeftRight size={isExpanded ? 13 : 16} />
            {isExpanded && <span className="text-[11px] font-medium">Simple</span>}
          </a>
          <div className={`flex items-center justify-center gap-1.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/15
            ${isExpanded ? 'flex-1 px-3 py-2' : 'w-full py-2'}`}>
            <Zap size={isExpanded ? 13 : 16} />
            {isExpanded && <span className="text-[11px] font-bold">Pro</span>}
            {!isExpanded && <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />}
          </div>
        </div>
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 w-6 h-6 bg-[var(--dark-3)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 hover:bg-[var(--dark-4)] transition-all z-10 shadow-lg hidden md:flex"
      >
        {isExpanded ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
      </button>
    </motion.aside>
  );
}
