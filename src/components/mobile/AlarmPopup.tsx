import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';
import {
  AlarmCode,
  AlarmSeverity,
  getAlarmSeverity,
  getAlarmTitle,
  getAlarmDescription,
  getAffectedChannelFromAlarmData,
  HydraulicLockLevel
} from '../../types/firmware_structs';

interface AlarmPopupProps {
  onToast?: (message: string, color?: string) => void;
}

const AlarmPopup: React.FC<AlarmPopupProps> = ({ onToast }) => {
  const history = useHistory();
  const bleService = BleService.getInstance();
  const { t } = useI18n();
  
  const {
    alarmStatus,
    hydraulicStatus,
    alarmPopupDismissed,
    lastSeenAlarmTimestamp,
    connectionState,
    zones,
    setAlarmPopupDismissed,
    setLastSeenAlarmTimestamp
  } = useAppStore();
  
  const [isClearing, setIsClearing] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  
  const isConnected = connectionState === 'connected';
  const hasAlarm = alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE;
  const isNewAlarm = hasAlarm && alarmStatus.timestamp > lastSeenAlarmTimestamp;
  const shouldShow = hasAlarm && !alarmPopupDismissed && (isNewAlarm || lastSeenAlarmTimestamp === 0);
  
  // Get alarm details
  const alarmCode = alarmStatus?.alarm_code || AlarmCode.NONE;
  const severity = getAlarmSeverity(alarmCode);
  const title = getAlarmTitle(alarmCode, t);
  const channelId = getAffectedChannelFromAlarmData(alarmCode, alarmStatus?.alarm_data || 0);
  const description = getAlarmDescription(alarmCode, channelId, alarmStatus?.alarm_data, t);
  
  // Get zone name if we have a channel ID
  const zoneName = channelId !== undefined 
    ? zones.find(z => z.channel_id === channelId)?.name || `${t('zones.zone')} ${channelId + 1}`
    : undefined;
  
  // Calculate retry countdown for soft-locked channels
  useEffect(() => {
    if (!hydraulicStatus) return;
    
    const checkRetry = () => {
      const now = Math.floor(Date.now() / 1000);
      const retryAfter = hydraulicStatus.lock_level === HydraulicLockLevel.SOFT 
        ? hydraulicStatus.retry_after_epoch
        : hydraulicStatus.global_lock_level === HydraulicLockLevel.SOFT
          ? hydraulicStatus.global_retry_after_epoch
          : 0;
      
      if (retryAfter > now) {
        setRetryCountdown(retryAfter - now);
      } else {
        setRetryCountdown(null);
      }
    };
    
    checkRetry();
    const interval = setInterval(checkRetry, 1000);
    return () => clearInterval(interval);
  }, [hydraulicStatus]);
  
  // Update last seen timestamp when alarm changes
  useEffect(() => {
    if (hasAlarm && alarmStatus.timestamp > lastSeenAlarmTimestamp) {
      // Don't auto-mark as seen - let user interact
    }
  }, [hasAlarm, alarmStatus?.timestamp, lastSeenAlarmTimestamp]);
  
  const handleDismiss = () => {
    if (alarmStatus) {
      setLastSeenAlarmTimestamp(alarmStatus.timestamp);
    }
    setAlarmPopupDismissed(true);
  };
  
  const handleClearAlarm = async () => {
    if (!isConnected) {
      onToast?.(t('errors.notConnected'), 'danger');
      return;
    }
    
    setIsClearing(true);
    try {
      await bleService.clearAllAlarms();
      setAlarmPopupDismissed(true);
      onToast?.(t('alarmPopup.cleared'), 'success');
    } catch (error: any) {
      console.error('Failed to clear alarm:', error);
      onToast?.(t('errors.failedWithReason').replace('{error}', error.message), 'danger');
    } finally {
      setIsClearing(false);
    }
  };
  
  const handleViewHistory = () => {
    handleDismiss();
    history.push('/alarms');
  };
  
  const formatRetryTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}${t('common.secondsShort')}`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}${t('common.minutesShort')} ${secs}${t('common.secondsShort')}`;
  };
  
  const getSeverityStyles = (sev: AlarmSeverity) => {
    switch (sev) {
      case AlarmSeverity.CRITICAL:
        return {
          bg: 'from-red-900/95 to-red-800/95',
          border: 'border-red-500/50',
          icon: 'bg-red-500/30',
          iconColor: 'text-red-400',
          button: 'bg-red-600 hover:bg-red-500'
        };
      case AlarmSeverity.DANGER:
        return {
          bg: 'from-orange-900/95 to-red-900/95',
          border: 'border-orange-500/50',
          icon: 'bg-orange-500/30',
          iconColor: 'text-orange-400',
          button: 'bg-orange-600 hover:bg-orange-500'
        };
      case AlarmSeverity.WARNING:
        return {
          bg: 'from-yellow-900/95 to-orange-900/95',
          border: 'border-yellow-500/50',
          icon: 'bg-yellow-500/30',
          iconColor: 'text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-500'
        };
      default:
        return {
          bg: 'from-gray-900/95 to-gray-800/95',
          border: 'border-gray-500/50',
          icon: 'bg-gray-500/30',
          iconColor: 'text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-500'
        };
    }
  };
  
  const styles = getSeverityStyles(severity);
  
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
  
  const formatTimestamp = (ts: number): string => {
    if (!ts) return '';
    const date = new Date(ts * 1000);
    return date.toLocaleString();
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          
          {/* Popup */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 z-[105] bg-gradient-to-b ${styles.bg} rounded-t-[2rem] border-t-2 ${styles.border} shadow-2xl overflow-hidden`}
          >
            {/* Handle */}
            <div className="w-full flex justify-center pt-4 pb-2">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>
            
            {/* Content */}
            <div className="px-6 pb-8">
              {/* Icon + Title */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl ${styles.icon} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined text-3xl ${styles.iconColor}`}>
                    {getAlarmIcon(alarmCode)}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{title}</h2>
                  {zoneName && (
                    <p className="text-white/70 text-sm font-medium">{zoneName}</p>
                  )}
                </div>
              </div>
              
              {/* Description */}
              <p className="text-white/80 text-sm leading-relaxed mb-4">
                {description}
              </p>
              
              {/* Retry countdown for soft locks */}
              {retryCountdown !== null && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white/10 rounded-xl">
                  <span className="material-symbols-outlined text-lg text-white/60">schedule</span>
                  <span className="text-white/80 text-sm">
                    {t('alarmPopup.retryIn').replace('{time}', formatRetryTime(retryCountdown))}
                  </span>
                </div>
              )}
              
              {/* Timestamp */}
              {alarmStatus?.timestamp && (
                <p className="text-white/50 text-xs mb-6">
                  {formatTimestamp(alarmStatus.timestamp)}
                </p>
              )}
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-3.5 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
                >
                  {t('alarmPopup.dismiss')}
                </button>
                <button
                  onClick={handleClearAlarm}
                  disabled={isClearing || !isConnected}
                  className={`flex-1 py-3.5 px-4 ${styles.button} rounded-xl text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isClearing ? (
                    <>
                      {t('alarmPopup.clearing')}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      {t('alarmPopup.clearAlarm')}
                    </>
                  )}
                </button>
              </div>
              
              {/* View History Link */}
              <button
                onClick={handleViewHistory}
                className="w-full mt-3 py-2 text-white/60 hover:text-white/80 text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-base">history</span>
                {t('alarmPopup.viewHistory')}
              </button>
            </div>
            
            {/* Safe area spacer */}
            <div className="h-6 w-full" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AlarmPopup;
