import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { HydraulicLockLevel, HydraulicLockReason } from '../types/firmware_structs';
import { motion } from 'framer-motion';

const HydraulicStatusWidget: React.FC = () => {
  const { hydraulicStatus, connectionState } = useAppStore();

  if (connectionState !== 'connected') return null;

  // Default state if no data yet (or not supported by FW)
  // If null, we might want to hide it or show "Loading..." 
  // For now, if null, we assume "Unknown" or hide if strictly required.
  // But let's show a placeholder if we expect it.
  
  if (!hydraulicStatus) {
    // If firmware doesn't support it, maybe we shouldn't show it?
    // Or show "Hydraulic Monitoring: Not Available"
    return null;
  }

  const {
    global_lock_level,
    global_lock_reason,
    last_anomaly_epoch,
    monitoring_enabled
  } = hydraulicStatus;

  const isOk = global_lock_level === HydraulicLockLevel.NONE;
  const isSoftLock = global_lock_level === HydraulicLockLevel.SOFT;
  const isHardLock = global_lock_level === HydraulicLockLevel.HARD;

  let statusColor = 'text-green-400';
  let bgColor = 'bg-green-500/10';
  let borderColor = 'border-green-500/20';
  let icon = 'check_circle';
  let statusText = 'System Nominal';
  let subText = 'Flow monitoring active';

  if (!monitoring_enabled) {
    statusColor = 'text-mobile-text-muted';
    bgColor = 'bg-mobile-surface-dark';
    borderColor = 'border-mobile-border-dark';
    icon = 'security';
    statusText = 'Monitoring Disabled';
    subText = 'Protection inactive';
  } else if (isHardLock) {
    statusColor = 'text-red-400';
    bgColor = 'bg-red-500/10';
    borderColor = 'border-red-500/20';
    icon = 'error';
    statusText = 'System Locked';
    subText = getLockReasonText(global_lock_reason);
  } else if (isSoftLock) {
    statusColor = 'text-amber-400';
    bgColor = 'bg-amber-500/10';
    borderColor = 'border-amber-500/20';
    icon = 'warning';
    statusText = 'Warning';
    subText = getLockReasonText(global_lock_reason);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${borderColor} ${bgColor} p-4 flex items-center justify-between mb-4`}
    >
      <div className="flex items-center gap-4">
        <div className={`size-12 rounded-full ${bgColor} border ${borderColor} flex items-center justify-center shrink-0`}>
          <span className={`material-symbols-outlined text-2xl ${statusColor}`}>
            {icon}
          </span>
        </div>
        <div>
          <h3 className={`font-bold text-base ${statusColor}`}>
            {statusText}
          </h3>
          <p className="text-xs text-mobile-text-muted">
            {subText}
          </p>
        </div>
      </div>
      
      {(isHardLock || isSoftLock) && (
        <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors">
          View
        </button>
      )}
    </motion.div>
  );
};

function getLockReasonText(reason: HydraulicLockReason): string {
  switch (reason) {
    case HydraulicLockReason.HIGH_FLOW: return 'High flow detected';
    case HydraulicLockReason.NO_FLOW: return 'No flow detected';
    case HydraulicLockReason.UNEXPECTED: return 'Unexpected flow';
    case HydraulicLockReason.MAINLINE_LEAK: return 'Mainline leak';
    case HydraulicLockReason.NONE: return 'All clear';
    default: return 'Unknown anomaly';
  }
}

export default HydraulicStatusWidget;
