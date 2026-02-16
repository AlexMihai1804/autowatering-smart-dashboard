import type { LocationData } from '../types/wizard';

// Persist last known coordinates (GPS / map / manual) for any feature that needs
// both latitude + longitude (e.g. external weather providers).
const LOCATION_STORAGE_KEY = 'app_last_location_v1';

export interface StoredLocation extends LocationData {
  updatedAt: number; // epoch ms
}

function isValidSource(source: any): source is LocationData['source'] {
  return source === 'gps' || source === 'map' || source === 'manual';
}

export function readStoredLocation(): StoredLocation | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredLocation> | null;
    if (!parsed) return null;

    if (typeof parsed.latitude !== 'number' || !Number.isFinite(parsed.latitude)) return null;
    if (typeof parsed.longitude !== 'number' || !Number.isFinite(parsed.longitude)) return null;
    if (!isValidSource(parsed.source)) return null;

    const accuracy = typeof parsed.accuracy === 'number' && Number.isFinite(parsed.accuracy)
      ? parsed.accuracy
      : undefined;

    const updatedAt = typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
      ? parsed.updatedAt
      : Date.now();

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      source: parsed.source,
      accuracy,
      updatedAt
    };
  } catch (e) {
    console.warn('[LocationStorage] Failed to read stored location:', e);
    return null;
  }
}

export function writeStoredLocation(location: LocationData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const stored: StoredLocation = { ...location, updatedAt: Date.now() };
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(stored));
  } catch (e) {
    console.warn('[LocationStorage] Failed to write stored location:', e);
  }
}

