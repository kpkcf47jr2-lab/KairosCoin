import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, BarChart3, Briefcase, Droplets, ArrowRightLeft } from 'lucide-react';

const BOTTOM_ITEMS = [
  { path: '/', label: 'nav_swap', Icon: ArrowLeftRight },
  { path: '/limit', label: 'nav_limit', Icon: BarChart3 },
  { path: '/portfolio', label: 'nav_portfolio', Icon: Briefcase },
  { path: '/pools', label: 'nav_pools', Icon: Droplets },
  { path: '/bridge', label: 'nav_bridge', Icon: ArrowRightLeft },
];

export default function MobileNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-dark-200/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
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
