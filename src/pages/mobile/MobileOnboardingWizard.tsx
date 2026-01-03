import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useI18n } from '../../i18n';
import { BleService } from '../../services/BleService';
import { isChannelConfigComplete } from '../../types/firmware_structs';
import { navigationStack } from '../../lib/navigationStack';

type WizardStep = 
  | 'device-naming'
  | 'time-sync'
  | 'master-valve'
  | 'select-zones'
  | 'final-summary';

interface ZoneSelection {
  id: number;
  name: string;
  enabled: boolean;
  configured: boolean;
}

const MobileOnboardingWizard: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { zones, systemConfig, onboardingState, wizardState, rtcConfig } = useAppStore();
  const { t, language } = useI18n();
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';
  const bleService = BleService.getInstance();

  // Parse URL params to detect returning from zone-add
  const params = new URLSearchParams(location.search);
  const continueFromZone = params.get('continueFromZone');
  const configuredChannel = params.get('configured');

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('device-naming');
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Device config
  const [deviceName, setDeviceName] = useState(() => t('mobileOnboardingWizard.deviceName.defaultName'));
  const [hasMasterValve, setHasMasterValve] = useState(false);
  const [masterValvePreDelay, setMasterValvePreDelay] = useState(0);
  const [masterValvePostDelay, setMasterValvePostDelay] = useState(0);

  // Zone selection - which zones to configure
  const [zoneSelections, setZoneSelections] = useState<ZoneSelection[]>([]);
  const zonesInitializedRef = useRef(false);

  // Initialize zone selections once zones/systemConfig are available
  useEffect(() => {
    const numChannels = systemConfig?.num_channels ?? 8;

    if (zoneSelections.length === 0 && !zonesInitializedRef.current && numChannels > 0) {
      const selections: ZoneSelection[] = [];
      
      for (let i = 0; i < numChannels; i++) {
        const zone = zones.find(z => z.channel_id === i);
        const isConfigured = 
          (onboardingState?.channel_extended_flags !== undefined &&
            isChannelConfigComplete(onboardingState.channel_extended_flags, i)) ||
          wizardState.completedZones.includes(i);
        
        selections.push({
          id: i,
          name: zone?.name || t('mobileOnboardingWizard.zoneNumber').replace('{number}', String(i + 1)),
          enabled: i < 2, // Default: enable first 2 zones
          configured: isConfigured,
        });
      }
      
      setZoneSelections(selections);
      zonesInitializedRef.current = true;
    }
  }, [zones, systemConfig, onboardingState, wizardState, zoneSelections.length, t]);

  // Handle returning from zone-add wizard
  useEffect(() => {
    if (continueFromZone === 'true') {
      // Mark the configured channel as done
      const channelId = configuredChannel !== null ? parseInt(configuredChannel, 10) : null;
      
      // Update selections and calculate next step in one go
      setZoneSelections(prev => {
        const updated = channelId !== null 
          ? prev.map(z => z.id === channelId ? { ...z, configured: true } : z)
          : prev;
        
        // Check if there are more zones to configure
        const enabledZones = updated.filter(z => z.enabled);
        const unconfiguredZones = enabledZones.filter(z => !z.configured);
        
        if (unconfiguredZones.length > 0) {
          // Go to next unconfigured zone
          const nextZone = unconfiguredZones[0];
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            history.replace(`/zones/add?channel=${nextZone.id}&fromOnboarding=true`);
          }, 0);
        } else {
          // All zones configured, go to final summary
          setTimeout(() => {
            setCurrentStep('final-summary');
            history.replace('/onboarding');
          }, 0);
        }
        
        return updated;
      });
    }
  }, [continueFromZone, configuredChannel, history]);

  // Initialize master valve settings from device
  useEffect(() => {
    if (systemConfig?.master_valve) {
      setHasMasterValve(systemConfig.master_valve.enabled);
      setMasterValvePreDelay(systemConfig.master_valve.pre_delay);
      setMasterValvePostDelay(systemConfig.master_valve.post_delay);
    }
  }, [systemConfig]);

  const enabledZones = zoneSelections.filter(z => z.enabled);
  const unconfiguredEnabledZones = enabledZones.filter(z => !z.configured);

  const stepOrder: WizardStep[] = [
    'device-naming',
    'time-sync',
    'master-valve',
    'select-zones',
    'final-summary',
  ];

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const totalSteps = stepOrder.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const goNext = async () => {
    setDirection(1);
    
    // After select-zones, redirect to zone-add for first enabled zone
    if (currentStep === 'select-zones') {
      if (unconfiguredEnabledZones.length > 0) {
        // Save master valve settings first
        await saveMasterValveSettings();
        
        // Redirect to zone add wizard for first unconfigured zone
        const firstZone = unconfiguredEnabledZones[0];
        history.push(`/zones/add?channel=${firstZone.id}&fromOnboarding=true`);
        return;
      } else if (enabledZones.length > 0) {
        // All selected zones already configured, go to summary
        setCurrentStep('final-summary');
        return;
      }
    }
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < stepOrder.length) {
      setCurrentStep(stepOrder[nextIndex]);
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    setDirection(-1);
    const prevIndex = currentStepIndex - 1;
    
    if (prevIndex >= 0) {
      setCurrentStep(stepOrder[prevIndex]);
    } else {
      history.goBack();
    }
  };

  const saveMasterValveSettings = async () => {
    if (!systemConfig) return;
    
    try {
      // Small delay to ensure BLE is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const fullConfig = {
        ...systemConfig,
        master_valve: {
          ...systemConfig.master_valve,
          enabled: hasMasterValve,
          pre_delay: masterValvePreDelay,
          post_delay: masterValvePostDelay,
        },
      };
      await bleService.writeSystemConfigObject(fullConfig);
    } catch (e) {
      console.error('Failed to save master valve settings:', e);
      // Don't block wizard progress on write failure
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Sync time to device
      const now = new Date();
      const utcOffsetMinutes = now.getTimezoneOffset() * -1;
      const dstActive = rtcConfig?.dst_active ?? false;
      await bleService.writeRtcConfig(now, utcOffsetMinutes, dstActive);
      
      // Save master valve settings
      await saveMasterValveSettings();
      
      console.log('Onboarding complete:', { deviceName, hasMasterValve, enabledZones });

      // Clear Android back stack so Back won't return into onboarding.
      navigationStack.clear();
      history.replace('/dashboard');
    } catch (e) {
      console.error('Failed to complete onboarding:', e);

      // Still clear back stack to avoid being stuck in onboarding loop.
      navigationStack.clear();
      history.replace('/dashboard');
    } finally {
      setSaving(false);
    }
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
              <h2 className="text-white text-2xl font-bold mb-2">{t('mobileOnboardingWizard.deviceName.title')}</h2>
              <p className="text-mobile-text-muted">{t('mobileOnboardingWizard.deviceName.subtitle')}</p>
            </div>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder={t('mobileOnboardingWizard.deviceName.placeholder')}
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
              <h2 className="text-white text-2xl font-bold mb-2">{t('mobileOnboardingWizard.timeSync.title')}</h2>
              <p className="text-mobile-text-muted">{t('mobileOnboardingWizard.timeSync.subtitle')}</p>
            </div>
            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-6 text-center">
              <p className="text-mobile-text-muted text-sm mb-2">{t('mobileOnboardingWizard.timeSync.currentTime')}</p>
              <p className="text-white text-4xl font-bold tracking-tight">
                {new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
              <p className="text-mobile-text-muted text-sm mt-2">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-mobile-primary">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-semibold">{t('mobileOnboardingWizard.timeSync.autoSync')}</span>
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
              <h2 className="text-white text-2xl font-bold mb-2">{t('mobileOnboardingWizard.masterValve.title')}</h2>
              <p className="text-mobile-text-muted">{t('mobileOnboardingWizard.masterValve.subtitle')}</p>
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
                <span className={`font-bold text-lg ${hasMasterValve ? 'text-white' : 'text-mobile-text-muted'}`}>{t('common.yes')}</span>
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
                <span className={`font-bold text-lg ${!hasMasterValve ? 'text-white' : 'text-mobile-text-muted'}`}>{t('common.no')}</span>
              </button>
            </div>

            {hasMasterValve && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                {/* Delay Before Start */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
                      {t('mobileOnboardingWizard.masterValve.delayBefore')}
                    </label>
                    <span className="text-mobile-primary font-bold text-xl">{masterValvePreDelay}{t('common.secondsShort')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={masterValvePreDelay}
                    onChange={(e) => setMasterValvePreDelay(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #13ec37 0%, #13ec37 ${(masterValvePreDelay / 60) * 100}%, rgba(255,255,255,0.1) ${(masterValvePreDelay / 60) * 100}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                  <p className="text-mobile-text-muted text-sm px-1">
                    {t('mobileOnboardingWizard.masterValve.preDelayHint')
                      .replace('{seconds}', `${masterValvePreDelay}${t('common.secondsShort')}`)}
                  </p>
                </div>

                {/* Delay After Stop */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
                      {t('mobileOnboardingWizard.masterValve.delayAfter')}
                    </label>
                    <span className="text-mobile-primary font-bold text-xl">{masterValvePostDelay}{t('common.secondsShort')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={masterValvePostDelay}
                    onChange={(e) => setMasterValvePostDelay(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #13ec37 0%, #13ec37 ${(masterValvePostDelay / 60) * 100}%, rgba(255,255,255,0.1) ${(masterValvePostDelay / 60) * 100}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                  <p className="text-mobile-text-muted text-sm px-1">
                    {t('mobileOnboardingWizard.masterValve.postDelayHint')
                      .replace('{seconds}', `${masterValvePostDelay}${t('common.secondsShort')}`)}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'select-zones': {
        const selectedZonesLabel = enabledZones.length === 1
          ? t('mobileOnboardingWizard.selectZones.selectedSingle').replace('{count}', String(enabledZones.length))
          : t('mobileOnboardingWizard.selectZones.selected').replace('{count}', String(enabledZones.length));
        const toConfigureLabel = unconfiguredEnabledZones.length > 0
          ? ` ${t('mobileOnboardingWizard.selectZones.toConfigure').replace('{count}', String(unconfiguredEnabledZones.length))}`
          : '';

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-20 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-4xl">water_drop</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">{t('mobileOnboardingWizard.selectZones.title')}</h2>
              <p className="text-mobile-text-muted">{t('mobileOnboardingWizard.selectZones.subtitle')}</p>
            </div>

            {zoneSelections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-mobile-primary border-t-transparent animate-spin" />
                <p className="text-mobile-text-muted text-sm">{t('mobileOnboardingWizard.selectZones.loading')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {zoneSelections.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => setZoneSelections(prev => prev.map(z => 
                        z.id === zone.id ? { ...z, enabled: !z.enabled } : z
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
                          {zone.name}
                        </p>
                        <p className="text-mobile-text-muted text-sm">
                          {zone.configured ? (
                            <span className="text-mobile-primary">{t('mobileOnboardingWizard.selectZones.status.configured')}</span>
                          ) : zone.enabled ? (
                            t('mobileOnboardingWizard.selectZones.status.willConfigure')
                          ) : (
                            t('mobileOnboardingWizard.selectZones.status.tapToEnable')
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-mobile-text-muted text-sm">
                  {selectedZonesLabel}{toConfigureLabel}
                </p>
              </>
            )}
          </div>
        );
      }

      case 'final-summary': {
        const configuredCount = enabledZones.filter(z => z.configured).length;
        const configuredZonesLabel = configuredCount === 1
          ? t('mobileOnboardingWizard.summary.zonesCountSingle').replace('{count}', String(configuredCount))
          : t('mobileOnboardingWizard.summary.zonesCount').replace('{count}', String(configuredCount));

        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="size-24 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-5xl">check_circle</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">{t('mobileOnboardingWizard.summary.title')}</h2>
              <p className="text-mobile-text-muted">{t('mobileOnboardingWizard.summary.subtitle')}</p>
            </div>

            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark divide-y divide-mobile-border-dark overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-mobile-primary">devices</span>
                  <span className="text-mobile-text-muted">{t('mobileOnboardingWizard.summary.deviceNameLabel')}</span>
                </div>
                <span className="text-white font-semibold">{deviceName}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-mobile-primary">valve</span>
                  <span className="text-mobile-text-muted">{t('mobileOnboardingWizard.summary.masterValveLabel')}</span>
                </div>
                <span className="text-white font-semibold">
                  {hasMasterValve ? t('mobileOnboardingWizard.summary.enabled') : t('mobileOnboardingWizard.summary.disabled')}
                </span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-mobile-primary">water_drop</span>
                  <span className="text-mobile-text-muted">{t('mobileOnboardingWizard.summary.zonesConfiguredLabel')}</span>
                </div>
                <span className="text-white font-semibold">{configuredZonesLabel}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-mobile-primary/10 border border-mobile-primary/30">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-mobile-primary">tips_and_updates</span>
                <div>
                  <p className="text-white font-semibold mb-1">{t('mobileOnboardingWizard.summary.allSetTitle')}</p>
                  <p className="text-mobile-text-muted text-sm">
                    {t('mobileOnboardingWizard.summary.allSetBody')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'device-naming':
        return deviceName.trim().length > 0;
      case 'select-zones':
        return enabledZones.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-32">
      {/* Header with progress */}
      <div className="sticky top-0 z-50 bg-mobile-bg-dark/90 backdrop-blur-md">
        <div className="flex items-center p-4 gap-4">
          <button
            onClick={goBack}
            className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          
          {/* Progress bar */}
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-mobile-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <span className="text-mobile-text-muted text-sm font-medium w-12 text-right">
            {currentStepIndex + 1}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
        <button
          onClick={goNext}
          disabled={!canProceed() || saving}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              {t('common.loading')}
            </>
          ) : currentStep === 'final-summary' ? (
            <>
              <span className="material-symbols-outlined">check</span>
              {t('mobileOnboardingWizard.actions.goToDashboard')}
            </>
          ) : currentStep === 'select-zones' ? (
            <>
              <span className="material-symbols-outlined">tune</span>
              {t('mobileOnboardingWizard.actions.configureZones')}
            </>
          ) : (
            <>
              {t('mobileOnboardingWizard.actions.continue')}
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileOnboardingWizard;
