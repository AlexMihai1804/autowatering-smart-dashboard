import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  AlarmCode,
  AlarmSeverity,
  getAlarmSeverity,
  getAlarmTitle,
  getAffectedChannelFromAlarmData
} from '../../types/firmware_structs';

interface MobileAlarmCardProps {
  onTap?: () => void;
}

const MobileAlarmCard: React.FC<MobileAlarmCardProps> = ({ onTap }) => {
  const { alarmStatus, zones, connectionState } = useAppStore();
  
  const isConnected = connectionState === 'connected';
  const hasAlarm = alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE;
  
  if (!isConnected || !hasAlarm) {
    return null;
  }
  
  const alarmCode = alarmStatus.alarm_code;
  const severity = getAlarmSeverity(alarmCode);
  const title = getAlarmTitle(alarmCode);
  const channelId = getAffectedChannelFromAlarmData(alarmCode, alarmStatus.alarm_data);
  
  // Get zone name if we have a channel ID
  const zoneName = channelId !== undefined 
    ? zones.find(z => z.channel_id === channelId)?.name || `Zone ${channelId + 1}`
    : undefined;
  
  const getSeverityStyles = (sev: AlarmSeverity) => {
    switch (sev) {
      case AlarmSeverity.CRITICAL:
        return {
          bg: 'bg-gradient-to-r from-red-600/30 to-red-500/20',
          border: 'border-red-500/60',
          icon: 'text-red-400',
          text: 'text-red-100',
          pulse: true
        };
      case AlarmSeverity.DANGER:
        return {
          bg: 'bg-gradient-to-r from-orange-600/30 to-orange-500/20',
          border: 'border-orange-500/60',
          icon: 'text-orange-400',
          text: 'text-orange-100',
          pulse: true
        };
      case AlarmSeverity.WARNING:
        return {
          bg: 'bg-gradient-to-r from-yellow-600/25 to-yellow-500/15',
          border: 'border-yellow-500/50',
          icon: 'text-yellow-400',
          text: 'text-yellow-100',
          pulse: false
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-600/30 to-gray-500/20',
          border: 'border-gray-500/50',
          icon: 'text-gray-400',
          text: 'text-gray-100',
          pulse: false
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

  return (
    <button
      onClick={onTap}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border ${styles.bg} ${styles.border} ${styles.pulse ? 'animate-pulse' : ''} transition-all active:scale-[0.98]`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <span className={`material-symbols-outlined text-2xl ${styles.icon}`}>
          {getAlarmIcon(alarmCode)}
        </span>
      </div>
      
      {/* Content */}
      <div className="flex-1 text-left min-w-0">
        <p className={`font-semibold text-sm ${styles.text} truncate`}>
          {title}
        </p>
        {zoneName && (
          <p className="text-xs text-white/60 truncate">
            {zoneName}
          </p>
        )}
      </div>
      
      {/* Chevron */}
      <span className="material-symbols-outlined text-lg text-white/40">
        chevron_right
      </span>
    </button>
  );
};

export default MobileAlarmCard;
