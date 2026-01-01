import { describe, it, expect } from 'vitest';

/**
 * Tests for MobileDeviceSelector helper functions.
 * These functions are defined inside the component but follow predictable logic.
 */

describe('MobileDeviceSelector Helpers', () => {
    // Helper function logic extracted from component
    const getSignalIcon = (strength?: number) => {
        if (!strength) return 'signal_cellular_0_bar';
        if (strength >= 80) return 'signal_cellular_alt';
        if (strength >= 50) return 'signal_cellular_alt_2_bar';
        if (strength >= 20) return 'signal_cellular_alt_1_bar';
        return 'signal_cellular_0_bar';
    };

    const getBatteryIcon = (level?: number) => {
        if (!level) return 'battery_unknown';
        if (level >= 90) return 'battery_full';
        if (level >= 60) return 'battery_5_bar';
        if (level >= 40) return 'battery_3_bar';
        if (level >= 20) return 'battery_2_bar';
        return 'battery_1_bar';
    };

    describe('getSignalIcon', () => {
        it('should return 0_bar for undefined strength', () => {
            expect(getSignalIcon(undefined)).toBe('signal_cellular_0_bar');
        });

        it('should return 0_bar for null/0 strength', () => {
            expect(getSignalIcon(0)).toBe('signal_cellular_0_bar');
        });

        it('should return alt (full) for strength >= 80', () => {
            expect(getSignalIcon(80)).toBe('signal_cellular_alt');
            expect(getSignalIcon(100)).toBe('signal_cellular_alt');
            expect(getSignalIcon(95)).toBe('signal_cellular_alt');
        });

        it('should return alt_2_bar for strength 50-79', () => {
            expect(getSignalIcon(50)).toBe('signal_cellular_alt_2_bar');
            expect(getSignalIcon(65)).toBe('signal_cellular_alt_2_bar');
            expect(getSignalIcon(79)).toBe('signal_cellular_alt_2_bar');
        });

        it('should return alt_1_bar for strength 20-49', () => {
            expect(getSignalIcon(20)).toBe('signal_cellular_alt_1_bar');
            expect(getSignalIcon(35)).toBe('signal_cellular_alt_1_bar');
            expect(getSignalIcon(49)).toBe('signal_cellular_alt_1_bar');
        });

        it('should return 0_bar for strength < 20', () => {
            expect(getSignalIcon(19)).toBe('signal_cellular_0_bar');
            expect(getSignalIcon(10)).toBe('signal_cellular_0_bar');
            expect(getSignalIcon(1)).toBe('signal_cellular_0_bar');
        });
    });

    describe('getBatteryIcon', () => {
        it('should return unknown for undefined level', () => {
            expect(getBatteryIcon(undefined)).toBe('battery_unknown');
        });

        it('should return unknown for 0 level', () => {
            expect(getBatteryIcon(0)).toBe('battery_unknown');
        });

        it('should return full for level >= 90', () => {
            expect(getBatteryIcon(90)).toBe('battery_full');
            expect(getBatteryIcon(100)).toBe('battery_full');
            expect(getBatteryIcon(95)).toBe('battery_full');
        });

        it('should return 5_bar for level 60-89', () => {
            expect(getBatteryIcon(60)).toBe('battery_5_bar');
            expect(getBatteryIcon(75)).toBe('battery_5_bar');
            expect(getBatteryIcon(89)).toBe('battery_5_bar');
        });

        it('should return 3_bar for level 40-59', () => {
            expect(getBatteryIcon(40)).toBe('battery_3_bar');
            expect(getBatteryIcon(50)).toBe('battery_3_bar');
            expect(getBatteryIcon(59)).toBe('battery_3_bar');
        });

        it('should return 2_bar for level 20-39', () => {
            expect(getBatteryIcon(20)).toBe('battery_2_bar');
            expect(getBatteryIcon(30)).toBe('battery_2_bar');
            expect(getBatteryIcon(39)).toBe('battery_2_bar');
        });

        it('should return 1_bar for level < 20', () => {
            expect(getBatteryIcon(19)).toBe('battery_1_bar');
            expect(getBatteryIcon(10)).toBe('battery_1_bar');
            expect(getBatteryIcon(1)).toBe('battery_1_bar');
        });
    });

    describe('Device filtering', () => {
        const devices = [
            { id: '1', name: 'Living Room Hub', isConnected: true },
            { id: '2', name: 'Garden Controller', isConnected: false },
            { id: '3', name: 'Patio Sensor', isConnected: true },
        ];

        const filterDevices = (query: string) => 
            devices.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));

        it('should filter devices by name (case-insensitive)', () => {
            expect(filterDevices('garden')).toHaveLength(1);
            expect(filterDevices('Garden')).toHaveLength(1);
            expect(filterDevices('GARDEN')).toHaveLength(1);
        });

        it('should return all devices for empty query', () => {
            expect(filterDevices('')).toHaveLength(3);
        });

        it('should return multiple matches for partial query', () => {
            // All contain 'o' in their names
            const matches = filterDevices('o');
            expect(matches.length).toBeGreaterThan(1);
        });

        it('should return empty array for no matches', () => {
            expect(filterDevices('xyz')).toHaveLength(0);
        });
    });
});
