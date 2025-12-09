/**
 * DatabaseService Unit Tests
 * 
 * Tests for database query methods using mocked store data.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '../store/useAppStore';
import { 
    DatabaseService, 
    PLANT_CATEGORIES,
    type PlantDBEntry,
    type SoilDBEntry,
    type IrrigationMethodEntry
} from '../services/DatabaseService';

// Sample test data
const mockPlants: PlantDBEntry[] = [
    {
        id: 1,
        subtype: 'PLANT_TOMATO',
        category: 'Vegetable',
        common_name_ro: 'Roșie',
        common_name_en: 'Tomato',
        scientific_name: 'Solanum lycopersicum',
        indoor_ok: false,
        toxic_flag: false,
        edible_part: 'Fruit',
        primary_use: 'Food',
        fertility_need: 'HIGH',
        pruning_need: 'MEDIUM',
        growth_rate: 'FAST',
        kc_ini: 0.6,
        kc_mid: 1.15,
        kc_end: 0.8,
        kc_dev: 0.85,
        root_depth_min_m: 0.3,
        root_depth_max_m: 0.7,
        depletion_fraction_p: 0.4,
        allowable_depletion_pct: 40,
        stage_days_ini: 30,
        stage_days_dev: 40,
        stage_days_mid: 40,
        stage_days_end: 25,
        growth_cycle: 'Annual',
        maturity_days_min: 60,
        maturity_days_max: 80,
        juvenile_years_to_bearing: null,
        spacing_row_m: 1.0,
        spacing_plant_m: 0.5,
        default_density_plants_m2: 2,
        canopy_cover_max_frac: 0.8,
        shade_tolerance: 'LOW',
        drought_tolerance: 'LOW',
        salinity_tolerance: 'MED',
        typ_irrig_method: 'DRIP',
        kc_source_tag: 'FAO-56',
        root_depth_source: 'FAO-56',
        water_stress_sensitive_stage: 'Flowering',
        ph_min: 6.0,
        ph_max: 6.8,
        frost_tolerance_c: 0,
        temp_opt_min_c: 18,
        temp_opt_max_c: 27
    },
    {
        id: 2,
        subtype: 'PLANT_BASIL',
        category: 'Herb',
        common_name_ro: 'Busuioc',
        common_name_en: 'Basil',
        scientific_name: 'Ocimum basilicum',
        indoor_ok: true,
        toxic_flag: false,
        edible_part: 'Leaves',
        primary_use: 'Culinary',
        fertility_need: 'MEDIUM',
        pruning_need: 'HIGH',
        growth_rate: 'FAST',
        kc_ini: 0.5,
        kc_mid: 1.0,
        kc_end: 0.7,
        kc_dev: null,
        root_depth_min_m: 0.2,
        root_depth_max_m: 0.4,
        depletion_fraction_p: 0.45,
        allowable_depletion_pct: 45,
        stage_days_ini: 15,
        stage_days_dev: 20,
        stage_days_mid: 30,
        stage_days_end: 15,
        growth_cycle: 'Annual',
        maturity_days_min: 30,
        maturity_days_max: 45,
        juvenile_years_to_bearing: null,
        spacing_row_m: 0.3,
        spacing_plant_m: 0.2,
        default_density_plants_m2: 16,
        canopy_cover_max_frac: 0.5,
        shade_tolerance: 'MED',
        drought_tolerance: 'LOW',
        salinity_tolerance: 'LOW',
        typ_irrig_method: 'MANUAL',
        kc_source_tag: 'Local',
        root_depth_source: 'Estimated',
        water_stress_sensitive_stage: 'Vegetative',
        ph_min: 6.0,
        ph_max: 7.0,
        frost_tolerance_c: 4,
        temp_opt_min_c: 20,
        temp_opt_max_c: 30
    },
    {
        id: 3,
        subtype: 'PLANT_ROSE',
        category: 'Landscaping',
        common_name_ro: 'Trandafir',
        common_name_en: 'Rose',
        scientific_name: 'Rosa',
        indoor_ok: false,
        toxic_flag: false,
        edible_part: '',
        primary_use: 'Ornamental',
        fertility_need: 'MEDIUM',
        pruning_need: 'HIGH',
        growth_rate: 'MEDIUM',
        kc_ini: 0.5,
        kc_mid: 0.9,
        kc_end: 0.65,
        kc_dev: null,
        root_depth_min_m: 0.3,
        root_depth_max_m: 0.6,
        depletion_fraction_p: 0.5,
        allowable_depletion_pct: 50,
        stage_days_ini: null,
        stage_days_dev: null,
        stage_days_mid: null,
        stage_days_end: null,
        growth_cycle: 'Perennial',
        maturity_days_min: null,
        maturity_days_max: null,
        juvenile_years_to_bearing: 2,
        spacing_row_m: 1.0,
        spacing_plant_m: 0.8,
        default_density_plants_m2: 1.25,
        canopy_cover_max_frac: 0.7,
        shade_tolerance: 'LOW',
        drought_tolerance: 'MED',
        salinity_tolerance: 'LOW',
        typ_irrig_method: 'DRIP',
        kc_source_tag: 'FAO-56',
        root_depth_source: 'FAO-56',
        water_stress_sensitive_stage: 'Flowering',
        ph_min: 6.0,
        ph_max: 6.5,
        frost_tolerance_c: -15,
        temp_opt_min_c: 15,
        temp_opt_max_c: 25
    }
];

const mockSoils: SoilDBEntry[] = [
    {
        id: 1,
        soil_type: 'Sand',
        texture: 'Coarse, fast draining',
        field_capacity_pct: 12,
        wilting_point_pct: 4,
        available_water_mm_m: 80,
        infiltration_rate_mm_h: 50,
        p_raw: 0.5
    },
    {
        id: 2,
        soil_type: 'Loam',
        texture: 'Medium texture, balanced',
        field_capacity_pct: 25,
        wilting_point_pct: 10,
        available_water_mm_m: 150,
        infiltration_rate_mm_h: 15,
        p_raw: 0.55
    },
    {
        id: 3,
        soil_type: 'Clay',
        texture: 'Fine, slow draining',
        field_capacity_pct: 40,
        wilting_point_pct: 25,
        available_water_mm_m: 150,
        infiltration_rate_mm_h: 5,
        p_raw: 0.6
    }
];

const mockIrrigationMethods: IrrigationMethodEntry[] = [
    {
        id: 1,
        name: 'Drip Surface (Line+Emitters)',
        code_enum: 'IRRIG_DRIP_SURFACE',
        efficiency_pct: 90,
        infiltration_style: 'Point',
        wetting_fraction: 0.4,
        depth_typical_mm: '8-20',
        application_rate_mm_h: '2-8',
        distribution_uniformity_pct: 85,
        compatible_soil_textures: 'All',
        recommended_for: 'Row crops, orchards',
        notes: 'Most efficient method'
    },
    {
        id: 2,
        name: 'Drip Subsurface',
        code_enum: 'IRRIG_DRIP_SUBSURFACE',
        efficiency_pct: 95,
        infiltration_style: 'Point',
        wetting_fraction: 0.5,
        depth_typical_mm: '10-25',
        application_rate_mm_h: '2-6',
        distribution_uniformity_pct: 90,
        compatible_soil_textures: 'Loam, Clay',
        recommended_for: 'Permanent crops',
        notes: 'Buried installation'
    },
    {
        id: 3,
        name: 'Sprinkler Set',
        code_enum: 'IRRIG_SPRINKLER_SET',
        efficiency_pct: 75,
        infiltration_style: 'Spray',
        wetting_fraction: 1.0,
        depth_typical_mm: '15-40',
        application_rate_mm_h: '5-15',
        distribution_uniformity_pct: 80,
        compatible_soil_textures: 'All',
        recommended_for: 'Lawns, pastures',
        notes: 'Fixed or portable'
    },
    {
        id: 4,
        name: 'Micro Spray',
        code_enum: 'IRRIG_MICRO_SPRAY',
        efficiency_pct: 85,
        infiltration_style: 'Spray',
        wetting_fraction: 0.6,
        depth_typical_mm: '5-15',
        application_rate_mm_h: '10-30',
        distribution_uniformity_pct: 82,
        compatible_soil_textures: 'All',
        recommended_for: 'Orchards, nurseries',
        notes: 'Low volume spray'
    }
];

describe('DatabaseService', () => {
    let dbService: DatabaseService;

    beforeEach(() => {
        // Get singleton instance
        dbService = DatabaseService.getInstance();
        
        // Set mock data in store
        useAppStore.getState().setDatabase(mockPlants, mockSoils, mockIrrigationMethods);
    });

    afterEach(() => {
        // Reset store
        useAppStore.getState().setDatabase([], [], []);
    });

    describe('Singleton', () => {
        it('should return the same instance', () => {
            const instance1 = DatabaseService.getInstance();
            const instance2 = DatabaseService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('PLANT_CATEGORIES', () => {
        it('should have all expected categories', () => {
            expect(PLANT_CATEGORIES).toContain('Agriculture');
            expect(PLANT_CATEGORIES).toContain('Gardening');
            expect(PLANT_CATEGORIES).toContain('Landscaping');
            expect(PLANT_CATEGORIES).toContain('Indoor');
            expect(PLANT_CATEGORIES).toContain('Succulent');
            expect(PLANT_CATEGORIES).toContain('Fruit');
            expect(PLANT_CATEGORIES).toContain('Vegetable');
            expect(PLANT_CATEGORIES).toContain('Herb');
            expect(PLANT_CATEGORIES).toContain('Lawn');
            expect(PLANT_CATEGORIES).toContain('Shrub');
        });

        it('should have exactly 10 categories', () => {
            expect(PLANT_CATEGORIES.length).toBe(10);
        });
    });

    describe('Plant queries', () => {
        describe('getPlantById', () => {
            it('should return plant by ID', () => {
                const plant = dbService.getPlantById(1);
                expect(plant).toBeDefined();
                expect(plant?.id).toBe(1);
                expect(plant?.subtype).toBe('PLANT_TOMATO');
            });

            it('should return undefined for non-existent ID', () => {
                const plant = dbService.getPlantById(999);
                expect(plant).toBeUndefined();
            });
        });

        describe('getPlantBySubtype', () => {
            it('should return plant by subtype', () => {
                const plant = dbService.getPlantBySubtype('PLANT_BASIL');
                expect(plant).toBeDefined();
                expect(plant?.id).toBe(2);
                expect(plant?.common_name_en).toBe('Basil');
            });

            it('should return undefined for non-existent subtype', () => {
                const plant = dbService.getPlantBySubtype('PLANT_UNKNOWN');
                expect(plant).toBeUndefined();
            });
        });

        describe('getPlantsByCategory', () => {
            it('should return plants in Vegetable category', () => {
                const plants = dbService.getPlantsByCategory('Vegetable');
                expect(plants.length).toBe(1);
                expect(plants[0].subtype).toBe('PLANT_TOMATO');
            });

            it('should return plants in Herb category', () => {
                const plants = dbService.getPlantsByCategory('Herb');
                expect(plants.length).toBe(1);
                expect(plants[0].subtype).toBe('PLANT_BASIL');
            });

            it('should return empty array for category with no plants', () => {
                const plants = dbService.getPlantsByCategory('Succulent');
                expect(plants).toEqual([]);
            });
        });

        describe('searchPlants', () => {
            it('should search by English name', () => {
                const results = dbService.searchPlants('tomato');
                expect(results.length).toBe(1);
                expect(results[0].subtype).toBe('PLANT_TOMATO');
            });

            it('should search by Romanian name', () => {
                const results = dbService.searchPlants('roșie');
                expect(results.length).toBe(1);
                expect(results[0].subtype).toBe('PLANT_TOMATO');
            });

            it('should search by scientific name', () => {
                const results = dbService.searchPlants('solanum');
                expect(results.length).toBe(1);
                expect(results[0].subtype).toBe('PLANT_TOMATO');
            });

            it('should search by subtype', () => {
                const results = dbService.searchPlants('PLANT_ROSE');
                expect(results.length).toBe(1);
                expect(results[0].common_name_en).toBe('Rose');
            });

            it('should be case-insensitive', () => {
                const results = dbService.searchPlants('BASIL');
                expect(results.length).toBe(1);
                expect(results[0].subtype).toBe('PLANT_BASIL');
            });

            it('should return all plants for empty query', () => {
                const results = dbService.searchPlants('');
                expect(results.length).toBe(3);
            });

            it('should filter by category when provided', () => {
                const results = dbService.searchPlants('', 'Herb');
                expect(results.length).toBe(1);
                expect(results[0].category).toBe('Herb');
            });

            it('should combine query and category filter', () => {
                const results = dbService.searchPlants('b', 'Herb');
                expect(results.length).toBe(1);
                expect(results[0].common_name_en).toBe('Basil');
            });

            it('should return empty for no matches', () => {
                const results = dbService.searchPlants('xyz');
                expect(results).toEqual([]);
            });
        });

        describe('getAllCategories', () => {
            it('should return unique categories from plants', () => {
                const categories = dbService.getAllCategories();
                expect(categories).toContain('Vegetable');
                expect(categories).toContain('Herb');
                expect(categories).toContain('Landscaping');
                expect(categories.length).toBe(3);
            });

            it('should return sorted categories', () => {
                const categories = dbService.getAllCategories();
                const sorted = [...categories].sort();
                expect(categories).toEqual(sorted);
            });

            it('should return empty array when no plants', () => {
                useAppStore.getState().setDatabase([], [], []);
                const categories = dbService.getAllCategories();
                expect(categories).toEqual([]);
            });
        });
    });

    describe('Soil queries', () => {
        describe('getSoilById', () => {
            it('should return soil by ID', () => {
                const soil = dbService.getSoilById(1);
                expect(soil).toBeDefined();
                expect(soil?.soil_type).toBe('Sand');
            });

            it('should return undefined for non-existent ID', () => {
                const soil = dbService.getSoilById(999);
                expect(soil).toBeUndefined();
            });
        });

        describe('getSoilByType', () => {
            it('should return soil by type', () => {
                const soil = dbService.getSoilByType('Loam');
                expect(soil).toBeDefined();
                expect(soil?.id).toBe(2);
            });

            it('should return undefined for non-existent type', () => {
                const soil = dbService.getSoilByType('Unknown');
                expect(soil).toBeUndefined();
            });
        });

        describe('getAllSoils', () => {
            it('should return all soils', () => {
                const soils = dbService.getAllSoils();
                expect(soils.length).toBe(3);
            });

            it('should return empty array when no soils', () => {
                useAppStore.getState().setDatabase([], [], []);
                const soils = dbService.getAllSoils();
                expect(soils).toEqual([]);
            });
        });
    });

    describe('Irrigation method queries', () => {
        describe('getIrrigationMethodById', () => {
            it('should return method by ID', () => {
                const method = dbService.getIrrigationMethodById(1);
                expect(method).toBeDefined();
                expect(method?.code_enum).toBe('IRRIG_DRIP_SURFACE');
            });

            it('should return undefined for non-existent ID', () => {
                const method = dbService.getIrrigationMethodById(999);
                expect(method).toBeUndefined();
            });
        });

        describe('getIrrigationMethodByCode', () => {
            it('should return method by code', () => {
                const method = dbService.getIrrigationMethodByCode('IRRIG_SPRINKLER_SET');
                expect(method).toBeDefined();
                expect(method?.id).toBe(3);
            });

            it('should return undefined for non-existent code', () => {
                const method = dbService.getIrrigationMethodByCode('IRRIG_UNKNOWN');
                expect(method).toBeUndefined();
            });
        });

        describe('getAllIrrigationMethods', () => {
            it('should return all irrigation methods', () => {
                const methods = dbService.getAllIrrigationMethods();
                expect(methods.length).toBe(4);
            });

            it('should return empty array when no methods', () => {
                useAppStore.getState().setDatabase([], [], []);
                const methods = dbService.getAllIrrigationMethods();
                expect(methods).toEqual([]);
            });
        });

        describe('getRecommendedIrrigationMethods', () => {
            it('should return drip methods for DRIP irrigation type', () => {
                const methods = dbService.getRecommendedIrrigationMethods('DRIP');
                expect(methods.length).toBe(2);
                expect(methods.some(m => m.code_enum === 'IRRIG_DRIP_SURFACE')).toBe(true);
                expect(methods.some(m => m.code_enum === 'IRRIG_DRIP_SUBSURFACE')).toBe(true);
            });

            it('should return sprinkler methods for SPRINKLER irrigation type', () => {
                const methods = dbService.getRecommendedIrrigationMethods('SPRINKLER');
                expect(methods.length).toBe(1);
                expect(methods[0].code_enum).toBe('IRRIG_SPRINKLER_SET');
            });

            it('should return micro spray for MANUAL irrigation type', () => {
                const methods = dbService.getRecommendedIrrigationMethods('MANUAL');
                expect(methods.length).toBe(2);
                expect(methods.some(m => m.code_enum === 'IRRIG_DRIP_SURFACE')).toBe(true);
                expect(methods.some(m => m.code_enum === 'IRRIG_MICRO_SPRAY')).toBe(true);
            });

            it('should return empty for RAINFED irrigation type', () => {
                const methods = dbService.getRecommendedIrrigationMethods('RAINFED');
                expect(methods).toEqual([]);
            });

            it('should return empty for unknown irrigation type', () => {
                const methods = dbService.getRecommendedIrrigationMethods('UNKNOWN');
                expect(methods).toEqual([]);
            });
        });
    });

    describe('initialize', () => {
        beforeEach(() => {
            vi.spyOn(console, 'log').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should load databases from fetch and set them in store', async () => {
            const mockFetch = vi.fn();
            
            // Mock successful responses
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockPlants)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockSoils)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockIrrigationMethods)
                });
            
            global.fetch = mockFetch;

            await dbService.initialize();

            // Check that store was populated
            const state = useAppStore.getState();
            expect(state.plantDb.length).toBe(mockPlants.length);
            expect(state.soilDb.length).toBe(mockSoils.length);
            expect(state.irrigationMethodDb.length).toBe(mockIrrigationMethods.length);
        });

        it('should handle failed plant response', async () => {
            const mockFetch = vi.fn();
            
            mockFetch
                .mockResolvedValueOnce({ ok: false, status: 404 })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
            
            global.fetch = mockFetch;

            await dbService.initialize();

            // Should set empty arrays on error
            const state = useAppStore.getState();
            expect(state.plantDb).toEqual([]);
        });

        it('should handle failed soil response', async () => {
            const mockFetch = vi.fn();
            
            mockFetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
                .mockResolvedValueOnce({ ok: false, status: 500 })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
            
            global.fetch = mockFetch;

            await dbService.initialize();

            // Should set empty arrays on error
            const state = useAppStore.getState();
            expect(state.soilDb).toEqual([]);
        });

        it('should handle failed irrigation methods response', async () => {
            const mockFetch = vi.fn();
            
            mockFetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
                .mockResolvedValueOnce({ ok: false, status: 503 });
            
            global.fetch = mockFetch;

            await dbService.initialize();

            // Should set empty arrays on error
            const state = useAppStore.getState();
            expect(state.irrigationMethodDb).toEqual([]);
        });

        it('should handle fetch network error', async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
            global.fetch = mockFetch;

            await dbService.initialize();

            // Should set empty arrays as fallback
            const state = useAppStore.getState();
            expect(state.plantDb).toEqual([]);
            expect(state.soilDb).toEqual([]);
            expect(state.irrigationMethodDb).toEqual([]);
            expect(console.error).toHaveBeenCalled();
        });
    });
});
