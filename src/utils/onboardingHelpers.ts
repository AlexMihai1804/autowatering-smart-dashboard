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
    label: string;
    emoji: string;
    dbCategories: string[];  // Maps to PlantDBEntry.category values
}

export const PLANT_CATEGORIES: Record<PlantCategoryId, PlantCategoryInfo> = {
    legume: { label: 'Legume', emoji: '🍅', dbCategories: ['Vegetable', 'Agriculture'] },
    fructe: { label: 'Fructe', emoji: '🍎', dbCategories: ['Fruit'] },
    gazon: { label: 'Gazon', emoji: '🌿', dbCategories: ['Lawn', 'Grass'] },
    flori: { label: 'Flori', emoji: '🌸', dbCategories: ['Flower', 'Gardening'] },
    copaci: { label: 'Copaci', emoji: '🌳', dbCategories: ['Tree'] },
    arbusti: { label: 'Arbuști', emoji: '🌲', dbCategories: ['Shrub', 'Landscaping'] },
    aromate: { label: 'Aromate', emoji: '🌿', dbCategories: ['Herb'] },
    altele: { label: 'Altele', emoji: '🪴', dbCategories: ['Indoor', 'Succulent', 'Houseplant', 'Other'] },
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
    description: string;
    bgColor: string;
}

export const IRRIGATION_METHOD_VISUALS: Record<string, IrrigationMethodVisual> = {
    'IRRIG_DRIP_SURFACE': { 
        emoji: '💧', 
        description: 'Picurare lentă la rădăcină. Eficiență 90%+',
        bgColor: 'from-blue-500/20 to-cyan-500/20'
    },
    'IRRIG_DRIP_SUBSURFACE': { 
        emoji: '💧⬇️', 
        description: 'Picurare sub sol. Ideal pentru gazon',
        bgColor: 'from-blue-600/20 to-teal-500/20'
    },
    'IRRIG_SPRINKLER_SET': { 
        emoji: '🌀', 
        description: 'Stropire rotativă. Bun pentru suprafețe mari',
        bgColor: 'from-cyan-500/20 to-sky-500/20'
    },
    'IRRIG_SPRINKLER_POPUP': { 
        emoji: '🌀⬆️', 
        description: 'Sprinkler ascuns. Aspect estetic',
        bgColor: 'from-sky-500/20 to-indigo-500/20'
    },
    'IRRIG_MICROSPRAY': { 
        emoji: '🌫️', 
        description: 'Ceață fină. Ideal pentru flori și ierburi',
        bgColor: 'from-purple-500/20 to-pink-500/20'
    },
    'IRRIG_SOAKER': { 
        emoji: '🔌', 
        description: 'Furtun poros. Simplu de instalat',
        bgColor: 'from-green-500/20 to-emerald-500/20'
    },
    'IRRIG_BASIN_FLOOD': { 
        emoji: '🌊', 
        description: 'Inundare controlată. Pentru pomi și arbuști',
        bgColor: 'from-blue-500/20 to-indigo-500/20'
    },
    'IRRIG_MANUAL': { 
        emoji: '✋', 
        description: 'Manual cu furtun. Flexibilitate maximă',
        bgColor: 'from-amber-500/20 to-orange-500/20'
    },
    'IRRIG_FURROW': { 
        emoji: '〰️', 
        description: 'Irigare prin șanțuri. Pentru grădini mari',
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

export const WIZARD_TOOLTIPS: Record<string, TooltipContent> = {
    'fao56': {
        title: 'Ce este FAO-56?',
        description: 'O metodă științifică dezvoltată de ONU (FAO) pentru calculul precis al nevoilor de apă ale plantelor. Ia în considerare tipul plantei, solul, vremea și faza de creștere.',
        example: 'Folosită de ferme și grădini profesionale în peste 150 de țări.',
        icon: '🌍'
    },
    'field_capacity': {
        title: 'Capacitate de câmp (Field Capacity)',
        description: 'Cantitatea maximă de apă pe care solul o poate reține împotriva gravitației. Este ca un burete ud - toată apa care nu curge.',
        example: 'Nisip: ~15%, Argilă: ~45%, Loam: ~35%',
        icon: '🧽'
    },
    'wilting_point': {
        title: 'Punct de ofilire (Wilting Point)',
        description: 'Nivelul de umiditate la care plantele nu mai pot extrage apă din sol și încep să se ofilească. Sub acest nivel = plantă în suferință.',
        example: 'Nisip: ~5%, Argilă: ~25%, Loam: ~15%',
        icon: '🥀'
    },
    'infiltration_rate': {
        title: 'Rată de infiltrare',
        description: 'Cât de repede absoarbe solul apa. Nisipul absoarbe rapid (risc de scurgere în adâncime), argila lent (risc de băltire la suprafață).',
        example: 'Nisip: 25+ mm/h, Argilă: 3-5 mm/h',
        icon: '💧'
    },
    'cycle_soak': {
        title: 'Cycle & Soak',
        description: 'Tehnică pentru soluri grele (argiloase): udă puțin, pauză să absoarbă, repetă. Previne bălțile și scurgerea pe suprafață.',
        example: 'Argilă: 3 min udare, 20 min pauză, repetă de 3 ori',
        icon: '🔄'
    },
    'kc_coefficient': {
        title: 'Coeficient Kc',
        description: 'Raportul dintre consumul de apă al plantei tale și cel al gazonului de referință. Valori >1 = consumă mai mult decât gazonul.',
        example: 'Tomate la fructificare: Kc=1.15, Gazon: Kc=1.0',
        icon: '📊'
    },
    'et0': {
        title: 'Evapotranspirație (ET₀)',
        description: 'Cantitatea de apă care se evaporă din sol + transpirată de plante. Depinde de temperatură, vânt, umiditate. Vara: mare, iarna: mică.',
        example: 'Ianuarie RO: ~0.5 mm/zi, Iulie RO: ~5-6 mm/zi',
        icon: '☀️'
    },
    'coverage': {
        title: 'Suprafață / Nr. plante',
        description: 'Zona udată de acest canal. Poți specifica în metri pătrați (pentru gazon, paturi de flori) sau număr de plante (pentru legume, pomi).',
        example: '15 m² gazon sau 20 de plante de tomate',
        icon: '📐'
    },
    'sun_exposure': {
        title: 'Expunere la soare',
        description: 'Cât soare direct primește zona pe parcursul zilei. Afectează evaporarea și necesarul de apă.',
        example: 'Umbră totală: 20-30%, Parțial: 50-70%, Soare plin: 80-100%',
        icon: '☀️'
    },
    'max_volume': {
        title: 'Volum maxim (siguranță)',
        description: 'Limită de siguranță pentru a preveni inundarea. Sistemul nu va turna mai mult de atât într-o singură sesiune, indiferent de calcule.',
        example: 'Ghiveci mic: 5L, Strat legume: 50L, Gazon 100m²: 200L',
        icon: '🛡️'
    },
    'planting_date': {
        title: 'Data plantării',
        description: 'Când au fost plantate. Sistemul ajustează automat coeficientul Kc în funcție de faza de creștere (răsad → dezvoltare → maturitate → sfârșit).',
        example: 'Tomate plantate pe 15 Mai → Kc crește treptat până în Iulie',
        icon: '📅'
    },
    'drip_irrigation': {
        title: 'Irigare prin picurare (Drip)',
        description: 'Apă livrată lent, direct la rădăcină. Cea mai eficientă metodă (90%+ eficiență), minimizează evaporarea și bolile foliare.',
        example: 'Ideal pentru: legume, pomi, arbuști, flori în straturi',
        icon: '💧'
    },
    'sprinkler': {
        title: 'Sprinkler (Stropire)',
        description: 'Simulează ploaia naturală. Pierde 20-30% prin evaporare, dar acoperă suprafețe mari uniform.',
        example: 'Ideal pentru: gazon, suprafețe mari deschise',
        icon: '🌀'
    },
    'soil_auto_detect': {
        title: 'Detectare automată sol',
        description: 'Folosim baza de date globală SoilGrids (ISRIC) care conține informații despre sol la rezoluție de 250m, bazate pe analize satelitare și probe de teren.',
        example: 'Precizie: înaltă pentru zone agricole, medie pentru zone urbane',
        icon: '🔍'
    },
};

/**
 * Get tooltip content by key
 */
export function getTooltipContent(key: string): TooltipContent | null {
    return WIZARD_TOOLTIPS[key] || null;
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
export function getConfigurationWarnings(config: Partial<UnifiedZoneConfig>): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Irrigation method vs plant mismatch
    if (config.plant && config.irrigationMethod) {
        const plantRecommends = config.plant.typ_irrig_method?.toUpperCase() || '';
        const selectedMethod = config.irrigationMethod.code_enum?.toUpperCase() || '';

        if (plantRecommends.includes('DRIP') && selectedMethod.includes('SPRINKLER')) {
            warnings.push({
                type: 'suggestion',
                message: `${config.plant.common_name_en} preferă irigare prin picurare. Sprinkler poate cauza boli foliare.`,
                field: 'irrigationMethod'
            });
        }

        if (plantRecommends.includes('SPRINKLER') && selectedMethod.includes('DRIP') && 
            config.plant.category?.toLowerCase().includes('lawn')) {
            warnings.push({
                type: 'info',
                message: 'Gazonul se udă de obicei cu sprinkler pentru acoperire uniformă. Drip funcționează dar necesită spațiere atentă.',
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
                message: `Solul ${config.soil.texture} absoarbe apa lent. Recomandăm activarea Cycle & Soak pentru a preveni scurgerea.`,
                field: 'enableCycleSoak'
            });
        }
    }

    // Coverage too small/large warnings
    if (config.coverageValue) {
        if (config.coverageType === 'area' && config.coverageValue > 200) {
            warnings.push({
                type: 'info',
                message: 'Suprafață mare! Asigură-te că debitul sistemului este suficient pentru acoperire uniformă.',
                field: 'coverageValue'
            });
        }
        if (config.coverageType === 'plants' && config.coverageValue > 50) {
            warnings.push({
                type: 'info',
                message: 'Multe plante pe un singur canal. Verifică că toate primesc apă suficientă.',
                field: 'coverageValue'
            });
        }
    }

    // Sun exposure extremes
    if (config.sunExposure !== undefined) {
        if (config.sunExposure > 95) {
            warnings.push({
                type: 'info',
                message: 'Expunere maximă la soare. Plantele vor avea nevoie de mai multă apă în zilele călduroase.',
                field: 'sunExposure'
            });
        }
        if (config.sunExposure < 20 && config.plant && !config.plant.indoor_ok) {
            warnings.push({
                type: 'warning',
                message: `${config.plant.common_name_en} preferă soare. În umbră totală poate avea probleme de creștere.`,
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
