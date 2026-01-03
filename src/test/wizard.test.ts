import { describe, it, expect } from 'vitest';
import {
    WateringMode,
    WATERING_MODE_LABELS,
    WATERING_MODE_DESCRIPTIONS,
    WATERING_MODE_ICONS,
    LocationData,
    ScheduleType,
    ScheduleConfig,
    UnifiedZoneConfig,
    WizardStep,
    FAO56_STEPS,
    MANUAL_STEPS,
    WizardPhase,
    ChannelWizardState,
    DEFAULT_SCHEDULE,
    DEFAULT_ZONE_CONFIG,
    DEFAULT_WIZARD_STATE,
    isFao56Mode,
    getStepsForMode,
    getStepIndex,
    getNextStep,
    getPrevStep,
    createInitialZones,
    canProceedFromStep
} from '../types/wizard';
import { translations, Language } from '../i18n/translations';

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

describe('wizard.ts - Constants', () => {
    describe('WATERING_MODE_LABELS', () => {
        it('should have labels for all modes', () => {
            expect(WATERING_MODE_LABELS.fao56_auto).toBe('wizard.modes.fao56Auto');
            expect(WATERING_MODE_LABELS.fao56_eco).toBe('wizard.modes.fao56Eco');
            expect(WATERING_MODE_LABELS.duration).toBe('wizard.modes.duration');
            expect(WATERING_MODE_LABELS.volume).toBe('wizard.modes.volume');
        });
    });

    describe('WATERING_MODE_DESCRIPTIONS', () => {
        it('should have descriptions for all modes', () => {
            expect(WATERING_MODE_DESCRIPTIONS.fao56_auto).toBe('wizard.modes.fao56AutoDesc');
            expect(WATERING_MODE_DESCRIPTIONS.fao56_eco).toBe('wizard.modes.fao56EcoDesc');
            expect(WATERING_MODE_DESCRIPTIONS.duration).toBe('wizard.modes.durationDesc');
            expect(WATERING_MODE_DESCRIPTIONS.volume).toBe('wizard.modes.volumeDesc');
        });
    });

    describe('WATERING_MODE_ICONS', () => {
        it('should have icons for all modes', () => {
            expect(WATERING_MODE_ICONS.fao56_auto).toBeTruthy();
            expect(WATERING_MODE_ICONS.fao56_eco).toBeTruthy();
            expect(WATERING_MODE_ICONS.duration).toBeTruthy();
            expect(WATERING_MODE_ICONS.volume).toBeTruthy();
        });
    });

    describe('FAO56_STEPS', () => {
        it('should have correct steps in order', () => {
            expect(FAO56_STEPS).toEqual(['mode', 'plant', 'location', 'soil', 'irrigation', 'environment', 'schedule', 'summary']);
            expect(FAO56_STEPS).toHaveLength(8);
        });
    });

    describe('MANUAL_STEPS', () => {
        it('should have fewer steps than FAO-56', () => {
            expect(MANUAL_STEPS).toEqual(['mode', 'schedule', 'summary']);
            expect(MANUAL_STEPS).toHaveLength(3);
        });
    });

    describe('DEFAULT_SCHEDULE', () => {
        it('should have sensible defaults', () => {
            expect(DEFAULT_SCHEDULE.enabled).toBe(true);
            expect(DEFAULT_SCHEDULE.type).toBe('auto');
            expect(DEFAULT_SCHEDULE.hour).toBe(6);
            expect(DEFAULT_SCHEDULE.minute).toBe(0);
            expect(DEFAULT_SCHEDULE.value).toBe(15);
            expect(DEFAULT_SCHEDULE.useSolarTiming).toBe(false);
        });

        it('should have correct days mask for default auto (all days)', () => {
            expect(DEFAULT_SCHEDULE.daysMask).toBe(0b1111111);
        });
    });

    describe('DEFAULT_ZONE_CONFIG', () => {
        it('should have correct defaults', () => {
            expect(DEFAULT_ZONE_CONFIG.enabled).toBe(false);
            expect(DEFAULT_ZONE_CONFIG.skipped).toBe(false);
            expect(DEFAULT_ZONE_CONFIG.name).toBe('');
            expect(DEFAULT_ZONE_CONFIG.wateringMode).toBe('fao56_auto');
            expect(DEFAULT_ZONE_CONFIG.plant).toBeNull();
            expect(DEFAULT_ZONE_CONFIG.soil).toBeNull();
            expect(DEFAULT_ZONE_CONFIG.irrigationMethod).toBeNull();
            expect(DEFAULT_ZONE_CONFIG.sunExposure).toBe(70);
            expect(DEFAULT_ZONE_CONFIG.coverageType).toBe('area');
            expect(DEFAULT_ZONE_CONFIG.coverageValue).toBe(10);
            expect(DEFAULT_ZONE_CONFIG.maxVolumeLimit).toBe(50);
        });
    });

    describe('DEFAULT_WIZARD_STATE', () => {
        it('should have correct defaults', () => {
            expect(DEFAULT_WIZARD_STATE.isOpen).toBe(false);
            expect(DEFAULT_WIZARD_STATE.phase).toBe('zones');
            expect(DEFAULT_WIZARD_STATE.currentZoneIndex).toBe(0);
            expect(DEFAULT_WIZARD_STATE.currentStep).toBe('mode');
            expect(DEFAULT_WIZARD_STATE.skipAllRemaining).toBe(false);
            expect(DEFAULT_WIZARD_STATE.sharedLocation).toBeNull();
            expect(DEFAULT_WIZARD_STATE.zones).toEqual([]);
            expect(DEFAULT_WIZARD_STATE.tilesDownloading).toBe(false);
            expect(DEFAULT_WIZARD_STATE.tilesProgress).toBe(0);
        });
    });
});

describe('wizard.ts - Helper Functions', () => {
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
            expect(getStepsForMode('fao56_auto')).toEqual(FAO56_STEPS);
        });

        it('should return FAO56_STEPS for fao56_eco', () => {
            expect(getStepsForMode('fao56_eco')).toEqual(FAO56_STEPS);
        });

        it('should return MANUAL_STEPS for duration', () => {
            expect(getStepsForMode('duration')).toEqual(MANUAL_STEPS);
        });

        it('should return MANUAL_STEPS for volume', () => {
            expect(getStepsForMode('volume')).toEqual(MANUAL_STEPS);
        });
    });

    describe('getStepIndex', () => {
        it('should return correct index for FAO-56 mode', () => {
            expect(getStepIndex('mode', 'fao56_auto')).toBe(0);
            expect(getStepIndex('plant', 'fao56_auto')).toBe(1);
            expect(getStepIndex('location', 'fao56_auto')).toBe(2);
            expect(getStepIndex('soil', 'fao56_auto')).toBe(3);
            expect(getStepIndex('irrigation', 'fao56_auto')).toBe(4);
            expect(getStepIndex('environment', 'fao56_auto')).toBe(5);
            expect(getStepIndex('schedule', 'fao56_auto')).toBe(6);
            expect(getStepIndex('summary', 'fao56_auto')).toBe(7);
        });

        it('should return correct index for manual mode', () => {
            expect(getStepIndex('mode', 'duration')).toBe(0);
            expect(getStepIndex('schedule', 'duration')).toBe(1);
            expect(getStepIndex('summary', 'duration')).toBe(2);
        });

        it('should return -1 for non-existent step in manual mode', () => {
            expect(getStepIndex('plant', 'duration')).toBe(-1);
            expect(getStepIndex('environment', 'volume')).toBe(-1);
        });
    });

    describe('getNextStep', () => {
        it('should return next step for FAO-56 mode', () => {
            expect(getNextStep('mode', 'fao56_auto')).toBe('plant');
            expect(getNextStep('plant', 'fao56_auto')).toBe('location');
            expect(getNextStep('location', 'fao56_auto')).toBe('soil');
            expect(getNextStep('soil', 'fao56_auto')).toBe('irrigation');
            expect(getNextStep('irrigation', 'fao56_auto')).toBe('environment');
            expect(getNextStep('environment', 'fao56_auto')).toBe('schedule');
            expect(getNextStep('schedule', 'fao56_auto')).toBe('summary');
        });

        it('should return null at last step', () => {
            expect(getNextStep('summary', 'fao56_auto')).toBeNull();
            expect(getNextStep('summary', 'duration')).toBeNull();
        });

        it('should return next step for manual mode', () => {
            expect(getNextStep('mode', 'duration')).toBe('schedule');
            expect(getNextStep('schedule', 'duration')).toBe('summary');
        });

        it('should return null for invalid step', () => {
            expect(getNextStep('plant', 'duration')).toBeNull();
        });
    });

    describe('getPrevStep', () => {
        it('should return previous step for FAO-56 mode', () => {
            expect(getPrevStep('summary', 'fao56_auto')).toBe('schedule');
            expect(getPrevStep('schedule', 'fao56_auto')).toBe('environment');
            expect(getPrevStep('environment', 'fao56_auto')).toBe('irrigation');
            expect(getPrevStep('irrigation', 'fao56_auto')).toBe('soil');
            expect(getPrevStep('soil', 'fao56_auto')).toBe('location');
            expect(getPrevStep('location', 'fao56_auto')).toBe('plant');
            expect(getPrevStep('plant', 'fao56_auto')).toBe('mode');
        });

        it('should return null at first step', () => {
            expect(getPrevStep('mode', 'fao56_auto')).toBeNull();
            expect(getPrevStep('mode', 'duration')).toBeNull();
        });

        it('should return previous step for manual mode', () => {
            expect(getPrevStep('summary', 'duration')).toBe('schedule');
            expect(getPrevStep('schedule', 'duration')).toBe('mode');
        });
    });

    describe('createInitialZones', () => {
        it('should create 8 zones by default', () => {
            const zones = createInitialZones();
            expect(zones).toHaveLength(8);
        });

        it('should create specified number of zones', () => {
            const zones = createInitialZones(4);
            expect(zones).toHaveLength(4);
        });

        it('should assign correct channel IDs', () => {
            const zones = createInitialZones(8);
            zones.forEach((zone, i) => {
                expect(zone.channelId).toBe(i);
            });
        });

        it('should assign default names', () => {
            const zones = createInitialZones(3);
            expect(zones[0].name).toBe('Zone 1');
            expect(zones[1].name).toBe('Zone 2');
            expect(zones[2].name).toBe('Zone 3');
        });

        it('should have default config values', () => {
            const zones = createInitialZones(1);
            expect(zones[0].enabled).toBe(false);
            expect(zones[0].skipped).toBe(false);
            expect(zones[0].wateringMode).toBe('fao56_auto');
            expect(zones[0].plant).toBeNull();
        });
    });

    describe('canProceedFromStep', () => {
        const baseZone: UnifiedZoneConfig = {
            channelId: 0,
            enabled: false,
            skipped: false,
            name: 'Test Zone',
            wateringMode: 'fao56_auto',
            plant: { id: 1, name: 'Tomato' } as any,
            soil: { id: 1, name: 'Loam' } as any,
            irrigationMethod: { id: 1, name: 'Drip' } as any,
            location: { latitude: 45.0, longitude: 25.0, source: 'gps' },
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
            schedule: { ...DEFAULT_SCHEDULE }
        };

        describe('mode step', () => {
            it('should fail without name', () => {
                const zone = { ...baseZone, name: '' };
                const result = canProceedFromStep('mode', zone, t);
                expect(result.canProceed).toBe(false);
                expect(result.error).toBe(t('wizard.validation.zoneNameRequired'));
            });

            it('should fail with whitespace-only name', () => {
                const zone = { ...baseZone, name: '   ' };
                const result = canProceedFromStep('mode', zone, t);
                expect(result.canProceed).toBe(false);
            });

            it('should pass with valid name', () => {
                const zone = { ...baseZone, name: 'Front Lawn' };
                const result = canProceedFromStep('mode', zone, t);
                expect(result.canProceed).toBe(true);
            });
        });

        describe('plant step', () => {
            it('should fail without plant for FAO-56 mode', () => {
                const zone = { ...baseZone, plant: null };
                const result = canProceedFromStep('plant', zone, t);
                expect(result.canProceed).toBe(false);
                expect(result.error).toBe(t('wizard.validation.plantRequired'));
            });

            it('should pass with plant for FAO-56 mode', () => {
                const result = canProceedFromStep('plant', baseZone, t);
                expect(result.canProceed).toBe(true);
            });

            it('should pass without plant for manual mode', () => {
                const zone = { ...baseZone, wateringMode: 'duration' as WateringMode, plant: null };
                const result = canProceedFromStep('plant', zone, t);
                expect(result.canProceed).toBe(true);
            });
        });

        describe('soil step', () => {
            it('should fail without soil for FAO-56 mode', () => {
                const zone = { ...baseZone, soil: null };
                const result = canProceedFromStep('soil', zone, t);
                expect(result.canProceed).toBe(false);
                expect(result.error).toBe(t('wizard.validation.soilRequired'));
            });

            it('should pass with soil for FAO-56 mode', () => {
                const result = canProceedFromStep('soil', baseZone, t);
                expect(result.canProceed).toBe(true);
            });
        });

        describe('irrigation step', () => {
            it('should fail without irrigation method for FAO-56 mode', () => {
                const zone = { ...baseZone, irrigationMethod: null };
                const result = canProceedFromStep('irrigation', zone, t);
                expect(result.canProceed).toBe(false);
                expect(result.error).toBe(t('wizard.validation.irrigationRequired'));
            });

            it('should pass with irrigation method', () => {
                const result = canProceedFromStep('irrigation', baseZone, t);
                expect(result.canProceed).toBe(true);
            });
        });

        describe('environment step', () => {
            it('should fail without location for FAO-56 mode', () => {
                const zone = { ...baseZone, location: null };
                const result = canProceedFromStep('environment', zone, t);
                expect(result.canProceed).toBe(false);
                expect(result.error).toBe(t('wizard.validation.locationRequired'));
            });

            it('should fail with zero coverage', () => {
                const zone = { ...baseZone, coverageValue: 0 };
                const result = canProceedFromStep('environment', zone, t);
                expect(result.canProceed).toBe(false);
                expect(result.error).toBe(t('wizard.validation.coverageInvalid'));
            });

            it('should fail with negative coverage', () => {
                const zone = { ...baseZone, coverageValue: -5 };
                const result = canProceedFromStep('environment', zone, t);
                expect(result.canProceed).toBe(false);
            });

            it('should pass with valid location and coverage', () => {
                const result = canProceedFromStep('environment', baseZone, t);
                expect(result.canProceed).toBe(true);
            });
        });

        describe('schedule step', () => {
            it('should fail with zero value for enabled manual mode schedule', () => {
                const zone = { 
                    ...baseZone, 
                    wateringMode: 'duration' as WateringMode,
                    schedule: { ...DEFAULT_SCHEDULE, enabled: true, value: 0 }
                };
                const result = canProceedFromStep('schedule', zone, t);
                expect(result.canProceed).toBe(false);
                expect(result.error).toBe(t('wizard.validation.durationRequired'));
            });

            it('should pass with valid schedule for manual mode', () => {
                const zone = { 
                    ...baseZone, 
                    wateringMode: 'duration' as WateringMode,
                    schedule: { ...DEFAULT_SCHEDULE, enabled: true, value: 15 }
                };
                const result = canProceedFromStep('schedule', zone, t);
                expect(result.canProceed).toBe(true);
            });

            it('should pass with disabled schedule', () => {
                const zone = { 
                    ...baseZone, 
                    wateringMode: 'duration' as WateringMode,
                    schedule: { ...DEFAULT_SCHEDULE, enabled: false, value: 0 }
                };
                const result = canProceedFromStep('schedule', zone, t);
                expect(result.canProceed).toBe(true);
            });

            it('should pass for FAO-56 mode regardless of value', () => {
                const zone = { 
                    ...baseZone, 
                    schedule: { ...DEFAULT_SCHEDULE, enabled: true, value: 0 }
                };
                const result = canProceedFromStep('schedule', zone, t);
                expect(result.canProceed).toBe(true);
            });
        });

        describe('summary step', () => {
            it('should always pass', () => {
                const result = canProceedFromStep('summary', baseZone, t);
                expect(result.canProceed).toBe(true);
            });
        });

        describe('unknown step', () => {
            it('should pass for unknown steps (default case)', () => {
                // Cast to WizardStep to test the default case
                const result = canProceedFromStep('unknown_step' as any, baseZone, t);
                expect(result.canProceed).toBe(true);
            });
        });
    });
});
