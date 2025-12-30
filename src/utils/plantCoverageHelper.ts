/**
 * plantCoverageHelper.ts
 * 
 * Determines recommended coverage type (m² vs plants) based on plant density.
 * 
 * Logic from firmware (plant_full_db.inc):
 * - spacing_row_m, spacing_plant_m → gives m²/plant directly
 * - default_density_plants_m2 → gives plants/m², so area_per_plant = 1/density
 * 
 * Threshold: 0.02 m²/plant = 50 plants/m²
 * - area_per_plant ≤ 0.02 → Dense crop (wheat, grass) → Use AREA (m²)
 * - area_per_plant > 0.02 → Sparse planting (tomato, rose) → Use PLANT_COUNT
 * - Unknown → Allow user to choose
 */

import type { PlantDBEntry } from '../services/DatabaseService';

/** Coverage mode recommendation */
export type CoverageMode = 'area' | 'plants' | 'both';

/** Threshold in m²/plant. Plants below this are "dense" crops. */
const DENSE_CROP_THRESHOLD = 0.02; // 50 plants/m²

/**
 * Calculate area per plant in m² from plant database entry.
 * 
 * @param plant - Plant database entry (may be null)
 * @returns Area per plant in m², or null if cannot be calculated
 */
export function getAreaPerPlant(plant: PlantDBEntry | null): number | null {
    if (!plant) return null;

    // Method 1: Use spacing if both values are provided and > 0
    const rowSpacing = plant.spacing_row_m;
    const plantSpacing = plant.spacing_plant_m;

    if (rowSpacing != null && rowSpacing > 0 && plantSpacing != null && plantSpacing > 0) {
        return rowSpacing * plantSpacing;
    }

    // Method 2: Use density if available
    const density = plant.default_density_plants_m2;
    if (density != null && density > 0) {
        return 1 / density;
    }

    // Cannot calculate
    return null;
}

/**
 * Determine which coverage type options should be available for a plant.
 * 
 * @param plant - Plant database entry (may be null)
 * @returns 'area' (m² only), 'plants' (plant count only), or 'both' (user choice)
 * 
 * @example
 * // Wheat (222 plants/m²) → area_per_plant = 0.0045 → returns 'area'
 * getRecommendedCoverageType(wheatPlant)
 * 
 * @example
 * // Tomato (2 plants/m²) → area_per_plant = 0.5 → returns 'plants'
 * getRecommendedCoverageType(tomatoPlant)
 */
export function getRecommendedCoverageType(plant: PlantDBEntry | null): CoverageMode {
    const areaPerPlant = getAreaPerPlant(plant);

    if (areaPerPlant === null) {
        // Unknown density → allow user to choose
        return 'both';
    }

    if (areaPerPlant <= DENSE_CROP_THRESHOLD) {
        // Dense crop (≥50 plants/m²) → recommend m²
        // Counting 222 wheat plants is impractical
        return 'area';
    }

    // Sparse planting (<50 plants/m²) → recommend plant count
    // User has specific number of tomatoes, roses, etc.
    return 'plants';
}

/**
 * Get a human-readable explanation for why a coverage mode was recommended.
 * 
 * @param plant - Plant database entry
 * @param mode - The recommended coverage mode
 * @returns Explanation string in Romanian
 */
export function getCoverageModeExplanation(plant: PlantDBEntry | null, mode: CoverageMode): string {
    if (!plant) return '';

    if (mode === 'area') {
        return 'Cultură densă - folosim suprafața';
    }

    if (mode === 'plants') {
        return 'Plantare rară - introduci numărul de plante';
    }

    return '';
}
