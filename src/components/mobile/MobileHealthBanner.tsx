import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useI18n } from '../../i18n';
import {
  AlarmCode,
  AlarmSeverity,
  getAlarmSeverity,
  getAlarmTitle,
  getAffectedChannelFromAlarmData,
  HydraulicLockLevel,
  HydraulicLockReason,
  SystemStatus
} from '../../types/firmware_structs';

type BannerTone = 'ok' | 'warning' | 'danger' | 'critical';

const getTone = (args: {
  hasGlobalLock: boolean;
  globalLockLevel: HydraulicLockLevel;
  hasAlarm: boolean;
  alarmSeverity: AlarmSeverity;
  systemStatus: SystemStatus;
}): BannerTone => {
  if (args.hasGlobalLock && args.globalLockLevel === HydraulicLockLevel.HARD) return 'critical';
  if (args.hasAlarm && args.alarmSeverity === AlarmSeverity.CRITICAL) return 'critical';

  if (args.hasGlobalLock || args.hasAlarm) return 'danger';
  if (args.systemStatus !== SystemStatus.OK) return 'warning';
  return 'ok';
};

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

const MobileHealthBanner: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const { connectionState, systemStatus, alarmStatus, hydraulicStatus, zones } = useAppStore();

  const isConnected = connectionState === 'connected';
  if (!isConnected) return null;

  const hasAlarm = Boolean(alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE);
  const alarmCode = alarmStatus?.alarm_code ?? AlarmCode.NONE;
  const alarmSeverity = getAlarmSeverity(alarmCode);
  const alarmTitle = getAlarmTitle(alarmCode, t);
  const alarmChannelId = getAffectedChannelFromAlarmData(alarmCode, alarmStatus?.alarm_data ?? 0);
  const alarmZoneName =
    alarmChannelId !== undefined
      ? zones.find(z => z.channel_id === alarmChannelId)?.name || `${t('zones.zone')} ${alarmChannelId + 1}`
      : undefined;

  const globalLockLevel = hydraulicStatus?.global_lock_level ?? HydraulicLockLevel.NONE;
  const globalLockReason = hydraulicStatus?.global_lock_reason ?? HydraulicLockReason.NONE;
  const hasGlobalLock = globalLockLevel !== HydraulicLockLevel.NONE;

  const tone = getTone({
    hasGlobalLock,
    globalLockLevel,
    hasAlarm,
    alarmSeverity,
    systemStatus: systemStatus.state
  });

  const banner = useMemo(() => {
    // Priority: global lock > alarm > system status > nominal
    if (hasGlobalLock) {
      const title =
        globalLockLevel === HydraulicLockLevel.HARD
          ? t('hydraulicStatus.systemLocked')
          : t('hydraulicStatus.warning');
      const subtitle = getLockReasonLabel(globalLockReason, t);
      return { icon: 'lock', title, subtitle };
    }

    if (hasAlarm) {
      const subtitle = alarmZoneName ? alarmZoneName : t('alarmHistory.active');
      return { icon: 'warning', title: alarmTitle, subtitle };
    }

    if (systemStatus.state !== SystemStatus.OK) {
      const title = t('healthHub.bannerTitle');
      const subtitle = getSystemStatusLabel(systemStatus.state, t);
      return { icon: 'health_and_safety', title, subtitle };
    }

    return {
      icon: 'health_and_safety',
      title: t('healthHub.bannerTitle'),
      subtitle: t('hydraulicStatus.statusNominal')
    };
  }, [
    alarmTitle,
    alarmZoneName,
    globalLockLevel,
    globalLockReason,
    hasAlarm,
    hasGlobalLock,
    systemStatus.state,
    t
  ]);

  const toneStyles: Record<BannerTone, { bg: string; border: string; iconBg: string; iconColor: string; pill: string }> = {
    ok: {
      bg: 'bg-gradient-to-r from-green-900/35 to-mobile-surface-dark',
      border: 'border-green-800/50',
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-300',
      pill: 'bg-green-900/35 text-green-200 border-green-800/60'
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-900/30 to-mobile-surface-dark',
      border: 'border-yellow-800/50',
      iconBg: 'bg-yellow-500/15',
      iconColor: 'text-yellow-300',
      pill: 'bg-yellow-900/30 text-yellow-200 border-yellow-800/60'
    },
    danger: {
      bg: 'bg-gradient-to-r from-orange-900/35 to-mobile-surface-dark',
      border: 'border-orange-800/55',
      iconBg: 'bg-orange-500/18',
      iconColor: 'text-orange-300',
      pill: 'bg-orange-900/35 text-orange-200 border-orange-800/60'
    },
    critical: {
      bg: 'bg-gradient-to-r from-red-900/40 to-mobile-surface-dark',
      border: 'border-red-800/60',
      iconBg: 'bg-red-500/18',
      iconColor: 'text-red-300',
      pill: 'bg-red-900/40 text-red-200 border-red-800/70'
    }
  };

  const styles = toneStyles[tone];

  return (
    <button
      onClick={() => history.push('/health')}
      className={`w-full flex items-center gap-3 rounded-2xl border ${styles.bg} ${styles.border} px-4 py-3 text-left active:scale-[0.99] transition-transform`}
    >
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${styles.iconBg} shrink-0`}>
        <span className={`material-symbols-outlined text-[24px] ${styles.iconColor}`}>{banner.icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-white leading-tight truncate">{banner.title}</p>
        <p className="text-xs text-mobile-text-muted truncate mt-0.5">{banner.subtitle}</p>
      </div>

      <div className={`shrink-0 px-3 py-1 rounded-full border text-xs font-bold ${styles.pill}`}>
        {tone === 'ok' ? t('common.view') : t('common.fix')}
      </div>
    </button>
  );
};

export default MobileHealthBanner;
