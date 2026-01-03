import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import MobileConfirmModal from '../../components/mobile/MobileConfirmModal';
import { BleService } from '../../services/BleService';
import { useAppStore } from '../../store/useAppStore';
import { ResetStatus, FactoryWipeStep } from '../../types/firmware_structs';
import { useI18n } from '../../i18n';

type ResetType = 'settings' | 'schedule' | 'stats' | 'full';

const MobileDeviceReset: React.FC = () => {
  const history = useHistory();
  const bleService = BleService.getInstance();
  const { t } = useI18n();

  // Subscribe to reset state for progress updates
  const resetState = useAppStore(state => state.resetState);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReset, setSelectedReset] = useState<ResetType | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine if factory reset is in progress
  const isFactoryWipeInProgress = resetState?.status === ResetStatus.IN_PROGRESS;
  const progressPct = resetState?.progress_pct ?? 0;
  const currentStep = resetState?.wipe_step ?? 0;
  const retryCount = resetState?.retry_count ?? 0;
  const wipeStepNames: Record<FactoryWipeStep, string> = {
    [FactoryWipeStep.PREPARE]: t('mobileDeviceReset.wipeSteps.prepare'),
    [FactoryWipeStep.RESET_CHANNELS]: t('mobileDeviceReset.wipeSteps.resetChannels'),
    [FactoryWipeStep.RESET_SYSTEM]: t('mobileDeviceReset.wipeSteps.resetSystem'),
    [FactoryWipeStep.RESET_CALIBRATION]: t('mobileDeviceReset.wipeSteps.resetCalibration'),
    [FactoryWipeStep.CLEAR_RAIN_HIST]: t('mobileDeviceReset.wipeSteps.clearRainHistory'),
    [FactoryWipeStep.CLEAR_ENV_HIST]: t('mobileDeviceReset.wipeSteps.clearEnvHistory'),
    [FactoryWipeStep.CLEAR_ONBOARDING]: t('mobileDeviceReset.wipeSteps.clearOnboarding'),
    [FactoryWipeStep.VERIFY]: t('mobileDeviceReset.wipeSteps.verify'),
    [FactoryWipeStep.DONE]: t('mobileDeviceReset.wipeSteps.done'),
  };
  const stepName = wipeStepNames[currentStep as FactoryWipeStep] ?? t('mobileDeviceReset.processing');

  const resetOptions = [
    {
      id: 'settings' as ResetType,
      name: t('mobileDeviceReset.options.settings.name'),
      icon: 'settings_backup_restore',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      description: t('mobileDeviceReset.options.settings.description'),
      details: t('mobileDeviceReset.options.settings.details'),
      severity: 'low',
    },
    {
      id: 'schedule' as ResetType,
      name: t('mobileDeviceReset.options.schedule.name'),
      icon: 'event_busy',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      description: t('mobileDeviceReset.options.schedule.description'),
      details: t('mobileDeviceReset.options.schedule.details'),
      severity: 'medium',
    },
    {
      id: 'stats' as ResetType,
      name: t('mobileDeviceReset.options.stats.name'),
      icon: 'delete_sweep',
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      description: t('mobileDeviceReset.options.stats.description'),
      details: t('mobileDeviceReset.options.stats.details'),
      severity: 'medium',
    },
    {
      id: 'full' as ResetType,
      name: t('mobileDeviceReset.options.full.name'),
      icon: 'restart_alt',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      description: t('mobileDeviceReset.options.full.description'),
      details: t('mobileDeviceReset.options.full.details'),
      severity: 'critical',
    },
  ];

  const handleResetClick = (type: ResetType) => {
    setSelectedReset(type);
    setShowConfirmModal(true);
  };

  const handleConfirmReset = async () => {
    if (!selectedReset) return;

    setLoading(true);
    setShowConfirmModal(false); // Close modal, maybe show global spinner?

    // Opcodes: 0x12=Settings, 0x11=Schedules, 0x14=History, 0xFF=Factory
    let opcode = 0x00;
    switch (selectedReset) {
      case 'settings': opcode = 0x12; break;
      case 'schedule': opcode = 0x11; break;
      case 'stats': opcode = 0x14; break;
      case 'full': opcode = 0xFF; break;
    }

    try {
      console.log(`Performing reset: ${selectedReset} (0x${opcode.toString(16)})`);
      await bleService.performReset(opcode);

      if (selectedReset === 'full') {
        // Factory reset changes device state dramatically.
        // Ensure we drop any cached app/device state (incl. onboarding %) and force a clean reconnect.
        try {
          await bleService.disconnect();
        } catch (disconnectErr) {
          console.warn('[MobileDeviceReset] Disconnect after factory reset failed (continuing):', disconnectErr);
          // Fallback: at least clear local store so UI doesn't keep stale state.
          useAppStore.getState().resetStore();
        }

        // Navigate to welcome after factory reset
        history.replace('/welcome');
      } else {
        alert(t('mobileDeviceReset.resetSuccess'));
        history.goBack();
      }
    } catch (e) {
      console.error('Reset failed:', e);
      const reason = e instanceof Error ? e.message : String(e);
      alert(t('mobileDeviceReset.resetFailed').replace('{reason}', reason));
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = resetOptions.find(o => o.id === selectedReset);

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 justify-between">
        <button
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center">
          {t('mobileDeviceReset.title')}
        </h2>
        <div className="size-12" />
      </div>

      <div className="px-4 space-y-6">
        {/* Warning Banner */}
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-400 shrink-0">warning</span>
          <div>
            <p className="text-red-300 font-semibold mb-1">{t('mobileDeviceReset.warningTitle')}</p>
            <p className="text-red-200/80 text-sm leading-relaxed">
              {t('mobileDeviceReset.warningBody')}
            </p>
          </div>
        </div>

        {/* Reset Options */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
            {t('mobileDeviceReset.sectionLabel')}
          </label>

          <div className="space-y-3">
            {resetOptions.map(option => (
              <button
                key={option.id}
                onClick={() => handleResetClick(option.id)}
                disabled={loading}
                className={`w-full rounded-2xl bg-mobile-surface-dark border transition-all p-4 text-left ${loading ? 'opacity-50 cursor-not-allowed' : ''
                  } ${option.severity === 'critical'
                    ? 'border-red-500/30 hover:border-red-500/50'
                    : 'border-mobile-border-dark hover:border-mobile-primary/50'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`size-12 rounded-full ${option.iconBg} flex items-center justify-center ${option.iconColor} shrink-0`}>
                    <span className="material-symbols-outlined text-2xl">{option.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold text-lg mb-1 ${option.severity === 'critical' ? 'text-red-400' : 'text-white'
                      }`}>
                      {option.name}
                    </h4>
                    <p className="text-mobile-text-muted text-sm">{option.description}</p>
                  </div>
                  <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-mobile-primary">help_outline</span>
            {t('mobileDeviceReset.helpTitle')}
          </h4>
          <p className="text-mobile-text-muted text-sm leading-relaxed mb-3">
            {t('mobileDeviceReset.helpBody')}
          </p>
          <button className="text-mobile-primary text-sm font-semibold flex items-center gap-1">
            {t('mobileDeviceReset.helpAction')}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <MobileConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmReset}
        title={selectedOption?.name || t('mobileDeviceReset.confirmTitle')}
        message={selectedOption?.details || ''}
        confirmText={selectedReset === 'full' ? t('mobileDeviceReset.confirmFactory') : t('mobileDeviceReset.confirmReset')}
        cancelText={t('common.cancel')}
        icon={selectedOption?.icon || 'warning'}
        variant={selectedReset === 'full' ? 'danger' : 'warning'}
        requireConfirmation={selectedReset === 'full' ? t('mobileDeviceReset.confirmWord') : undefined}
      />

      {/* Loading Overlay with Factory Wipe Progress */}
      {loading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center max-w-xs w-full px-6">
            {/* Icon and Title */}
            <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-red-400 text-3xl">restart_alt</span>
            </div>

            {isFactoryWipeInProgress ? (
              <>
                {/* Factory Wipe Progress UI */}
                <p className="text-white font-bold text-lg mb-2">{t('mobileDeviceReset.factoryResetTitle')}</p>
                <p className="text-mobile-text-muted text-sm mb-4 text-center">{stepName}</p>

                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                  <div
                    className="bg-gradient-to-r from-red-500 to-orange-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Progress Percentage */}
                <p className="text-mobile-text-muted text-sm mb-2">
                  {t('mobileDeviceReset.progressComplete').replace('{percent}', progressPct.toString())}
                </p>

                {/* Retry indicator */}
                {retryCount > 0 && (
                  <p className="text-yellow-400 text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    {t('mobileDeviceReset.retryAttempt').replace('{count}', retryCount.toString())}
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Simple spinner for non-factory resets */}
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mobile-primary mb-4"></div>
                <p className="text-white font-bold">{t('mobileDeviceReset.resetting')}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDeviceReset;

