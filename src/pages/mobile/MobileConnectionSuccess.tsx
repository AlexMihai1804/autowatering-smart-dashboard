import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';

interface LocationState {
  deviceName?: string;
  deviceId?: string;
}

const MobileConnectionSuccess: React.FC = () => {
  const history = useHistory();
  const location = useLocation<LocationState>();
  const { t } = useI18n();

  const deviceName = location.state?.deviceName ?? t('dashboard.deviceNamePlaceholder');
  const deviceId = location.state?.deviceId ?? 'AW-8839-X';

  const handleContinueSetup = () => {
    history.push('/onboarding');
  };

  const handleSkipToDashboard = () => {
    history.replace('/dashboard');
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center p-4 pt-12 pb-2 justify-between z-10">
        <div className="size-10 flex items-center justify-center rounded-full bg-mobile-primary/10 text-mobile-primary">
          <span className="material-symbols-outlined">water_drop</span>
        </div>
        <button 
          onClick={() => history.push('/help')}
          className="text-gray-500 hover:text-mobile-primary transition-colors"
        >
          <span className="material-symbols-outlined">help</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
        {/* Success Animation/Icon */}
        <div className="relative mb-8 group">
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-mobile-primary/20 blur-xl scale-150 animate-pulse"></div>
          
          {/* Middle ring */}
          <div className="relative flex items-center justify-center size-32 rounded-full bg-gradient-to-tr from-mobile-primary/20 to-mobile-primary/5 border border-mobile-primary/30 shadow-[0_0_30px_rgba(19,236,55,0.3)]">
            {/* Icon Container */}
            <div className="flex items-center justify-center size-20 rounded-full bg-mobile-primary shadow-lg shadow-mobile-primary/40">
              <span className="material-symbols-outlined text-black text-5xl font-bold">check</span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-white tracking-tight text-[32px] font-bold leading-tight px-4 text-center mb-2">
          {t('mobileConnectionSuccess.title')}
        </h1>

        {/* Body Text */}
        <p className="text-gray-400 text-base font-normal leading-relaxed px-4 text-center max-w-[280px]">
          {t('mobileConnectionSuccess.subtitle')}
        </p>

        {/* Device Identity Card */}
        <div className="w-full mt-10">
          <div className="flex items-stretch justify-between gap-4 rounded-[2rem] bg-mobile-card-dark p-4 shadow-sm border border-white/5">
            {/* Left: Device Info */}
            <div className="flex flex-col justify-center gap-1.5 flex-[2_2_0px] pl-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <p className="text-green-500 text-xs font-semibold uppercase tracking-wider">{t('deviceSelector.online')}</p>
              </div>
              <p className="text-white text-lg font-bold leading-tight">{deviceName}</p>
              <p className="text-gray-500 text-xs font-mono">
                {t('mobileConnectionSuccess.deviceId').replace('{id}', deviceId)}
              </p>
            </div>
            
            {/* Right: Device Icon */}
            <div className="size-24 rounded-xl flex-shrink-0 relative overflow-hidden bg-mobile-surface-dark flex items-center justify-center">
              <span className="material-symbols-outlined text-mobile-primary text-5xl">router</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="p-6 pb-10 w-full bg-mobile-bg-dark">
        <button 
          onClick={handleContinueSetup}
          className="w-full py-4 px-6 bg-mobile-primary hover:bg-mobile-primary/90 active:scale-[0.98] transition-all rounded-full shadow-lg shadow-mobile-primary/25 flex items-center justify-center group"
        >
          <span className="text-black text-lg font-bold mr-2">{t('mobileConnectionSuccess.continueSetup')}</span>
          <span className="material-symbols-outlined text-black transition-transform group-hover:translate-x-1">arrow_forward</span>
        </button>
        <p 
          onClick={handleSkipToDashboard}
          className="text-center mt-4 text-sm text-gray-500 font-medium cursor-pointer hover:text-mobile-primary transition-colors"
        >
          {t('mobileConnectionSuccess.skipToDashboard')}
        </p>
      </div>
    </div>
  );
};

export default MobileConnectionSuccess;
