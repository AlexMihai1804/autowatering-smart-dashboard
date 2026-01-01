import { describe, it, expect } from 'vitest';
import {
    getAreaPerPlant,
    getRecommendedCoverageType,
    getCoverageModeExplanation
} from '../../utils/plantCoverageHelper';
import type { PlantDBEntry } from '../../services/DatabaseService';

// Helper to create mock plant entries
const createMockPlant = (overrides: Partial<PlantDBEntry> = {}): PlantDBEntry => ({
    id: 1,
    common_name_en: 'Test Plant',
    category: 'vegetable',
    kc_mid: 1.0,
    max_root_depth_m: 0.5,
    depletion_fraction_p: 0.5,
    ...overrides
} as PlantDBEntry);

describe('plantCoverageHelper.ts', () => {
    describe('getAreaPerPlant', () => {
        it('should return null for null plant', () => {
            expect(getAreaPerPlant(null)).toBeNull();
        });

        it('should calculate from row and plant spacing', () => {
            const plant = createMockPlant({
                spacing_row_m: 1.0,
                spacing_plant_m: 0.5
            });
            expect(getAreaPerPlant(plant)).toBe(0.5); // 1.0 * 0.5
        });

        it('should calculate from density when spacing not available', () => {
            const plant = createMockPlant({
                spacing_row_m: undefined,
                spacing_plant_m: undefined,
                default_density_plants_m2: 2 // 2 plants/m² = 0.5 m²/plant
            });
            expect(getAreaPerPlant(plant)).toBe(0.5);
        });

        it('should prefer spacing over density', () => {
            const plant = createMockPlant({
                spacing_row_m: 1.0,
                spacing_plant_m: 1.0, // = 1 m²/plant from spacing
                default_density_plants_m2: 10 // = 0.1 m²/plant from density
            });
            expect(getAreaPerPlant(plant)).toBe(1.0); // Uses spacing
        });

        it('should return null if spacing values are 0', () => {
            const plant = createMockPlant({
                spacing_row_m: 0,
                spacing_plant_m: 0.5,
                default_density_plants_m2: undefined
            });
            expect(getAreaPerPlant(plant)).toBeNull();
        });

        it('should return null if density is 0', () => {
            const plant = createMockPlant({
                spacing_row_m: undefined,
                spacing_plant_m: undefined,
                default_density_plants_m2: 0
            });
            expect(getAreaPerPlant(plant)).toBeNull();
        });

        it('should return null if no spacing or density data', () => {
            const plant = createMockPlant({
                spacing_row_m: undefined,
                spacing_plant_m: undefined,
                default_density_plants_m2: undefined
            });
            expect(getAreaPerPlant(plant)).toBeNull();
        });

        it('should handle wheat-like dense crops (high density)', () => {
            const wheat = createMockPlant({
                spacing_row_m: undefined,
                spacing_plant_m: undefined,
                default_density_plants_m2: 222 // Very dense
            });
            const areaPerPlant = getAreaPerPlant(wheat);
            expect(areaPerPlant).toBeCloseTo(0.0045, 4); // 1/222
        });
    });

    describe('getRecommendedCoverageType', () => {
        it('should return "both" for null plant', () => {
            expect(getRecommendedCoverageType(null)).toBe('both');
        });

        it('should return "both" for plant without density data', () => {
            const plant = createMockPlant({
                spacing_row_m: undefined,
                spacing_plant_m: undefined,
                default_density_plants_m2: undefined
            });
            expect(getRecommendedCoverageType(plant)).toBe('both');
        });

        it('should return "area" for dense crops (area_per_plant <= 0.02)', () => {
            // Wheat: 222 plants/m² → 0.0045 m²/plant
            const wheat = createMockPlant({
                default_density_plants_m2: 222
            });
            expect(getRecommendedCoverageType(wheat)).toBe('area');
        });

        it('should return "area" for crops at threshold (exactly 0.02)', () => {
            // 50 plants/m² = exactly 0.02 m²/plant
            const denseGrass = createMockPlant({
                default_density_plants_m2: 50
            });
            expect(getRecommendedCoverageType(denseGrass)).toBe('area');
        });

        it('should return "plants" for sparse crops (area_per_plant > 0.02)', () => {
            // Tomato: 2 plants/m² → 0.5 m²/plant
            const tomato = createMockPlant({
                spacing_row_m: 1.0,
                spacing_plant_m: 0.5
            });
            expect(getRecommendedCoverageType(tomato)).toBe('plants');
        });

        it('should return "plants" for very sparse crops', () => {
            // Tree: 1 plant per 4 m²
            const tree = createMockPlant({
                spacing_row_m: 2.0,
                spacing_plant_m: 2.0
            });
            expect(getRecommendedCoverageType(tree)).toBe('plants');
        });
    });

    describe('getCoverageModeExplanation', () => {
        it('should return empty string for null plant', () => {
            expect(getCoverageModeExplanation(null, 'area')).toBe('');
            expect(getCoverageModeExplanation(null, 'plants')).toBe('');
            expect(getCoverageModeExplanation(null, 'both')).toBe('');
        });

        it('should return default Romanian text for area mode', () => {
            const plant = createMockPlant();
            expect(getCoverageModeExplanation(plant, 'area')).toBe('Cultură densă - folosim suprafața');
        });

        it('should return default Romanian text for plants mode', () => {
            const plant = createMockPlant();
            expect(getCoverageModeExplanation(plant, 'plants')).toBe('Plantare rară - introduci numărul de plante');
        });

        it('should return empty string for both mode', () => {
            const plant = createMockPlant();
            expect(getCoverageModeExplanation(plant, 'both')).toBe('');
        });

        it('should use provided translations for area mode', () => {
            const plant = createMockPlant();
            const translations = {
                coverageDenseExplanation: 'Dense crop - using area',
                coverageSparseExplanation: 'Sparse planting - enter plant count'
            };
            expect(getCoverageModeExplanation(plant, 'area', translations)).toBe('Dense crop - using area');
        });

        it('should use provided translations for plants mode', () => {
            const plant = createMockPlant();
            const translations = {
                coverageDenseExplanation: 'Dense crop - using area',
                coverageSparseExplanation: 'Sparse planting - enter plant count'
            };
            expect(getCoverageModeExplanation(plant, 'plants', translations)).toBe('Sparse planting - enter plant count');
        });
    });
});
