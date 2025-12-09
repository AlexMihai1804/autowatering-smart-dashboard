import { describe, it, expect } from 'vitest';
import {
    validateZoneConfig,
    formatTime,
    getDaysFromMask,
    formatDuration,
    formatVolume,
    getModeDisplayText,
    generateZoneSummary,
    createDaysMask,
    parseDaysMask
} from '../utils/wizardHelpers';
import type { UnifiedZoneConfig, ScheduleConfig } from '../types/wizard';

// Default schedule with all required fields
const DEFAULT_TEST_SCHEDULE: ScheduleConfig = {
    enabled: true,
    type: 'daily',
    daysMask: 0b1111111,
    hour: 6,
    minute: 0,
    value: 15,
    useSolarTiming: false,
    solarEvent: 'sunrise',
    solarOffsetMinutes: 0
};

// Type for test overrides - allows partial schedule
type ZoneConfigOverrides = Omit<Partial<UnifiedZoneConfig>, 'schedule'> & {
    schedule?: Partial<ScheduleConfig>;
};

// Helper to create minimal valid zone config
const createZoneConfig = (overrides: ZoneConfigOverrides = {}): UnifiedZoneConfig => {
    const { schedule, ...rest } = overrides;

    return {
        channelId: 0,
        enabled: false,
        skipped: false,
        name: 'Test Zone',
        wateringMode: 'duration',
        plant: null,
        soil: null,
        irrigationMethod: null,
        location: null,
        sunExposure: 80,
        coverageType: 'area',
        coverageValue: 10,
        plantingDate: null,
        maxVolumeLimit: 50,
        // New fields for onboarding
        soilAutoDetected: false,
        soilDetectionConfidence: null,
        customSoilFromDetection: null,
        enableCycleSoak: false,
        cycleSoakAutoEnabled: false,
        cycleMinutes: 5,
        soakMinutes: 10,
        schedule: schedule ? { ...DEFAULT_TEST_SCHEDULE, ...schedule } : DEFAULT_TEST_SCHEDULE,
        ...rest
    };
};

describe('wizardHelpers', () => {
    describe('validateZoneConfig', () => {
        it('should validate a complete duration mode config', () => {
            const config = createZoneConfig({
                wateringMode: 'duration',
                name: 'My Zone',
                schedule: { enabled: true, type: 'daily', daysMask: 0b1111111, hour: 6, minute: 0, value: 15 }
            });
            const result = validateZoneConfig(config);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail if name is missing', () => {
            const config = createZoneConfig({ name: '' });
            const result = validateZoneConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Numele zonei este obligatoriu');
        });

        it('should fail if name is whitespace only', () => {
            const config = createZoneConfig({ name: '   ' });
            const result = validateZoneConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Numele zonei este obligatoriu');
        });

        describe('FAO-56 mode validation', () => {
            it('should require plant for fao56_auto mode', () => {
                const config = createZoneConfig({
                    wateringMode: 'fao56_auto',
                    plant: null,
                    soil: { id: 1, texture: 'Loam' } as any,
                    location: { latitude: 44, longitude: 26, source: 'gps' }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Selectează o plantă');
            });

            it('should require soil for fao56_eco mode', () => {
                const config = createZoneConfig({
                    wateringMode: 'fao56_eco',
                    plant: { id: 1, common_name_en: 'Tomato' } as any,
                    soil: null,
                    location: { latitude: 44, longitude: 26, source: 'gps' }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Selectează un tip de sol');
            });

            it('should require location for FAO-56 modes', () => {
                const config = createZoneConfig({
                    wateringMode: 'fao56_auto',
                    plant: { id: 1, common_name_en: 'Tomato' } as any,
                    soil: { id: 1, texture: 'Loam' } as any,
                    location: null
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Selectează locația GPS');
            });

            it('should require valid coverage value', () => {
                const config = createZoneConfig({
                    wateringMode: 'fao56_auto',
                    plant: { id: 1, common_name_en: 'Tomato' } as any,
                    soil: { id: 1, texture: 'Loam' } as any,
                    location: { latitude: 44, longitude: 26, source: 'gps' },
                    coverageValue: 0
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Introdu suprafața/numărul de plante');
            });

            it('should pass with complete FAO-56 config', () => {
                const config = createZoneConfig({
                    wateringMode: 'fao56_auto',
                    name: 'Garden',
                    plant: { id: 1, common_name_en: 'Tomato' } as any,
                    soil: { id: 1, texture: 'Loam' } as any,
                    location: { latitude: 44, longitude: 26, source: 'gps' },
                    coverageValue: 10
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(true);
            });
        });

        describe('Manual mode validation', () => {
            it('should require enabled schedule for duration mode', () => {
                const config = createZoneConfig({
                    wateringMode: 'duration',
                    schedule: { enabled: false, type: 'daily', daysMask: 0, hour: 6, minute: 0, value: 15 }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Activează programul');
            });

            it('should require positive value for volume mode', () => {
                const config = createZoneConfig({
                    wateringMode: 'volume',
                    schedule: { enabled: true, type: 'daily', daysMask: 0b1111111, hour: 6, minute: 0, value: 0 }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Introdu volumul de irigare');
            });

            it('should require positive value for duration mode', () => {
                const config = createZoneConfig({
                    wateringMode: 'duration',
                    schedule: { enabled: true, type: 'daily', daysMask: 0b1111111, hour: 6, minute: 0, value: -1 }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Introdu durata de irigare');
            });
        });
    });

    describe('formatTime', () => {
        it('should format single digit hour and minute', () => {
            expect(formatTime(6, 5)).toBe('06:05');
        });

        it('should format double digit hour and minute', () => {
            expect(formatTime(14, 30)).toBe('14:30');
        });

        it('should format midnight', () => {
            expect(formatTime(0, 0)).toBe('00:00');
        });

        it('should format end of day', () => {
            expect(formatTime(23, 59)).toBe('23:59');
        });
    });

    describe('getDaysFromMask', () => {
        it('should return "Zilnic" for all days', () => {
            expect(getDaysFromMask(0b1111111)).toBe('Zilnic');
        });

        it('should return "Niciuna" for no days', () => {
            expect(getDaysFromMask(0)).toBe('Niciuna');
        });

        it('should return "Zile lucrătoare" for weekdays', () => {
            expect(getDaysFromMask(0b0011111)).toBe('Zile lucrătoare');
        });

        it('should return "Weekend" for Saturday and Sunday', () => {
            expect(getDaysFromMask(0b1100000)).toBe('Weekend');
        });

        it('should return individual days for partial selection', () => {
            const result = getDaysFromMask(0b0000101); // Monday and Wednesday
            expect(result).toBe('Lu, Mi');
        });

        it('should return Monday only', () => {
            expect(getDaysFromMask(0b0000001)).toBe('Lu');
        });

        it('should return Sunday only', () => {
            expect(getDaysFromMask(0b1000000)).toBe('Du');
        });
    });

    describe('formatDuration', () => {
        it('should format minutes under 60', () => {
            expect(formatDuration(15)).toBe('15 min');
            expect(formatDuration(45)).toBe('45 min');
        });

        it('should format exactly 60 minutes', () => {
            expect(formatDuration(60)).toBe('1h');
        });

        it('should format hours with minutes', () => {
            expect(formatDuration(90)).toBe('1h 30min');
        });

        it('should format multiple hours', () => {
            expect(formatDuration(120)).toBe('2h');
        });

        it('should format complex duration', () => {
            expect(formatDuration(150)).toBe('2h 30min');
        });
    });

    describe('formatVolume', () => {
        it('should format small volumes in ml', () => {
            expect(formatVolume(0.5)).toBe('500 ml');
            expect(formatVolume(0.1)).toBe('100 ml');
        });

        it('should format volumes of 1L or more in liters', () => {
            expect(formatVolume(1)).toBe('1.0 L');
            expect(formatVolume(2.5)).toBe('2.5 L');
        });

        it('should format large volumes', () => {
            expect(formatVolume(100)).toBe('100.0 L');
        });
    });

    describe('getModeDisplayText', () => {
        it('should return correct labels for each mode', () => {
            expect(getModeDisplayText('fao56_auto')).toBe('FAO-56 Auto');
            expect(getModeDisplayText('fao56_eco')).toBe('FAO-56 Eco');
            expect(getModeDisplayText('duration')).toBe('Timp');
            expect(getModeDisplayText('volume')).toBe('Volum');
        });
    });

    describe('generateZoneSummary', () => {
        it('should generate summary for duration mode', () => {
            const config = createZoneConfig({
                wateringMode: 'duration',
                schedule: { enabled: true, type: 'daily', daysMask: 0b1111111, hour: 6, minute: 30, value: 15 }
            });
            const summary = generateZoneSummary(config);
            
            expect(summary).toContain('Mod: Timp');
            expect(summary).toContain('Durată: 15 min');
            expect(summary).toContain('Program: 06:30, Zilnic');
        });

        it('should generate summary for volume mode', () => {
            const config = createZoneConfig({
                wateringMode: 'volume',
                schedule: { enabled: true, type: 'daily', daysMask: 0b0000001, hour: 7, minute: 0, value: 2.5 }
            });
            const summary = generateZoneSummary(config);
            
            expect(summary).toContain('Mod: Volum');
            expect(summary).toContain('Volum: 2.5 L');
        });

        it('should generate summary for FAO-56 mode', () => {
            const config = createZoneConfig({
                wateringMode: 'fao56_auto',
                plant: { id: 1, common_name_en: 'Tomato' } as any,
                soil: { id: 1, texture: 'Loam' } as any,
                irrigationMethod: { id: 1, name: 'Drip' } as any,
                location: { latitude: 44.4268, longitude: 26.1025, source: 'gps' },
                coverageType: 'area',
                coverageValue: 25,
                schedule: { enabled: true, type: 'daily', daysMask: 0b1111111, hour: 6, minute: 0, value: 0 }
            });
            const summary = generateZoneSummary(config);
            
            expect(summary).toContain('Mod: FAO-56 Auto');
            expect(summary).toContain('Plantă: Tomato');
            expect(summary).toContain('Sol: Loam');
            expect(summary).toContain('Irigație: Drip');
            expect(summary).toContain('Locație: 44.4268, 26.1025');
            expect(summary).toContain('Acoperire: 25 m²');
        });

        it('should handle plants coverage type', () => {
            const config = createZoneConfig({
                wateringMode: 'fao56_eco',
                plant: { id: 1, common_name_en: 'Rose' } as any,
                soil: { id: 1, texture: 'Sandy' } as any,
                location: { latitude: 45, longitude: 25, source: 'map' },
                coverageType: 'plants',
                coverageValue: 50,
                schedule: { enabled: true, type: 'daily', daysMask: 0b0011111, hour: 8, minute: 0, value: 0 }
            });
            const summary = generateZoneSummary(config);
            
            expect(summary).toContain('Acoperire: 50 plante');
        });

        it('should not include schedule line if disabled', () => {
            const config = createZoneConfig({
                wateringMode: 'duration',
                schedule: { enabled: false, type: 'daily', daysMask: 0, hour: 0, minute: 0, value: 15 }
            });
            const summary = generateZoneSummary(config);
            
            expect(summary.some(line => line.startsWith('Program:'))).toBe(false);
        });

        it('should include schedule line if enabled', () => {
            const config = createZoneConfig({
                wateringMode: 'duration',
                schedule: { enabled: true, type: 'daily', daysMask: 0b1111111, hour: 8, minute: 30, value: 15 }
            });
            const summary = generateZoneSummary(config);
            
            expect(summary.some(line => line.startsWith('Program:'))).toBe(true);
            expect(summary).toContain('Program: 08:30, Zilnic');
        });

        it('should handle FAO-56 without optional fields', () => {
            const config = createZoneConfig({
                wateringMode: 'fao56_auto',
                plant: undefined,
                soil: undefined,
                irrigationMethod: undefined,
                location: undefined,
                coverageType: 'area',
                coverageValue: 10,
                schedule: { enabled: false, type: 'daily', daysMask: 0, hour: 0, minute: 0, value: 0 }
            });
            const summary = generateZoneSummary(config);
            
            expect(summary).toContain('Mod: FAO-56 Auto');
            expect(summary).toContain('Acoperire: 10 m²');
            // Should NOT contain these lines when undefined
            expect(summary.some(line => line.startsWith('Plantă:'))).toBe(false);
            expect(summary.some(line => line.startsWith('Sol:'))).toBe(false);
            expect(summary.some(line => line.startsWith('Irigație:'))).toBe(false);
            expect(summary.some(line => line.startsWith('Locație:'))).toBe(false);
        });
    });

    describe('createDaysMask', () => {
        it('should create mask for no days', () => {
            expect(createDaysMask({})).toBe(0);
        });

        it('should create mask for all days', () => {
            expect(createDaysMask({
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true
            })).toBe(0b1111111);
        });

        it('should create mask for weekdays', () => {
            expect(createDaysMask({
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true
            })).toBe(0b0011111);
        });

        it('should create mask for weekend', () => {
            expect(createDaysMask({
                saturday: true,
                sunday: true
            })).toBe(0b1100000);
        });

        it('should create mask for Monday only', () => {
            expect(createDaysMask({ monday: true })).toBe(0b0000001);
        });

        it('should create mask for Sunday only', () => {
            expect(createDaysMask({ sunday: true })).toBe(0b1000000);
        });
    });

    describe('parseDaysMask', () => {
        it('should parse mask for no days', () => {
            const result = parseDaysMask(0);
            expect(result.monday).toBe(false);
            expect(result.tuesday).toBe(false);
            expect(result.wednesday).toBe(false);
            expect(result.thursday).toBe(false);
            expect(result.friday).toBe(false);
            expect(result.saturday).toBe(false);
            expect(result.sunday).toBe(false);
        });

        it('should parse mask for all days', () => {
            const result = parseDaysMask(0b1111111);
            expect(result.monday).toBe(true);
            expect(result.tuesday).toBe(true);
            expect(result.wednesday).toBe(true);
            expect(result.thursday).toBe(true);
            expect(result.friday).toBe(true);
            expect(result.saturday).toBe(true);
            expect(result.sunday).toBe(true);
        });

        it('should parse mask for weekdays', () => {
            const result = parseDaysMask(0b0011111);
            expect(result.monday).toBe(true);
            expect(result.tuesday).toBe(true);
            expect(result.wednesday).toBe(true);
            expect(result.thursday).toBe(true);
            expect(result.friday).toBe(true);
            expect(result.saturday).toBe(false);
            expect(result.sunday).toBe(false);
        });

        it('should be inverse of createDaysMask', () => {
            const original = {
                monday: true,
                tuesday: false,
                wednesday: true,
                thursday: false,
                friday: true,
                saturday: true,
                sunday: false
            };
            const mask = createDaysMask(original);
            const parsed = parseDaysMask(mask);
            expect(parsed).toEqual(original);
        });
    });
});
