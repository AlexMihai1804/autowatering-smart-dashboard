import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BleService } from '../../services/BleService';
import { useAppStore } from '../../store/useAppStore';
import MobileHeader from '../../components/mobile/MobileHeader';
import { useI18n } from '../../i18n';
import {
  AlarmCode,
  getAlarmTitle,
  getAffectedChannelFromAlarmData,
  HydraulicLockLevel,
  HydraulicLockReason,
  SystemStatus,
  ConfigStatusResponse,
  CONFIG_STATUS_COMMANDS,
  CONFIG_STATUS_FLAGS
} from '../../types/firmware_structs';

const getLockReasonLabel = (reason: HydraulicLockReason, t: (k: string) => string) => {
  switch (reason) {
    case HydraulicLockReason.HIGH_FLOW:
      return t('hydraulicStatus.lockReasons.highFlow');
    case HydraulicLockReason.NO_FLOW:
      return t('hydraulicStatus.lockReasons.noFlow');
    case HydraulicLockReason.UNEXPECTED:
      return t('hydraulicStatus.lockReasons.unexpected');
    case HydraulicLockReason.MAINLINE_LEAK:
      return t('hydraulicStatus.lockReasons.mainlineLeak');
    case HydraulicLockReason.NONE:
      return t('hydraulicStatus.lockReasons.allClear');
    default:
      return t('hydraulicStatus.lockReasons.unknown');
  }
};

const getSystemStatusLabel = (status: SystemStatus, t: (k: string) => string) => {
  switch (status) {
    case SystemStatus.OK:
      return t('dashboard.systemStatus.ok');
    case SystemStatus.NO_FLOW:
      return t('dashboard.systemStatus.noFlow');
    case SystemStatus.UNEXPECTED_FLOW:
      return t('dashboard.systemStatus.unexpectedFlow');
    case SystemStatus.FAULT:
      return t('dashboard.systemStatus.fault');
    case SystemStatus.RTC_ERROR:
      return t('dashboard.systemStatus.rtcError');
    case SystemStatus.LOW_POWER:
      return t('dashboard.systemStatus.lowPower');
    case SystemStatus.FREEZE_LOCKOUT:
      return t('dashboard.systemStatus.freezeLockout');
    default:
      return t('dashboard.systemStatus.unknown');
  }
};

const formatMask = (mask: number) => `0b${mask.toString(2).padStart(8, '0')} (0x${mask.toString(16).padStart(2, '0')})`;
const formatFlagsHex = (flags: number) => `0x${(flags >>> 0).toString(16).padStart(4, '0')}`;

const listMissingChannels = (mask: number): number[] => {
  const missing: number[] = [];
  for (let ch = 0; ch < 8; ch++) {
    const isSet = ((mask >> ch) & 1) === 1;
    if (!isSet) missing.push(ch);
  }
  return missing;
};

const MobileHealthSetupHub: React.FC = () => {
  const history = useHistory();
  const bleService = BleService.getInstance();
  const { t } = useI18n();

  const { connectionState, systemStatus, alarmStatus, hydraulicStatus, zones } = useAppStore();
  const isConnected = connectionState === 'connected';

  const [configStatus, setConfigStatus] = useState<ConfigStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [validateLoading, setValidateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const showToast = useCallback(async (text: string) => {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch {
      // no-op on web / missing plugin
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const status = await bleService.readConfigStatus();
      setConfigStatus(status);

      // Best-effort refresh of key live indicators.
      await bleService.readAlarmStatus().catch(() => undefined);
      await bleService.readHydraulicStatus(0xFF).catch(() => undefined);
    } catch (e: any) {
      console.warn('[HealthHub] refresh failed', e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [bleService, isConnected]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const hasAlarm = Boolean(alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE);
  const alarmTitle = hasAlarm ? getAlarmTitle(alarmStatus!.alarm_code, t) : null;
  const alarmChannelId = hasAlarm ? getAffectedChannelFromAlarmData(alarmStatus!.alarm_code, alarmStatus!.alarm_data) : undefined;
  const alarmZoneName =
    alarmChannelId !== undefined
      ? zones.find(z => z.channel_id === alarmChannelId)?.name || `${t('zones.zone')} ${alarmChannelId + 1}`
      : undefined;

  const globalLockLevel = hydraulicStatus?.global_lock_level ?? HydraulicLockLevel.NONE;
  const globalLockReason = hydraulicStatus?.global_lock_reason ?? HydraulicLockReason.NONE;
  const hasGlobalLock = globalLockLevel !== HydraulicLockLevel.NONE;

  const activeIssues = useMemo(() => {
    const issues: { title: string; subtitle?: string; icon: string; tone: 'danger' | 'warning' }[] = [];

    if (hasGlobalLock) {
      issues.push({
        icon: 'lock',
        tone: globalLockLevel === HydraulicLockLevel.HARD ? 'danger' : 'warning',
        title: globalLockLevel === HydraulicLockLevel.HARD ? t('hydraulicStatus.systemLocked') : t('hydraulicStatus.warning'),
        subtitle: getLockReasonLabel(globalLockReason, t)
      });
    }

    if (hasAlarm && alarmTitle) {
      issues.push({
        icon: 'warning',
        tone: 'danger',
        title: alarmTitle,
        subtitle: alarmZoneName ?? t('alarmHistory.active')
      });
    }

    if (systemStatus.state !== SystemStatus.OK) {
      issues.push({
        icon: 'health_and_safety',
        tone: 'warning',
        title: t('healthHub.systemStatusTitle'),
        subtitle: getSystemStatusLabel(systemStatus.state, t)
      });
    }

    return issues;
  }, [
    alarmTitle,
    alarmZoneName,
    configStatus,
    globalLockLevel,
    globalLockReason,
    hasAlarm,
    hasGlobalLock,
    systemStatus.state,
    t
  ]);

  const setupSummary = useMemo(() => {
    if (!configStatus) return null;
    const missingZones = listMissingChannels(configStatus.channel_mask);
    const missingSchedules = listMissingChannels(configStatus.schedule_mask);
    return {
      completeness: configStatus.overall_completeness,
      onboardingComplete: configStatus.onboarding_complete !== 0,
      missingZones,
      missingSchedules,
      flags: configStatus.flags,
    };
  }, [configStatus]);

  const configFlags = useMemo(() => {
    const flags = configStatus?.flags ?? 0;
    if (!flags) return null;

    const items: { key: string; tone: 'danger' | 'warning'; text: string }[] = [];

    if ((flags & CONFIG_STATUS_FLAGS.VALIDATION_ERROR) !== 0) {
      items.push({ key: 'validation', tone: 'danger', text: t('healthHub.flagValidationError') });
    }
    if ((flags & CONFIG_STATUS_FLAGS.NVS_ERROR) !== 0) {
      items.push({ key: 'nvs', tone: 'danger', text: t('healthHub.flagNvsError') });
    }
    if ((flags & CONFIG_STATUS_FLAGS.NEEDS_SYNC) !== 0) {
      items.push({ key: 'sync', tone: 'warning', text: t('healthHub.flagNeedsSync') });
    }

    return { flags, items };
  }, [configStatus?.flags, t]);

  const handleValidate = useCallback(async () => {
    if (!isConnected) return;
    setValidateLoading(true);
    try {
      await bleService.sendConfigStatusCommand(CONFIG_STATUS_COMMANDS.VALIDATE);
      await showToast(t('healthHub.validationStarted'));

      // Validation is async on firmware; poll a few times so the UI updates even if it takes seconds.
      const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
      const pollDelaysMs = [700, 1500, 3000, 6000];
      for (const ms of pollDelaysMs) {
        await wait(ms);
        try {
          const status = await bleService.readConfigStatus();
          if (isMountedRef.current) setConfigStatus(status);
        } catch (e) {
          // Ignore transient read errors during validation.
        }
      }
    } catch (e: any) {
      console.warn('[HealthHub] validate failed', e);
      await showToast(t('errors.failedWithReason').replace('{error}', e?.message || String(e)));
    } finally {
      setValidateLoading(false);
    }
  }, [bleService, isConnected, refresh, showToast, t]);

  const showSetupCard = Boolean(setupSummary);
  const completenessPct = setupSummary?.completeness ?? 0;

  return (
    <div className="min-h-screen bg-mobile-bg-dark text-white font-manrope">
      <MobileHeader
        title={t('healthHub.title')}
        subtitle={t('healthHub.subtitle')}
        showBackButton
        onBack={() => history.goBack()}
        rightAction={
          <button
            onClick={refresh}
            disabled={!isConnected || loading}
            className="w-10 h-10 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-50"
            aria-label={t('common.refresh')}
            title={t('common.refresh')}
          >
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        }
      />

      <main className="app-scrollbar max-w-md mx-auto px-4 pb-24 pt-4 flex flex-col gap-4">
        {!isConnected && (
          <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
            <p className="text-sm text-mobile-text-muted">{t('errors.notConnected')}</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-800/60 bg-red-900/20 p-4">
            <p className="text-sm font-bold text-red-200">{t('common.error')}</p>
            <p className="text-xs text-red-100/80 mt-1 break-words">{error}</p>
          </div>
        )}

        {/* Setup Score */}
        <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.setupScore')}</p>
              <h2 className="text-3xl font-black tracking-tight text-white mt-0.5">
                {showSetupCard ? `${completenessPct}%` : '--'}
              </h2>
              <p className="text-xs text-mobile-text-muted mt-1">
                {showSetupCard
                  ? (setupSummary!.onboardingComplete ? t('healthHub.onboardingComplete') : t('healthHub.onboardingIncomplete'))
                  : t('healthHub.setupScoreHint')}
              </p>
            </div>

            <button
              onClick={handleValidate}
              disabled={!isConnected || validateLoading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold disabled:opacity-50"
            >
              {validateLoading ? t('healthHub.validating') : t('healthHub.validateConfig')}
            </button>
          </div>

          {setupSummary && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3">
                <p className="text-[10px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.zoneMask')}</p>
                <p className="text-xs font-mono text-white/80 mt-1">{formatMask(configStatus!.channel_mask)}</p>
              </div>
              <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3">
                <p className="text-[10px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.scheduleMask')}</p>
                <p className="text-xs font-mono text-white/80 mt-1">{formatMask(configStatus!.schedule_mask)}</p>
              </div>
            </div>
          )}

          {setupSummary && (setupSummary.missingZones.length > 0 || setupSummary.missingSchedules.length > 0) && (
            <div className="mt-4 rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3">
              <p className="text-xs font-bold text-white">{t('healthHub.missingItems')}</p>
              <div className="mt-2 flex flex-col gap-2">
                {setupSummary.missingZones.length > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-mobile-text-muted">
                      {t('healthHub.missingZones').replace('{count}', String(setupSummary.missingZones.length))}
                    </p>
                    <button
                      onClick={() => history.push('/zones')}
                      className="px-3 py-1.5 rounded-lg bg-mobile-primary/15 text-mobile-primary border border-mobile-primary/20 text-xs font-bold"
                    >
                      {t('common.view')}
                    </button>
                  </div>
                )}
                {setupSummary.missingSchedules.length > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-mobile-text-muted">
                      {t('healthHub.missingSchedules').replace('{count}', String(setupSummary.missingSchedules.length))}
                    </p>
                    <button
                      onClick={() => history.push('/zones')}
                      className="px-3 py-1.5 rounded-lg bg-mobile-primary/15 text-mobile-primary border border-mobile-primary/20 text-xs font-bold"
                    >
                      {t('common.view')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {configFlags && configFlags.items.length > 0 && (
            <div className="mt-4 rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-white">{t('healthHub.deviceFlags')}</p>
                <p className="text-[11px] font-mono text-white/60">{formatFlagsHex(configFlags.flags)}</p>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {configFlags.items.map(item => (
                  <div
                    key={item.key}
                    className={`rounded-lg border px-3 py-2 ${
                      item.tone === 'danger'
                        ? 'bg-red-900/15 border-red-800/55'
                        : 'bg-yellow-900/10 border-yellow-800/45'
                    }`}
                  >
                    <p className="text-xs text-white/80">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Issues */}
        <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.activeIssues')}</p>
            {activeIssues.length > 0 && (
              <span className="text-[11px] font-bold text-white/70">{activeIssues.length}</span>
            )}
          </div>

          {activeIssues.length === 0 ? (
            <div className="mt-3 rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3">
              <p className="text-sm font-bold text-white">{t('healthHub.allGoodTitle')}</p>
              <p className="text-xs text-mobile-text-muted mt-1">{t('healthHub.allGoodDesc')}</p>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {activeIssues.map((issue, idx) => (
                <div
                  key={`${issue.title}:${idx}`}
                  className={`rounded-xl border p-3 flex items-start gap-3 ${
                    issue.tone === 'danger'
                      ? 'bg-red-900/15 border-red-800/55'
                      : 'bg-yellow-900/10 border-yellow-800/45'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-white/80">{issue.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{issue.title}</p>
                    {issue.subtitle && (
                      <p className="text-xs text-white/70 mt-0.5 truncate">{issue.subtitle}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => history.push('/alarms')}
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2.5 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-white/70">notifications_active</span>
                <span className="text-xs font-bold text-white">{t('alarmHistory.title')}</span>
              </div>
              <p className="text-[11px] text-mobile-text-muted mt-1">
                {hasAlarm ? t('alarmHistory.active') : t('healthHub.noActiveAlarms')}
              </p>
            </button>

            <button
              onClick={() => history.push('/health/troubleshooting')}
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2.5 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-white/70">support_agent</span>
                <span className="text-xs font-bold text-white">{t('healthHub.troubleshootingCta')}</span>
              </div>
              <p className="text-[11px] text-mobile-text-muted mt-1">{t('healthHub.troubleshootingCtaHint')}</p>
            </button>

            <button
              onClick={() => history.push('/device/info')}
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2.5 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-white/70">developer_board</span>
                <span className="text-xs font-bold text-white">{t('mobileDeviceInfo.title')}</span>
              </div>
              <p className="text-[11px] text-mobile-text-muted mt-1">{getSystemStatusLabel(systemStatus.state, t)}</p>
            </button>

            <button
              onClick={() => history.push('/health/device')}
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2.5 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-white/70">monitor_heart</span>
                <span className="text-xs font-bold text-white">{t('healthHub.deviceHealthCta')}</span>
              </div>
              <p className="text-[11px] text-mobile-text-muted mt-1">{t('healthHub.deviceHealthCtaHint')}</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MobileHealthSetupHub;
