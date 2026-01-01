/**
 * Tests for wizard types and helper functions
 */
import { describe, it, expect } from 'vitest';
import {
    WateringMode,
    WATERING_MODE_LABELS,
    WATERING_MODE_DESCRIPTIONS,
    WATERING_MODE_ICONS,
    FAO56_STEPS,
    MANUAL_STEPS,
    DEFAULT_SCHEDULE,
    DEFAULT_ZONE_CONFIG,
    DEFAULT_WIZARD_STATE,
    isFao56Mode,
    getStepsForMode,
    getStepIndex,
    getNextStep,
    getPrevStep,
    createInitialZones,
    canProceedFromStep,
    WizardStep,
    UnifiedZoneConfig,
} from '../../types/wizard';

describe('wizard types', () => {
    describe('WATERING_MODE_LABELS', () => {
        it('should have labels for all watering modes', () => {
            expect(WATERING_MODE_LABELS.fao56_auto).toBe('FAO-56 Auto');
            expect(WATERING_MODE_LABELS.fao56_eco).toBe('FAO-56 Eco');
            expect(WATERING_MODE_LABELS.duration).toBe('Duration');
            expect(WATERING_MODE_LABELS.volume).toBe('Volume');
        });
    });

    describe('WATERING_MODE_DESCRIPTIONS', () => {
        it('should have descriptions for all modes', () => {
            expect(WATERING_MODE_DESCRIPTIONS.fao56_auto).toBeTruthy();
            expect(WATERING_MODE_DESCRIPTIONS.fao56_eco).toBeTruthy();
            expect(WATERING_MODE_DESCRIPTIONS.duration).toBeTruthy();
            expect(WATERING_MODE_DESCRIPTIONS.volume).toBeTruthy();
        });
    });

    describe('WATERING_MODE_ICONS', () => {
        it('should have icons for all modes', () => {
            expect(WATERING_MODE_ICONS.fao56_auto).toBe('🌱');
            expect(WATERING_MODE_ICONS.fao56_eco).toBe('💧');
            expect(WATERING_MODE_ICONS.duration).toBe('⏱️');
            expect(WATERING_MODE_ICONS.volume).toBe('🚿');
        });
    });

    describe('FAO56_STEPS', () => {
        it('should have 8 steps for FAO-56 modes', () => {
            expect(FAO56_STEPS.length).toBe(8);
        });

        it('should start with mode step', () => {
            expect(FAO56_STEPS[0]).toBe('mode');
        });

        it('should end with summary step', () => {
            expect(FAO56_STEPS[FAO56_STEPS.length - 1]).toBe('summary');
        });

        it('should have location before soil', () => {
            const locationIndex = FAO56_STEPS.indexOf('location');
            const soilIndex = FAO56_STEPS.indexOf('soil');
            expect(locationIndex).toBeLessThan(soilIndex);
        });
    });

    describe('MANUAL_STEPS', () => {
        it('should have 3 steps for manual modes', () => {
            expect(MANUAL_STEPS.length).toBe(3);
        });

        it('should include mode, schedule, summary', () => {
            expect(MANUAL_STEPS).toContain('mode');
            expect(MANUAL_STEPS).toContain('schedule');
            expect(MANUAL_STEPS).toContain('summary');
        });
    });

    describe('DEFAULT_SCHEDULE', () => {
        it('should have enabled true by default', () => {
            expect(DEFAULT_SCHEDULE.enabled).toBe(true);
        });

        it('should have type auto', () => {
            expect(DEFAULT_SCHEDULE.type).toBe('auto');
        });

        it('should have all days enabled', () => {
            expect(DEFAULT_SCHEDULE.daysMask).toBe(0b1111111);
        });

        it('should have 6:00 AM default time', () => {
            expect(DEFAULT_SCHEDULE.hour).toBe(6);
            expect(DEFAULT_SCHEDULE.minute).toBe(0);
        });
    });

    describe('DEFAULT_ZONE_CONFIG', () => {
        it('should have enabled false', () => {
            expect(DEFAULT_ZONE_CONFIG.enabled).toBe(false);
        });

        it('should have fao56_auto as default mode', () => {
            expect(DEFAULT_ZONE_CONFIG.wateringMode).toBe('fao56_auto');
        });

        it('should have null plants and soil', () => {
            expect(DEFAULT_ZONE_CONFIG.plant).toBeNull();
            expect(DEFAULT_ZONE_CONFIG.soil).toBeNull();
        });

        it('should have 70% default sun exposure', () => {
            expect(DEFAULT_ZONE_CONFIG.sunExposure).toBe(70);
        });

        it('should have 50L max volume limit', () => {
            expect(DEFAULT_ZONE_CONFIG.maxVolumeLimit).toBe(50);
        });
    });

    describe('DEFAULT_WIZARD_STATE', () => {
        it('should have isOpen false', () => {
            expect(DEFAULT_WIZARD_STATE.isOpen).toBe(false);
        });

        it('should start at zones phase', () => {
            expect(DEFAULT_WIZARD_STATE.phase).toBe('zones');
        });

        it('should start at zone index 0', () => {
            expect(DEFAULT_WIZARD_STATE.currentZoneIndex).toBe(0);
        });

        it('should start at mode step', () => {
            expect(DEFAULT_WIZARD_STATE.currentStep).toBe('mode');
        });
    });
});

describe('wizard helper functions', () => {
    describe('isFao56Mode', () => {
        it('should return true for fao56_auto', () => {
            expect(isFao56Mode('fao56_auto')).toBe(true);
        });

        it('should return true for fao56_eco', () => {
            expect(isFao56Mode('fao56_eco')).toBe(true);
        });

        it('should return false for duration', () => {
            expect(isFao56Mode('duration')).toBe(false);
        });

        it('should return false for volume', () => {
            expect(isFao56Mode('volume')).toBe(false);
        });
    });

    describe('getStepsForMode', () => {
        it('should return FAO56_STEPS for fao56_auto', () => {
            expect(getStepsForMode('fao56_auto')).toBe(FAO56_STEPS);
        });

        it('should return FAO56_STEPS for fao56_eco', () => {
            expect(getStepsForMode('fao56_eco')).toBe(FAO56_STEPS);
        });

        it('should return MANUAL_STEPS for duration', () => {
            expect(getStepsForMode('duration')).toBe(MANUAL_STEPS);
        });

        it('should return MANUAL_STEPS for volume', () => {
            expect(getStepsForMode('volume')).toBe(MANUAL_STEPS);
        });
    });

    describe('getStepIndex', () => {
        it('should return 0 for mode step in FAO-56', () => {
            expect(getStepIndex('mode', 'fao56_auto')).toBe(0);
        });

        it('should return 1 for plant step in FAO-56', () => {
            expect(getStepIndex('plant', 'fao56_auto')).toBe(1);
        });

        it('should return -1 for non-existent step', () => {
            expect(getStepIndex('plant', 'duration')).toBe(-1);
        });
    });

    describe('getNextStep', () => {
        it('should return plant after mode for FAO-56', () => {
            expect(getNextStep('mode', 'fao56_auto')).toBe('plant');
        });

        it('should return schedule after mode for manual', () => {
            expect(getNextStep('mode', 'duration')).toBe('schedule');
        });

        it('should return null after summary', () => {
            expect(getNextStep('summary', 'fao56_auto')).toBeNull();
        });

        it('should return null for invalid step', () => {
            expect(getNextStep('invalid' as WizardStep, 'fao56_auto')).toBeNull();
        });
    });

    describe('getPrevStep', () => {
        it('should return mode before plant for FAO-56', () => {
            expect(getPrevStep('plant', 'fao56_auto')).toBe('mode');
        });

        it('should return mode before schedule for manual', () => {
            expect(getPrevStep('schedule', 'duration')).toBe('mode');
        });

        it('should return null before mode', () => {
            expect(getPrevStep('mode', 'fao56_auto')).toBeNull();
        });
    });

    describe('createInitialZones', () => {
        it('should create 8 zones by default', () => {
            const zones = createInitialZones();
            expect(zones.length).toBe(8);
        });

        it('should create specified number of zones', () => {
            const zones = createInitialZones(4);
            expect(zones.length).toBe(4);
        });

        it('should have correct channelIds', () => {
            const zones = createInitialZones();
            zones.forEach((zone, index) => {
                expect(zone.channelId).toBe(index);
            });
        });

        it('should have Zone N as default name', () => {
            const zones = createInitialZones();
            expect(zones[0].name).toBe('Zone 1');
            expect(zones[7].name).toBe('Zone 8');
        });
    });

    describe('canProceedFromStep', () => {
        const baseZone: UnifiedZoneConfig = {
            ...DEFAULT_ZONE_CONFIG,
            channelId: 0,
            name: 'Test Zone',
        };

        it('should not proceed from mode without name', () => {
            const zone = { ...baseZone, name: '' };
            const result = canProceedFromStep('mode', zone);
            expect(result.canProceed).toBe(false);
            expect(result.error).toBeTruthy();
        });

        it('should proceed from mode with name', () => {
            const zone = { ...baseZone, name: 'Valid Name' };
            const result = canProceedFromStep('mode', zone);
            expect(result.canProceed).toBe(true);
        });

        it('should not proceed from plant without plant in FAO-56 mode', () => {
            const zone = { ...baseZone, wateringMode: 'fao56_auto' as WateringMode, plant: null };
            const result = canProceedFromStep('plant', zone);
            expect(result.canProceed).toBe(false);
        });

        it('should proceed from plant with plant selected', () => {
            const zone = { ...baseZone, wateringMode: 'fao56_auto' as WateringMode, plant: { common_name_en: 'Tomato' } as any };
            const result = canProceedFromStep('plant', zone);
            expect(result.canProceed).toBe(true);
        });

        it('should not proceed from environment without location in FAO-56', () => {
            const zone = { ...baseZone, wateringMode: 'fao56_auto' as WateringMode, location: null };
            const result = canProceedFromStep('environment', zone);
            expect(result.canProceed).toBe(false);
        });

        it('should not proceed with zero coverage value', () => {
            const zone = {
                ...baseZone,
                wateringMode: 'fao56_auto' as WateringMode,
                location: { latitude: 0, longitude: 0, source: 'gps' as const },
                coverageValue: 0
            };
            const result = canProceedFromStep('environment', zone);
            expect(result.canProceed).toBe(false);
        });

        it('should always proceed from summary', () => {
            const result = canProceedFromStep('summary', baseZone);
            expect(result.canProceed).toBe(true);
        });
    });
});
