import React, { useState } from 'react';
import { 
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, 
    IonIcon, IonButton, IonSpinner, IonSegment, IonSegmentButton,
    IonLabel
} from '@ionic/react';
import { 
    thermometer, refreshCircle, calendarOutline, trashOutline,
    waterOutline, cloudOutline, trendingUp, trendingDown
} from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';

interface EnvHistoryCardProps {
    onToast?: (message: string, color?: string) => void;
}

const EnvHistoryCard: React.FC<EnvHistoryCardProps> = ({ onToast }) => {
    const { 
        envHistoryDetailed, 
        envHistoryHourly, 
        envHistoryDaily, 
        connectionState,
        envData  // Current live data
    } = useAppStore();
    const bleService = BleService.getInstance();
    
    const [loading, setLoading] = useState(false);
    const [viewType, setViewType] = useState<'live' | 'hourly' | 'daily'>('live');
    
    const isConnected = connectionState === 'connected';

    const handleRefresh = async () => {
        if (!isConnected) return;
        
        setLoading(true);
        try {
            switch (viewType) {
                case 'live':
                    // Just get trends
                    await bleService.getEnvTrends();
                    break;
                case 'hourly':
                    await bleService.getEnvHourlyHistory(24);
                    break;
                case 'daily':
                    await bleService.getEnvDailyHistory(7);
                    break;
            }
            onToast?.('Environmental history loaded', 'success');
        } catch (error: any) {
            console.error('Failed to load env history:', error);
            onToast?.(`Failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!isConnected) return;
        if (!window.confirm('Clear ALL environmental history? This cannot be undone.')) return;
        
        setLoading(true);
        try {
            await bleService.clearEnvHistory();
            onToast?.('History cleared', 'warning');
        } catch (error: any) {
            onToast?.(`Failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
        }
    };

    const formatTemp = (t_x100: number): string => {
        return (t_x100 / 100).toFixed(1);
    };

    const formatHumidity = (h_x100: number): string => {
        return (h_x100 / 100).toFixed(0);
    };

    const formatPressure = (pa: number): string => {
        return (pa / 100).toFixed(0); // Pa to hPa
    };

    // Calculate min/max for charts
    const hourlyTemps = envHistoryHourly.map(e => e.temp_avg_x100);
    const minTemp = Math.min(...hourlyTemps, 0) / 100;
    const maxTemp = Math.max(...hourlyTemps, 4000) / 100;
    const tempRange = maxTemp - minTemp || 40;

    const getTempY = (temp_x100: number): number => {
        const temp = temp_x100 / 100;
        return 100 - ((temp - minTemp) / tempRange * 100);
    };

    if (!isConnected) {
        return null;
    }

    return (
        <IonCard className="bg-gray-900/80 border border-gray-800">
            <IonCardHeader>
                <div className="flex justify-between items-center">
                    <IonCardTitle className="text-white flex items-center gap-2">
                        <IonIcon icon={thermometer} className="text-orange-400" />
                        Environmental History
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
                {/* View Selector */}
                <IonSegment 
                    value={viewType} 
                    onIonChange={e => setViewType(e.detail.value as any)}
                    className="mb-4"
                >
                    <IonSegmentButton value="live">
                        <IonLabel>Current</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="hourly">
                        <IonLabel>24h</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="daily">
                        <IonLabel>7 Days</IonLabel>
                    </IonSegmentButton>
                </IonSegment>

                {viewType === 'live' && (
                    <div className="grid grid-cols-3 gap-4 py-4">
                        {/* Temperature */}
                        <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 p-4 rounded-xl text-center">
                            <IonIcon icon={thermometer} className="text-3xl text-orange-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                                {envData ? envData.temperature.toFixed(1) : '--'}°C
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Temperature</div>
                        </div>
                        
                        {/* Humidity */}
                        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 p-4 rounded-xl text-center">
                            <IonIcon icon={waterOutline} className="text-3xl text-blue-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                                {envData ? envData.humidity.toFixed(0) : '--'}%
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Humidity</div>
                        </div>
                        
                        {/* Pressure */}
                        <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 p-4 rounded-xl text-center">
                            <IonIcon icon={cloudOutline} className="text-3xl text-purple-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                                {envData ? envData.pressure.toFixed(0) : '--'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">hPa</div>
                        </div>
                    </div>
                )}

                {viewType === 'hourly' && (
                    <div>
                        {envHistoryHourly.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <IonIcon icon={calendarOutline} className="text-4xl mb-2" />
                                <p>No hourly data</p>
                                <p className="text-sm">Tap refresh to load</p>
                            </div>
                        ) : (
                            <>
                                {/* Temperature Line Chart (simplified) */}
                                <div className="relative h-32 mb-4 px-2 bg-gray-800/30 rounded-lg">
                                    <svg className="w-full h-full" preserveAspectRatio="none">
                                        {/* Temperature line */}
                                        <polyline
                                            fill="none"
                                            stroke="#f97316"
                                            strokeWidth="2"
                                            points={envHistoryHourly.slice(-24).map((entry, idx, arr) => {
                                                const x = (idx / (arr.length - 1)) * 100;
                                                const y = getTempY(entry.temp_avg_x100);
                                                return `${x}%,${y}%`;
                                            }).join(' ')}
                                        />
                                        {/* Min-Max range area */}
                                        <polygon
                                            fill="rgba(249, 115, 22, 0.1)"
                                            points={[
                                                ...envHistoryHourly.slice(-24).map((entry, idx, arr) => {
                                                    const x = (idx / (arr.length - 1)) * 100;
                                                    const y = getTempY(entry.temp_max_x100);
                                                    return `${x}%,${y}%`;
                                                }),
                                                ...envHistoryHourly.slice(-24).reverse().map((entry, idx, arr) => {
                                                    const x = ((arr.length - 1 - idx) / (arr.length - 1)) * 100;
                                                    const y = getTempY(entry.temp_min_x100);
                                                    return `${x}%,${y}%`;
                                                })
                                            ].join(' ')}
                                        />
                                    </svg>
                                    {/* Y-axis labels */}
                                    <div className="absolute left-0 top-0 text-xs text-orange-400">{maxTemp.toFixed(0)}°</div>
                                    <div className="absolute left-0 bottom-0 text-xs text-orange-400">{minTemp.toFixed(0)}°</div>
                                </div>
                                
                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div>
                                        <span className="text-gray-400">Min:</span>
                                        <span className="text-blue-300 ml-1">
                                            {formatTemp(Math.min(...envHistoryHourly.map(e => e.temp_min_x100)))}°
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Avg:</span>
                                        <span className="text-orange-300 ml-1">
                                            {formatTemp(envHistoryHourly.reduce((s, e) => s + e.temp_avg_x100, 0) / envHistoryHourly.length)}°
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Max:</span>
                                        <span className="text-red-300 ml-1">
                                            {formatTemp(Math.max(...envHistoryHourly.map(e => e.temp_max_x100)))}°
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {viewType === 'daily' && (
                    <div>
                        {envHistoryDaily.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <IonIcon icon={calendarOutline} className="text-4xl mb-2" />
                                <p>No daily data</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {envHistoryDaily.slice(-7).map((entry, idx) => {
                                    // Parse date_code YYYYMMDD
                                    const year = Math.floor(entry.date_code / 10000);
                                    const month = Math.floor((entry.date_code % 10000) / 100);
                                    const day = entry.date_code % 100;
                                    const dateStr = `${day}/${month}`;
                                    
                                    return (
                                        <div key={idx} className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-lg">
                                            <div className="text-gray-400 w-12 text-sm">{dateStr}</div>
                                            <div className="flex-1 flex items-center gap-4">
                                                {/* Temperature range bar */}
                                                <div className="flex items-center gap-1 flex-1">
                                                    <span className="text-blue-300 text-xs w-8">
                                                        {formatTemp(entry.temp_min_x100)}°
                                                    </span>
                                                    <div className="flex-1 h-2 bg-gray-700 rounded-full relative overflow-hidden">
                                                        <div 
                                                            className="absolute h-full bg-gradient-to-r from-blue-400 via-orange-400 to-red-400 rounded-full"
                                                            style={{
                                                                left: `${((entry.temp_min_x100 - minTemp * 100) / (tempRange * 100)) * 100}%`,
                                                                right: `${100 - ((entry.temp_max_x100 - minTemp * 100) / (tempRange * 100)) * 100}%`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-red-300 text-xs w-8">
                                                        {formatTemp(entry.temp_max_x100)}°
                                                    </span>
                                                </div>
                                                
                                                {/* Humidity */}
                                                <div className="text-blue-400 text-sm w-12 text-right">
                                                    {formatHumidity(entry.humidity_avg_x100)}%
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default EnvHistoryCard;
