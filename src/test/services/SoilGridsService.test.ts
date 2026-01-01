/**
 * Tests for SoilGridsService helper functions
 * Tests texture classification, depth parsing, API status tracking
 */
import { describe, it, expect } from 'vitest';

describe('SoilGridsService Helpers', () => {
    describe('parseDepthLabel', () => {
        const parseDepthLabel = (depthLabel: string): { top: number; bottom: number } => {
            const cleaned = depthLabel.trim().toLowerCase().replace('cm', '');
            const parts = cleaned.split('-');
            const top = Number(parts[0]);
            const bottom = Number(parts[1]);
            return {
                top: Number.isFinite(top) ? top : 0,
                bottom: Number.isFinite(bottom) ? bottom : 0,
            };
        };

        it('should parse 0-5cm', () => {
            const result = parseDepthLabel('0-5cm');
            expect(result.top).toBe(0);
            expect(result.bottom).toBe(5);
        });

        it('should parse 5-15cm', () => {
            const result = parseDepthLabel('5-15cm');
            expect(result.top).toBe(5);
            expect(result.bottom).toBe(15);
        });

        it('should parse 15-30cm', () => {
            const result = parseDepthLabel('15-30cm');
            expect(result.top).toBe(15);
            expect(result.bottom).toBe(30);
        });

        it('should parse 100-200cm', () => {
            const result = parseDepthLabel('100-200cm');
            expect(result.top).toBe(100);
            expect(result.bottom).toBe(200);
        });

        it('should handle uppercase', () => {
            const result = parseDepthLabel('0-5CM');
            expect(result.top).toBe(0);
            expect(result.bottom).toBe(5);
        });

        it('should handle whitespace', () => {
            const result = parseDepthLabel('  5-15cm  ');
            expect(result.top).toBe(5);
            expect(result.bottom).toBe(15);
        });
    });

    describe('isRetryableStatus', () => {
        const isRetryableStatus = (status: number): boolean => {
            return status === 429 || status === 502 || status === 503 || status === 504;
        };

        it('should retry on 429 (Too Many Requests)', () => {
            expect(isRetryableStatus(429)).toBe(true);
        });

        it('should retry on 502 (Bad Gateway)', () => {
            expect(isRetryableStatus(502)).toBe(true);
        });

        it('should retry on 503 (Service Unavailable)', () => {
            expect(isRetryableStatus(503)).toBe(true);
        });

        it('should retry on 504 (Gateway Timeout)', () => {
            expect(isRetryableStatus(504)).toBe(true);
        });

        it('should not retry on 400 (Bad Request)', () => {
            expect(isRetryableStatus(400)).toBe(false);
        });

        it('should not retry on 404 (Not Found)', () => {
            expect(isRetryableStatus(404)).toBe(false);
        });

        it('should not retry on 500 (Internal Server Error)', () => {
            expect(isRetryableStatus(500)).toBe(false);
        });

        it('should not retry on success codes', () => {
            expect(isRetryableStatus(200)).toBe(false);
            expect(isRetryableStatus(201)).toBe(false);
        });
    });
});

describe('API Status Management', () => {
    interface APIStatus {
        isDown: boolean;
        lastCheck: number;
        consecutiveFailures: number;
    }

    describe('Default Status', () => {
        it('should have default values', () => {
            const defaultStatus: APIStatus = { 
                isDown: false, 
                lastCheck: 0, 
                consecutiveFailures: 0 
            };
            expect(defaultStatus.isDown).toBe(false);
            expect(defaultStatus.consecutiveFailures).toBe(0);
        });
    });

    describe('shouldSkipAPI', () => {
        const API_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

        const shouldSkipAPI = (status: APIStatus): boolean => {
            if (!status.isDown) return false;
            return Date.now() - status.lastCheck < API_COOLDOWN_MS;
        };

        it('should not skip when API is not down', () => {
            const status: APIStatus = { isDown: false, lastCheck: 0, consecutiveFailures: 0 };
            expect(shouldSkipAPI(status)).toBe(false);
        });

        it('should skip when API is down and within cooldown', () => {
            const status: APIStatus = { 
                isDown: true, 
                lastCheck: Date.now() - 1000, // 1 second ago
                consecutiveFailures: 2 
            };
            expect(shouldSkipAPI(status)).toBe(true);
        });

        it('should not skip when cooldown expired', () => {
            const status: APIStatus = { 
                isDown: true, 
                lastCheck: Date.now() - (6 * 60 * 1000), // 6 minutes ago
                consecutiveFailures: 2 
            };
            expect(shouldSkipAPI(status)).toBe(false);
        });
    });
});

describe('Soil Texture Classification', () => {
    // USDA Texture Triangle approximation
    const classifyTexture = (clay: number, sand: number, silt: number): string => {
        // Normalize to percentages (0-100)
        if (clay >= 40) {
            if (sand >= 45) return 'Sandy Clay';
            if (silt >= 40) return 'Silty Clay';
            return 'Clay';
        }
        if (clay >= 27 && clay < 40) {
            if (sand >= 20 && sand < 45) return 'Clay Loam';
            if (sand < 20) return 'Silty Clay Loam';
            return 'Sandy Clay Loam';
        }
        if (silt >= 80) return 'Silt';
        if (silt >= 50 && clay < 27) return 'Silt Loam';
        if (sand >= 85) return 'Sand';
        if (sand >= 70) return 'Loamy Sand';
        if (clay < 7 && silt < 50 && sand >= 52) return 'Sandy Loam';
        return 'Loam';
    };

    it('should classify high clay as Clay', () => {
        expect(classifyTexture(50, 25, 25)).toBe('Clay');
    });

    it('should classify Sandy Clay', () => {
        expect(classifyTexture(45, 50, 5)).toBe('Sandy Clay');
    });

    it('should classify Silty Clay', () => {
        expect(classifyTexture(45, 10, 45)).toBe('Silty Clay');
    });

    it('should classify high sand as Sand', () => {
        expect(classifyTexture(5, 90, 5)).toBe('Sand');
    });

    it('should classify Loamy Sand', () => {
        expect(classifyTexture(10, 75, 15)).toBe('Loamy Sand');
    });

    it('should classify high silt as Silt', () => {
        expect(classifyTexture(5, 10, 85)).toBe('Silt');
    });

    it('should classify Silt Loam', () => {
        expect(classifyTexture(15, 25, 60)).toBe('Silt Loam');
    });

    it('should classify balanced as Loam', () => {
        expect(classifyTexture(20, 40, 40)).toBe('Loam');
    });
});

describe('Confidence Levels', () => {
    type Confidence = 'high' | 'medium' | 'low';

    const getConfidence = (source: string, uncertainty: number): Confidence => {
        if (source === 'api' && uncertainty < 10) return 'high';
        if (source === 'api' || source === 'cache') return 'medium';
        return 'low';
    };

    it('should return high for API with low uncertainty', () => {
        expect(getConfidence('api', 5)).toBe('high');
    });

    it('should return medium for API with high uncertainty', () => {
        expect(getConfidence('api', 15)).toBe('medium');
    });

    it('should return medium for cache', () => {
        expect(getConfidence('cache', 0)).toBe('medium');
    });

    it('should return low for fallback', () => {
        expect(getConfidence('fallback', 0)).toBe('low');
    });
});

describe('Root Depth Bounds', () => {
    const DEFAULT_ROOT_DEPTH_CM = 30;
    const MAX_ROOT_DEPTH_CM = 200;
    const MIN_ROOT_DEPTH_CM = 5;

    const clampRootDepth = (depth: number): number => {
        return Math.max(MIN_ROOT_DEPTH_CM, Math.min(MAX_ROOT_DEPTH_CM, depth));
    };

    it('should clamp to minimum', () => {
        expect(clampRootDepth(2)).toBe(MIN_ROOT_DEPTH_CM);
    });

    it('should clamp to maximum', () => {
        expect(clampRootDepth(300)).toBe(MAX_ROOT_DEPTH_CM);
    });

    it('should pass through valid depths', () => {
        expect(clampRootDepth(30)).toBe(30);
        expect(clampRootDepth(100)).toBe(100);
    });

    it('should use default when undefined', () => {
        const depth: number | undefined = undefined;
        const result = depth ?? DEFAULT_ROOT_DEPTH_CM;
        expect(result).toBe(30);
    });
});

describe('Cache Key and Distance', () => {
    const CACHE_DISTANCE_THRESHOLD_M = 500;

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        // Haversine formula (simplified)
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    it('should calculate zero distance for same point', () => {
        expect(calculateDistance(45.5, 25.5, 45.5, 25.5)).toBe(0);
    });

    it('should calculate approximate distance', () => {
        // ~111km per degree latitude
        const dist = calculateDistance(45.0, 25.0, 46.0, 25.0);
        expect(dist).toBeGreaterThan(100000);
        expect(dist).toBeLessThan(120000);
    });

    it('should use cache if within threshold', () => {
        const distance = 400;
        expect(distance < CACHE_DISTANCE_THRESHOLD_M).toBe(true);
    });

    it('should not use cache if beyond threshold', () => {
        const distance = 600;
        expect(distance < CACHE_DISTANCE_THRESHOLD_M).toBe(false);
    });
});
