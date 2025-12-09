// ============================================================================
// Offline Map Tile Caching Service
// Uses localforage (IndexedDB) to cache OpenStreetMap tiles for offline use
// ============================================================================

import localforage from 'localforage';

// Configure localforage instance for map tiles
const tileStore = localforage.createInstance({
    name: 'autowatering-tiles',
    storeName: 'map_tiles',
    description: 'Cached map tiles for offline use'
});

// Tile URL template for OpenStreetMap
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Pre-defined regions for caching
export const CACHE_REGIONS = {
    europe: {
        name: 'Europe',
        bounds: { minLat: 35, maxLat: 72, minLng: -25, maxLng: 45 },
        minZoom: 5,
        maxZoom: 10
    },
    northAmerica: {
        name: 'North America',
        bounds: { minLat: 25, maxLat: 72, minLng: -170, maxLng: -50 },
        minZoom: 5,
        maxZoom: 10
    }
};

export interface CacheRegion {
    name: string;
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
    minZoom: number;
    maxZoom: number;
}

export interface TileCacheStats {
    totalTiles: number;
    cachedTiles: number;
    sizeBytes: number;
}

// ============================================================================
// Tile Math Helpers
// ============================================================================

/**
 * Convert latitude/longitude to tile X/Y coordinates at a given zoom level
 */
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Get all tile coordinates within a bounding box at a given zoom level
 */
export function getTilesInBounds(
    minLat: number, maxLat: number, 
    minLng: number, maxLng: number, 
    zoom: number
): Array<{ x: number; y: number; z: number }> {
    const tiles: Array<{ x: number; y: number; z: number }> = [];
    
    const topLeft = latLngToTile(maxLat, minLng, zoom);
    const bottomRight = latLngToTile(minLat, maxLng, zoom);
    
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
        for (let y = topLeft.y; y <= bottomRight.y; y++) {
            tiles.push({ x, y, z: zoom });
        }
    }
    
    return tiles;
}

/**
 * Count tiles needed for a region at all zoom levels
 */
export function countTilesForRegion(region: CacheRegion): number {
    let count = 0;
    for (let z = region.minZoom; z <= region.maxZoom; z++) {
        const tiles = getTilesInBounds(
            region.bounds.minLat, region.bounds.maxLat,
            region.bounds.minLng, region.bounds.maxLng,
            z
        );
        count += tiles.length;
    }
    return count;
}

// ============================================================================
// Tile Cache Key
// ============================================================================

function getTileKey(z: number, x: number, y: number): string {
    return `${z}/${x}/${y}`;
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get a tile from cache
 */
export async function getCachedTile(z: number, x: number, y: number): Promise<Blob | null> {
    try {
        const key = getTileKey(z, x, y);
        const blob = await tileStore.getItem<Blob>(key);
        return blob;
    } catch (error) {
        console.warn('[TileCache] Error getting tile:', error);
        return null;
    }
}

/**
 * Save a tile to cache
 */
export async function cacheTile(z: number, x: number, y: number, blob: Blob): Promise<void> {
    try {
        const key = getTileKey(z, x, y);
        await tileStore.setItem(key, blob);
    } catch (error) {
        console.warn('[TileCache] Error caching tile:', error);
    }
}

/**
 * Check if a tile is cached
 */
export async function isTileCached(z: number, x: number, y: number): Promise<boolean> {
    try {
        const key = getTileKey(z, x, y);
        const blob = await tileStore.getItem<Blob>(key);
        return blob !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Fetch a tile with cache-first strategy
 */
export async function fetchTileWithCache(z: number, x: number, y: number): Promise<string> {
    // Try cache first
    const cachedBlob = await getCachedTile(z, x, y);
    if (cachedBlob) {
        return URL.createObjectURL(cachedBlob);
    }
    
    // Fetch from network
    const url = OSM_TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        
        // Cache the tile for offline use
        await cacheTile(z, x, y, blob);
        
        return URL.createObjectURL(blob);
    } catch (error) {
        console.warn('[TileCache] Network fetch failed:', error);
        // Return a placeholder or throw
        throw error;
    }
}

// ============================================================================
// Bulk Download Operations
// ============================================================================

export interface DownloadProgress {
    total: number;
    completed: number;
    failed: number;
    percent: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * Download all tiles for a region with progress callback
 */
export async function downloadRegionTiles(
    region: CacheRegion,
    onProgress?: ProgressCallback,
    abortSignal?: AbortSignal
): Promise<{ success: number; failed: number }> {
    const allTiles: Array<{ x: number; y: number; z: number }> = [];
    
    // Collect all tiles for all zoom levels
    for (let z = region.minZoom; z <= region.maxZoom; z++) {
        const tiles = getTilesInBounds(
            region.bounds.minLat, region.bounds.maxLat,
            region.bounds.minLng, region.bounds.maxLng,
            z
        );
        allTiles.push(...tiles);
    }
    
    console.log(`[TileCache] Starting download of ${allTiles.length} tiles for ${region.name}`);
    
    let completed = 0;
    let failed = 0;
    const total = allTiles.length;
    
    // Download in batches to avoid overwhelming the browser
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < allTiles.length; i += BATCH_SIZE) {
        if (abortSignal?.aborted) {
            console.log('[TileCache] Download aborted');
            break;
        }
        
        const batch = allTiles.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (tile) => {
            // Skip if already cached
            if (await isTileCached(tile.z, tile.x, tile.y)) {
                completed++;
                return;
            }
            
            const url = OSM_TILE_URL
                .replace('{z}', String(tile.z))
                .replace('{x}', String(tile.x))
                .replace('{y}', String(tile.y));
            
            try {
                const response = await fetch(url, { signal: abortSignal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const blob = await response.blob();
                await cacheTile(tile.z, tile.x, tile.y, blob);
                completed++;
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    failed++;
                }
            }
        }));
        
        // Report progress
        if (onProgress) {
            onProgress({
                total,
                completed,
                failed,
                percent: Math.round((completed + failed) / total * 100)
            });
        }
        
        // Small delay between batches to be nice to the tile server
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`[TileCache] Download complete: ${completed} success, ${failed} failed`);
    return { success: completed, failed };
}

/**
 * Download tiles for both Europe and North America
 */
export async function downloadAllRegions(
    onProgress?: ProgressCallback,
    abortSignal?: AbortSignal
): Promise<void> {
    const europeCount = countTilesForRegion(CACHE_REGIONS.europe);
    const naCount = countTilesForRegion(CACHE_REGIONS.northAmerica);
    const totalTiles = europeCount + naCount;
    
    let globalCompleted = 0;
    let globalFailed = 0;
    
    // Download Europe
    console.log('[TileCache] Downloading Europe tiles...');
    await downloadRegionTiles(CACHE_REGIONS.europe, (progress) => {
        if (onProgress) {
            onProgress({
                total: totalTiles,
                completed: globalCompleted + progress.completed,
                failed: globalFailed + progress.failed,
                percent: Math.round((globalCompleted + progress.completed + progress.failed) / totalTiles * 100)
            });
        }
    }, abortSignal);
    
    globalCompleted += europeCount;
    
    if (abortSignal?.aborted) return;
    
    // Download North America
    console.log('[TileCache] Downloading North America tiles...');
    await downloadRegionTiles(CACHE_REGIONS.northAmerica, (progress) => {
        if (onProgress) {
            onProgress({
                total: totalTiles,
                completed: globalCompleted + progress.completed,
                failed: globalFailed + progress.failed,
                percent: Math.round((globalCompleted + progress.completed + progress.failed) / totalTiles * 100)
            });
        }
    }, abortSignal);
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<TileCacheStats> {
    try {
        const keys = await tileStore.keys();
        let totalSize = 0;
        
        // Sample a few tiles to estimate average size
        const sampleSize = Math.min(10, keys.length);
        for (let i = 0; i < sampleSize; i++) {
            const blob = await tileStore.getItem<Blob>(keys[i]);
            if (blob) {
                totalSize += blob.size;
            }
        }
        
        const avgSize = sampleSize > 0 ? totalSize / sampleSize : 0;
        const estimatedTotal = avgSize * keys.length;
        
        return {
            totalTiles: countTilesForRegion(CACHE_REGIONS.europe) + countTilesForRegion(CACHE_REGIONS.northAmerica),
            cachedTiles: keys.length,
            sizeBytes: estimatedTotal
        };
    } catch (error) {
        console.error('[TileCache] Error getting stats:', error);
        return { totalTiles: 0, cachedTiles: 0, sizeBytes: 0 };
    }
}

/**
 * Clear all cached tiles
 */
export async function clearTileCache(): Promise<void> {
    try {
        await tileStore.clear();
        console.log('[TileCache] Cache cleared');
    } catch (error) {
        console.error('[TileCache] Error clearing cache:', error);
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
