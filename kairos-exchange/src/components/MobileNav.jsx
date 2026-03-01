import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, BarChart3, Droplets, Rocket, Zap } from 'lucide-react';

const BOTTOM_ITEMS = [
  { path: '/', label: 'nav_swap', Icon: ArrowLeftRight },
  { path: '/limit', label: 'nav_limit', Icon: BarChart3 },
  { path: '/pools', label: 'nav_pools', Icon: Droplets },
  { path: '/launchpad', label: 'nav_launchpad', Icon: Rocket },
];

export default function MobileNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-dark-200/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
      {/* Simple ↔ Pro toggle strip */}
      <div className="flex items-center justify-center gap-1 px-4 pt-2 pb-1">
        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 w-full max-w-[200px]">
          <div className="flex-1 text-center py-1 rounded-md bg-brand-500/20 text-brand-400 text-[10px] font-bold">
            Simple
          </div>
          <a href="https://kairos-trade.netlify.app" target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium text-white/40 active:text-white/70 transition-all">
            <Zap className="w-3 h-3" />
            Pro
          </a>
        </div>
      </div>

      <div className="flex items-center justify-around px-1 py-2">
        {BOTTOM_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                isActive
                  ? 'text-brand-400'
                  : 'text-white/30 active:text-white/60'
              }`
            }
          >
            <item.Icon className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-none">{t(item.label)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
