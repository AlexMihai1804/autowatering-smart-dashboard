import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: 'home', labelKey: 'navigation.home' },
  { path: '/zones', icon: 'yard', labelKey: 'navigation.zones' },
  { path: '/history', icon: 'history', labelKey: 'navigation.history' },
  { path: '/settings', icon: 'settings', labelKey: 'navigation.settings' },
];

const MobileBottomNav: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-mobile-surface-dark/95 backdrop-blur-lg border-t border-white/5 pb-6 pt-2 px-4 safe-area-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => history.push(item.path)}
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive 
                  ? 'text-mobile-primary' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <span 
                className={`material-symbols-outlined text-[26px] ${isActive ? 'fill-icon' : ''}`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
