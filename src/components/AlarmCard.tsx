import React, { useState } from 'react';
import { IonButton, IonIcon, IonSpinner, IonAlert } from '@ionic/react';
import { warning, checkmarkCircle, close, alertCircle, water, flash, thermometer, bluetooth } from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { AlarmCode } from '../types/firmware_structs';

interface AlarmCardProps {
    onToast?: (message: string, color?: string) => void;
}

const AlarmCard: React.FC<AlarmCardProps> = ({ onToast }) => {
    const { alarmStatus, connectionState } = useAppStore();
    const bleService = BleService.getInstance();
    
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const isConnected = connectionState === 'connected';
    const hasAlarm = alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE;

    const getAlarmInfo = (code: number): { name: string; description: string; icon: string; color: string } => {
        switch (code) {
            case AlarmCode.NONE:
                return { 
                    name: 'No Alarm', 
                    description: 'System operating normally',
                    icon: checkmarkCircle,
                    color: 'text-cyber-emerald'
                };
            case AlarmCode.FLOW_SENSOR_FAULT:
                return { 
                    name: 'Flow Sensor Fault', 
                    description: 'No flow detected during watering. Check if water supply is on and sensor is connected.',
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.VALVE_STUCK:
                return { 
                    name: 'Valve Stuck', 
                    description: 'Valve failed to open or close properly. Manual inspection required.',
                    icon: alertCircle,
                    color: 'text-red-500'
                };
            case AlarmCode.COMMUNICATION_ERROR:
                return { 
                    name: 'Communication Error', 
                    description: 'Internal communication failure. Try reconnecting.',
                    icon: bluetooth,
                    color: 'text-orange-500'
                };
            case AlarmCode.LOW_BATTERY:
                return { 
                    name: 'Low Battery', 
                    description: 'Battery level is critically low. Replace or recharge soon.',
                    icon: flash,
                    color: 'text-yellow-500'
                };
            case AlarmCode.SENSOR_OFFLINE:
                return { 
                    name: 'Sensor Offline', 
                    description: 'Environmental sensor not responding. Check BME280 connection.',
                    icon: thermometer,
                    color: 'text-orange-500'
                };
            case AlarmCode.OVER_TEMPERATURE:
                return { 
                    name: 'Over Temperature', 
                    description: 'Device temperature exceeded safe limits. Allow cooling.',
                    icon: thermometer,
                    color: 'text-red-500'
                };
            case AlarmCode.LEAK_DETECTED:
                return { 
                    name: 'Leak Detected', 
                    description: 'Unexpected water flow when all valves are closed. Check for leaks!',
                    icon: water,
                    color: 'text-red-500'
                };
            default:
                return { 
                    name: `Unknown Alarm (${code})`, 
                    description: 'Unrecognized alarm code. Contact support.',
                    icon: warning,
                    color: 'text-gray-500'
                };
        }
    };

    const formatTimestamp = (ts: number): string => {
        if (!ts || ts === 0) return 'Unknown';
        const date = new Date(ts * 1000);
        return date.toLocaleString();
    };

    const handleClearAlarm = async () => {
        if (!isConnected) {
            onToast?.('Not connected', 'danger');
            return;
        }
        
        setLoading(true);
        try {
            await bleService.clearAllAlarms();
            onToast?.('Alarm cleared', 'success');
        } catch (error: any) {
            console.error('Failed to clear alarm:', error);
            onToast?.(`Failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    if (!isConnected) {
        return null;
    }

    // Don't show if no alarms
    if (!hasAlarm) {
        return null;
    }

    const alarmInfo = getAlarmInfo(alarmStatus?.alarm_code || 0);

    return (
        <>
            <div className={`glass-card p-6 mb-6 border-2 ${
                alarmStatus?.alarm_code === AlarmCode.NONE 
                    ? 'border-cyber-emerald/30 bg-cyber-emerald/5' 
                    : 'border-red-500/50 bg-red-500/10 animate-pulse'
            }`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            hasAlarm ? 'bg-red-500/20' : 'bg-cyber-emerald/20'
                        }`}>
                            <IonIcon 
                                icon={alarmInfo.icon} 
                                className={`text-2xl ${alarmInfo.color}`}
                            />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${alarmInfo.color}`}>
                                {alarmInfo.name}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                Code: 0x{(alarmStatus?.alarm_code || 0).toString(16).toUpperCase().padStart(2, '0')}
                                {alarmStatus?.alarm_data ? ` | Data: ${alarmStatus.alarm_data}` : ''}
                            </p>
                        </div>
                    </div>
                    
                    {hasAlarm && (
                        <IonButton
                            fill="outline"
                            color="danger"
                            size="small"
                            onClick={() => setShowConfirm(true)}
                            disabled={loading}
                        >
                            {loading ? <IonSpinner name="crescent" /> : (
                                <>
                                    <IonIcon icon={close} slot="start" />
                                    Clear
                                </>
                            )}
                        </IonButton>
                    )}
                </div>

                <p className="text-gray-300 mb-3">{alarmInfo.description}</p>

                {alarmStatus?.timestamp && alarmStatus.timestamp > 0 && (
                    <div className="text-xs text-gray-500">
                        Occurred: {formatTimestamp(alarmStatus.timestamp)}
                    </div>
                )}
            </div>

            <IonAlert
                isOpen={showConfirm}
                onDidDismiss={() => setShowConfirm(false)}
                header="Clear Alarm"
                message={`Are you sure you want to clear the "${alarmInfo.name}" alarm? Make sure the underlying issue has been resolved.`}
                buttons={[
                    {
                        text: 'Cancel',
                        role: 'cancel',
                    },
                    {
                        text: 'Clear Alarm',
                        role: 'confirm',
                        handler: handleClearAlarm,
                    },
                ]}
            />
        </>
    );
};

export default AlarmCard;
