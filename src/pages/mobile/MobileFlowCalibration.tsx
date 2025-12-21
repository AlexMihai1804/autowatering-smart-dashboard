import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

const MobileFlowCalibration: React.FC = () => {
  const history = useHistory();
  const { zones } = useAppStore();
  
  const [step, setStep] = useState<'intro' | 'running' | 'complete'>('intro');
  const [pulsesPerLiter, setPulsesPerLiter] = useState(450);
  const [testVolume, setTestVolume] = useState(10);
  const [measuredPulses, setMeasuredPulses] = useState(0);
  const [selectedZone, setSelectedZone] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStartCalibration = async () => {
    setStep('running');
    setIsRunning(true);
    setMeasuredPulses(0);
    
    // Simulate calibration process
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 1;
      setProgress((elapsed / 30) * 100);
      setMeasuredPulses(prev => prev + Math.floor(Math.random() * 20 + 10));
      
      if (elapsed >= 30) {
        clearInterval(interval);
        setIsRunning(false);
        setStep('complete');
      }
    }, 1000);
  };

  const handleSave = () => {
    const newPulsesPerLiter = Math.round(measuredPulses / testVolume);
    console.log('Saving flow calibration:', {
      pulsesPerLiter: newPulsesPerLiter,
      testVolume,
      measuredPulses,
    });
    setPulsesPerLiter(newPulsesPerLiter);
    history.goBack();
  };

  const handleManualSave = () => {
    console.log('Saving manual calibration:', pulsesPerLiter);
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
          Flow Calibration
        </h2>
        <div className="size-12" />
      </div>

      <div className="px-4 space-y-6">
        {/* Current Value Card */}
        <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-mobile-primary text-3xl">water_drop</span>
            </div>
            <div className="flex-1">
              <p className="text-mobile-text-muted text-sm">Current Calibration</p>
              <p className="text-white text-3xl font-bold">
                {pulsesPerLiter}
                <span className="text-lg text-mobile-text-muted ml-1">pulses/L</span>
              </p>
            </div>
          </div>
        </div>

        {step === 'intro' && (
          <>
            {/* Wizard Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white px-1">Calibration Wizard</h3>
              
              <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden">
                {[
                  { num: 1, title: 'Select a zone', desc: 'Choose a zone with known flow' },
                  { num: 2, title: 'Prepare container', desc: 'Use a measured container (e.g., 10L bucket)' },
                  { num: 3, title: 'Run calibration', desc: 'System will count pulses while running' },
                  { num: 4, title: 'Enter volume', desc: 'Enter the exact amount collected' },
                ].map((s, idx, arr) => (
                  <div key={s.num} className={`flex items-start gap-4 p-4 ${idx < arr.length - 1 ? 'border-b border-mobile-border-dark' : ''}`}>
                    <div className="size-8 rounded-full bg-mobile-primary/10 flex items-center justify-center text-mobile-primary font-bold text-sm shrink-0">
                      {s.num}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{s.title}</p>
                      <p className="text-mobile-text-muted text-sm">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                Select Zone
              </label>
              <div className="grid grid-cols-2 gap-3">
                {zones.slice(0, 4).map((zone, idx) => (
                  <button
                    key={zone.channel_id}
                    onClick={() => setSelectedZone(zone.channel_id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      selectedZone === zone.channel_id
                        ? 'bg-mobile-primary/10 border-mobile-primary'
                        : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${
                      selectedZone === zone.channel_id ? 'text-mobile-primary' : 'text-mobile-text-muted'
                    }`}>
                      water_drop
                    </span>
                    <span className={`text-sm font-bold ${
                      selectedZone === zone.channel_id ? 'text-white' : 'text-mobile-text-muted'
                    }`}>
                      {zone.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartCalibration}
              className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Start Calibration
            </button>

            {/* Manual Entry */}
            <div className="pt-4 border-t border-mobile-border-dark space-y-3">
              <p className="text-mobile-text-muted text-sm text-center">Or enter value manually</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={pulsesPerLiter}
                  onChange={(e) => setPulsesPerLiter(Number(e.target.value))}
                  className="flex-1 h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl px-4 text-white text-center font-bold focus:outline-none focus:border-mobile-primary"
                />
                <span className="text-mobile-text-muted font-medium">pulses/L</span>
              </div>
              <button
                onClick={handleManualSave}
                className="w-full h-12 bg-white/10 text-white font-bold rounded-xl active:scale-[0.98] transition-transform"
              >
                Save Manual Value
              </button>
            </div>
          </>
        )}

        {step === 'running' && (
          <div className="flex flex-col items-center justify-center py-12">
            {/* Progress Ring */}
            <div className="relative size-48 mb-8">
              <svg className="size-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="42"
                  fill="transparent"
                  stroke="#1a2e1d"
                  strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="transparent"
                  stroke="#13ec37"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="264"
                  strokeDashoffset={264 * (1 - progress / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-mobile-primary text-4xl font-bold">{Math.round(progress)}%</span>
                <span className="text-mobile-text-muted text-sm">calibrating</span>
              </div>
            </div>

            {/* Pulse Counter */}
            <div className="text-center mb-8">
              <p className="text-mobile-text-muted text-sm mb-1">Pulses Counted</p>
              <p className="text-white text-5xl font-bold tracking-tight">{measuredPulses}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 bg-mobile-primary/10 px-4 py-2 rounded-full">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mobile-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-mobile-primary" />
              </span>
              <span className="text-mobile-primary font-semibold">Running zone {selectedZone + 1}...</span>
            </div>

            <p className="text-mobile-text-muted text-sm text-center mt-8 max-w-xs">
              Water is flowing. Collect the water in a measured container and note the exact volume.
            </p>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6">
            {/* Success Icon */}
            <div className="flex flex-col items-center py-8">
              <div className="size-20 rounded-full bg-mobile-primary/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-4xl">check_circle</span>
              </div>
              <h3 className="text-white text-xl font-bold">Calibration Complete</h3>
              <p className="text-mobile-text-muted text-center mt-2">
                Measured {measuredPulses} pulses
              </p>
            </div>

            {/* Volume Input */}
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                Enter Collected Volume
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={testVolume}
                  onChange={(e) => setTestVolume(Number(e.target.value))}
                  className="flex-1 h-14 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl px-4 text-white text-center text-2xl font-bold focus:outline-none focus:border-mobile-primary"
                />
                <span className="text-mobile-text-muted font-medium text-lg">Liters</span>
              </div>
            </div>

            {/* Result */}
            <div className="rounded-2xl bg-mobile-primary/10 border border-mobile-primary/30 p-5">
              <p className="text-mobile-text-muted text-sm mb-1">New Calibration Value</p>
              <p className="text-mobile-primary text-4xl font-bold">
                {Math.round(measuredPulses / testVolume)}
                <span className="text-lg ml-2">pulses/L</span>
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">save</span>
              Save Calibration
            </button>

            <button
              onClick={() => setStep('intro')}
              className="w-full h-12 bg-white/10 text-white font-bold rounded-xl active:scale-[0.98] transition-transform"
            >
              Recalibrate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileFlowCalibration;
