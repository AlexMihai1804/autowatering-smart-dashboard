import React, { useState } from 'react';
import { 
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, 
    IonIcon, IonButton, IonSpinner, IonBadge, IonSegment, IonSegmentButton,
    IonLabel, IonList, IonItem
} from '@ionic/react';
import { 
    time, water, checkmarkCircle, closeCircle, refreshCircle,
    calendarOutline, statsChartOutline, trashOutline
} from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { HistoryDetailedEntry } from '../types/firmware_structs';

interface WateringHistoryCardProps {
    onToast?: (message: string, color?: string) => void;
}

const WateringHistoryCard: React.FC<WateringHistoryCardProps> = ({ onToast }) => {
    const { wateringHistory, connectionState, zones } = useAppStore();
    const bleService = BleService.getInstance();
    
    const [loading, setLoading] = useState(false);
    const [historyType, setHistoryType] = useState<'detailed' | 'daily' | 'monthly'>('detailed');
    
    const isConnected = connectionState === 'connected';

    const handleRefresh = async () => {
        if (!isConnected) return;
        
        setLoading(true);
        try {
            switch (historyType) {
                case 'detailed':
                    await bleService.getDetailedHistory(0xFF, 0, 30);
                    break;
                case 'daily':
                    await bleService.getDailyHistory(0xFF, 0);
                    break;
                case 'monthly':
                    await bleService.getMonthlyHistory(0xFF, 0);
                    break;
            }
            onToast?.('History loaded', 'success');
        } catch (error: any) {
            console.error('Failed to load history:', error);
            onToast?.(`Failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!isConnected) return;
        if (!window.confirm('Clear ALL watering history? This cannot be undone.')) return;
        
        setLoading(true);
        try {
            await bleService.clearWateringHistory();
            onToast?.('History cleared', 'warning');
        } catch (error: any) {
            onToast?.(`Failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (ts: number): string => {
        if (ts === 0) return '--';
        const date = new Date(ts * 1000);
        return date.toLocaleString('ro-RO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getZoneName = (channelId: number): string => {
        const zone = zones.find(z => z.channel_id === channelId);
        return zone?.name || `Zone ${channelId}`;
    };

    const getTriggerText = (trigger: number): string => {
        switch (trigger) {
            case 0: return 'Manual';
            case 1: return 'Schedule';
            case 2: return 'Remote';
            default: return 'Unknown';
        }
    };

    const getEventTypeIcon = (eventType: number, success: number) => {
        if (eventType === 3 || success === 0) {
            return <IonIcon icon={closeCircle} className="text-red-400" />;
        }
        return <IonIcon icon={checkmarkCircle} className="text-green-400" />;
    };

    if (!isConnected) {
        return null;
    }

    return (
        <IonCard className="bg-gray-900/80 border border-gray-800">
            <IonCardHeader>
                <div className="flex justify-between items-center">
                    <IonCardTitle className="text-white flex items-center gap-2">
                        <IonIcon icon={time} className="text-blue-400" />
                        Watering History
                    </IonCardTitle>
                    <div className="flex gap-2">
                        <IonButton 
                            fill="clear" 
                            size="small" 
                            color="danger"
                            onClick={handleClearHistory}
                            disabled={loading}
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
                {/* Type Selector */}
                <IonSegment 
                    value={historyType} 
                    onIonChange={e => setHistoryType(e.detail.value as any)}
                    className="mb-4"
                >
                    <IonSegmentButton value="detailed">
                        <IonLabel>Recent</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="daily">
                        <IonLabel>Daily</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="monthly">
                        <IonLabel>Monthly</IonLabel>
                    </IonSegmentButton>
                </IonSegment>

                {/* History List */}
                {wateringHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <IonIcon icon={calendarOutline} className="text-4xl mb-2" />
                        <p>No history data</p>
                        <p className="text-sm">Tap refresh to load</p>
                    </div>
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        <IonList className="bg-transparent">
                            {wateringHistory.slice(0, 20).map((entry, idx) => (
                                <IonItem key={idx} className="bg-gray-800/30 mb-2 rounded-lg" lines="none">
                                    <div className="flex items-center gap-3 py-2 w-full">
                                        {getEventTypeIcon(entry.event_type, entry.success_status)}
                                        <div className="flex-1">
                                            <div className="text-white font-medium">
                                                {getZoneName(entry.channel_id)}
                                            </div>
                                            <div className="text-gray-400 text-xs">
                                                {formatTimestamp(entry.timestamp)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-cyber-cyan font-mono text-sm">
                                                {entry.actual_value_ml} ml
                                            </div>
                                            <IonBadge color={entry.trigger_type === 1 ? 'primary' : 'medium'} className="text-xs">
                                                {getTriggerText(entry.trigger_type)}
                                            </IonBadge>
                                        </div>
                                    </div>
                                </IonItem>
                            ))}
                        </IonList>
                    </div>
                )}

                {/* Summary Stats */}
                {wateringHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {wateringHistory.length}
                            </div>
                            <div className="text-xs text-gray-400">Sessions</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-cyber-cyan">
                                {(wateringHistory.reduce((sum, e) => sum + e.actual_value_ml, 0) / 1000).toFixed(1)}L
                            </div>
                            <div className="text-xs text-gray-400">Total Volume</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-400">
                                {Math.round(wateringHistory.filter(e => e.success_status === 1).length / wateringHistory.length * 100)}%
                            </div>
                            <div className="text-xs text-gray-400">Success Rate</div>
                        </div>
                    </div>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default WateringHistoryCard;
