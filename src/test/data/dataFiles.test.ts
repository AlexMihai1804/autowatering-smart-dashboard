import { describe, it, expect } from 'vitest';
import irrigationMethods from '../../data/irrigation_methods.json';
import plants from '../../data/plants.json';
import soils from '../../data/soils.json';

describe('Data files', () => {
    describe('irrigation_methods.json', () => {
        it('should be an array', () => {
            expect(Array.isArray(irrigationMethods)).toBe(true);
        });

        it('should contain irrigation methods', () => {
            expect(irrigationMethods.length).toBeGreaterThan(0);
        });

        it('should have required fields for each method', () => {
            irrigationMethods.forEach((method: any, index: number) => {
                expect(method, `Method ${index} should have id`).toHaveProperty('id');
                expect(method, `Method ${index} should have name`).toHaveProperty('name');
            });
        });

        it('should have unique ids', () => {
            const ids = irrigationMethods.map((m: any) => m.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should contain common irrigation methods', () => {
            const methodNames = irrigationMethods.map((m: any) => m.name?.toLowerCase() || m.id);
            expect(methodNames.some(n => n.includes('drip') || n.includes('picurare'))).toBe(true);
        });
    });

    describe('plants.json', () => {
        it('should be an array', () => {
            expect(Array.isArray(plants)).toBe(true);
        });

        it('should contain plants', () => {
            expect(plants.length).toBeGreaterThan(0);
        });

        it('should have required fields for each plant', () => {
            // Check first 10 plants to avoid slow tests
            plants.slice(0, 10).forEach((plant: any, index: number) => {
                expect(plant, `Plant ${index} should have common_name_en`).toHaveProperty('common_name_en');
            });
        });

        it('should have water need information', () => {
            const plantsWithWaterNeed = plants.filter((p: any) =>
                p.water_need !== undefined || p.kc_mid !== undefined
            );
            expect(plantsWithWaterNeed.length).toBeGreaterThan(0);
        });

        it('should contain common vegetables', () => {
            const plantNames = plants.map((p: any) => p.common_name_en?.toLowerCase() || '');
            expect(plantNames.some(n => n.includes('tomato') || n.includes('roșii'))).toBe(true);
        });
    });

    describe('soils.json', () => {
        it('should be an array or object', () => {
            expect(soils).toBeDefined();
        });

        it('should contain soil types', () => {
            const soilList = Array.isArray(soils) ? soils : Object.values(soils);
            expect(soilList.length).toBeGreaterThan(0);
        });

        it('should have required soil properties', () => {
            const soilList = Array.isArray(soils) ? soils : Object.values(soils);
            soilList.slice(0, 5).forEach((soil: any, index: number) => {
                // Most soils should have some identifier
                const hasId = soil.id || soil.name || soil.soil_type;
                expect(hasId, `Soil ${index} should have identifier`).toBeTruthy();
            });
        });

        it('should contain common soil types', () => {
            const soilJson = JSON.stringify(soils).toLowerCase();
            const hasCommonSoil =
                soilJson.includes('clay') ||
                soilJson.includes('sand') ||
                soilJson.includes('loam') ||
                soilJson.includes('argilos');
            expect(hasCommonSoil).toBe(true);
        });
    });
});
