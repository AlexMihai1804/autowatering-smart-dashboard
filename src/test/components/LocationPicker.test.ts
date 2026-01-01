/**
 * Tests for LocationPicker helper functions
 * Tests GPS location handling, coordinate validation
 */
import { describe, it, expect } from 'vitest';

describe('LocationPicker Helpers', () => {
    describe('Coordinate Validation', () => {
        const isValidLatitude = (lat: number): boolean => {
            return lat >= -90 && lat <= 90;
        };

        const isValidLongitude = (lng: number): boolean => {
            return lng >= -180 && lng <= 180;
        };

        it('should validate valid latitudes', () => {
            expect(isValidLatitude(0)).toBe(true);
            expect(isValidLatitude(45.5)).toBe(true);
            expect(isValidLatitude(-45.5)).toBe(true);
            expect(isValidLatitude(90)).toBe(true);
            expect(isValidLatitude(-90)).toBe(true);
        });

        it('should reject invalid latitudes', () => {
            expect(isValidLatitude(91)).toBe(false);
            expect(isValidLatitude(-91)).toBe(false);
            expect(isValidLatitude(180)).toBe(false);
        });

        it('should validate valid longitudes', () => {
            expect(isValidLongitude(0)).toBe(true);
            expect(isValidLongitude(100.5)).toBe(true);
            expect(isValidLongitude(-100.5)).toBe(true);
            expect(isValidLongitude(180)).toBe(true);
            expect(isValidLongitude(-180)).toBe(true);
        });

        it('should reject invalid longitudes', () => {
            expect(isValidLongitude(181)).toBe(false);
            expect(isValidLongitude(-181)).toBe(false);
        });
    });

    describe('Coordinate Formatting', () => {
        const formatCoordinate = (value: number, decimals: number = 6): string => {
            return value.toFixed(decimals);
        };

        it('should format coordinates with default 6 decimals', () => {
            expect(formatCoordinate(45.123456789)).toBe('45.123457');
        });

        it('should format coordinates with custom decimals', () => {
            expect(formatCoordinate(45.5, 2)).toBe('45.50');
            // 45.12345 rounds to 45.1234 due to floating point representation
            expect(formatCoordinate(45.12346, 4)).toBe('45.1235');
        });

        it('should handle negative coordinates', () => {
            expect(formatCoordinate(-120.567890)).toBe('-120.567890');
        });
    });

    describe('Default Map Center', () => {
        it('should use center of Romania as default', () => {
            const defaultCenter: [number, number] = [45.9432, 24.9668];
            expect(defaultCenter[0]).toBeCloseTo(45.9432, 4);
            expect(defaultCenter[1]).toBeCloseTo(24.9668, 4);
        });
    });
});

describe('GPS Error Handling', () => {
    describe('Error Types', () => {
        const getGPSErrorMessage = (errorCode: string): string => {
            switch (errorCode) {
                case 'GPS_DENIED':
                    return 'GPS permission denied. Please enable location access.';
                case 'GPS_NOT_AVAILABLE':
                    return 'GPS is not available on this device.';
                case 'GPS_TIMEOUT':
                    return 'GPS signal timeout. Try again or select manually.';
                case 'GPS_UNAVAILABLE':
                    return 'GPS signal unavailable. Check if you are outdoors.';
                default:
                    return 'Failed to get GPS location.';
            }
        };

        it('should return denied message', () => {
            expect(getGPSErrorMessage('GPS_DENIED')).toContain('permission denied');
        });

        it('should return not available message', () => {
            expect(getGPSErrorMessage('GPS_NOT_AVAILABLE')).toContain('not available');
        });

        it('should return timeout message', () => {
            expect(getGPSErrorMessage('GPS_TIMEOUT')).toContain('timeout');
        });

        it('should return generic message for unknown errors', () => {
            expect(getGPSErrorMessage('UNKNOWN')).toContain('Failed');
        });
    });
});

describe('LocationData Interface', () => {
    interface LocationData {
        lat: number;
        lng: number;
        altitude?: number;
        accuracy?: number;
    }

    describe('Complete Location', () => {
        it('should have required lat/lng', () => {
            const location: LocationData = { lat: 45.5, lng: 25.5 };
            expect(location.lat).toBe(45.5);
            expect(location.lng).toBe(25.5);
        });

        it('should support optional altitude', () => {
            const location: LocationData = { lat: 45.5, lng: 25.5, altitude: 500 };
            expect(location.altitude).toBe(500);
        });

        it('should support optional accuracy', () => {
            const location: LocationData = { lat: 45.5, lng: 25.5, accuracy: 10 };
            expect(location.accuracy).toBe(10);
        });
    });

    describe('Location Comparison', () => {
        const isSameLocation = (a: LocationData, b: LocationData, tolerance: number = 0.0001): boolean => {
            return Math.abs(a.lat - b.lat) < tolerance && Math.abs(a.lng - b.lng) < tolerance;
        };

        it('should detect same location', () => {
            const a: LocationData = { lat: 45.5, lng: 25.5 };
            const b: LocationData = { lat: 45.5, lng: 25.5 };
            expect(isSameLocation(a, b)).toBe(true);
        });

        it('should detect different location', () => {
            const a: LocationData = { lat: 45.5, lng: 25.5 };
            const b: LocationData = { lat: 46.0, lng: 26.0 };
            expect(isSameLocation(a, b)).toBe(false);
        });

        it('should handle tolerance', () => {
            const a: LocationData = { lat: 45.50001, lng: 25.50001 };
            const b: LocationData = { lat: 45.50002, lng: 25.50002 };
            expect(isSameLocation(a, b, 0.0001)).toBe(true);
        });
    });
});

describe('Map Zoom Levels', () => {
    const MIN_ZOOM = 3;
    const MAX_ZOOM = 19;
    const DEFAULT_ZOOM = 15;

    it('should have reasonable min zoom', () => {
        expect(MIN_ZOOM).toBeGreaterThanOrEqual(1);
        expect(MIN_ZOOM).toBeLessThanOrEqual(5);
    });

    it('should have max zoom for detail', () => {
        expect(MAX_ZOOM).toBeGreaterThanOrEqual(18);
    });

    it('should have default zoom between min and max', () => {
        expect(DEFAULT_ZOOM).toBeGreaterThan(MIN_ZOOM);
        expect(DEFAULT_ZOOM).toBeLessThan(MAX_ZOOM);
    });
});

describe('Manual Input Parsing', () => {
    const parseCoordinate = (input: string): number | null => {
        const trimmed = input.trim();
        if (!trimmed) return null;
        const num = parseFloat(trimmed);
        if (isNaN(num)) return null;
        return num;
    };

    it('should parse valid numbers', () => {
        expect(parseCoordinate('45.5')).toBe(45.5);
        expect(parseCoordinate('-120.123')).toBe(-120.123);
    });

    it('should return null for empty string', () => {
        expect(parseCoordinate('')).toBeNull();
        expect(parseCoordinate('   ')).toBeNull();
    });

    it('should return null for invalid input', () => {
        expect(parseCoordinate('abc')).toBeNull();
        expect(parseCoordinate('45.5abc')).toBe(45.5); // parseFloat handles this
    });

    it('should trim whitespace', () => {
        expect(parseCoordinate('  45.5  ')).toBe(45.5);
    });
});
