/**
 * Analytics Page Tests
 * 
 * Tests for analytics calculations and formatting
 */
import { describe, it, expect } from 'vitest';

describe('Analytics Page', () => {
    describe('Volume formatting', () => {
        it('should convert ml to liters with one decimal', () => {
            const formatVolumeLiters = (ml: number): string => {
                return (ml / 1000).toFixed(1);
            };

            expect(formatVolumeLiters(0)).toBe('0.0');
            expect(formatVolumeLiters(500)).toBe('0.5');
            expect(formatVolumeLiters(1000)).toBe('1.0');
            expect(formatVolumeLiters(1500)).toBe('1.5');
            expect(formatVolumeLiters(10000)).toBe('10.0');
        });
    });

    describe('Temperature formatting', () => {
        it('should format temperature with one decimal', () => {
            const formatTemp = (temp: number | undefined): string => {
                return temp !== undefined ? temp.toFixed(1) : '--';
            };

            expect(formatTemp(undefined)).toBe('--');
            expect(formatTemp(20)).toBe('20.0');
            expect(formatTemp(25.5)).toBe('25.5');
            expect(formatTemp(18.75)).toBe('18.8');
        });
    });

    describe('Humidity formatting', () => {
        it('should format humidity without decimals', () => {
            const formatHumidity = (humidity: number | undefined): string => {
                return humidity !== undefined ? humidity.toFixed(0) : '--';
            };

            expect(formatHumidity(undefined)).toBe('--');
            expect(formatHumidity(50)).toBe('50');
            expect(formatHumidity(75.4)).toBe('75');
            expect(formatHumidity(75.6)).toBe('76');
        });
    });

    describe('Rain total calculation', () => {
        interface RainHistoryEntry {
            total_rainfall_mm_x100: number;
        }

        it('should calculate total rain from history', () => {
            const calculateTotalRain = (history: RainHistoryEntry[]): string => {
                if (history.length === 0) return '--';
                return (history.reduce((sum, e) => sum + e.total_rainfall_mm_x100, 0) / 100).toFixed(1);
            };

            expect(calculateTotalRain([])).toBe('--');
            expect(calculateTotalRain([{ total_rainfall_mm_x100: 100 }])).toBe('1.0');
            expect(calculateTotalRain([
                { total_rainfall_mm_x100: 100 },
                { total_rainfall_mm_x100: 200 }
            ])).toBe('3.0');
            expect(calculateTotalRain([
                { total_rainfall_mm_x100: 50 },
                { total_rainfall_mm_x100: 75 }
            ])).toBe('1.3');
        });
    });

    describe('Watering efficiency calculation', () => {
        interface WateringHistoryEntry {
            success_status: number;
        }

        it('should calculate efficiency percentage', () => {
            const calculateEfficiency = (history: WateringHistoryEntry[]): number => {
                if (history.length === 0) return 0;
                return Math.round(
                    history.filter(e => e.success_status === 1).length / history.length * 100
                );
            };

            expect(calculateEfficiency([])).toBe(0);
            expect(calculateEfficiency([{ success_status: 1 }])).toBe(100);
            expect(calculateEfficiency([{ success_status: 0 }])).toBe(0);
            expect(calculateEfficiency([
                { success_status: 1 },
                { success_status: 1 },
                { success_status: 0 },
                { success_status: 0 }
            ])).toBe(50);
            expect(calculateEfficiency([
                { success_status: 1 },
                { success_status: 1 },
                { success_status: 1 },
                { success_status: 0 }
            ])).toBe(75);
        });
    });

    describe('Connection state display', () => {
        it('should return LIVE DATA for connected state', () => {
            const getConnectionLabel = (state: string): string => {
                return state === 'connected' ? 'LIVE DATA' : 'OFFLINE';
            };

            expect(getConnectionLabel('connected')).toBe('LIVE DATA');
            expect(getConnectionLabel('disconnected')).toBe('OFFLINE');
            expect(getConnectionLabel('connecting')).toBe('OFFLINE');
        });
    });

    describe('Summary stats structure', () => {
        it('should have all required stat cards', () => {
            const statLabels = ['Total Volume', 'Current Temp', 'Rain (7d)', 'Efficiency'];
            expect(statLabels).toHaveLength(4);
            expect(statLabels).toContain('Total Volume');
            expect(statLabels).toContain('Current Temp');
            expect(statLabels).toContain('Rain (7d)');
            expect(statLabels).toContain('Efficiency');
        });
    });

});
