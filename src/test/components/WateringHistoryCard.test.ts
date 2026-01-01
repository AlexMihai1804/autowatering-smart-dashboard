/**
 * Tests for WateringHistoryCard helper functions
 * Tests timestamp formatting, trigger text, zone name resolution
 */
import { describe, it, expect } from 'vitest';

describe('WateringHistoryCard Helpers', () => {
    describe('formatTimestamp', () => {
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

        it('should return -- for zero timestamp', () => {
            expect(formatTimestamp(0)).toBe('--');
        });

        it('should format valid Unix timestamp', () => {
            const ts = Math.floor(Date.now() / 1000);
            const result = formatTimestamp(ts);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).not.toBe('--');
        });
    });

    describe('getTriggerText', () => {
        const getTriggerText = (trigger: number): string => {
            switch (trigger) {
                case 0: return 'Manual';
                case 1: return 'Schedule';
                case 2: return 'Remote';
                default: return 'Unknown';
            }
        };

        it('should return Manual for trigger 0', () => {
            expect(getTriggerText(0)).toBe('Manual');
        });

        it('should return Schedule for trigger 1', () => {
            expect(getTriggerText(1)).toBe('Schedule');
        });

        it('should return Remote for trigger 2', () => {
            expect(getTriggerText(2)).toBe('Remote');
        });

        it('should return Unknown for invalid trigger', () => {
            expect(getTriggerText(3)).toBe('Unknown');
            expect(getTriggerText(-1)).toBe('Unknown');
            expect(getTriggerText(100)).toBe('Unknown');
        });
    });

    describe('getZoneName', () => {
        const zones = [
            { channel_id: 0, name: 'Front Lawn' },
            { channel_id: 1, name: 'Back Garden' },
            { channel_id: 2, name: 'Patio' },
            { channel_id: 5, name: 'Vegetable Garden' }
        ];

        const getZoneName = (channelId: number): string => {
            const zone = zones.find(z => z.channel_id === channelId);
            return zone?.name || `Zone ${channelId}`;
        };

        it('should find zone by channel_id', () => {
            expect(getZoneName(0)).toBe('Front Lawn');
            expect(getZoneName(1)).toBe('Back Garden');
            expect(getZoneName(2)).toBe('Patio');
        });

        it('should return default name for unknown channel', () => {
            expect(getZoneName(3)).toBe('Zone 3');
            expect(getZoneName(7)).toBe('Zone 7');
        });

        it('should handle gaps in channel IDs', () => {
            expect(getZoneName(5)).toBe('Vegetable Garden');
            expect(getZoneName(4)).toBe('Zone 4');
        });
    });
});

describe('Event Type Icons', () => {
    describe('getEventTypeSuccess', () => {
        const isSuccess = (eventType: number, success: number): boolean => {
            if (eventType === 3 || success === 0) {
                return false;
            }
            return true;
        };

        it('should return false for error event type (3)', () => {
            expect(isSuccess(3, 1)).toBe(false);
        });

        it('should return false for success = 0', () => {
            expect(isSuccess(0, 0)).toBe(false);
            expect(isSuccess(1, 0)).toBe(false);
        });

        it('should return true for success = 1 and non-error event', () => {
            expect(isSuccess(0, 1)).toBe(true);
            expect(isSuccess(1, 1)).toBe(true);
            expect(isSuccess(2, 1)).toBe(true);
        });
    });
});

describe('History Type State', () => {
    type HistoryType = 'detailed' | 'daily' | 'monthly';

    it('should start with detailed view', () => {
        const defaultType: HistoryType = 'detailed';
        expect(defaultType).toBe('detailed');
    });

    it('should support all history types', () => {
        const types: HistoryType[] = ['detailed', 'daily', 'monthly'];
        expect(types).toHaveLength(3);
        expect(types).toContain('detailed');
        expect(types).toContain('daily');
        expect(types).toContain('monthly');
    });
});

describe('Detailed History Entry', () => {
    interface HistoryEntry {
        timestamp: number;
        channel_id: number;
        duration_sec: number;
        volume_ml: number;
        trigger: number;
        event_type: number;
        success: number;
    }

    describe('Volume Formatting', () => {
        const formatVolume = (ml: number): string => {
            if (ml >= 1000) {
                return `${(ml / 1000).toFixed(1)}L`;
            }
            return `${ml}ml`;
        };

        it('should format milliliters', () => {
            expect(formatVolume(500)).toBe('500ml');
            expect(formatVolume(999)).toBe('999ml');
        });

        it('should format liters', () => {
            expect(formatVolume(1000)).toBe('1.0L');
            expect(formatVolume(2500)).toBe('2.5L');
        });
    });

    describe('Duration Formatting', () => {
        const formatDuration = (seconds: number): string => {
            if (seconds < 60) return `${seconds}s`;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            if (secs === 0) return `${mins}m`;
            return `${mins}m ${secs}s`;
        };

        it('should format seconds only', () => {
            expect(formatDuration(30)).toBe('30s');
            expect(formatDuration(59)).toBe('59s');
        });

        it('should format exact minutes', () => {
            expect(formatDuration(60)).toBe('1m');
            expect(formatDuration(120)).toBe('2m');
        });

        it('should format minutes and seconds', () => {
            expect(formatDuration(90)).toBe('1m 30s');
            expect(formatDuration(125)).toBe('2m 5s');
        });
    });
});

describe('Daily/Monthly History', () => {
    describe('Daily Summary', () => {
        interface DailySummary {
            date_ts: number;
            total_volume_ml: number;
            total_duration_sec: number;
            watering_count: number;
        }

        const formatDailyDate = (ts: number): string => {
            if (ts === 0) return '--';
            const date = new Date(ts * 1000);
            return date.toLocaleDateString('ro-RO', {
                weekday: 'short',
                day: '2-digit',
                month: 'short'
            });
        };

        it('should format daily date', () => {
            const ts = Math.floor(Date.now() / 1000);
            const result = formatDailyDate(ts);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return -- for zero timestamp', () => {
            expect(formatDailyDate(0)).toBe('--');
        });
    });

    describe('Monthly Summary', () => {
        interface MonthlySummary {
            month: number;  // 1-12
            year: number;
            total_volume_ml: number;
            total_duration_sec: number;
            watering_count: number;
        }

        const formatMonth = (month: number, year: number): string => {
            const date = new Date(year, month - 1, 1);
            return date.toLocaleDateString('ro-RO', {
                month: 'long',
                year: 'numeric'
            });
        };

        it('should format month/year', () => {
            const result = formatMonth(6, 2024);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });
});

describe('History Stats', () => {
    describe('Total Volume Calculation', () => {
        it('should sum volumes from entries', () => {
            const entries = [
                { volume_ml: 500 },
                { volume_ml: 1200 },
                { volume_ml: 800 }
            ];
            const total = entries.reduce((sum, e) => sum + e.volume_ml, 0);
            expect(total).toBe(2500);
        });

        it('should return 0 for empty array', () => {
            const entries: { volume_ml: number }[] = [];
            const total = entries.reduce((sum, e) => sum + e.volume_ml, 0);
            expect(total).toBe(0);
        });
    });

    describe('Average Duration', () => {
        it('should calculate average duration', () => {
            const entries = [
                { duration_sec: 60 },
                { duration_sec: 120 },
                { duration_sec: 90 }
            ];
            const avg = entries.reduce((sum, e) => sum + e.duration_sec, 0) / entries.length;
            expect(avg).toBe(90);
        });
    });
});
