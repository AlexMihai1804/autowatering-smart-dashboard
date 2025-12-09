import React, { useState } from 'react';
import { 
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, 
    IonIcon, IonButton, IonSpinner, IonSegment, IonSegmentButton,
    IonLabel
} from '@ionic/react';
import { 
    rainy, refreshCircle, calendarOutline, trashOutline, 
    analytics, water
} from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';

interface RainHistoryCardProps {
    onToast?: (message: string, color?: string) => void;
}

const RainHistoryCard: React.FC<RainHistoryCardProps> = ({ onToast }) => {
    const { rainHistoryHourly, rainHistoryDaily, connectionState } = useAppStore();
    const bleService = BleService.getInstance();
    
    const [loading, setLoading] = useState(false);
    const [viewType, setViewType] = useState<'hourly' | 'daily' | 'recent'>('recent');
    const [recentTotals, setRecentTotals] = useState<{hour: number, day: number, week: number} | null>(null);
    
    const isConnected = connectionState === 'connected';

    const handleRefresh = async () => {
        if (!isConnected) return;
        
        setLoading(true);
        try {
            switch (viewType) {
                case 'hourly':
                    await bleService.getRainHourlyHistory(24);
                    break;
                case 'daily':
                    await bleService.getRainDailyHistory(7);
                    break;
                case 'recent':
                    await bleService.getRainRecentTotals();
                    break;
            }
            onToast?.('Rain history loaded', 'success');
        } catch (error: any) {
            console.error('Failed to load rain history:', error);
            onToast?.(`Failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!isConnected) return;
        if (!window.confirm('Reset ALL rain history data? This cannot be undone.')) return;
        
        setLoading(true);
        try {
            await bleService.resetRainHistory();
            onToast?.('Rain history cleared', 'warning');
        } catch (error: any) {
            onToast?.(`Failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleCalibrate = async () => {
        if (!isConnected) return;
        if (!window.confirm('Start rain sensor calibration?')) return;
        
        setLoading(true);
        try {
            await bleService.calibrateRainSensor();
            onToast?.('Calibration started', 'success');
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
            hour: '2-digit'
        });
    };

    const formatRainfall = (mm_x100: number): string => {
        return (mm_x100 / 100).toFixed(1);
    };

    // Generate simple bar chart heights from data
    const getBarHeight = (value: number, max: number): number => {
        if (max === 0) return 0;
        return Math.max(4, (value / max) * 100);
    };

    const maxHourlyRain = Math.max(...rainHistoryHourly.map(e => e.rainfall_mm_x100), 1);
    const maxDailyRain = Math.max(...rainHistoryDaily.map(e => e.total_rainfall_mm_x100), 1);

    if (!isConnected) {
        return null;
    }

    return (
        <IonCard className="bg-gray-900/80 border border-gray-800">
            <IonCardHeader>
                <div className="flex justify-between items-center">
                    <IonCardTitle className="text-white flex items-center gap-2">
                        <IonIcon icon={rainy} className="text-blue-400" />
                        Rain History
                    </IonCardTitle>
                    <div className="flex gap-2">
                        <IonButton 
                            fill="clear" 
                            size="small" 
                            color="warning"
                            onClick={handleCalibrate}
                            disabled={loading}
                            title="Calibrate sensor"
                        >
                            <IonIcon icon={analytics} />
                        </IonButton>
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
                {/* View Selector */}
                <IonSegment 
                    value={viewType} 
                    onIonChange={e => setViewType(e.detail.value as any)}
                    className="mb-4"
                >
                    <IonSegmentButton value="recent">
                        <IonLabel>Summary</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="hourly">
                        <IonLabel>Hourly</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="daily">
                        <IonLabel>Daily</IonLabel>
                    </IonSegmentButton>
                </IonSegment>

                {viewType === 'recent' && (
                    <div className="grid grid-cols-3 gap-4 text-center py-6">
                        <div className="bg-blue-900/30 p-4 rounded-xl">
                            <IonIcon icon={water} className="text-3xl text-blue-300 mb-2" />
                            <div className="text-2xl font-bold text-white">
                                {rainHistoryHourly.length > 0 
                                    ? formatRainfall(rainHistoryHourly[rainHistoryHourly.length - 1]?.rainfall_mm_x100 || 0)
                                    : '--'}
                            </div>
                            <div className="text-xs text-gray-400">mm (Last Hour)</div>
                        </div>
                        <div className="bg-blue-900/30 p-4 rounded-xl">
                            <IonIcon icon={water} className="text-3xl text-blue-400 mb-2" />
                            <div className="text-2xl font-bold text-white">
                                {rainHistoryHourly.length > 0 
                                    ? formatRainfall(rainHistoryHourly.slice(-24).reduce((sum, e) => sum + e.rainfall_mm_x100, 0))
                                    : '--'}
                            </div>
                            <div className="text-xs text-gray-400">mm (24 Hours)</div>
                        </div>
                        <div className="bg-blue-900/30 p-4 rounded-xl">
                            <IonIcon icon={water} className="text-3xl text-blue-500 mb-2" />
                            <div className="text-2xl font-bold text-white">
                                {rainHistoryDaily.length > 0 
                                    ? formatRainfall(rainHistoryDaily.reduce((sum, e) => sum + e.total_rainfall_mm_x100, 0))
                                    : '--'}
                            </div>
                            <div className="text-xs text-gray-400">mm (7 Days)</div>
                        </div>
                    </div>
                )}

                {viewType === 'hourly' && (
                    <div>
                        {rainHistoryHourly.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <IonIcon icon={calendarOutline} className="text-4xl mb-2" />
                                <p>No hourly data</p>
                            </div>
                        ) : (
                            <>
                                {/* Simple Bar Chart */}
                                <div className="flex items-end gap-1 h-32 mb-4 px-2">
                                    {rainHistoryHourly.slice(-24).map((entry, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col items-center">
                                            <div 
                                                className="w-full bg-blue-500 rounded-t"
                                                style={{ height: `${getBarHeight(entry.rainfall_mm_x100, maxHourlyRain)}%` }}
                                                title={`${formatRainfall(entry.rainfall_mm_x100)} mm`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 text-center">
                                    Last 24 hours • Max: {formatRainfall(maxHourlyRain)} mm
                                </div>
                            </>
                        )}
                    </div>
                )}

                {viewType === 'daily' && (
                    <div>
                        {rainHistoryDaily.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <IonIcon icon={calendarOutline} className="text-4xl mb-2" />
                                <p>No daily data</p>
                            </div>
                        ) : (
                            <>
                                {/* Daily Bars */}
                                <div className="flex items-end gap-2 h-32 mb-4 px-4">
                                    {rainHistoryDaily.slice(-7).map((entry, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col items-center">
                                            <div 
                                                className="w-full bg-blue-600 rounded-t"
                                                style={{ height: `${getBarHeight(entry.total_rainfall_mm_x100, maxDailyRain)}%` }}
                                            />
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(entry.day_epoch * 1000).toLocaleDateString('ro-RO', { weekday: 'short' })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 text-center">
                                    Last 7 days • Total: {formatRainfall(rainHistoryDaily.reduce((s, e) => s + e.total_rainfall_mm_x100, 0))} mm
                                </div>
                            </>
                        )}
                    </div>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default RainHistoryCard;
