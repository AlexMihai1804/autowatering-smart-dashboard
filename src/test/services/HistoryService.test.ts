/**
 * Tests for HistoryService aggregation and statistics functions
 * Tests data aggregation, stats calculation, trend analysis
 */
import { describe, it, expect } from 'vitest';

// Interfaces matching HistoryService
interface HistoryDetailedEntry {
    timestamp: number;
    channel_id: number;
    actual_value_ml: number;
    success_status: number;
    flow_rate_avg: number;
}

interface EnvHourlyEntry {
    timestamp: number;
    temp_avg_x100: number;
    temp_min_x100: number;
    temp_max_x100: number;
    humidity_avg_x100: number;
    pressure_avg_pa: number;
}

interface RainHourlyEntry {
    hour_epoch: number;
    rainfall_mm_x100: number;
}

interface RainDailyEntry {
    day_epoch: number;
    total_rainfall_mm_x100: number;
}

describe('HistoryService Aggregation', () => {
    describe('aggregateWateringByPeriod helper', () => {
        // Extract the key generation logic
        const getAggregationKey = (timestamp: number, period: 'hour' | 'day' | 'week' | 'month'): string => {
            const date = new Date(timestamp * 1000);
            switch (period) {
                case 'hour':
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
                case 'day':
                    return date.toISOString().split('T')[0];
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    return weekStart.toISOString().split('T')[0];
                case 'month':
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
        };

        it('should generate hour key correctly', () => {
            // Jan 15, 2024 14:30:00 UTC
            const ts = 1705329000;
            const key = getAggregationKey(ts, 'hour');
            expect(key).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}$/);
        });

        it('should generate day key correctly', () => {
            const ts = 1705329000;
            const key = getAggregationKey(ts, 'day');
            expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should generate month key correctly', () => {
            const ts = 1705329000;
            const key = getAggregationKey(ts, 'month');
            expect(key).toMatch(/^\d{4}-\d{2}$/);
        });

        it('should pad single digit months', () => {
            // Jan 5, 2024
            const ts = 1704412800;
            const key = getAggregationKey(ts, 'month');
            expect(key).toContain('-01');
        });
    });

    describe('Volume Aggregation', () => {
        const aggregateVolume = (entries: HistoryDetailedEntry[]): number => {
            return entries.reduce((sum, e) => sum + e.actual_value_ml, 0);
        };

        it('should sum all volumes', () => {
            const entries: HistoryDetailedEntry[] = [
                { timestamp: 1000, channel_id: 0, actual_value_ml: 500, success_status: 1, flow_rate_avg: 100 },
                { timestamp: 2000, channel_id: 1, actual_value_ml: 750, success_status: 1, flow_rate_avg: 150 },
                { timestamp: 3000, channel_id: 0, actual_value_ml: 250, success_status: 1, flow_rate_avg: 50 }
            ];
            expect(aggregateVolume(entries)).toBe(1500);
        });

        it('should return 0 for empty array', () => {
            expect(aggregateVolume([])).toBe(0);
        });
    });

    describe('Success Rate Calculation', () => {
        const calculateSuccessRate = (entries: HistoryDetailedEntry[]): number => {
            if (entries.length === 0) return 0;
            const successCount = entries.filter(e => e.success_status === 1).length;
            return Math.round((successCount / entries.length) * 100);
        };

        it('should calculate 100% for all success', () => {
            const entries: HistoryDetailedEntry[] = [
                { timestamp: 1000, channel_id: 0, actual_value_ml: 500, success_status: 1, flow_rate_avg: 100 },
                { timestamp: 2000, channel_id: 0, actual_value_ml: 500, success_status: 1, flow_rate_avg: 100 }
            ];
            expect(calculateSuccessRate(entries)).toBe(100);
        });

        it('should calculate 0% for all failures', () => {
            const entries: HistoryDetailedEntry[] = [
                { timestamp: 1000, channel_id: 0, actual_value_ml: 0, success_status: 0, flow_rate_avg: 0 },
                { timestamp: 2000, channel_id: 0, actual_value_ml: 0, success_status: 0, flow_rate_avg: 0 }
            ];
            expect(calculateSuccessRate(entries)).toBe(0);
        });

        it('should calculate 50% for mixed', () => {
            const entries: HistoryDetailedEntry[] = [
                { timestamp: 1000, channel_id: 0, actual_value_ml: 500, success_status: 1, flow_rate_avg: 100 },
                { timestamp: 2000, channel_id: 0, actual_value_ml: 0, success_status: 0, flow_rate_avg: 0 }
            ];
            expect(calculateSuccessRate(entries)).toBe(50);
        });

        it('should return 0 for empty array', () => {
            expect(calculateSuccessRate([])).toBe(0);
        });
    });

    describe('Channel Breakdown', () => {
        const calculateChannelBreakdown = (entries: HistoryDetailedEntry[]): Map<number, { volume: number; sessions: number }> => {
            const breakdown = new Map<number, { volume: number; sessions: number }>();
            entries.forEach(e => {
                const current = breakdown.get(e.channel_id) || { volume: 0, sessions: 0 };
                current.volume += e.actual_value_ml;
                current.sessions += 1;
                breakdown.set(e.channel_id, current);
            });
            return breakdown;
        };

        it('should group by channel', () => {
            const entries: HistoryDetailedEntry[] = [
                { timestamp: 1000, channel_id: 0, actual_value_ml: 500, success_status: 1, flow_rate_avg: 100 },
                { timestamp: 2000, channel_id: 1, actual_value_ml: 300, success_status: 1, flow_rate_avg: 100 },
                { timestamp: 3000, channel_id: 0, actual_value_ml: 200, success_status: 1, flow_rate_avg: 100 }
            ];
            const breakdown = calculateChannelBreakdown(entries);
            
            expect(breakdown.get(0)?.volume).toBe(700);
            expect(breakdown.get(0)?.sessions).toBe(2);
            expect(breakdown.get(1)?.volume).toBe(300);
            expect(breakdown.get(1)?.sessions).toBe(1);
        });
    });

    describe('Most Active Hour', () => {
        const findMostActiveHour = (entries: HistoryDetailedEntry[]): number => {
            if (entries.length === 0) return 0;
            const hourCounts = new Array(24).fill(0);
            entries.forEach(e => {
                const hour = new Date(e.timestamp * 1000).getHours();
                hourCounts[hour]++;
            });
            return hourCounts.indexOf(Math.max(...hourCounts));
        };

        it('should find the hour with most activity', () => {
            // Create entries where 3 are at the same hour, 1 at different hour
            // Use local time to avoid timezone issues
            const now = new Date();
            now.setMinutes(0, 0, 0);
            const baseTime = now.getTime() / 1000;
            const targetHour = now.getHours();
            
            const entries: HistoryDetailedEntry[] = [
                { timestamp: baseTime, channel_id: 0, actual_value_ml: 100, success_status: 1, flow_rate_avg: 100 },
                { timestamp: baseTime + 60, channel_id: 0, actual_value_ml: 100, success_status: 1, flow_rate_avg: 100 },
                { timestamp: baseTime + 120, channel_id: 0, actual_value_ml: 100, success_status: 1, flow_rate_avg: 100 },
                { timestamp: baseTime - 4 * 3600, channel_id: 0, actual_value_ml: 100, success_status: 1, flow_rate_avg: 100 } // 4 hours earlier
            ];
            const mostActive = findMostActiveHour(entries);
            expect(mostActive).toBe(targetHour);
        });

        it('should return 0 for empty array', () => {
            expect(findMostActiveHour([])).toBe(0);
        });
    });
});

describe('Environmental Statistics', () => {
    describe('Temperature Stats', () => {
        const calculateTempStats = (entries: EnvHourlyEntry[]) => {
            if (entries.length === 0) {
                return { avg: 0, min: 0, max: 0 };
            }
            const temps = entries.map(e => e.temp_avg_x100 / 100);
            return {
                avg: temps.reduce((a, b) => a + b, 0) / temps.length,
                min: Math.min(...entries.map(e => e.temp_min_x100 / 100)),
                max: Math.max(...entries.map(e => e.temp_max_x100 / 100))
            };
        };

        it('should calculate average temperature', () => {
            const entries: EnvHourlyEntry[] = [
                { timestamp: 1000, temp_avg_x100: 2000, temp_min_x100: 1800, temp_max_x100: 2200, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 2000, temp_avg_x100: 2500, temp_min_x100: 2300, temp_max_x100: 2700, humidity_avg_x100: 5500, pressure_avg_pa: 101400 }
            ];
            const stats = calculateTempStats(entries);
            expect(stats.avg).toBe(22.5); // (20 + 25) / 2
        });

        it('should find min/max temperatures', () => {
            const entries: EnvHourlyEntry[] = [
                { timestamp: 1000, temp_avg_x100: 2000, temp_min_x100: 1500, temp_max_x100: 2500, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 2000, temp_avg_x100: 2200, temp_min_x100: 1800, temp_max_x100: 2800, humidity_avg_x100: 5500, pressure_avg_pa: 101400 }
            ];
            const stats = calculateTempStats(entries);
            expect(stats.min).toBe(15);
            expect(stats.max).toBe(28);
        });
    });

    describe('Temperature Trend', () => {
        type Trend = 'rising' | 'falling' | 'stable';

        const calculateTempTrend = (entries: EnvHourlyEntry[]): Trend => {
            if (entries.length < 2) return 'stable';
            const temps = entries.map(e => e.temp_avg_x100 / 100);
            const midpoint = Math.floor(entries.length / 2);
            const firstHalfAvg = temps.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
            const secondHalfAvg = temps.slice(midpoint).reduce((a, b) => a + b, 0) / (entries.length - midpoint);
            const diff = secondHalfAvg - firstHalfAvg;
            return diff > 1 ? 'rising' : diff < -1 ? 'falling' : 'stable';
        };

        it('should detect rising trend', () => {
            const entries: EnvHourlyEntry[] = [
                { timestamp: 1000, temp_avg_x100: 1800, temp_min_x100: 1700, temp_max_x100: 1900, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 2000, temp_avg_x100: 1900, temp_min_x100: 1800, temp_max_x100: 2000, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 3000, temp_avg_x100: 2200, temp_min_x100: 2100, temp_max_x100: 2300, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 4000, temp_avg_x100: 2500, temp_min_x100: 2400, temp_max_x100: 2600, humidity_avg_x100: 5000, pressure_avg_pa: 101325 }
            ];
            expect(calculateTempTrend(entries)).toBe('rising');
        });

        it('should detect falling trend', () => {
            const entries: EnvHourlyEntry[] = [
                { timestamp: 1000, temp_avg_x100: 2500, temp_min_x100: 2400, temp_max_x100: 2600, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 2000, temp_avg_x100: 2400, temp_min_x100: 2300, temp_max_x100: 2500, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 3000, temp_avg_x100: 2000, temp_min_x100: 1900, temp_max_x100: 2100, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 4000, temp_avg_x100: 1800, temp_min_x100: 1700, temp_max_x100: 1900, humidity_avg_x100: 5000, pressure_avg_pa: 101325 }
            ];
            expect(calculateTempTrend(entries)).toBe('falling');
        });

        it('should detect stable trend', () => {
            const entries: EnvHourlyEntry[] = [
                { timestamp: 1000, temp_avg_x100: 2000, temp_min_x100: 1900, temp_max_x100: 2100, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 2000, temp_avg_x100: 2010, temp_min_x100: 1910, temp_max_x100: 2110, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 3000, temp_avg_x100: 2020, temp_min_x100: 1920, temp_max_x100: 2120, humidity_avg_x100: 5000, pressure_avg_pa: 101325 },
                { timestamp: 4000, temp_avg_x100: 2030, temp_min_x100: 1930, temp_max_x100: 2130, humidity_avg_x100: 5000, pressure_avg_pa: 101325 }
            ];
            expect(calculateTempTrend(entries)).toBe('stable');
        });
    });
});

describe('Rain Statistics', () => {
    describe('Total Rainfall', () => {
        const calculateTotalRainfall = (daily: RainDailyEntry[]): number => {
            return daily.reduce((sum, e) => sum + e.total_rainfall_mm_x100, 0) / 100;
        };

        it('should sum daily rainfall', () => {
            const daily: RainDailyEntry[] = [
                { day_epoch: 1000, total_rainfall_mm_x100: 500 },  // 5mm
                { day_epoch: 2000, total_rainfall_mm_x100: 1200 }, // 12mm
                { day_epoch: 3000, total_rainfall_mm_x100: 0 }
            ];
            expect(calculateTotalRainfall(daily)).toBe(17);
        });

        it('should return 0 for empty array', () => {
            expect(calculateTotalRainfall([])).toBe(0);
        });
    });

    describe('Rainy Days Count', () => {
        const countRainyDays = (daily: RainDailyEntry[]): number => {
            return daily.filter(e => e.total_rainfall_mm_x100 > 0).length;
        };

        const countDryDays = (daily: RainDailyEntry[]): number => {
            return daily.filter(e => e.total_rainfall_mm_x100 === 0).length;
        };

        it('should count rainy days', () => {
            const daily: RainDailyEntry[] = [
                { day_epoch: 1000, total_rainfall_mm_x100: 500 },
                { day_epoch: 2000, total_rainfall_mm_x100: 0 },
                { day_epoch: 3000, total_rainfall_mm_x100: 100 }
            ];
            expect(countRainyDays(daily)).toBe(2);
        });

        it('should count dry days', () => {
            const daily: RainDailyEntry[] = [
                { day_epoch: 1000, total_rainfall_mm_x100: 500 },
                { day_epoch: 2000, total_rainfall_mm_x100: 0 },
                { day_epoch: 3000, total_rainfall_mm_x100: 0 }
            ];
            expect(countDryDays(daily)).toBe(2);
        });
    });

    describe('Longest Dry Spell', () => {
        const calculateLongestDrySpell = (daily: RainDailyEntry[]): number => {
            let longest = 0;
            let current = 0;
            daily.forEach(e => {
                if (e.total_rainfall_mm_x100 === 0) {
                    current++;
                    longest = Math.max(longest, current);
                } else {
                    current = 0;
                }
            });
            return longest;
        };

        it('should find longest dry spell', () => {
            const daily: RainDailyEntry[] = [
                { day_epoch: 1000, total_rainfall_mm_x100: 100 },
                { day_epoch: 2000, total_rainfall_mm_x100: 0 },
                { day_epoch: 3000, total_rainfall_mm_x100: 0 },
                { day_epoch: 4000, total_rainfall_mm_x100: 0 },
                { day_epoch: 5000, total_rainfall_mm_x100: 50 },
                { day_epoch: 6000, total_rainfall_mm_x100: 0 }
            ];
            expect(calculateLongestDrySpell(daily)).toBe(3);
        });

        it('should return 0 when all days are rainy', () => {
            const daily: RainDailyEntry[] = [
                { day_epoch: 1000, total_rainfall_mm_x100: 100 },
                { day_epoch: 2000, total_rainfall_mm_x100: 200 }
            ];
            expect(calculateLongestDrySpell(daily)).toBe(0);
        });

        it('should handle all dry days', () => {
            const daily: RainDailyEntry[] = [
                { day_epoch: 1000, total_rainfall_mm_x100: 0 },
                { day_epoch: 2000, total_rainfall_mm_x100: 0 },
                { day_epoch: 3000, total_rainfall_mm_x100: 0 }
            ];
            expect(calculateLongestDrySpell(daily)).toBe(3);
        });
    });

    describe('Max Hourly Rainfall', () => {
        const findMaxHourlyRainfall = (hourly: RainHourlyEntry[]): number => {
            if (hourly.length === 0) return 0;
            return Math.max(...hourly.map(e => e.rainfall_mm_x100)) / 100;
        };

        it('should find max hourly rainfall', () => {
            const hourly: RainHourlyEntry[] = [
                { hour_epoch: 1000, rainfall_mm_x100: 50 },
                { hour_epoch: 2000, rainfall_mm_x100: 200 },
                { hour_epoch: 3000, rainfall_mm_x100: 100 }
            ];
            expect(findMaxHourlyRainfall(hourly)).toBe(2);
        });

        it('should return 0 for empty array', () => {
            expect(findMaxHourlyRainfall([])).toBe(0);
        });
    });
});

describe('Cache Metadata', () => {
    interface CacheMetadata {
        lastSync: number;
        recordCount: number;
        oldestRecord: number;
        newestRecord: number;
    }

    describe('isCacheValid', () => {
        const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

        const isCacheValid = (metadata: CacheMetadata | null): boolean => {
            if (!metadata) return false;
            const now = Date.now();
            return (now - metadata.lastSync) < CACHE_TTL_MS;
        };

        it('should return false when no metadata', () => {
            expect(isCacheValid(null)).toBe(false);
        });

        it('should return true when within TTL', () => {
            const metadata: CacheMetadata = {
                lastSync: Date.now() - 1000, // 1 second ago
                recordCount: 10,
                oldestRecord: 1000,
                newestRecord: 2000
            };
            expect(isCacheValid(metadata)).toBe(true);
        });

        it('should return false when TTL expired', () => {
            const metadata: CacheMetadata = {
                lastSync: Date.now() - (10 * 60 * 1000), // 10 minutes ago
                recordCount: 10,
                oldestRecord: 1000,
                newestRecord: 2000
            };
            expect(isCacheValid(metadata)).toBe(false);
        });
    });

    describe('extractTimestamps', () => {
        const extractTimestamps = (records: { timestamp?: number; hour_epoch?: number; day_epoch?: number }[]): number[] => {
            return records
                .map(r => r.timestamp || r.hour_epoch || r.day_epoch || 0)
                .filter(t => t > 0);
        };

        it('should extract timestamp field', () => {
            const records = [{ timestamp: 1000 }, { timestamp: 2000 }];
            expect(extractTimestamps(records)).toEqual([1000, 2000]);
        });

        it('should extract hour_epoch field', () => {
            const records = [{ hour_epoch: 1000 }, { hour_epoch: 2000 }];
            expect(extractTimestamps(records)).toEqual([1000, 2000]);
        });

        it('should filter out zero timestamps', () => {
            const records = [{ timestamp: 1000 }, { timestamp: 0 }, { timestamp: 2000 }];
            expect(extractTimestamps(records)).toEqual([1000, 2000]);
        });
    });
});
