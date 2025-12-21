import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

const MobileMasterValve: React.FC = () => {
  const history = useHistory();
  
  const [masterValveEnabled, setMasterValveEnabled] = useState(true);
  const [valveType, setValveType] = useState<'normally_closed' | 'normally_open'>('normally_closed');
  const [delayBefore, setDelayBefore] = useState(2);
  const [delayAfter, setDelayAfter] = useState(3);

  const handleSave = () => {
    console.log('Saving master valve config:', {
      masterValveEnabled,
      valveType,
      delayBefore,
      delayAfter,
    });
    history.goBack();
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 justify-between">
        <button 
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center">
          Master Valve
        </h2>
        <div className="size-12" />
      </div>

      <div className="px-4 space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full bg-mobile-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-mobile-primary text-3xl">valve</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Master Valve</p>
              <p className="text-mobile-text-muted text-sm">Main water supply control</p>
            </div>
          </div>
          <button
            onClick={() => setMasterValveEnabled(!masterValveEnabled)}
            className={`w-14 h-8 rounded-full transition-colors relative ${
              masterValveEnabled ? 'bg-mobile-primary' : 'bg-white/20'
            }`}
          >
            <div className={`absolute top-1.5 size-5 rounded-full bg-white shadow-md transition-transform ${
              masterValveEnabled ? 'translate-x-7' : 'translate-x-1.5'
            }`} />
          </button>
        </div>

        {masterValveEnabled && (
          <>
            {/* Valve Type */}
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                Valve Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setValveType('normally_closed')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${
                    valveType === 'normally_closed'
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                  }`}
                >
                  <div className={`size-12 rounded-full flex items-center justify-center ${
                    valveType === 'normally_closed' 
                      ? 'bg-mobile-primary/20 text-mobile-primary' 
                      : 'bg-white/5 text-mobile-text-muted'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">lock</span>
                  </div>
                  <div className="text-center">
                    <p className={`font-bold ${valveType === 'normally_closed' ? 'text-white' : 'text-mobile-text-muted'}`}>
                      Normally Closed
                    </p>
                    <p className="text-mobile-text-muted text-xs mt-1">Opens when powered</p>
                  </div>
                </button>

                <button
                  onClick={() => setValveType('normally_open')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${
                    valveType === 'normally_open'
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                  }`}
                >
                  <div className={`size-12 rounded-full flex items-center justify-center ${
                    valveType === 'normally_open' 
                      ? 'bg-mobile-primary/20 text-mobile-primary' 
                      : 'bg-white/5 text-mobile-text-muted'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">lock_open</span>
                  </div>
                  <div className="text-center">
                    <p className={`font-bold ${valveType === 'normally_open' ? 'text-white' : 'text-mobile-text-muted'}`}>
                      Normally Open
                    </p>
                    <p className="text-mobile-text-muted text-xs mt-1">Closes when powered</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Timing Diagram */}
            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
              <h4 className="text-white font-bold mb-4">Timing Diagram</h4>
              <div className="relative h-24 bg-black/30 rounded-xl p-4 overflow-hidden">
                {/* Zones line */}
                <div className="absolute top-4 left-4 right-4 flex items-center">
                  <span className="text-xs text-mobile-text-muted w-16 shrink-0">Zones</span>
                  <div className="flex-1 h-6 relative">
                    <div className="absolute left-[20%] right-[20%] h-full bg-blue-500/30 rounded flex items-center justify-center">
                      <span className="text-blue-400 text-xs font-bold">Running</span>
                    </div>
                  </div>
                </div>
                {/* Master valve line */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center">
                  <span className="text-xs text-mobile-text-muted w-16 shrink-0">Master</span>
                  <div className="flex-1 h-6 relative">
                    <div 
                      className="absolute h-full bg-mobile-primary/30 rounded flex items-center justify-center"
                      style={{ 
                        left: `calc(20% - ${delayBefore * 2}%)`, 
                        right: `calc(20% - ${delayAfter * 2}%)` 
                      }}
                    >
                      <span className="text-mobile-primary text-xs font-bold">Open</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delay Before */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
                  Delay Before Start
                </label>
                <span className="text-mobile-primary font-bold">{delayBefore}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={delayBefore}
                onChange={(e) => setDelayBefore(Number(e.target.value))}
                className="w-full h-2 bg-mobile-surface-dark rounded-lg appearance-none cursor-pointer accent-mobile-primary"
              />
              <p className="text-mobile-text-muted text-sm px-1">
                Time to open master valve before zone starts
              </p>
            </div>

            {/* Delay After */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
                  Delay After Stop
                </label>
                <span className="text-mobile-primary font-bold">{delayAfter}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={delayAfter}
                onChange={(e) => setDelayAfter(Number(e.target.value))}
                className="w-full h-2 bg-mobile-surface-dark rounded-lg appearance-none cursor-pointer accent-mobile-primary"
              />
              <p className="text-mobile-text-muted text-sm px-1">
                Time to close master valve after zone stops
              </p>
            </div>

            {/* Info */}
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-400 shrink-0">info</span>
              <p className="text-blue-200 text-sm leading-relaxed">
                The master valve controls the main water supply. It opens before any zone starts and closes after all zones finish, preventing water hammer and pressure buildup.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
        <button
          onClick={handleSave}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">save</span>
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default MobileMasterValve;
