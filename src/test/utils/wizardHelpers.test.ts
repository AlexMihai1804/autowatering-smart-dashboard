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
import { translations, Language } from '../../i18n/translations';

const resolveTranslation = (key: string, language: Language = 'en'): string => {
    const keys = key.split('.');
    let result: unknown = translations[language];

    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = (result as Record<string, unknown>)[k];
        } else {
            return key;
        }
    }

    return typeof result === 'string' ? result : key;
};

const t = (key: string) => resolveTranslation(key, 'en');
const minutesShort = t('common.minutesShort');
const hoursShort = t('common.hoursShort');
const mlShort = t('common.mlShort');
const litersShort = t('common.litersShort');

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
            const result = validateZoneConfig(config, t);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should require zone name', () => {
            const config = createBaseConfig({ name: '' });
            const result = validateZoneConfig(config, t);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(t('wizard.validation.zoneNameRequired'));
        });

        it('should require zone name (whitespace only)', () => {
            const config = createBaseConfig({ name: '   ' });
            const result = validateZoneConfig(config, t);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(t('wizard.validation.zoneNameRequired'));
        });

        describe('FAO-56 Auto mode validation', () => {
            it('should require plant for fao56_auto mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_auto',
                    plant: null,
                    soil: { texture: 'Loamy' } as any,
                    location: { latitude: 44.4, longitude: 26.0 }
                });
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.plantRequired'));
            });

            it('should require soil for fao56_auto mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_auto',
                    plant: { common_name_en: 'Tomato' } as any,
                    soil: null,
                    location: { latitude: 44.4, longitude: 26.0 }
                });
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.soilRequired'));
            });

            it('should require location for fao56_auto mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_auto',
                    plant: { common_name_en: 'Tomato' } as any,
                    soil: { texture: 'Loamy' } as any,
                    location: null
                });
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.locationRequired'));
            });

            it('should require positive coverage value for fao56_auto mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'fao56_auto',
                    plant: { common_name_en: 'Tomato' } as any,
                    soil: { texture: 'Loamy' } as any,
                    location: { latitude: 44.4, longitude: 26.0 },
                    coverageValue: 0
                });
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.coverageRequired'));
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
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.plantRequired'));
                expect(result.errors).toContain(t('wizard.validation.soilRequired'));
                expect(result.errors).toContain(t('wizard.validation.locationRequired'));
                expect(result.errors).toContain(t('wizard.validation.coverageRequired'));
            });
        });

        describe('Duration mode validation', () => {
            it('should require enabled schedule for duration mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'duration',
                    schedule: { ...createBaseConfig().schedule, enabled: false }
                });
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.scheduleEnabled'));
            });

            it('should require positive duration value', () => {
                const config = createBaseConfig({
                    wateringMode: 'duration',
                    schedule: { ...createBaseConfig().schedule, value: 0 }
                });
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.durationRequired'));
            });

            it('should reject auto schedule type for duration mode', () => {
                const config = createBaseConfig({
                    wateringMode: 'duration',
                    schedule: { ...createBaseConfig().schedule, type: 'auto' }
                });
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.manualScheduleType'));
            });
        });

        describe('Volume mode validation', () => {
            it('should require positive volume value', () => {
                const config = createBaseConfig({
                    wateringMode: 'volume',
                    schedule: { ...createBaseConfig().schedule, value: 0 }
                });
                const result = validateZoneConfig(config, t);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(t('wizard.validation.volumeRequired'));
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
            expect(getDaysFromMask(127, t)).toBe(t('wizard.schedule.everyDay'));
        });

        it('should return "Niciuna" for no days (0)', () => {
            expect(getDaysFromMask(0, t)).toBe(t('wizard.schedule.none'));
        });

        it('should return "Zile lucrătoare" for weekdays (31)', () => {
            expect(getDaysFromMask(0b0011111, t)).toBe(t('wizard.schedule.weekdays'));
        });

        it('should return "Weekend" for Sat-Sun (96)', () => {
            expect(getDaysFromMask(0b1100000, t)).toBe(t('wizard.schedule.weekend'));
        });

        it('should return comma-separated days for custom selection', () => {
            // Monday and Wednesday (1 + 4 = 5)
            expect(getDaysFromMask(0b0000101, t)).toBe(`${t('wizard.schedule.days.mon')}, ${t('wizard.schedule.days.wed')}`);
        });

        it('should return single day name', () => {
            expect(getDaysFromMask(0b0000001, t)).toBe(t('wizard.schedule.days.mon'));
            expect(getDaysFromMask(0b0000010, t)).toBe(t('wizard.schedule.days.tue'));
            expect(getDaysFromMask(0b1000000, t)).toBe(t('wizard.schedule.days.sun'));
        });
    });

    describe('formatDuration', () => {
        it('should format minutes only for less than 60', () => {
            expect(formatDuration(30, t)).toBe(`30 ${minutesShort}`);
            expect(formatDuration(1, t)).toBe(`1 ${minutesShort}`);
            expect(formatDuration(59, t)).toBe(`59 ${minutesShort}`);
        });

        it('should format hours only for exact hours', () => {
            expect(formatDuration(60, t)).toBe(`1${hoursShort}`);
            expect(formatDuration(120, t)).toBe(`2${hoursShort}`);
        });

        it('should format hours and minutes', () => {
            expect(formatDuration(90, t)).toBe(`1${hoursShort} 30${minutesShort}`);
            expect(formatDuration(150, t)).toBe(`2${hoursShort} 30${minutesShort}`);
        });
    });

    describe('formatVolume', () => {
        it('should format milliliters for less than 1L', () => {
            expect(formatVolume(0.5, t)).toBe(`500 ${mlShort}`);
            expect(formatVolume(0.1, t)).toBe(`100 ${mlShort}`);
            expect(formatVolume(0.25, t)).toBe(`250 ${mlShort}`);
        });

        it('should format liters with one decimal', () => {
            expect(formatVolume(1, t)).toBe(`1.0 ${litersShort}`);
            expect(formatVolume(2.5, t)).toBe(`2.5 ${litersShort}`);
            expect(formatVolume(10, t)).toBe(`10.0 ${litersShort}`);
        });
    });

    describe('getModeDisplayText', () => {
        it('should return correct text for each mode', () => {
            expect(getModeDisplayText('fao56_auto', t)).toBe(t('wizard.modes.fao56Auto'));
            expect(getModeDisplayText('fao56_eco', t)).toBe(t('wizard.modes.fao56Eco'));
            expect(getModeDisplayText('duration', t)).toBe(t('wizard.modes.duration'));
            expect(getModeDisplayText('volume', t)).toBe(t('wizard.modes.volume'));
        });
    });

    describe('generateZoneSummary', () => {
        it('should include mode in summary', () => {
            const config = createBaseConfig();
            const summary = generateZoneSummary(config, { t });
            expect(summary).toContain(`${t('wizard.summary.mode')}: ${t('wizard.modes.duration')}`);
        });

        it('should include duration for duration mode', () => {
            const config = createBaseConfig({
                wateringMode: 'duration',
                schedule: { ...createBaseConfig().schedule, value: 30 }
            });
            const summary = generateZoneSummary(config, { t });
            expect(summary).toContain(`${t('wizard.summary.duration')}: ${formatDuration(30, t)}`);
        });

        it('should include volume for volume mode', () => {
            const config = createBaseConfig({
                wateringMode: 'volume',
                schedule: { ...createBaseConfig().schedule, value: 5 }
            });
            const summary = generateZoneSummary(config, { t });
            expect(summary).toContain(`${t('wizard.summary.volume')}: ${formatVolume(5, t)}`);
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
            const summary = generateZoneSummary(config, { t });
            expect(summary).toContain(`${t('wizard.summary.mode')}: ${t('wizard.modes.fao56Auto')}`);
            expect(summary).toContain(`${t('wizard.summary.plant')}: Tomato`);
            expect(summary).toContain(`${t('wizard.summary.soil')}: Loamy`);
            expect(summary).toContain(`${t('wizard.summary.irrigation')}: Drip`);
            expect(summary.some(line => line.includes(`${t('wizard.summary.location')}:`))).toBe(true);
            expect(summary).toContain(`${t('wizard.summary.coverage')}: 50 ${t('common.squareMetersShort')}`);
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
            const summary = generateZoneSummary(config, { t });
            expect(summary).toContain(`${t('wizard.summary.coverage')}: 20 ${t('wizard.plant.plantsLabel')}`);
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
            const summary = generateZoneSummary(config, { t });
            expect(summary.some(line => line.includes(`${t('wizard.summary.schedule')}:`) && line.includes('06:30'))).toBe(true);
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
            const summary = generateZoneSummary(config, { t });
            expect(summary.some(line =>
                line.includes(t('wizard.schedule.sunrise')) &&
                line.includes('30') &&
                line.includes(t('common.minutesShort'))
            )).toBe(true);
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
