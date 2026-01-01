/**
 * Tests for EcoBadge helper functions
 * Tests rain detection, skipped zones calculation
 */
import { describe, it, expect } from 'vitest';

describe('EcoBadge Helpers', () => {
    describe('isRaining detection', () => {
        const isRaining = (rainfall_last_24h: number, sensor_active: boolean): boolean => {
            return rainfall_last_24h > 0 || sensor_active;
        };

        it('should detect rain from rainfall amount', () => {
            expect(isRaining(5.0, false)).toBe(true);
            expect(isRaining(0.1, false)).toBe(true);
        });

        it('should detect rain from active sensor', () => {
            expect(isRaining(0, true)).toBe(true);
        });

        it('should detect rain from both', () => {
            expect(isRaining(5.0, true)).toBe(true);
        });

        it('should not detect rain when neither', () => {
            expect(isRaining(0, false)).toBe(false);
        });
    });

    describe('Skipped Zones Calculation', () => {
        const countSkippedZones = (channel_skip_irrigation: boolean[]): number => {
            return channel_skip_irrigation.filter(s => s).length;
        };

        it('should count zero when no zones skipped', () => {
            expect(countSkippedZones([false, false, false, false])).toBe(0);
        });

        it('should count all when all zones skipped', () => {
            expect(countSkippedZones([true, true, true, true])).toBe(4);
        });

        it('should count partial skipped zones', () => {
            expect(countSkippedZones([true, false, true, false])).toBe(2);
            expect(countSkippedZones([true, true, false, false, true])).toBe(3);
        });

        it('should handle empty array', () => {
            expect(countSkippedZones([])).toBe(0);
        });
    });

    describe('Rainfall Formatting', () => {
        const formatRainfall = (mm: number): string => {
            return mm.toFixed(1) + 'mm';
        };

        it('should format zero rainfall', () => {
            expect(formatRainfall(0)).toBe('0.0mm');
        });

        it('should format small rainfall', () => {
            expect(formatRainfall(0.5)).toBe('0.5mm');
        });

        it('should format normal rainfall', () => {
            expect(formatRainfall(5.5)).toBe('5.5mm');
        });

        it('should format heavy rainfall', () => {
            expect(formatRainfall(50.25)).toBe('50.3mm');
        });
    });
});

describe('RainIntegration Data', () => {
    interface RainIntegration {
        integration_enabled: boolean;
        rainfall_last_24h: number;
        channel_skip_irrigation: boolean[];
        sensor_active: boolean;
    }

    describe('Visibility Logic', () => {
        const shouldShowBadge = (data: RainIntegration | null): boolean => {
            if (!data) return false;
            return data.integration_enabled || data.sensor_active;
        };

        it('should hide when data is null', () => {
            expect(shouldShowBadge(null)).toBe(false);
        });

        it('should show when integration is enabled', () => {
            const data: RainIntegration = {
                integration_enabled: true,
                rainfall_last_24h: 0,
                channel_skip_irrigation: [],
                sensor_active: false
            };
            expect(shouldShowBadge(data)).toBe(true);
        });

        it('should show when sensor is active', () => {
            const data: RainIntegration = {
                integration_enabled: false,
                rainfall_last_24h: 0,
                channel_skip_irrigation: [],
                sensor_active: true
            };
            expect(shouldShowBadge(data)).toBe(true);
        });

        it('should hide when disabled and sensor inactive', () => {
            const data: RainIntegration = {
                integration_enabled: false,
                rainfall_last_24h: 5,  // rainfall doesn't matter for visibility
                channel_skip_irrigation: [true],
                sensor_active: false
            };
            expect(shouldShowBadge(data)).toBe(false);
        });
    });
});

describe('Badge Title', () => {
    const getBadgeTitle = (isRaining: boolean): string => {
        return isRaining ? 'Rain Detected' : 'Eco Monitor';
    };

    it('should show Rain Detected when raining', () => {
        expect(getBadgeTitle(true)).toBe('Rain Detected');
    });

    it('should show Eco Monitor when not raining', () => {
        expect(getBadgeTitle(false)).toBe('Eco Monitor');
    });
});

describe('Badge Styling', () => {
    const getIconClasses = (isRaining: boolean): string => {
        if (isRaining) {
            return 'bg-emerald-500 text-white animate-pulse';
        }
        return 'bg-emerald-500/20 text-emerald-400';
    };

    it('should have pulse animation when raining', () => {
        expect(getIconClasses(true)).toContain('animate-pulse');
    });

    it('should have solid background when raining', () => {
        expect(getIconClasses(true)).toContain('bg-emerald-500');
        expect(getIconClasses(true)).not.toContain('bg-emerald-500/20');
    });

    it('should have transparent background when not raining', () => {
        expect(getIconClasses(false)).toContain('bg-emerald-500/20');
    });

    it('should not have pulse when not raining', () => {
        expect(getIconClasses(false)).not.toContain('animate-pulse');
    });
});

describe('Zones Paused Message', () => {
    const getZonesPausedMessage = (count: number): string | null => {
        if (count === 0) return null;
        if (count === 1) return '1 zone paused';
        return `${count} zones paused`;
    };

    it('should return null for zero zones', () => {
        expect(getZonesPausedMessage(0)).toBeNull();
    });

    it('should use singular for one zone', () => {
        expect(getZonesPausedMessage(1)).toBe('1 zone paused');
    });

    it('should use plural for multiple zones', () => {
        expect(getZonesPausedMessage(2)).toBe('2 zones paused');
        expect(getZonesPausedMessage(5)).toBe('5 zones paused');
    });
});
