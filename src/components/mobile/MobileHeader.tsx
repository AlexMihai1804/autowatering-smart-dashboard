import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useI18n } from '../../i18n';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  title, 
  subtitle, 
  showBackButton = false, 
  onBack,
  rightAction 
}) => {
  const { connectionState } = useAppStore();
  const { t } = useI18n();
  const isConnected = connectionState === 'connected';

  return (
    <header className="sticky top-0 z-40 bg-mobile-bg-dark/95 backdrop-blur-md px-4 py-4 safe-area-top">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button 
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
          )}
          <div>
            {subtitle && (
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {subtitle}
              </span>
            )}
            <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 rounded-full border border-green-800/50">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mobile-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mobile-primary"></span>
              </span>
              <span className="text-xs font-bold text-mobile-primary uppercase tracking-wide">{t('dashboard.online')}</span>
            </div>
          )}
          {rightAction}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
