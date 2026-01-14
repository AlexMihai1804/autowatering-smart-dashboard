import { describe, it, expect } from 'vitest';
import {
  getPlantCategory,
  sortIrrigationMethods,
  getTooltipContent,
  getConfigurationWarnings,
  cloneZoneConfig,
  PLANT_CATEGORIES,
  IRRIGATION_METHOD_VISUALS,
  POPULAR_PLANTS,
  PlantCategoryId,
} from '../utils/onboardingHelpers';
import { PlantDBEntry, IrrigationMethodEntry } from '../services/DatabaseService';
import { UnifiedZoneConfig } from '../types/wizard';

// Mock translator function
const mockT = (key: string) => key;

// Mock data factories
function createMockPlant(overrides: Partial<PlantDBEntry> = {}): PlantDBEntry {
  return {
    id: 1,
    fao_code: 'TOMATO',
    common_name_en: 'Tomato',
    category: 'Vegetable',
    typ_irrig_method: 'DRIP',
    kc_ini: 0.6,
    kc_mid: 1.15,
    kc_end: 0.7,
    root_depth_m: 1.0,
    p_depletion: 0.4,
    ...overrides,
  } as PlantDBEntry;
}

function createMockIrrigationMethod(overrides: Partial<IrrigationMethodEntry> = {}): IrrigationMethodEntry {
  return {
    id: 1,
    code_enum: 'IRRIG_DRIP_SURFACE',
    name_en: 'Drip Irrigation (Surface)',
    efficiency_pct: 90,
    ...overrides,
  } as IrrigationMethodEntry;
}

function createMockZoneConfig(overrides: Partial<UnifiedZoneConfig> = {}): UnifiedZoneConfig {
  return {
    channelId: 0,
    name: 'Zone 1',
    enabled: true,
    skipped: false,
    plant: null,
    soil: null,
    irrigationMethod: null,
    coverageType: 'area',
    coverageValue: 10,
    sunExposure: 80,
    enableCycleSoak: false,
    cycleSoakConfig: null,
    maxVolumeL: 100,
    schedule: { enabled: true },
    ...overrides,
  } as UnifiedZoneConfig;
}

describe('onboardingHelpers', () => {
  // ============================================================================
  // Plant Categories
  // ============================================================================
  describe('PLANT_CATEGORIES', () => {
    it('should have all expected category keys', () => {
      const expectedCategories: PlantCategoryId[] = ['legume', 'fructe', 'gazon', 'flori', 'copaci', 'arbusti', 'aromate', 'altele'];
      for (const cat of expectedCategories) {
        expect(PLANT_CATEGORIES[cat]).toBeDefined();
        expect(PLANT_CATEGORIES[cat].labelKey).toBeTruthy();
        expect(PLANT_CATEGORIES[cat].emoji).toBeTruthy();
        expect(PLANT_CATEGORIES[cat].dbCategories.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getPlantCategory', () => {
    it('should return "legume" for vegetable plants', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Vegetable' }))).toBe('legume');
      expect(getPlantCategory(createMockPlant({ category: 'Agriculture' }))).toBe('legume');
    });

    it('should return "fructe" for fruit plants', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Fruit' }))).toBe('fructe');
    });

    it('should return "gazon" for lawn/grass', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Lawn' }))).toBe('gazon');
      expect(getPlantCategory(createMockPlant({ category: 'Grass' }))).toBe('gazon');
    });

    it('should return "flori" for flowers', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Flower' }))).toBe('flori');
    });

    it('should return "copaci" for trees', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Tree' }))).toBe('copaci');
    });

    it('should return "arbusti" for shrubs', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Shrub' }))).toBe('arbusti');
    });

    it('should return "aromate" for herbs', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Herb' }))).toBe('aromate');
    });

    it('should return "altele" for unknown categories', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Unknown' }))).toBe('altele');
      expect(getPlantCategory(createMockPlant({ category: '' }))).toBe('altele');
      expect(getPlantCategory(createMockPlant({ category: undefined }))).toBe('altele');
    });

    it('should return "altele" for indoor/succulent/houseplant', () => {
      expect(getPlantCategory(createMockPlant({ category: 'Indoor' }))).toBe('altele');
      expect(getPlantCategory(createMockPlant({ category: 'Succulent' }))).toBe('altele');
      expect(getPlantCategory(createMockPlant({ category: 'Houseplant' }))).toBe('altele');
    });
  });

  // ============================================================================
  // POPULAR_PLANTS
  // ============================================================================
  describe('POPULAR_PLANTS', () => {
    it('should have arrays of plant names for each category', () => {
      expect(POPULAR_PLANTS.vegetables.length).toBeGreaterThan(0);
      expect(POPULAR_PLANTS.flowers.length).toBeGreaterThan(0);
      expect(POPULAR_PLANTS.lawn.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Irrigation Method Visuals
  // ============================================================================
  describe('IRRIGATION_METHOD_VISUALS', () => {
    it('should have visuals for common irrigation methods', () => {
      expect(IRRIGATION_METHOD_VISUALS['IRRIG_DRIP_SURFACE']).toBeDefined();
      expect(IRRIGATION_METHOD_VISUALS['IRRIG_SPRINKLER_SET']).toBeDefined();
      expect(IRRIGATION_METHOD_VISUALS['IRRIG_MICROSPRAY']).toBeDefined();
    });

    it('should have emoji and descriptionKey for each method', () => {
      for (const [key, visual] of Object.entries(IRRIGATION_METHOD_VISUALS)) {
        expect(visual.emoji).toBeTruthy();
        expect(visual.descriptionKey).toBeTruthy();
        expect(visual.bgColor).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // sortIrrigationMethods
  // ============================================================================
  describe('sortIrrigationMethods', () => {
    const methods: IrrigationMethodEntry[] = [
      createMockIrrigationMethod({ code_enum: 'IRRIG_DRIP_SURFACE', name_en: 'Drip Surface' }),
      createMockIrrigationMethod({ code_enum: 'IRRIG_SPRINKLER_SET', name_en: 'Sprinkler Set' }),
      createMockIrrigationMethod({ code_enum: 'IRRIG_MICROSPRAY', name_en: 'Microspray' }),
      createMockIrrigationMethod({ code_enum: 'IRRIG_MANUAL', name_en: 'Manual' }),
    ];

    it('should return methods with scores', () => {
      const sorted = sortIrrigationMethods(methods, null, 'area', 20);
      expect(sorted.length).toBe(4);
      expect(sorted[0]).toHaveProperty('score');
      expect(sorted[0]).toHaveProperty('isRecommended');
      expect(sorted[0]).toHaveProperty('reasonKey');
    });

    it('should sort by score descending', () => {
      const sorted = sortIrrigationMethods(methods, null, 'area', 20);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].score).toBeGreaterThanOrEqual(sorted[i].score);
      }
    });

    it('should prioritize drip for plant that recommends drip', () => {
      const plant = createMockPlant({ typ_irrig_method: 'DRIP' });
      const sorted = sortIrrigationMethods(methods, plant, 'area', 20);
      expect(sorted[0].code_enum).toContain('DRIP');
      expect(sorted[0].isRecommended).toBe(true);
      expect(sorted[0].reasonKey).toBe('plant_match');
    });

    it('should prioritize sprinkler for lawn plants', () => {
      const plant = createMockPlant({ category: 'Lawn', typ_irrig_method: 'SPRINKLER' });
      const sorted = sortIrrigationMethods(methods, plant, 'area', 100);
      expect(sorted[0].code_enum).toContain('SPRINKLER');
    });

    it('should favor drip for small areas (< 20 m²)', () => {
      const sorted = sortIrrigationMethods(methods, null, 'area', 10);
      // Drip should score higher for small areas
      const dripScore = sorted.find(m => m.code_enum === 'IRRIG_DRIP_SURFACE')?.score || 0;
      const sprinklerScore = sorted.find(m => m.code_enum === 'IRRIG_SPRINKLER_SET')?.score || 0;
      expect(dripScore).toBeGreaterThan(sprinklerScore);
    });

    it('should favor sprinkler for large areas (> 50 m²)', () => {
      const sorted = sortIrrigationMethods(methods, null, 'area', 100);
      const sprinklerScore = sorted.find(m => m.code_enum === 'IRRIG_SPRINKLER_SET')?.score || 0;
      const manualScore = sorted.find(m => m.code_enum === 'IRRIG_MANUAL')?.score || 0;
      expect(sprinklerScore).toBeGreaterThan(manualScore);
    });

    it('should favor drip for plant-based coverage', () => {
      const sorted = sortIrrigationMethods(methods, null, 'plants', 20);
      const dripScore = sorted.find(m => m.code_enum === 'IRRIG_DRIP_SURFACE')?.score || 0;
      const manualScore = sorted.find(m => m.code_enum === 'IRRIG_MANUAL')?.score || 0;
      expect(dripScore).toBeGreaterThan(manualScore);
    });

    it('should add category context bonus for vegetables → drip', () => {
      const plant = createMockPlant({ category: 'Vegetable', typ_irrig_method: undefined });
      const sorted = sortIrrigationMethods(methods, plant, 'area', 20, 'Vegetable');
      const dripScore = sorted.find(m => m.code_enum === 'IRRIG_DRIP_SURFACE')?.score || 0;
      expect(dripScore).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Tooltip Content
  // ============================================================================
  describe('getTooltipContent', () => {
    it('should return tooltip content for valid key', () => {
      const content = getTooltipContent(mockT, 'fao56');
      expect(content).not.toBeNull();
      // mockT returns the key itself, so title should be the translated key
      expect(content?.title).toBe('wizard.tooltips.items.fao56.title');
    });

    it('should return null for unknown key', () => {
      expect(getTooltipContent(mockT, 'unknown_key')).toBeNull();
      expect(getTooltipContent(mockT, '')).toBeNull();
    });
  });

  // ============================================================================
  // Configuration Warnings
  // ============================================================================
  describe('getConfigurationWarnings', () => {
    it('should return empty array for empty config', () => {
      expect(getConfigurationWarnings(mockT, {})).toEqual([]);
    });

    it('should warn when using sprinkler for drip-preferred plant', () => {
      const config: Partial<UnifiedZoneConfig> = {
        plant: createMockPlant({ typ_irrig_method: 'DRIP', common_name_en: 'Tomato' }),
        irrigationMethod: createMockIrrigationMethod({ code_enum: 'IRRIG_SPRINKLER_SET' }),
      };
      const warnings = getConfigurationWarnings(mockT, config);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe('suggestion');
      expect(warnings[0].field).toBe('irrigationMethod');
    });

    it('should suggest cycle/soak for clay soils with low infiltration', () => {
      const config: Partial<UnifiedZoneConfig> = {
        soil: {
          id: 1,
          texture: 'Clay',
          infiltration_rate_mm_h: 5,
        } as any,
        enableCycleSoak: false,
      };
      const warnings = getConfigurationWarnings(mockT, config);
      expect(warnings.some(w => w.field === 'enableCycleSoak')).toBe(true);
    });

    it('should not warn about cycle/soak if already enabled', () => {
      const config: Partial<UnifiedZoneConfig> = {
        soil: {
          id: 1,
          texture: 'Clay',
          infiltration_rate_mm_h: 5,
        } as any,
        enableCycleSoak: true,
      };
      const warnings = getConfigurationWarnings(mockT, config);
      expect(warnings.some(w => w.field === 'enableCycleSoak')).toBe(false);
    });

    it('should warn for very large coverage areas', () => {
      const config: Partial<UnifiedZoneConfig> = {
        coverageType: 'area',
        coverageValue: 300,
      };
      const warnings = getConfigurationWarnings(mockT, config);
      expect(warnings.some(w => w.field === 'coverageValue')).toBe(true);
    });

    it('should warn for many plants on one channel', () => {
      const config: Partial<UnifiedZoneConfig> = {
        coverageType: 'plants',
        coverageValue: 60,
      };
      const warnings = getConfigurationWarnings(mockT, config);
      expect(warnings.some(w => w.field === 'coverageValue')).toBe(true);
    });

    it('should warn for extreme sun exposure with outdoor plant', () => {
      const config: Partial<UnifiedZoneConfig> = {
        sunExposure: 15,
        plant: createMockPlant({ common_name_en: 'Tomato', indoor_ok: false }),
      };
      const warnings = getConfigurationWarnings(mockT, config);
      expect(warnings.some(w => w.field === 'sunExposure' && w.type === 'warning')).toBe(true);
    });

    it('should info for maximum sun exposure', () => {
      const config: Partial<UnifiedZoneConfig> = {
        sunExposure: 98,
      };
      const warnings = getConfigurationWarnings(mockT, config);
      expect(warnings.some(w => w.field === 'sunExposure' && w.type === 'info')).toBe(true);
    });
  });

  // ============================================================================
  // Clone Zone Config
  // ============================================================================
  describe('cloneZoneConfig', () => {
    const sourceConfig = createMockZoneConfig({
      channelId: 0,
      name: 'My Garden',
      enabled: true,
      coverageValue: 50,
      schedule: { enabled: true, startTime: '06:00' } as any,
    });

    it('should clone with new channel ID', () => {
      const cloned = cloneZoneConfig(sourceConfig, 3);
      expect(cloned.channelId).toBe(3);
      expect(cloned.name).toBe('Zona 4'); // channelId + 1
    });

    it('should keep name if keepName option is true', () => {
      const cloned = cloneZoneConfig(sourceConfig, 3, { keepName: true });
      expect(cloned.name).toBe('My Garden');
    });

    it('should keep coverage if keepCoverage option is true', () => {
      const cloned = cloneZoneConfig(sourceConfig, 3, { keepCoverage: true });
      expect(cloned.coverageValue).toBe(50);
    });

    it('should reset coverage to default (10) if keepCoverage is false', () => {
      const cloned = cloneZoneConfig(sourceConfig, 3, { keepCoverage: false });
      expect(cloned.coverageValue).toBe(10);
    });

    it('should keep schedule by default', () => {
      const cloned = cloneZoneConfig(sourceConfig, 3);
      expect(cloned.schedule.enabled).toBe(true);
      expect((cloned.schedule as any).startTime).toBe('06:00');
    });

    it('should reset schedule.enabled if keepSchedule is false', () => {
      const cloned = cloneZoneConfig(sourceConfig, 3, { keepSchedule: false });
      expect(cloned.schedule.enabled).toBe(true); // The function sets enabled: true
    });

    it('should set enabled to false and skipped to false', () => {
      const cloned = cloneZoneConfig(sourceConfig, 3);
      expect(cloned.enabled).toBe(false);
      expect(cloned.skipped).toBe(false);
    });

    it('should preserve other config properties', () => {
      const cloned = cloneZoneConfig(sourceConfig, 3);
      expect(cloned.plant).toBe(sourceConfig.plant);
      expect(cloned.soil).toBe(sourceConfig.soil);
      expect(cloned.irrigationMethod).toBe(sourceConfig.irrigationMethod);
      expect(cloned.sunExposure).toBe(sourceConfig.sunExposure);
    });
  });
});
