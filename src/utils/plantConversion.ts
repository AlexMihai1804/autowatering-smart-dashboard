/**
 * Plant Conversion Utility
 *
 * Converts marketplace plantData (cloud/DynamoDB format) to PackPlantV1 (firmware binary struct).
 * Also supports converting PackPlantV1 back to marketplace plantData for publishing.
 *
 * Unit reference:
 *   Cloud (plantData)        │ Firmware (PackPlantV1)
 *   ─────────────────────────┼────────────────────────────
 *   kc_ini: 0.3 (float)     │ kc_ini_x1000: 300 (u16)
 *   root_depth_min_m: 1.0   │ root_depth_min_mm: 1000 (u16)
 *   depletion_fraction_p: 0.55 │ depletion_fraction_p_x1000: 550 (u16)
 *   spacing_row_m: 0.15     │ spacing_row_mm: 150 (u16)
 *   density: 222.22          │ density_x100: 22222 (u16)
 *   canopy_cover_max_frac: 0.9│ canopy_max_x1000: 900 (u16)
 *   typ_irrig_method: "DRIP" │ typ_irrig_method_id: 7 (u8)
 *   growth_cycle: "Annual"   │ growth_cycle: 0 (u8)
 */

import type { PackPlantV1 } from '../types/firmware_structs';
import { GROWTH_CYCLE, PLANT_ID_RANGES } from '../types/firmware_structs';

// ── Irrigation Method Mapping ──────────────────────────────────────────
// Maps CSV/cloud string → firmware typ_irrig_method_id
// We map generic CSV labels to the closest irrigation_methods.json id (0-14).
const IRRIGATION_METHOD_STRING_TO_ID: Record<string, number> = {
  // CSV values from plants_full.csv
  DRIP: 7,                // "Drip Surface (Line+Emitters)"
  SPRINKLER: 3,           // "Conventional Sprinkler (Hand/Set)"
  SURFACE: 0,             // "Surface Flood (Level Basin)"
  MANUAL: 3,              // Treat as conventional sprinkler
  RAINFED: 0,             // No irrigation, closest to surface
  // Lowercase variants
  drip: 7,
  sprinkler: 3,
  surface: 0,
  manual: 3,
  rainfed: 0,
  // code_enum values from irrigation_methods.json
  IRRIG_SURFACE_FLOOD: 0,
  IRRIG_SURFACE_BORDER: 1,
  IRRIG_SURFACE_FURROW: 2,
  IRRIG_SPRINKLER_SET: 3,
  IRRIG_SPRINKLER_PIVOT: 4,
  IRRIG_SPRINKLER_LEPA: 5,
  IRRIG_MICRO_SPRAY: 6,
  IRRIG_DRIP_SURFACE: 7,
  IRRIG_DRIP_SUBSURFACE: 8,
  IRRIG_DRIP_TAPE: 9,
  IRRIG_BUBBLER: 10,
  IRRIG_SUBIRRIGATION: 11,
  IRRIG_WICK_BED: 12,
  IRRIG_HYDROPONIC_RECIRC: 13,
  IRRIG_AEROPONIC: 14,
};

const IRRIGATION_ID_TO_STRING: Record<number, string> = {
  0: 'SURFACE',
  1: 'SURFACE',
  2: 'SURFACE',
  3: 'SPRINKLER',
  4: 'SPRINKLER',
  5: 'SPRINKLER',
  6: 'SPRINKLER',
  7: 'DRIP',
  8: 'DRIP',
  9: 'DRIP',
  10: 'DRIP',
  11: 'SURFACE',
  12: 'SURFACE',
  13: 'DRIP',
  14: 'DRIP',
};

// ── Growth Cycle Mapping ───────────────────────────────────────────────
const GROWTH_CYCLE_STRING_TO_ID: Record<string, number> = {
  Annual: GROWTH_CYCLE.ANNUAL,
  annual: GROWTH_CYCLE.ANNUAL,
  ANNUAL: GROWTH_CYCLE.ANNUAL,
  Perennial: GROWTH_CYCLE.PERENNIAL,
  perennial: GROWTH_CYCLE.PERENNIAL,
  PERENNIAL: GROWTH_CYCLE.PERENNIAL,
  Biennial: GROWTH_CYCLE.PERENNIAL,   // Firmware only has annual/perennial
  biennial: GROWTH_CYCLE.PERENNIAL,
  BIENNIAL: GROWTH_CYCLE.PERENNIAL,
};

const GROWTH_CYCLE_ID_TO_STRING: Record<number, string> = {
  [GROWTH_CYCLE.ANNUAL]: 'Annual',
  [GROWTH_CYCLE.PERENNIAL]: 'Perennial',
};

// ── Helper: safe numeric extraction ────────────────────────────────────
function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function str(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

// ── CRC16-CCITT for cloud ID hashing ───────────────────────────────────
/**
 * CRC16-CCITT (0xFFFF initial, polynomial 0x1021).
 * Used to hash marketplace plantId UUID strings into 2 bytes for the
 * cloud_id_crc16 field in PackPlantV1. Returns 0 for empty/null input.
 * Collision probability ~1/65535 — acceptable for <1000 plants per device.
 */
export function crc16ccitt(input: string): number {
  if (!input) return 0;
  let crc = 0xFFFF;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return crc & 0xFFFF;
}

// ── Cloud → Firmware Conversion ────────────────────────────────────────

export interface CloudToFirmwareOptions {
  /** The plant_id to assign (≥224 for custom). If not given, uses CUSTOM_MIN. */
  plantId?: number;
  /** Pack ID (default 0 = no pack). */
  packId?: number;
  /** Common name (if not in plantData). */
  commonName?: string;
  /** Scientific name (if not in plantData). */
  scientificName?: string;
  /** Marketplace cloud plantId UUID (used to compute cloud_id_crc16). */
  cloudPlantId?: string;
  /** Marketplace cloud version number (written to firmware version field). Default 1. */
  cloudVersion?: number;
}

/**
 * Convert marketplace plantData (cloud format) to PackPlantV1 firmware struct.
 *
 * Handles all unit conversions:
 * - Kc floats → ×1000 integers
 * - Root depth m → mm
 * - Depletion fraction → ×1000
 * - Spacing m → mm
 * - Density → ×100
 * - Canopy fraction → ×1000
 * - Irrigation method string → numeric ID
 * - Growth cycle string → enum
 */
export function plantDataToPackPlantV1(
  plantData: Record<string, unknown>,
  options: CloudToFirmwareOptions = {}
): PackPlantV1 {
  const {
    plantId = PLANT_ID_RANGES.CUSTOM_MIN,
    packId = 0,
    commonName = '',
    scientificName = '',
    cloudPlantId = '',
    cloudVersion = 1,
  } = options;

  // Extract Kc values (cloud stores as float, firmware as ×1000)
  const kcIni = num(plantData.kc_ini);
  const kcMid = num(plantData.kc_mid);
  const kcEnd = num(plantData.kc_end);
  // kc_dev may be missing in some plants; synthesize as average of ini and mid
  const kcDev = num(plantData.kc_dev) || (kcIni + kcMid) / 2;

  // Root depth (cloud in meters, firmware in mm)
  const rootDepthMinM = num(plantData.root_depth_min_m, 0.3);
  const rootDepthMaxM = num(plantData.root_depth_max_m, 0.6);

  // Depletion fraction (cloud: 0.0-1.0 fraction, firmware: ×1000)
  const depletionP = num(plantData.depletion_fraction_p, 0.5);

  // Growth stages in days
  const stageIni = num(plantData.stage_days_ini, 20);
  const stageDev = num(plantData.stage_days_dev, 30);
  const stageMid = num(plantData.stage_days_mid, 40);
  const stageEnd = num(plantData.stage_days_end, 20);

  // Growth cycle
  const growthCycleStr = str(plantData.growth_cycle, 'Perennial');
  const growthCycleId = GROWTH_CYCLE_STRING_TO_ID[growthCycleStr] ?? GROWTH_CYCLE.PERENNIAL;

  // Spacing (cloud in meters, firmware in mm)
  const spacingRowM = num(plantData.spacing_row_m, 0.3);
  const spacingPlantM = num(plantData.spacing_plant_m, 0.3);

  // Density (cloud: plants/m², firmware: ×100)
  const density = num(plantData.default_density_plants_m2, 1.0);

  // Canopy (cloud: 0.0-1.0 fraction, firmware: ×1000)
  const canopy = num(plantData.canopy_cover_max_frac, 0.8);

  // Temperature
  const frostTol = num(plantData.frost_tolerance_c, 0);
  const tempOptMin = num(plantData.temp_opt_min_c, 10);
  const tempOptMax = num(plantData.temp_opt_max_c, 30);

  // Irrigation method
  const irrigStr = str(plantData.typ_irrig_method, 'SPRINKLER');
  const irrigId = IRRIGATION_METHOD_STRING_TO_ID[irrigStr] ?? 3;

  // Names: prefer provided options, fallback to plantData
  const name = commonName || str(plantData.common_name) || str(plantData.common_name_en, 'Unknown');
  const sciName = scientificName || str(plantData.scientific_name, '');

  return {
    plant_id: plantId,
    pack_id: packId,
    version: clamp(cloudVersion, 1, 65535),
    cloud_id_crc16: crc16ccitt(cloudPlantId),
    common_name: name.substring(0, 47),
    scientific_name: sciName.substring(0, 63),
    kc_ini_x1000: clamp(Math.round(kcIni * 1000), 100, 65535),
    kc_dev_x1000: clamp(Math.round(kcDev * 1000), 100, 65535),
    kc_mid_x1000: clamp(Math.round(kcMid * 1000), 100, 65535),
    kc_end_x1000: clamp(Math.round(kcEnd * 1000), 100, 65535),
    root_depth_min_mm: clamp(Math.round(rootDepthMinM * 1000), 10, 65535),
    root_depth_max_mm: clamp(Math.round(rootDepthMaxM * 1000), 20, 65535),
    stage_days_ini: clamp(Math.round(stageIni), 1, 255),
    stage_days_dev: clamp(Math.round(stageDev), 1, 255),
    stage_days_mid: clamp(Math.round(stageMid), 1, 65535),
    stage_days_end: clamp(Math.round(stageEnd), 1, 255),
    growth_cycle: growthCycleId,
    depletion_fraction_p_x1000: clamp(Math.round(depletionP * 1000), 1, 1000),
    spacing_row_mm: clamp(Math.round(spacingRowM * 1000), 10, 65535),
    spacing_plant_mm: clamp(Math.round(spacingPlantM * 1000), 10, 65535),
    density_x100: clamp(Math.round(density * 100), 1, 65535),
    canopy_max_x1000: clamp(Math.round(canopy * 1000), 1, 1000),
    frost_tolerance_c: clamp(Math.round(frostTol), -128, 127),
    temp_opt_min_c: clamp(Math.round(tempOptMin), 0, 255),
    temp_opt_max_c: clamp(Math.round(tempOptMax), 0, 255),
    typ_irrig_method_id: clamp(irrigId, 0, 14),
    water_need_factor_x100: 100,    // Default 1.00x
    irrigation_freq_days: 1,         // Default daily
    prefer_area_based: 1,            // Default area-based
  };
}

// ── Firmware → Cloud Conversion ────────────────────────────────────────

/**
 * Convert PackPlantV1 firmware struct back to marketplace-style plantData.
 * Useful when publishing a custom device plant to the marketplace.
 */
export function packPlantV1ToPlantData(plant: PackPlantV1): Record<string, unknown> {
  return {
    kc_ini: plant.kc_ini_x1000 / 1000,
    kc_dev: plant.kc_dev_x1000 / 1000,
    kc_mid: plant.kc_mid_x1000 / 1000,
    kc_end: plant.kc_end_x1000 / 1000,
    root_depth_min_m: plant.root_depth_min_mm / 1000,
    root_depth_max_m: plant.root_depth_max_mm / 1000,
    depletion_fraction_p: plant.depletion_fraction_p_x1000 / 1000,
    allowable_depletion_pct: Math.round(plant.depletion_fraction_p_x1000 / 10),
    stage_days_ini: plant.stage_days_ini,
    stage_days_dev: plant.stage_days_dev,
    stage_days_mid: plant.stage_days_mid,
    stage_days_end: plant.stage_days_end,
    growth_cycle: GROWTH_CYCLE_ID_TO_STRING[plant.growth_cycle] ?? 'Perennial',
    spacing_row_m: plant.spacing_row_mm / 1000,
    spacing_plant_m: plant.spacing_plant_mm / 1000,
    default_density_plants_m2: plant.density_x100 / 100,
    canopy_cover_max_frac: plant.canopy_max_x1000 / 1000,
    frost_tolerance_c: plant.frost_tolerance_c,
    temp_opt_min_c: plant.temp_opt_min_c,
    temp_opt_max_c: plant.temp_opt_max_c,
    typ_irrig_method: IRRIGATION_ID_TO_STRING[plant.typ_irrig_method_id] ?? 'SPRINKLER',
  };
}

/**
 * Validates that a plantData record has enough data to produce a valid PackPlantV1.
 * Returns an array of missing/invalid field names.
 */
export function validatePlantDataForDevice(plantData: Record<string, unknown>): string[] {
  const issues: string[] = [];
  const required = [
    'kc_ini', 'kc_mid', 'kc_end',
    'root_depth_min_m', 'root_depth_max_m',
    'stage_days_ini', 'stage_days_dev', 'stage_days_mid', 'stage_days_end',
  ];

  for (const field of required) {
    const val = plantData[field];
    if (val === null || val === undefined || val === '') {
      issues.push(field);
    } else {
      const n = Number(val);
      if (isNaN(n) || n <= 0) {
        issues.push(field);
      }
    }
  }

  return issues;
}
