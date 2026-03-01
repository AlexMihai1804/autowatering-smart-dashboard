/**
 * Marketplace ↔ Device Sync Service
 *
 * Orchestrates syncing marketplace plants to/from the BLE device.
 * Uses plantConversion.ts for data format conversion and BleService for writes.
 *
 * Flow: Marketplace Plant → plantDataToPackPlantV1() → BleService.writePackPlant()
 */

import { BleService } from './BleService';
import { PackSyncService } from './packSyncService';
import { useMarketplaceStore } from '../store/useMarketplaceStore';
import { useAppStore } from '../store/useAppStore';
import { plantDataToPackPlantV1, validatePlantDataForDevice, crc16ccitt } from '../utils/plantConversion';
import type { MarketplacePlant } from '../types/marketplace';
import { PLANT_ID_RANGES, isCustomPlant } from '../types/firmware_structs';

export class MarketplaceDeviceSyncService {
  private static instance: MarketplaceDeviceSyncService;
  private bleService: BleService;
  private packSyncService: PackSyncService;

  private constructor() {
    this.bleService = BleService.getInstance();
    this.packSyncService = PackSyncService.getInstance();
  }

  static getInstance(): MarketplaceDeviceSyncService {
    if (!MarketplaceDeviceSyncService.instance) {
      MarketplaceDeviceSyncService.instance = new MarketplaceDeviceSyncService();
    }
    return MarketplaceDeviceSyncService.instance;
  }

  /**
   * Sync a single marketplace plant to the connected BLE device.
   *
   * 1. Validates plantData has enough fields for a valid binary struct
   * 2. Allocates next available device plant_id (≥224)
   * 3. Converts cloud data → PackPlantV1
   * 4. Writes plant to device via BLE
   * 5. Updates marketplace store with the device mapping
   * 6. Re-syncs device cache to stay consistent
   *
   * @param plant The full marketplace plant to sync
   * @returns The assigned device plant_id
   * @throws If BLE not connected, pack service unavailable, or validation fails
   */
  async syncPlantToDevice(plant: MarketplacePlant): Promise<number> {
    const mStore = useMarketplaceStore.getState();
    const appStore = useAppStore.getState();

    // Already syncing this plant?
    if (mStore.syncingPlantIds.includes(plant.plantId)) {
      throw new Error('Plant is already being synced');
    }

    mStore.addSyncingPlantId(plant.plantId);
    mStore.setDeviceSyncStatus('syncing');
    mStore.setDeviceSyncError(null);

    try {
      // Ensure BLE pack service is available
      const packAvailable = await this.bleService.isPackServiceAvailable();
      if (!packAvailable) {
        throw new Error('Pack service not available on connected device');
      }

      // Validate plantData completeness
      const plantData = plant.plantData || {};
      const issues = validatePlantDataForDevice(plantData);
      if (issues.length > 0) {
        console.warn(
          `[MarketplaceDeviceSync] Plant ${plant.plantId} has missing fields: ${issues.join(', ')}. Using defaults.`
        );
      }

      // Check if this plant is already on the device
      const existingDeviceId = mStore.devicePlantMap[plant.plantId];
      if (existingDeviceId && existingDeviceId >= PLANT_ID_RANGES.CUSTOM_MIN) {
        console.log(
          `[MarketplaceDeviceSync] Plant ${plant.plantId} already on device as id=${existingDeviceId}, re-writing`
        );
      }

      // Determine the next device plant_id
      const customPlants = appStore.customPlants || [];
      const devicePlantId = existingDeviceId || this.getNextDevicePlantId(customPlants);

      if (devicePlantId > 65534) {
        throw new Error('No free custom plant IDs available on device');
      }

      // Convert cloud plantData → PackPlantV1 binary struct
      const packPlant = plantDataToPackPlantV1(plantData, {
        plantId: devicePlantId,
        packId: 0,
        commonName: plant.commonNameEn || plant.commonNameRo || plant.scientificName,
        scientificName: plant.scientificName,
        cloudPlantId: plant.plantId,
        cloudVersion: plant.version ?? 1,
      });

      console.log(
        `[MarketplaceDeviceSync] Writing plant "${packPlant.common_name}" → device id=${devicePlantId}`
      );

      // Write to device via BLE
      await this.bleService.writePackPlant(packPlant);

      // Update marketplace store with the mapping
      mStore.setDevicePlantMapping(plant.plantId, devicePlantId);
      mStore.updateLibraryPlantSyncStatus(plant.plantId, true, devicePlantId);
      mStore.setDeviceSyncStatus('synced');

      // Re-sync device cache to pick up the new plant
      await this.packSyncService
        .syncCustomPlantsFromDevice(true)
        .catch((err) => {
          console.warn('[MarketplaceDeviceSync] Post-sync cache refresh failed:', err);
        });

      console.log(
        `[MarketplaceDeviceSync] Successfully synced "${plant.commonNameEn}" → device id=${devicePlantId}`
      );

      return devicePlantId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MarketplaceDeviceSync] Sync failed for ${plant.plantId}:`, msg);
      mStore.setDeviceSyncStatus('error');
      mStore.setDeviceSyncError(msg);
      throw err;
    } finally {
      mStore.removeSyncingPlantId(plant.plantId);
    }
  }

  /**
   * Remove a marketplace plant from the BLE device.
   *
   * @param marketplantId The marketplace plant UUID
   * @throws If the plant is not on the device or deletion fails
   */
  async removePlantFromDevice(marketplantId: string): Promise<void> {
    const mStore = useMarketplaceStore.getState();
    const devicePlantId = mStore.devicePlantMap[marketplantId];

    if (!devicePlantId || !isCustomPlant(devicePlantId)) {
      throw new Error(`Plant ${marketplantId} is not synced to device (or is a ROM plant)`);
    }

    try {
      await this.bleService.deletePackPlant(devicePlantId);
      mStore.removeDevicePlantMapping(marketplantId);
      mStore.updateLibraryPlantSyncStatus(marketplantId, false, null);

      // Re-sync
      await this.packSyncService
        .syncCustomPlantsFromDevice(true)
        .catch((err) => {
          console.warn('[MarketplaceDeviceSync] Post-delete cache refresh failed:', err);
        });

      console.log(
        `[MarketplaceDeviceSync] Removed plant ${marketplantId} (device id=${devicePlantId})`
      );
    } catch (err) {
      console.error(`[MarketplaceDeviceSync] Delete failed for ${marketplantId}:`, err);
      throw err;
    }
  }

  /**
   * Sync multiple marketplace plants to the device in sequence.
   *
   * @param plants Array of plants to sync
   * @param onProgress Optional callback: (current, total, plant) => void
   * @returns Map of marketplace plantId → device plantId for successfully synced plants
   */
  async syncMultiplePlantsToDevice(
    plants: MarketplacePlant[],
    onProgress?: (current: number, total: number, plant: MarketplacePlant) => void
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (let i = 0; i < plants.length; i++) {
      const plant = plants[i];
      onProgress?.(i + 1, plants.length, plant);
      try {
        const deviceId = await this.syncPlantToDevice(plant);
        results[plant.plantId] = deviceId;
      } catch (err) {
        console.error(`[MarketplaceDeviceSync] Failed to sync plant ${i + 1}/${plants.length}:`, err);
        // Continue syncing remaining plants
      }
    }

    return results;
  }

  /**
   * Check if a marketplace plant is currently synced to the device.
   */
  isPlantOnDevice(marketplantId: string): boolean {
    const mStore = useMarketplaceStore.getState();
    return marketplantId in mStore.devicePlantMap;
  }

  /**
   * Get the device plant_id for a marketplace plant, or null if not synced.
   */
  getDevicePlantId(marketplantId: string): number | null {
    const mStore = useMarketplaceStore.getState();
    return mStore.devicePlantMap[marketplantId] ?? null;
  }

  // ── Private helpers ──────────────────────────────────────────────────

  /**
   * Reconcile the devicePlantMap after a BLE reconnect.
   *
   * Only handles CUSTOM plants (ID ≥ 224). ROM plants (1-223) are always
   * on-device and identified client-side via isOfficial / romPlantId.
   *
   * Per BLE docs (SYNC_GUIDE.md): use CUSTOM_ONLY (0xFF) filter because
   * "Built-in database is static — 223 plants never change".
   *
   * Flow:
   * 1. Stream CUSTOM_ONLY plants from device
   * 2. For each custom plant missing from devicePlantMap, read full record
   *    to get cloud_id_crc16
   * 3. Compare CRC16 against known marketplace cloud plantIds
   * 4. If match found, restore the devicePlantMap entry
   */
  async reconcileDeviceMap(
    knownCloudPlantIds: string[],
    signal?: AbortSignal
  ): Promise<number> {
    const mStore = useMarketplaceStore.getState();
    const currentMap = { ...mStore.devicePlantMap };
    let recovered = 0;

    try {
      // ── Step 0: Cache check via change_counter ──────────────
      // Read PackStats to get current change_counter. If it matches
      // the cached value, the device map is still valid → skip streaming.
      let stats: import('../types/firmware_structs').PackStats | null = null;
      try {
        stats = await this.bleService.readPackStats();
      } catch (err) {
        console.warn('[MarketplaceDeviceSync] Failed to read PackStats, will stream anyway:', err);
      }

      if (signal?.aborted) return recovered;

      if (stats) {
        const cachedCounter = mStore.deviceMapChangeCounter;
        if (cachedCounter > 0 && stats.change_counter === cachedCounter) {
          console.log(
            `[MarketplaceDeviceSync] Cache valid (change_counter=${cachedCounter}), skipping reconciliation`
          );
          return recovered;
        }
        console.log(
          `[MarketplaceDeviceSync] change_counter changed: cached=${cachedCounter} → device=${stats.change_counter}`
        );
      }

      // Build reverse map: devicePlantId -> cloudPlantId for existing mappings
      const reverseMap = new Map<number, string>();
      for (const [cloudId, devId] of Object.entries(currentMap)) {
        reverseMap.set(devId, cloudId);
      }

      if (signal?.aborted) return recovered;

      // Stream only custom plants from device (ROM plants handled via isOfficial)
      const devicePlants = await this.bleService.streamPackPlants('CUSTOM_ONLY');

      if (signal?.aborted) return recovered;

      // Filter to plants not already in the map
      const unmapped = devicePlants.filter(
        (entry) => !reverseMap.has(entry.plant_id)
      );

      if (unmapped.length === 0) {
        console.log('[MarketplaceDeviceSync] All custom plants already mapped');
        return recovered;
      }

      console.log(
        `[MarketplaceDeviceSync] Reconciling: ${unmapped.length} unmapped custom plants, ${knownCloudPlantIds.length} cloud IDs`
      );

      // Build CRC16 lookup: crc16 → cloudPlantId
      const crcToCloudId = new Map<number, string>();
      const usedCloudIds = new Set(Object.keys(currentMap));

      for (const cloudId of knownCloudPlantIds) {
        if (usedCloudIds.has(cloudId)) continue;
        const crc = crc16ccitt(cloudId);
        if (crc !== 0) crcToCloudId.set(crc, cloudId);
      }

      // Also include existing mapped IDs for collision avoidance
      for (const cloudId of Object.keys(currentMap)) {
        const crc = crc16ccitt(cloudId);
        if (crc !== 0 && !crcToCloudId.has(crc)) crcToCloudId.set(crc, cloudId);
      }

      // Read each unmapped custom plant's full record to get cloud_id_crc16
      for (const entry of unmapped) {
        if (signal?.aborted) break;

        const fullPlant = await this.bleService.readPackPlant(entry.plant_id);
        if (!fullPlant || fullPlant.cloud_id_crc16 === 0) continue;

        const matchedCloudId = crcToCloudId.get(fullPlant.cloud_id_crc16);
        if (matchedCloudId) {
          mStore.setDevicePlantMapping(matchedCloudId, entry.plant_id);
          recovered++;
          console.log(
            `[MarketplaceDeviceSync] Reconciled via CRC16: cloud=${matchedCloudId} → device=${entry.plant_id}`
          );
        }
      }

      console.log(
        `[MarketplaceDeviceSync] Reconciliation complete: ${recovered} custom plants matched`
      );

      // Persist change_counter so next reconcile can skip streaming
      if (stats) {
        mStore.setDeviceMapChangeCounter(stats.change_counter);
      }
    } catch (err) {
      console.warn('[MarketplaceDeviceSync] Reconciliation failed:', err);
    }

    return recovered;
  }

  /**
   * Check which installed plants have updates available.
   *
   * Compares the on-device `version` field with the cloud `MarketplacePlant.version`.
   * Returns a list of {cloudPlantId, devicePlantId, deviceVersion, cloudVersion} for
   * plants where cloudVersion > deviceVersion.
   *
   * @param cloudPlants Array of marketplace plants to check (the user's library)
   */
  async checkForUpdates(
    cloudPlants: MarketplacePlant[]
  ): Promise<Array<{ cloudPlantId: string; devicePlantId: number; deviceVersion: number; cloudVersion: number }>> {
    const mStore = useMarketplaceStore.getState();
    const updates: Array<{ cloudPlantId: string; devicePlantId: number; deviceVersion: number; cloudVersion: number }> = [];

    for (const plant of cloudPlants) {
      const deviceId = mStore.devicePlantMap[plant.plantId];
      if (!deviceId) continue; // Not on device

      try {
        const devicePlant = await this.bleService.readPackPlant(deviceId);
        if (!devicePlant) continue;

        const cloudVersion = plant.version ?? 1;
        if (cloudVersion > devicePlant.version) {
          updates.push({
            cloudPlantId: plant.plantId,
            devicePlantId: deviceId,
            deviceVersion: devicePlant.version,
            cloudVersion,
          });
        }
      } catch (err) {
        console.warn(`[MarketplaceDeviceSync] Failed to read device plant ${deviceId}:`, err);
      }
    }

    return updates;
  }

  /**
   * Update a plant that's already on the device with newer cloud data.
   * Re-writes the PackPlantV1 with the same device plant_id but updated fields + version.
   */
  async updatePlantOnDevice(plant: MarketplacePlant): Promise<void> {
    const mStore = useMarketplaceStore.getState();
    const deviceId = mStore.devicePlantMap[plant.plantId];
    if (!deviceId) {
      throw new Error(`Plant ${plant.plantId} is not on device`);
    }

    mStore.addSyncingPlantId(plant.plantId);
    mStore.setDeviceSyncStatus('syncing');
    mStore.setDeviceSyncError(null);

    try {
      const plantData = plant.plantData || {};
      const packPlant = plantDataToPackPlantV1(plantData, {
        plantId: deviceId,
        packId: 0,
        commonName: plant.commonNameEn || plant.commonNameRo || plant.scientificName,
        scientificName: plant.scientificName,
        cloudPlantId: plant.plantId,
        cloudVersion: plant.version ?? 1,
      });

      await this.bleService.writePackPlant(packPlant);
      mStore.setDeviceSyncStatus('synced');

      await this.packSyncService
        .syncCustomPlantsFromDevice(true)
        .catch((err) => console.warn('[MarketplaceDeviceSync] Post-update cache refresh failed:', err));

      console.log(`[MarketplaceDeviceSync] Updated "${plant.commonNameEn}" on device id=${deviceId} to v${plant.version}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      mStore.setDeviceSyncStatus('error');
      mStore.setDeviceSyncError(msg);
      throw err;
    } finally {
      mStore.removeSyncingPlantId(plant.plantId);
    }
  }

  private getNextDevicePlantId(
    customPlants: Array<{ plant_id: number }>
  ): number {
    if (customPlants.length === 0) return PLANT_ID_RANGES.CUSTOM_MIN;
    return Math.max(
      PLANT_ID_RANGES.CUSTOM_MIN,
      ...customPlants.map((p) => p.plant_id + 1)
    );
  }
}

export const marketplaceDeviceSyncService = MarketplaceDeviceSyncService.getInstance();
