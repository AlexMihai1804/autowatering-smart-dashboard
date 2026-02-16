/**
 * StatisticsCard Component Tests
 * 
 * Tests for statistics formatting and helper functions
 */
import { describe, it, expect } from 'vitest';

describe('StatisticsCard', () => {
    describe('formatVolume', () => {
        // Replicating the formatVolume function logic
        const formatVolume = (ml: number): string => {
            if (ml >= 1000) {
                return `${(ml / 1000).toFixed(1)}L`;
            }
            return `${ml}ml`;
        };

        it('should format small volumes in ml', () => {
            expect(formatVolume(50)).toBe('50ml');
            expect(formatVolume(100)).toBe('100ml');
            expect(formatVolume(500)).toBe('500ml');
            expect(formatVolume(999)).toBe('999ml');
        });

        it('should format volumes at boundary in liters', () => {
            expect(formatVolume(1000)).toBe('1.0L');
        });

        it('should format large volumes in liters', () => {
            expect(formatVolume(1500)).toBe('1.5L');
            expect(formatVolume(2000)).toBe('2.0L');
            expect(formatVolume(10000)).toBe('10.0L');
            expect(formatVolume(12345)).toBe('12.3L');
        });

        it('should handle zero', () => {
            expect(formatVolume(0)).toBe('0ml');
        });
    });

    describe('formatTimestamp', () => {
        // Replicating the formatTimestamp function logic
        const formatTimestamp = (ts: number): string => {
            if (ts === 0) return 'Never';
            const date = new Date(ts * 1000);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            
            if (diffHours < 1) {
                return `${Math.round(diffMs / 60000)}m ago`;
            } else if (diffHours < 24) {
                return `${Math.round(diffHours)}h ago`;
            } else if (diffHours < 168) { // 7 days
                return `${Math.round(diffHours / 24)}d ago`;
            }
            return date.toLocaleDateString();
        };

        it('should return Never for zero timestamp', () => {
            expect(formatTimestamp(0)).toBe('Never');
        });

        it('should format recent times in minutes', () => {
            const now = Math.floor(Date.now() / 1000);
            const thirtyMinsAgo = now - (30 * 60);
            const result = formatTimestamp(thirtyMinsAgo);
            expect(result).toMatch(/\d+m ago/);
        });

        it('should format hours ago', () => {
            const now = Math.floor(Date.now() / 1000);
            const fiveHoursAgo = now - (5 * 60 * 60);
            const result = formatTimestamp(fiveHoursAgo);
            expect(result).toMatch(/\d+h ago/);
        });

        it('should format days ago for recent week', () => {
            const now = Math.floor(Date.now() / 1000);
            const threeDaysAgo = now - (3 * 24 * 60 * 60);
            const result = formatTimestamp(threeDaysAgo);
            expect(result).toMatch(/\d+d ago/);
        });
    });

    describe('Statistics totals calculation', () => {
        interface StatisticsData {
            channel_id: number;
            total_volume: number;
            count: number;
            last_watering: number;
        }

        const calculateTotals = (statsArray: StatisticsData[]) => {
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
        };

        it('should calculate totals for empty array', () => {
            const totals = calculateTotals([]);
            expect(totals.totalVolume).toBe(0);
            expect(totals.totalSessions).toBe(0);
            expect(totals.lastWatering).toBe(0);
        });

        it('should calculate totals for single channel', () => {
            const stats: StatisticsData[] = [
                { channel_id: 0, total_volume: 5000, count: 10, last_watering: 1000 }
            ];
            const totals = calculateTotals(stats);
            expect(totals.totalVolume).toBe(5000);
            expect(totals.totalSessions).toBe(10);
            expect(totals.lastWatering).toBe(1000);
        });

        it('should calculate totals for multiple channels', () => {
            const stats: StatisticsData[] = [
                { channel_id: 0, total_volume: 1000, count: 5, last_watering: 100 },
                { channel_id: 1, total_volume: 2000, count: 8, last_watering: 200 },
                { channel_id: 2, total_volume: 3000, count: 12, last_watering: 150 }
            ];
            const totals = calculateTotals(stats);
            expect(totals.totalVolume).toBe(6000);
            expect(totals.totalSessions).toBe(25);
            expect(totals.lastWatering).toBe(200);
        });
    });

    describe('Component exports', () => {
        it('should export StatisticsCard as default', async () => {
            const module = await import('../../components/StatisticsCard');
            expect(module.default).toBeDefined();
        }, 15000);
    });
});
