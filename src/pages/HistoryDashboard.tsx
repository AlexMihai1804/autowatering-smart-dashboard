/**
 * History Dashboard Page
 * 
 * Unified history view with:
 * - Date range picker
 * - Channel filters
 * - Interactive Recharts visualizations
 * - Statistics cards with trends
 * - Pull-to-refresh functionality
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    IonContent, IonPage, IonToast, IonRefresher, IonRefresherContent,
    IonSegment, IonSegmentButton, IonLabel, IonIcon, IonButton, IonSpinner,
    IonChip
} from '@ionic/react';
import { RefresherEventDetail } from '@ionic/core';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    water, thermometer, rainy, statsChart, 
    refreshCircle, timeOutline, calendarOutline,
    trendingUp, trendingDown, removeOutline,
    checkmarkCircle, alertCircle, cloudOutline
} from 'ionicons/icons';
import DatePicker from 'react-multi-date-picker';

import { useAppStore } from '../store/useAppStore';
import { 
    HistoryService, 
    getHistoryService,
    HistoryStats,
    EnvStats,
    RainStats,
    AggregatedWateringData,
    AggregatedEnvData,
    AggregatedRainData,
    AggregationPeriod
} from '../services/HistoryService';

import {
    WateringVolumeChart,
    TemperatureHumidityChart,
    RainfallChart,
    ChannelDistributionChart,
    TrendSparkline,
    CHART_COLORS
} from '../components/charts';

// ============================================================================
// Types
// ============================================================================

type ViewTab = 'watering' | 'environment' | 'rain';
type DatePreset = '24h' | '7d' | '30d' | 'custom';

interface DateRange {
    start: Date;
    end: Date;
}

// ============================================================================
// Component
// ============================================================================

const HistoryDashboard: React.FC = () => {
    const { 
        connectionState, 
        zones,
        wateringHistory,
        envHistoryHourly,
        envHistoryDaily,
        rainHistoryHourly,
        rainHistoryDaily,
        statistics
    } = useAppStore();

    // Local state
    const [activeTab, setActiveTab] = useState<ViewTab>('watering');
    const [datePreset, setDatePreset] = useState<DatePreset>('7d');
    const [dateRange, setDateRange] = useState<DateRange>(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return { start, end };
    });
    const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastColor, setToastColor] = useState<string>('dark');
    const [aggregationPeriod, setAggregationPeriod] = useState<AggregationPeriod>('day');

    const isConnected = connectionState === 'connected';
    const historyService = getHistoryService();

    // ========================================================================
    // Data Processing
    // ========================================================================

    // Channel names map
    const channelNames = useMemo(() => {
        const names: { [key: number]: string } = {};
        zones.forEach(z => {
            names[z.channel_id] = z.name || `Zone ${z.channel_id}`;
        });
        return names;
    }, [zones]);

    // Available channels from data
    const availableChannels = useMemo(() => {
        const channels = new Set<number>();
        wateringHistory.forEach(e => channels.add(e.channel_id));
        statistics.forEach((_, ch) => channels.add(ch));
        return Array.from(channels).sort((a, b) => a - b);
    }, [wateringHistory, statistics]);

    // Filtered watering history
    const filteredWateringHistory = useMemo(() => {
        let filtered = wateringHistory;
        
        // Filter by date range
        const startTs = Math.floor(dateRange.start.getTime() / 1000);
        const endTs = Math.floor(dateRange.end.getTime() / 1000);
        filtered = filtered.filter(e => e.timestamp >= startTs && e.timestamp <= endTs);
        
        // Filter by channels
        if (selectedChannels.length > 0) {
            filtered = filtered.filter(e => selectedChannels.includes(e.channel_id));
        }
        
        return filtered;
    }, [wateringHistory, dateRange, selectedChannels]);

    // Aggregated data
    const aggregatedWatering = useMemo(() => {
        return historyService.aggregateWateringByPeriod(filteredWateringHistory, aggregationPeriod);
    }, [filteredWateringHistory, aggregationPeriod]);

    const aggregatedEnv = useMemo(() => {
        return historyService.aggregateEnvByPeriod(envHistoryHourly, aggregationPeriod);
    }, [envHistoryHourly, aggregationPeriod]);

    const aggregatedRain = useMemo(() => {
        return historyService.aggregateRainByPeriod(rainHistoryHourly, aggregationPeriod);
    }, [rainHistoryHourly, aggregationPeriod]);

    // Statistics
    const wateringStats = useMemo(() => {
        return historyService.calculateWateringStats(filteredWateringHistory);
    }, [filteredWateringHistory]);

    const envStats = useMemo(() => {
        return historyService.calculateEnvStats(envHistoryHourly);
    }, [envHistoryHourly]);

    const rainStats = useMemo(() => {
        return historyService.calculateRainStats(rainHistoryHourly, rainHistoryDaily);
    }, [rainHistoryHourly, rainHistoryDaily]);

    // Channel distribution for pie chart
    const channelDistribution = useMemo(() => {
        const distribution: { channelId: number; name: string; volume: number; sessions: number }[] = [];
        
        wateringStats.channelBreakdown.forEach((data, channelId) => {
            distribution.push({
                channelId,
                name: channelNames[channelId] || `Zone ${channelId}`,
                volume: data.volume,
                sessions: data.sessions
            });
        });
        
        return distribution.sort((a, b) => b.volume - a.volume);
    }, [wateringStats, channelNames]);

    // Sparkline data for stats cards
    const volumeSparkline = useMemo(() => {
        return aggregatedWatering.slice(-12).map(d => d.totalVolume);
    }, [aggregatedWatering]);

    const tempSparkline = useMemo(() => {
        return aggregatedEnv.slice(-12).map(d => d.tempAvg);
    }, [aggregatedEnv]);

    const rainSparkline = useMemo(() => {
        return aggregatedRain.slice(-12).map(d => d.totalMm);
    }, [aggregatedRain]);

    // ========================================================================
    // Handlers
    // ========================================================================

    const handleRefresh = async (event?: CustomEvent<RefresherEventDetail>) => {
        if (!isConnected) {
            event?.detail.complete();
            return;
        }

        setLoading(true);
        try {
            await historyService.syncAllHistory();
            showToast('History synced', 'success');
        } catch (error: any) {
            console.error('Failed to sync history:', error);
            showToast(`Sync failed: ${error.message}`, 'danger');
        } finally {
            setLoading(false);
            event?.detail.complete();
        }
    };

    const showToast = (message: string, color: string = 'dark') => {
        setToastMessage(message);
        setToastColor(color);
    };

    const handleDatePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        
        const end = new Date();
        const start = new Date();
        
        switch (preset) {
            case '24h':
                start.setHours(start.getHours() - 24);
                setAggregationPeriod('hour');
                break;
            case '7d':
                start.setDate(start.getDate() - 7);
                setAggregationPeriod('day');
                break;
            case '30d':
                start.setDate(start.getDate() - 30);
                setAggregationPeriod('day');
                break;
            case 'custom':
                // Keep current range
                return;
        }
        
        setDateRange({ start, end });
    };

    const handleChannelToggle = (channelId: number) => {
        setSelectedChannels(prev => {
            if (prev.includes(channelId)) {
                return prev.filter(id => id !== channelId);
            } else {
                return [...prev, channelId];
            }
        });
    };

    const clearChannelFilters = () => {
        setSelectedChannels([]);
    };

    // ========================================================================
    // Load data on mount
    // ========================================================================

    useEffect(() => {
        if (isConnected && wateringHistory.length === 0) {
            handleRefresh();
        }
    }, [isConnected]);

    // ========================================================================
    // Render helpers
    // ========================================================================

    const getTrendIcon = (direction: 'up' | 'down' | 'stable' | 'rising' | 'falling') => {
        switch (direction) {
            case 'up': 
            case 'rising':
                return trendingUp;
            case 'down': 
            case 'falling':
                return trendingDown;
            default: return removeOutline;
        }
    };

    const getTrendColor = (direction: 'up' | 'down' | 'stable' | 'rising' | 'falling', inverse: boolean = false) => {
        if (inverse) {
            switch (direction) {
                case 'up':
                case 'rising': 
                    return 'text-red-400';
                case 'down':
                case 'falling': 
                    return 'text-green-400';
                default: return 'text-gray-400';
            }
        }
        switch (direction) {
            case 'up':
            case 'rising': 
                return 'text-green-400';
            case 'down':
            case 'falling': 
                return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <IonPage>
            <IonContent className="bg-cyber-dark">
                <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
                    <IonRefresherContent />
                </IonRefresher>

                <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
                    {/* Header */}
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6"
                    >
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                                <IonIcon icon={statsChart} className="text-cyan-400" />
                                History Dashboard
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {isConnected ? 'Live data available' : 'Showing cached data'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <IonButton
                                fill="clear"
                                size="small"
                                onClick={() => handleRefresh()}
                                disabled={loading || !isConnected}
                            >
                                {loading ? (
                                    <IonSpinner name="crescent" />
                                ) : (
                                    <IonIcon icon={refreshCircle} />
                                )}
                            </IonButton>
                        </div>
                    </motion.div>

                    {/* Date Range Selector */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-4 mb-6"
                    >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            {/* Preset buttons */}
                            <div className="flex gap-2">
                                {(['24h', '7d', '30d'] as DatePreset[]).map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => handleDatePresetChange(preset)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            datePreset === preset
                                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>

                            {/* Channel filter chips */}
                            {availableChannels.length > 0 && (
                                <div className="flex flex-wrap gap-2 flex-1">
                                    <span className="text-gray-500 text-sm self-center mr-2">Filter:</span>
                                    {availableChannels.map(channelId => (
                                        <IonChip
                                            key={channelId}
                                            onClick={() => handleChannelToggle(channelId)}
                                            outline={!selectedChannels.includes(channelId)}
                                            color={selectedChannels.includes(channelId) ? 'primary' : 'medium'}
                                            className="text-xs"
                                        >
                                            <IonLabel>{channelNames[channelId] || `Z${channelId}`}</IonLabel>
                                        </IonChip>
                                    ))}
                                    {selectedChannels.length > 0 && (
                                        <button
                                            onClick={clearChannelFilters}
                                            className="text-xs text-gray-500 hover:text-gray-300 ml-2"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Statistics Summary Cards */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                    >
                        {/* Total Volume */}
                        <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-800/30 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                                <IonIcon icon={water} className="text-2xl text-cyan-400" />
                                <TrendSparkline 
                                    data={volumeSparkline} 
                                    color={CHART_COLORS.primary}
                                    height={24}
                                    width={60}
                                />
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {wateringStats.totalVolumeMl >= 1000 
                                    ? `${(wateringStats.totalVolumeMl / 1000).toFixed(1)}L`
                                    : `${wateringStats.totalVolumeMl}ml`
                                }
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Total Volume</div>
                            <div className="flex items-center gap-1 mt-2 text-xs">
                                <IonIcon icon={checkmarkCircle} className="text-green-400" />
                                <span className="text-gray-400">{wateringStats.successRate}% success</span>
                            </div>
                        </div>

                        {/* Sessions */}
                        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-800/30 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                                <IonIcon icon={statsChart} className="text-2xl text-green-400" />
                                <span className="text-xs text-gray-500">
                                    {wateringStats.mostActiveHour}:00
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {wateringStats.totalSessions}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Watering Sessions</div>
                            <div className="text-xs text-gray-500 mt-2">
                                ~{wateringStats.avgVolumePerSession >= 1000 
                                    ? `${(wateringStats.avgVolumePerSession / 1000).toFixed(1)}L`
                                    : `${wateringStats.avgVolumePerSession}ml`
                                } avg
                            </div>
                        </div>

                        {/* Temperature */}
                        <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-800/30 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                                <IonIcon icon={thermometer} className="text-2xl text-orange-400" />
                                <TrendSparkline 
                                    data={tempSparkline} 
                                    color={CHART_COLORS.temperature}
                                    height={24}
                                    width={60}
                                />
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {envStats.avgTemperature.toFixed(1)}°C
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Avg Temperature</div>
                            <div className="flex items-center gap-1 mt-2 text-xs">
                                <IonIcon 
                                    icon={getTrendIcon(envStats.tempTrend)} 
                                    className={getTrendColor(envStats.tempTrend, true)}
                                />
                                <span className="text-gray-500">
                                    {envStats.minTemperature.toFixed(0)}° - {envStats.maxTemperature.toFixed(0)}°
                                </span>
                            </div>
                        </div>

                        {/* Rainfall */}
                        <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-800/30 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                                <IonIcon icon={rainy} className="text-2xl text-blue-400" />
                                <TrendSparkline 
                                    data={rainSparkline} 
                                    color={CHART_COLORS.rain}
                                    height={24}
                                    width={60}
                                />
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {rainStats.totalRainfallMm.toFixed(1)}mm
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Total Rainfall</div>
                            <div className="flex items-center gap-1 mt-2 text-xs">
                                <IonIcon icon={cloudOutline} className="text-gray-400" />
                                <span className="text-gray-500">
                                    {rainStats.rainyDays} rainy / {rainStats.dryDays} dry days
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Tab Selector */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6"
                    >
                        <IonSegment 
                            value={activeTab} 
                            onIonChange={e => setActiveTab(e.detail.value as ViewTab)}
                            className="bg-gray-900/60"
                        >
                            <IonSegmentButton value="watering">
                                <IonIcon icon={water} />
                                <IonLabel>Watering</IonLabel>
                            </IonSegmentButton>
                            <IonSegmentButton value="environment">
                                <IonIcon icon={thermometer} />
                                <IonLabel>Environment</IonLabel>
                            </IonSegmentButton>
                            <IonSegmentButton value="rain">
                                <IonIcon icon={rainy} />
                                <IonLabel>Rainfall</IonLabel>
                            </IonSegmentButton>
                        </IonSegment>
                    </motion.div>

                    {/* Charts Area */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Watering Tab */}
                            {activeTab === 'watering' && (
                                <div className="space-y-6">
                                    {/* Volume Chart */}
                                    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                            <IonIcon icon={statsChart} className="text-cyan-400" />
                                            Volume Over Time
                                        </h3>
                                        <WateringVolumeChart 
                                            data={aggregatedWatering}
                                            channelNames={channelNames}
                                            height={300}
                                            stacked={true}
                                        />
                                    </div>

                                    {/* Distribution Chart */}
                                    {channelDistribution.length > 1 && (
                                        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                                            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                                <IonIcon icon={water} className="text-green-400" />
                                                Channel Distribution
                                            </h3>
                                            <div className="relative">
                                                <ChannelDistributionChart 
                                                    data={channelDistribution}
                                                    height={280}
                                                    innerRadius={60}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Sessions List */}
                                    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                            <IonIcon icon={timeOutline} className="text-purple-400" />
                                            Recent Sessions
                                        </h3>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {filteredWateringHistory.slice(0, 10).map((entry, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="flex items-center justify-between bg-gray-800/30 p-3 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            entry.success_status === 1 ? 'bg-green-400' : 'bg-red-400'
                                                        }`} />
                                                        <div>
                                                            <span className="text-white text-sm">
                                                                {channelNames[entry.channel_id] || `Zone ${entry.channel_id}`}
                                                            </span>
                                                            <span className="text-gray-500 text-xs ml-2">
                                                                {new Date(entry.timestamp * 1000).toLocaleString('ro-RO', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-cyan-400 font-medium text-sm">
                                                        {entry.actual_value_ml >= 1000 
                                                            ? `${(entry.actual_value_ml / 1000).toFixed(1)}L`
                                                            : `${entry.actual_value_ml}ml`
                                                        }
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredWateringHistory.length === 0 && (
                                                <div className="text-center py-8 text-gray-500">
                                                    <IonIcon icon={water} className="text-3xl mb-2" />
                                                    <p>No watering sessions in selected period</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Environment Tab */}
                            {activeTab === 'environment' && (
                                <div className="space-y-6">
                                    {/* Temperature & Humidity Chart */}
                                    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                            <IonIcon icon={thermometer} className="text-orange-400" />
                                            Temperature & Humidity
                                        </h3>
                                        <TemperatureHumidityChart 
                                            data={aggregatedEnv.map(d => ({
                                                timestamp: d.timestamp,
                                                tempAvg: d.tempAvg,
                                                tempMin: d.tempMin,
                                                tempMax: d.tempMax,
                                                humidity: d.humidityAvg,
                                                label: d.date.includes('T') 
                                                    ? d.date.split('T')[1] + ':00'
                                                    : new Date(d.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
                                            }))}
                                            height={320}
                                        />
                                    </div>

                                    {/* Env Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-orange-400 text-xl mb-1">
                                                {envStats.minTemperature.toFixed(1)}°C
                                            </div>
                                            <div className="text-gray-500 text-xs">Min Temp</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-orange-400 text-xl mb-1">
                                                {envStats.maxTemperature.toFixed(1)}°C
                                            </div>
                                            <div className="text-gray-500 text-xs">Max Temp</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-blue-400 text-xl mb-1">
                                                {envStats.avgHumidity.toFixed(0)}%
                                            </div>
                                            <div className="text-gray-500 text-xs">Avg Humidity</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-blue-400 text-xl mb-1">
                                                {envStats.minHumidity.toFixed(0)}%
                                            </div>
                                            <div className="text-gray-500 text-xs">Min Humidity</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-blue-400 text-xl mb-1">
                                                {envStats.maxHumidity.toFixed(0)}%
                                            </div>
                                            <div className="text-gray-500 text-xs">Max Humidity</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-purple-400 text-xl mb-1">
                                                {envStats.avgPressure.toFixed(0)} hPa
                                            </div>
                                            <div className="text-gray-500 text-xs">Avg Pressure</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rain Tab */}
                            {activeTab === 'rain' && (
                                <div className="space-y-6">
                                    {/* Rainfall Chart */}
                                    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                            <IonIcon icon={rainy} className="text-blue-400" />
                                            Rainfall History
                                        </h3>
                                        <RainfallChart 
                                            data={aggregatedRain}
                                            height={280}
                                            showAverage={true}
                                        />
                                    </div>

                                    {/* Rain Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-cyan-400 text-xl mb-1">
                                                {rainStats.totalRainfallMm.toFixed(1)} mm
                                            </div>
                                            <div className="text-gray-500 text-xs">Total Rainfall</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-cyan-400 text-xl mb-1">
                                                {rainStats.avgDailyMm.toFixed(1)} mm
                                            </div>
                                            <div className="text-gray-500 text-xs">Daily Average</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-blue-400 text-xl mb-1">
                                                {rainStats.maxHourlyMm.toFixed(1)} mm
                                            </div>
                                            <div className="text-gray-500 text-xs">Max Hourly</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-green-400 text-xl mb-1">
                                                {rainStats.rainyDays}
                                            </div>
                                            <div className="text-gray-500 text-xs">Rainy Days</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-amber-400 text-xl mb-1">
                                                {rainStats.dryDays}
                                            </div>
                                            <div className="text-gray-500 text-xs">Dry Days</div>
                                        </div>
                                        <div className="bg-gray-800/40 rounded-xl p-4 text-center">
                                            <div className="text-red-400 text-xl mb-1">
                                                {rainStats.longestDrySpell}
                                            </div>
                                            <div className="text-gray-500 text-xs">Longest Dry Spell</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <IonToast
                    isOpen={!!toastMessage}
                    onDidDismiss={() => setToastMessage(null)}
                    message={toastMessage || ''}
                    duration={2000}
                    color={toastColor}
                    position="bottom"
                />
            </IonContent>
        </IonPage>
    );
};

export default HistoryDashboard;
