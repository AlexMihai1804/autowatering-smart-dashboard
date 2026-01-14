/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import {
    getPlantCategory,
    sortIrrigationMethods,
    getConfigurationWarnings
} from '../../utils/onboardingHelpers';
import {
    validateZoneConfig
} from '../../utils/wizardHelpers';
import { PlantDBEntry, IrrigationMethodEntry } from '../../services/DatabaseService';
import { UnifiedZoneConfig } from '../../types/wizard';

describe('onboardingHelpers', () => {
    // Mock translator function
    const mockT = (key: string) => key;

    describe('getPlantCategory', () => {
        it('should return correct category from mapping', () => {
            expect(getPlantCategory({ category: 'Vegetable' } as any)).toBe('legume');
            expect(getPlantCategory({ category: 'Fruit' } as any)).toBe('fructe');
            expect(getPlantCategory({ category: 'Lawn' } as any)).toBe('gazon');
        });

        it('should default to altele', () => {
            expect(getPlantCategory({ category: 'Unknown' } as any)).toBe('altele');
            expect(getPlantCategory({ category: '' } as any)).toBe('altele');
        });
    });

    describe('sortIrrigationMethods', () => {
        const methods: IrrigationMethodEntry[] = [
            { code_enum: 'IRRIG_DRIP_SURFACE' } as any,
            { code_enum: 'IRRIG_SPRINKLER_POPUP' } as any,
            { code_enum: 'IRRIG_MANUAL' } as any
        ];

        it('should prioritize plant match', () => {
            const plant = { typ_irrig_method: 'DRIP' } as any;
            const sorted = sortIrrigationMethods(methods, plant, 'area', 10);

            expect(sorted[0].code_enum).toBe('IRRIG_DRIP_SURFACE');
            expect(sorted[0].score).toBeGreaterThan(100);
        });

        it('should prioritize coverage match for large areas', () => {
            const plant = { typ_irrig_method: 'OTHER' } as any;
            const sorted = sortIrrigationMethods(methods, plant, 'area', 100); // 100m2 -> Large

            // Sprinkler should be boosted
            expect(sorted[0].code_enum).toContain('SPRINKLER');
        });
    });

    describe('getConfigurationWarnings', () => {
        it('should warn for irrigation mismatch', () => {
            const config: Partial<UnifiedZoneConfig> = {
                plant: { common_name_en: 'Tomato', typ_irrig_method: 'DRIP', category: 'Vegetable' } as any,
                irrigationMethod: { code_enum: 'IRRIG_SPRINKLER_POPUP' } as any,
                coverageType: 'plants',
                coverageValue: 5
            };
            const warnings = getConfigurationWarnings(mockT, config);
            const warning = warnings.find(w => w.field === 'irrigationMethod');
            expect(warning).toBeDefined();
            expect(warning?.type).toBe('suggestion');
        });

        it('should warn for missing Cycle & Soak on clay', () => {
            const config: Partial<UnifiedZoneConfig> = {
                soil: { texture: 'Clay', infiltration_rate_mm_h: 4 } as any,
                enableCycleSoak: false
            };
            const warnings = getConfigurationWarnings(mockT, config);
            expect(warnings.find(w => w.field === 'enableCycleSoak')).toBeDefined();
        });
    });

    describe('validateZoneConfig', () => {
        it('should validate complete FA056 config', () => {
            const config = {
                name: 'Zone 1',
                wateringMode: 'fao56_auto',
                plant: {},
                soil: {},
                location: {},
                coverageValue: 10
            } as any;
            expect(validateZoneConfig(config).valid).toBe(true);
        });

        it('should fail if missing fields for FA056', () => {
            const config = {
                name: 'Zone 1',
                wateringMode: 'fao56_auto',
                // missing plant, soil...
            } as any;
            const result = validateZoneConfig(config);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});
