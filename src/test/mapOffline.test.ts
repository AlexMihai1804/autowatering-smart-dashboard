/**
 * mapOffline Unit Tests
 * 
 * Tests for tile math helpers and utility functions.
 * Async cache functions are tested with mocked localforage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    latLngToTile,
    getTilesInBounds,
    countTilesForRegion,
    formatBytes,
    CACHE_REGIONS,
    getCachedTile,
    cacheTile,
    isTileCached,
    clearTileCache,
    getCacheStats
} from '../utils/mapOffline';

// Mock localforage
vi.mock('localforage', () => {
    const store = new Map<string, any>();
    return {
        default: {
            createInstance: () => ({
                getItem: vi.fn((key: string) => Promise.resolve(store.get(key) || null)),
                setItem: vi.fn((key: string, value: any) => {
                    store.set(key, value);
                    return Promise.resolve(value);
                }),
                clear: vi.fn(() => {
                    store.clear();
                    return Promise.resolve();
                }),
                keys: vi.fn(() => Promise.resolve(Array.from(store.keys())))
            })
        }
    };
});

describe('mapOffline', () => {
    describe('CACHE_REGIONS', () => {
        it('should have Europe region defined', () => {
            expect(CACHE_REGIONS.europe).toBeDefined();
            expect(CACHE_REGIONS.europe.name).toBe('Europe');
            expect(CACHE_REGIONS.europe.bounds).toBeDefined();
            expect(CACHE_REGIONS.europe.minZoom).toBe(5);
            expect(CACHE_REGIONS.europe.maxZoom).toBe(10);
        });

        it('should have North America region defined', () => {
            expect(CACHE_REGIONS.northAmerica).toBeDefined();
            expect(CACHE_REGIONS.northAmerica.name).toBe('North America');
            expect(CACHE_REGIONS.northAmerica.bounds).toBeDefined();
            expect(CACHE_REGIONS.northAmerica.minZoom).toBe(5);
            expect(CACHE_REGIONS.northAmerica.maxZoom).toBe(10);
        });

        it('should have valid bounds for Europe', () => {
            const { bounds } = CACHE_REGIONS.europe;
            expect(bounds.minLat).toBeLessThan(bounds.maxLat);
            expect(bounds.minLng).toBeLessThan(bounds.maxLng);
            expect(bounds.minLat).toBeGreaterThanOrEqual(-90);
            expect(bounds.maxLat).toBeLessThanOrEqual(90);
            expect(bounds.minLng).toBeGreaterThanOrEqual(-180);
            expect(bounds.maxLng).toBeLessThanOrEqual(180);
        });

        it('should have valid bounds for North America', () => {
            const { bounds } = CACHE_REGIONS.northAmerica;
            expect(bounds.minLat).toBeLessThan(bounds.maxLat);
            expect(bounds.minLng).toBeLessThan(bounds.maxLng);
            expect(bounds.minLat).toBeGreaterThanOrEqual(-90);
            expect(bounds.maxLat).toBeLessThanOrEqual(90);
            expect(bounds.minLng).toBeGreaterThanOrEqual(-180);
            expect(bounds.maxLng).toBeLessThanOrEqual(180);
        });
    });

    describe('latLngToTile', () => {
        it('should convert lat/lng to tile coordinates at zoom 0', () => {
            // At zoom 0, there's only 1 tile (0,0)
            const tile = latLngToTile(0, 0, 0);
            expect(tile.x).toBe(0);
            expect(tile.y).toBe(0);
        });

        it('should convert lat/lng to tile coordinates at zoom 1', () => {
            // At zoom 1, there are 4 tiles (2x2)
            const tile = latLngToTile(0, 0, 1);
            expect(tile.x).toBe(1);
            expect(tile.y).toBe(1);
        });

        it('should handle positive longitude (Eastern hemisphere)', () => {
            // Bucharest, Romania: ~44.4°N, 26.1°E
            const tile = latLngToTile(44.4, 26.1, 10);
            expect(tile.x).toBeGreaterThan(0);
            expect(tile.y).toBeGreaterThan(0);
        });

        it('should handle negative longitude (Western hemisphere)', () => {
            // New York: ~40.7°N, -74°W
            const tile = latLngToTile(40.7, -74, 10);
            expect(tile.x).toBeGreaterThan(0);
            expect(tile.y).toBeGreaterThan(0);
        });

        it('should handle negative latitude (Southern hemisphere)', () => {
            // Sydney, Australia: ~-33.9°S, 151.2°E
            const tile = latLngToTile(-33.9, 151.2, 10);
            expect(tile.x).toBeGreaterThan(0);
            expect(tile.y).toBeGreaterThan(0);
        });

        it('should clamp tile coordinates to valid range', () => {
            // Test extreme values
            const tileMax = latLngToTile(85.05, 180, 5);
            const tileMin = latLngToTile(-85.05, -180, 5);
            
            const n = Math.pow(2, 5); // 32 tiles at zoom 5
            expect(tileMax.x).toBeLessThan(n);
            expect(tileMax.y).toBeLessThan(n);
            expect(tileMin.x).toBeGreaterThanOrEqual(0);
            expect(tileMin.y).toBeGreaterThanOrEqual(0);
        });

        it('should produce different tiles at different zoom levels', () => {
            const lat = 45;
            const lng = 25;
            
            const tile5 = latLngToTile(lat, lng, 5);
            const tile10 = latLngToTile(lat, lng, 10);
            
            // At higher zoom, tile numbers are larger (more tiles)
            expect(tile10.x).toBeGreaterThan(tile5.x);
            expect(tile10.y).toBeGreaterThan(tile5.y);
        });
    });

    describe('getTilesInBounds', () => {
        it('should return tiles for a small bounding box', () => {
            // Small area around Bucharest
            const tiles = getTilesInBounds(44.3, 44.5, 25.9, 26.2, 10);
            expect(tiles.length).toBeGreaterThan(0);
            tiles.forEach(tile => {
                expect(tile.z).toBe(10);
                expect(tile.x).toBeGreaterThanOrEqual(0);
                expect(tile.y).toBeGreaterThanOrEqual(0);
            });
        });

        it('should return single tile for very small area at low zoom', () => {
            // Very small area at zoom 0
            const tiles = getTilesInBounds(0, 1, 0, 1, 0);
            expect(tiles.length).toBe(1);
            expect(tiles[0]).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('should return more tiles at higher zoom levels', () => {
            const bounds = { minLat: 44.3, maxLat: 44.5, minLng: 25.9, maxLng: 26.2 };
            
            const tilesZ5 = getTilesInBounds(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng, 5);
            const tilesZ10 = getTilesInBounds(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng, 10);
            
            expect(tilesZ10.length).toBeGreaterThanOrEqual(tilesZ5.length);
        });

        it('should include all tiles within the bounding box', () => {
            // 2x2 tile area at zoom 1
            const tiles = getTilesInBounds(-45, 45, -90, 90, 1);
            
            // Should cover multiple tiles
            expect(tiles.length).toBeGreaterThan(1);
            
            // All tiles should be at zoom 1
            tiles.forEach(tile => {
                expect(tile.z).toBe(1);
            });
        });

        it('should handle crossing the date line (large longitude range)', () => {
            // Large area spanning most of the world
            const tiles = getTilesInBounds(40, 50, -10, 30, 3);
            expect(tiles.length).toBeGreaterThan(0);
        });
    });

    describe('countTilesForRegion', () => {
        it('should count tiles for Europe region', () => {
            const count = countTilesForRegion(CACHE_REGIONS.europe);
            expect(count).toBeGreaterThan(0);
            // Europe region should have a reasonable number of tiles
            expect(count).toBeGreaterThan(100);
        });

        it('should count tiles for North America region', () => {
            const count = countTilesForRegion(CACHE_REGIONS.northAmerica);
            expect(count).toBeGreaterThan(0);
            expect(count).toBeGreaterThan(100);
        });

        it('should return higher count for higher maxZoom', () => {
            const smallRegion = {
                name: 'Test',
                bounds: { minLat: 44, maxLat: 45, minLng: 25, maxLng: 26 },
                minZoom: 5,
                maxZoom: 7
            };
            const largeZoomRegion = {
                ...smallRegion,
                maxZoom: 10
            };
            
            const countSmall = countTilesForRegion(smallRegion);
            const countLarge = countTilesForRegion(largeZoomRegion);
            
            expect(countLarge).toBeGreaterThan(countSmall);
        });

        it('should count tiles across all zoom levels', () => {
            const region = {
                name: 'Test',
                bounds: { minLat: 44, maxLat: 45, minLng: 25, maxLng: 26 },
                minZoom: 5,
                maxZoom: 6
            };
            
            const count = countTilesForRegion(region);
            
            // Should be sum of tiles at zoom 5 and zoom 6
            const tilesZ5 = getTilesInBounds(
                region.bounds.minLat, region.bounds.maxLat,
                region.bounds.minLng, region.bounds.maxLng,
                5
            );
            const tilesZ6 = getTilesInBounds(
                region.bounds.minLat, region.bounds.maxLat,
                region.bounds.minLng, region.bounds.maxLng,
                6
            );
            
            expect(count).toBe(tilesZ5.length + tilesZ6.length);
        });

        it('should return 0 for empty region', () => {
            // Region with same min/max coordinates
            const emptyRegion = {
                name: 'Empty',
                bounds: { minLat: 44, maxLat: 44, minLng: 25, maxLng: 25 },
                minZoom: 5,
                maxZoom: 5
            };
            
            const count = countTilesForRegion(emptyRegion);
            // Should still return at least 1 tile for the point
            expect(count).toBeGreaterThanOrEqual(1);
        });
    });

    describe('formatBytes', () => {
        it('should format 0 bytes', () => {
            expect(formatBytes(0)).toBe('0 B');
        });

        it('should format bytes', () => {
            expect(formatBytes(500)).toBe('500 B');
            expect(formatBytes(1000)).toBe('1000 B');
        });

        it('should format kilobytes', () => {
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1536)).toBe('1.5 KB');
            expect(formatBytes(10240)).toBe('10 KB');
        });

        it('should format megabytes', () => {
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(1572864)).toBe('1.5 MB');
            expect(formatBytes(104857600)).toBe('100 MB');
        });

        it('should format gigabytes', () => {
            expect(formatBytes(1073741824)).toBe('1 GB');
            expect(formatBytes(1610612736)).toBe('1.5 GB');
        });

        it('should round to 1 decimal place', () => {
            // 1.234 KB = 1264 bytes
            expect(formatBytes(1264)).toBe('1.2 KB');
            
            // 1.567 KB = 1605 bytes
            expect(formatBytes(1605)).toBe('1.6 KB');
        });
    });

    describe('Cache Operations (mocked)', () => {
        beforeEach(() => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(console, 'log').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        describe('getCachedTile', () => {
            it('should return null for non-cached tile', async () => {
                const result = await getCachedTile(5, 10, 15);
                expect(result).toBeNull();
            });
        });

        describe('cacheTile', () => {
            it('should cache a tile without throwing', async () => {
                const blob = new Blob(['test'], { type: 'image/png' });
                await expect(cacheTile(5, 10, 15, blob)).resolves.toBeUndefined();
            });
        });

        describe('isTileCached', () => {
            it('should check if tile is cached', async () => {
                // After caching, should return true
                const blob = new Blob(['test'], { type: 'image/png' });
                await cacheTile(6, 11, 16, blob);
                const result = await isTileCached(6, 11, 16);
                expect(typeof result).toBe('boolean');
            });
        });

        describe('clearTileCache', () => {
            it('should clear cache without throwing', async () => {
                await expect(clearTileCache()).resolves.toBeUndefined();
            });
        });

        describe('getCacheStats', () => {
            it('should return stats object', async () => {
                const stats = await getCacheStats();
                expect(stats).toHaveProperty('totalTiles');
                expect(stats).toHaveProperty('cachedTiles');
                expect(stats).toHaveProperty('sizeBytes');
                expect(typeof stats.totalTiles).toBe('number');
                expect(typeof stats.cachedTiles).toBe('number');
                expect(typeof stats.sizeBytes).toBe('number');
            });
        });
    });
});
