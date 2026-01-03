import React, { useState } from 'react';
import { IonButton, IonIcon, IonSpinner, IonAlert } from '@ionic/react';
import { warning, checkmarkCircle, close, alertCircle, water, thermometer } from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { AlarmCode } from '../types/firmware_structs';
import { useI18n } from '../i18n';

interface AlarmCardProps {
    onToast?: (message: string, color?: string) => void;
}

const AlarmCard: React.FC<AlarmCardProps> = ({ onToast }) => {
    const { alarmStatus, connectionState } = useAppStore();
    const bleService = BleService.getInstance();
    const { t } = useI18n();
    
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const isConnected = connectionState === 'connected';
    const hasAlarm = alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE;

    const getAlarmInfo = (code: number): { name: string; description: string; icon: string; color: string } => {
        switch (code) {
            case AlarmCode.NONE:
                return { 
                    name: t('alarmCard.names.noAlarm'), 
                    description: t('alarmCard.descriptions.noAlarm'),
                    icon: checkmarkCircle,
                    color: 'text-cyber-emerald'
                };
            case AlarmCode.NO_FLOW:
                return { 
                    name: t('alarmCard.names.noFlow'), 
                    description: t('alarmCard.descriptions.noFlow'),
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.UNEXPECTED_FLOW:
                return { 
                    name: t('alarmCard.names.unexpectedFlow'), 
                    description: t('alarmCard.descriptions.unexpectedFlow'),
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.FREEZE_LOCKOUT:
                return { 
                    name: t('alarmCard.names.freezeProtection'), 
                    description: t('alarmCard.descriptions.freezeProtection'),
                    icon: thermometer,
                    color: 'text-orange-500'
                };
            case AlarmCode.HIGH_FLOW:
                return { 
                    name: t('alarmCard.names.highFlow'), 
                    description: t('alarmCard.descriptions.highFlow'),
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.LOW_FLOW:
                return { 
                    name: t('alarmCard.names.lowFlow'), 
                    description: t('alarmCard.descriptions.lowFlow'),
                    icon: water,
                    color: 'text-yellow-500'
                };
            case AlarmCode.MAINLINE_LEAK:
                return { 
                    name: t('alarmCard.names.mainlineLeak'), 
                    description: t('alarmCard.descriptions.mainlineLeak'),
                    icon: water,
                    color: 'text-red-500'
                };
            case AlarmCode.CHANNEL_LOCK:
                return { 
                    name: t('alarmCard.names.zoneLocked'), 
                    description: t('alarmCard.descriptions.zoneLocked'),
                    icon: alertCircle,
                    color: 'text-red-500'
                };
            case AlarmCode.GLOBAL_LOCK:
                return { 
                    name: t('alarmCard.names.systemLocked'), 
                    description: t('alarmCard.descriptions.systemLocked'),
                    icon: alertCircle,
                    color: 'text-red-500'
                };
            default:
                return { 
                    name: t('alarmCard.names.unknown').replace('{code}', String(code)), 
                    description: t('alarmCard.descriptions.unknown'),
                    icon: warning,
                    color: 'text-gray-500'
                };
        }
    };

    const formatTimestamp = (ts: number): string => {
        if (!ts || ts === 0) return t('labels.unknown');
        const date = new Date(ts * 1000);
        return date.toLocaleString();
    };

    const handleClearAlarm = async () => {
        if (!isConnected) {
            onToast?.(t('errors.notConnected'), 'danger');
            return;
        }
        
        setLoading(true);
        try {
            await bleService.clearAllAlarms();
            onToast?.(t('alarmCard.cleared'), 'success');
        } catch (error: any) {
            console.error('Failed to clear alarm:', error);
            onToast?.(t('errors.failedWithReason').replace('{error}', error.message), 'danger');
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
                                {t('alarmCard.codeLabel')}: 0x{(alarmStatus?.alarm_code || 0).toString(16).toUpperCase().padStart(2, '0')}
                                {alarmStatus?.alarm_data ? ` | ${t('alarmCard.dataLabel')}: ${alarmStatus.alarm_data}` : ''}
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
                                    {t('labels.clear')}
                                </>
                            )}
                        </IonButton>
                    )}
                </div>

                <p className="text-gray-300 mb-3">{alarmInfo.description}</p>

                {alarmStatus?.timestamp && alarmStatus.timestamp > 0 && (
                    <div className="text-xs text-gray-500">
                        {t('alarmCard.occurredLabel')}: {formatTimestamp(alarmStatus.timestamp)}
                    </div>
                )}
            </div>

            <IonAlert
                isOpen={showConfirm}
                onDidDismiss={() => setShowConfirm(false)}
                header={t('alarmCard.clearTitle')}
                message={t('alarmCard.clearConfirmMessage').replace('{alarm}', alarmInfo.name)}
                buttons={[
                    {
                        text: t('common.cancel'),
                        role: 'cancel',
                    },
                    {
                        text: t('alarmCard.clearTitle'),
                        role: 'confirm',
                        handler: handleClearAlarm,
                    },
                ]}
            />
        </>
    );
};

export default AlarmCard;
