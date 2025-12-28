import React, { useState } from 'react';
import { IonButton, IonIcon, IonSpinner, IonAlert } from '@ionic/react';
import { warning, checkmarkCircle, close, alertCircle, water, thermometer } from 'ionicons/icons';
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
            case AlarmCode.NO_FLOW:
                return { 
                    name: 'No Flow', 
                    description: 'No water flow detected during watering. Check supply, valve, filter, and sensor.',
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.UNEXPECTED_FLOW:
                return { 
                    name: 'Unexpected Flow', 
                    description: 'Flow detected when all valves are closed. Check for leaks.',
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.FREEZE_LOCKOUT:
                return { 
                    name: 'Freeze Protection', 
                    description: 'Freeze protection is active. Watering is temporarily paused.',
                    icon: thermometer,
                    color: 'text-orange-500'
                };
            case AlarmCode.HIGH_FLOW:
                return { 
                    name: 'High Flow', 
                    description: 'Flow exceeded the learned limit. Possible burst/leak.',
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.LOW_FLOW:
                return { 
                    name: 'Low Flow', 
                    description: 'Flow is below the learned limit. Check pressure and filters.',
                    icon: water,
                    color: 'text-yellow-500'
                };
            case AlarmCode.MAINLINE_LEAK:
                return { 
                    name: 'Mainline Leak', 
                    description: 'Static test detected flow with zones off. Check for leaks.',
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.CHANNEL_LOCK:
                return { 
                    name: 'Zone Locked', 
                    description: 'Zone locked after repeated anomalies. Manual intervention required.',
                    icon: alertCircle,
                    color: 'text-red-500'
                };
            case AlarmCode.GLOBAL_LOCK:
                return { 
                    name: 'System Locked', 
                    description: 'System locked due to a critical water anomaly. Check for leaks.',
                    icon: alertCircle,
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
