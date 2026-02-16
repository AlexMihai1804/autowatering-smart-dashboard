import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';

const MobileFlowCalibration: React.FC = () => {
  const history = useHistory();
  const { zones, calibrationData } = useAppStore();
  const bleService = BleService.getInstance();
  const { t } = useI18n();

  const [step, setStep] = useState<'intro' | 'running' | 'complete'>('intro');
  const [pulsesPerLiter, setPulsesPerLiter] = useState(450);
  const [testVolume, setTestVolume] = useState(10);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync state with firmware calibration feedback
  useEffect(() => {
    if (calibrationData) {
      if (calibrationData.action === 1 || calibrationData.action === 2) {
        // 1=Start, 2=In Progress
        if (step !== 'running') setStep('running');
        setIsRunning(true);
      } else if (calibrationData.action === 0 && isRunning) {
        // Stopped (externally or by us)
        setIsRunning(false);
        // We don't auto-advance to complete here because we need volume input first.
        // User clicks "Stop" -> handleStop -> waits -> setStep('complete')
      } else if (calibrationData.action === 3) {
        // Calculated
        if (step !== 'complete') setStep('complete');
      }
    }
  }, [calibrationData, isRunning, step]);

  const handleStartCalibration = async () => {
    if (selectedZone === null) {
      alert(t('mobileFlowCalibration.selectZoneAlert'));
      return;
    }
    try {
      await bleService.selectChannel(selectedZone);
      await bleService.writeValveControl(selectedZone, 1, 600); // Run for 10 mins (safety)
      await bleService.startFlowCalibration();

      setStep('running');
      setIsRunning(true);
    } catch (e) {
      console.error('Failed to start calibration:', e);
      alert(t('mobileFlowCalibration.startFailed'));
    }
  };

  const handleStopCalibration = async () => {
    try {
      if (selectedZone !== null) {
        await bleService.writeValveControl(selectedZone, 0, 0); // Stop Valve
      }
      await bleService.stopFlowCalibration();
      setIsRunning(false);
      setStep('complete');
    } catch (e) {
      console.error('Failed to stop calibration:', e);
    }
  };

  const handleCalculate = async () => {
    try {
      if (!Number.isFinite(testVolume) || testVolume <= 0) {
        alert(t('mobileFlowCalibration.calculateFailed'));
        return;
      }
      const testVolumeMl = Math.round(testVolume * 1000);
      await bleService.calculateFlowCalibration(testVolumeMl);
      // Firmware will update calibrationData with new pulses_per_liter
    } catch (e) {
      console.error('Failed to calculate:', e);
      alert(t('mobileFlowCalibration.calculateFailed'));
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      if (!Number.isFinite(testVolume) || testVolume <= 0) {
        alert(t('mobileFlowCalibration.calculateFailed'));
        return;
      }
      const testVolumeMl = Math.max(1, Math.round(testVolume * 1000));
      await bleService.calculateFlowCalibration(testVolumeMl);
      await new Promise(r => setTimeout(r, 300));
      await bleService.applyFlowCalibration();

      history.goBack();
    } catch (e) {
      console.error('Failed to save flow calibration:', e);
      alert(t('mobileFlowCalibration.saveFailed'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleManualSave = async () => {
    setSaveLoading(true);
    try {
      if (!Number.isFinite(pulsesPerLiter) || pulsesPerLiter <= 0) {
        alert(t('mobileFlowCalibration.saveManualFailed'));
        return;
      }
      const flowCalibration = Math.max(1, Math.round(pulsesPerLiter));
      const state = useAppStore.getState();
      const config = state.systemConfig ?? await bleService.readSystemConfig();
      await bleService.writeSystemConfigObject({
        ...config,
        flow_calibration: flowCalibration
      });
      await bleService.readSystemConfig();
      history.goBack();
    } catch (e) {
      console.error("Failed to save manual settings", e);
      alert(t('mobileFlowCalibration.saveManualFailed'));
    } finally {
      setSaveLoading(false);
    }
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
          {t('mobileFlowCalibration.title')}
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
              <p className="text-mobile-text-muted text-sm">{t('mobileFlowCalibration.currentCalibration')}</p>
              <p className="text-white text-3xl font-bold">
                {calibrationData?.pulses_per_liter ?? useAppStore.getState().systemConfig?.flow_calibration ?? 450}
                <span className="text-lg text-mobile-text-muted ml-1">{t('mobileFlowCalibration.pulsesPerLiter')}</span>
              </p>
            </div>
          </div>
        </div>

        {step === 'intro' && (
          <>
            {/* Wizard Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white px-1">{t('mobileFlowCalibration.wizardTitle')}</h3>

              <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden">
                {[
                  { num: 1, title: t('mobileFlowCalibration.steps.selectZone.title'), desc: t('mobileFlowCalibration.steps.selectZone.desc') },
                  { num: 2, title: t('mobileFlowCalibration.steps.prepareContainer.title'), desc: t('mobileFlowCalibration.steps.prepareContainer.desc') },
                  { num: 3, title: t('mobileFlowCalibration.steps.runCalibration.title'), desc: t('mobileFlowCalibration.steps.runCalibration.desc') },
                  { num: 4, title: t('mobileFlowCalibration.steps.enterVolume.title'), desc: t('mobileFlowCalibration.steps.enterVolume.desc') },
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
                {t('mobileFlowCalibration.selectZone')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {zones.map((zone) => (
                  <button
                    key={zone.channel_id}
                    onClick={() => setSelectedZone(zone.channel_id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectedZone === zone.channel_id
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${selectedZone === zone.channel_id ? 'text-mobile-primary' : 'text-mobile-text-muted'
                      }`}>
                      water_drop
                    </span>
                    <span className={`text-sm font-bold ${selectedZone === zone.channel_id ? 'text-white' : 'text-mobile-text-muted'
                      }`}>
                      {zone.name || `${t('zones.zone')} ${zone.channel_id + 1}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartCalibration}
              disabled={selectedZone === null || saveLoading}
              className={`w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 ${(selectedZone === null || saveLoading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              <span className="material-symbols-outlined">play_arrow</span>
              {t('mobileFlowCalibration.startCalibration')}
            </button>

            {/* Manual Entry */}
            <div className="pt-4 border-t border-mobile-border-dark space-y-3">
              <p className="text-mobile-text-muted text-sm text-center">{t('mobileFlowCalibration.manualEntry')}</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={pulsesPerLiter}
                  onChange={(e) => setPulsesPerLiter(Number(e.target.value))}
                  className="flex-1 h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl px-4 text-white text-center font-bold focus:outline-none focus:border-mobile-primary"
                />
                <span className="text-mobile-text-muted font-medium">{t('mobileFlowCalibration.pulsesPerLiter')}</span>
              </div>
              <button
                onClick={handleManualSave}
                disabled={saveLoading}
                className="w-full h-12 bg-white/10 text-white font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {saveLoading ? t('mobileFlowCalibration.saving') : t('mobileFlowCalibration.saveManual')}
              </button>
            </div>
          </>
        )}

        {step === 'running' && (
          <div className="flex flex-col items-center justify-center py-12">
            {/* Progress Ring (Indeterminate) */}
            <div className="relative size-48 mb-8">
              <svg className="animate-spin size-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="#1a2e1d" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="#13ec37" strokeWidth="8"
                  strokeDasharray="180" strokeDashoffset="90" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-mobile-primary text-4xl font-bold">{calibrationData?.pulses ?? 0}</span>
                <span className="text-mobile-text-muted text-sm">{t('mobileFlowCalibration.pulsesLabel')}</span>
              </div>
            </div>

            {/* Pulse Counter */}
            <div className="text-center mb-8">
              <p className="text-mobile-text-muted text-sm mb-1">{t('mobileFlowCalibration.pulsesDetected')}</p>
              <p className="text-white text-5xl font-bold tracking-tight">{calibrationData?.pulses ?? 0}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 bg-mobile-primary/10 px-4 py-2 rounded-full mb-8">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mobile-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-mobile-primary" />
              </span>
              <span className="text-mobile-primary font-semibold">
                {t('mobileFlowCalibration.runningZone').replace('{zone}', selectedZone !== null ? (selectedZone + 1).toString() : '?')}
              </span>
            </div>

            <button
              onClick={handleStopCalibration}
              className="w-full h-14 bg-red-500/20 text-red-400 font-bold text-lg rounded-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">stop</span>
              {t('mobileFlowCalibration.stopAndMeasure')}
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6">
            {/* Success Icon */}
            <div className="flex flex-col items-center py-8">
              <div className="size-20 rounded-full bg-mobile-primary/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-4xl">check_circle</span>
              </div>
              <h3 className="text-white text-xl font-bold">{t('mobileFlowCalibration.completeTitle')}</h3>
              <p className="text-mobile-text-muted text-center mt-2">
                {t('mobileFlowCalibration.collectedPulses').replace('{count}', (calibrationData?.pulses ?? 0).toString())}
              </p>
            </div>

            {/* Volume Input */}
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                {t('mobileFlowCalibration.enterCollectedVolume')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={testVolume}
                  onChange={(e) => setTestVolume(Number(e.target.value))}
                  className="flex-1 h-14 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl px-4 text-white text-center text-2xl font-bold focus:outline-none focus:border-mobile-primary"
                />
                <span className="text-mobile-text-muted font-medium text-lg">{t('mobileFlowCalibration.litersLabel')}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <button onClick={handleCalculate} className="text-mobile-primary font-bold text-sm">
                {t('mobileFlowCalibration.recalculate')}
              </button>
            </div>

            {/* Result */}
            <div className="rounded-2xl bg-mobile-primary/10 border border-mobile-primary/30 p-5">
              <p className="text-mobile-text-muted text-sm mb-1">{t('mobileFlowCalibration.calculatedValue')}</p>
              <p className="text-mobile-primary text-4xl font-bold">
                {calibrationData?.pulses_per_liter ?? 0}
                <span className="text-lg ml-2">{t('mobileFlowCalibration.pulsesPerLiter')}</span>
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">save</span>
              {saveLoading ? t('mobileFlowCalibration.saving') : t('mobileFlowCalibration.saveCalibration')}
            </button>

            <button
              onClick={() => setStep('intro')}
              disabled={saveLoading}
              className="w-full h-12 bg-white/10 text-white font-bold rounded-xl active:scale-[0.98] transition-transform"
            >
              {t('mobileFlowCalibration.recalibrate')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileFlowCalibration;
