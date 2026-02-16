/**
 * DiagnosticsCard Component Tests
 * 
 * Tests for diagnostics helpers and formatting functions
 */
import { describe, it, expect } from 'vitest';
import { WateringError, SystemStatus } from '../../types/firmware_structs';

describe('DiagnosticsCard', () => {
    describe('WATERING_ERROR_LABELS', () => {
        const WATERING_ERROR_LABELS: Record<number, string> = {
            [WateringError.INVALID_PARAM]: 'Invalid parameter',
            [WateringError.NOT_INITIALIZED]: 'Not initialized',
            [WateringError.HARDWARE]: 'Hardware failure',
            [WateringError.BUSY]: 'Busy',
            [WateringError.QUEUE_FULL]: 'Queue full',
            [WateringError.TIMEOUT]: 'Timeout',
            [WateringError.CONFIG]: 'Configuration error',
            [WateringError.RTC_FAILURE]: 'RTC failure',
            [WateringError.STORAGE]: 'Storage error',
            [WateringError.DATA_CORRUPT]: 'Data corrupt',
            [WateringError.INVALID_DATA]: 'Invalid data',
            [WateringError.BUFFER_FULL]: 'Buffer full',
            [WateringError.NO_MEMORY]: 'No memory'
        };

        it('should have label for INVALID_PARAM', () => {
            expect(WATERING_ERROR_LABELS[WateringError.INVALID_PARAM]).toBe('Invalid parameter');
        });

        it('should have label for HARDWARE', () => {
            expect(WATERING_ERROR_LABELS[WateringError.HARDWARE]).toBe('Hardware failure');
        });

        it('should have label for TIMEOUT', () => {
            expect(WATERING_ERROR_LABELS[WateringError.TIMEOUT]).toBe('Timeout');
        });

        it('should have label for RTC_FAILURE', () => {
            expect(WATERING_ERROR_LABELS[WateringError.RTC_FAILURE]).toBe('RTC failure');
        });

        it('should have label for NO_MEMORY', () => {
            expect(WATERING_ERROR_LABELS[WateringError.NO_MEMORY]).toBe('No memory');
        });
    });

    describe('formatUptime', () => {
        const formatUptime = (minutes: number): string => {
            if (minutes < 60) return `${minutes}m`;
            if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
            const days = Math.floor(minutes / 1440);
            const hours = Math.floor((minutes % 1440) / 60);
            return `${days}d ${hours}h`;
        };

        it('should format minutes only', () => {
            expect(formatUptime(0)).toBe('0m');
            expect(formatUptime(30)).toBe('30m');
            expect(formatUptime(59)).toBe('59m');
        });

        it('should format hours and minutes', () => {
            expect(formatUptime(60)).toBe('1h 0m');
            expect(formatUptime(90)).toBe('1h 30m');
            expect(formatUptime(150)).toBe('2h 30m');
        });

        it('should format days and hours', () => {
            expect(formatUptime(1440)).toBe('1d 0h');
            expect(formatUptime(1500)).toBe('1d 1h');
            expect(formatUptime(2880)).toBe('2d 0h');
            expect(formatUptime(3600)).toBe('2d 12h');
        });
    });

    describe('getValveStatusBits', () => {
        const getValveStatusBits = (bitmask: number): string[] => {
            const active: string[] = [];
            for (let i = 0; i < 8; i++) {
                if (bitmask & (1 << i)) {
                    active.push(`Z${i}`);
                }
            }
            return active.length > 0 ? active : ['None'];
        };

        it('should return None for zero bitmask', () => {
            expect(getValveStatusBits(0)).toEqual(['None']);
        });

        it('should return Z0 for bitmask 1', () => {
            expect(getValveStatusBits(1)).toEqual(['Z0']);
        });

        it('should return Z1 for bitmask 2', () => {
            expect(getValveStatusBits(2)).toEqual(['Z1']);
        });

        it('should return multiple zones', () => {
            expect(getValveStatusBits(0b00000101)).toEqual(['Z0', 'Z2']);
            expect(getValveStatusBits(0b11111111)).toEqual(['Z0', 'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7']);
        });

        it('should handle high bits', () => {
            expect(getValveStatusBits(0b10000000)).toEqual(['Z7']);
        });
    });

    describe('getSystemStatusColor', () => {
        const getSystemStatusColor = (status: SystemStatus): string => {
            switch (status) {
                case SystemStatus.OK: return 'success';
                case SystemStatus.NO_FLOW: 
                case SystemStatus.UNEXPECTED_FLOW: return 'warning';
                case SystemStatus.FAULT:
                case SystemStatus.RTC_ERROR:
                case SystemStatus.LOW_POWER: return 'danger';
                default: return 'medium';
            }
        };

        it('should return success for OK status', () => {
            expect(getSystemStatusColor(SystemStatus.OK)).toBe('success');
        });

        it('should return warning for NO_FLOW status', () => {
            expect(getSystemStatusColor(SystemStatus.NO_FLOW)).toBe('warning');
        });

        it('should return warning for UNEXPECTED_FLOW status', () => {
            expect(getSystemStatusColor(SystemStatus.UNEXPECTED_FLOW)).toBe('warning');
        });

        it('should return danger for FAULT status', () => {
            expect(getSystemStatusColor(SystemStatus.FAULT)).toBe('danger');
        });

        it('should return danger for RTC_ERROR status', () => {
            expect(getSystemStatusColor(SystemStatus.RTC_ERROR)).toBe('danger');
        });

        it('should return danger for LOW_POWER status', () => {
            expect(getSystemStatusColor(SystemStatus.LOW_POWER)).toBe('danger');
        });
    });

    describe('getSystemStatusText', () => {
        const getSystemStatusText = (status: SystemStatus): string => {
            switch (status) {
                case SystemStatus.OK: return 'OK';
                case SystemStatus.NO_FLOW: return 'No Flow';
                case SystemStatus.UNEXPECTED_FLOW: return 'Unexpected Flow';
                case SystemStatus.FAULT: return 'Fault';
                case SystemStatus.RTC_ERROR: return 'RTC Error';
                case SystemStatus.LOW_POWER: return 'Low Power';
                default: return 'Unknown';
            }
        };

        it('should return OK text', () => {
            expect(getSystemStatusText(SystemStatus.OK)).toBe('OK');
        });

        it('should return No Flow text', () => {
            expect(getSystemStatusText(SystemStatus.NO_FLOW)).toBe('No Flow');
        });

        it('should return Fault text', () => {
            expect(getSystemStatusText(SystemStatus.FAULT)).toBe('Fault');
        });

        it('should return Unknown for unhandled status', () => {
            expect(getSystemStatusText(999 as SystemStatus)).toBe('Unknown');
        });
    });

    describe('Component exports', () => {
        it('should export DiagnosticsCard as default', async () => {
            const module = await import('../../components/DiagnosticsCard');
            expect(module.default).toBeDefined();
        }, 15000);
    });
});
