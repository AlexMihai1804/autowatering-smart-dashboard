import { describe, it, expect } from 'vitest';
import {
    getAreaPerPlant,
    getRecommendedCoverageType,
    getCoverageModeExplanation,
    type CoverageMode
} from '../utils/plantCoverageHelper';
import type { PlantDBEntry } from '../services/DatabaseService';

// Helper to create a minimal plant entry for testing
const createPlant = (overrides: Partial<PlantDBEntry> = {}): PlantDBEntry => ({
    id: 1,
    subtype: 'TEST_PLANT',
    category: 'Gardening',
    common_name_ro: 'Test Plant',
    common_name_en: 'Test Plant',
    scientific_name: 'Testus plantus',
    indoor_ok: false,
    toxic_flag: false,
    edible_part: 'Fruit',
    primary_use: 'Food',
    fertility_need: 'MEDIUM',
    pruning_need: 'LOW',
    growth_rate: 'FAST',
    kc_ini: null,
    kc_mid: null,
    kc_end: null,
    kc_dev: null,
    root_depth_min_m: null,
    root_depth_max_m: null,
    depletion_fraction_p: null,
    allowable_depletion_pct: null,
    stage_days_ini: null,
    stage_days_dev: null,
    stage_days_mid: null,
    stage_days_end: null,
    growth_cycle: 'Annual',
    maturity_days_min: null,
    maturity_days_max: null,
    juvenile_years_to_bearing: null,
    spacing_row_m: null,
    spacing_plant_m: null,
    default_density_plants_m2: null,
    canopy_cover_max_frac: null,
    shade_tolerance: 'LOW',
    drought_tolerance: 'MED',
    salinity_tolerance: 'LOW',
    typ_irrig_method: 'DRIP',
    kc_source_tag: 'EST',
    root_depth_source: 'EST',
    water_stress_sensitive_stage: '',
    ph_min: null,
    ph_max: null,
    frost_tolerance_c: null,
    temp_opt_min_c: null,
    temp_opt_max_c: null,
    ...overrides
});

describe('plantCoverageHelper', () => {
    describe('getAreaPerPlant', () => {
        it('should return null for null plant', () => {
            expect(getAreaPerPlant(null)).toBeNull();
        });

        it('should calculate area from spacing (row * plant)', () => {
            const wheat = createPlant({
                spacing_row_m: 0.15,
                spacing_plant_m: 0.03
            });
            expect(getAreaPerPlant(wheat)).toBeCloseTo(0.0045, 4);
        });

        it('should calculate area from density (1/density)', () => {
            const wheat = createPlant({
                default_density_plants_m2: 222.22
            });
            expect(getAreaPerPlant(wheat)).toBeCloseTo(0.0045, 4);
        });

        it('should prefer spacing over density when both available', () => {
            const plant = createPlant({
                spacing_row_m: 1.0,
                spacing_plant_m: 0.5,
                default_density_plants_m2: 10 // Would give 0.1
            });
            // Should use spacing: 1.0 * 0.5 = 0.5
            expect(getAreaPerPlant(plant)).toBeCloseTo(0.5, 4);
        });

        it('should return null when no spacing or density data', () => {
            const plant = createPlant({
                spacing_row_m: null,
                spacing_plant_m: null,
                default_density_plants_m2: null
            });
            expect(getAreaPerPlant(plant)).toBeNull();
        });

        it('should return null for zero spacing values', () => {
            const plant = createPlant({
                spacing_row_m: 0,
                spacing_plant_m: 0,
                default_density_plants_m2: null
            });
            expect(getAreaPerPlant(plant)).toBeNull();
        });

        it('should fall back to density when spacing is zero', () => {
            const plant = createPlant({
                spacing_row_m: 0,
                spacing_plant_m: 0,
                default_density_plants_m2: 50 // 0.02 m²/plant
            });
            expect(getAreaPerPlant(plant)).toBeCloseTo(0.02, 4);
        });
    });

    describe('getRecommendedCoverageType', () => {
        it('should return "both" for null plant', () => {
            expect(getRecommendedCoverageType(null)).toBe('both');
        });

        it('should return "area" for dense crops (wheat: 222 plants/m²)', () => {
            const wheat = createPlant({
                spacing_row_m: 0.15,
                spacing_plant_m: 0.03,
                default_density_plants_m2: 222.22
            });
            expect(getRecommendedCoverageType(wheat)).toBe('area');
        });

        it('should return "area" for lawn grass (100 plants/m²)', () => {
            const grass = createPlant({
                default_density_plants_m2: 100
            });
            expect(getRecommendedCoverageType(grass)).toBe('area');
        });

        it('should return "plants" for tomatoes (2 plants/m²)', () => {
            const tomato = createPlant({
                spacing_row_m: 1.0,
                spacing_plant_m: 0.5,
                default_density_plants_m2: 2
            });
            // 1.0 * 0.5 = 0.5 > 0.02 → plants
            expect(getRecommendedCoverageType(tomato)).toBe('plants');
        });

        it('should return "plants" for roses (4 plants/m²)', () => {
            const rose = createPlant({
                spacing_row_m: 0.5,
                spacing_plant_m: 0.5,
                default_density_plants_m2: 4
            });
            // 0.5 * 0.5 = 0.25 > 0.02 → plants
            expect(getRecommendedCoverageType(rose)).toBe('plants');
        });

        it('should return "both" when density is unknown', () => {
            const unknownPlant = createPlant({
                spacing_row_m: null,
                spacing_plant_m: null,
                default_density_plants_m2: null
            });
            expect(getRecommendedCoverageType(unknownPlant)).toBe('both');
        });

        it('should handle edge case at threshold (50 plants/m² = 0.02 m²/plant)', () => {
            const exactThreshold = createPlant({
                default_density_plants_m2: 50
            });
            // Exactly 0.02 → should be 'area' (<=)
            expect(getRecommendedCoverageType(exactThreshold)).toBe('area');
        });

        it('should return "plants" just above threshold (49 plants/m²)', () => {
            const justAbove = createPlant({
                default_density_plants_m2: 49
            });
            // 1/49 ≈ 0.0204 > 0.02 → plants
            expect(getRecommendedCoverageType(justAbove)).toBe('plants');
        });
    });

    describe('getCoverageModeExplanation', () => {
        const roTranslations = {
            coverageDenseExplanation: 'Cultură densă - folosim suprafața',
            coverageSparseExplanation: 'Plantare rară - introduci numărul de plante',
        };

        const enTranslations = {
            coverageDenseExplanation: 'Dense crop - using area measurement',
            coverageSparseExplanation: 'Sparse planting - enter number of plants',
        };

        it('should return empty string for null plant', () => {
            expect(getCoverageModeExplanation(null, 'both')).toBe('');
        });

        it('should return Romanian explanation for dense crop with RO translations', () => {
            const wheat = createPlant({
                default_density_plants_m2: 222.22
            });
            const explanation = getCoverageModeExplanation(wheat, 'area', roTranslations);
            expect(explanation).toContain('densă');
        });

        it('should return English explanation for dense crop with EN translations', () => {
            const wheat = createPlant({
                default_density_plants_m2: 222.22
            });
            const explanation = getCoverageModeExplanation(wheat, 'area', enTranslations);
            expect(explanation).toContain('Dense crop');
        });

        it('should return Romanian explanation for sparse planting', () => {
            const tomato = createPlant({
                spacing_row_m: 1.0,
                spacing_plant_m: 0.5
            });
            const explanation = getCoverageModeExplanation(tomato, 'plants', roTranslations);
            expect(explanation).toContain('rară');
        });

        it('should return English explanation for sparse planting', () => {
            const tomato = createPlant({
                spacing_row_m: 1.0,
                spacing_plant_m: 0.5
            });
            const explanation = getCoverageModeExplanation(tomato, 'plants', enTranslations);
            expect(explanation).toContain('Sparse');
        });

        it('should return empty for both mode', () => {
            const unknown = createPlant();
            expect(getCoverageModeExplanation(unknown, 'both')).toBe('');
        });

        it('should fall back to Romanian when no translations provided', () => {
            const wheat = createPlant({ default_density_plants_m2: 222.22 });
            const explanation = getCoverageModeExplanation(wheat, 'area');
            expect(explanation).toContain('densă');
        });
    });
});
