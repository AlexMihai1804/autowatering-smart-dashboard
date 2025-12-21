import React from 'react';
import { useHistory } from 'react-router-dom';

const MobileNoDevices: React.FC = () => {
  const history = useHistory();

  const handleAddDevice = () => {
    history.push('/scan');
  };

  const handleHelp = () => {
    history.push('/help');
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 pt-12 pb-2 justify-between z-20">
        <div className="w-12"></div>
        <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-white">
          AutoWatering
        </h2>
        <div className="flex w-12 items-center justify-end">
          <button 
            onClick={() => history.push('/settings')}
            className="flex items-center justify-center rounded-full size-10 text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-[480px] mx-auto">
        {/* Central Illustration with Glow */}
        <div className="relative mb-10 flex items-center justify-center">
          {/* Ambient Glow Behind */}
          <div className="absolute w-64 h-64 bg-mobile-primary rounded-full blur-[80px] opacity-20 animate-pulse"></div>
          
          {/* Icon Container */}
          <div className="relative z-10 flex items-center justify-center size-48 rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/10 backdrop-blur-md shadow-2xl">
            <div className="size-24 flex items-center justify-center">
              <span className="material-symbols-outlined text-mobile-primary text-7xl opacity-90">
                water_drop
              </span>
            </div>
          </div>
          
          {/* Decorative Orbit Elements */}
          <div className="absolute size-56 rounded-full border border-mobile-primary/20 border-dashed animate-spin" style={{ animationDuration: '10s' }}></div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
            No Controllers Connected
          </h1>
          <p className="text-base font-normal leading-relaxed text-white/60 max-w-[300px]">
            Pair your AutoWatering device to automate your garden and track usage.
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col px-6 pb-10 pt-4 gap-3 w-full max-w-[480px] mx-auto z-20">
        {/* Primary CTA */}
        <button 
          onClick={handleAddDevice}
          className="flex w-full cursor-pointer items-center justify-center rounded-full h-14 bg-mobile-primary hover:bg-mobile-primary/90 text-black text-lg font-bold leading-normal tracking-wide shadow-lg shadow-mobile-primary/30 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined mr-2">add_circle</span>
          <span>Add Device</span>
        </button>
        
        {/* Secondary Action */}
        <button 
          onClick={handleHelp}
          className="flex w-full cursor-pointer items-center justify-center rounded-full h-10 bg-transparent text-white/50 text-sm font-medium hover:text-mobile-primary transition-colors"
        >
          <span>Need help setting up?</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNoDevices;
