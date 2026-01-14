/**
 * Pack Sync Service - Syncs custom plant data from the embedded device
 * 
 * Uses change_counter from PackStats for cache invalidation.
 * Only syncs when counter differs from cached value.
 * 
 * ROM plants (1-223) are stored in local JSON, not synced via BLE.
 * Only custom plants (id >= 224) are synced from the device.
 */

import { BleService } from './BleService';
import { useAppStore } from '../store/useAppStore';
import { PackPlantListEntry, PackStats, isCustomPlant } from '../types/firmware_structs';

export class PackSyncService {
    private static instance: PackSyncService;
    private bleService: BleService;
    private isSyncing = false;

    private constructor() {
        this.bleService = BleService.getInstance();
    }

    static getInstance(): PackSyncService {
        if (!PackSyncService.instance) {
            PackSyncService.instance = new PackSyncService();
        }
        return PackSyncService.instance;
    }

    /**
     * Sync custom plants from the device.
     * Uses change_counter to skip sync if data hasn't changed.
     * 
     * @param force - Force sync even if change_counter matches
     * @param onProgress - Optional progress callback for streaming
     * @returns true if sync was performed, false if skipped (cache valid)
     */
    async syncCustomPlantsFromDevice(
        force = false,
        onProgress?: (progress: number, count: number, total: number) => void
    ): Promise<boolean> {
        // Prevent concurrent syncs - check FIRST before any async ops
        if (this.isSyncing) {
            console.log('[PackSync] Sync already in progress, skipping');
            return false;
        }
        
        // Set flag immediately to prevent race conditions
        this.isSyncing = true;
        
        const store = useAppStore.getState();
        store.setPackSyncInProgress(true);

        try {
            // Check if pack service is available
            const isAvailable = await this.bleService.isPackServiceAvailable();
            if (!isAvailable) {
                console.log('[PackSync] Pack service not available on device');
                return false;
            }

            // Step 1: Read PackStats to get storage info and change_counter
            console.log('[PackSync] Reading pack stats...');
            const stats = await this.bleService.readPackStats();
            console.log(`[PackSync] Stats: ${stats.plant_count} plants in list, ${stats.builtin_count} ROM, change_counter=${stats.change_counter}`);

            // Fast path: if there are no custom plants, some firmware versions may not emit any
            // streaming notifications (leading to a timeout). In that case, treat as empty list.
            if (stats.plant_count <= stats.builtin_count) {
                if (stats.plant_count < stats.builtin_count) {
                    console.warn(
                        `[PackSync] Stats look inconsistent (plant_count=${stats.plant_count} < builtin_count=${stats.builtin_count}); assuming 0 custom plants`
                    );
                }

                store.setPackStats(stats);
                store.setCustomPlants([]);
                store.setPackChangeCounter(stats.change_counter);

                if (onProgress) onProgress(1, 0, 0);

                console.log('[PackSync] No custom plants; skipping streaming');
                return true;
            }

            // Step 2: Check if we need to sync (change_counter comparison)
            if (!force && stats.change_counter === store.packChangeCounter) {
                console.log('[PackSync] Cache valid (change_counter matches), skipping sync');
                store.setPackStats(stats);
                return false;
            }

            // Step 3: Stream custom plants using notifications
            console.log('[PackSync] Streaming custom plants...');
            const customPlants = await this.bleService.streamPackPlants('CUSTOM_ONLY', onProgress);
            
            // Filter to only include custom plants (id >= 224) in case firmware includes ROM
            const filteredPlants = customPlants.filter(p => isCustomPlant(p.plant_id));
            console.log(`[PackSync] Received ${customPlants.length} plants, ${filteredPlants.length} are custom`);

            // Step 4: List installed packs
            console.log('[PackSync] Listing installed packs...');
            const packs = await this.bleService.listPacks();
            console.log(`[PackSync] Found ${packs.length} packs`);

            // Step 5: Update store
            store.setPackStats(stats);
            store.setCustomPlants(filteredPlants);
            store.setInstalledPacks(packs);
            store.setPackChangeCounter(stats.change_counter);

            console.log(`[PackSync] Sync complete: ${filteredPlants.length} custom plants, ${packs.length} packs synced`);
            return true;

        } catch (err) {
            console.error('[PackSync] Sync failed:', err);
            throw err;
        } finally {
            this.isSyncing = false;
            store.setPackSyncInProgress(false);
        }
    }

    /**
     * Delete a custom plant from the device and update cache
     * @param plantId - The plant ID to delete (must be >= 224)
     */
    async deleteCustomPlant(plantId: number): Promise<void> {
        if (!isCustomPlant(plantId)) {
            throw new Error(`Cannot delete ROM plant ${plantId}`);
        }

        const store = useAppStore.getState();

        try {
            console.log(`[PackSync] Deleting plant ${plantId}...`);
            await this.bleService.deletePackPlant(plantId);

            // Optimistically remove from cache
            store.removeCustomPlant(plantId);

            // Re-sync to get updated stats and change_counter
            await this.syncCustomPlantsFromDevice(true);

            console.log(`[PackSync] Plant ${plantId} deleted successfully`);
        } catch (err) {
            console.error(`[PackSync] Failed to delete plant ${plantId}:`, err);
            throw err;
        }
    }

    /**
     * Get cached pack stats (or fetch if not cached)
     */
    async getPackStats(): Promise<PackStats | null> {
        const store = useAppStore.getState();

        if (store.packStats) {
            return store.packStats;
        }

        // Not cached, sync from device
        await this.syncCustomPlantsFromDevice();
        return useAppStore.getState().packStats;
    }

    /**
     * Check if sync is currently in progress
     */
    isSyncInProgress(): boolean {
        return this.isSyncing;
    }
}

export const packSyncService = PackSyncService.getInstance();