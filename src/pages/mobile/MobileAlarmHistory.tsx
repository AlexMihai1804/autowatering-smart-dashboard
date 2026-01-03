import React, { useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import MobileHeader from '../../components/mobile/MobileHeader';
import { useI18n } from '../../i18n';
import {
  AlarmCode,
  AlarmSeverity,
  AlarmHistoryEntry,
  getAlarmSeverity,
  getAlarmTitle,
  getAffectedChannelFromAlarmData
} from '../../types/firmware_structs';

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
  
  const isConnected = connectionState === 'connected';
  
  // Combine current alarm with history, sorted by timestamp descending
  const allAlarms = React.useMemo(() => {
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
    </div>
  );
};

export default MobileAlarmHistory;
