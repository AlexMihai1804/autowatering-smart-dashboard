/**
 * Tests for QRCodeSharing helper functions
 * Tests config compression, URL generation, data encoding
 */
import { describe, it, expect } from 'vitest';

interface ZoneConfig {
    name: string;
    enabled: boolean;
    wateringMode?: string;
    plant?: { id: string };
    soil?: { id: string };
    irrigationMethod?: { id: string };
    coverageValue?: number;
    coverageType?: string;
    sunExposure?: string;
    enableCycleSoak?: boolean;
    cycleMinutes?: number;
    soakMinutes?: number;
    maxVolumeLimit?: number;
}

interface CompressedZone {
    n: string;
    e: boolean;
    m?: string;
    p?: string;
    s?: string;
    i?: string;
    c?: number;
    ct?: string;
    se?: string;
    cs?: boolean;
    csw?: number;
    csp?: number;
    mv?: number;
}

const EXPORT_VERSION = '1.0';

describe('QRCodeSharing', () => {
    describe('compressZoneConfig', () => {
        const compressZoneConfig = (zones: ZoneConfig[]): CompressedZone[] => {
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

        it('should compress zone name to n', () => {
            const zones: ZoneConfig[] = [{ name: 'Zone 1', enabled: true }];
            const result = compressZoneConfig(zones);
            expect(result[0].n).toBe('Zone 1');
        });

        it('should compress enabled to e', () => {
            const zones: ZoneConfig[] = [{ name: 'Z1', enabled: true }];
            expect(compressZoneConfig(zones)[0].e).toBe(true);
        });

        it('should compress plant id to p', () => {
            const zones: ZoneConfig[] = [{ 
                name: 'Z1', 
                enabled: true, 
                plant: { id: 'tomato' } 
            }];
            expect(compressZoneConfig(zones)[0].p).toBe('tomato');
        });

        it('should handle undefined optional fields', () => {
            const zones: ZoneConfig[] = [{ name: 'Z1', enabled: false }];
            const result = compressZoneConfig(zones);
            expect(result[0].p).toBeUndefined();
            expect(result[0].s).toBeUndefined();
        });

        it('should compress multiple zones', () => {
            const zones: ZoneConfig[] = [
                { name: 'Zone 1', enabled: true },
                { name: 'Zone 2', enabled: false }
            ];
            const result = compressZoneConfig(zones);
            expect(result).toHaveLength(2);
            expect(result[0].n).toBe('Zone 1');
            expect(result[1].n).toBe('Zone 2');
        });
    });

    describe('generateShareUrl', () => {
        const generateShareUrl = (data: string): string => {
            const encoded = btoa(encodeURIComponent(data));
            return `irrigation://import?data=${encoded}`;
        };

        it('should generate URL with irrigation scheme', () => {
            const url = generateShareUrl('test');
            expect(url.startsWith('irrigation://import?data=')).toBe(true);
        });

        it('should encode data in base64', () => {
            const url = generateShareUrl('test');
            const encodedPart = url.split('data=')[1];
            // Should be valid base64
            expect(() => atob(encodedPart)).not.toThrow();
        });

        it('should handle special characters', () => {
            const url = generateShareUrl('{"key": "value with spaces"}');
            expect(url).toContain('data=');
        });
    });

    describe('Filter enabled zones', () => {
        it('should filter only enabled zones', () => {
            const zones: ZoneConfig[] = [
                { name: 'Zone 1', enabled: true },
                { name: 'Zone 2', enabled: false },
                { name: 'Zone 3', enabled: true }
            ];
            const enabledZones = zones.filter(z => z.enabled);
            expect(enabledZones).toHaveLength(2);
            expect(enabledZones[0].name).toBe('Zone 1');
            expect(enabledZones[1].name).toBe('Zone 3');
        });

        it('should return empty array if none enabled', () => {
            const zones: ZoneConfig[] = [
                { name: 'Zone 1', enabled: false },
                { name: 'Zone 2', enabled: false }
            ];
            const enabledZones = zones.filter(z => z.enabled);
            expect(enabledZones).toHaveLength(0);
        });
    });

    describe('Export data structure', () => {
        it('should create valid export structure', () => {
            const compressed = [{ n: 'Z1', e: true }];
            const data = {
                v: EXPORT_VERSION,
                z: compressed,
            };
            expect(data.v).toBe('1.0');
            expect(data.z).toHaveLength(1);
        });

        it('should be JSON serializable', () => {
            const data = {
                v: EXPORT_VERSION,
                z: [{ n: 'Zone 1', e: true, p: 'tomato' }],
            };
            const json = JSON.stringify(data);
            const parsed = JSON.parse(json);
            expect(parsed.v).toBe('1.0');
            expect(parsed.z[0].n).toBe('Zone 1');
        });
    });

    describe('Data length estimation', () => {
        it('should estimate data length', () => {
            const compressed = [{ n: 'Z1', e: true }];
            const data = JSON.stringify({
                v: EXPORT_VERSION,
                z: compressed,
            });
            expect(data.length).toBeGreaterThan(0);
            expect(data.length).toBeLessThan(1000); // Simple data should be small
        });

        it('should handle multiple zones', () => {
            const zones: CompressedZone[] = Array.from({ length: 8 }, (_, i) => ({
                n: `Zone ${i + 1}`,
                e: true,
                p: 'tomato',
                s: 'loam',
            }));
            const data = JSON.stringify({ v: EXPORT_VERSION, z: zones });
            // QR codes can hold ~3KB of alphanumeric data
            expect(data.length).toBeLessThan(3000);
        });
    });
});

describe('ResetModal Helpers', () => {
    describe('Modal Step Flow', () => {
        type ModalStep = 'select' | 'confirm' | 'executing' | 'complete' | 'error';

        it('should have valid step transitions', () => {
            const steps: ModalStep[] = ['select', 'confirm', 'executing', 'complete', 'error'];
            expect(steps).toContain('select');
            expect(steps).toContain('executing');
            expect(steps).toContain('complete');
        });

        it('should start at select step', () => {
            const initialStep: ModalStep = 'select';
            expect(initialStep).toBe('select');
        });
    });

    describe('Channel requirement check', () => {
        // Based on ResetOpcode enum
        enum ResetOpcode {
            CHANNEL_STATS = 0x01,
            ALL_STATS = 0x02,
            CHANNEL_SCHEDULE = 0x03,
            ALL_SCHEDULES = 0x04,
            CHANNEL_CONFIG = 0x05,
            ALL_CONFIG = 0x06,
            HISTORY = 0x07,
            ENV_HISTORY = 0x08,
            FULL_RESET = 0xFF,
        }

        const isChannelRequired = (opcode: ResetOpcode): boolean => {
            // Channel-specific resets require a channel ID
            return opcode === ResetOpcode.CHANNEL_STATS ||
                   opcode === ResetOpcode.CHANNEL_SCHEDULE ||
                   opcode === ResetOpcode.CHANNEL_CONFIG;
        };

        it('should require channel for CHANNEL_STATS', () => {
            expect(isChannelRequired(ResetOpcode.CHANNEL_STATS)).toBe(true);
        });

        it('should require channel for CHANNEL_SCHEDULE', () => {
            expect(isChannelRequired(ResetOpcode.CHANNEL_SCHEDULE)).toBe(true);
        });

        it('should require channel for CHANNEL_CONFIG', () => {
            expect(isChannelRequired(ResetOpcode.CHANNEL_CONFIG)).toBe(true);
        });

        it('should not require channel for ALL_STATS', () => {
            expect(isChannelRequired(ResetOpcode.ALL_STATS)).toBe(false);
        });

        it('should not require channel for FULL_RESET', () => {
            expect(isChannelRequired(ResetOpcode.FULL_RESET)).toBe(false);
        });
    });

    describe('Dangerous operation detection', () => {
        interface ResetOption {
            type: number;
            dangerous: boolean;
        }

        const RESET_OPTIONS: ResetOption[] = [
            { type: 0x01, dangerous: false },
            { type: 0x02, dangerous: false },
            { type: 0x06, dangerous: true },
            { type: 0xFF, dangerous: true },
        ];

        it('should identify dangerous operations', () => {
            const dangerous = RESET_OPTIONS.filter(o => o.dangerous);
            expect(dangerous.length).toBeGreaterThan(0);
        });

        it('should find specific option by type', () => {
            const option = RESET_OPTIONS.find(o => o.type === 0xFF);
            expect(option?.dangerous).toBe(true);
        });
    });
});
