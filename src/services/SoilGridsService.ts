/**
 * SoilGrids Service
 * 
 * Fetches soil texture data from ISRIC SoilGrids REST API based on GPS coordinates
 * and maps it to our local soil database using USDA texture triangle classification.
 * 
 * API: https://rest.isric.org/soilgrids/v2.0/properties/query
 * Resolution: 250m globally
 * License: CC-BY 4.0
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { SoilDBEntry } from './DatabaseService';
import { useAppStore } from '../store/useAppStore';
import { fromArrayBuffer } from 'geotiff';
import { geoInterruptedHomolosine } from 'd3-geo-projection';
import { translations, Language, DEFAULT_LANGUAGE } from '../i18n/translations';

// ============================================================================
// Types
// ============================================================================

export interface SoilGridsResult {
    clay: number;      // Clay content 0-100%
    sand: number;      // Sand content 0-100%
    silt: number;      // Silt content 0-100%
    textureClass: string;  // USDA texture class name
    rootDepthCm: number;   // Root depth used for aggregation
    confidence: 'high' | 'medium' | 'low';
    matchedSoil: SoilDBEntry | null;
    source: 'api' | 'cache' | 'fallback';
}

export interface SoilGridsAPIResponse {
    type: string;
    geometry: {
        type: string;
        coordinates: [number, number];
    };
    properties: {
        layers: Array<{
            name: string;
            depths: Array<{
                label: string;
                range: { top_depth: number; bottom_depth: number; unit_depth: string };
                values: { mean: number; uncertainty: number };
            }>;
            unit_measure: { mapped_units: string; target_units: string; conversion_factor: number };
        }>;
    };
}

interface SoilLayerValue {
    label: string;
    top: number;    // cm
    bottom: number; // cm
    value: number;  // percentage 0-100
}

interface SoilProfile {
    clay: SoilLayerValue[];
    sand: SoilLayerValue[];
    silt: SoilLayerValue[];
}

interface CacheEntry {
    profile: SoilProfile;
    timestamp: number;
    lat: number;
    lon: number;
}

// ============================================================================
// Constants
// ============================================================================

const SOILGRIDS_PROPERTIES_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';
const SOILGRIDS_WCS_BASE_URL = 'https://maps.isric.org/mapserv';
const CACHE_KEY = 'soilgrids_cache';
const API_STATUS_KEY = 'soilgrids_api_status';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_DISTANCE_THRESHOLD_M = 500; // Use cached result if within 500m
const API_TIMEOUT_MS = 10000; // 10 second timeout
const API_RETRY_COUNT = 2;
const API_RETRY_BASE_DELAY_MS = 400;
const API_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown when API is down
const DEFAULT_ROOT_DEPTH_CM = 30; // Used when plant root depth is unknown
const MAX_ROOT_DEPTH_CM = 200;
const MIN_ROOT_DEPTH_CM = 5;
const PROPERTY_DEPTHS = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm', '100-200cm'];
const SOILGRIDS_WCS_CRS_IGH = 'http://www.opengis.net/def/crs/EPSG/0/152160';
// Interrupted Goode Homolosine (EPSG:152160 / ESRI:54052 style). We use d3-geo-projection
// and scale to meters. This is sufficiently accurate for 250m grid sampling.
const EARTH_RADIUS_M = 6371007.181;
const SOILGRIDS_WCS_HALF_WINDOW_M = 250; // request a small coverage around point (meters)
const WCS_CONCURRENCY = 4;
const OPEN_ELEVATION_API_URL = 'https://api.open-elevation.com/api/v1/lookup';
const SLOPE_SAMPLE_DISTANCE_M = 50; // Distance for slope calculation (meters)

// Slope detection result
export interface SlopeResult {
    slope_percent: number;    // Slope as percentage (rise/run * 100)
    elevation_m: number;      // Center point elevation in meters
    confidence: 'high' | 'medium' | 'low';
}

// API status tracking
interface APIStatus {
    isDown: boolean;
    lastCheck: number;
    consecutiveFailures: number;
}

function getAPIStatus(): APIStatus {
    try {
        const stored = localStorage.getItem(API_STATUS_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return { isDown: false, lastCheck: 0, consecutiveFailures: 0 };
}

function setAPIStatus(status: APIStatus): void {
    try {
        localStorage.setItem(API_STATUS_KEY, JSON.stringify(status));
    } catch { /* ignore */ }
}

function shouldSkipAPI(): boolean {
    const status = getAPIStatus();
    if (!status.isDown) return false;
    // If API was marked down, skip for cooldown period
    return Date.now() - status.lastCheck < API_COOLDOWN_MS;
}

function markAPISuccess(): void {
    setAPIStatus({ isDown: false, lastCheck: Date.now(), consecutiveFailures: 0 });
}

function markAPIFailure(statusCode?: number): void {
    const status = getAPIStatus();
    const failures = status.consecutiveFailures + 1;

    // Server-side / throttling errors tend to persist; mark down faster.
    const markDownImmediately = typeof statusCode === 'number' && (statusCode === 429 || statusCode >= 500);

    // Mark as down after 2 consecutive failures (or immediately for server-side errors)
    setAPIStatus({
        isDown: markDownImmediately ? true : failures >= 2,
        lastCheck: Date.now(),
        consecutiveFailures: failures
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
}

function extractStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') return undefined;
    if ('status' in error && typeof (error as any).status === 'number') return (error as any).status;
    const message = (error as any).message;
    if (typeof message !== 'string') return undefined;
    const match = message.match(/SoilGrids error: (\d{3})/);
    if (!match) return undefined;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function lonLatToIGH(lon: number, lat: number): { x: number; y: number } {
    const proj = geoInterruptedHomolosine().scale(EARTH_RADIUS_M).translate([0, 0]);
    const out = proj([lon, lat]) as [number, number] | null;
    if (!out) return { x: 0, y: 0 };

    // D3 projections use screen coordinates (Y grows downward). MapServer IGH uses Y upwards.
    return { x: out[0], y: -out[1] };
}

function parseDepthLabel(depthLabel: string): { top: number; bottom: number } {
    // e.g. "0-5cm", "100-200cm"
    const cleaned = depthLabel.trim().toLowerCase().replace('cm', '');
    const parts = cleaned.split('-');
    const top = Number(parts[0]);
    const bottom = Number(parts[1]);
    return {
        top: Number.isFinite(top) ? top : 0,
        bottom: Number.isFinite(bottom) ? bottom : 0,
    };
}

function toArrayBuffer(data: unknown): ArrayBuffer {
    if (data instanceof ArrayBuffer) return data;
    if (ArrayBuffer.isView(data)) {
        const anyView = data as any;
        const view = new Uint8Array(anyView.buffer, anyView.byteOffset ?? 0, anyView.byteLength ?? 0);
        return new Uint8Array(view).buffer;
    }
    if (typeof data === 'string') {
        // CapacitorHttp may return base64 string for arraybuffer responses.
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    throw new Error('Unexpected binary response type');
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (true) {
            const current = nextIndex;
            nextIndex++;
            if (current >= items.length) return;
            results[current] = await fn(items[current]);
        }
    });

    await Promise.all(workers);
    return results;
}

async function fetchWcsPixelValue(mapName: 'clay' | 'sand' | 'silt', coverageId: string, x: number, y: number): Promise<number> {
    const xMin = x - SOILGRIDS_WCS_HALF_WINDOW_M;
    const xMax = x + SOILGRIDS_WCS_HALF_WINDOW_M;
    const yMin = y - SOILGRIDS_WCS_HALF_WINDOW_M;
    const yMax = y + SOILGRIDS_WCS_HALF_WINDOW_M;

    const url = `${SOILGRIDS_WCS_BASE_URL}?` +
        `map=/map/${mapName}.map&` +
        `SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&` +
        `COVERAGEID=${encodeURIComponent(coverageId)}&` +
        `FORMAT=${encodeURIComponent('image/tiff')}&` +
        `SUBSETTINGCRS=${encodeURIComponent(SOILGRIDS_WCS_CRS_IGH)}&` +
        `OUTPUTCRS=${encodeURIComponent(SOILGRIDS_WCS_CRS_IGH)}&` +
        `SUBSET=X(${xMin},${xMax})&` +
        `SUBSET=Y(${yMin},${yMax})`;

    let buf: ArrayBuffer;
    let status: number;
    if (Capacitor.getPlatform() === 'web') {
        const res = await fetch(url);
        status = res.status;
        if (status < 200 || status >= 300) {
            throw new Error(`SoilGrids WCS error: ${status}`);
        }
        buf = await res.arrayBuffer();
    } else {
        const response = await CapacitorHttp.get({
            url,
            connectTimeout: API_TIMEOUT_MS,
            readTimeout: API_TIMEOUT_MS,
            // Capacitor types don't always include this, but it is supported.
            responseType: 'arraybuffer' as any,
        } as any);

        status = response.status;
        if (status < 200 || status >= 300) {
            throw new Error(`SoilGrids WCS error: ${status}`);
        }

        buf = toArrayBuffer(response.data);
    }

    const tiff = await fromArrayBuffer(buf);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const noData = (image as any).getGDALNoData?.();
    const raster = await image.readRasters({ interleave: true });

    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const idx = cy * width + cx;
    const value = Number((raster as any)[idx]);

    if (!Number.isFinite(value)) return 0;
    if (noData !== undefined && noData !== null && Number(noData) === value) return 0;

    return value;
}

/**
 * Fetch soil profile using WCS (GeoTIFF) services on maps.isric.org.
 * This is the fallback when the REST endpoint is down.
 */
async function fetchSoilProfileViaWCS(lat: number, lon: number, depthLabels: string[]): Promise<SoilProfile> {
    console.log('[SoilGrids] Fetching soil profile via WCS (maps.isric.org)...');

    const { x, y } = lonLatToIGH(lon, lat);
    const tasks: Array<{ prop: 'clay' | 'sand' | 'silt'; depth: string }> = [];
    for (const depth of depthLabels) {
        tasks.push({ prop: 'clay', depth });
        tasks.push({ prop: 'sand', depth });
        tasks.push({ prop: 'silt', depth });
    }

    const values = await mapWithConcurrency(tasks, WCS_CONCURRENCY, async (t) => {
        const coverageId = `${t.prop}_${t.depth}_mean`;
        return fetchWcsPixelValue(t.prop, coverageId, x, y);
    });

    const profile: SoilProfile = { clay: [], sand: [], silt: [] };
    for (let i = 0; i < tasks.length; i++) {
        const { prop, depth } = tasks[i];
        const { top, bottom } = parseDepthLabel(depth);
        const mean = values[i]; // g/kg
        const valuePct = mean / 10; // g/kg to %
        const entry: SoilLayerValue = { label: depth, top, bottom, value: valuePct };
        profile[prop].push(entry);
    }

    (['clay', 'sand', 'silt'] as const).forEach(key => {
        profile[key] = profile[key].sort((a, b) => a.top - b.top);
    });

    return profile;
}

// ============================================================================
// USDA Texture Triangle Classification
// ============================================================================

/**
 * Determines USDA texture class from clay, sand, silt percentages
 * Based on the USDA soil texture triangle
 * 
 * @see https://www.nrcs.usda.gov/wps/portal/nrcs/detail/soils/survey/?cid=nrcs142p2_054167
 */
export function classifyUSDATexture(clay: number, sand: number, silt: number): string {
    // Normalize to ensure they sum to 100
    const total = clay + sand + silt;
    if (total === 0) return 'Loam'; // Fallback

    const c = (clay / total) * 100;
    const s = (sand / total) * 100;
    const si = (silt / total) * 100;

    // USDA Texture Triangle classification rules
    // Order matters - check more specific classes first

    // Sandy textures
    if (s >= 85 && (si + 1.5 * c) < 15) {
        return 'Sand';
    }
    if (s >= 70 && s < 90 && c <= 15 && (si + 2 * c) >= 15 && (si + 2 * c) < 30) {
        return 'LoamySand';
    }

    // Loamy sands
    if (s >= 70 && s < 85 && (si + 1.5 * c) >= 15 && c < 20) {
        return 'LoamySand';
    }

    // Sandy loam
    if ((s >= 43 && s <= 85 && si < 50 && c < 20) ||
        (s >= 50 && c < 7 && si < 50)) {
        if (c < 7 && si < 50 && s >= 52) {
            return 'SandyLoam';
        }
        if (c >= 7 && c < 20 && s >= 52 && si < 30) {
            return 'SandyLoam';
        }
        if (c < 20 && s >= 43 && s < 52) {
            return 'SandyLoam';
        }
    }

    // Loam
    if (c >= 7 && c < 27 && si >= 28 && si < 50 && s < 52) {
        return 'Loam';
    }

    // Silt loam
    if ((si >= 50 && c < 27) || (si >= 50 && si < 80 && c < 12)) {
        return 'SiltLoam';
    }

    // Silt
    if (si >= 80 && c < 12) {
        return 'SiltLoam'; // We don't have pure Silt in our DB, map to SiltLoam
    }

    // Sandy clay loam
    if (c >= 20 && c < 35 && s >= 45 && si < 28) {
        return 'SandyClayLoam';
    }

    // Clay loam
    if (c >= 27 && c < 40 && s >= 20 && s < 45) {
        return 'ClayLoam';
    }

    // Silty clay loam
    if (c >= 27 && c < 40 && s < 20) {
        return 'SiltyClayLoam';
    }

    // Sandy clay
    if (c >= 35 && s >= 45) {
        return 'SandyClay';
    }

    // Silty clay
    if (c >= 40 && si >= 40) {
        return 'SiltyClay';
    }

    // Clay
    if (c >= 40) {
        return 'Clay';
    }

    // Default fallback
    return 'Loam';
}

/**
 * Maps USDA texture class to our SoilDBEntry
 */
function mapTextureToSoilDB(textureClass: string): SoilDBEntry | null {
    const soilDb = useAppStore.getState().soilDb;

    // Direct match by soil_type
    const directMatch = soilDb.find(s => s.soil_type === textureClass);
    if (directMatch) return directMatch;

    // Fallback mappings for edge cases
    const fallbackMap: Record<string, string> = {
        'Silt': 'SiltLoam',
        'LoamySand': 'LoamySand',
        'SandyLoam': 'SandyLoam',
    };

    const fallbackType = fallbackMap[textureClass];
    if (fallbackType) {
        return soilDb.find(s => s.soil_type === fallbackType) || null;
    }

    // Ultimate fallback: Loam (most common, middle-of-the-road)
    return soilDb.find(s => s.soil_type === 'Loam') || soilDb[3] || null;
}

// ============================================================================
// Cache Management
// ============================================================================

function getCache(): CacheEntry[] {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return [];
        const parsed = JSON.parse(cached) as CacheEntry[];
        return Array.isArray(parsed) ? parsed.filter(e => (e as CacheEntry)?.profile) : [];
    } catch {
        return [];
    }
}

function saveCache(entries: CacheEntry[]): void {
    try {
        // Keep only last 20 entries and non-expired
        const now = Date.now();
        const validEntries = entries
            .filter(e => now - e.timestamp < CACHE_DURATION_MS)
            .slice(-20);
        localStorage.setItem(CACHE_KEY, JSON.stringify(validEntries));
    } catch {
        // Ignore storage errors
    }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function findCachedProfile(lat: number, lon: number): CacheEntry | null {
    const cache = getCache();
    const now = Date.now();

    for (const entry of cache) {
        // Check if not expired
        if (now - entry.timestamp > CACHE_DURATION_MS) continue;

        // Check if close enough
        const distance = haversineDistance(lat, lon, entry.lat, entry.lon);
        if (distance <= CACHE_DISTANCE_THRESHOLD_M) {
            return entry;
        }
    }

    return null;
}

function addToCache(lat: number, lon: number, profile: SoilProfile): void {
    const cache = getCache();
    cache.push({
        profile,
        timestamp: Date.now(),
        lat,
        lon
    });
    saveCache(cache);
}
// ============================================================================
// API Calls & Aggregation
// ============================================================================

function normalizeRootDepth(rootDepthCm?: number): number {
    if (!rootDepthCm || Number.isNaN(rootDepthCm)) return DEFAULT_ROOT_DEPTH_CM;
    return Math.min(MAX_ROOT_DEPTH_CM, Math.max(MIN_ROOT_DEPTH_CM, rootDepthCm));
}

/**
 * Fetches full soil profile (all supported depths) from SoilGrids properties API.
 */
async function fetchSoilProfile(lat: number, lon: number): Promise<{ profile: SoilProfile; source: 'rest' | 'wcs' }> {
    const depthParam = PROPERTY_DEPTHS.join(',');
    const url = `${SOILGRIDS_PROPERTIES_URL}?lon=${lon}&lat=${lat}&property=clay,sand,silt&depth=${depthParam}`;

    console.log('[SoilGrids] Fetching soil profile via properties API...');

    let lastStatus: number | undefined;
    try {
        for (let attempt = 0; attempt <= API_RETRY_COUNT; attempt++) {
            const response = await CapacitorHttp.get({
                url,
                connectTimeout: API_TIMEOUT_MS,
                readTimeout: API_TIMEOUT_MS,
            });

            lastStatus = response.status;

            if (response.status >= 200 && response.status < 300) {
                return { profile: parseAPIResponse(response.data as SoilGridsAPIResponse), source: 'rest' };
            }

            if (isRetryableStatus(response.status) && attempt < API_RETRY_COUNT) {
                const delay = API_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
                console.warn(`[SoilGrids] Retryable status ${response.status}. Retrying in ${delay}ms...`);
                await sleep(delay);
                continue;
            }

            throw new Error(`SoilGrids error: ${response.status}`);
        }

        throw new Error(`SoilGrids error: ${lastStatus ?? 'unknown'}`);
    } catch (err) {
        // REST endpoint is sometimes down (502). Fallback to WCS.
        console.warn('[SoilGrids] Properties API failed, falling back to WCS:', err);
        // Mark REST as down; WCS might still be up.
        markAPIFailure(lastStatus);
        const profile = await fetchSoilProfileViaWCS(lat, lon, PROPERTY_DEPTHS);
        return { profile, source: 'wcs' };
    }
}

/**
 * Estimate clay/sand/silt from texture class name
 * Used for manual texture input or fallback
 */
function estimateFromTextureClass(textureClass: string): { clay: number; sand: number; silt: number } {
    const estimates: Record<string, { clay: number; sand: number; silt: number }> = {
        'Clay': { clay: 55, sand: 20, silt: 25 },
        'SiltyClay': { clay: 45, sand: 5, silt: 50 },
        'SandyClay': { clay: 40, sand: 50, silt: 10 },
        'ClayLoam': { clay: 32, sand: 33, silt: 35 },
        'SiltyClayLoam': { clay: 33, sand: 10, silt: 57 },
        'SandyClayLoam': { clay: 27, sand: 55, silt: 18 },
        'Loam': { clay: 20, sand: 40, silt: 40 },
        'SiltLoam': { clay: 15, sand: 20, silt: 65 },
        'SandyLoam': { clay: 10, sand: 65, silt: 25 },
        'Silt': { clay: 5, sand: 5, silt: 90 },
        'LoamySand': { clay: 5, sand: 80, silt: 15 },
        'Sand': { clay: 3, sand: 90, silt: 7 },
    };

    for (const [key, value] of Object.entries(estimates)) {
        if (textureClass.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    return estimates['Loam'];
}

/**
 * Parses SoilGrids properties API response into per-depth profiles (values in %).
 */
function parseAPIResponse(response: SoilGridsAPIResponse): SoilProfile {
    const profile: SoilProfile = { clay: [], sand: [], silt: [] };

    for (const layer of response.properties?.layers || []) {
        if (!['clay', 'sand', 'silt'].includes(layer.name)) continue;

        for (const depth of layer.depths || []) {
            const top = depth.range?.top_depth ?? 0;
            const bottom = depth.range?.bottom_depth ?? 0;
            const mean = depth.values?.mean ?? 0;
            const valuePct = mean / 10; // g/kg to %

            const entry: SoilLayerValue = {
                label: depth.label,
                top,
                bottom,
                value: valuePct,
            };

            if (layer.name === 'clay') profile.clay.push(entry);
            if (layer.name === 'sand') profile.sand.push(entry);
            if (layer.name === 'silt') profile.silt.push(entry);
        }
    }

    // Ensure sorted by depth
    (['clay', 'sand', 'silt'] as const).forEach(key => {
        profile[key] = profile[key].sort((a, b) => a.top - b.top);
    });

    return profile;
}

/**
 * Aggregates clay/sand/silt across the requested root depth using thickness weighting.
 */
function aggregateTextureByRootDepth(profile: SoilProfile, rootDepthCm: number): { clay: number; sand: number; silt: number } {
    const targetDepth = normalizeRootDepth(rootDepthCm);
    const reference = profile.clay.length ? profile.clay : (profile.sand.length ? profile.sand : profile.silt);

    if (!reference.length) {
        return { clay: 20, sand: 40, silt: 40 };
    }

    let thicknessSum = 0;
    let claySum = 0;
    let sandSum = 0;
    let siltSum = 0;

    for (let i = 0; i < reference.length; i++) {
        const layer = reference[i];
        const overlap = Math.max(0, Math.min(targetDepth, layer.bottom) - layer.top);
        if (overlap <= 0) continue;

        thicknessSum += overlap;

        const clayLayer = profile.clay[i] || layer;
        const sandLayer = profile.sand[i] || layer;
        const siltLayer = profile.silt[i] || layer;

        claySum += (clayLayer.value || 0) * overlap;
        sandSum += (sandLayer.value || 0) * overlap;
        siltSum += (siltLayer.value || 0) * overlap;
    }

    if (!thicknessSum) {
        return { clay: 20, sand: 40, silt: 40 };
    }

    return {
        clay: claySum / thicknessSum,
        sand: sandSum / thicknessSum,
        silt: siltSum / thicknessSum,
    };
}

/**
 * Determines confidence level based on API response quality
 */
function determineConfidence(clay: number, sand: number, silt: number): 'high' | 'medium' | 'low' {
    const total = clay + sand + silt;

    if (total < 80 || total > 120) return 'low';
    if (total < 90 || total > 110) return 'medium';

    if (clay === 0 || sand === 0 || silt === 0) return 'medium';

    return 'high';
}

// ============================================================================
// Main Service Class
// ============================================================================

export class SoilGridsService {
    private static instance: SoilGridsService;

    private constructor() { }

    public static getInstance(): SoilGridsService {
        if (!SoilGridsService.instance) {
            SoilGridsService.instance = new SoilGridsService();
        }
        return SoilGridsService.instance;
    }

    /**
     * Detects soil type from GPS coordinates
     * Uses SoilGrids API with fast fallback when unavailable
     * 
     * @param lat Latitude in degrees
     * @param lon Longitude in degrees
     * @returns SoilGridsResult with detected soil info
     */
    public async detectSoilFromLocation(lat: number, lon: number, rootDepthCm: number = DEFAULT_ROOT_DEPTH_CM): Promise<SoilGridsResult> {
        const targetDepth = normalizeRootDepth(rootDepthCm);
        console.log(`[SoilGrids] Detecting soil for coordinates: ${lat}, ${lon} at depth ${targetDepth}cm`);

        // Check cache first (profile reused for any root depth)
        const cached = findCachedProfile(lat, lon);
        if (cached) {
            console.log('[SoilGrids] Using cached profile');
            const aggregated = aggregateTextureByRootDepth(cached.profile, targetDepth);
            return this.buildResult(aggregated, targetDepth, 'cache');
        }

        // Check if API is known to be down (skip to save time)
        if (shouldSkipAPI()) {
            console.log('[SoilGrids] API marked as down, using fallback immediately');
            return this.createFallbackResult(targetDepth);
        }

        try {
            const { profile, source } = await fetchSoilProfile(lat, lon);
            if (source === 'rest') {
                markAPISuccess();
            }

            // Cache raw profile so we can reuse for multiple root depths
            addToCache(lat, lon, profile);

            const aggregated = aggregateTextureByRootDepth(profile, targetDepth);
            return this.buildResult(aggregated, targetDepth, 'api');
        } catch (error) {
            console.warn('[SoilGrids] API failed:', error);
            markAPIFailure(extractStatusCode(error));
            return this.createFallbackResult(targetDepth);
        }
    }

    private buildResult(
        aggregated: { clay: number; sand: number; silt: number },
        rootDepthCm: number,
        source: 'api' | 'cache' | 'fallback'
    ): SoilGridsResult {
        const { clay, sand, silt } = aggregated;
        const textureClass = classifyUSDATexture(clay, sand, silt);
        const matchedSoil = mapTextureToSoilDB(textureClass);

        return {
            clay,
            sand,
            silt,
            textureClass,
            rootDepthCm,
            confidence: determineConfidence(clay, sand, silt),
            matchedSoil,
            source
        };
    }

    /**
     * Creates a fallback result when API is unavailable
     */
    private createFallbackResult(rootDepthCm: number): SoilGridsResult {
        const fallbackSoil = mapTextureToSoilDB('Loam');
        return {
            clay: 20,
            sand: 40,
            silt: 40,
            textureClass: 'Loam',
            rootDepthCm,
            confidence: 'low',
            matchedSoil: fallbackSoil,
            source: 'fallback'
        };
    }

    /**
     * Clears the soil cache
     */
    public clearCache(): void {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(API_STATUS_KEY);
        console.log('[SoilGrids] Cache and API status cleared');
    }

    /**
     * Resets API status to allow retrying
     */
    public resetAPIStatus(): void {
        localStorage.removeItem(API_STATUS_KEY);
        console.log('[SoilGrids] API status reset, will retry on next request');
    }

    /**
     * Checks if API is currently marked as unavailable
     */
    public isAPIMarkedDown(): boolean {
        return shouldSkipAPI();
    }

    /**
     * Gets cached results count
     */
    public getCacheInfo(): { count: number; oldestTimestamp: number | null } {
        const cache = getCache();
        return {
            count: cache.length,
            oldestTimestamp: cache.length > 0 ? Math.min(...cache.map(e => e.timestamp)) : null
        };
    }
}

// ============================================================================
// Elevation & Slope Detection (Open-Elevation API)
// ============================================================================

/**
 * Fetches elevation for a single point from Open-Elevation API
 */
async function fetchElevation(lat: number, lon: number): Promise<number | null> {
    try {
        const response = await CapacitorHttp.get({
            url: `${OPEN_ELEVATION_API_URL}?locations=${lat},${lon}`,
            connectTimeout: API_TIMEOUT_MS,
            readTimeout: API_TIMEOUT_MS,
        });

        if (response.status >= 200 && response.status < 300 && response.data?.results?.[0]) {
            return response.data.results[0].elevation;
        }
        return null;
    } catch (error) {
        console.warn('[SoilGrids] Elevation API error:', error);
        return null;
    }
}

/**
 * Fetches multiple elevations in a single request (more efficient)
 */
async function fetchMultipleElevations(points: Array<{ lat: number; lon: number }>): Promise<Array<number | null>> {
    try {
        const locations = points.map(p => `${p.lat},${p.lon}`).join('|');
        const response = await CapacitorHttp.get({
            url: `${OPEN_ELEVATION_API_URL}?locations=${locations}`,
            connectTimeout: API_TIMEOUT_MS,
            readTimeout: API_TIMEOUT_MS,
        });

        if (response.status >= 200 && response.status < 300 && response.data?.results) {
            return response.data.results.map((r: any) => r.elevation ?? null);
        }
        return points.map(() => null);
    } catch (error) {
        console.warn('[SoilGrids] Multi-elevation API error:', error);
        return points.map(() => null);
    }
}

/**
 * Calculates slope from a center point by sampling 4 surrounding points
 * Uses Open-Elevation API (free, no API key required)
 * 
 * @param lat Center latitude
 * @param lon Center longitude
 * @returns SlopeResult with slope percentage and elevation
 */
export async function calculateSlope(lat: number, lon: number): Promise<SlopeResult> {
    console.log(`[SoilGrids] Calculating slope for ${lat}, ${lon}`);

    // Calculate offset in degrees for sample distance
    // 1 degree latitude ≈ 111km, 1 degree longitude varies by latitude
    const latOffsetDeg = SLOPE_SAMPLE_DISTANCE_M / 111000;
    const lonOffsetDeg = SLOPE_SAMPLE_DISTANCE_M / (111000 * Math.cos(lat * Math.PI / 180));

    // Sample 5 points: center and 4 cardinal directions (N, S, E, W)
    const points = [
        { lat, lon },                           // Center
        { lat: lat + latOffsetDeg, lon },       // North
        { lat: lat - latOffsetDeg, lon },       // South
        { lat, lon: lon + lonOffsetDeg },       // East
        { lat, lon: lon - lonOffsetDeg },       // West
    ];

    const elevations = await fetchMultipleElevations(points);
    const [centerElev, northElev, southElev, eastElev, westElev] = elevations;

    // If center elevation failed, return low confidence
    if (centerElev === null) {
        console.warn('[SoilGrids] Could not get center elevation, assuming flat terrain');
        return { slope_percent: 0, elevation_m: 0, confidence: 'low' };
    }

    // Calculate slopes in each direction and take maximum
    const slopes: number[] = [];
    if (northElev !== null) {
        slopes.push(Math.abs(northElev - centerElev) / SLOPE_SAMPLE_DISTANCE_M * 100);
    }
    if (southElev !== null) {
        slopes.push(Math.abs(southElev - centerElev) / SLOPE_SAMPLE_DISTANCE_M * 100);
    }
    if (eastElev !== null) {
        slopes.push(Math.abs(eastElev - centerElev) / SLOPE_SAMPLE_DISTANCE_M * 100);
    }
    if (westElev !== null) {
        slopes.push(Math.abs(westElev - centerElev) / SLOPE_SAMPLE_DISTANCE_M * 100);
    }

    // Use max slope (steepest direction)
    const maxSlope = slopes.length > 0 ? Math.max(...slopes) : 0;

    // Determine confidence based on how many points we got
    let confidence: 'high' | 'medium' | 'low';
    if (slopes.length >= 4) {
        confidence = 'high';
    } else if (slopes.length >= 2) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }

    console.log(`[SoilGrids] Slope calculation: ${maxSlope.toFixed(1)}%, elevation: ${centerElev}m, confidence: ${confidence}`);

    return {
        slope_percent: Math.round(maxSlope * 10) / 10,
        elevation_m: centerElev,
        confidence
    };
}

// ============================================================================
// Utility Functions (exported for use in components)
// ============================================================================

/**
 * Checks if Cycle & Soak should be auto-enabled based on soil AND slope
 * 
 * Rule: Enable Cycle & Soak when:
 * - Infiltration < 10 mm/h (slow-draining soil), OR
 * - Slope > 3% (steep terrain causes runoff even on sandy soil), OR
 * - Infiltration < 15 mm/h AND Slope > 2% (combined effect)
 * 
 * @param soil Soil database entry with infiltration rate
 * @param slope_percent Optional slope percentage (0-100)
 */
export function shouldEnableCycleSoak(soil: SoilDBEntry, slope_percent: number = 0): boolean {
    const infiltration = soil.infiltration_rate_mm_h;
    if (typeof infiltration !== 'number') return false;

    // Low infiltration = always enable
    if (infiltration < 10) return true;

    // High slope = always enable (water runs off even on sandy soil)
    if (slope_percent > 3) return true;

    // Combined effect: moderate infiltration + some slope
    if (infiltration < 15 && slope_percent > 2) return true;

    return false;
}

/**
 * Calculates recommended max volume limit based on coverage, soil, and slope
 */
export function calculateRecommendedMaxVolume(
    coverageType: 'area' | 'plants',
    coverageValue: number,
    soil: SoilDBEntry,
    slope_percent: number = 0
): number {
    const awc = soil.available_water_mm_m;
    if (typeof awc !== 'number') return 50; // Default 50L

    let volumeL: number;
    if (coverageType === 'area') {
        // Formula: area_m² × AWC_mm/m × 0.5 (half of available water capacity)
        // AWC is in mm per meter depth, assume 30cm root zone
        volumeL = (coverageValue * awc * 0.3 * 0.5) / 1000;
    } else {
        // For plant count: ~2L per plant (adjustable)
        volumeL = coverageValue * 2;
    }

    // Reduce max volume on slopes (more runoff risk)
    if (slope_percent > 5) {
        volumeL *= 0.6; // 40% reduction for steep slopes
    } else if (slope_percent > 3) {
        volumeL *= 0.8; // 20% reduction for moderate slopes
    }

    return Math.max(5, Math.min(500, Math.round(volumeL)));
}

/**
 * Calculates Cycle & Soak timing based on soil infiltration rate AND slope
 * 
 * Slope increases both the need for cycle/soak and the soak duration
 * because water needs time to absorb instead of running off.
 * 
 * @param soil Soil database entry with infiltration rate
 * @param slope_percent Optional slope percentage (0-100)
 */
export function calculateCycleSoakTiming(
    soil: SoilDBEntry,
    slope_percent: number = 0
): { cycleMinutes: number; soakMinutes: number } {
    const infiltration = soil.infiltration_rate_mm_h;
    if (typeof infiltration !== 'number') {
        return { cycleMinutes: 5, soakMinutes: 10 }; // Default
    }

    // Base timing from soil infiltration
    let cycleMinutes: number;
    let soakMinutes: number;

    // Lower infiltration = shorter cycles, longer soaks
    if (infiltration <= 3) {
        // Heavy clay
        cycleMinutes = 3;
        soakMinutes = 20;
    } else if (infiltration <= 6) {
        // Clay/Silty clay
        cycleMinutes = 5;
        soakMinutes = 15;
    } else if (infiltration <= 10) {
        // Clay loam / Silt loam
        cycleMinutes = 8;
        soakMinutes = 10;
    } else if (infiltration <= 20) {
        // Loamy soils
        cycleMinutes = 10;
        soakMinutes = 8;
    } else {
        // Sandy soils - minimal need for cycle & soak
        cycleMinutes = 15;
        soakMinutes = 5;
    }

    // Adjust for slope - higher slope means shorter cycles and longer soak
    if (slope_percent > 5) {
        // Steep slope: reduce cycle by 40%, increase soak by 50%
        cycleMinutes = Math.max(2, Math.round(cycleMinutes * 0.6));
        soakMinutes = Math.round(soakMinutes * 1.5);
    } else if (slope_percent > 3) {
        // Moderate slope: reduce cycle by 20%, increase soak by 25%
        cycleMinutes = Math.max(2, Math.round(cycleMinutes * 0.8));
        soakMinutes = Math.round(soakMinutes * 1.25);
    } else if (slope_percent > 1) {
        // Slight slope: increase soak by 10%
        soakMinutes = Math.round(soakMinutes * 1.1);
    }

    return { cycleMinutes, soakMinutes };
}

// ============================================================================
// Custom Soil Parameter Estimation (Pedotransfer Functions)
// ============================================================================

/**
 * Custom Soil Parameters derived from soil texture (clay/sand/silt percentages)
 * Used for creating custom soil profiles via BLE when auto-detecting soil type
 */
export interface CustomSoilParameters {
    name: string;
    field_capacity: number;      // FC % volumetric (0-100)
    wilting_point: number;       // WP % volumetric (0-100)
    infiltration_rate: number;   // mm/hr
    bulk_density: number;        // g/cm³
    organic_matter: number;      // % (estimated)
}

/**
 * Estimate soil hydraulic parameters from texture using Saxton & Rawls (2006)
 * pedotransfer functions.
 * 
 * Reference: Saxton, K.E. and Rawls, W.J. (2006). Soil Water Characteristic 
 * Estimates by Texture and Organic Matter for Hydrologic Solutions. 
 * Soil Science Society of America Journal, 70:1569-1578.
 * 
 * @param clay Clay content in % (0-100)
 * @param sand Sand content in % (0-100)
 * @param silt Silt content in % (0-100)
 * @param organicMatter Organic matter % (default 2.0 if unknown)
 * @returns CustomSoilParameters for BLE transmission
 */
export function estimateSoilParametersFromTexture(
    clay: number,
    sand: number,
    silt: number,
    options?: {
        organicMatter?: number;
        language?: Language;
    }
): CustomSoilParameters {
    const organicMatter = options?.organicMatter ?? 2.0;
    const language = options?.language ?? DEFAULT_LANGUAGE;

    // Normalize values to fractions (0-1)
    const total = clay + sand + silt;
    const C = (clay / total);  // Clay fraction
    const S = (sand / total);  // Sand fraction
    const OM = organicMatter / 100; // Organic matter fraction

    // Saxton & Rawls (2006) pedotransfer equations
    // θ_1500 (wilting point at -1500 kPa)
    const theta_1500t = -0.024 * S + 0.487 * C + 0.006 * OM +
        0.005 * S * OM - 0.013 * C * OM +
        0.068 * S * C + 0.031;
    const theta_1500 = theta_1500t + (0.14 * theta_1500t - 0.02);

    // θ_33 (field capacity at -33 kPa)
    const theta_33t = -0.251 * S + 0.195 * C + 0.011 * OM +
        0.006 * S * OM - 0.027 * C * OM +
        0.452 * S * C + 0.299;
    const theta_33 = theta_33t + (1.283 * theta_33t * theta_33t - 0.374 * theta_33t - 0.015);

    // Saturated conductivity (Ksat) - used to estimate infiltration rate
    // Simplified version based on texture
    const lambda = Math.log(theta_33) - Math.log(theta_1500);
    const Ksat = 1930 * Math.pow(theta_33 - theta_1500, 3 - lambda);

    // Bulk density estimation (typical values by texture class)
    let bulkDensity: number;
    const textureClass = classifyUSDATexture(clay, sand, silt);
    switch (textureClass) {
        case 'Sand':
        case 'LoamySand':
            bulkDensity = 1.55;
            break;
        case 'SandyLoam':
            bulkDensity = 1.45;
            break;
        case 'Loam':
        case 'SiltLoam':
            bulkDensity = 1.35;
            break;
        case 'ClayLoam':
        case 'SiltyClayLoam':
        case 'SandyClayLoam':
            bulkDensity = 1.30;
            break;
        case 'Clay':
        case 'SiltyClay':
        case 'SandyClay':
            bulkDensity = 1.20;
            break;
        default:
            bulkDensity = 1.35;
    }

    // Infiltration rate approximation from Ksat
    // Actual infiltration is ~0.5-0.7 of Ksat for unsaturated conditions
    const infiltrationRate = Math.max(0.5, Ksat * 0.6);

    // Convert to percentages and constrain to valid ranges
    const fieldCapacity = Math.max(5, Math.min(60, theta_33 * 100));
    const wiltingPoint = Math.max(2, Math.min(40, theta_1500 * 100));

    // Ensure FC > WP
    const finalWP = Math.min(wiltingPoint, fieldCapacity - 2);

    const textureKeyMap: Record<string, string> = {
        Sand: 'sand',
        LoamySand: 'loamySand',
        SandyLoam: 'sandyLoam',
        Loam: 'loam',
        SiltLoam: 'siltLoam',
        ClayLoam: 'clayLoam',
        SandyClayLoam: 'sandyClayLoam',
        SiltyClayLoam: 'siltyClayLoam',
        Clay: 'clay',
        SiltyClay: 'siltyClay',
        SandyClay: 'sandyClay',
    };

    const textureKey = textureKeyMap[textureClass];
    const displayName = textureKey
        ? (translations[language]?.soilTextures as Record<string, string> | undefined)?.[textureKey] || textureClass
        : textureClass;

    return {
        name: displayName,
        field_capacity: Math.round(fieldCapacity * 10) / 10,
        wilting_point: Math.round(finalWP * 10) / 10,
        infiltration_rate: Math.round(infiltrationRate * 10) / 10,
        bulk_density: bulkDensity,
        organic_matter: organicMatter
    };
}

/**
 * Check if detected soil parameters significantly differ from database match
 * Returns true if custom soil should be created for more accurate FAO-56 calculations
 */
export function shouldUseCustomSoil(
    detected: CustomSoilParameters,
    dbMatch: SoilDBEntry | null
): boolean {
    if (!dbMatch) return true;

    const dbFC = dbMatch.field_capacity_pct;
    const dbWP = dbMatch.wilting_point_pct;
    const dbInfil = dbMatch.infiltration_rate_mm_h;

    // Use custom if DB values are missing
    if (dbFC === null || dbWP === null || dbInfil === null) return true;

    // Check if values differ by more than 20%
    const fcDiff = Math.abs(detected.field_capacity - dbFC) / dbFC;
    const wpDiff = Math.abs(detected.wilting_point - dbWP) / dbWP;
    const infilDiff = Math.abs(detected.infiltration_rate - dbInfil) / dbInfil;

    return fcDiff > 0.2 || wpDiff > 0.2 || infilDiff > 0.2;
}

// Default export for singleton access
export default SoilGridsService.getInstance();
