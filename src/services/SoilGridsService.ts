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

import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { SoilDBEntry } from './DatabaseService';
import { useAppStore } from '../store/useAppStore';

// ============================================================================
// Types
// ============================================================================

export interface SoilGridsResult {
    clay: number;      // Clay content 0-100%
    sand: number;      // Sand content 0-100%
    silt: number;      // Silt content 0-100%
    textureClass: string;  // USDA texture class name
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

interface CacheEntry {
    result: SoilGridsResult;
    timestamp: number;
    lat: number;
    lon: number;
}

// ============================================================================
// Constants
// ============================================================================

const SOILGRIDS_WMS_URL = 'https://maps.isric.org/mapserv';
const CACHE_KEY = 'soilgrids_cache';
const API_STATUS_KEY = 'soilgrids_api_status';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_DISTANCE_THRESHOLD_M = 500; // Use cached result if within 500m
const API_TIMEOUT_MS = 10000; // 10 second timeout for WMS
const API_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown when API is down

// Properties we need from SoilGrids (topsoil 0-5cm for simplicity, WMS only supports one layer at a time)
const SOIL_DEPTH = '0-5cm';

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

function markAPIFailure(): void {
    const status = getAPIStatus();
    const failures = status.consecutiveFailures + 1;
    // Mark as down after 2 consecutive failures
    setAPIStatus({ 
        isDown: failures >= 2, 
        lastCheck: Date.now(), 
        consecutiveFailures: failures 
    });
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
        return JSON.parse(cached) as CacheEntry[];
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
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function findCachedResult(lat: number, lon: number): CacheEntry | null {
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

function addToCache(lat: number, lon: number, result: SoilGridsResult): void {
    const cache = getCache();
    cache.push({
        result,
        timestamp: Date.now(),
        lat,
        lon
    });
    saveCache(cache);
}

// ============================================================================
// API Calls
// ============================================================================

/**
 * Fetches a single soil property using WMS GetFeatureInfo
 * Returns value in g/kg (divide by 10 to get percentage)
 */
async function fetchSoilProperty(lat: number, lon: number, property: string): Promise<number> {
    // Create a small bounding box around the point (0.2 degrees = ~20km)
    const delta = 0.1;
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    
    // WMS GetFeatureInfo URL
    const url = `${SOILGRIDS_WMS_URL}?map=/map/${property}.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=${property}_${SOIL_DEPTH}_mean&QUERY_LAYERS=${property}_${SOIL_DEPTH}_mean&STYLES=&INFO_FORMAT=text/html&X=50&Y=50&WIDTH=100&HEIGHT=100&SRS=EPSG:4326&BBOX=${bbox}`;
    
    console.log(`[SoilGrids] Fetching ${property} from WMS...`);
    
    const response: HttpResponse = await CapacitorHttp.get({
        url,
        headers: {
            'Accept': 'text/html'
        },
        connectTimeout: API_TIMEOUT_MS,
        readTimeout: API_TIMEOUT_MS
    });

    if (response.status < 200 || response.status >= 300) {
        throw new Error(`WMS error for ${property}: ${response.status}`);
    }

    // Parse HTML response to extract value
    // Format: <span id="value">503</span>
    const html = response.data as string;
    const valueMatch = html.match(/<span id="value">(\d+)<\/span>/);
    
    if (!valueMatch) {
        console.warn(`[SoilGrids] Could not parse ${property} value from response`);
        throw new Error(`Could not parse ${property} value`);
    }
    
    const value = parseInt(valueMatch[1], 10);
    console.log(`[SoilGrids] ${property} = ${value} g/kg (${value / 10}%)`);
    return value;
}

/**
 * Fetches soil data from SoilGrids using WMS GetFeatureInfo (bypasses CORS with CapacitorHttp)
 * Makes 3 parallel requests for clay, sand, silt
 */
async function fetchFromSoilGridsWMS(lat: number, lon: number): Promise<{ clay: number; sand: number; silt: number }> {
    console.log('[SoilGrids] Fetching soil data via WMS GetFeatureInfo...');
    
    // Fetch all three properties in parallel
    const [clayRaw, sandRaw, siltRaw] = await Promise.all([
        fetchSoilProperty(lat, lon, 'clay'),
        fetchSoilProperty(lat, lon, 'sand'),
        fetchSoilProperty(lat, lon, 'silt')
    ]);
    
    // Convert from g/kg to percentage
    const clay = clayRaw / 10;
    const sand = sandRaw / 10;
    const silt = siltRaw / 10;
    
    console.log(`[SoilGrids] Final values: clay=${clay}%, sand=${sand}%, silt=${silt}%`);
    
    return { clay, sand, silt };
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
    
    // Try to match
    for (const [key, value] of Object.entries(estimates)) {
        if (textureClass.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    return estimates['Loam']; // Default
}

/**
 * Parses SoilGrids API response to extract clay/sand/silt values
 */
function parseAPIResponse(response: SoilGridsAPIResponse): { clay: number; sand: number; silt: number } {
    const result = { clay: 0, sand: 0, silt: 0 };

    for (const layer of response.properties?.layers || []) {
        const depth = layer.depths?.find(d => d.label === SOIL_DEPTH);
        if (!depth) continue;

        // Values are in g/kg, convert to percentage
        const value = (depth.values?.mean || 0) / 10;

        switch (layer.name) {
            case 'clay':
                result.clay = value;
                break;
            case 'sand':
                result.sand = value;
                break;
            case 'silt':
                result.silt = value;
                break;
        }
    }

    return result;
}

/**
 * Determines confidence level based on API response quality
 */
function determineConfidence(clay: number, sand: number, silt: number): 'high' | 'medium' | 'low' {
    const total = clay + sand + silt;
    
    // If total is way off from 100%, data quality is questionable
    if (total < 80 || total > 120) return 'low';
    if (total < 90 || total > 110) return 'medium';
    
    // If any component is 0, might be missing data
    if (clay === 0 || sand === 0 || silt === 0) return 'medium';
    
    return 'high';
}

// ============================================================================
// Main Service Class
// ============================================================================

export class SoilGridsService {
    private static instance: SoilGridsService;

    private constructor() {}

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
    public async detectSoilFromLocation(lat: number, lon: number): Promise<SoilGridsResult> {
        console.log(`[SoilGrids] Detecting soil for coordinates: ${lat}, ${lon}`);

        // Check cache first
        const cached = findCachedResult(lat, lon);
        if (cached) {
            console.log('[SoilGrids] Using cached result');
            return {
                ...cached.result,
                source: 'cache'
            };
        }

        // Check if API is known to be down (skip to save time)
        if (shouldSkipAPI()) {
            console.log('[SoilGrids] API marked as down, using fallback immediately');
            return this.createFallbackResult();
        }

        // Try SoilGrids WMS
        try {
            const { clay, sand, silt } = await fetchFromSoilGridsWMS(lat, lon);
            
            console.log(`[SoilGrids] WMS returned: clay=${clay}%, sand=${sand}%, silt=${silt}%`);
            markAPISuccess();

            // Classify using USDA triangle
            const textureClass = classifyUSDATexture(clay, sand, silt);
            console.log(`[SoilGrids] Classified as: ${textureClass}`);

            // Map to our soil DB
            const matchedSoil = mapTextureToSoilDB(textureClass);

            const result: SoilGridsResult = {
                clay,
                sand,
                silt,
                textureClass,
                confidence: determineConfidence(clay, sand, silt),
                matchedSoil,
                source: 'api'
            };

            // Cache the result
            addToCache(lat, lon, result);

            return result;
        } catch (error) {
            console.warn('[SoilGrids] API failed:', error);
            markAPIFailure();
            return this.createFallbackResult();
        }
    }

    /**
     * Creates a fallback result when API is unavailable
     */
    private createFallbackResult(): SoilGridsResult {
        const fallbackSoil = mapTextureToSoilDB('Loam');
        return {
            clay: 20,
            sand: 40,
            silt: 40,
            textureClass: 'Loam',
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
// Utility Functions (exported for use in components)
// ============================================================================

/**
 * Checks if Cycle & Soak should be auto-enabled based on soil
 */
export function shouldEnableCycleSoak(soil: SoilDBEntry): boolean {
    // Enable for slow-draining soils (infiltration < 10 mm/h)
    const infiltration = soil.infiltration_rate_mm_h;
    if (typeof infiltration !== 'number') return false;
    return infiltration < 10;
}

/**
 * Calculates recommended max volume limit based on coverage and soil
 */
export function calculateRecommendedMaxVolume(
    coverageType: 'area' | 'plants',
    coverageValue: number,
    soil: SoilDBEntry
): number {
    const awc = soil.available_water_mm_m;
    if (typeof awc !== 'number') return 50; // Default 50L

    if (coverageType === 'area') {
        // Formula: area_m² × AWC_mm/m × 0.5 (half of available water capacity)
        // AWC is in mm per meter depth, assume 30cm root zone
        const volumeL = (coverageValue * awc * 0.3 * 0.5) / 1000;
        return Math.max(5, Math.min(500, Math.round(volumeL)));
    } else {
        // For plant count: ~2L per plant (adjustable)
        return Math.max(5, Math.min(500, coverageValue * 2));
    }
}

/**
 * Calculates Cycle & Soak timing based on soil infiltration rate
 */
export function calculateCycleSoakTiming(soil: SoilDBEntry): { cycleMinutes: number; soakMinutes: number } {
    const infiltration = soil.infiltration_rate_mm_h;
    if (typeof infiltration !== 'number') {
        return { cycleMinutes: 5, soakMinutes: 10 }; // Default
    }

    // Lower infiltration = shorter cycles, longer soaks
    if (infiltration <= 3) {
        // Heavy clay
        return { cycleMinutes: 3, soakMinutes: 20 };
    } else if (infiltration <= 6) {
        // Clay/Silty clay
        return { cycleMinutes: 5, soakMinutes: 15 };
    } else if (infiltration <= 10) {
        // Clay loam / Silt loam
        return { cycleMinutes: 8, soakMinutes: 10 };
    } else {
        // Sandy soils - no real need for cycle & soak
        return { cycleMinutes: 10, soakMinutes: 5 };
    }
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
    organicMatter: number = 2.0
): CustomSoilParameters {
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
    
    return {
        name: `Detected ${textureClass}`,
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
