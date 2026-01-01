/**
 * QRCodeSharing Component Tests
 * 
 * Tests for QR code generation utilities and component logic
 */
import { describe, it, expect } from 'vitest';

// Constants from component
const EXPORT_VERSION = '1.0';

// Helper function: compressZoneConfig (mirrored from component)
interface ZoneConfig {
    name: string;
    enabled: boolean;
    wateringMode: string;
    plant?: { id: number };
    soil?: { id: number };
    irrigationMethod?: { id: number };
    coverageValue?: number;
    coverageType?: string;
    sunExposure?: number;
    enableCycleSoak?: boolean;
    cycleMinutes?: number;
    soakMinutes?: number;
    maxVolumeLimit?: number;
}

const compressZoneConfig = (zones: ZoneConfig[]) => {
    return zones.map(z => ({
        n: z.name,
        e: z.enabled,
        m: z.wateringMode,
        p: z.plant?.id,
        s: z.soil?.id,
        i: z.irrigationMethod?.id,
        c: z.coverageValue,
        ct: z.coverageType,
        se: z.sunExposure,
        cs: z.enableCycleSoak,
        csw: z.cycleMinutes,
        csp: z.soakMinutes,
        mv: z.maxVolumeLimit,
    }));
};

// Helper function: generateShareUrl (mirrored from component)
const generateShareUrl = (data: string): string => {
    const encoded = btoa(encodeURIComponent(data));
    return `irrigation://import?data=${encoded}`;
};

// Helper function: simpleHash (mirrored from component)
const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

describe('QRCodeSharing', () => {
    describe('EXPORT_VERSION', () => {
        it('should be version 1.0', () => {
            expect(EXPORT_VERSION).toBe('1.0');
        });
    });

    describe('compressZoneConfig', () => {
        it('should compress a simple zone config', () => {
            const zones: ZoneConfig[] = [{
                name: 'Zone 1',
                enabled: true,
                wateringMode: 'fao56_auto',
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed.length).toBe(1);
            expect(compressed[0].n).toBe('Zone 1');
            expect(compressed[0].e).toBe(true);
            expect(compressed[0].m).toBe('fao56_auto');
        });

        it('should compress zone with plant', () => {
            const zones: ZoneConfig[] = [{
                name: 'Tomatoes',
                enabled: true,
                wateringMode: 'fao56_auto',
                plant: { id: 42 },
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed[0].p).toBe(42);
        });

        it('should compress zone with soil', () => {
            const zones: ZoneConfig[] = [{
                name: 'Garden',
                enabled: true,
                wateringMode: 'fao56_auto',
                soil: { id: 5 },
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed[0].s).toBe(5);
        });

        it('should compress zone with irrigation method', () => {
            const zones: ZoneConfig[] = [{
                name: 'Lawn',
                enabled: true,
                wateringMode: 'scheduled',
                irrigationMethod: { id: 3 },
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed[0].i).toBe(3);
        });

        it('should compress zone with coverage', () => {
            const zones: ZoneConfig[] = [{
                name: 'Garden Bed',
                enabled: true,
                wateringMode: 'fao56_auto',
                coverageValue: 25,
                coverageType: 'area',
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed[0].c).toBe(25);
            expect(compressed[0].ct).toBe('area');
        });

        it('should compress zone with sun exposure', () => {
            const zones: ZoneConfig[] = [{
                name: 'Sunny Spot',
                enabled: true,
                wateringMode: 'fao56_auto',
                sunExposure: 90,
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed[0].se).toBe(90);
        });

        it('should compress zone with cycle soak settings', () => {
            const zones: ZoneConfig[] = [{
                name: 'Clay Soil',
                enabled: true,
                wateringMode: 'fao56_auto',
                enableCycleSoak: true,
                cycleMinutes: 3,
                soakMinutes: 20,
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed[0].cs).toBe(true);
            expect(compressed[0].csw).toBe(3);
            expect(compressed[0].csp).toBe(20);
        });

        it('should compress zone with max volume limit', () => {
            const zones: ZoneConfig[] = [{
                name: 'Pot',
                enabled: true,
                wateringMode: 'manual',
                maxVolumeLimit: 5000,
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed[0].mv).toBe(5000);
        });

        it('should compress multiple zones', () => {
            const zones: ZoneConfig[] = [
                { name: 'Zone 1', enabled: true, wateringMode: 'fao56_auto' },
                { name: 'Zone 2', enabled: false, wateringMode: 'scheduled' },
                { name: 'Zone 3', enabled: true, wateringMode: 'manual' },
            ];

            const compressed = compressZoneConfig(zones);

            expect(compressed.length).toBe(3);
            expect(compressed[0].n).toBe('Zone 1');
            expect(compressed[1].n).toBe('Zone 2');
            expect(compressed[2].n).toBe('Zone 3');
        });

        it('should handle empty zones array', () => {
            const zones: ZoneConfig[] = [];
            const compressed = compressZoneConfig(zones);
            expect(compressed.length).toBe(0);
        });

        it('should handle undefined optional fields', () => {
            const zones: ZoneConfig[] = [{
                name: 'Minimal',
                enabled: true,
                wateringMode: 'manual',
            }];

            const compressed = compressZoneConfig(zones);

            expect(compressed[0].p).toBeUndefined();
            expect(compressed[0].s).toBeUndefined();
            expect(compressed[0].i).toBeUndefined();
            expect(compressed[0].c).toBeUndefined();
        });
    });

    describe('generateShareUrl', () => {
        it('should generate URL with encoded data', () => {
            const data = 'test data';
            const url = generateShareUrl(data);

            expect(url).toContain('irrigation://import?data=');
        });

        it('should encode data in base64', () => {
            const data = 'hello world';
            const url = generateShareUrl(data);
            
            const encodedPart = url.split('data=')[1];
            expect(encodedPart).toBeDefined();
            
            // Should be valid base64
            expect(() => atob(encodedPart)).not.toThrow();
        });

        it('should handle JSON data', () => {
            const data = JSON.stringify({ zones: [{ name: 'Test' }] });
            const url = generateShareUrl(data);

            expect(url).toContain('irrigation://import?data=');
            
            // Decode and verify
            const encodedPart = url.split('data=')[1];
            const decoded = decodeURIComponent(atob(encodedPart));
            expect(decoded).toBe(data);
        });

        it('should handle special characters', () => {
            const data = 'Țară română: 100% 日本語';
            const url = generateShareUrl(data);

            // Should not throw
            expect(url).toContain('irrigation://import?data=');
        });

        it('should handle empty string', () => {
            const data = '';
            const url = generateShareUrl(data);

            expect(url).toBe('irrigation://import?data=');
        });
    });

    describe('simpleHash', () => {
        it('should return a number', () => {
            const hash = simpleHash('test');
            expect(typeof hash).toBe('number');
        });

        it('should return positive number', () => {
            const hash = simpleHash('test');
            expect(hash).toBeGreaterThanOrEqual(0);
        });

        it('should return same hash for same input', () => {
            const hash1 = simpleHash('test string');
            const hash2 = simpleHash('test string');
            expect(hash1).toBe(hash2);
        });

        it('should return different hashes for different inputs', () => {
            const hash1 = simpleHash('test1');
            const hash2 = simpleHash('test2');
            expect(hash1).not.toBe(hash2);
        });

        it('should handle empty string', () => {
            const hash = simpleHash('');
            expect(hash).toBe(0);
        });

        it('should handle long strings', () => {
            const longString = 'a'.repeat(10000);
            const hash = simpleHash(longString);
            expect(typeof hash).toBe('number');
            expect(Number.isFinite(hash)).toBe(true);
        });

        it('should handle unicode characters', () => {
            const hash = simpleHash('Hello 世界 🌍');
            expect(typeof hash).toBe('number');
            expect(hash).toBeGreaterThanOrEqual(0);
        });

        it('should have deterministic output', () => {
            const inputs = ['a', 'b', 'ab', 'ba', 'abc', '123'];
            const hashes = inputs.map(simpleHash);
            
            // All hashes should be unique for these different inputs
            const uniqueHashes = new Set(hashes);
            expect(uniqueHashes.size).toBe(hashes.length);
        });
    });

    describe('Export data structure', () => {
        it('should create valid export data object', () => {
            const zones: ZoneConfig[] = [{
                name: 'Zone 1',
                enabled: true,
                wateringMode: 'fao56_auto',
            }];

            const compressed = compressZoneConfig(zones.filter(z => z.enabled));
            const data = JSON.stringify({
                v: EXPORT_VERSION,
                z: compressed,
            });

            const parsed = JSON.parse(data);
            expect(parsed.v).toBe('1.0');
            expect(parsed.z).toBeDefined();
            expect(parsed.z.length).toBe(1);
        });

        it('should filter out disabled zones', () => {
            const zones: ZoneConfig[] = [
                { name: 'Enabled', enabled: true, wateringMode: 'fao56_auto' },
                { name: 'Disabled', enabled: false, wateringMode: 'manual' },
            ];

            const compressed = compressZoneConfig(zones.filter(z => z.enabled));
            
            expect(compressed.length).toBe(1);
            expect(compressed[0].n).toBe('Enabled');
        });

        it('should produce compact JSON', () => {
            const zones: ZoneConfig[] = [{
                name: 'Zone',
                enabled: true,
                wateringMode: 'm',
            }];

            const compressed = compressZoneConfig(zones);
            const json = JSON.stringify({ v: EXPORT_VERSION, z: compressed });

            // Short property names should make it compact
            expect(json).not.toContain('wateringMode');
            expect(json).toContain('"m":"m"');
        });
    });

    describe('Component exports', () => {
        it('should export QRCodeSharing component', async () => {
            const module = await import('../../components/QRCodeSharing');
            expect(module.QRCodeSharing).toBeDefined();
            expect(typeof module.QRCodeSharing).toBe('function');
        });
    });
});
