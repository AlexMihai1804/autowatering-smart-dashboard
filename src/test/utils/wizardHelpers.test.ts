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
} from '../../utils/wizardHelpers';
import type { UnifiedZoneConfig, WateringMode } from '../../types/wizard';

// Helper to create a minimal valid zone config
const createBaseConfig = (overrides: Partial<UnifiedZoneConfig> = {}): UnifiedZoneConfig => ({
    name: 'Test Zone',
    wateringMode: 'duration',
    coverageType: 'area',
    coverageValue: 10,
    irrigationMethod: null,
    plant: null,
    soil: null,
    location: null,
    schedule: {
        enabled: true,
        type: 'daily',
        hour: 6,
        minute: 0,
        daysMask: 127,
        value: 30,
        useSolarTiming: false,
        solarEvent: 'sunrise',
        solarOffsetMinutes: 0
    },
    ...overrides
});

describe('wizardHelpers.ts', () => {
    describe('validateZoneConfig', () => {
        it('should return valid for a complete duration config', () => {
            const config = createBaseConfig();
            const result = validateZoneConfig(config);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should require zone name', () => {
            const config = createBaseConfig({ name: '' });
            const result = validateZoneConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Numele zonei este obligatoriu');
        });

        it('should require zone name (whitespace only)', () => {
            const config = createBaseConfig({ name: '   ' });
            const result = validateZoneConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Numele zonei este obligatoriu');
        });

        describe('FAO-56 Auto mode validation', () => {
            it('should require plant for fao56_auto mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_auto',
                    plant: null,
                    soil: { texture: 'Loamy' } as any,
                    location: { latitude: 44.4, longitude: 26.0 }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Selectează o plantă');
            });

            it('should require soil for fao56_auto mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_auto',
                    plant: { common_name_en: 'Tomato' } as any,
                    soil: null,
                    location: { latitude: 44.4, longitude: 26.0 }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Selectează un tip de sol');
            });

            it('should require location for fao56_auto mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_auto',
                    plant: { common_name_en: 'Tomato' } as any,
                    soil: { texture: 'Loamy' } as any,
                    location: null
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Selectează locația GPS');
            });

            it('should require positive coverage value for fao56_auto mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_auto',
                    plant: { common_name_en: 'Tomato' } as any,
                    soil: { texture: 'Loamy' } as any,
                    location: { latitude: 44.4, longitude: 26.0 },
                    coverageValue: 0
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Introdu suprafața/numărul de plante');
            });
        });

        describe('FAO-56 Eco mode validation', () => {
            it('should validate fao56_eco mode same as fao56_auto', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_eco',
                    plant: null,
                    soil: null,
                    location: null,
                    coverageValue: 0
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Selectează o plantă');
                expect(result.errors).toContain('Selectează un tip de sol');
                expect(result.errors).toContain('Selectează locația GPS');
                expect(result.errors).toContain('Introdu suprafața/numărul de plante');
            });
        });

        describe('Duration mode validation', () => {
            it('should require enabled schedule for duration mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'duration',
                    schedule: { ...createBaseConfig().schedule, enabled: false }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Activează programul');
            });

            it('should require positive duration value', () => {
                const config = createBaseConfig({
                    wateringMode: 'duration',
                    schedule: { ...createBaseConfig().schedule, value: 0 }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Introdu durata de irigare');
            });

            it('should reject auto schedule type for duration mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'duration',
                    schedule: { ...createBaseConfig().schedule, type: 'auto' }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Alege program zilnic sau periodic pentru modurile manuale');
            });
        });

        describe('Volume mode validation', () => {
            it('should require positive volume value', () => {
                const config = createBaseConfig({
                    wateringMode: 'volume',
                    schedule: { ...createBaseConfig().schedule, value: 0 }
                });
                const result = validateZoneConfig(config);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Introdu volumul de irigare');
            });
        });
    });

    describe('formatTime', () => {
        it('should format single digit hour and minute with leading zeros', () => {
            expect(formatTime(6, 5)).toBe('06:05');
        });

        it('should format double digit hour and minute', () => {
            expect(formatTime(12, 30)).toBe('12:30');
        });

        it('should handle midnight', () => {
            expect(formatTime(0, 0)).toBe('00:00');
        });

        it('should handle 23:59', () => {
            expect(formatTime(23, 59)).toBe('23:59');
        });
    });

    describe('getDaysFromMask', () => {
        it('should return "Zilnic" for all days (127)', () => {
            expect(getDaysFromMask(127)).toBe('Zilnic');
        });

        it('should return "Niciuna" for no days (0)', () => {
            expect(getDaysFromMask(0)).toBe('Niciuna');
        });

        it('should return "Zile lucrătoare" for weekdays (31)', () => {
            expect(getDaysFromMask(0b0011111)).toBe('Zile lucrătoare');
        });

        it('should return "Weekend" for Sat-Sun (96)', () => {
            expect(getDaysFromMask(0b1100000)).toBe('Weekend');
        });

        it('should return comma-separated days for custom selection', () => {
            // Monday and Wednesday (1 + 4 = 5)
            expect(getDaysFromMask(0b0000101)).toBe('Lu, Mi');
        });

        it('should return single day name', () => {
            expect(getDaysFromMask(0b0000001)).toBe('Lu');
            expect(getDaysFromMask(0b0000010)).toBe('Ma');
            expect(getDaysFromMask(0b1000000)).toBe('Du');
        });
    });

    describe('formatDuration', () => {
        it('should format minutes only for less than 60', () => {
            expect(formatDuration(30)).toBe('30 min');
            expect(formatDuration(1)).toBe('1 min');
            expect(formatDuration(59)).toBe('59 min');
        });

        it('should format hours only for exact hours', () => {
            expect(formatDuration(60)).toBe('1h');
            expect(formatDuration(120)).toBe('2h');
        });

        it('should format hours and minutes', () => {
            expect(formatDuration(90)).toBe('1h 30min');
            expect(formatDuration(150)).toBe('2h 30min');
        });
    });

    describe('formatVolume', () => {
        it('should format milliliters for less than 1L', () => {
            expect(formatVolume(0.5)).toBe('500 ml');
            expect(formatVolume(0.1)).toBe('100 ml');
            expect(formatVolume(0.25)).toBe('250 ml');
        });

        it('should format liters with one decimal', () => {
            expect(formatVolume(1)).toBe('1.0 L');
            expect(formatVolume(2.5)).toBe('2.5 L');
            expect(formatVolume(10)).toBe('10.0 L');
        });
    });

    describe('getModeDisplayText', () => {
        it('should return correct text for each mode', () => {
            expect(getModeDisplayText('fao56_auto')).toBe('FAO-56 Auto');
            expect(getModeDisplayText('fao56_eco')).toBe('FAO-56 Eco');
            expect(getModeDisplayText('duration')).toBe('Timp');
            expect(getModeDisplayText('volume')).toBe('Volum');
        });
    });

    describe('generateZoneSummary', () => {
        it('should include mode in summary', () => {
            const config = createBaseConfig();
            const summary = generateZoneSummary(config);
            expect(summary).toContain('Mod: Timp');
        });

        it('should include duration for duration mode', () => {
            const config = createBaseConfig({
                wateringMode: 'duration',
                schedule: { ...createBaseConfig().schedule, value: 30 }
            });
            const summary = generateZoneSummary(config);
            expect(summary).toContain('Durată: 30 min');
        });

        it('should include volume for volume mode', () => {
            const config = createBaseConfig({
                wateringMode: 'volume',
                schedule: { ...createBaseConfig().schedule, value: 5 }
            });
            const summary = generateZoneSummary(config);
            expect(summary).toContain('Volum: 5.0 L');
        });

        it('should include plant details for FAO-56 modes', () => {
            const config = createBaseConfig({
                wateringMode: 'fao56_auto',
                plant: { common_name_en: 'Tomato' } as any,
                soil: { texture: 'Loamy' } as any,
                irrigationMethod: { name: 'Drip' } as any,
                location: { latitude: 44.4268, longitude: 26.1025 },
                coverageType: 'area',
                coverageValue: 50
            });
            const summary = generateZoneSummary(config);
            expect(summary).toContain('Mod: FAO-56 Auto');
            expect(summary).toContain('Plantă: Tomato');
            expect(summary).toContain('Sol: Loamy');
            expect(summary).toContain('Irigație: Drip');
            expect(summary.some(line => line.includes('Locație:'))).toBe(true);
            expect(summary).toContain('Acoperire: 50 m²');
        });

        it('should show plant count when coverage type is plants', () => {
            const config = createBaseConfig({
                wateringMode: 'fao56_auto',
                plant: { common_name_en: 'Tomato' } as any,
                soil: { texture: 'Loamy' } as any,
                location: { latitude: 44.4, longitude: 26.0 },
                coverageType: 'plants',
                coverageValue: 20
            });
            const summary = generateZoneSummary(config);
            expect(summary).toContain('Acoperire: 20 plante');
        });

        it('should include schedule information with time and days', () => {
            const config = createBaseConfig({
                schedule: {
                    ...createBaseConfig().schedule,
                    enabled: true,
                    type: 'daily',
                    hour: 6,
                    minute: 30,
                    daysMask: 127
                }
            });
            const summary = generateZoneSummary(config);
            expect(summary.some(line => line.includes('Program:') && line.includes('06:30'))).toBe(true);
        });

        it('should include solar timing info when enabled', () => {
            const config = createBaseConfig({
                schedule: {
                    ...createBaseConfig().schedule,
                    enabled: true,
                    type: 'daily',
                    useSolarTiming: true,
                    solarEvent: 'sunrise',
                    solarOffsetMinutes: 30
                }
            });
            const summary = generateZoneSummary(config);
            expect(summary.some(line => line.includes('solar') && line.includes('răsărit'))).toBe(true);
        });
    });

    describe('createDaysMask', () => {
        it('should create mask for all days', () => {
            const mask = createDaysMask({
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true
            });
            expect(mask).toBe(127);
        });

        it('should create mask for weekdays only', () => {
            const mask = createDaysMask({
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: false,
                sunday: false
            });
            expect(mask).toBe(0b0011111);
        });

        it('should create mask for weekend only', () => {
            const mask = createDaysMask({
                saturday: true,
                sunday: true
            });
            expect(mask).toBe(0b1100000);
        });

        it('should create mask for single day', () => {
            expect(createDaysMask({ monday: true })).toBe(1);
            expect(createDaysMask({ sunday: true })).toBe(64);
        });

        it('should return 0 for no days selected', () => {
            expect(createDaysMask({})).toBe(0);
        });
    });

    describe('parseDaysMask', () => {
        it('should parse all days (127)', () => {
            const days = parseDaysMask(127);
            expect(days.monday).toBe(true);
            expect(days.tuesday).toBe(true);
            expect(days.wednesday).toBe(true);
            expect(days.thursday).toBe(true);
            expect(days.friday).toBe(true);
            expect(days.saturday).toBe(true);
            expect(days.sunday).toBe(true);
        });

        it('should parse no days (0)', () => {
            const days = parseDaysMask(0);
            expect(days.monday).toBe(false);
            expect(days.tuesday).toBe(false);
            expect(days.wednesday).toBe(false);
            expect(days.thursday).toBe(false);
            expect(days.friday).toBe(false);
            expect(days.saturday).toBe(false);
            expect(days.sunday).toBe(false);
        });

        it('should parse weekdays (31)', () => {
            const days = parseDaysMask(0b0011111);
            expect(days.monday).toBe(true);
            expect(days.friday).toBe(true);
            expect(days.saturday).toBe(false);
            expect(days.sunday).toBe(false);
        });

        it('should be inverse of createDaysMask', () => {
            const original = {
                monday: true,
                tuesday: false,
                wednesday: true,
                thursday: false,
                friday: true,
                saturday: false,
                sunday: true
            };
            const mask = createDaysMask(original);
            const parsed = parseDaysMask(mask);
            expect(parsed).toEqual(original);
        });
    });
});
