import type { PlantIdCandidate } from '../services/PlantIdService';
import { getPlantIdCandidateLookupKeys } from './plantIdMapping';

export type PlantIdAliasSource = 'camera_auto' | 'camera_review' | 'camera_manual';

export type PlantIdAliasEntry = {
  plant_id: number;
  updated_at: string;
  source: PlantIdAliasSource;
};

export type PlantIdAliasMap = Record<string, PlantIdAliasEntry>;

export const PLANT_ID_ALIASES_LOCAL_KEY = 'autowatering_plant_id_aliases_v1';
export const PLANT_ID_ALIASES_CLOUD_KEY = 'plantIdAliases';

export function normalizePlantIdAliasMap(input: unknown): PlantIdAliasMap {
  if (!input || typeof input !== 'object') return {};
  const source = input as Record<string, unknown>;
  const out: PlantIdAliasMap = {};

  for (const [key, value] of Object.entries(source)) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const plantIdRaw = row.plant_id;
    const plantId = typeof plantIdRaw === 'number'
      ? plantIdRaw
      : (typeof plantIdRaw === 'string' ? Number(plantIdRaw) : NaN);
    if (!Number.isFinite(plantId)) continue;

    const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : new Date(0).toISOString();
    const sourceValue = row.source === 'camera_auto' || row.source === 'camera_review' || row.source === 'camera_manual'
      ? row.source
      : 'camera_manual';

    out[key] = {
      plant_id: Number(plantId),
      updated_at: updatedAt,
      source: sourceValue
    };
  }

  return out;
}

export function loadLocalPlantIdAliases(): PlantIdAliasMap {
  try {
    const raw = localStorage.getItem(PLANT_ID_ALIASES_LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizePlantIdAliasMap(parsed);
  } catch {
    return {};
  }
}

export function saveLocalPlantIdAliases(aliases: PlantIdAliasMap): void {
  try {
    localStorage.setItem(PLANT_ID_ALIASES_LOCAL_KEY, JSON.stringify(aliases));
  } catch {
    // no-op
  }
}

function toEpochMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function mergePlantIdAliasMaps(a: PlantIdAliasMap, b: PlantIdAliasMap): PlantIdAliasMap {
  const merged: PlantIdAliasMap = { ...a };
  for (const [key, row] of Object.entries(b)) {
    const existing = merged[key];
    if (!existing || toEpochMs(row.updated_at) >= toEpochMs(existing.updated_at)) {
      merged[key] = row;
    }
  }
  return merged;
}

export function upsertPlantIdAlias(
  aliases: PlantIdAliasMap,
  candidate: PlantIdCandidate,
  plantId: number,
  source: PlantIdAliasSource
): { aliases: PlantIdAliasMap; changed: boolean } {
  const keys = getPlantIdCandidateLookupKeys(candidate);
  if (keys.length === 0) return { aliases, changed: false };

  const next: PlantIdAliasMap = { ...aliases };
  const now = new Date().toISOString();
  let changed = false;

  for (const key of keys) {
    const current = next[key];
    if (!current || current.plant_id !== plantId || current.source !== source) {
      next[key] = {
        plant_id: plantId,
        updated_at: now,
        source
      };
      changed = true;
    }
  }

  return { aliases: next, changed };
}

export function aliasLookupMap(aliases: PlantIdAliasMap): Record<string, number> {
  const lookup: Record<string, number> = {};
  for (const [key, row] of Object.entries(aliases)) {
    lookup[key] = row.plant_id;
  }
  return lookup;
}

