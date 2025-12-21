import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

type PowerMode = 'performance' | 'balanced' | 'eco';

const MobilePowerMode: React.FC = () => {
  const history = useHistory();
  
  const [selectedMode, setSelectedMode] = useState<PowerMode>('balanced');
  const [solarEnabled, setSolarEnabled] = useState(false);

  const powerModes = [
    {
      id: 'performance' as PowerMode,
      name: 'Performance',
      icon: 'bolt',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      description: 'Maximum sensor frequency, instant response',
      battery: '~2 weeks',
      features: ['15-min sensor updates', 'Instant BLE advertising', 'Full logging'],
    },
    {
      id: 'balanced' as PowerMode,
      name: 'Balanced',
      icon: 'balance',
      iconBg: 'bg-mobile-primary/20',
      iconColor: 'text-mobile-primary',
      description: 'Good performance with reasonable battery life',
      battery: '~1 month',
      features: ['30-min sensor updates', 'Normal BLE advertising', 'Standard logging'],
    },
    {
      id: 'eco' as PowerMode,
      name: 'Eco Saver',
      icon: 'eco',
      iconBg: 'bg-green-600/20',
      iconColor: 'text-green-500',
      description: 'Maximum battery life, reduced features',
      battery: '~3 months',
      features: ['Hourly sensor updates', 'Reduced BLE advertising', 'Minimal logging'],
    },
  ];

  const handleSave = () => {
    console.log('Saving power mode:', selectedMode);
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
          Power Mode
        </h2>
        <div className="size-12" />
      </div>

      <div className="px-4 space-y-6">
        {/* Current Battery */}
        <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-mobile-primary text-3xl">battery_full</span>
            </div>
            <div className="flex-1">
              <p className="text-mobile-text-muted text-sm">Current Battery</p>
              <p className="text-white text-3xl font-bold">87%</p>
              <p className="text-mobile-primary text-sm font-medium">~3 weeks remaining</p>
            </div>
          </div>
          
          {/* Battery bar */}
          <div className="mt-4 h-2 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-mobile-primary rounded-full" style={{ width: '87%' }} />
          </div>
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
            Select Power Mode
          </label>
          
          <div className="space-y-3">
            {powerModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`w-full rounded-2xl border overflow-hidden transition-all ${
                  selectedMode === mode.id
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`size-12 rounded-full ${mode.iconBg} flex items-center justify-center ${mode.iconColor} shrink-0`}>
                      <span className="material-symbols-outlined text-2xl">{mode.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-bold text-lg">{mode.name}</h4>
                        {selectedMode === mode.id && (
                          <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                        )}
                      </div>
                      <p className="text-mobile-text-muted text-sm mb-3">{mode.description}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-mobile-primary text-sm">battery_full</span>
                        <span className="text-mobile-primary text-sm font-semibold">{mode.battery}</span>
                      </div>
                      <ul className="space-y-1">
                        {mode.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-mobile-text-muted flex items-center gap-1.5">
                            <span className="text-mobile-primary">•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Solar Panel Option */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400">
              <span className="material-symbols-outlined">solar_power</span>
            </div>
            <div>
              <p className="text-white font-semibold">Solar Charging</p>
              <p className="text-mobile-text-muted text-sm">Optimize for solar panel</p>
            </div>
          </div>
          <button
            onClick={() => setSolarEnabled(!solarEnabled)}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              solarEnabled ? 'bg-mobile-primary' : 'bg-white/20'
            }`}
          >
            <div className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-transform ${
              solarEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Info Card */}
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-400 shrink-0">info</span>
          <p className="text-blue-200 text-sm leading-relaxed">
            Power mode changes take effect immediately. The device will briefly disconnect during the change.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
        <button
          onClick={handleSave}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">save</span>
          Apply Power Mode
        </button>
      </div>
    </div>
  );
};

export default MobilePowerMode;
