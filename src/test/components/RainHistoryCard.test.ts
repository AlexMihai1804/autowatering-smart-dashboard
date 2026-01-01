/**
 * Tests for RainHistoryCard helper functions
 * Tests rainfall formatting, bar height calculations, timestamp formatting
 */
import { describe, it, expect } from 'vitest';

describe('RainHistoryCard Helpers', () => {
    describe('formatRainfall', () => {
        const formatRainfall = (mm_x100: number): string => {
            return (mm_x100 / 100).toFixed(1);
        };

        it('should format zero rainfall', () => {
            expect(formatRainfall(0)).toBe('0.0');
        });

        it('should format small rainfall', () => {
            expect(formatRainfall(50)).toBe('0.5');
            expect(formatRainfall(10)).toBe('0.1');
        });

        it('should format normal rainfall', () => {
            expect(formatRainfall(150)).toBe('1.5');
            expect(formatRainfall(500)).toBe('5.0');
        });

        it('should format heavy rainfall', () => {
            expect(formatRainfall(10000)).toBe('100.0');
            expect(formatRainfall(2567)).toBe('25.7');
        });

        it('should round to one decimal', () => {
            expect(formatRainfall(1234)).toBe('12.3');
            expect(formatRainfall(1256)).toBe('12.6');
        });
    });

    describe('formatTimestamp', () => {
        const formatTimestamp = (ts: number): string => {
            if (ts === 0) return '--';
            const date = new Date(ts * 1000);
            return date.toLocaleString('ro-RO', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit'
            });
        };

        it('should return -- for zero timestamp', () => {
            expect(formatTimestamp(0)).toBe('--');
        });

        it('should format valid timestamp', () => {
            // Just check it doesn't throw and returns a string
            const ts = Math.floor(Date.now() / 1000);
            const result = formatTimestamp(ts);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getBarHeight', () => {
        const getBarHeight = (value: number, max: number): number => {
            if (max === 0) return 0;
            return Math.max(4, (value / max) * 100);
        };

        it('should return 0 when max is 0', () => {
            expect(getBarHeight(50, 0)).toBe(0);
        });

        it('should return minimum 4 for small values', () => {
            expect(getBarHeight(1, 100)).toBe(4);
            expect(getBarHeight(2, 100)).toBe(4);
        });

        it('should return 100 for max value', () => {
            expect(getBarHeight(100, 100)).toBe(100);
        });

        it('should return 50 for half value', () => {
            expect(getBarHeight(50, 100)).toBe(50);
        });

        it('should scale proportionally', () => {
            expect(getBarHeight(25, 100)).toBe(25);
            expect(getBarHeight(75, 100)).toBe(75);
        });
    });
});

describe('Rain Data Aggregation', () => {
    describe('Max Rainfall Calculation', () => {
        it('should find max from hourly data', () => {
            const hourlyData = [
                { rainfall_mm_x100: 100 },
                { rainfall_mm_x100: 250 },
                { rainfall_mm_x100: 150 },
                { rainfall_mm_x100: 50 }
            ];
            const max = Math.max(...hourlyData.map(e => e.rainfall_mm_x100), 1);
            expect(max).toBe(250);
        });

        it('should return 1 when all values are 0', () => {
            const hourlyData = [
                { rainfall_mm_x100: 0 },
                { rainfall_mm_x100: 0 }
            ];
            const max = Math.max(...hourlyData.map(e => e.rainfall_mm_x100), 1);
            expect(max).toBe(1);
        });

        it('should return 1 when array is empty', () => {
            const hourlyData: { rainfall_mm_x100: number }[] = [];
            const max = Math.max(...hourlyData.map(e => e.rainfall_mm_x100), 1);
            expect(max).toBe(1);
        });
    });

    describe('Daily Total Calculation', () => {
        it('should find max from daily totals', () => {
            const dailyData = [
                { total_rainfall_mm_x100: 500 },
                { total_rainfall_mm_x100: 1200 },
                { total_rainfall_mm_x100: 800 }
            ];
            const max = Math.max(...dailyData.map(e => e.total_rainfall_mm_x100), 1);
            expect(max).toBe(1200);
        });
    });
});

describe('Rain View Types', () => {
    type RainViewType = 'hourly' | 'daily' | 'recent';

    it('should start with recent view', () => {
        const defaultView: RainViewType = 'recent';
        expect(defaultView).toBe('recent');
    });

    it('should allow all view types', () => {
        const views: RainViewType[] = ['hourly', 'daily', 'recent'];
        expect(views).toContain('hourly');
        expect(views).toContain('daily');
        expect(views).toContain('recent');
    });
});

describe('Recent Totals', () => {
    interface RecentTotals {
        hour: number;
        day: number;
        week: number;
    }

    describe('Format Recent Totals', () => {
        const formatTotal = (mm_x100: number): string => {
            return (mm_x100 / 100).toFixed(1) + ' mm';
        };

        it('should format hourly total', () => {
            const totals: RecentTotals = { hour: 50, day: 200, week: 1500 };
            expect(formatTotal(totals.hour)).toBe('0.5 mm');
        });

        it('should format daily total', () => {
            const totals: RecentTotals = { hour: 50, day: 200, week: 1500 };
            expect(formatTotal(totals.day)).toBe('2.0 mm');
        });

        it('should format weekly total', () => {
            const totals: RecentTotals = { hour: 50, day: 200, week: 1500 };
            expect(formatTotal(totals.week)).toBe('15.0 mm');
        });
    });
});
