import React, { useState, useMemo } from 'react';
import { 
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, 
    IonIcon, IonButton, IonSpinner, IonBadge,
    IonList, IonItem, IonLabel
} from '@ionic/react';
import { 
    statsChart, refreshCircle, trashOutline, water, 
    time, checkmarkCircle, alertCircle
} from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { StatisticsData } from '../types/firmware_structs';
import { useI18n } from '../i18n';

interface StatisticsCardProps {
    onToast?: (message: string, color?: string) => void;
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({ onToast }) => {
    const { statistics, zones, connectionState } = useAppStore();
    const bleService = BleService.getInstance();
    const { t, language } = useI18n();
    const locale = language === 'ro' ? 'ro-RO' : 'en-US';
    
    const [loading, setLoading] = useState(false);
    
    const isConnected = connectionState === 'connected';

    // Convert Map to array and sort by channel_id
    const statsArray = useMemo(() => {
        const arr: StatisticsData[] = [];
        statistics.forEach((stats, channelId) => {
            arr.push(stats);
        });
        return arr.sort((a, b) => a.channel_id - b.channel_id);
    }, [statistics]);

    // Calculate totals
    const totals = useMemo(() => {
        let totalVolume = 0;
        let totalSessions = 0;
        let lastWatering = 0;
        
        statsArray.forEach(s => {
            totalVolume += s.total_volume;
            totalSessions += s.count;
            if (s.last_watering > lastWatering) {
                lastWatering = s.last_watering;
            }
        });
        
        return { totalVolume, totalSessions, lastWatering };
    }, [statsArray]);

    const handleRefresh = async () => {
        if (!isConnected) return;
        
        setLoading(true);
        try {
            await bleService.readAllStatistics();
            onToast?.(t('statistics.refreshed'), 'success');
        } catch (error: any) {
            console.error('Failed to refresh statistics:', error);
            onToast?.(t('errors.failedWithReason').replace('{error}', error.message), 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleResetAll = async () => {
        if (!isConnected) return;
        if (!window.confirm(t('statistics.resetAllConfirm'))) return;
        
        setLoading(true);
        try {
            await bleService.resetAllStatistics();
            // Refresh after reset
            await bleService.readAllStatistics();
            onToast?.(t('statistics.resetSuccess'), 'warning');
        } catch (error: any) {
            onToast?.(t('errors.failedWithReason').replace('{error}', error.message), 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleResetChannel = async (channelId: number) => {
        if (!isConnected) return;
        
        setLoading(true);
        try {
            await bleService.resetChannelStatistics(channelId);
            await bleService.readStatistics(channelId);
            onToast?.(t('statistics.channelReset').replace('{channel}', String(channelId)), 'warning');
        } catch (error: any) {
            onToast?.(t('errors.failedWithReason').replace('{error}', error.message), 'danger');
        } finally {
            setLoading(false);
        }
    };

    const formatVolume = (ml: number): string => {
        if (ml >= 1000) {
            return `${(ml / 1000).toFixed(1)}${t('common.litersShort')}`;
        }
        return `${ml}${t('common.mlShort')}`;
    };

    const formatTimestamp = (ts: number): string => {
        if (ts === 0) return t('statistics.never');
        const date = new Date(ts * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours < 1) {
            return t('statistics.timeAgoMinutes').replace('{minutes}', String(Math.round(diffMs / 60000)));
        } else if (diffHours < 24) {
            return t('statistics.timeAgoHours').replace('{hours}', String(Math.round(diffHours)));
        } else if (diffHours < 168) { // 7 days
            return t('statistics.timeAgoDays').replace('{days}', String(Math.round(diffHours / 24)));
        }
        return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
    };

    const getZoneName = (channelId: number): string => {
        const zone = zones.find(z => z.channel_id === channelId);
        return zone?.name || `${t('zones.zone')} ${channelId}`;
    };

    const getZoneColor = (channelId: number): string => {
        const colors = [
            'text-blue-400',
            'text-green-400',
            'text-purple-400',
            'text-orange-400',
            'text-pink-400',
            'text-cyan-400',
            'text-yellow-400',
            'text-red-400'
        ];
        return colors[channelId % colors.length];
    };

    if (!isConnected) {
        return null;
    }

    return (
        <IonCard className="bg-gray-900/80 border border-gray-800">
            <IonCardHeader>
                <div className="flex justify-between items-center">
                    <IonCardTitle className="text-white flex items-center gap-2">
                        <IonIcon icon={statsChart} className="text-green-400" />
                        {t('statistics.title')}
                    </IonCardTitle>
                    <div className="flex gap-2">
                        <IonButton 
                            fill="clear" 
                            size="small" 
                            color="danger"
                            onClick={handleResetAll}
                            disabled={loading}
                            title={t('statistics.resetAllTitle')}
                        >
                            <IonIcon icon={trashOutline} />
                        </IonButton>
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
                </div>
            </IonCardHeader>
            <IonCardContent>
                {/* Overall Totals */}
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div className="bg-blue-900/30 p-3 rounded-xl">
                        <IonIcon icon={water} className="text-2xl text-blue-400 mb-1" />
                        <div className="text-xl font-bold text-white">
                            {formatVolume(totals.totalVolume)}
                        </div>
                        <div className="text-xs text-gray-400">{t('labels.totalVolume')}</div>
                    </div>
                    <div className="bg-green-900/30 p-3 rounded-xl">
                        <IonIcon icon={checkmarkCircle} className="text-2xl text-green-400 mb-1" />
                        <div className="text-xl font-bold text-white">
                            {totals.totalSessions}
                        </div>
                        <div className="text-xs text-gray-400">{t('labels.sessions')}</div>
                    </div>
                    <div className="bg-purple-900/30 p-3 rounded-xl">
                        <IonIcon icon={time} className="text-2xl text-purple-400 mb-1" />
                        <div className="text-sm font-bold text-white">
                            {formatTimestamp(totals.lastWatering)}
                        </div>
                        <div className="text-xs text-gray-400">{t('labels.lastActive')}</div>
                    </div>
                </div>

                {/* Per-Channel Stats */}
                {statsArray.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                        <IonIcon icon={statsChart} className="text-4xl mb-2 opacity-30" />
                        <p>{t('statistics.noData')}</p>
                        <p className="text-sm">{t('statistics.tapRefresh')}</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {statsArray.map((stats) => (
                            <div 
                                key={stats.channel_id} 
                                className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-lg"
                            >
                                {/* Zone indicator */}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-700/50 ${getZoneColor(stats.channel_id)}`}>
                                    <span className="font-bold">Z{stats.channel_id}</span>
                                </div>
                                
                                {/* Zone info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium truncate">
                                        {getZoneName(stats.channel_id)}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {t('statistics.sessionsWithLast')
                                            .replace('{count}', String(stats.count))
                                            .replace('{last}', formatTimestamp(stats.last_watering))}
                                    </div>
                                </div>
                                
                                {/* Volume */}
                                <div className="text-right">
                                    <div className="text-cyber-cyan font-mono text-sm">
                                        {formatVolume(stats.total_volume)}
                                    </div>
                                    {stats.last_volume > 0 && (
                                        <div className="text-xs text-gray-500">
                                            {t('statistics.lastLabel').replace('{value}', formatVolume(stats.last_volume))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Reset button */}
                                <IonButton 
                                    fill="clear" 
                                    size="small"
                                    color="medium"
                                    onClick={() => handleResetChannel(stats.channel_id)}
                                    disabled={loading}
                                >
                                    <IonIcon icon={trashOutline} slot="icon-only" />
                                </IonButton>
                            </div>
                        ))}
                    </div>
                )}

                {/* Volume Distribution Bar */}
                {statsArray.length > 0 && totals.totalVolume > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="text-xs text-gray-400 mb-2">{t('statistics.volumeDistribution')}</div>
                        <div className="flex h-4 rounded-full overflow-hidden bg-gray-800">
                            {statsArray.map((stats) => {
                                const pct = (stats.total_volume / totals.totalVolume) * 100;
                                if (pct < 1) return null;
                                const colors = [
                                    'bg-blue-500',
                                    'bg-green-500',
                                    'bg-purple-500',
                                    'bg-orange-500',
                                    'bg-pink-500',
                                    'bg-cyan-500',
                                    'bg-yellow-500',
                                    'bg-red-500'
                                ];
                                return (
                                    <div 
                                        key={stats.channel_id}
                                        className={`${colors[stats.channel_id % colors.length]} h-full transition-all`}
                                        style={{ width: `${pct}%` }}
                                        title={`${getZoneName(stats.channel_id)}: ${pct.toFixed(1)}${t('common.percent')}`}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            {statsArray.filter(s => s.total_volume > 0).slice(0, 4).map(s => (
                                <span key={s.channel_id}>
                                    Z{s.channel_id}: {Math.round((s.total_volume / totals.totalVolume) * 100)}{t('common.percent')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default StatisticsCard;
