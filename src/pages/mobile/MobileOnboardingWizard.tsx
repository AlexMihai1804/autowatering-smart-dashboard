import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet';
import plantDb from '../../assets/plant_full_db.json';
import soilDb from '../../assets/soil_enhanced_db.json';

type WizardStep = 
  | 'device-naming'
  | 'time-sync'
  | 'master-valve'
  | 'select-zones'
  | 'zone-name'
  | 'plant-selection'
  | 'soil-type'
  | 'sun-exposure'
  | 'coverage-area'
  | 'irrigation-method'
  | 'watering-mode'
  | 'smart-options'
  | 'manual-schedule'
  | 'weather-adjustments'
  | 'zone-summary'
  | 'final-summary';

interface ZoneConfig {
  id: number;
  name: string;
  enabled: boolean;
  photo?: string;
  plantType?: { id: number; name: string };
  soilType?: { id: number; name: string };
  sunExposure?: 'full' | 'partial' | 'shade';
  area?: number;
  irrigationMethod?: 'drip' | 'sprinkler' | 'rotary' | 'bubbler';
  wateringMode?: 'smart' | 'manual';
  schedules?: { time: string; days: string[] }[];
  rainSkip?: boolean;
  tempAdjust?: boolean;
  windSkip?: boolean;
}

const MobileOnboardingWizard: React.FC = () => {
  const history = useHistory();
  const { zones } = useAppStore();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('device-naming');
  const [direction, setDirection] = useState(1);

  // Device config
  const [deviceName, setDeviceName] = useState('My AutoWatering');
  const [hasMasterValve, setHasMasterValve] = useState(false);
  const [masterValveType, setMasterValveType] = useState<'normally_closed' | 'normally_open'>('normally_closed');

  // Zone configs
  const [zoneConfigs, setZoneConfigs] = useState<ZoneConfig[]>(
    zones.map((z, i) => ({
      id: z.channel_id,
      name: z.name || `Zone ${i + 1}`,
      enabled: i < 2, // Enable first 2 by default
      sunExposure: 'full',
      area: 20,
      irrigationMethod: 'sprinkler',
      wateringMode: 'smart',
      rainSkip: true,
      tempAdjust: true,
      windSkip: false,
    }))
  );
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);

  // Bottom sheets
  const [showPlantSheet, setShowPlantSheet] = useState(false);
  const [showSoilSheet, setShowSoilSheet] = useState(false);
  const [plantSearch, setPlantSearch] = useState('');
  const [soilSearch, setSoilSearch] = useState('');

  // Parse databases
  const plants = Array.isArray(plantDb) ? plantDb.slice(0, 100) : [];
  const soils = Array.isArray(soilDb) ? soilDb : [];

  const filteredPlants = plants.filter(p => 
    (p as any).name?.toLowerCase().includes(plantSearch.toLowerCase())
  );
  const filteredSoils = soils.filter(s => 
    (s as any).name?.toLowerCase().includes(soilSearch.toLowerCase())
  );

  const enabledZones = zoneConfigs.filter(z => z.enabled);
  const currentZone = enabledZones[currentZoneIndex];

  const updateCurrentZone = (updates: Partial<ZoneConfig>) => {
    setZoneConfigs(prev => prev.map(z => 
      z.id === currentZone?.id ? { ...z, ...updates } : z
    ));
  };

  const stepOrder: WizardStep[] = [
    'device-naming',
    'time-sync',
    'master-valve',
    'select-zones',
    'zone-name',
    'plant-selection',
    'soil-type',
    'sun-exposure',
    'coverage-area',
    'irrigation-method',
    'watering-mode',
    ...(currentZone?.wateringMode === 'smart' ? ['smart-options' as WizardStep] : ['manual-schedule' as WizardStep]),
    'weather-adjustments',
    'zone-summary',
    'final-summary',
  ];

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const totalSteps = stepOrder.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const isZoneStep = ['zone-name', 'plant-selection', 'soil-type', 'sun-exposure', 'coverage-area', 
    'irrigation-method', 'watering-mode', 'smart-options', 'manual-schedule', 'weather-adjustments', 'zone-summary'].includes(currentStep);

  const goNext = () => {
    setDirection(1);
    const nextIndex = currentStepIndex + 1;
    
    if (currentStep === 'zone-summary' && currentZoneIndex < enabledZones.length - 1) {
      // Move to next zone
      setCurrentZoneIndex(prev => prev + 1);
      setCurrentStep('zone-name');
    } else if (nextIndex < stepOrder.length) {
      setCurrentStep(stepOrder[nextIndex]);
    } else {
      // Finish wizard
      handleFinish();
    }
  };

  const goBack = () => {
    setDirection(-1);
    const prevIndex = currentStepIndex - 1;
    
    if (currentStep === 'zone-name' && currentZoneIndex > 0) {
      // Move to previous zone summary
      setCurrentZoneIndex(prev => prev - 1);
      setCurrentStep('zone-summary');
    } else if (prevIndex >= 0) {
      setCurrentStep(stepOrder[prevIndex]);
    } else {
      history.goBack();
    }
  };

  const handleFinish = () => {
    console.log('Onboarding complete:', { deviceName, hasMasterValve, zoneConfigs });
    history.push('/dashboard');
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'device-naming':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="size-24 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-5xl">devices</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">Name Your Device</h2>
              <p className="text-mobile-text-muted">Give your device a memorable name</p>
            </div>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="My AutoWatering"
              className="w-full h-16 bg-mobile-surface-dark border border-mobile-border-dark rounded-2xl px-5 text-white text-xl font-semibold placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary transition-colors text-center"
            />
          </div>
        );

      case 'time-sync':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="size-24 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-5xl">schedule</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">Sync Time</h2>
              <p className="text-mobile-text-muted">We'll sync the device with your phone's time</p>
            </div>
            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-6 text-center">
              <p className="text-mobile-text-muted text-sm mb-2">Current Time</p>
              <p className="text-white text-4xl font-bold tracking-tight">
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
              <p className="text-mobile-text-muted text-sm mt-2">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-mobile-primary">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-semibold">Time will sync automatically</span>
            </div>
          </div>
        );

      case 'master-valve':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="size-24 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-5xl">valve</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">Master Valve</h2>
              <p className="text-mobile-text-muted">Do you have a master valve installed?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setHasMasterValve(true)}
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${
                  hasMasterValve
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                }`}
              >
                <span className={`material-symbols-outlined text-4xl ${hasMasterValve ? 'text-mobile-primary' : 'text-mobile-text-muted'}`}>
                  check_circle
                </span>
                <span className={`font-bold text-lg ${hasMasterValve ? 'text-white' : 'text-mobile-text-muted'}`}>Yes</span>
              </button>
              <button
                onClick={() => setHasMasterValve(false)}
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${
                  !hasMasterValve
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                }`}
              >
                <span className={`material-symbols-outlined text-4xl ${!hasMasterValve ? 'text-mobile-primary' : 'text-mobile-text-muted'}`}>
                  cancel
                </span>
                <span className={`font-bold text-lg ${!hasMasterValve ? 'text-white' : 'text-mobile-text-muted'}`}>No</span>
              </button>
            </div>

            {hasMasterValve && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                  Valve Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMasterValveType('normally_closed')}
                    className={`p-4 rounded-xl border transition-all ${
                      masterValveType === 'normally_closed'
                        ? 'bg-mobile-primary/10 border-mobile-primary'
                        : 'bg-mobile-surface-dark border-mobile-border-dark'
                    }`}
                  >
                    <span className={`font-semibold ${masterValveType === 'normally_closed' ? 'text-white' : 'text-mobile-text-muted'}`}>
                      Normally Closed
                    </span>
                  </button>
                  <button
                    onClick={() => setMasterValveType('normally_open')}
                    className={`p-4 rounded-xl border transition-all ${
                      masterValveType === 'normally_open'
                        ? 'bg-mobile-primary/10 border-mobile-primary'
                        : 'bg-mobile-surface-dark border-mobile-border-dark'
                    }`}
                  >
                    <span className={`font-semibold ${masterValveType === 'normally_open' ? 'text-white' : 'text-mobile-text-muted'}`}>
                      Normally Open
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'select-zones':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-white text-2xl font-bold mb-2">Select Active Zones</h2>
              <p className="text-mobile-text-muted">Choose which zones to configure</p>
            </div>

            <div className="space-y-3">
              {zoneConfigs.map((zone, idx) => (
                <button
                  key={zone.id}
                  onClick={() => setZoneConfigs(prev => prev.map((z, i) => 
                    i === idx ? { ...z, enabled: !z.enabled } : z
                  ))}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    zone.enabled
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark'
                  }`}
                >
                  <div className={`size-12 rounded-full flex items-center justify-center ${
                    zone.enabled ? 'bg-mobile-primary text-mobile-bg-dark' : 'bg-white/10 text-mobile-text-muted'
                  }`}>
                    <span className="material-symbols-outlined">
                      {zone.enabled ? 'check' : 'water_drop'}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold ${zone.enabled ? 'text-white' : 'text-mobile-text-muted'}`}>
                      Zone {idx + 1}
                    </p>
                    <p className="text-mobile-text-muted text-sm">
                      {zone.enabled ? 'Will be configured' : 'Tap to enable'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-mobile-text-muted text-sm">
              {enabledZones.length} zone{enabledZones.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        );

      case 'zone-name':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">edit</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                Zone {currentZoneIndex + 1} of {enabledZones.length}
              </p>
              <h2 className="text-white text-2xl font-bold">Name This Zone</h2>
            </div>

            <input
              type="text"
              value={currentZone?.name || ''}
              onChange={(e) => updateCurrentZone({ name: e.target.value })}
              placeholder="e.g., Front Lawn"
              className="w-full h-16 bg-mobile-surface-dark border border-mobile-border-dark rounded-2xl px-5 text-white text-xl font-semibold placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary transition-colors text-center"
            />

            <div className="grid grid-cols-3 gap-3">
              {['Front Lawn', 'Back Garden', 'Flower Bed', 'Vegetables', 'Trees', 'Patio'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => updateCurrentZone({ name: suggestion })}
                  className="py-2 px-3 bg-white/5 rounded-lg text-mobile-text-muted text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        );

      case 'plant-selection':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">eco</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">What's Growing?</h2>
            </div>

            <button
              onClick={() => setShowPlantSheet(true)}
              className="w-full flex items-center justify-between gap-4 h-16 bg-mobile-surface-dark border border-mobile-border-dark rounded-2xl px-5 hover:border-mobile-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-mobile-primary">eco</span>
                <span className="text-white text-lg font-semibold">
                  {currentZone?.plantType?.name || 'Select plant type'}
                </span>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Lawn / Grass', icon: 'grass' },
                { name: 'Flowers', icon: 'local_florist' },
                { name: 'Vegetables', icon: 'nutrition' },
                { name: 'Trees / Shrubs', icon: 'park' },
              ].map(quick => (
                <button
                  key={quick.name}
                  onClick={() => updateCurrentZone({ plantType: { id: 0, name: quick.name } })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    currentZone?.plantType?.name === quick.name
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl ${
                    currentZone?.plantType?.name === quick.name ? 'text-mobile-primary' : 'text-mobile-text-muted'
                  }`}>
                    {quick.icon}
                  </span>
                  <span className={`text-sm font-semibold ${
                    currentZone?.plantType?.name === quick.name ? 'text-white' : 'text-mobile-text-muted'
                  }`}>
                    {quick.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'soil-type':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-yellow-500 text-3xl">landscape</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">Soil Type</h2>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Sandy', desc: 'Drains quickly, needs more water', icon: 'grain' },
                { name: 'Loamy', desc: 'Ideal balance, retains moisture well', icon: 'eco' },
                { name: 'Clay', desc: 'Drains slowly, holds water longer', icon: 'layers' },
                { name: 'Silty', desc: 'Smooth texture, retains moisture', icon: 'water_drop' },
              ].map(soil => (
                <button
                  key={soil.name}
                  onClick={() => updateCurrentZone({ soilType: { id: 0, name: soil.name } })}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    currentZone?.soilType?.name === soil.name
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                  }`}
                >
                  <div className={`size-12 rounded-full flex items-center justify-center ${
                    currentZone?.soilType?.name === soil.name
                      ? 'bg-mobile-primary/20 text-mobile-primary'
                      : 'bg-white/5 text-mobile-text-muted'
                  }`}>
                    <span className="material-symbols-outlined">{soil.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold ${currentZone?.soilType?.name === soil.name ? 'text-white' : 'text-mobile-text-muted'}`}>
                      {soil.name}
                    </p>
                    <p className="text-mobile-text-muted text-sm">{soil.desc}</p>
                  </div>
                  {currentZone?.soilType?.name === soil.name && (
                    <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'sun-exposure':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-orange-400 text-3xl">wb_sunny</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">Sun Exposure</h2>
            </div>

            <div className="space-y-3">
              {[
                { value: 'full' as const, name: 'Full Sun', desc: '6+ hours of direct sunlight', icon: 'wb_sunny', color: 'orange' },
                { value: 'partial' as const, name: 'Partial Sun', desc: '3-6 hours of direct sunlight', icon: 'partly_cloudy_day', color: 'yellow' },
                { value: 'shade' as const, name: 'Shade', desc: 'Less than 3 hours of sunlight', icon: 'cloud', color: 'blue' },
              ].map(sun => (
                <button
                  key={sun.value}
                  onClick={() => updateCurrentZone({ sunExposure: sun.value })}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                    currentZone?.sunExposure === sun.value
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                  }`}
                >
                  <div className={`size-14 rounded-full flex items-center justify-center bg-${sun.color}-500/20 text-${sun.color}-400`}>
                    <span className="material-symbols-outlined text-3xl">{sun.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold text-lg ${currentZone?.sunExposure === sun.value ? 'text-white' : 'text-mobile-text-muted'}`}>
                      {sun.name}
                    </p>
                    <p className="text-mobile-text-muted text-sm">{sun.desc}</p>
                  </div>
                  {currentZone?.sunExposure === sun.value && (
                    <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'coverage-area':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">square_foot</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">Coverage Area</h2>
            </div>

            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-6">
              <p className="text-mobile-primary text-5xl font-bold text-center mb-2">
                {currentZone?.area || 20}
                <span className="text-2xl text-mobile-text-muted ml-2">m²</span>
              </p>
              <input
                type="range"
                min="1"
                max="500"
                value={currentZone?.area || 20}
                onChange={(e) => updateCurrentZone({ area: Number(e.target.value) })}
                className="w-full h-2 bg-mobile-border-dark rounded-lg appearance-none cursor-pointer accent-mobile-primary mt-4"
              />
              <div className="flex justify-between text-sm text-mobile-text-muted mt-2">
                <span>1 m²</span>
                <span>500 m²</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map(val => (
                <button
                  key={val}
                  onClick={() => updateCurrentZone({ area: val })}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    currentZone?.area === val
                      ? 'bg-mobile-primary text-mobile-bg-dark'
                      : 'bg-white/5 text-mobile-text-muted hover:bg-white/10'
                  }`}
                >
                  {val}m²
                </button>
              ))}
            </div>
          </div>
        );

      case 'irrigation-method':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-blue-400 text-3xl">water_drop</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">Irrigation Method</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'sprinkler' as const, name: 'Sprinkler', desc: '10-15 L/min', icon: 'water_drop' },
                { value: 'drip' as const, name: 'Drip', desc: '2-4 L/hour', icon: 'opacity' },
                { value: 'rotary' as const, name: 'Rotary', desc: '15-20 L/min', icon: 'autorenew' },
                { value: 'bubbler' as const, name: 'Bubbler', desc: '5-10 L/min', icon: 'bubble_chart' },
              ].map(method => (
                <button
                  key={method.value}
                  onClick={() => updateCurrentZone({ irrigationMethod: method.value })}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all ${
                    currentZone?.irrigationMethod === method.value
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                  }`}
                >
                  <div className={`size-12 rounded-full flex items-center justify-center ${
                    currentZone?.irrigationMethod === method.value
                      ? 'bg-mobile-primary/20 text-mobile-primary'
                      : 'bg-white/5 text-mobile-text-muted'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">{method.icon}</span>
                  </div>
                  <span className={`font-bold ${currentZone?.irrigationMethod === method.value ? 'text-white' : 'text-mobile-text-muted'}`}>
                    {method.name}
                  </span>
                  <span className="text-mobile-text-muted text-xs">{method.desc}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'watering-mode':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">settings_suggest</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">Watering Mode</h2>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => updateCurrentZone({ wateringMode: 'smart' })}
                className={`w-full p-5 rounded-2xl border text-left transition-all ${
                  currentZone?.wateringMode === 'smart'
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`size-14 rounded-full flex items-center justify-center shrink-0 ${
                    currentZone?.wateringMode === 'smart' ? 'bg-mobile-primary/20 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
                  }`}>
                    <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold text-lg mb-1 ${currentZone?.wateringMode === 'smart' ? 'text-white' : 'text-mobile-text-muted'}`}>
                      Smart Auto
                    </h4>
                    <p className="text-mobile-text-muted text-sm">
                      Automatically adjusts watering based on weather, soil moisture, and plant needs
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs bg-mobile-primary/10 text-mobile-primary px-2 py-1 rounded-full">Weather aware</span>
                      <span className="text-xs bg-mobile-primary/10 text-mobile-primary px-2 py-1 rounded-full">Saves water</span>
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => updateCurrentZone({ wateringMode: 'manual' })}
                className={`w-full p-5 rounded-2xl border text-left transition-all ${
                  currentZone?.wateringMode === 'manual'
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`size-14 rounded-full flex items-center justify-center shrink-0 ${
                    currentZone?.wateringMode === 'manual' ? 'bg-mobile-primary/20 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
                  }`}>
                    <span className="material-symbols-outlined text-3xl">schedule</span>
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold text-lg mb-1 ${currentZone?.wateringMode === 'manual' ? 'text-white' : 'text-mobile-text-muted'}`}>
                      Manual Schedule
                    </h4>
                    <p className="text-mobile-text-muted text-sm">
                      Set fixed watering times and days. Full control over when and how long.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case 'smart-options':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">tune</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">Smart Options</h2>
            </div>

            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4 space-y-4">
              <p className="text-mobile-text-muted text-sm">Calculated daily water need:</p>
              <p className="text-mobile-primary text-3xl font-bold">
                ~{((currentZone?.area || 20) * 0.5).toFixed(0)} liters/day
              </p>
              <p className="text-mobile-text-muted text-xs">
                Based on {currentZone?.plantType?.name || 'grass'}, {currentZone?.soilType?.name || 'loamy'} soil, {currentZone?.sunExposure} sun
              </p>
            </div>

            <div className="space-y-2">
              {[
                { key: 'morning', label: 'Morning watering (6 AM)', recommended: true },
                { key: 'evening', label: 'Evening watering (7 PM)', recommended: false },
                { key: 'split', label: 'Split cycles', recommended: false },
              ].map(opt => (
                <button
                  key={opt.key}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark hover:border-mobile-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold">{opt.label}</span>
                    {opt.recommended && (
                      <span className="text-xs bg-mobile-primary/10 text-mobile-primary px-2 py-0.5 rounded-full">Recommended</span>
                    )}
                  </div>
                  <div className="w-10 h-6 bg-mobile-primary rounded-full relative">
                    <div className="absolute right-1 top-1 size-4 bg-white rounded-full shadow-sm" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'manual-schedule':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">calendar_month</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">Set Schedule</h2>
            </div>

            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-semibold">Schedule 1</span>
                <span className="text-mobile-primary font-bold">06:00 AM</span>
              </div>
              <div className="flex gap-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <button
                    key={idx}
                    className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      idx < 5 ? 'bg-mobile-primary text-mobile-bg-dark' : 'bg-white/10 text-mobile-text-muted'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-mobile-border-dark text-mobile-text-muted hover:border-mobile-primary/50 hover:text-mobile-primary transition-colors">
              <span className="material-symbols-outlined">add</span>
              Add Another Schedule
            </button>
          </div>
        );

      case 'weather-adjustments':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-blue-400 text-3xl">cloud</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {currentZone?.name}
              </p>
              <h2 className="text-white text-2xl font-bold">Weather Adjustments</h2>
            </div>

            <div className="space-y-3">
              {[
                { key: 'rainSkip', icon: 'water_drop', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400', name: 'Rain Skip', desc: 'Skip watering when rain is expected' },
                { key: 'tempAdjust', icon: 'thermostat', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400', name: 'Temperature Adjust', desc: 'Increase watering on hot days' },
                { key: 'windSkip', icon: 'air', iconBg: 'bg-gray-500/20', iconColor: 'text-gray-400', name: 'Wind Skip', desc: 'Skip watering on windy days' },
              ].map(adj => (
                <div
                  key={adj.key}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark"
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-full ${adj.iconBg} flex items-center justify-center ${adj.iconColor}`}>
                      <span className="material-symbols-outlined">{adj.icon}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{adj.name}</p>
                      <p className="text-mobile-text-muted text-sm">{adj.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateCurrentZone({ [adj.key]: !(currentZone as any)?.[adj.key] })}
                    className={`w-12 h-7 rounded-full transition-colors relative ${
                      (currentZone as any)?.[adj.key] ? 'bg-mobile-primary' : 'bg-white/20'
                    }`}
                  >
                    <div className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-transform ${
                      (currentZone as any)?.[adj.key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'zone-summary':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">check_circle</span>
              </div>
              <h2 className="text-white text-2xl font-bold">{currentZone?.name}</h2>
              <p className="text-mobile-text-muted">Zone configuration complete</p>
            </div>

            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark divide-y divide-mobile-border-dark overflow-hidden">
              {[
                { label: 'Plant Type', value: currentZone?.plantType?.name || 'Not set', icon: 'eco' },
                { label: 'Soil Type', value: currentZone?.soilType?.name || 'Not set', icon: 'landscape' },
                { label: 'Sun Exposure', value: currentZone?.sunExposure || 'Full', icon: 'wb_sunny' },
                { label: 'Area', value: `${currentZone?.area || 20} m²`, icon: 'square_foot' },
                { label: 'Irrigation', value: currentZone?.irrigationMethod || 'Sprinkler', icon: 'water_drop' },
                { label: 'Mode', value: currentZone?.wateringMode === 'smart' ? 'Smart Auto' : 'Manual', icon: 'settings_suggest' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-mobile-text-muted">{item.icon}</span>
                    <span className="text-mobile-text-muted">{item.label}</span>
                  </div>
                  <span className="text-white font-semibold">{item.value}</span>
                </div>
              ))}
            </div>

            {currentZoneIndex < enabledZones.length - 1 && (
              <p className="text-center text-mobile-text-muted">
                Next: Configure {enabledZones[currentZoneIndex + 1]?.name}
              </p>
            )}
          </div>
        );

      case 'final-summary':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-24 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-5xl">celebration</span>
              </div>
              <h2 className="text-white text-2xl font-bold">All Set!</h2>
              <p className="text-mobile-text-muted">Your irrigation system is ready</p>
            </div>

            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
              <h4 className="text-white font-bold mb-3">{deviceName}</h4>
              <div className="space-y-2">
                {enabledZones.map(zone => (
                  <div key={zone.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-mobile-primary text-sm">check_circle</span>
                      <span className="text-white">{zone.name}</span>
                    </div>
                    <span className="text-mobile-text-muted text-sm capitalize">{zone.wateringMode}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-mobile-primary/10 border border-mobile-primary/30 p-4">
              <p className="text-mobile-primary font-semibold mb-1">Smart scheduling active</p>
              <p className="text-mobile-text-muted text-sm">
                Your zones will automatically water at optimal times based on weather conditions.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-mobile-bg-dark/90 backdrop-blur-md p-4">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={goBack}
            className="text-white flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          
          {isZoneStep && (
            <div className="flex items-center gap-2">
              {enabledZones.map((_, idx) => (
                <div
                  key={idx}
                  className={`size-2 rounded-full transition-colors ${
                    idx === currentZoneIndex ? 'bg-mobile-primary' : idx < currentZoneIndex ? 'bg-mobile-primary/50' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}

          <button 
            onClick={() => history.push('/dashboard')}
            className="text-mobile-text-muted flex items-center justify-center text-sm font-medium hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-mobile-border-dark rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-mobile-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${currentStep}-${currentZoneIndex}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.25 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
        <button
          onClick={goNext}
          disabled={currentStep === 'select-zones' && enabledZones.length === 0}
          className={`w-full h-14 rounded-xl font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
            currentStep === 'select-zones' && enabledZones.length === 0
              ? 'bg-white/10 text-white/30 cursor-not-allowed'
              : 'bg-mobile-primary text-mobile-bg-dark shadow-lg shadow-mobile-primary/20'
          }`}
        >
          {currentStep === 'final-summary' ? (
            <>
              <span className="material-symbols-outlined">rocket_launch</span>
              Start Using App
            </>
          ) : (
            <>
              Continue
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </div>

      {/* Plant Selection Sheet */}
      <MobileBottomSheet
        isOpen={showPlantSheet}
        onClose={() => setShowPlantSheet(false)}
        title="Select Plant Type"
      >
        <div className="p-4 border-b border-mobile-border-dark">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">search</span>
            <input
              type="text"
              value={plantSearch}
              onChange={(e) => setPlantSearch(e.target.value)}
              placeholder="Search plants..."
              className="w-full h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-mobile-border-dark">
          {filteredPlants.slice(0, 30).map((plant: any) => (
            <button
              key={plant.id}
              onClick={() => {
                updateCurrentZone({ plantType: { id: plant.id, name: plant.name } });
                setShowPlantSheet(false);
                setPlantSearch('');
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="size-10 rounded-full bg-mobile-primary/10 flex items-center justify-center text-mobile-primary">
                <span className="material-symbols-outlined">eco</span>
              </div>
              <span className="text-white font-semibold">{plant.name}</span>
            </button>
          ))}
        </div>
      </MobileBottomSheet>

      {/* Soil Selection Sheet */}
      <MobileBottomSheet
        isOpen={showSoilSheet}
        onClose={() => setShowSoilSheet(false)}
        title="Select Soil Type"
      >
        <div className="p-4 border-b border-mobile-border-dark">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">search</span>
            <input
              type="text"
              value={soilSearch}
              onChange={(e) => setSoilSearch(e.target.value)}
              placeholder="Search soils..."
              className="w-full h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-mobile-border-dark">
          {filteredSoils.map((soil: any) => (
            <button
              key={soil.id}
              onClick={() => {
                updateCurrentZone({ soilType: { id: soil.id, name: soil.name } });
                setShowSoilSheet(false);
                setSoilSearch('');
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <span className="material-symbols-outlined">landscape</span>
              </div>
              <span className="text-white font-semibold">{soil.name}</span>
            </button>
          ))}
        </div>
      </MobileBottomSheet>
    </div>
  );
};

export default MobileOnboardingWizard;
