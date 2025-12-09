/**
 * Data JSON Validation Tests
 * 
 * Tests to validate the structure and content of JSON data files.
 */
import { describe, it, expect } from 'vitest';
import plants from '../data/plants.json';
import soils from '../data/soils.json';
import irrigationMethods from '../data/irrigation_methods.json';
import plantFullDb from '../assets/plant_full_db.json';
import soilEnhancedDb from '../assets/soil_enhanced_db.json';

describe('Data JSON Files', () => {
    describe('plants.json', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(plants)).toBe(true);
            expect(plants.length).toBeGreaterThan(0);
        });

        it('should have valid structure for each plant', () => {
            plants.forEach((plant, index) => {
                expect(plant).toHaveProperty('id');
                expect(typeof plant.id).toBe('number');
                
                expect(plant).toHaveProperty('subtype');
                expect(typeof plant.subtype).toBe('string');
                expect(plant.subtype.startsWith('PLANT_')).toBe(true);
                
                expect(plant).toHaveProperty('category');
                expect(typeof plant.category).toBe('string');
                
                expect(plant).toHaveProperty('common_name_en');
                expect(typeof plant.common_name_en).toBe('string');
                
                expect(plant).toHaveProperty('common_name_ro');
                expect(typeof plant.common_name_ro).toBe('string');
            });
        });

        it('should have unique IDs', () => {
            const ids = plants.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have unique subtypes', () => {
            const subtypes = plants.map(p => p.subtype);
            const uniqueSubtypes = new Set(subtypes);
            expect(uniqueSubtypes.size).toBe(subtypes.length);
        });

        it('should have valid FAO-56 coefficients where present', () => {
            plants.forEach((plant) => {
                if (plant.kc_ini !== null) {
                    expect(plant.kc_ini).toBeGreaterThanOrEqual(0);
                    expect(plant.kc_ini).toBeLessThanOrEqual(2);
                }
                if (plant.kc_mid !== null) {
                    expect(plant.kc_mid).toBeGreaterThanOrEqual(0);
                    expect(plant.kc_mid).toBeLessThanOrEqual(2);
                }
                if (plant.kc_end !== null) {
                    expect(plant.kc_end).toBeGreaterThanOrEqual(0);
                    expect(plant.kc_end).toBeLessThanOrEqual(2);
                }
            });
        });

        it('should have valid root depths where present', () => {
            plants.forEach((plant) => {
                if (plant.root_depth_min_m !== null && plant.root_depth_max_m !== null) {
                    expect(plant.root_depth_min_m).toBeGreaterThanOrEqual(0);
                    expect(plant.root_depth_max_m).toBeGreaterThanOrEqual(plant.root_depth_min_m);
                }
            });
        });

        it('should have tolerance values as strings', () => {
            plants.forEach((plant) => {
                if (plant.shade_tolerance !== null) {
                    expect(typeof plant.shade_tolerance).toBe('string');
                }
                if (plant.drought_tolerance !== null) {
                    expect(typeof plant.drought_tolerance).toBe('string');
                }
            });
        });

        it('should have valid categories', () => {
            const validCategories = [
                'Agriculture', 'Gardening', 'Landscaping', 'Indoor', 
                'Succulent', 'Fruit', 'Vegetable', 'Herb', 'Lawn', 'Shrub'
            ];
            plants.forEach((plant) => {
                expect(validCategories).toContain(plant.category);
            });
        });
    });

    describe('soils.json', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(soils)).toBe(true);
            expect(soils.length).toBeGreaterThan(0);
        });

        it('should have valid structure for each soil', () => {
            soils.forEach((soil) => {
                expect(soil).toHaveProperty('id');
                expect(typeof soil.id).toBe('number');
                
                expect(soil).toHaveProperty('soil_type');
                expect(typeof soil.soil_type).toBe('string');
                
                expect(soil).toHaveProperty('texture');
                expect(typeof soil.texture).toBe('string');
            });
        });

        it('should have unique IDs', () => {
            const ids = soils.map(s => s.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have valid field capacity values', () => {
            soils.forEach((soil) => {
                if (soil.field_capacity_pct !== null && typeof soil.field_capacity_pct === 'number') {
                    expect(soil.field_capacity_pct).toBeGreaterThan(0);
                    expect(soil.field_capacity_pct).toBeLessThanOrEqual(100);
                }
            });
        });

        it('should have wilting point less than field capacity', () => {
            soils.forEach((soil) => {
                if (typeof soil.field_capacity_pct === 'number' && typeof soil.wilting_point_pct === 'number') {
                    expect(soil.wilting_point_pct).toBeLessThan(soil.field_capacity_pct);
                }
            });
        });

        it('should have positive infiltration rates where valid', () => {
            soils.forEach((soil) => {
                if (typeof soil.infiltration_rate_mm_h === 'number') {
                    expect(soil.infiltration_rate_mm_h).toBeGreaterThanOrEqual(0);
                }
            });
        });

        it('should have p_raw between 0 and 1', () => {
            soils.forEach((soil) => {
                if (typeof soil.p_raw === 'number') {
                    expect(soil.p_raw).toBeGreaterThanOrEqual(0);
                    expect(soil.p_raw).toBeLessThanOrEqual(1);
                }
            });
        });
    });

    describe('irrigation_methods.json', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(irrigationMethods)).toBe(true);
            expect(irrigationMethods.length).toBeGreaterThan(0);
        });

        it('should have valid structure for each method', () => {
            irrigationMethods.forEach((method) => {
                expect(method).toHaveProperty('id');
                expect(typeof method.id).toBe('number');
                
                expect(method).toHaveProperty('name');
                expect(typeof method.name).toBe('string');
                
                expect(method).toHaveProperty('code_enum');
                expect(typeof method.code_enum).toBe('string');
                expect(method.code_enum.startsWith('IRRIG_')).toBe(true);
            });
        });

        it('should have unique IDs', () => {
            const ids = irrigationMethods.map(m => m.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have unique code_enums', () => {
            const codes = irrigationMethods.map(m => m.code_enum);
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).toBe(codes.length);
        });

        it('should have valid efficiency percentages', () => {
            irrigationMethods.forEach((method) => {
                if (method.efficiency_pct !== null) {
                    expect(method.efficiency_pct).toBeGreaterThan(0);
                    expect(method.efficiency_pct).toBeLessThanOrEqual(100);
                }
            });
        });

        it('should have valid wetting fractions', () => {
            irrigationMethods.forEach((method) => {
                if (method.wetting_fraction !== null && typeof method.wetting_fraction === 'number') {
                    expect(method.wetting_fraction).toBeGreaterThan(0);
                    expect(method.wetting_fraction).toBeLessThanOrEqual(1);
                }
            });
        });

        it('should have valid distribution uniformity', () => {
            irrigationMethods.forEach((method) => {
                if (method.distribution_uniformity_pct !== null) {
                    expect(method.distribution_uniformity_pct).toBeGreaterThan(0);
                    expect(method.distribution_uniformity_pct).toBeLessThanOrEqual(100);
                }
            });
        });
    });

    describe('plant_full_db.json (assets)', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(plantFullDb)).toBe(true);
            expect(plantFullDb.length).toBeGreaterThan(0);
        });

        it('should have valid structure for each plant', () => {
            plantFullDb.forEach((plant) => {
                expect(plant).toHaveProperty('id');
                expect(typeof plant.id).toBe('number');
                
                expect(plant).toHaveProperty('name');
                expect(typeof plant.name).toBe('string');
                
                expect(plant).toHaveProperty('type');
                expect(typeof plant.type).toBe('string');
            });
        });

        it('should have unique IDs', () => {
            const ids = plantFullDb.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have valid FAO-56 Kc coefficients', () => {
            plantFullDb.forEach((plant) => {
                expect(plant.kc_init).toBeGreaterThanOrEqual(0);
                expect(plant.kc_init).toBeLessThanOrEqual(2);
                
                expect(plant.kc_mid).toBeGreaterThanOrEqual(0);
                expect(plant.kc_mid).toBeLessThanOrEqual(2);
                
                expect(plant.kc_end).toBeGreaterThanOrEqual(0);
                expect(plant.kc_end).toBeLessThanOrEqual(2);
            });
        });

        it('should have positive root depth and height', () => {
            plantFullDb.forEach((plant) => {
                expect(plant.root_depth_max).toBeGreaterThan(0);
                expect(plant.height_max).toBeGreaterThan(0);
            });
        });

        it('should have valid plant types', () => {
            const validTypes = ['Vegetable', 'Fruit', 'Grain', 'Legume', 'Flower', 'Grass', 'Herb'];
            plantFullDb.forEach((plant) => {
                expect(validTypes).toContain(plant.type);
            });
        });
    });

    describe('soil_enhanced_db.json (assets)', () => {
        it('should be a non-empty array', () => {
            expect(Array.isArray(soilEnhancedDb)).toBe(true);
            expect(soilEnhancedDb.length).toBeGreaterThan(0);
        });

        it('should have valid structure for each soil', () => {
            soilEnhancedDb.forEach((soil) => {
                expect(soil).toHaveProperty('id');
                expect(typeof soil.id).toBe('number');
                
                expect(soil).toHaveProperty('name');
                expect(typeof soil.name).toBe('string');
            });
        });

        it('should have unique IDs', () => {
            const ids = soilEnhancedDb.map(s => s.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have valid field capacity values (0-1 range)', () => {
            soilEnhancedDb.forEach((soil) => {
                expect(soil.field_capacity).toBeGreaterThan(0);
                expect(soil.field_capacity).toBeLessThanOrEqual(1);
            });
        });

        it('should have valid wilting point values (0-1 range)', () => {
            soilEnhancedDb.forEach((soil) => {
                expect(soil.wilting_point).toBeGreaterThan(0);
                expect(soil.wilting_point).toBeLessThanOrEqual(1);
            });
        });

        it('should have wilting point less than field capacity', () => {
            soilEnhancedDb.forEach((soil) => {
                expect(soil.wilting_point).toBeLessThan(soil.field_capacity);
            });
        });

        it('should have positive infiltration rate', () => {
            soilEnhancedDb.forEach((soil) => {
                expect(soil.infiltration_rate).toBeGreaterThan(0);
            });
        });

        it('should have soil names that match standard texture classes', () => {
            const validTextures = [
                'Sand', 'Loamy Sand', 'Sandy Loam', 'Loam', 'Silt Loam',
                'Sandy Clay Loam', 'Clay Loam', 'Silty Clay Loam', 
                'Sandy Clay', 'Silty Clay', 'Clay'
            ];
            soilEnhancedDb.forEach((soil) => {
                expect(validTextures).toContain(soil.name);
            });
        });
    });
});
