import React, { useState, useEffect } from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonButton, IonSpinner, IonBadge } from '@ionic/react';
import { 
    pulse, flash, thermometer, water, bluetooth, time, 
    warning, checkmarkCircle, refreshCircle, statsChart 
} from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { AlarmCode, SystemStatus, WateringError } from '../types/firmware_structs';

interface DiagnosticsCardProps {
    onToast?: (message: string, color?: string) => void;
}

const WATERING_ERROR_LABELS: Record<number, string> = {
    [WateringError.INVALID_PARAM]: 'Invalid parameter',
    [WateringError.NOT_INITIALIZED]: 'Not initialized',
    [WateringError.HARDWARE]: 'Hardware failure',
    [WateringError.BUSY]: 'Busy',
    [WateringError.QUEUE_FULL]: 'Queue full',
    [WateringError.TIMEOUT]: 'Timeout',
    [WateringError.CONFIG]: 'Configuration error',
    [WateringError.RTC_FAILURE]: 'RTC failure',
    [WateringError.STORAGE]: 'Storage error',
    [WateringError.DATA_CORRUPT]: 'Data corrupt',
    [WateringError.INVALID_DATA]: 'Invalid data',
    [WateringError.BUFFER_FULL]: 'Buffer full',
    [WateringError.NO_MEMORY]: 'No memory'
};

const DiagnosticsCard: React.FC<DiagnosticsCardProps> = ({ onToast }) => {
    const { 
        diagnosticsData, 
        alarmStatus, 
        systemStatus, 
        taskQueue,
        flowSensorData,
        bulkSyncSnapshot,
        connectionState 
    } = useAppStore();
    const bleService = BleService.getInstance();
    
    const [loading, setLoading] = useState(false);
    
    const isConnected = connectionState === 'connected';

    const handleRefresh = async () => {
        if (!isConnected) return;
        
        setLoading(true);
        try {
            await bleService.readDiagnostics();
            await bleService.readAlarmStatus();
            await bleService.readTaskQueue();
            await bleService.readFlowSensor();
            onToast?.('Diagnostics refreshed', 'success');
        } catch (error: any) {
            console.error('Failed to refresh diagnostics:', error);
            onToast?.(`Failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const formatUptime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        return `${days}d ${hours}h`;
    };

    const getValveStatusBits = (bitmask: number): string[] => {
        const active: string[] = [];
        for (let i = 0; i < 8; i++) {
            if (bitmask & (1 << i)) {
                active.push(`Z${i}`);
            }
        }
        return active.length > 0 ? active : ['None'];
    };

    const getSystemStatusColor = (status: SystemStatus): string => {
        switch (status) {
            case SystemStatus.OK: return 'success';
            case SystemStatus.NO_FLOW: 
            case SystemStatus.UNEXPECTED_FLOW: return 'warning';
            case SystemStatus.FAULT:
            case SystemStatus.RTC_ERROR:
            case SystemStatus.LOW_POWER: return 'danger';
            default: return 'medium';
        }
    };

    const getSystemStatusText = (status: SystemStatus): string => {
        switch (status) {
            case SystemStatus.OK: return 'OK';
            case SystemStatus.NO_FLOW: return 'No Flow';
            case SystemStatus.UNEXPECTED_FLOW: return 'Unexpected Flow';
            case SystemStatus.FAULT: return 'Fault';
            case SystemStatus.RTC_ERROR: return 'RTC Error';
            case SystemStatus.LOW_POWER: return 'Low Power';
            default: return 'Unknown';
        }
    };

    const formatLastError = (code: number): string => {
        if (code === 0) return 'None';
        const label = WATERING_ERROR_LABELS[code];
        return label ? `${label} (${code})` : `Code ${code}`;
    };

    if (!isConnected) {
        return null;
    }

    const valveBitmask = diagnosticsData?.valve_status ?? bulkSyncSnapshot?.valve_states;
    const queueCount = taskQueue?.pending_count ?? bulkSyncSnapshot?.pending_task_count;
    const flowText = flowSensorData?.flow_rate_or_pulses !== undefined
        ? `${flowSensorData.flow_rate_or_pulses} pps`
        : bulkSyncSnapshot?.flow_rate_ml_min !== undefined
            ? `${bulkSyncSnapshot.flow_rate_ml_min} ml/min`
            : '--';
    const alarmIsActive = alarmStatus?.alarm_code !== undefined
        ? alarmStatus.alarm_code !== AlarmCode.NONE
        : (bulkSyncSnapshot?.active_alarms ?? 0) > 0;
    const alarmLabel = alarmStatus?.alarm_code !== undefined
        ? (alarmStatus.alarm_code === AlarmCode.NONE ? 'Clear' : `0x${alarmStatus.alarm_code.toString(16).toUpperCase()}`)
        : alarmIsActive ? 'Active' : '--';

    return (
        <IonCard className="bg-gray-900/80 border border-gray-800">
            <IonCardHeader>
                <div className="flex justify-between items-center">
                    <IonCardTitle className="text-white flex items-center gap-2">
                        <IonIcon icon={statsChart} className="text-purple-400" />
                        System Diagnostics
                    </IonCardTitle>
                    <IonButton 
                        fill="clear" 
                        size="small" 
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        {loading ? <IonSpinner name="crescent" /> : (
                            <IonIcon icon={refreshCircle} />
                        )}
                    </IonButton>
                </div>
            </IonCardHeader>
            <IonCardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* System Status */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <IonIcon icon={pulse} className="text-2xl text-cyber-cyan mb-1" />
                        <div className="text-xs text-gray-400 mb-1">Status</div>
                        <IonBadge color={getSystemStatusColor(systemStatus.state)}>
                            {getSystemStatusText(systemStatus.state)}
                        </IonBadge>
                    </div>

                    {/* Uptime */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <IonIcon icon={time} className="text-2xl text-green-400 mb-1" />
                        <div className="text-xs text-gray-400 mb-1">Uptime</div>
                        <div className="text-white font-mono text-sm">
                            {diagnosticsData ? formatUptime(diagnosticsData.uptime) : '--'}
                        </div>
                    </div>

                    {/* Error Count */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <IonIcon icon={warning} className={`text-2xl mb-1 ${
                            (diagnosticsData?.error_count || 0) > 0 ? 'text-red-400' : 'text-gray-500'
                        }`} />
                        <div className="text-xs text-gray-400 mb-1">Errors</div>
                        <div className={`font-mono text-sm ${
                            (diagnosticsData?.error_count || 0) > 0 ? 'text-red-400' : 'text-white'
                        }`}>
                            {diagnosticsData?.error_count ?? '--'}
                        </div>
                    </div>

                    {/* Battery */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <IonIcon icon={flash} className={`text-2xl mb-1 ${
                            diagnosticsData?.battery_level === 0xFF ? 'text-green-400' :
                            (diagnosticsData?.battery_level || 0) < 20 ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                        <div className="text-xs text-gray-400 mb-1">Power</div>
                        <div className="text-white font-mono text-sm">
                            {diagnosticsData?.battery_level === 0xFF ? 'Mains' : 
                             diagnosticsData?.battery_level !== undefined ? `${diagnosticsData.battery_level}%` : '--'}
                        </div>
                    </div>

                    {/* Active Valves */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <IonIcon icon={water} className="text-2xl text-blue-400 mb-1" />
                        <div className="text-xs text-gray-400 mb-1">Active Valves</div>
                        <div className="text-white font-mono text-xs">
                            {valveBitmask !== undefined ? getValveStatusBits(valveBitmask).join(', ') : '--'}
                        </div>
                    </div>

                    {/* Flow Rate */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <IonIcon icon={water} className="text-2xl text-cyan-400 mb-1" />
                        <div className="text-xs text-gray-400 mb-1">Flow</div>
                        <div className="text-white font-mono text-sm">
                            {flowText}
                        </div>
                    </div>

                    {/* Task Queue */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <IonIcon icon={statsChart} className="text-2xl text-purple-400 mb-1" />
                        <div className="text-xs text-gray-400 mb-1">Queue</div>
                        <div className="text-white font-mono text-sm">
                            {queueCount !== undefined ? `${queueCount} pending` : '--'}
                        </div>
                    </div>

                    {/* Alarm Status */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <IonIcon icon={alarmIsActive ? warning : checkmarkCircle} 
                            className={`text-2xl mb-1 ${
                                alarmIsActive ? 'text-red-400 animate-pulse' : 'text-green-400'
                            }`} 
                        />
                        <div className="text-xs text-gray-400 mb-1">Alarm</div>
                        <div className={`font-mono text-xs ${
                            alarmIsActive ? 'text-red-400' : 'text-green-400'
                        }`}>
                            {alarmLabel}
                        </div>
                    </div>
                </div>

                {/* Last Error Details */}
                {diagnosticsData && diagnosticsData.last_error !== 0 && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <IonIcon icon={warning} />
                            <span>Last Error: {formatLastError(diagnosticsData.last_error)}</span>
                        </div>
                    </div>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default DiagnosticsCard;
