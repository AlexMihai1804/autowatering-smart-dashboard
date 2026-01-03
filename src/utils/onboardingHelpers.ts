/**
 * Onboarding Helpers
 * 
 * Utility functions for the smart onboarding wizard including:
 * - Irrigation method smart sorting
 * - Plant category helpers
 * - Tooltip content
 * - Validation helpers
 */

import { PlantDBEntry, SoilDBEntry, IrrigationMethodEntry } from '../services/DatabaseService';
import { UnifiedZoneConfig } from '../types/wizard';

// ============================================================================
// Plant Categories
// ============================================================================

/** Category IDs used as keys */
export type PlantCategoryId = 'legume' | 'fructe' | 'gazon' | 'flori' | 'copaci' | 'arbusti' | 'aromate' | 'altele';

export interface PlantCategoryInfo {
    labelKey: string;
    emoji: string;
    dbCategories: string[];  // Maps to PlantDBEntry.category values
}

export const PLANT_CATEGORIES: Record<PlantCategoryId, PlantCategoryInfo> = {
    legume: { labelKey: 'categories.vegetables', emoji: '🍅', dbCategories: ['Vegetable', 'Agriculture'] },
    fructe: { labelKey: 'categories.fruits', emoji: '🍎', dbCategories: ['Fruit'] },
    gazon: { labelKey: 'categories.lawn', emoji: '🌿', dbCategories: ['Lawn', 'Grass'] },
    flori: { labelKey: 'categories.flowers', emoji: '🌸', dbCategories: ['Flower', 'Gardening'] },
    copaci: { labelKey: 'categories.trees', emoji: '🌳', dbCategories: ['Tree'] },
    arbusti: { labelKey: 'categories.shrubs', emoji: '🌲', dbCategories: ['Shrub', 'Landscaping'] },
    aromate: { labelKey: 'categories.herbs', emoji: '🌿', dbCategories: ['Herb'] },
    altele: { labelKey: 'categories.other', emoji: '🪴', dbCategories: ['Indoor', 'Succulent', 'Houseplant', 'Other'] },
};

/**
 * Get category ID for a plant based on its database category
 */
export function getPlantCategory(plant: PlantDBEntry): PlantCategoryId {
    const category = plant.category?.toLowerCase() || '';
    
    for (const [catId, catInfo] of Object.entries(PLANT_CATEGORIES)) {
        if (catInfo.dbCategories.some(db => category.includes(db.toLowerCase()))) {
            return catId as PlantCategoryId;
        }
    }
    
    return 'altele';
}

/**
 * Get popular plants for a category (would be based on usage stats, for now hardcoded)
 */
export const POPULAR_PLANTS: Record<string, string[]> = {
    vegetables: ['Tomato', 'Pepper', 'Cucumber', 'Lettuce', 'Carrot', 'Onion'],
    flowers: ['Rose', 'Petunia', 'Geranium', 'Marigold', 'Dahlia', 'Lavender'],
    lawn: ['Tall Fescue', 'Kentucky Bluegrass', 'Perennial Ryegrass', 'Bermuda Grass'],
    trees: ['Apple', 'Cherry', 'Peach', 'Plum', 'Pear', 'Fig'],
    shrubs: ['Hydrangea', 'Boxwood', 'Forsythia', 'Rhododendron'],
    herbs: ['Basil', 'Mint', 'Rosemary', 'Thyme', 'Oregano', 'Parsley'],
    succulents: ['Aloe Vera', 'Echeveria', 'Sedum', 'Crassula'],
    indoor: ['Pothos', 'Snake Plant', 'Spider Plant', 'Peace Lily'],
};

// ============================================================================
// Irrigation Method Smart Sorting
// ============================================================================

export interface IrrigationMethodWithScore extends IrrigationMethodEntry {
    score: number;
    isRecommended: boolean;
    reasonKey: string;  // For tooltip: 'plant_match', 'coverage_match', 'popular', etc.
}

/**
 * Irrigation method images/icons (can be replaced with actual images)
 */
export interface IrrigationMethodVisual {
    emoji: string;
    image?: string;
    descriptionKey: string;
    bgColor: string;
}

export const IRRIGATION_METHOD_VISUALS: Record<string, IrrigationMethodVisual> = {
    'IRRIG_DRIP_SURFACE': { 
        emoji: '💧', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.dripSurface',
        bgColor: 'from-blue-500/20 to-cyan-500/20'
    },
    'IRRIG_DRIP_SUBSURFACE': { 
        emoji: '💧⬇️', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.dripSubsurface',
        bgColor: 'from-blue-600/20 to-teal-500/20'
    },
    'IRRIG_SPRINKLER_SET': { 
        emoji: '🌀', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.sprinklerSet',
        bgColor: 'from-cyan-500/20 to-sky-500/20'
    },
    'IRRIG_SPRINKLER_POPUP': { 
        emoji: '🌀⬆️', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.sprinklerPopup',
        bgColor: 'from-sky-500/20 to-indigo-500/20'
    },
    'IRRIG_MICROSPRAY': { 
        emoji: '🌫️', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.microspray',
        bgColor: 'from-purple-500/20 to-pink-500/20'
    },
    'IRRIG_SOAKER': { 
        emoji: '🔌', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.soaker',
        bgColor: 'from-green-500/20 to-emerald-500/20'
    },
    'IRRIG_BASIN_FLOOD': { 
        emoji: '🌊', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.basinFlood',
        bgColor: 'from-blue-500/20 to-indigo-500/20'
    },
    'IRRIG_MANUAL': { 
        emoji: '✋', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.manual',
        bgColor: 'from-amber-500/20 to-orange-500/20'
    },
    'IRRIG_FURROW': { 
        emoji: '〰️', 
        descriptionKey: 'wizard.irrigationMethod.descriptions.furrow',
        bgColor: 'from-yellow-500/20 to-amber-500/20'
    },
};

/**
 * Sort irrigation methods intelligently based on plant, coverage, and context
 */
export function sortIrrigationMethods(
    methods: IrrigationMethodEntry[],
    plant: PlantDBEntry | null,
    coverageType: 'area' | 'plants',
    coverageValue: number,
    plantCategory?: string
): IrrigationMethodWithScore[] {
    const scored = methods.map(method => {
        let score = 0;
        let isRecommended = false;
        let reasonKey = 'popular';

        // 1. Plant recommendation match (+100 points)
        if (plant?.typ_irrig_method) {
            const plantRecommends = plant.typ_irrig_method.toUpperCase();
            const methodCode = method.code_enum.toUpperCase();
            
            if (methodCode.includes(plantRecommends) || plantRecommends.includes(methodCode.replace('IRRIG_', ''))) {
                score += 100;
                isRecommended = true;
                reasonKey = 'plant_match';
            }
            
            // Partial matches
            if (plantRecommends.includes('DRIP') && methodCode.includes('DRIP')) {
                score += 50;
            }
            if (plantRecommends.includes('SPRINKLER') && methodCode.includes('SPRINKLER')) {
                score += 50;
            }
        }

        // 2. Coverage context (+20-30 points)
        const isSmallArea = coverageType === 'area' && coverageValue < 20;
        const isLargeArea = coverageType === 'area' && coverageValue > 50;
        const isPlantBased = coverageType === 'plants';

        if (isSmallArea || isPlantBased) {
            // Small areas prefer drip, micro-spray
            if (method.code_enum.includes('DRIP')) {
                score += 30;
                if (reasonKey === 'popular') reasonKey = 'coverage_match';
            }
            if (method.code_enum.includes('MICROSPRAY')) {
                score += 25;
            }
            if (method.code_enum.includes('SOAKER')) {
                score += 20;
            }
        }

        if (isLargeArea) {
            // Large areas prefer sprinklers
            if (method.code_enum.includes('SPRINKLER')) {
                score += 30;
                if (reasonKey === 'popular') reasonKey = 'coverage_match';
            }
            if (method.code_enum.includes('DRIP_SUBSURFACE')) {
                score += 25;
            }
        }

        // 3. Plant category context (+15 points)
        const category = plantCategory?.toLowerCase() || plant?.category?.toLowerCase() || '';
        
        if (category.includes('vegetable') || category.includes('agriculture')) {
            if (method.code_enum.includes('DRIP')) score += 15;
        }
        if (category.includes('lawn') || category.includes('grass')) {
            if (method.code_enum.includes('SPRINKLER')) score += 20;
            if (method.code_enum.includes('DRIP_SUBSURFACE')) score += 15;
        }
        if (category.includes('flower') || category.includes('herb')) {
            if (method.code_enum.includes('MICROSPRAY')) score += 15;
            if (method.code_enum.includes('DRIP')) score += 10;
        }
        if (category.includes('fruit') || category.includes('tree')) {
            if (method.code_enum.includes('DRIP')) score += 15;
            if (method.code_enum.includes('BASIN')) score += 10;
        }

        // 4. Base popularity score
        const popularityScores: Record<string, number> = {
            'IRRIG_DRIP_SURFACE': 10,
            'IRRIG_SPRINKLER_SET': 9,
            'IRRIG_MICROSPRAY': 8,
            'IRRIG_SOAKER': 7,
            'IRRIG_DRIP_SUBSURFACE': 6,
            'IRRIG_SPRINKLER_POPUP': 5,
            'IRRIG_BASIN_FLOOD': 4,
            'IRRIG_MANUAL': 3,
            'IRRIG_FURROW': 2,
        };
        score += popularityScores[method.code_enum] || 1;

        return {
            ...method,
            score,
            isRecommended,
            reasonKey
        };
    });

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
}

// ============================================================================
// What's This? Tooltip Content
// ============================================================================

export interface TooltipContent {
    title: string;
    description: string;
    example?: string;
    icon?: string;
}

interface TooltipKeyContent {
    titleKey: string;
    descriptionKey: string;
    exampleKey?: string;
    icon?: string;
}

const WIZARD_TOOLTIP_KEYS: Record<string, TooltipKeyContent> = {
    fao56: {
        titleKey: 'wizard.tooltips.items.fao56.title',
        descriptionKey: 'wizard.tooltips.items.fao56.description',
        exampleKey: 'wizard.tooltips.items.fao56.example',
        icon: '???',
    },
    field_capacity: {
        titleKey: 'wizard.tooltips.items.fieldCapacity.title',
        descriptionKey: 'wizard.tooltips.items.fieldCapacity.description',
        exampleKey: 'wizard.tooltips.items.fieldCapacity.example',
        icon: '??',
    },
    wilting_point: {
        titleKey: 'wizard.tooltips.items.wiltingPoint.title',
        descriptionKey: 'wizard.tooltips.items.wiltingPoint.description',
        exampleKey: 'wizard.tooltips.items.wiltingPoint.example',
        icon: '??',
    },
    infiltration_rate: {
        titleKey: 'wizard.tooltips.items.infiltrationRate.title',
        descriptionKey: 'wizard.tooltips.items.infiltrationRate.description',
        exampleKey: 'wizard.tooltips.items.infiltrationRate.example',
        icon: '??',
    },
    cycle_soak: {
        titleKey: 'wizard.tooltips.items.cycleSoak.title',
        descriptionKey: 'wizard.tooltips.items.cycleSoak.description',
        exampleKey: 'wizard.tooltips.items.cycleSoak.example',
        icon: '??',
    },
    kc_coefficient: {
        titleKey: 'wizard.tooltips.items.kc.title',
        descriptionKey: 'wizard.tooltips.items.kc.description',
        exampleKey: 'wizard.tooltips.items.kc.example',
        icon: '??',
    },
    kc: {
        titleKey: 'wizard.tooltips.items.kc.title',
        descriptionKey: 'wizard.tooltips.items.kc.description',
        exampleKey: 'wizard.tooltips.items.kc.example',
        icon: '??',
    },
    irrigation_method: {
        titleKey: 'wizard.tooltips.items.irrigationMethod.title',
        descriptionKey: 'wizard.tooltips.items.irrigationMethod.description',
        exampleKey: 'wizard.tooltips.items.irrigationMethod.example',
        icon: '??',
    },
    et0: {
        titleKey: 'wizard.tooltips.items.et0.title',
        descriptionKey: 'wizard.tooltips.items.et0.description',
        exampleKey: 'wizard.tooltips.items.et0.example',
        icon: '???',
    },
    coverage: {
        titleKey: 'wizard.tooltips.items.coverage.title',
        descriptionKey: 'wizard.tooltips.items.coverage.description',
        exampleKey: 'wizard.tooltips.items.coverage.example',
        icon: '??',
    },
    sun_exposure: {
        titleKey: 'wizard.tooltips.items.sunExposure.title',
        descriptionKey: 'wizard.tooltips.items.sunExposure.description',
        exampleKey: 'wizard.tooltips.items.sunExposure.example',
        icon: '??',
    },
    max_volume: {
        titleKey: 'wizard.tooltips.items.maxVolume.title',
        descriptionKey: 'wizard.tooltips.items.maxVolume.description',
        exampleKey: 'wizard.tooltips.items.maxVolume.example',
        icon: '??',
    },
    planting_date: {
        titleKey: 'wizard.tooltips.items.plantingDate.title',
        descriptionKey: 'wizard.tooltips.items.plantingDate.description',
        exampleKey: 'wizard.tooltips.items.plantingDate.example',
        icon: '??',
    },
    drip_irrigation: {
        titleKey: 'wizard.tooltips.items.dripIrrigation.title',
        descriptionKey: 'wizard.tooltips.items.dripIrrigation.description',
        exampleKey: 'wizard.tooltips.items.dripIrrigation.example',
        icon: '??',
    },
    sprinkler: {
        titleKey: 'wizard.tooltips.items.sprinkler.title',
        descriptionKey: 'wizard.tooltips.items.sprinkler.description',
        exampleKey: 'wizard.tooltips.items.sprinkler.example',
        icon: '???',
    },
    soil_auto_detect: {
        titleKey: 'wizard.tooltips.items.soilAutoDetect.title',
        descriptionKey: 'wizard.tooltips.items.soilAutoDetect.description',
        exampleKey: 'wizard.tooltips.items.soilAutoDetect.example',
        icon: '??',
    },
};

/**
 * Get tooltip content by key
 */
export function getTooltipContent(t: (key: string) => string, key: string): TooltipContent | null {
    const content = WIZARD_TOOLTIP_KEYS[key];
    if (!content) return null;
    return {
        title: t(content.titleKey),
        description: t(content.descriptionKey),
        example: content.exampleKey ? t(content.exampleKey) : undefined,
        icon: content.icon,
    };
}

// ============================================================================
// Validation Messages
// ============================================================================

export interface ValidationWarning {
    type: 'warning' | 'info' | 'suggestion';
    message: string;
    field: string;
}

/**
 * Generate contextual warnings/suggestions based on configuration
 */
export function getConfigurationWarnings(t: (key: string) => string, config: Partial<UnifiedZoneConfig>): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Irrigation method vs plant mismatch
    if (config.plant && config.irrigationMethod) {
        const plantRecommends = config.plant.typ_irrig_method?.toUpperCase() || '';
        const selectedMethod = config.irrigationMethod.code_enum?.toUpperCase() || '';

        if (plantRecommends.includes('DRIP') && selectedMethod.includes('SPRINKLER')) {
            warnings.push({
                type: 'suggestion',
                message: t('wizard.warnings.irrigationDripPreferred').replace('{plant}', config.plant.common_name_en),
                field: 'irrigationMethod'
            });
        }

        if (plantRecommends.includes('SPRINKLER') && selectedMethod.includes('DRIP') && 
            config.plant.category?.toLowerCase().includes('lawn')) {
            warnings.push({
                type: 'info',
                message: t('wizard.warnings.lawnSprinklerPreferred'),
                field: 'irrigationMethod'
            });
        }
    }

    // Cycle & Soak suggestion for clay soils
    if (config.soil && !config.enableCycleSoak) {
        const infiltration = config.soil.infiltration_rate_mm_h;
        if (typeof infiltration === 'number' && infiltration < 8) {
            warnings.push({
                type: 'suggestion',
                message: t('wizard.warnings.slowSoilCycleSoak').replace('{soil}', config.soil.texture),
                field: 'enableCycleSoak'
            });
        }
    }

    // Coverage too small/large warnings
    if (config.coverageValue) {
        if (config.coverageType === 'area' && config.coverageValue > 200) {
            warnings.push({
                type: 'info',
                message: t('wizard.warnings.largeArea'),
                field: 'coverageValue'
            });
        }
        if (config.coverageType === 'plants' && config.coverageValue > 50) {
            warnings.push({
                type: 'info',
                message: t('wizard.warnings.manyPlants'),
                field: 'coverageValue'
            });
        }
    }

    // Sun exposure extremes
    if (config.sunExposure !== undefined) {
        if (config.sunExposure > 95) {
            warnings.push({
                type: 'info',
                message: t('wizard.warnings.highSunExposure'),
                field: 'sunExposure'
            });
        }
        if (config.sunExposure < 20 && config.plant && !config.plant.indoor_ok) {
            warnings.push({
                type: 'warning',
                message: t('wizard.warnings.lowSunExposure').replace('{plant}', config.plant.common_name_en),
                field: 'sunExposure'
            });
        }
    }

    return warnings;
}

// ============================================================================
// Quick Clone Helper
// ============================================================================

/**
 * Creates a clone of a zone configuration for a new channel
 */
export function cloneZoneConfig(
    sourceConfig: UnifiedZoneConfig,
    newChannelId: number,
    options: {
        keepName?: boolean;
        keepSchedule?: boolean;
        keepCoverage?: boolean;
    } = {}
): UnifiedZoneConfig {
    const { keepName = false, keepSchedule = true, keepCoverage = false } = options;

    return {
        ...sourceConfig,
        channelId: newChannelId,
        name: keepName ? sourceConfig.name : `Zona ${newChannelId + 1}`,
        enabled: false,  // Will be enabled when saved
        skipped: false,
        coverageValue: keepCoverage ? sourceConfig.coverageValue : 10,
        schedule: keepSchedule 
            ? { ...sourceConfig.schedule }
            : { ...sourceConfig.schedule, enabled: true },
    };
}
