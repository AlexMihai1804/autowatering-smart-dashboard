import { describe, it, expect } from 'vitest';
import { PLANT_TYPES, SOIL_TYPES, IRRIGATION_METHODS, getPlantIcon } from '../utils/mappings';

describe('mappings', () => {
    describe('PLANT_TYPES', () => {
        it('should have 8 plant types', () => {
            expect(PLANT_TYPES).toHaveLength(8);
        });

        it('should contain expected plant types', () => {
            expect(PLANT_TYPES).toContain('Vegetables');
            expect(PLANT_TYPES).toContain('Herbs');
            expect(PLANT_TYPES).toContain('Flowers');
            expect(PLANT_TYPES).toContain('Shrubs');
            expect(PLANT_TYPES).toContain('Trees');
            expect(PLANT_TYPES).toContain('Lawn');
            expect(PLANT_TYPES).toContain('Succulents');
            expect(PLANT_TYPES).toContain('Custom');
        });
    });

    describe('SOIL_TYPES', () => {
        it('should have 8 soil types', () => {
            expect(SOIL_TYPES).toHaveLength(8);
        });

        it('should contain expected soil types', () => {
            expect(SOIL_TYPES).toContain('Clay');
            expect(SOIL_TYPES).toContain('Sandy');
            expect(SOIL_TYPES).toContain('Loamy');
            expect(SOIL_TYPES).toContain('Silty');
            expect(SOIL_TYPES).toContain('Rocky');
            expect(SOIL_TYPES).toContain('Peaty');
            expect(SOIL_TYPES).toContain('Potting Mix');
            expect(SOIL_TYPES).toContain('Hydroponic');
        });
    });

    describe('IRRIGATION_METHODS', () => {
        it('should have 6 irrigation methods', () => {
            expect(IRRIGATION_METHODS).toHaveLength(6);
        });

        it('should contain expected irrigation methods', () => {
            expect(IRRIGATION_METHODS).toContain('Drip');
            expect(IRRIGATION_METHODS).toContain('Sprinkler');
            expect(IRRIGATION_METHODS).toContain('Soaker Hose');
            expect(IRRIGATION_METHODS).toContain('Micro Spray');
            expect(IRRIGATION_METHODS).toContain('Hand Watering');
            expect(IRRIGATION_METHODS).toContain('Flood');
        });
    });

    describe('getPlantIcon', () => {
        it('should return vegetable icon for index 0', () => {
            expect(getPlantIcon(0)).toBe('🍅');
        });

        it('should return herbs icon for index 1', () => {
            expect(getPlantIcon(1)).toBe('🌿');
        });

        it('should return flowers icon for index 2', () => {
            expect(getPlantIcon(2)).toBe('🌸');
        });

        it('should return shrubs icon for index 3', () => {
            expect(getPlantIcon(3)).toBe('🌳');
        });

        it('should return trees icon for index 4', () => {
            expect(getPlantIcon(4)).toBe('🌲');
        });

        it('should return lawn icon for index 5', () => {
            expect(getPlantIcon(5)).toBe('🌱');
        });

        it('should return succulents icon for index 6', () => {
            expect(getPlantIcon(6)).toBe('🌵');
        });

        it('should return custom icon for index 7 or higher', () => {
            expect(getPlantIcon(7)).toBe('✨');
            expect(getPlantIcon(100)).toBe('✨');
        });

        it('should return custom icon for negative indices', () => {
            expect(getPlantIcon(-1)).toBe('✨');
        });
    });
});
