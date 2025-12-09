/**
 * History Service
 * 
 * Centralized service for managing history data with:
 * - Local persistence using IndexedDB (via localforage)
 * - Data fetching from BLE device
 * - Aggregation and statistics calculation
 * - Trend analysis
 */

import localforage from 'localforage';
import { BleService } from './BleService';
import {
    HistoryDetailedEntry,
    HistoryDailyEntry,
    HistoryMonthlyEntry,
    RainHourlyEntry,
    RainDailyEntry,
    EnvDetailedEntry,
    EnvHourlyEntry,
    EnvDailyEntry,
    StatisticsData
} from '../types/firmware_structs';

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
    start: Date;
    end: Date;
}

export interface CacheMetadata {
    lastSync: number;           // Unix timestamp
    recordCount: number;
    oldestRecord: number;       // Unix timestamp
    newestRecord: number;       // Unix timestamp
}

export interface HistoryStats {
    totalVolumeMl: number;
    totalSessions: number;
    successRate: number;        // 0-100
    avgVolumePerSession: number;
    avgFlowRate: number;        // ml/s
    mostActiveChannel: number;
    mostActiveHour: number;     // 0-23
    channelBreakdown: Map<number, { volume: number; sessions: number }>;
}

export interface EnvStats {
    avgTemperature: number;
    minTemperature: number;
    maxTemperature: number;
    avgHumidity: number;
    minHumidity: number;
    maxHumidity: number;
    avgPressure: number;
    tempTrend: 'rising' | 'falling' | 'stable';
    humidityTrend: 'rising' | 'falling' | 'stable';
}

export interface RainStats {
    totalRainfallMm: number;
    avgDailyMm: number;
    maxHourlyMm: number;
    rainyDays: number;
    dryDays: number;
    longestDrySpell: number;    // days
}

export interface AggregatedWateringData {
    date: string;               // ISO date string
    timestamp: number;
    totalVolume: number;
    sessions: number;
    successRate: number;
    channels: { [key: number]: number }; // channel_id -> volume
}

export interface AggregatedEnvData {
    date: string;
    timestamp: number;
    tempAvg: number;
    tempMin: number;
    tempMax: number;
    humidityAvg: number;
    pressure: number;
}

export interface AggregatedRainData {
    date: string;
    timestamp: number;
    totalMm: number;
    maxHourlyMm: number;
}

export interface TrendData {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    description: string;
}

export type HistoryDataType = 'watering' | 'environment' | 'rain';
export type AggregationPeriod = 'hour' | 'day' | 'week' | 'month';

// ============================================================================
// Cache Store Configuration
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const wateringStore = localforage.createInstance({
    name: 'autowatering-history',
    storeName: 'watering_history',
    description: 'Cached watering history data'
});

const envStore = localforage.createInstance({
    name: 'autowatering-history',
    storeName: 'env_history',
    description: 'Cached environmental history data'
});

const rainStore = localforage.createInstance({
    name: 'autowatering-history',
    storeName: 'rain_history',
    description: 'Cached rain history data'
});

const metadataStore = localforage.createInstance({
    name: 'autowatering-history',
    storeName: 'metadata',
    description: 'Cache metadata and sync info'
});

// ============================================================================
// History Service Class
// ============================================================================

export class HistoryService {
    private static instance: HistoryService | null = null;
    private bleService: BleService;
    private isSyncing: boolean = false;

    private constructor() {
        this.bleService = BleService.getInstance();
    }

    public static getInstance(): HistoryService {
        if (!HistoryService.instance) {
            HistoryService.instance = new HistoryService();
        }
        return HistoryService.instance;
    }

    // ========================================================================
    // Cache Management
    // ========================================================================

    /**
     * Check if cache is valid (within TTL)
     */
    async isCacheValid(dataType: HistoryDataType): Promise<boolean> {
        try {
            const metadata = await metadataStore.getItem<CacheMetadata>(`${dataType}_meta`);
            if (!metadata) return false;
            
            const now = Date.now();
            return (now - metadata.lastSync) < CACHE_TTL_MS;
        } catch {
            return false;
        }
    }

    /**
     * Get cache metadata
     */
    async getCacheMetadata(dataType: HistoryDataType): Promise<CacheMetadata | null> {
        try {
            return await metadataStore.getItem<CacheMetadata>(`${dataType}_meta`);
        } catch {
            return null;
        }
    }

    /**
     * Save cache metadata
     */
    private async saveCacheMetadata(dataType: HistoryDataType, records: any[]): Promise<void> {
        const timestamps = records
            .map(r => r.timestamp || r.hour_epoch || r.day_epoch || 0)
            .filter(t => t > 0);
        
        const metadata: CacheMetadata = {
            lastSync: Date.now(),
            recordCount: records.length,
            oldestRecord: timestamps.length > 0 ? Math.min(...timestamps) : 0,
            newestRecord: timestamps.length > 0 ? Math.max(...timestamps) : 0
        };
        
        await metadataStore.setItem(`${dataType}_meta`, metadata);
    }

    /**
     * Clear all cached data
     */
    async clearCache(): Promise<void> {
        await Promise.all([
            wateringStore.clear(),
            envStore.clear(),
            rainStore.clear(),
            metadataStore.clear()
        ]);
        console.log('[HistoryService] Cache cleared');
    }

    // ========================================================================
    // Watering History
    // ========================================================================

    /**
     * Fetch watering history from device and cache
     */
    async fetchWateringHistory(
        channels?: number[],
        limit: number = 100
    ): Promise<HistoryDetailedEntry[]> {
        this.isSyncing = true;
        
        try {
            const channelId = channels && channels.length === 1 ? channels[0] : 0xFF;
            await this.bleService.getDetailedHistory(channelId, 0, limit);
            
            // Get from store (BleService updates useAppStore)
            const { useAppStore } = await import('../store/useAppStore');
            let entries = useAppStore.getState().wateringHistory;
            
            // Filter by channels if specified
            if (channels && channels.length > 0) {
                entries = entries.filter(e => channels.includes(e.channel_id));
            }
            
            // Cache the data
            await wateringStore.setItem('detailed', entries);
            await this.saveCacheMetadata('watering', entries);
            
            return entries;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get watering history from cache
     */
    async getWateringHistoryFromCache(): Promise<HistoryDetailedEntry[]> {
        try {
            const cached = await wateringStore.getItem<HistoryDetailedEntry[]>('detailed');
            return cached || [];
        } catch {
            return [];
        }
    }

    /**
     * Get watering history (cache first, then fetch if needed)
     */
    async getWateringHistory(
        channels?: number[],
        forceRefresh: boolean = false
    ): Promise<HistoryDetailedEntry[]> {
        if (!forceRefresh && await this.isCacheValid('watering')) {
            let cached = await this.getWateringHistoryFromCache();
            if (channels && channels.length > 0) {
                cached = cached.filter(e => channels.includes(e.channel_id));
            }
            if (cached.length > 0) return cached;
        }
        
        return this.fetchWateringHistory(channels);
    }

    // ========================================================================
    // Environmental History
    // ========================================================================

    /**
     * Fetch environmental history from device
     */
    async fetchEnvHistory(hours: number = 24): Promise<EnvHourlyEntry[]> {
        this.isSyncing = true;
        
        try {
            await this.bleService.getEnvHourlyHistory(hours);
            
            const { useAppStore } = await import('../store/useAppStore');
            const entries = useAppStore.getState().envHistoryHourly;
            
            await envStore.setItem('hourly', entries);
            await this.saveCacheMetadata('environment', entries);
            
            return entries;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Fetch daily environmental history
     */
    async fetchEnvDailyHistory(days: number = 7): Promise<EnvDailyEntry[]> {
        this.isSyncing = true;
        
        try {
            await this.bleService.getEnvDailyHistory(days);
            
            const { useAppStore } = await import('../store/useAppStore');
            const entries = useAppStore.getState().envHistoryDaily;
            
            await envStore.setItem('daily', entries);
            
            return entries;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get env history from cache
     */
    async getEnvHistoryFromCache(): Promise<{ hourly: EnvHourlyEntry[]; daily: EnvDailyEntry[] }> {
        try {
            const hourly = await envStore.getItem<EnvHourlyEntry[]>('hourly') || [];
            const daily = await envStore.getItem<EnvDailyEntry[]>('daily') || [];
            return { hourly, daily };
        } catch {
            return { hourly: [], daily: [] };
        }
    }

    /**
     * Get env history (cache first)
     */
    async getEnvHistory(forceRefresh: boolean = false): Promise<{ hourly: EnvHourlyEntry[]; daily: EnvDailyEntry[] }> {
        if (!forceRefresh && await this.isCacheValid('environment')) {
            const cached = await this.getEnvHistoryFromCache();
            if (cached.hourly.length > 0 || cached.daily.length > 0) {
                return cached;
            }
        }
        
        const [hourly, daily] = await Promise.all([
            this.fetchEnvHistory(24),
            this.fetchEnvDailyHistory(7)
        ]);
        
        return { hourly, daily };
    }

    // ========================================================================
    // Rain History
    // ========================================================================

    /**
     * Fetch rain history from device
     */
    async fetchRainHistory(): Promise<{ hourly: RainHourlyEntry[]; daily: RainDailyEntry[] }> {
        this.isSyncing = true;
        
        try {
            await Promise.all([
                this.bleService.getRainHourlyHistory(24),
                this.bleService.getRainDailyHistory(7)
            ]);
            
            const { useAppStore } = await import('../store/useAppStore');
            const state = useAppStore.getState();
            
            await rainStore.setItem('hourly', state.rainHistoryHourly);
            await rainStore.setItem('daily', state.rainHistoryDaily);
            await this.saveCacheMetadata('rain', state.rainHistoryDaily);
            
            return {
                hourly: state.rainHistoryHourly,
                daily: state.rainHistoryDaily
            };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get rain history from cache
     */
    async getRainHistoryFromCache(): Promise<{ hourly: RainHourlyEntry[]; daily: RainDailyEntry[] }> {
        try {
            const hourly = await rainStore.getItem<RainHourlyEntry[]>('hourly') || [];
            const daily = await rainStore.getItem<RainDailyEntry[]>('daily') || [];
            return { hourly, daily };
        } catch {
            return { hourly: [], daily: [] };
        }
    }

    /**
     * Get rain history (cache first)
     */
    async getRainHistory(forceRefresh: boolean = false): Promise<{ hourly: RainHourlyEntry[]; daily: RainDailyEntry[] }> {
        if (!forceRefresh && await this.isCacheValid('rain')) {
            const cached = await this.getRainHistoryFromCache();
            if (cached.hourly.length > 0 || cached.daily.length > 0) {
                return cached;
            }
        }
        
        return this.fetchRainHistory();
    }

    // ========================================================================
    // Aggregation Functions
    // ========================================================================

    /**
     * Aggregate watering history by period
     */
    aggregateWateringByPeriod(
        entries: HistoryDetailedEntry[],
        period: AggregationPeriod
    ): AggregatedWateringData[] {
        if (entries.length === 0) return [];

        const groups = new Map<string, HistoryDetailedEntry[]>();
        
        entries.forEach(entry => {
            const date = new Date(entry.timestamp * 1000);
            let key: string;
            
            switch (period) {
                case 'hour':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
                    break;
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
            }
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(entry);
        });

        const result: AggregatedWateringData[] = [];
        
        groups.forEach((groupEntries, key) => {
            const totalVolume = groupEntries.reduce((sum, e) => sum + e.actual_value_ml, 0);
            const successCount = groupEntries.filter(e => e.success_status === 1).length;
            
            const channels: { [key: number]: number } = {};
            groupEntries.forEach(e => {
                channels[e.channel_id] = (channels[e.channel_id] || 0) + e.actual_value_ml;
            });
            
            result.push({
                date: key,
                timestamp: groupEntries[0].timestamp,
                totalVolume,
                sessions: groupEntries.length,
                successRate: Math.round((successCount / groupEntries.length) * 100),
                channels
            });
        });

        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Aggregate env history by period
     */
    aggregateEnvByPeriod(
        entries: EnvHourlyEntry[],
        period: AggregationPeriod
    ): AggregatedEnvData[] {
        if (entries.length === 0) return [];

        const groups = new Map<string, EnvHourlyEntry[]>();
        
        entries.forEach(entry => {
            const date = new Date(entry.timestamp * 1000);
            let key: string;
            
            switch (period) {
                case 'hour':
                    key = `${date.toISOString().split('T')[0]}T${String(date.getHours()).padStart(2, '0')}`;
                    break;
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
            }
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(entry);
        });

        const result: AggregatedEnvData[] = [];
        
        groups.forEach((groupEntries, key) => {
            const tempAvg = groupEntries.reduce((sum, e) => sum + e.temp_avg_x100, 0) / groupEntries.length / 100;
            const tempMin = Math.min(...groupEntries.map(e => e.temp_min_x100)) / 100;
            const tempMax = Math.max(...groupEntries.map(e => e.temp_max_x100)) / 100;
            const humidityAvg = groupEntries.reduce((sum, e) => sum + e.humidity_avg_x100, 0) / groupEntries.length / 100;
            const pressure = groupEntries.reduce((sum, e) => sum + e.pressure_avg_pa, 0) / groupEntries.length / 100;
            
            result.push({
                date: key,
                timestamp: groupEntries[0].timestamp,
                tempAvg,
                tempMin,
                tempMax,
                humidityAvg,
                pressure
            });
        });

        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Aggregate rain history by period
     */
    aggregateRainByPeriod(
        entries: RainHourlyEntry[],
        period: AggregationPeriod
    ): AggregatedRainData[] {
        if (entries.length === 0) return [];

        const groups = new Map<string, RainHourlyEntry[]>();
        
        entries.forEach(entry => {
            const date = new Date(entry.hour_epoch * 1000);
            let key: string;
            
            switch (period) {
                case 'hour':
                    key = `${date.toISOString().split('T')[0]}T${String(date.getHours()).padStart(2, '0')}`;
                    break;
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
            }
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(entry);
        });

        const result: AggregatedRainData[] = [];
        
        groups.forEach((groupEntries, key) => {
            const totalMm = groupEntries.reduce((sum, e) => sum + e.rainfall_mm_x100, 0) / 100;
            const maxHourlyMm = Math.max(...groupEntries.map(e => e.rainfall_mm_x100)) / 100;
            
            result.push({
                date: key,
                timestamp: groupEntries[0].hour_epoch,
                totalMm,
                maxHourlyMm
            });
        });

        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    // ========================================================================
    // Statistics Calculation
    // ========================================================================

    /**
     * Calculate watering statistics
     */
    calculateWateringStats(entries: HistoryDetailedEntry[]): HistoryStats {
        if (entries.length === 0) {
            return {
                totalVolumeMl: 0,
                totalSessions: 0,
                successRate: 0,
                avgVolumePerSession: 0,
                avgFlowRate: 0,
                mostActiveChannel: 0,
                mostActiveHour: 0,
                channelBreakdown: new Map()
            };
        }

        const totalVolumeMl = entries.reduce((sum, e) => sum + e.actual_value_ml, 0);
        const successCount = entries.filter(e => e.success_status === 1).length;
        const totalFlowRate = entries.reduce((sum, e) => sum + e.flow_rate_avg, 0);

        // Channel breakdown
        const channelBreakdown = new Map<number, { volume: number; sessions: number }>();
        entries.forEach(e => {
            const current = channelBreakdown.get(e.channel_id) || { volume: 0, sessions: 0 };
            current.volume += e.actual_value_ml;
            current.sessions += 1;
            channelBreakdown.set(e.channel_id, current);
        });

        // Find most active channel
        let mostActiveChannel = 0;
        let maxChannelVolume = 0;
        channelBreakdown.forEach((data, channelId) => {
            if (data.volume > maxChannelVolume) {
                maxChannelVolume = data.volume;
                mostActiveChannel = channelId;
            }
        });

        // Find most active hour
        const hourCounts = new Array(24).fill(0);
        entries.forEach(e => {
            const hour = new Date(e.timestamp * 1000).getHours();
            hourCounts[hour]++;
        });
        const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));

        return {
            totalVolumeMl,
            totalSessions: entries.length,
            successRate: Math.round((successCount / entries.length) * 100),
            avgVolumePerSession: Math.round(totalVolumeMl / entries.length),
            avgFlowRate: Math.round(totalFlowRate / entries.length),
            mostActiveChannel,
            mostActiveHour,
            channelBreakdown
        };
    }

    /**
     * Calculate environmental statistics
     */
    calculateEnvStats(entries: EnvHourlyEntry[]): EnvStats {
        if (entries.length === 0) {
            return {
                avgTemperature: 0,
                minTemperature: 0,
                maxTemperature: 0,
                avgHumidity: 0,
                minHumidity: 0,
                maxHumidity: 0,
                avgPressure: 0,
                tempTrend: 'stable',
                humidityTrend: 'stable'
            };
        }

        const temps = entries.map(e => e.temp_avg_x100 / 100);
        const humidities = entries.map(e => e.humidity_avg_x100 / 100);
        const pressures = entries.map(e => e.pressure_avg_pa / 100);

        // Calculate trends (comparing first half to second half)
        const midpoint = Math.floor(entries.length / 2);
        const firstHalfTempAvg = temps.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
        const secondHalfTempAvg = temps.slice(midpoint).reduce((a, b) => a + b, 0) / (entries.length - midpoint);
        const tempDiff = secondHalfTempAvg - firstHalfTempAvg;
        
        const firstHalfHumAvg = humidities.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
        const secondHalfHumAvg = humidities.slice(midpoint).reduce((a, b) => a + b, 0) / (entries.length - midpoint);
        const humDiff = secondHalfHumAvg - firstHalfHumAvg;

        return {
            avgTemperature: temps.reduce((a, b) => a + b, 0) / temps.length,
            minTemperature: Math.min(...entries.map(e => e.temp_min_x100 / 100)),
            maxTemperature: Math.max(...entries.map(e => e.temp_max_x100 / 100)),
            avgHumidity: humidities.reduce((a, b) => a + b, 0) / humidities.length,
            minHumidity: Math.min(...humidities),
            maxHumidity: Math.max(...humidities),
            avgPressure: pressures.reduce((a, b) => a + b, 0) / pressures.length,
            tempTrend: tempDiff > 1 ? 'rising' : tempDiff < -1 ? 'falling' : 'stable',
            humidityTrend: humDiff > 3 ? 'rising' : humDiff < -3 ? 'falling' : 'stable'
        };
    }

    /**
     * Calculate rain statistics
     */
    calculateRainStats(hourly: RainHourlyEntry[], daily: RainDailyEntry[]): RainStats {
        if (daily.length === 0) {
            return {
                totalRainfallMm: 0,
                avgDailyMm: 0,
                maxHourlyMm: 0,
                rainyDays: 0,
                dryDays: 0,
                longestDrySpell: 0
            };
        }

        const totalRainfallMm = daily.reduce((sum, e) => sum + e.total_rainfall_mm_x100, 0) / 100;
        const maxHourlyMm = hourly.length > 0 
            ? Math.max(...hourly.map(e => e.rainfall_mm_x100)) / 100 
            : 0;
        
        const rainyDays = daily.filter(e => e.total_rainfall_mm_x100 > 0).length;
        const dryDays = daily.length - rainyDays;

        // Calculate longest dry spell
        let longestDrySpell = 0;
        let currentDrySpell = 0;
        daily.forEach(e => {
            if (e.total_rainfall_mm_x100 === 0) {
                currentDrySpell++;
                longestDrySpell = Math.max(longestDrySpell, currentDrySpell);
            } else {
                currentDrySpell = 0;
            }
        });

        return {
            totalRainfallMm,
            avgDailyMm: totalRainfallMm / daily.length,
            maxHourlyMm,
            rainyDays,
            dryDays,
            longestDrySpell
        };
    }

    // ========================================================================
    // Trend Calculation
    // ========================================================================

    /**
     * Calculate trend comparing current period to previous period
     */
    calculateTrend(current: number, previous: number, label: string): TrendData {
        if (previous === 0) {
            return {
                direction: current > 0 ? 'up' : 'stable',
                percentage: current > 0 ? 100 : 0,
                description: current > 0 ? `+${label}` : `No change in ${label}`
            };
        }

        const change = ((current - previous) / previous) * 100;
        
        return {
            direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
            percentage: Math.abs(Math.round(change)),
            description: change > 0 
                ? `+${Math.round(change)}% ${label}` 
                : change < 0 
                    ? `${Math.round(change)}% ${label}`
                    : `Stable ${label}`
        };
    }

    // ========================================================================
    // Sync Status
    // ========================================================================

    get syncing(): boolean {
        return this.isSyncing;
    }

    /**
     * Sync all history data from device
     */
    async syncAllHistory(): Promise<void> {
        this.isSyncing = true;
        
        try {
            await Promise.all([
                this.fetchWateringHistory(),
                this.fetchEnvHistory(24),
                this.fetchEnvDailyHistory(7),
                this.fetchRainHistory()
            ]);
            
            console.log('[HistoryService] All history synced');
        } finally {
            this.isSyncing = false;
        }
    }
}

// Singleton accessor
let historyServiceInstance: HistoryService | null = null;

export function getHistoryService(): HistoryService {
    if (!historyServiceInstance) {
        historyServiceInstance = HistoryService.getInstance();
    }
    return historyServiceInstance;
}

export default HistoryService;
