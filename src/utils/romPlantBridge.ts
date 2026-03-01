/**
 * ROM Plant Bridge
 * 
 * Maps between marketplace cloud plants and ROM plants embedded in device firmware.
 * ROM plants have IDs 1–223 and are baked into the firmware binary.
 * Marketplace seeded plants correspond 1:1 with ROM plants via the `romPlantId` field.
 *
 * This utility also provides a client-side fallback: matching by scientific name
 * when `romPlantId` is not yet populated on the backend.
 */

import type { MarketplacePlant, PlantSummary } from '../types/marketplace';
import { isRomPlant, PLANT_ID_RANGES } from '../types/firmware_structs';
import type { PlantDBEntry } from '../services/DatabaseService';

// ── Core helpers ─────────────────────────────────────────────────

/**
 * Check if a marketplace plant is linked to a ROM plant.
 * Returns the ROM plant ID or undefined.
 */
export function getLinkedRomPlantId(plant: MarketplacePlant | PlantSummary): number | undefined {
    if ('romPlantId' in plant && typeof (plant as MarketplacePlant).romPlantId === 'number') {
        return (plant as MarketplacePlant).romPlantId;
    }
    return undefined;
}

/**
 * Check if a device plant ID is a ROM plant (1–223).
 */
export function isRomPlantId(plantId: number): boolean {
    return isRomPlant(plantId);
}

// ── Fallback: name-based matching ────────────────────────────────

/** Normalise a scientific name for matching */
function normalise(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

/**
 * Build a lookup map from normalised scientific name → ROM plant ID.
 * `plantDb` is the BLE-synced plant database stored in useAppStore.
 */
export function buildRomNameIndex(
    plantDb: PlantDBEntry[]
): Map<string, number> {
    const map = new Map<string, number>();
    for (const entry of plantDb) {
        if (entry.id >= PLANT_ID_RANGES.ROM_MIN && entry.id <= PLANT_ID_RANGES.ROM_MAX) {
            const sciName = entry.scientific_name || entry.common_name_en;
            if (sciName) {
                map.set(normalise(sciName), entry.id);
            }
        }
    }
    return map;
}

/**
 * Try to match a marketplace plant to a ROM plant by scientific name.
 * Returns the ROM plant ID or undefined.
 */
export function matchByScientificName(
    plant: MarketplacePlant | PlantSummary,
    romNameIndex: Map<string, number>
): number | undefined {
    const sciName = plant.scientificName;
    if (!sciName) return undefined;
    return romNameIndex.get(normalise(sciName));
}

/**
 * Get the effective ROM plant ID for a marketplace plant.
 * Prefers the explicit `romPlantId` field, falls back to scientific name matching.
 */
export function resolveRomPlantId(
    plant: MarketplacePlant,
    romNameIndex: Map<string, number>
): number | undefined {
    return getLinkedRomPlantId(plant) ?? matchByScientificName(plant, romNameIndex);
}

// ── Device status helpers ────────────────────────────────────────

/**
 * Determine if a marketplace plant is already on the device as a ROM plant (no sync needed).
 * This is complementary to the custom plant devicePlantMap in useMarketplaceStore.
 */
export function isAlreadyOnDeviceAsRom(
    plant: MarketplacePlant,
    romNameIndex: Map<string, number>
): boolean {
    const romId = resolveRomPlantId(plant, romNameIndex);
    return romId !== undefined;
}

/**
 * Return a display label for the device status of a marketplace plant.
 *  - 'rom' → already on device as a ROM plant
 *  - 'synced' → synced as a custom plant
 *  - 'not-synced' → not on device
 */
export function getDeviceStatus(
    plant: MarketplacePlant,
    devicePlantMap: Record<string, number>,
    romNameIndex: Map<string, number>
): 'rom' | 'synced' | 'not-synced' {
    if (plant.plantId in devicePlantMap) return 'synced';
    if (isAlreadyOnDeviceAsRom(plant, romNameIndex)) return 'rom';
    return 'not-synced';
}
