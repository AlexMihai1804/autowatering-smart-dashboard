import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import MobileHeader from '../../components/mobile/MobileHeader';
import MobileConfirmModal from '../../components/mobile/MobileConfirmModal';
import { useI18n } from '../../i18n';
import {
  AlarmCode,
  AlarmSeverity,
  AlarmHistoryEntry,
  getAlarmSeverity,
  getAlarmTitle,
  getAffectedChannelFromAlarmData
} from '../../types/firmware_structs';

type ZoneTestState = {
  channelId: number;
  zoneName: string;
  endsAtMs: number;
};

const MobileAlarmHistory: React.FC = () => {
  const history = useHistory();
  const bleService = BleService.getInstance();
  const { t } = useI18n();
  
  const {
    alarmHistory,
    alarmStatus,
    zones,
    connectionState
  } = useAppStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearActiveModal, setShowClearActiveModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const [zoneTest, setZoneTest] = useState<ZoneTestState | null>(null);
  const [zoneTestSecondsLeft, setZoneTestSecondsLeft] = useState(0);
  const zoneTestIntervalRef = useRef<number | null>(null);
  const zoneTestTimeoutRef = useRef<number | null>(null);
  
  const isConnected = connectionState === 'connected';

  const showToast = useCallback(async (text: string) => {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch {
      // no-op on web / missing plugin
    }
  }, []);
  
  // Combine current alarm with history, sorted by timestamp descending
  const allAlarms = useMemo(() => {
    const entries: AlarmHistoryEntry[] = [...alarmHistory];
    
    // Add current active alarm if it exists and isn't already in history
    if (alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE) {
      const exists = entries.some(e => e.timestamp === alarmStatus.timestamp);
      if (!exists) {
        entries.unshift({
          alarm_code: alarmStatus.alarm_code,
          alarm_data: alarmStatus.alarm_data,
          timestamp: alarmStatus.timestamp
        });
      }
    }
    
    // Sort by timestamp descending (newest first)
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [alarmHistory, alarmStatus]);

  const activeAlarm = alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE ? alarmStatus : null;
  const activeAlarmTitle = activeAlarm ? getAlarmTitle(activeAlarm.alarm_code, t) : null;
  const activeChannelId = activeAlarm
    ? getAffectedChannelFromAlarmData(activeAlarm.alarm_code, activeAlarm.alarm_data)
    : undefined;
  const activeChannelValid = activeChannelId !== undefined && activeChannelId >= 0 && activeChannelId <= 7;
  
  const handleRefresh = useCallback(async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      await bleService.readAlarmStatus();
    } catch (error) {
      console.error('Failed to refresh alarm status:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [bleService, isConnected]);
  
  const getZoneName = (channelId: number | undefined): string | null => {
    if (channelId === undefined) return null;
    const zone = zones.find(z => z.channel_id === channelId);
    return zone?.name || `${t('zones.zone')} ${channelId + 1}`;
  };

  const activeZoneName = useMemo(() => {
    if (activeChannelId === undefined) return null;
    return getZoneName(activeChannelId);
  }, [activeChannelId, zones, t]);
  
  const formatTimestamp = (ts: number): string => {
    if (!ts) return t('alarmHistory.time.unknown');
    const date = new Date(ts * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return t('alarmHistory.time.justNow');
    if (diffMins < 60) return t('alarmHistory.time.minutesAgo').replace('{count}', String(diffMins));
    if (diffHours < 24) return t('alarmHistory.time.hoursAgo').replace('{count}', String(diffHours));
    if (diffDays < 7) return t('alarmHistory.time.daysAgo').replace('{count}', String(diffDays));
    
    return date.toLocaleDateString();
  };
  
  const getSeverityStyles = (severity: AlarmSeverity) => {
    switch (severity) {
      case AlarmSeverity.CRITICAL:
        return { bg: 'bg-red-500/20', border: 'border-red-500/40', icon: 'text-red-400' };
      case AlarmSeverity.DANGER:
        return { bg: 'bg-orange-500/20', border: 'border-orange-500/40', icon: 'text-orange-400' };
      case AlarmSeverity.WARNING:
        return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', icon: 'text-yellow-400' };
      default:
        return { bg: 'bg-gray-500/20', border: 'border-gray-500/40', icon: 'text-gray-400' };
    }
  };
  
  const getAlarmIcon = (code: AlarmCode): string => {
    switch (code) {
      case AlarmCode.NO_FLOW:
      case AlarmCode.LOW_FLOW:
        return 'water_drop';
      case AlarmCode.HIGH_FLOW:
      case AlarmCode.UNEXPECTED_FLOW:
      case AlarmCode.MAINLINE_LEAK:
        return 'water_damage';
      case AlarmCode.FREEZE_LOCKOUT:
        return 'ac_unit';
      case AlarmCode.CHANNEL_LOCK:
        return 'lock';
      case AlarmCode.GLOBAL_LOCK:
        return 'lock_reset';
      default:
        return 'warning';
    }
  };

  const clearZoneTestTimers = useCallback(() => {
    if (zoneTestIntervalRef.current !== null) {
      window.clearInterval(zoneTestIntervalRef.current);
      zoneTestIntervalRef.current = null;
    }
    if (zoneTestTimeoutRef.current !== null) {
      window.clearTimeout(zoneTestTimeoutRef.current);
      zoneTestTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearZoneTestTimers();
    if (!zoneTest) return;

    const update = () => {
      const secondsLeft = Math.max(0, Math.ceil((zoneTest.endsAtMs - Date.now()) / 1000));
      setZoneTestSecondsLeft(secondsLeft);
    };

    update();
    zoneTestIntervalRef.current = window.setInterval(update, 250);

    const timeoutMs = Math.max(0, zoneTest.endsAtMs - Date.now());
    zoneTestTimeoutRef.current = window.setTimeout(async () => {
      clearZoneTestTimers();
      try {
        await bleService.stopCurrentWatering();
      } catch (error) {
        console.error('Failed to auto-stop zone test:', error);
      } finally {
        setZoneTest(null);
        await showToast(t('alarmHistory.testZoneCompleted'));
      }
    }, timeoutMs);

    return () => {
      clearZoneTestTimers();
    };
  }, [zoneTest, bleService, clearZoneTestTimers, showToast, t]);

  const stopZoneTestNow = useCallback(async () => {
    clearZoneTestTimers();
    try {
      await bleService.stopCurrentWatering();
      await showToast(t('dashboard.emergencyStopSuccess'));
    } catch (error) {
      console.error('Emergency stop failed:', error);
      await showToast(t('dashboard.emergencyStopFailed'));
    } finally {
      setZoneTest(null);
    }
  }, [bleService, clearZoneTestTimers, showToast, t]);

  const handleTestZone30s = useCallback(async () => {
    if (!isConnected) {
      await showToast(t('errors.notConnected'));
      return;
    }
    if (zoneTest) return;
    if (activeChannelId === undefined || activeChannelId < 0 || activeChannelId > 7) return;

    const zoneName = activeZoneName ?? `${t('zones.zone')} ${activeChannelId + 1}`;
    const endsAtMs = Date.now() + 30_000;

    setZoneTest({ channelId: activeChannelId, zoneName, endsAtMs });

    try {
      // Firmware supports minutes only; we start a 1-minute task and stop it after 30s.
      await bleService.writeValveControl(activeChannelId, 0, 1);
    } catch (error) {
      console.error('Failed to start zone test:', error);
      setZoneTest(null);
      const reason = error instanceof Error ? error.message : String(error);
      await showToast(t('errors.failedWithReason').replace('{error}', reason));
    }
  }, [activeChannelId, activeZoneName, bleService, isConnected, showToast, t, zoneTest]);

  const handleClearActiveAlarm = useCallback(async () => {
    if (!isConnected || !activeAlarm) return;

    setIsClearing(true);
    try {
      await showToast(t('alarmPopup.clearing'));
      await bleService.acknowledgeAlarm(activeAlarm.alarm_code);
      await bleService.readAlarmStatus();
      await showToast(t('alarmPopup.cleared'));
    } catch (error) {
      console.error('Failed to clear active alarm:', error);
      const reason = error instanceof Error ? error.message : String(error);
      await showToast(t('errors.failedWithReason').replace('{error}', reason));
    } finally {
      setIsClearing(false);
      setShowClearActiveModal(false);
    }
  }, [activeAlarm, bleService, isConnected, showToast, t]);

  const handleClearAllAlarms = useCallback(async () => {
    if (!isConnected) return;

    setIsClearing(true);
    try {
      await showToast(t('alarmPopup.clearing'));
      await bleService.clearAllAlarms();
      await bleService.readAlarmStatus();
      await showToast(t('alarmPopup.cleared'));
    } catch (error) {
      console.error('Failed to clear all alarms:', error);
      const reason = error instanceof Error ? error.message : String(error);
      await showToast(t('errors.failedWithReason').replace('{error}', reason));
    } finally {
      setIsClearing(false);
      setShowClearAllModal(false);
    }
  }, [bleService, isConnected, showToast, t]);

  return (
    <div className="min-h-screen bg-mobile-bg flex flex-col">
      <MobileHeader
        title={t('alarmHistory.title')}
        showBackButton
        onBack={() => history.goBack()}
        rightAction={
          <button
            onClick={handleRefresh}
            disabled={!isConnected || isRefreshing}
            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-white ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        }
      />
      
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {/* Active alarm actions */}
        {activeAlarm && (
          <div className="mb-4 rounded-2xl border border-mobile-border-dark bg-mobile-card-dark p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  {t('alarmHistory.active')}
                </p>
                <p className="text-white text-sm font-semibold leading-tight mt-1 truncate">
                  {activeAlarmTitle}
                </p>
                {activeZoneName && (
                  <p className="text-white/50 text-xs mt-1 truncate">
                    {activeZoneName}
                  </p>
                )}
              </div>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                {t('alarmHistory.active')}
              </span>
            </div>

            {activeChannelValid ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={handleTestZone30s}
                  disabled={!isConnected || isClearing || !!zoneTest}
                  className="h-12 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-white text-sm font-semibold disabled:opacity-40"
                >
                  {t('alarmHistory.testZone30s')}
                </button>
                <button
                  onClick={() => setShowClearActiveModal(true)}
                  disabled={!isConnected || isClearing}
                  className="h-12 rounded-xl bg-amber-500/20 hover:bg-amber-500/25 transition-colors text-amber-100 text-sm font-semibold disabled:opacity-40"
                >
                  {t('alarmHistory.clearAlarm')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearActiveModal(true)}
                disabled={!isConnected || isClearing}
                className="mt-4 w-full h-12 rounded-xl bg-amber-500/20 hover:bg-amber-500/25 transition-colors text-amber-100 text-sm font-semibold disabled:opacity-40"
              >
                {t('alarmHistory.clearAlarm')}
              </button>
            )}

            <button
              onClick={() => setShowClearAllModal(true)}
              disabled={!isConnected || isClearing}
              className="mt-3 w-full h-12 rounded-xl bg-red-500/20 hover:bg-red-500/25 transition-colors text-red-100 text-sm font-semibold disabled:opacity-40"
            >
              {t('alarmHistory.clearAll')}
            </button>

            <button
              onClick={() => history.push(`/health/troubleshooting?alarm=${activeAlarm.alarm_code}`)}
              className="mt-3 w-full h-12 rounded-xl bg-mobile-primary/15 hover:bg-mobile-primary/20 transition-colors border border-mobile-primary/25 text-mobile-primary text-sm font-semibold"
            >
              {t('healthHub.troubleshootingCta')}
            </button>
          </div>
        )}

        {allAlarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-cyber-emerald/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-cyber-emerald">
                check_circle
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('alarmHistory.emptyTitle')}
            </h3>
            <p className="text-white/60 text-sm">
              {t('alarmHistory.emptyMessage')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allAlarms.map((alarm, index) => {
              const severity = getAlarmSeverity(alarm.alarm_code);
              const styles = getSeverityStyles(severity);
              const title = getAlarmTitle(alarm.alarm_code, t);
              const channelId = getAffectedChannelFromAlarmData(alarm.alarm_code, alarm.alarm_data);
              const zoneName = getZoneName(channelId);
              const isActive = alarmStatus?.timestamp === alarm.timestamp && alarmStatus?.alarm_code !== AlarmCode.NONE;
              const isCleared = !!alarm.cleared_at;
              
              return (
                <div
                  key={`${alarm.timestamp}-${index}`}
                  className={`flex items-start gap-3 p-4 rounded-2xl border ${styles.bg} ${styles.border} ${isActive ? 'ring-2 ring-white/20' : ''}`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <span className={`material-symbols-outlined text-xl ${styles.icon}`}>
                      {getAlarmIcon(alarm.alarm_code)}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">
                        {title}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-red-500/30 text-red-300 text-xs rounded-full font-medium">
                          {t('alarmHistory.active')}
                        </span>
                      )}
                      {isCleared && (
                        <span className="px-2 py-0.5 bg-green-500/30 text-green-300 text-xs rounded-full font-medium">
                          {t('alarmHistory.cleared')}
                        </span>
                      )}
                    </div>
                    
                    {zoneName && (
                      <p className="text-white/60 text-xs mb-1">
                        {zoneName}
                      </p>
                    )}
                    
                    <p className="text-white/40 text-xs">
                      {formatTimestamp(alarm.timestamp)}
                      {isCleared && alarm.cleared_at && (
                        <span className="ml-2">
                          - {t('alarmHistory.clearedAt').replace('{time}', formatTimestamp(alarm.cleared_at))}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear active alarm confirm */}
      <MobileConfirmModal
        isOpen={showClearActiveModal}
        onClose={() => setShowClearActiveModal(false)}
        onConfirm={handleClearActiveAlarm}
        title={t('alarmCard.clearTitle')}
        message={t('alarmCard.clearConfirmMessage').replace('{alarm}', activeAlarmTitle ?? '')}
        confirmText={t('alarmHistory.clearAlarm')}
        variant="warning"
        icon="warning"
      />

      {/* Clear all alarms confirm */}
      <MobileConfirmModal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        onConfirm={handleClearAllAlarms}
        title={t('alarmHistory.clearAllTitle')}
        message={t('alarmHistory.clearAllConfirmMessage')}
        confirmText={t('alarmHistory.clearAll')}
        variant="danger"
        icon="delete_forever"
        requireConfirmation={t('alarmHistory.clearAllConfirmWord')}
      />

      {/* Zone test modal */}
      {zoneTest && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={(e) => {
            // Don't stop on outside click; force explicit emergency stop.
            e.stopPropagation();
          }}
        >
          <div
            className="relative w-full max-w-[360px] bg-mobile-card-dark rounded-2xl shadow-2xl overflow-hidden border border-mobile-border-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px] text-blue-400">timer</span>
              </div>

              <h2 className="text-white tracking-tight text-2xl font-bold leading-tight">
                {t('alarmHistory.testZoneRunningTitle').replace('{zone}', zoneTest.zoneName)}
              </h2>
              <p className="mt-2 text-mobile-text-muted text-base font-normal leading-relaxed">
                {t('alarmHistory.testZoneRunningMessage')
                  .replace('{seconds}', String(zoneTestSecondsLeft))
                  .replace('{zone}', zoneTest.zoneName)}
              </p>

              <button
                onClick={stopZoneTestNow}
                className="mt-6 w-full h-12 rounded-lg font-bold text-base transition-all bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]"
              >
                {t('alarmHistory.emergencyStop')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAlarmHistory;
