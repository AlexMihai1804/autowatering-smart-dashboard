import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import MobileHeader from '../../components/mobile/MobileHeader';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import {
  AlarmCode,
  getAlarmTitle,
  HydraulicLockLevel,
  HydraulicLockReason
} from '../../types/firmware_structs';

const formatUptime = (minutes: number | undefined, unknownLabel: string): string => {
  if (typeof minutes !== 'number' || minutes < 0) return unknownLabel;
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const formatUnix = (epochSeconds: number | undefined, unknownLabel: string): string => {
  if (!epochSeconds || epochSeconds <= 0) return unknownLabel;
  return new Date(epochSeconds * 1000).toLocaleString();
};

const formatErrorCode = (value: number | undefined, unknownLabel: string): string => {
  if (typeof value !== 'number') return unknownLabel;
  return `0x${(value & 0xff).toString(16).padStart(2, '0')} (${value})`;
};

const getLockReasonLabel = (reason: HydraulicLockReason, t: (key: string) => string): string => {
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
      return t('healthHub.deviceHealth.lockNone');
    default:
      return t('hydraulicStatus.lockReasons.unknown');
  }
};

const getBmeStatusLabel = (status: number | undefined, t: (key: string) => string): string => {
  switch (status) {
    case 0:
      return t('healthHub.deviceHealth.bmeMissing');
    case 1:
      return t('healthHub.deviceHealth.bmeOk');
    case 2:
      return t('healthHub.deviceHealth.bmeError');
    case 3:
      return t('healthHub.deviceHealth.bmeDisabled');
    default:
      return t('healthHub.deviceHealth.bmeUnknown');
  }
};

const MobileDeviceHealth: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const bleService = BleService.getInstance();

  const {
    connectionState,
    connectedDeviceId,
    diagnosticsData,
    systemConfig,
    bulkSyncSnapshot,
    alarmStatus,
    hydraulicStatus
  } = useAppStore();

  const isConnected = connectionState === 'connected';
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setIsRefreshing(true);
    const results = await Promise.allSettled([
      bleService.readDiagnostics(),
      bleService.readSystemConfig(),
      bleService.readBulkSyncSnapshot(),
      bleService.readAlarmStatus(),
      bleService.readHydraulicStatus(0xff)
    ]);
    setIsRefreshing(false);

    const failures = results.filter(result => result.status === 'rejected').length;
    if (failures > 0) {
      await showToast(t('healthHub.deviceHealth.refreshFailed'));
    }
  }, [bleService, isConnected, showToast, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeAlarmLabel = useMemo(() => {
    if (!alarmStatus || alarmStatus.alarm_code === AlarmCode.NONE) return t('healthHub.deviceHealth.activeAlarmNone');
    return getAlarmTitle(alarmStatus.alarm_code, t);
  }, [alarmStatus, t]);

  const globalLockLevel = hydraulicStatus?.global_lock_level ?? HydraulicLockLevel.NONE;
  const lockLabel = useMemo(() => {
    if (globalLockLevel === HydraulicLockLevel.NONE) return t('healthHub.deviceHealth.lockNone');
    const reason = hydraulicStatus?.global_lock_reason ?? HydraulicLockReason.NONE;
    return `${globalLockLevel === HydraulicLockLevel.HARD ? 'HARD' : 'SOFT'} - ${getLockReasonLabel(reason, t)}`;
  }, [globalLockLevel, hydraulicStatus?.global_lock_reason, t]);

  const debugBundle = useMemo(() => {
    return {
      generated_at_utc: new Date().toISOString(),
      device_id: connectedDeviceId ?? null,
      firmware_version: systemConfig?.version ?? bulkSyncSnapshot?.version ?? null,
      diagnostics: diagnosticsData
        ? {
          uptime_minutes: diagnosticsData.uptime,
          error_count: diagnosticsData.error_count,
          last_error: diagnosticsData.last_error,
          valve_status_mask: diagnosticsData.valve_status,
          battery_level: diagnosticsData.battery_level
        }
        : null,
      system: systemConfig
        ? {
          version: systemConfig.version,
          power_mode: systemConfig.power_mode,
          num_channels: systemConfig.num_channels,
          flow_calibration: systemConfig.flow_calibration,
          bme280: systemConfig.bme280,
          last_sensor_reading: systemConfig.last_sensor_reading
        }
        : null,
      runtime: {
        active_alarm: alarmStatus ?? null,
        hydraulic_global_lock_level: hydraulicStatus?.global_lock_level ?? 0,
        hydraulic_global_lock_reason: hydraulicStatus?.global_lock_reason ?? 0
      },
      bulk_snapshot: bulkSyncSnapshot ?? null
    };
  }, [alarmStatus, bulkSyncSnapshot, connectedDeviceId, diagnosticsData, hydraulicStatus, systemConfig]);

  const handleCopyDebugBundle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugBundle, null, 2));
      await showToast(t('healthHub.deviceHealth.debugBundleCopied'));
    } catch (error) {
      console.warn('[MobileDeviceHealth] Failed to copy debug bundle', error);
      await showToast(t('healthHub.deviceHealth.debugBundleCopyFailed'));
    }
  }, [debugBundle, showToast, t]);

  const diagnosticsRows = [
    { label: t('mobileDeviceInfo.uptime'), value: formatUptime(diagnosticsData?.uptime, t('labels.unknown')), icon: 'timer' },
    { label: t('labels.errors'), value: String(diagnosticsData?.error_count ?? 0), icon: 'report' },
    { label: t('healthHub.deviceHealth.lastErrorCode'), value: formatErrorCode(diagnosticsData?.last_error, t('labels.unknown')), icon: 'error' },
    {
      label: t('labels.power'),
      value:
        diagnosticsData?.battery_level === 0xff
          ? 'AC'
          : diagnosticsData?.battery_level !== undefined
            ? `${diagnosticsData.battery_level}%`
            : t('labels.unknown'),
      icon: 'battery_charging_full'
    }
  ];

  return (
    <div className="min-h-screen bg-mobile-bg-dark text-white font-manrope">
      <MobileHeader
        title={t('healthHub.deviceHealth.title')}
        subtitle={t('healthHub.deviceHealth.subtitle')}
        showBackButton
        onBack={() => history.goBack()}
        rightAction={
          <button
            onClick={refresh}
            disabled={!isConnected || isRefreshing}
            className="w-10 h-10 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-50"
            aria-label={t('common.refresh')}
            title={t('common.refresh')}
          >
            <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        }
      />

      <main className="app-scrollbar max-w-md mx-auto px-4 pb-24 pt-4 flex flex-col gap-4">
        {!isConnected && (
          <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
            <p className="text-sm text-mobile-text-muted">{t('errors.notConnected')}</p>
          </div>
        )}

        <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
          <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.deviceHealth.diagnostics')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {diagnosticsRows.map((row) => (
              <div key={row.label} className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3">
                <div className="flex items-center gap-2 text-white/75">
                  <span className="material-symbols-outlined text-[16px]">{row.icon}</span>
                  <span className="text-[11px] uppercase tracking-wide">{row.label}</span>
                </div>
                <p className="text-sm font-semibold text-white mt-1 break-words">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
          <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.deviceHealth.environment')}</p>
          <div className="mt-3 flex flex-col gap-2">
            <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-mobile-text-muted">{t('healthHub.deviceHealth.bmeStatus')}</p>
              <p className="text-sm font-semibold text-white">{getBmeStatusLabel(systemConfig?.bme280?.status, t)}</p>
            </div>
            <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-mobile-text-muted">{t('healthHub.deviceHealth.bmeMeasurementInterval')}</p>
              <p className="text-sm font-semibold text-white">
                {systemConfig?.bme280?.measurement_interval ? `${systemConfig.bme280.measurement_interval}s` : t('labels.unknown')}
              </p>
            </div>
            <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-mobile-text-muted">{t('healthHub.deviceHealth.lastSensorReading')}</p>
              <p className="text-sm font-semibold text-white text-right">
                {formatUnix(systemConfig?.last_sensor_reading, t('labels.unknown'))}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
          <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.deviceHealth.runtime')}</p>
          <div className="mt-3 flex flex-col gap-2">
            <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-mobile-text-muted">{t('healthHub.deviceHealth.alarmState')}</p>
              <p className="text-sm font-semibold text-white text-right">{activeAlarmLabel}</p>
            </div>
            <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-mobile-text-muted">{t('healthHub.deviceHealth.lockState')}</p>
              <p className="text-sm font-semibold text-white text-right">{lockLabel}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
          <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.deviceHealth.support')}</p>
          <p className="text-xs text-mobile-text-muted mt-2">{t('healthHub.deviceHealth.supportHint')}</p>
          <button
            onClick={handleCopyDebugBundle}
            className="mt-3 w-full rounded-xl bg-mobile-primary/15 text-mobile-primary border border-mobile-primary/25 px-3 py-3 text-sm font-bold hover:bg-mobile-primary/20 transition-colors"
          >
            {t('healthHub.deviceHealth.copyDebugBundle')}
          </button>
        </div>
      </main>
    </div>
  );
};

export default MobileDeviceHealth;
