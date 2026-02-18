import { BleClient, BleDevice, ConnectionPriority, ScanResult } from '@capacitor-community/bluetooth-le';
import { BleFragmentationManager } from './BleFragmentationManager';
import { SERVICE_UUID, CUSTOM_CONFIG_SERVICE_UUID, PACK_SERVICE_UUID, SMP_SERVICE_UUID, SMP_CHARACTERISTIC_UUID, CHAR_UUIDS } from '../types/uuids';
import { useAppStore } from '../store/useAppStore';
import {
    ChannelConfigData,
    ValveControlData,
    RtcData,
    CalibrationData,
    ResetControlData,
    SystemStatus,
    CalibrationAction,
    ResetOpcode,
    CurrentTaskData,
    OnboardingStatusData,
    EnvironmentalData,
    RainData,
    SystemConfigData,
    ScheduleConfigData,
    GrowingEnvData,
    RainConfigData,
    TimezoneConfigData,
    RainIntegrationStatusData,
    CompensationStatusData,
    AutoCalcStatusData,
    ChannelCompensationConfigData,
    FlowSensorData,
    TaskQueueData,
    StatisticsData,
    AlarmData,
    DiagnosticsData,
    HydraulicStatusData,
    HistoryDetailedEntry,
    HistoryDailyEntry,
    HistoryMonthlyEntry,
    HistoryAnnualEntry,
    RainHourlyEntry,
    RainDailyEntry,
    EnvDetailedEntry,
    EnvHourlyEntry,
    EnvDailyEntry,
    EnvTrendEntry,
    BulkSyncSnapshot,
    CustomSoilConfigData,
    CUSTOM_SOIL_OPERATIONS,
    CUSTOM_SOIL_STATUS,
    SoilMoistureConfigData,
    SOIL_MOISTURE_OPERATIONS,
    SOIL_MOISTURE_STATUS,
    IntervalModeConfigData,
    ConfigResetResponse,
    CONFIG_RESET_STATUS,
    ConfigStatusResponse,
    CONFIG_STATUS_COMMANDS,
    PackPlantV1,
    PackPlantListEntry,
    PackListEntry,
    PackStats,
    PackTransferStatus,
    PACK_OPERATIONS,
    PACK_RESULT,
    PACK_LIST_OPCODE,
    PLANT_ID_RANGES,
    isAlarmCritical
} from '../types/firmware_structs';

// Standard BLE Device Information Service (DIS)
const DEVICE_INFO_SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb';
const DEVICE_INFO_FIRMWARE_REV_UUID = '00002a26-0000-1000-8000-00805f9b34fb';

/**
 * BleService - Manages Bluetooth Low Energy communication with the irrigation device
 * 
 * CRITICAL DATA FLOW PRINCIPLE:
 * ============================
 * The store is updated ONLY from:
 *   1. READ operations - data actually received from the device
 *   2. NOTIFY callbacks - data pushed from the device
 * 
 * NEVER update the store after WRITE operations!
 * After writing, we must wait for:
 *   - A notification from the device confirming the change, OR
 *   - Re-read the characteristic to get the actual device state
 * 
 * This ensures the app always reflects the TRUE state of the device,
 * not an assumed/optimistic state that might be incorrect.
 */
export class BleService {
    private static instance: BleService;
    private connectedDeviceId: string | null = null;
    private fragmentationManager: BleFragmentationManager;
    private otaSessionActive: boolean = false;
    private otaNotificationsSuspendedForDeviceId: string | null = null;

    // Firmware capability flags (discovered lazily via first access)
    private supportsSoilMoistureConfig: boolean | null = null;
    private supportsIntervalModeConfig: boolean | null = null;

    // Timer for delayed background notification subscriptions
    private deferredNotificationsTimer: ReturnType<typeof setTimeout> | null = null;

    // Buffer for Environmental Data reassembly (3-byte header)
    private envReassembly: {
        seq: number;
        total: number;
        buffer: Uint8Array;
        receivedLen: number;
    } | null = null;

    // Pending history request completion (resolved when full response is received)
    private pendingWateringHistoryRequests: Map<number, { resolve: () => void; reject: (e: Error) => void; timeoutId: ReturnType<typeof setTimeout> }> = new Map();
    private pendingRainHistoryRequests: Map<number, { resolve: () => void; reject: (e: Error) => void; timeoutId: ReturnType<typeof setTimeout> }> = new Map();

    // Env history is paged (fragment_id), not streamed; we wait per-fragment.
    private pendingEnvHistoryFragments: Map<string, { resolve: (r: { header: any; payload: Uint8Array }) => void; reject: (e: Error) => void; timeoutId: ReturnType<typeof setTimeout> }> = new Map();

    private lastWateringRequestedType: number | null = null;
    private lastRainExpectedDataType: number | null = null;

    private pendingResetResolver: {
        resolveCode: (code: number) => void;
        resolveComplete: () => void;
        reject: (e: Error) => void;
        type: number;
    } | null = null;

    // Lock to prevent duplicate connection attempts
    private isConnecting: boolean = false;
    private connectionId: number = 0;  // Monotonically increasing connection ID

    private constructor() {
        this.fragmentationManager = BleFragmentationManager.getInstance();
    }

    // Hard cap on individual BLE operations. Prevents the queued GATT pipeline
    // from getting stuck forever if a platform call hangs.
    private gattOpTimeoutMs: number = 6500;

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`${label} timed out`));
            }, timeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    private isCharacteristicNotFoundError(err: any): boolean {
        const msg =
            typeof err?.message === 'string'
                ? err.message
                : typeof err === 'string'
                    ? err
                    : (() => {
                        try {
                            return JSON.stringify(err);
                        } catch {
                            return String(err);
                        }
                    })();

        const lower = (msg || '').toLowerCase();
        return lower.includes('characteristic not found') || lower.includes('service not found');
    }

    private isWriteTimeoutError(err: any): boolean {
        const msg =
            typeof err?.message === 'string'
                ? err.message
                : typeof err === 'string'
                    ? err
                    : (() => {
                        try {
                            return JSON.stringify(err);
                        } catch {
                            return String(err);
                        }
                    })();

        return (msg || '').toLowerCase().includes('write timeout');
    }

    private isGattCongestionError(err: any): boolean {
        const msg =
            typeof err?.message === 'string'
                ? err.message
                : typeof err === 'string'
                    ? err
                    : (() => {
                        try {
                            return JSON.stringify(err);
                        } catch {
                            return String(err);
                        }
                    })();

        const lower = (msg || '').toLowerCase();
        // Android BLE can report transient congestion/errors as generic failures.
        // In practice these clear up if we serialize operations and retry briefly.
        return (
            lower.includes('write timeout') ||
            lower.includes('timed out') ||
            lower.includes('timeout') ||
            lower.includes('reading characteristic failed') ||
            lower.includes('writing characteristic failed') ||
            lower.includes('status code 201')
        );
    }

    // Serialize all GATT operations (read/write/subscribe) to avoid Android-side
    // GATT congestion when multiple UI screens fire parallel reads.
    private gattQueue: Promise<void> = Promise.resolve();

    // Deduplicate identical in-flight high-level requests (prevents UI effects
    // from spamming the same BLE transaction multiple times).
    private inFlightRequests = new Map<string, Promise<any>>();

    private dedupeInFlight<T>(key: string, factory: () => Promise<T>): Promise<T> {
        const existing = this.inFlightRequests.get(key) as Promise<T> | undefined;
        if (existing) return existing;

        const created = (async () => {
            try {
                return await factory();
            } finally {
                this.inFlightRequests.delete(key);
            }
        })();

        this.inFlightRequests.set(key, created);
        return created;
    }

    private enqueueGattOp<T>(label: string, op: () => Promise<T>): Promise<T> {
        const task = this.gattQueue.then(
            async () => {
                return op();
            },
            async () => {
                // If a previous op failed, keep the queue moving.
                return op();
            }
        );

        // Ensure the queue never gets stuck in a rejected state.
        this.gattQueue = task.then(
            () => undefined,
            () => undefined
        );

        return task;
    }

    private async writeWithRetryInner(
        deviceId: string,
        serviceUuid: string,
        characteristicUuid: string,
        value: DataView,
        attempts: number,
        baseDelayMs: number
    ): Promise<void> {
        let lastErr: any;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                await this.withTimeout(
                    BleClient.write(deviceId, serviceUuid, characteristicUuid, value),
                    this.gattOpTimeoutMs,
                    `BLE write (${characteristicUuid})`
                );
                return;
            } catch (err: any) {
                lastErr = err;
                if (!this.isGattCongestionError(err) || attempt === attempts) {
                    throw err;
                }
                await this.delay(baseDelayMs * attempt);
            }
        }
        throw lastErr;
    }

    private async writeWithoutResponseWithRetryInner(
        deviceId: string,
        serviceUuid: string,
        characteristicUuid: string,
        value: DataView,
        attempts: number,
        baseDelayMs: number
    ): Promise<void> {
        let lastErr: any;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                await this.withTimeout(
                    BleClient.writeWithoutResponse(deviceId, serviceUuid, characteristicUuid, value),
                    this.gattOpTimeoutMs,
                    `BLE writeWithoutResponse (${characteristicUuid})`
                );
                return;
            } catch (err: any) {
                lastErr = err;
                if (!this.isGattCongestionError(err) || attempt === attempts) {
                    throw err;
                }
                await this.delay(baseDelayMs * attempt);
            }
        }
        throw lastErr;
    }

    private async readWithRetryInner(
        deviceId: string,
        serviceUuid: string,
        characteristicUuid: string,
        attempts: number,
        baseDelayMs: number
    ): Promise<DataView> {
        let lastErr: any;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await this.withTimeout(
                    BleClient.read(deviceId, serviceUuid, characteristicUuid),
                    this.gattOpTimeoutMs,
                    `BLE read (${characteristicUuid})`
                );
            } catch (err: any) {
                lastErr = err;
                if (!this.isGattCongestionError(err) || attempt === attempts) {
                    throw err;
                }
                await this.delay(baseDelayMs * attempt);
            }
        }
        throw lastErr;
    }

    private async writeWithRetry(
        serviceUuid: string,
        characteristicUuid: string,
        value: DataView,
        attempts: number = 3,
        baseDelayMs: number = 150
    ): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;
        return this.enqueueGattOp(`write:${characteristicUuid}`, async () => {
            await this.writeWithRetryInner(deviceId, serviceUuid, characteristicUuid, value, attempts, baseDelayMs);
        });
    }

    private async writeWithoutResponseWithRetry(
        serviceUuid: string,
        characteristicUuid: string,
        value: DataView,
        attempts: number = 3,
        baseDelayMs: number = 150
    ): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;
        return this.enqueueGattOp(`writeNoResp:${characteristicUuid}`, async () => {
            await this.writeWithoutResponseWithRetryInner(deviceId, serviceUuid, characteristicUuid, value, attempts, baseDelayMs);
        });
    }

    private async readWithRetry(
        serviceUuid: string,
        characteristicUuid: string,
        attempts: number = 2,
        baseDelayMs: number = 150
    ): Promise<DataView> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;
        return this.enqueueGattOp(`read:${characteristicUuid}`, async () => {
            return this.readWithRetryInner(deviceId, serviceUuid, characteristicUuid, attempts, baseDelayMs);
        });
    }

    private async startNotificationsQueued(
        deviceId: string,
        serviceUuid: string,
        characteristicUuid: string,
        onValue: (value: DataView) => void
    ): Promise<void> {
        await this.enqueueGattOp(`notify:${characteristicUuid}`, async () => {
            await this.withTimeout(
                BleClient.startNotifications(deviceId, serviceUuid, characteristicUuid, onValue),
                this.gattOpTimeoutMs,
                `BLE notify (${characteristicUuid})`
            );
        });
    }

    private async stopNotificationsQueued(
        deviceId: string,
        serviceUuid: string,
        characteristicUuid: string
    ): Promise<void> {
        await this.enqueueGattOp(`stopNotify:${characteristicUuid}`, async () => {
            await this.withTimeout(
                BleClient.stopNotifications(deviceId, serviceUuid, characteristicUuid),
                this.gattOpTimeoutMs,
                `BLE stopNotify (${characteristicUuid})`
            );
        });
    }

    /**
     * Trigger haptic feedback for critical alarms.
     * Uses Capacitor Haptics if available (native platform).
     */
    private async triggerAlarmHaptic(): Promise<void> {
        try {
            // Dynamic import to avoid bundling issues if not installed
            const { Capacitor } = await import('@capacitor/core');
            if (!Capacitor.isNativePlatform()) return;

            const { Haptics, NotificationType } = await import('@capacitor/haptics');
            await Haptics.notification({ type: NotificationType.Error });
            console.log('[BLE] Alarm haptic triggered');
        } catch (e) {
            // Haptics not available or not installed - silent fail
            console.debug('[BLE] Haptics not available:', e);
        }
    }

    private parseUnifiedHeader(data: DataView) {
        return {
            data_type: data.getUint8(0),
            status: data.getUint8(1),
            entry_count: data.getUint16(2, true),
            fragment_index: data.getUint8(4),
            total_fragments: data.getUint8(5),
            fragment_size: data.getUint8(6),
            reserved: data.getUint8(7)
        };
    }

    private makeEnvFragmentKey(dataType: number, fragmentIndex: number) {
        return `${dataType}:${fragmentIndex}`;
    }

    private createPendingVoidRequest(
        map: Map<number, { resolve: () => void; reject: (e: Error) => void; timeoutId: ReturnType<typeof setTimeout> }>,
        key: number,
        timeoutMs: number,
        label: string
    ): Promise<void> {
        // Cancel any in-flight request with same key
        const existing = map.get(key);
        if (existing) {
            clearTimeout(existing.timeoutId);
            existing.reject(new Error(`${label} request superseded`));
            map.delete(key);
        }

        return new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                map.delete(key);
                reject(new Error(`${label} request timed out`));
            }, timeoutMs);
            map.set(key, { resolve: () => { clearTimeout(timeoutId); map.delete(key); resolve(); }, reject: (e) => { clearTimeout(timeoutId); map.delete(key); reject(e); }, timeoutId });
        });
    }

    private resolvePendingVoid(map: Map<number, { resolve: () => void; reject: (e: Error) => void; timeoutId: ReturnType<typeof setTimeout> }>, key: number) {
        const pending = map.get(key);
        if (pending) {
            pending.resolve();
        }
    }

    private rejectPendingVoid(map: Map<number, { resolve: () => void; reject: (e: Error) => void; timeoutId: ReturnType<typeof setTimeout> }>, key: number, error: Error) {
        const pending = map.get(key);
        if (pending) {
            pending.reject(error);
        }
    }

    private async requestEnvHistoryFragment(
        command: number,
        startTime: number,
        endTime: number,
        dataType: number,
        maxRecords: number,
        fragmentId: number,
        timeoutMs: number = 8000
    ): Promise<{ header: any; payload: Uint8Array }> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const key = this.makeEnvFragmentKey(dataType, fragmentId);
        const existing = this.pendingEnvHistoryFragments.get(key);
        if (existing) {
            clearTimeout(existing.timeoutId);
            existing.reject(new Error('Env history fragment request superseded'));
            this.pendingEnvHistoryFragments.delete(key);
        }

        const promise = new Promise<{ header: any; payload: Uint8Array }>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingEnvHistoryFragments.delete(key);
                reject(new Error('Env history fragment request timed out'));
            }, timeoutMs);
            this.pendingEnvHistoryFragments.set(key, { resolve, reject, timeoutId });
        });

        await this.queryEnvHistory(command, startTime, endTime, dataType, maxRecords, fragmentId);
        return promise;
    }

    public static getInstance(): BleService {
        if (!BleService.instance) {
            BleService.instance = new BleService();
        }
        return BleService.instance;
    }

    public async initialize(): Promise<void> {
        try {
            await BleClient.initialize();
            console.log('BLE Initialized');
        } catch (error) {
            console.error('BLE Initialization failed', error);
        }
    }

    public async scan(): Promise<void> {
        try {
            useAppStore.getState().setConnectionState('scanning');

            // Use requestDevice which works on Web (opens picker) and Native
            // We filter by namePrefix because 128-bit UUIDs are often not in the advertisement packet
            const device = await BleClient.requestDevice({
                namePrefix: 'AutoWatering',
                // Web Bluetooth requires listing all services you want to access.
                // Without PACK_SERVICE_UUID here, `getServices()` won't include it on web.
                optionalServices: [SERVICE_UUID, CUSTOM_CONFIG_SERVICE_UUID, PACK_SERVICE_UUID, SMP_SERVICE_UUID, DEVICE_INFO_SERVICE_UUID]
            });

            console.log('Device selected:', device);
            useAppStore.getState().addDiscoveredDevice(device);

            // Auto-connect after selection
            await this.connect(device.deviceId);

        } catch (error) {
            console.error('Scan/Selection failed', error);
            useAppStore.getState().setConnectionState('disconnected');
        }
    }

    public async connect(deviceId: string, force: boolean = false): Promise<void> {
        // Prevent duplicate connection attempts
        if (this.isConnecting) {
            console.warn('[BLE] Connection already in progress, ignoring duplicate connect call');
            return;
        }

        // If already connected to this device, skip (unless force is true)
        if (this.connectedDeviceId === deviceId && !force) {
            console.warn('[BLE] Already connected to this device, ignoring duplicate connect call');
            return;
        }

        // If force reconnect requested and we're already "connected", disconnect first
        if (this.connectedDeviceId === deviceId && force) {
            console.log('[BLE] Force reconnect requested, disconnecting first...');
            try {
                await BleClient.disconnect(deviceId);
            } catch (e) {
                console.warn('[BLE] Disconnect before force reconnect failed:', e);
            }
            this.connectedDeviceId = null;
        }

        this.isConnecting = true;
        this.connectionId++;
        const myConnectionId = this.connectionId;
        console.log(`[BLE] Starting connection ${myConnectionId} to ${deviceId}...`);

        try {
            useAppStore.getState().setConnectionState('connecting');
            console.log(`Connecting to ${deviceId}...`);

            await BleClient.connect(deviceId, (deviceId) => this.onDisconnect(deviceId));

            // Check if this connection was superseded
            if (this.connectionId !== myConnectionId) {
                console.warn(`[BLE] Connection ${myConnectionId} superseded by ${this.connectionId}, aborting`);
                return;
            }

            console.log('Connected!');

            this.connectedDeviceId = deviceId;
            this.otaNotificationsSuspendedForDeviceId = null;
            useAppStore.getState().setConnectionState('connected');
            useAppStore.getState().setConnectedDeviceId(deviceId);

            // Reset per-connection capability cache
            this.supportsSoilMoistureConfig = null;
            this.supportsIntervalModeConfig = null;

            // Request a high-priority BLE connection on Android for faster throughput
            try {
                await BleClient.requestConnectionPriority(
                    deviceId,
                    ConnectionPriority.CONNECTION_PRIORITY_HIGH
                );
                console.log('[BLE] Connection priority set to HIGH');
            } catch (priorityError: any) {
                console.log('[BLE] Connection priority request skipped:', priorityError?.message || priorityError);
            }

            // Attempt to create bond for encrypted characteristics (Android only, iOS auto-bonds)
            try {
                console.log('[BLE] Attempting to create bond for encrypted writes...');
                await BleClient.createBond(deviceId);
                console.log('[BLE] Bond created successfully');
            } catch (bondError: any) {
                // Bond might already exist or not be supported (Web)
                console.log('[BLE] Bond creation skipped or already bonded:', bondError?.message || bondError);
            }

            // Wait after bonding
            await new Promise(resolve => setTimeout(resolve, 500));

            // Attempt to read a characteristic first to trigger pairing/bonding if needed
            // System Status (Char 3) is a good candidate as it's Read/Notify
            try {
                console.log('Attempting to read System Status to trigger pairing...');
                const statusData = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.SYSTEM_STATUS, 2, 200);
                const payload = new Uint8Array(
                    statusData.buffer.slice(statusData.byteOffset, statusData.byteOffset + statusData.byteLength)
                );
                this.dispatchToStore(CHAR_UUIDS.SYSTEM_STATUS, payload);
                console.log('Initial read success, pairing likely established.');
            } catch (readError: any) {
                console.warn('Initial read failed:', readError);

                // If authentication failed, it might be prompting for pairing now.
                // Let's wait a bit and try again.
                if (readError.message && (readError.message.includes('Authentication') || readError.message.includes('Security'))) {
                    console.log('Authentication failed. Waiting 15s for pairing to complete... (Please accept pairing request if visible)');
                    await new Promise(resolve => setTimeout(resolve, 15000));

                    // Check if we got disconnected during the wait
                    if (!this.connectedDeviceId) {
                        console.log('Device disconnected during pairing wait. Attempting to reconnect...');
                        try {
                            await BleClient.connect(deviceId, (id) => this.onDisconnect(id));
                            this.connectedDeviceId = deviceId;
                            useAppStore.getState().setConnectionState('connected');
                            useAppStore.getState().setConnectedDeviceId(deviceId);
                            console.log('Reconnected successfully.');
                        } catch (reconnectError) {
                            console.error('Failed to reconnect:', reconnectError);
                            // If reconnect fails, we can't proceed with retry
                            throw reconnectError;
                        }
                    }

                    try {
                        console.log('Retrying read System Status...');
                        await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.SYSTEM_STATUS, 2, 200);
                        console.log('Retry read success!');
                    } catch (retryError) {
                        console.error('Retry read failed too.', retryError);
                        // We continue anyway, hoping notifications might work or user accepted pairing just now
                    }
                }
            }

            // ========================================
            // PHASE 0: Read Onboarding Status FIRST (for fast routing decision)
            // This lets the UI know if we should go to dashboard or onboarding
            // ========================================
            console.log('[BLE] Phase 0: Reading Onboarding Status (fast routing)...');
            useAppStore.getState().setSyncProgress(5, 'loadingScreen.syncCheckingSetup');
            try {
                const onboarding = await this.readOnboardingStatus();
                console.log('[BLE] Got Onboarding Data (fast):', onboarding);
            } catch (onboardingErr) {
                console.warn('[BLE] Fast onboarding read failed:', onboardingErr);
                // Continue anyway - we'll retry in Phase 2
            }

            // Optional Bulk Sync Snapshot (newer firmware only)
            const bulkSnapshot = await this.readBulkSyncSnapshot();
            const interReadDelay = bulkSnapshot ? 80 : 200;
            const channelReadDelay = bulkSnapshot ? 50 : 100;
            const shouldReadCurrentTask = !bulkSnapshot || bulkSnapshot.system_mode !== 0;
            const shouldReadValveControl = !bulkSnapshot || bulkSnapshot.valve_states !== 0;
            const shouldReadRainData = !bulkSnapshot || bulkSnapshot.rain_valid;
            const shouldReadRtcConfig = !bulkSnapshot || !bulkSnapshot.rtc_valid;

            // Initial Data Sync
            console.log('[BLE] Starting Initial Data Sync Sequence...');
            try {
                // ========================================
                // PHASE 1: Essential Dashboard Data (fast)
                // Show UI as soon as this completes
                // ========================================
                console.log('[BLE] Phase 1: Essential Dashboard Data...');
                useAppStore.getState().setSyncProgress(10, 'loadingScreen.syncReadingSensors');

                // Environmental Data - for temperature/humidity display
                if (!bulkSnapshot?.env_valid) {
                    console.log('[BLE] Reading Environmental Data...');
                    const env = await this.readEnvironmentalData();
                    console.log('[BLE] Got Env Data:', env);
                    await this.delay(interReadDelay);
                } else {
                    console.log('[BLE] Using Bulk Sync Snapshot for Environmental Data');
                }
                useAppStore.getState().setSyncProgress(30, 'loadingScreen.syncReadingRain');

                // Rain Data - for rainfall display
                if (shouldReadRainData) {
                    console.log('[BLE] Reading Rain Data...');
                    const rain = await this.readRainData();
                    console.log('[BLE] Got Rain Data:', rain);
                    await this.delay(interReadDelay);
                }
                useAppStore.getState().setSyncProgress(50, 'loadingScreen.syncReadingStatus');

                // Current Task - for watering status on dashboard
                if (shouldReadCurrentTask) {
                    console.log('[BLE] Reading Current Task...');
                    const task = await this.readCurrentTask();
                    console.log('[BLE] Got Task Data:', task);
                    await this.delay(interReadDelay);
                }
                useAppStore.getState().setSyncProgress(65, 'loadingScreen.syncReadingConfig');

                // System Config - need num_channels for zones
                console.log('[BLE] Reading System Config...');
                const sysConfig = await this.readSystemConfig();
                console.log('[BLE] Got System Config:', sysConfig);
                await this.delay(interReadDelay);

                // Global Soil Moisture Config - for dashboard moisture display
                useAppStore.getState().setSyncProgress(80, 'loadingScreen.syncReadingMoisture');
                try {
                    console.log('[BLE] Reading Global Soil Moisture Config...');
                    await this.readSoilMoistureConfig(0xFF);
                    await this.delay(interReadDelay);
                } catch (err) {
                    console.warn('[BLE] Global Soil Moisture Config read failed:', err);
                }

                // ========================================
                // PHASE 1 COMPLETE - SHOW UI NOW
                // ========================================
                useAppStore.getState().setSyncProgress(100, 'loadingScreen.syncReady');
                console.log('[BLE] Phase 1 Complete - Dashboard ready!');
                useAppStore.getState().setInitialSyncComplete(true);

                // ========================================
                // PHASE 2: Background Data (deferred)
                // Loads while user sees the dashboard
                // ========================================
                console.log('[BLE] Phase 2: Loading remaining data in background...');

                // Setup notifications for real-time updates (deferred to not block UI)
                await this.setupNotificationsEssential(deviceId);

                // Global Auto Calc Status - for next watering time
                try {
                    await this.readAutoCalcStatusGlobal();
                    await this.delay(interReadDelay);
                } catch (err) {
                    console.warn('[BLE] Auto Calc Status read failed:', err);
                }

                // Valve Control
                if (shouldReadValveControl) {
                    console.log('[BLE] Reading Valve Control...');
                    const valve = await this.readValveControl();
                    console.log('[BLE] Got Valve Data:', valve);
                    await this.delay(interReadDelay);
                }

                // Timezone Config - read BEFORE RTC to know DST settings
                console.log('[BLE] Reading Timezone Config (for DST settings)...');
                try {
                    const tzConfig = await this.readTimezoneConfig();
                    console.log('[BLE] Got Timezone Config:', tzConfig);
                    await this.delay(interReadDelay);
                } catch (tzErr) {
                    console.warn('[BLE] Timezone Config read failed:', tzErr);
                }

                // RTC Config
                if (shouldReadRtcConfig) {
                    console.log('[BLE] Reading RTC Config...');
                    const rtc = await this.readRtcConfig();
                    console.log('[BLE] Got RTC Data:', rtc);
                    await this.checkTimeDrift(rtc);
                    await this.delay(interReadDelay);
                }

                // Rain Config
                console.log('[BLE] Reading Rain Config...');
                const rainCfg = await this.readRainConfig();
                console.log('[BLE] Got Rain Config:', rainCfg);
                await this.delay(interReadDelay);

                // Read all channel configurations
                console.log('[BLE] Reading Channel Configs (0-7)...');
                const zones: any[] = [];
                for (let i = 0; i < sysConfig.num_channels; i++) {
                    try {
                        const channelConfig = await this.readChannelConfig(i);
                        zones.push(channelConfig);
                        console.log(`[BLE] Channel ${i}: ${channelConfig.name || '(unnamed)'}`);
                        await this.delay(channelReadDelay);
                    } catch (chErr) {
                        console.warn(`[BLE] Failed to read channel ${i}:`, chErr);
                    }
                }
                useAppStore.getState().setZones(zones);

                // Hydraulic Status
                try {
                    console.log('[BLE] Reading Hydraulic Status (active channel)...');
                    await this.readHydraulicStatus(0xFF);
                    await this.delay(interReadDelay);
                } catch (hydErr) {
                    console.warn('[BLE] Hydraulic Status read skipped/failed (likely unsupported firmware):', hydErr);
                }

                // Soil Moisture Configuration
                // Connect-time only reads the GLOBAL override (fast + sufficient for dashboards).
                // Per-channel overrides can be fetched on-demand if/when needed.
                try {
                    console.log('[BLE] Reading Soil Moisture Config (global)...');
                    await this.readSoilMoistureConfig(0xFF);
                    await this.delay(interReadDelay);
                } catch (soilErr) {
                    console.warn('[BLE] Soil Moisture Config read skipped/failed (likely unsupported firmware):', soilErr);
                }

                // Pack/Custom Plants: Skip sync at connect time to avoid BLE congestion.
                // With 200+ plants, the paginated reads can timeout and interfere with
                // deferred notification subscriptions. Sync happens on-demand when user
                // opens the Packs settings page.

                console.log('[BLE] Phase 2 Complete - All data synced!');

                // Mark connection as no longer in progress
                this.isConnecting = false;
            } catch (syncError) {
                console.error('[BLE] Initial data sync failed:', syncError);
                // Phase 1 failed - connection is unusable, disconnect and throw
                try {
                    if (this.connectedDeviceId) {
                        await BleClient.disconnect(this.connectedDeviceId);
                    }
                } catch (disconnectErr) {
                    console.warn('[BLE] Disconnect after sync failure failed:', disconnectErr);
                }
                this.connectedDeviceId = null;
                useAppStore.getState().setConnectionState('disconnected');
                useAppStore.getState().setConnectedDeviceId(null);
                useAppStore.getState().setInitialSyncComplete(false);
                throw syncError;
            }

        } catch (error) {
            console.error('Connection failed', error);
            this.connectedDeviceId = null;
            useAppStore.getState().setConnectionState('disconnected');
            useAppStore.getState().setConnectedDeviceId(null);
            throw error;
        } finally {
            // Always reset the connecting flag
            this.isConnecting = false;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.connectedDeviceId) {
            await BleClient.disconnect(this.connectedDeviceId);
            this.connectedDeviceId = null;
            this.supportsSoilMoistureConfig = null;
            this.supportsIntervalModeConfig = null;
            this.otaSessionActive = false;
            this.otaNotificationsSuspendedForDeviceId = null;
            if (this.deferredNotificationsTimer) {
                clearTimeout(this.deferredNotificationsTimer);
                this.deferredNotificationsTimer = null;
            }
            this.gattQueue = Promise.resolve();
            this.inFlightRequests.clear();
            useAppStore.getState().resetStore();
        }
    }

    private onDisconnect(deviceId: string) {
        console.log(`Disconnected from ${deviceId}`);
        this.connectedDeviceId = null;
        this.supportsSoilMoistureConfig = null;
        this.supportsIntervalModeConfig = null;
        this.otaSessionActive = false;
        this.otaNotificationsSuspendedForDeviceId = null;
        if (this.deferredNotificationsTimer) {
            clearTimeout(this.deferredNotificationsTimer);
            this.deferredNotificationsTimer = null;
        }
        this.gattQueue = Promise.resolve();
        this.inFlightRequests.clear();
        useAppStore.getState().resetStore();
    }

    /**
     * Setup only the essential notifications needed for dashboard functionality.
     * Other notifications are set up in the background via setupNotificationsDeferred().
     */
    private async setupNotificationsEssential(deviceId: string) {
        console.log('[BLE] Setting up essential notifications (fast)...');
        const subscribeDelay = 50; // Reduced delay for faster setup
        try {
            await this.enqueueGattOp('notifications:essential', async () => {
                // 1. System Status - for connection/mode monitoring
                await BleClient.startNotifications(deviceId, SERVICE_UUID, CHAR_UUIDS.SYSTEM_STATUS,
                    (value) => this.handleNotification(CHAR_UUIDS.SYSTEM_STATUS, value));
                await this.delay(subscribeDelay);

                // 2. Current Task - for watering status
                await BleClient.startNotifications(deviceId, SERVICE_UUID, CHAR_UUIDS.CURRENT_TASK,
                    (value) => this.handleNotification(CHAR_UUIDS.CURRENT_TASK, value));
                await this.delay(subscribeDelay);

                // 3. Valve Control - for valve state updates
                await BleClient.startNotifications(deviceId, SERVICE_UUID, CHAR_UUIDS.VALVE_CONTROL,
                    (value) => this.handleNotification(CHAR_UUIDS.VALVE_CONTROL, value));
                await this.delay(subscribeDelay);

                // 4. Environmental Data - for temp/humidity updates
                await BleClient.startNotifications(deviceId, SERVICE_UUID, CHAR_UUIDS.ENV_DATA,
                    (value) => this.handleNotification(CHAR_UUIDS.ENV_DATA, value));
            });
            
            console.log('[BLE] Essential notifications ready');

            // Setup remaining notifications in background (delayed) to reduce contention with
            // early onboarding writes (RTC/system config/zone commits).
            if (this.otaSessionActive) {
                console.log('[BLE] OTA session active, skipping deferred notifications scheduling');
                return;
            }
            if (this.deferredNotificationsTimer) {
                clearTimeout(this.deferredNotificationsTimer);
            }
            this.deferredNotificationsTimer = setTimeout(() => {
                if (this.otaSessionActive) return;
                if (!this.connectedDeviceId || this.connectedDeviceId !== deviceId) return;
                this.setupNotificationsDeferred(deviceId).catch(err =>
                    console.warn('[BLE] Deferred notifications setup failed:', err));
            }, 2500);

        } catch (error) {
            console.error('[BLE] Essential notifications setup failed:', error);
            throw error;
        }
    }

    /**
     * Setup remaining notifications in background. Called after essential notifications.
     */
    private async setupNotificationsDeferred(deviceId: string) {
        if (this.otaSessionActive) {
            console.log('[BLE] OTA session active, deferred notifications setup skipped');
            return;
        }
        console.log('[BLE] Setting up deferred notifications (background)...');
        const subscribeDelay = 80;
        await this.enqueueGattOp('notifications:deferred', async () => {
            if (this.otaSessionActive) {
                console.log('[BLE] OTA session active, stopping deferred notifications setup');
                return;
            }
            const trySubscribe = async (
                label: string,
                serviceUuid: string,
                characteristicUuid: string,
                afterDelayMs: number = subscribeDelay
            ) => {
                try {
                    await BleClient.startNotifications(
                        deviceId,
                        serviceUuid,
                        characteristicUuid,
                        (value) => this.handleNotification(characteristicUuid, value)
                    );
                    if (afterDelayMs > 0) {
                        await this.delay(afterDelayMs);
                    }
                } catch (err) {
                    console.warn(`[BLE] Deferred subscribe failed: ${label}`, err);
                }
            };

            // Keep going even if some characteristics are missing in older firmware.
            await trySubscribe('Calibration', SERVICE_UUID, CHAR_UUIDS.CALIBRATION);
            await trySubscribe('Reset Control', SERVICE_UUID, CHAR_UUIDS.RESET_CONTROL);
            await trySubscribe('History Management', SERVICE_UUID, CHAR_UUIDS.HISTORY_MGMT);
            await trySubscribe('Onboarding Status', SERVICE_UUID, CHAR_UUIDS.ONBOARDING_STATUS);
            await trySubscribe('Rain Sensor Data', SERVICE_UUID, CHAR_UUIDS.RAIN_SENSOR_DATA);
            await trySubscribe('Flow Sensor', SERVICE_UUID, CHAR_UUIDS.FLOW_SENSOR);
            await trySubscribe('Task Queue', SERVICE_UUID, CHAR_UUIDS.TASK_QUEUE);
            await trySubscribe('Statistics', SERVICE_UUID, CHAR_UUIDS.STATISTICS);
            await trySubscribe('Alarm Status', SERVICE_UUID, CHAR_UUIDS.ALARM_STATUS);
            await trySubscribe('Diagnostics', SERVICE_UUID, CHAR_UUIDS.DIAGNOSTICS);
            await trySubscribe('Hydraulic Status', SERVICE_UUID, CHAR_UUIDS.HYDRAULIC_STATUS);
            await trySubscribe('RTC Config', SERVICE_UUID, CHAR_UUIDS.RTC_CONFIG);
            await trySubscribe('Channel Config', SERVICE_UUID, CHAR_UUIDS.CHANNEL_CONFIG);
            await trySubscribe('Schedule Config', SERVICE_UUID, CHAR_UUIDS.SCHEDULE_CONFIG);
            await trySubscribe('System Config', SERVICE_UUID, CHAR_UUIDS.SYSTEM_CONFIG);
            await trySubscribe('Growing Environment', SERVICE_UUID, CHAR_UUIDS.GROWING_ENV);
            await trySubscribe('Timezone Config', SERVICE_UUID, CHAR_UUIDS.TIMEZONE_CONFIG);
            await trySubscribe('Rain Sensor Config', SERVICE_UUID, CHAR_UUIDS.RAIN_SENSOR_CONFIG);
            await trySubscribe('Rain Integration Status', SERVICE_UUID, CHAR_UUIDS.RAIN_INTEGRATION);

            // Soil Moisture Configuration is part of the Custom Configuration Service.
            await trySubscribe('Soil Moisture Config (Custom Service)', CUSTOM_CONFIG_SERVICE_UUID, CHAR_UUIDS.SOIL_MOISTURE_CONFIG);

            await trySubscribe('Auto Calc Status', SERVICE_UUID, CHAR_UUIDS.AUTO_CALC_STATUS, 0);
        });

        console.log('[BLE] Deferred notifications setup finished');
    }

    private getOtaSuspendTargets(): Array<{ label: string; serviceUuid: string; characteristicUuid: string }> {
        return [
            { label: 'System Status', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.SYSTEM_STATUS },
            { label: 'Current Task', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.CURRENT_TASK },
            { label: 'Valve Control', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.VALVE_CONTROL },
            { label: 'Environmental Data', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.ENV_DATA },
            { label: 'Calibration', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.CALIBRATION },
            { label: 'Reset Control', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.RESET_CONTROL },
            { label: 'History Management', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.HISTORY_MGMT },
            { label: 'Onboarding Status', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.ONBOARDING_STATUS },
            { label: 'Rain Sensor Data', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.RAIN_SENSOR_DATA },
            { label: 'Flow Sensor', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.FLOW_SENSOR },
            { label: 'Task Queue', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.TASK_QUEUE },
            { label: 'Statistics', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.STATISTICS },
            { label: 'Alarm Status', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.ALARM_STATUS },
            { label: 'Diagnostics', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.DIAGNOSTICS },
            { label: 'Hydraulic Status', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.HYDRAULIC_STATUS },
            { label: 'RTC Config', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.RTC_CONFIG },
            { label: 'Channel Config', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.CHANNEL_CONFIG },
            { label: 'Schedule Config', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.SCHEDULE_CONFIG },
            { label: 'System Config', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.SYSTEM_CONFIG },
            { label: 'Growing Environment', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.GROWING_ENV },
            { label: 'Timezone Config', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.TIMEZONE_CONFIG },
            { label: 'Rain Sensor Config', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.RAIN_SENSOR_CONFIG },
            { label: 'Rain Integration', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.RAIN_INTEGRATION },
            { label: 'Soil Moisture Config', serviceUuid: CUSTOM_CONFIG_SERVICE_UUID, characteristicUuid: CHAR_UUIDS.SOIL_MOISTURE_CONFIG },
            { label: 'Auto Calc Status', serviceUuid: SERVICE_UUID, characteristicUuid: CHAR_UUIDS.AUTO_CALC_STATUS },
            { label: 'SMP OTA', serviceUuid: SMP_SERVICE_UUID, characteristicUuid: SMP_CHARACTERISTIC_UUID }
        ];
    }

    private async suspendNotificationsForOta(deviceId: string): Promise<void> {
        const targets = this.getOtaSuspendTargets();
        await this.enqueueGattOp('ota:suspend-notifications', async () => {
            for (const target of targets) {
                try {
                    await this.withTimeout(
                        BleClient.stopNotifications(deviceId, target.serviceUuid, target.characteristicUuid),
                        2500,
                        `BLE stopNotify (${target.characteristicUuid})`
                    );
                } catch {
                    // Not subscribed or characteristic unavailable on this firmware.
                }
            }
        });
        this.otaNotificationsSuspendedForDeviceId = deviceId;
    }

    private async restoreNotificationsAfterOta(deviceId: string): Promise<void> {
        if (!this.connectedDeviceId || this.connectedDeviceId !== deviceId) return;
        try {
            await this.setupNotificationsEssential(deviceId);
        } catch (error) {
            console.warn('[BLE] Failed to restore notifications after OTA:', error);
        }
    }

    public async beginOtaSession(): Promise<void> {
        this.otaSessionActive = true;
        if (this.deferredNotificationsTimer) {
            clearTimeout(this.deferredNotificationsTimer);
            this.deferredNotificationsTimer = null;
        }

        // Wait for queued BLE operations (including deferred subscriptions) to drain.
        await this.enqueueGattOp('ota:wait-idle', async () => undefined);

        const deviceId = this.connectedDeviceId;
        if (!deviceId) return;
        await this.suspendNotificationsForOta(deviceId);
    }

    public async endOtaSession(): Promise<void> {
        this.otaSessionActive = false;
        const suspendedForDeviceId = this.otaNotificationsSuspendedForDeviceId;
        this.otaNotificationsSuspendedForDeviceId = null;
        if (!suspendedForDeviceId) return;
        await this.restoreNotificationsAfterOta(suspendedForDeviceId);
    }

    private async setupNotifications(deviceId: string) {
        console.log('[BLE] Setting up notifications...');
        try {
            // 1. System Status (Not Fragmented)
            console.log('[BLE] Subscribing to System Status...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.SYSTEM_STATUS,
                (value) => this.handleNotification(CHAR_UUIDS.SYSTEM_STATUS, value)
            );
            console.log('[BLE] System Status notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 2. Valve Control (Not Fragmented)
            console.log('[BLE] Subscribing to Valve Control...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.VALVE_CONTROL,
                (value) => this.handleNotification(CHAR_UUIDS.VALVE_CONTROL, value)
            );
            console.log('[BLE] Valve Control notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 3. Calibration (Not Fragmented)
            console.log('[BLE] Subscribing to Calibration...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.CALIBRATION,
                (value) => this.handleNotification(CHAR_UUIDS.CALIBRATION, value)
            );
            console.log('[BLE] Calibration notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 4. Reset Control (Not Fragmented)
            console.log('[BLE] Subscribing to Reset Control...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.RESET_CONTROL,
                (value) => this.handleNotification(CHAR_UUIDS.RESET_CONTROL, value)
            );
            console.log('[BLE] Reset Control notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 5. Current Task Status (Not Fragmented)
            console.log('[BLE] Subscribing to Current Task...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.CURRENT_TASK,
                (value) => this.handleNotification(CHAR_UUIDS.CURRENT_TASK, value)
            );
            console.log('[BLE] Current Task notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 6. History Management (Fragmented)
            console.log('[BLE] Subscribing to History Management...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.HISTORY_MGMT,
                (value) => this.handleNotification(CHAR_UUIDS.HISTORY_MGMT, value)
            );
            console.log('[BLE] History notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 7. Onboarding Status (Fragmented)
            console.log('[BLE] Subscribing to Onboarding Status...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.ONBOARDING_STATUS,
                (value) => this.handleNotification(CHAR_UUIDS.ONBOARDING_STATUS, value)
            );
            console.log('[BLE] Onboarding Status notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 8. Environmental Data (Custom Fragmentation)
            console.log('[BLE] Subscribing to Environmental Data...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.ENV_DATA,
                (value) => this.handleNotification(CHAR_UUIDS.ENV_DATA, value)
            );
            console.log('[BLE] Environmental Data notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 9. Rain Sensor Data (Not Fragmented)
            console.log('[BLE] Subscribing to Rain Sensor Data...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.RAIN_SENSOR_DATA,
                (value) => this.handleNotification(CHAR_UUIDS.RAIN_SENSOR_DATA, value)
            );
            console.log('[BLE] Rain Sensor Data notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 10. Flow Sensor (Not Fragmented - 6 bytes)
            console.log('[BLE] Subscribing to Flow Sensor...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.FLOW_SENSOR,
                (value) => this.handleNotification(CHAR_UUIDS.FLOW_SENSOR, value)
            );
            console.log('[BLE] Flow Sensor notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 11. Task Queue (Not Fragmented - 9 bytes)
            console.log('[BLE] Subscribing to Task Queue...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.TASK_QUEUE,
                (value) => this.handleNotification(CHAR_UUIDS.TASK_QUEUE, value)
            );
            console.log('[BLE] Task Queue notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 12. Statistics (Not Fragmented - 17 bytes)
            console.log('[BLE] Subscribing to Statistics...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.STATISTICS,
                (value) => this.handleNotification(CHAR_UUIDS.STATISTICS, value)
            );
            console.log('[BLE] Statistics notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 13. Alarm Status (Not Fragmented - 7 bytes)
            console.log('[BLE] Subscribing to Alarm Status...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.ALARM_STATUS,
                (value) => this.handleNotification(CHAR_UUIDS.ALARM_STATUS, value)
            );
            console.log('[BLE] Alarm Status notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 14. Diagnostics (Not Fragmented - 12 bytes)
            console.log('[BLE] Subscribing to Diagnostics...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.DIAGNOSTICS,
                (value) => this.handleNotification(CHAR_UUIDS.DIAGNOSTICS, value)
            );
            console.log('[BLE] Diagnostics notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 14b. Hydraulic Status (Not Fragmented - 48 bytes)
            console.log('[BLE] Subscribing to Hydraulic Status...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.HYDRAULIC_STATUS,
                (value) => this.handleNotification(CHAR_UUIDS.HYDRAULIC_STATUS, value)
            );
            console.log('[BLE] Hydraulic Status notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 15. RTC Config (Not Fragmented - confirmation notify on write + CCC enable)
            console.log('[BLE] Subscribing to RTC Config...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.RTC_CONFIG,
                (value) => this.handleNotification(CHAR_UUIDS.RTC_CONFIG, value)
            );
            console.log('[BLE] RTC Config notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 16. Channel Configuration (Full struct notify after validated writes)
            console.log('[BLE] Subscribing to Channel Config...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.CHANNEL_CONFIG,
                (value) => this.handleNotification(CHAR_UUIDS.CHANNEL_CONFIG, value)
            );
            console.log('[BLE] Channel Config notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 17. Schedule Configuration (Notify on successful commits)
            console.log('[BLE] Subscribing to Schedule Config...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.SCHEDULE_CONFIG,
                (value) => this.handleNotification(CHAR_UUIDS.SCHEDULE_CONFIG, value)
            );
            console.log('[BLE] Schedule Config notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 18. System Configuration (Notify confirms validated writes)
            console.log('[BLE] Subscribing to System Config...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.SYSTEM_CONFIG,
                (value) => this.handleNotification(CHAR_UUIDS.SYSTEM_CONFIG, value)
            );
            console.log('[BLE] System Config notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 19. Growing Environment (Notify after full/fragmented writes)
            console.log('[BLE] Subscribing to Growing Environment...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.GROWING_ENV,
                (value) => this.handleNotification(CHAR_UUIDS.GROWING_ENV, value)
            );
            console.log('[BLE] Growing Environment notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 20. Timezone Configuration (Notify on CCC enable and writes)
            console.log('[BLE] Subscribing to Timezone Config...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.TIMEZONE_CONFIG,
                (value) => this.handleNotification(CHAR_UUIDS.TIMEZONE_CONFIG, value)
            );
            console.log('[BLE] Timezone Config notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 21. Rain Sensor Config (Notify on writes and internal updates)
            console.log('[BLE] Subscribing to Rain Sensor Config...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.RAIN_SENSOR_CONFIG,
                (value) => this.handleNotification(CHAR_UUIDS.RAIN_SENSOR_CONFIG, value)
            );
            console.log('[BLE] Rain Sensor Config notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 22. Rain Integration Status (Notify when integration changes)
            console.log('[BLE] Subscribing to Rain Integration Status...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.RAIN_INTEGRATION,
                (value) => this.handleNotification(CHAR_UUIDS.RAIN_INTEGRATION, value)
            );
            console.log('[BLE] Rain Integration notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 23. Compensation Status (Channel selector + notify)
            console.log('[BLE] Subscribing to Compensation Status...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.COMPENSATION_STATUS,
                (value) => this.handleNotification(CHAR_UUIDS.COMPENSATION_STATUS, value)
            );
            console.log('[BLE] Compensation Status notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 24. Auto Calc Status (Unified header notifications, periodic every 30min while enabled)
            console.log('[BLE] Subscribing to Auto Calc Status...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.AUTO_CALC_STATUS,
                (value) => this.handleNotification(CHAR_UUIDS.AUTO_CALC_STATUS, value)
            );
            console.log('[BLE] Auto Calc Status notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 25. Environmental History (Unified header, >=50ms command spacing, MTU-aware fragments)
            console.log('[BLE] Subscribing to Environmental History...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.ENV_HISTORY,
                (value) => this.handleNotification(CHAR_UUIDS.ENV_HISTORY, value)
            );
            console.log('[BLE] Environmental History notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 26. Rain History Control (Unified header, fast fragment streaming)
            console.log('[BLE] Subscribing to Rain History...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.RAIN_HISTORY,
                (value) => this.handleNotification(CHAR_UUIDS.RAIN_HISTORY, value)
            );
            console.log('[BLE] Rain History notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 27. Channel Compensation Config (Per-channel rain/temp compensation settings, 44 bytes)
            // NOTE: This characteristic may not exist in all firmware versions (not in spec v26)
            try {
                console.log('[BLE] Subscribing to Channel Compensation Config...');
                await BleClient.startNotifications(
                    deviceId,
                    SERVICE_UUID,
                    CHAR_UUIDS.CHANNEL_COMP_CONFIG,
                    (value) => this.handleNotification(CHAR_UUIDS.CHANNEL_COMP_CONFIG, value)
                );
                console.log('[BLE] Channel Compensation Config notifications enabled');
            } catch (compConfigError) {
                console.warn('[BLE] Channel Compensation Config characteristic not available (may not be implemented in firmware):', compConfigError);
            }

            // Custom Config Service: Soil Moisture Configuration (8 bytes)
            // NOTE: This characteristic may not exist in older firmware versions.
            try {
                console.log('[BLE] Subscribing to Soil Moisture Config (Custom Service)...');
                await BleClient.startNotifications(
                    deviceId,
                    CUSTOM_CONFIG_SERVICE_UUID,
                    CHAR_UUIDS.SOIL_MOISTURE_CONFIG,
                    (value) => this.handleNotification(CHAR_UUIDS.SOIL_MOISTURE_CONFIG, value)
                );
                console.log('[BLE] Soil Moisture Config notifications enabled');
            } catch (soilCfgError) {
                console.warn('[BLE] Soil Moisture Config characteristic not available (may not be implemented in firmware):', soilCfgError);
            }

        } catch (error) {
            console.error('[BLE] Error setting up notifications:', error);
            throw error; // Re-throw to trigger disconnect in connect()
        }
    }

    private handleNotification(characteristicUuid: string, value: DataView) {
        // Special handling for Environmental Data (Custom 3-byte header)
        if (characteristicUuid === CHAR_UUIDS.ENV_DATA) {
            this.handleEnvNotification(value);
            return;
        }

        // Environmental History is paged (fragment_id) and should NOT be reassembled across notifications.
        // Each notify contains one unified header + payload slice.
        if (characteristicUuid === CHAR_UUIDS.ENV_HISTORY) {
            if (value.byteLength < 8) return;
            const header = this.parseUnifiedHeader(value);
            const availablePayload = Math.max(0, value.byteLength - 8);
            const payloadLen = Math.min(header.fragment_size || availablePayload, availablePayload);
            const payloadStart = value.byteOffset + 8;
            const payload = new Uint8Array(value.buffer.slice(payloadStart, payloadStart + payloadLen));

            const key = this.makeEnvFragmentKey(header.data_type, header.fragment_index);
            const pending = this.pendingEnvHistoryFragments.get(key);
            if (pending) {
                clearTimeout(pending.timeoutId);
                this.pendingEnvHistoryFragments.delete(key);
                pending.resolve({ header, payload });
                return;
            }

            // Fallback: dispatch single fragment to store
            this.dispatchToStore(characteristicUuid, payload, header);
            return;
        }

        // List of characteristics that use the unified 8-byte header fragmentation protocol.
        // These must be reassembled client-side (Android/iOS BLE callbacks deliver fragments as-is).
        const fragmentedCharacteristics = [
            CHAR_UUIDS.HISTORY_MGMT,
            CHAR_UUIDS.RAIN_HISTORY,
            CHAR_UUIDS.ONBOARDING_STATUS,
            CHAR_UUIDS.AUTO_CALC_STATUS
        ];

        if (fragmentedCharacteristics.includes(characteristicUuid)) {
            // Pass to fragmentation manager
            const result = this.fragmentationManager.handleFragmentedNotification(characteristicUuid, value);
            if (result.complete && result.payload) {
                this.dispatchToStore(characteristicUuid, result.payload, result.header);
            }
        } else {
            // Direct dispatch - Web Bluetooth already assembled the data
            // Use slice to correctly handle byteOffset
            const payload = new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
            this.dispatchToStore(characteristicUuid, payload);
        }
    }

    /**
     * Dispatches received BLE data to the store.
     * This is called ONLY from:
     *   - handleNotification() - for notification callbacks
     *   - read*() methods - for data read from device
     * 
     * NEVER call this with data that was just written - the store should
     * reflect the actual device state, not assumed state after writes.
     */
    private dispatchToStore(uuid: string, data: Uint8Array, header?: any) {
        const store = useAppStore.getState();
        // CRITICAL: Use byteOffset and byteLength to handle sliced Uint8Arrays correctly
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        switch (uuid) {
            case CHAR_UUIDS.SYSTEM_STATUS:
                // System Status is 1 byte
                store.updateSystemStatus({ state: view.getUint8(0) });
                break;

            case CHAR_UUIDS.VALVE_CONTROL:
                const valveData: ValveControlData = {
                    channel_id: view.getUint8(0),
                    task_type: view.getUint8(1),
                    value: view.getUint16(2, true)
                };
                store.updateValveStatus(valveData.channel_id, valveData);
                break;

            case CHAR_UUIDS.CALIBRATION:
                const calData: CalibrationData = {
                    action: view.getUint8(0),
                    pulses: view.getUint32(1, true),
                    volume_ml: view.getUint32(5, true),
                    pulses_per_liter: view.getUint32(9, true)
                };
                store.setCalibrationData(calData);
                break;

            case CHAR_UUIDS.AUTO_CALC_STATUS:
                // Auto Calc Status is 64 bytes (READ) or 72 bytes (8B header + 64B NOTIFY)
                console.log('[DEBUG BLE] AUTO_CALC_STATUS notification received, byteLength:', view.byteLength);
                let autoCalcView = view;
                const AUTO_CALC_HEADER_LEN = 8;
                const AUTO_CALC_PAYLOAD_LEN = 64;

                if (view.byteLength === AUTO_CALC_HEADER_LEN + AUTO_CALC_PAYLOAD_LEN) {
                    // Strip unified header for NOTIFY frames
                    autoCalcView = new DataView(
                        data.buffer,
                        data.byteOffset + AUTO_CALC_HEADER_LEN,
                        AUTO_CALC_PAYLOAD_LEN
                    );
                } else if (view.byteLength < AUTO_CALC_PAYLOAD_LEN) {
                    console.warn('[BLE] AUTO_CALC_STATUS packet too short:', view.byteLength);
                    break;
                }

                const autoCalc = this.parseAutoCalcStatus(autoCalcView);
                store.setAutoCalcData(autoCalc.channel_id, autoCalc);
                break;

            case CHAR_UUIDS.RESET_CONTROL:
                const resetData: ResetControlData = {
                    reset_type: view.getUint8(0),
                    channel_id: view.getUint8(1),
                    confirmation_code: view.getUint32(2, true),
                    status: view.getUint8(6),
                    timestamp: view.getUint32(7, true),
                    // Parse factory wipe progress fields from reserved bytes
                    progress_pct: view.byteLength > 11 ? view.getUint8(11) : undefined,
                    wipe_step: view.byteLength > 12 ? view.getUint8(12) : undefined,
                    retry_count: view.byteLength > 13 ? view.getUint8(13) : undefined,
                    last_error: view.byteLength > 15 ? view.getUint16(14, true) : undefined
                };
                store.setResetState(resetData);

                // Handle pending reset flow
                if (this.pendingResetResolver && resetData.status === 0x01 && resetData.confirmation_code !== 0) {
                    // Received confirmation code
                    this.pendingResetResolver.resolveCode(resetData.confirmation_code);
                    // Don't clear resolver yet, we might want to wait for completion?
                    // The doc says "Notify... after successful execution" (idle frame).
                    // But current architecture might only wait for code. 
                    // Let's implement full flow in performReset.
                } else if (this.pendingResetResolver &&
                    (resetData.status === 0xFF ||
                        resetData.status === 0x00 ||
                        resetData.status === 0x03)) {
                    // Reset complete: legacy IDLE (0xFF), new IDLE (0x00), or DONE_OK (0x03)
                    this.pendingResetResolver.resolveComplete();
                    this.pendingResetResolver = null;
                } else if (this.pendingResetResolver && resetData.status === 0x04) {
                    // Reset failed: DONE_ERROR
                    const errorMsg = resetData.last_error
                        ? `Reset failed with error code ${resetData.last_error}`
                        : 'Reset failed';
                    this.pendingResetResolver.reject(new Error(errorMsg));
                    this.pendingResetResolver = null;
                }
                break;

            case CHAR_UUIDS.CURRENT_TASK:
                const taskData: CurrentTaskData = {
                    channel_id: view.getUint8(0),
                    start_time: view.getUint32(1, true),
                    mode: view.getUint8(5),
                    target_value: view.getUint32(6, true),
                    current_value: view.getUint32(10, true),
                    total_volume: view.getUint32(14, true),
                    status: view.getUint8(18),
                    reserved: view.getUint16(19, true)
                };
                store.setCurrentTask(taskData);
                break;

            case CHAR_UUIDS.ONBOARDING_STATUS:
                // Notifications include an 8-byte unified header; reads are raw payload.
                // Handle both by stripping the header when present and parsing the payload only.
                let onboardingView = view;
                const unifiedHeaderLen = 8;

                if (view.byteLength > 33) {
                    const payloadLen = Math.max(view.byteLength - unifiedHeaderLen, 0);
                    if (payloadLen < 17) {
                        console.warn('[BLE] Onboarding Status packet too short after header:', view.byteLength);
                        break;
                    }
                    onboardingView = new DataView(
                        data.buffer,
                        data.byteOffset + unifiedHeaderLen,
                        Math.min(payloadLen, 33)
                    );
                } else if (view.byteLength < 17) {
                    console.warn('[BLE] Onboarding Status packet too short:', view.byteLength);
                    break;
                }
                // Otherwise: raw payload (33 bytes typical) already in onboardingView

                const onboardingData: OnboardingStatusData = {
                    overall_completion_pct: onboardingView.getUint8(0),
                    channels_completion_pct: onboardingView.getUint8(1),
                    system_completion_pct: onboardingView.getUint8(2),
                    schedules_completion_pct: onboardingView.getUint8(3),
                    channel_config_flags: onboardingView.getBigUint64(4, true),
                    system_config_flags: onboardingView.getUint32(12, true),
                    schedule_config_flags: onboardingView.getUint8(16),
                    onboarding_start_time: onboardingView.byteLength >= 21 ? onboardingView.getUint32(17, true) : 0,
                    last_update_time: onboardingView.byteLength >= 25 ? onboardingView.getUint32(21, true) : 0,
                    channel_extended_flags: onboardingView.byteLength >= 33 ? onboardingView.getBigUint64(25, true) : BigInt(0)
                };
                console.log(`[BLE] Onboarding: ${onboardingData.overall_completion_pct}% complete (raw=${view.byteLength}b)`);
                store.setOnboardingState(onboardingData);
                this.debugOnboardingFlags(onboardingData);
                break;

            case CHAR_UUIDS.SYSTEM_CONFIG:
                store.setSystemConfig(this.parseSystemConfig(view));
                break;

            case CHAR_UUIDS.SCHEDULE_CONFIG:
                store.updateSchedule(this.parseScheduleConfig(view));
                break;

            case CHAR_UUIDS.GROWING_ENV:
                store.updateGrowingEnv(this.parseGrowingEnv(view));
                break;

            case CHAR_UUIDS.RAIN_SENSOR_CONFIG:
                store.setRainConfig(this.parseRainConfig(view));
                break;

            case CHAR_UUIDS.TIMEZONE_CONFIG:
                store.setTimezoneConfig(this.parseTimezoneConfig(view));
                break;

            case CHAR_UUIDS.RAIN_INTEGRATION:
                store.setRainIntegration(this.parseRainIntegration(view));
                break;

            case CHAR_UUIDS.COMPENSATION_STATUS:
                store.updateCompensation(this.parseCompensationStatus(view));
                break;

            case CHAR_UUIDS.AUTO_CALC_STATUS:
                // Auto Calc Status notifications prepend an 8-byte unified header.
                // Normally, BleFragmentationManager strips it; however, in some edge-cases
                // (invalid header detection / different notify path) we may still receive
                // header+payload. Guard here to keep offsets correct.
                {
                    const unifiedHeaderLen = 8;
                    const expectedPayloadLen = 64;
                    const minPayloadLen = 60; // last field read is at offset 59

                    let autoCalcView = view;

                    if (view.byteLength >= unifiedHeaderLen + minPayloadLen) {
                        const status = view.getUint8(1);
                        const entryCount = view.getUint16(2, true);
                        const fragmentIndex = view.getUint8(4);
                        const totalFragments = view.getUint8(5);
                        const fragmentSize = view.getUint8(6);
                        const reserved = view.getUint8(7);

                        const looksLikeUnifiedHeader =
                            status === 0 &&
                            entryCount === 1 &&
                            fragmentIndex === 0 &&
                            totalFragments === 1 &&
                            fragmentSize === expectedPayloadLen &&
                            reserved === 0;

                        if (looksLikeUnifiedHeader) {
                            const payloadStart = data.byteOffset + unifiedHeaderLen;
                            const available = Math.max(0, data.byteLength - unifiedHeaderLen);
                            const payloadLen = Math.min(expectedPayloadLen, available);
                            autoCalcView = new DataView(data.buffer, payloadStart, payloadLen);
                        }
                    }

                    if (autoCalcView.byteLength < minPayloadLen) {
                        console.warn('[BLE] Auto Calc Status packet too short:', autoCalcView.byteLength);
                        break;
                    }

                    store.updateAutoCalc(this.parseAutoCalcStatus(autoCalcView));
                }
                break;

            case CHAR_UUIDS.SOIL_MOISTURE_CONFIG: {
                const config = this.parseSoilMoistureConfig(view);
                store.setSoilMoistureConfig(config);
                break;
            }

            case CHAR_UUIDS.ENV_DATA:
                const envData = this.parseEnvironmentalData(view);
                console.log(`[BLE] EnvData parsed: T=${envData.temperature.toFixed(1)}°C, H=${envData.humidity.toFixed(1)}%, P=${envData.pressure.toFixed(0)}hPa, ts=${envData.timestamp}`);
                store.setEnvData(envData);
                break;

            case CHAR_UUIDS.RAIN_SENSOR_DATA:
                const rainData = this.parseRainData(view);
                store.setRainData(rainData);
                break;

            case CHAR_UUIDS.RTC_CONFIG:
                const rtcData: RtcData = {
                    year: view.getUint8(0),
                    month: view.getUint8(1),
                    day: view.getUint8(2),
                    hour: view.getUint8(3),
                    minute: view.getUint8(4),
                    second: view.getUint8(5),
                    day_of_week: view.getUint8(6),
                    utc_offset_minutes: view.getInt16(7, true),
                    dst_active: view.getUint8(9) !== 0
                };
                store.setRtcConfig(rtcData);
                break;

            case CHAR_UUIDS.CHANNEL_CONFIG:
                // This comes from fragmentation manager, so it's the full payload
                // We need to parse it. Since parseChannelConfig takes DataView, we can use it.
                const channelConfig = this.parseChannelConfig(view);
                store.updateZone(channelConfig.channel_id, channelConfig);
                break;

            case CHAR_UUIDS.HISTORY_MGMT:
                // Watering History Data - uses unified header fragmentation
                // Header tells us data_type: 0=detailed, 1=daily, 2=monthly, 3=annual
                if (header && header.status === 0) {
                    // First 12 bytes of the reassembled payload are the echoed query header
                    const queryHeaderLen = 12;
                    const headerBytes = Math.min(queryHeaderLen, data.byteLength);
                    const echoed = new DataView(data.buffer, data.byteOffset, headerBytes);
                    const entryIndex = echoed.byteLength >= 3 ? echoed.getUint8(2) : 0;

                    const payloadOffset = headerBytes;
                    const payloadView = new DataView(
                        data.buffer,
                        data.byteOffset + payloadOffset,
                        data.byteLength - payloadOffset
                    );

                    if (header.data_type === 0) {  // Detailed
                        const entryCount = this.getEntryCountFromPayload(
                            header.entry_count,
                            payloadView.byteLength,
                            24
                        );
                        const entries = this.parseWateringDetailedEntries(payloadView, entryCount);
                        if (entryIndex === 0) store.setWateringHistory(entries);
                        else store.appendWateringHistory(entries);
                        console.log(`[BLE] Parsed ${entries.length} detailed watering history entries`);
                    } else if (header.data_type === 1) { // Daily aggregate
                        const entrySize = this.resolveEntrySize(payloadView.byteLength, header.entry_count, [15, 16]);
                        const entryCount = this.getEntryCountFromPayload(
                            header.entry_count,
                            payloadView.byteLength,
                            entrySize
                        );
                        const entries = this.parseWateringDailyEntries(payloadView, entryCount, entrySize);
                        store.setWateringHistoryDaily(entries);
                        console.log(`[BLE] Parsed ${entries.length} daily watering history entries`);
                    } else if (header.data_type === 2) { // Monthly aggregate
                        const entrySize = this.resolveEntrySize(payloadView.byteLength, header.entry_count, [15, 16]);
                        const entryCount = this.getEntryCountFromPayload(
                            header.entry_count,
                            payloadView.byteLength,
                            entrySize
                        );
                        const entries = this.parseWateringMonthlyEntries(payloadView, entryCount, entrySize);
                        store.setWateringHistoryMonthly(entries);
                        console.log(`[BLE] Parsed ${entries.length} monthly watering history entries`);
                    } else if (header.data_type === 3) { // Annual aggregate
                        const entrySize = this.resolveEntrySize(payloadView.byteLength, header.entry_count, [14, 16]);
                        const entryCount = this.getEntryCountFromPayload(
                            header.entry_count,
                            payloadView.byteLength,
                            entrySize
                        );
                        const entries = this.parseWateringAnnualEntries(payloadView, entryCount, entrySize);
                        store.setWateringHistoryAnnual(entries);
                        console.log(`[BLE] Parsed ${entries.length} annual watering history entries`);
                    } else {
                        console.warn(`[BLE] Unknown watering history type: ${header.data_type}`);
                    }

                    // Resolve any pending watering history request for this type
                    this.resolvePendingVoid(this.pendingWateringHistoryRequests, header.data_type);
                } else if (header) {
                    if (header.data_type === 0xFE && header.status === 0x07) {
                        console.info('[BLE] History query rate limited (status=0x07). Backing off.');
                        if (this.lastWateringRequestedType !== null) {
                            this.rejectPendingVoid(this.pendingWateringHistoryRequests, this.lastWateringRequestedType, new Error('Watering history rate limited'));
                        }
                    } else if (header.status === 0) {
                        console.info('[BLE] History query returned no data.');
                        // Treat as successful empty response
                        if (this.lastWateringRequestedType !== null) {
                            this.resolvePendingVoid(this.pendingWateringHistoryRequests, this.lastWateringRequestedType);
                        }
                    } else {
                        console.warn(`[BLE] History query error: status=0x${header.status.toString(16)}`);
                        if (this.lastWateringRequestedType !== null) {
                            this.rejectPendingVoid(this.pendingWateringHistoryRequests, this.lastWateringRequestedType, new Error(`Watering history error: 0x${header.status.toString(16)}`));
                        }
                    }
                }
                break;

            case CHAR_UUIDS.FLOW_SENSOR:
                const flowData = this.parseFlowSensor(view);
                store.setFlowSensor(flowData);
                break;

            case CHAR_UUIDS.TASK_QUEUE:
                const queueData = this.parseTaskQueue(view);
                store.setTaskQueue(queueData);
                break;

            case CHAR_UUIDS.STATISTICS:
                const statsData = this.parseStatistics(view);
                store.updateStatistics(statsData);
                break;

            case CHAR_UUIDS.ALARM_STATUS:
                const alarmData = this.parseAlarm(view);
                const previousAlarm = store.alarmStatus;
                store.setAlarmStatus(alarmData);

                // Mark previous alarm as cleared when the device reports NONE.
                if (alarmData.alarm_code === 0) {
                    if (previousAlarm && previousAlarm.alarm_code !== 0) {
                        store.clearAlarmFromHistory(previousAlarm.timestamp);
                    }
                    break;
                }

                // Trigger haptic feedback for new critical alarms
                if (!previousAlarm || previousAlarm.timestamp !== alarmData.timestamp) {
                    if (isAlarmCritical(alarmData.alarm_code)) {
                        this.triggerAlarmHaptic();
                    }
                    // Add to alarm history
                    store.addAlarmToHistory({
                        alarm_code: alarmData.alarm_code,
                        alarm_data: alarmData.alarm_data,
                        timestamp: alarmData.timestamp
                    });
                }
                break;

            case CHAR_UUIDS.HYDRAULIC_STATUS:
                const hydraulicData = this.parseHydraulicStatus(view);
                store.setHydraulicStatus(hydraulicData);
                break;

            case CHAR_UUIDS.DIAGNOSTICS:
                const diagData = this.parseDiagnostics(view);
                store.setDiagnostics(diagData);
                break;

            case CHAR_UUIDS.ENV_HISTORY:
                // Environmental History - uses unified header
                // data_type: 0=detailed, 1=hourly, 2=daily, 0x03=trends
                if (header && header.status === 0) {
                    const payloadView = new DataView(data.buffer, data.byteOffset, data.byteLength);

                    switch (header.data_type) {
                        case 0:  // Detailed
                            const detailedCount = this.getEntryCountFromPayload(
                                header.entry_count,
                                payloadView.byteLength,
                                12
                            );
                            if (detailedCount > 0) {
                                const detailedEntries = this.parseEnvDetailedEntries(payloadView, detailedCount);
                                store.setEnvHistoryDetailed(detailedEntries);
                                console.log(`[BLE] Parsed ${detailedEntries.length} detailed env history entries`);
                            } else {
                                console.info('[BLE] Env history returned no entries.');
                            }
                            break;
                        case 1:  // Hourly
                            const hourlyCount = this.getEntryCountFromPayload(
                                header.entry_count,
                                payloadView.byteLength,
                                16
                            );
                            if (hourlyCount > 0) {
                                const hourlyEntries = this.parseEnvHourlyEntries(payloadView, hourlyCount);
                                store.setEnvHistoryHourly(hourlyEntries);
                                console.log(`[BLE] Parsed ${hourlyEntries.length} hourly env history entries`);
                            } else {
                                console.info('[BLE] Env history returned no entries.');
                            }
                            break;
                        case 2:  // Daily
                            const dailyCount = this.getEntryCountFromPayload(
                                header.entry_count,
                                payloadView.byteLength,
                                22
                            );
                            if (dailyCount > 0) {
                                const dailyEntries = this.parseEnvDailyEntries(payloadView, dailyCount);
                                store.setEnvHistoryDaily(dailyEntries);
                                console.log(`[BLE] Parsed ${dailyEntries.length} daily env history entries`);
                            } else {
                                console.info('[BLE] Env history returned no entries.');
                            }
                            break;
                        case 0x03:  // Trends
                            const trend = this.parseEnvTrendEntry(payloadView);
                            if (trend) {
                                store.setEnvHistoryTrend(trend);
                                console.log('[BLE] Parsed environmental trend entry');
                            } else {
                                console.info('[BLE] Env trends payload was empty or too short.');
                            }
                            break;
                    }
                } else if (header) {
                    if (header.status === 0x03) {
                        console.info('[BLE] Env history returned no data (status=0x03).');
                    } else if (header.status === 0x07) {
                        console.info('[BLE] Env history rate limited (status=0x07).');
                    } else if (header.status === 0x08) {
                        console.warn('[BLE] Env history error: MTU too small (status=0x08).');
                    } else if (header.status === 0) {
                        console.info('[BLE] Env history returned no entries.');
                    } else {
                        console.warn(`[BLE] Env History error: status=0x${header.status.toString(16)}`);
                    }
                }
                break;

            case CHAR_UUIDS.RAIN_HISTORY:
                // Rain History - uses unified header
                // data_type: 0=hourly, 1=daily, 0xFE=recent, 0xFD=reset ack, 0xFC=cal ack, 0xFF=error
                if (header && header.status === 0) {
                    const payloadView = new DataView(data.buffer, data.byteOffset, data.byteLength);

                    switch (header.data_type) {
                        case 0:  // Hourly
                            const hourlyCount = this.getEntryCountFromPayload(
                                header.entry_count,
                                payloadView.byteLength,
                                8
                            );
                            if (hourlyCount > 0) {
                                const hourlyRain = this.parseRainHourlyEntries(payloadView, hourlyCount);
                                store.setRainHistoryHourly(hourlyRain);
                                console.log(`[BLE] Parsed ${hourlyRain.length} hourly rain history entries`);
                            } else {
                                console.info('[BLE] Rain history returned no entries.');
                            }
                            break;
                        case 1:  // Daily
                            const dailyCount = this.getEntryCountFromPayload(
                                header.entry_count,
                                payloadView.byteLength,
                                12
                            );
                            if (dailyCount > 0) {
                                const dailyRain = this.parseRainDailyEntries(payloadView, dailyCount);
                                store.setRainHistoryDaily(dailyRain);
                                console.log(`[BLE] Parsed ${dailyRain.length} daily rain history entries`);
                            } else {
                                console.info('[BLE] Rain history returned no entries.');
                            }
                            break;
                        case 0xFE:  // Recent totals
                            if (data.byteLength >= 16) {
                                console.log('[BLE] Rain recent totals:', {
                                    lastHour: view.getUint32(0, true) / 100,
                                    last24h: view.getUint32(4, true) / 100,
                                    last7d: view.getUint32(8, true) / 100
                                });
                            }
                            break;
                        case 0xFD:  // Reset acknowledgement
                            console.log('[BLE] Rain history reset acknowledged');
                            break;
                        case 0xFC:  // Calibration acknowledgement
                            console.log('[BLE] Rain sensor calibration acknowledged');
                            break;
                        case 0xFF:  // Error response (1-byte error code)
                            {
                                const errorCode = payloadView.byteLength >= 1 ? payloadView.getUint8(0) : 0xFF;
                                console.warn(`[BLE] Rain history error response: code=0x${errorCode.toString(16)}`);
                                if (this.lastRainExpectedDataType !== null) {
                                    this.rejectPendingVoid(this.pendingRainHistoryRequests, this.lastRainExpectedDataType, new Error(`Rain history error code: 0x${errorCode.toString(16)}`));
                                }
                                // Do not resolve success for error frames
                                break;
                            }
                    }

                    // Resolve pending request for successful responses
                    if (header.data_type !== 0xFF) {
                        this.resolvePendingVoid(this.pendingRainHistoryRequests, header.data_type);
                    }
                } else if (header) {
                    if (header.status === 0x03) {
                        console.warn('[BLE] Rain history transport/fragmentation error (status=0x03).');
                        if (this.lastRainExpectedDataType !== null) {
                            this.rejectPendingVoid(this.pendingRainHistoryRequests, this.lastRainExpectedDataType, new Error('Rain history transport error'));
                        }
                    } else if (header.status === 0) {
                        console.info('[BLE] Rain history returned no entries.');
                        if (this.lastRainExpectedDataType !== null) {
                            this.resolvePendingVoid(this.pendingRainHistoryRequests, this.lastRainExpectedDataType);
                        }
                    } else if (header.status === 0x07) {
                        console.warn('[BLE] Rain history too large (status=0x07).');
                        if (this.lastRainExpectedDataType !== null) {
                            this.rejectPendingVoid(this.pendingRainHistoryRequests, this.lastRainExpectedDataType, new Error('Rain history too large'));
                        }
                    } else if (header.status === 0xFE) {
                        console.warn('[BLE] Rain history invalid parameters (status=0xFE).');
                        if (this.lastRainExpectedDataType !== null) {
                            this.rejectPendingVoid(this.pendingRainHistoryRequests, this.lastRainExpectedDataType, new Error('Rain history invalid parameters'));
                        }
                    } else if (header.status === 0xFF) {
                        console.warn('[BLE] Rain history invalid command (status=0xFF).');
                        if (this.lastRainExpectedDataType !== null) {
                            this.rejectPendingVoid(this.pendingRainHistoryRequests, this.lastRainExpectedDataType, new Error('Rain history invalid command'));
                        }
                    } else {
                        console.warn(`[BLE] Rain History error: status=0x${header.status.toString(16)}`);
                        if (this.lastRainExpectedDataType !== null) {
                            this.rejectPendingVoid(this.pendingRainHistoryRequests, this.lastRainExpectedDataType, new Error(`Rain history error: 0x${header.status.toString(16)}`));
                        }
                    }
                }
                break;

            case CHAR_UUIDS.CHANNEL_COMP_CONFIG:
                // Per-channel rain and temperature compensation settings (44 bytes)
                const channelCompConfig = this.parseChannelCompensationConfig(view);
                console.log(`[BLE] Channel ${channelCompConfig.channel_id} Compensation Config: rain=${channelCompConfig.rain.enabled}, temp=${channelCompConfig.temp.enabled}`);
                store.updateChannelCompensationConfig(channelCompConfig);
                break;
        }
    }

    // --- Time Synchronization ---

    private async checkTimeDrift(rtcData: RtcData) {
        try {
            // Get Timezone Config from store (should have been read before RTC)
            const tzConfig = useAppStore.getState().timezoneConfig;
            
            console.log(`[BLE] Timezone Config from store: dst_enabled=${tzConfig?.dst_enabled}, dst_offset=${tzConfig?.dst_offset_minutes}min`);
            
            // Device reports LOCAL time. According to docs:
            // - If dst_enabled=true in Timezone Config AND we're in DST period, 
            //   firmware ADDS dst_offset_minutes to the time returned from RTC
            // - utc_offset_minutes in RTC is the TOTAL offset (base + DST if active)
            
            // Create a Date from device's local time fields
            const deviceLocalAsPhoneLocal = new Date(
                2000 + rtcData.year,
                rtcData.month - 1, // JS months are 0-11
                rtcData.day,
                rtcData.hour,
                rtcData.minute,
                rtcData.second
            );
            
            // Get phone's timezone offset (minutes, positive for east of UTC)
            const phoneOffsetMinutes = -new Date().getTimezoneOffset();
            
            // Device's offset from RTC data - this is TOTAL offset including DST if active
            const deviceOffsetMinutes = rtcData.utc_offset_minutes;
            
            // Convert device time to UTC epoch:
            // deviceLocalAsPhoneLocal was created assuming phone's timezone, so its getTime() 
            // gives us: (device_local_time interpreted as phone_local) -> UTC
            // We need to correct for the fact that device local uses device offset, not phone offset.
            const deviceUtcMs = deviceLocalAsPhoneLocal.getTime() + (phoneOffsetMinutes - deviceOffsetMinutes) * 60000;
            
            const now = new Date();
            const phoneUtcMs = now.getTime();
            
            const diffMs = phoneUtcMs - deviceUtcMs; // Signed difference (positive = device behind)
            const driftSeconds = Math.abs(diffMs) / 1000;

            console.log(`[BLE] Time Check Debug:`);
            console.log(`  Device reports: ${rtcData.hour}:${rtcData.minute}:${rtcData.second} (offset=${deviceOffsetMinutes}min, dst_active=${rtcData.dst_active})`);
            console.log(`  Phone time: ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()} (offset=${phoneOffsetMinutes}min)`);
            console.log(`  Device UTC epoch: ${new Date(deviceUtcMs).toISOString()}`);
            console.log(`  Phone UTC epoch: ${new Date(phoneUtcMs).toISOString()}`);
            console.log(`  Drift: ${driftSeconds.toFixed(1)}s (${diffMs > 0 ? 'device behind' : 'device ahead'})`);

            if (driftSeconds > 60) {
                console.log('[BLE] Time drift detected (>60s). Synchronizing...');
                
                // We send the phone's current local time with its offset
                // The offset we send should match what the phone reports (includes DST if active)
                const offset = phoneOffsetMinutes;
                
                // dst_active in RTC is informational only per docs
                // We set it based on whether phone's offset differs from standard offset
                // For simplicity: check if current month is in typical DST period
                const month = now.getMonth(); // 0-11
                const isDstPeriod = month >= 3 && month <= 9; // April through October
                
                console.log(`[BLE] Writing RTC: ${now.toLocaleString()}, offset=${offset}min, dst_active=${isDstPeriod}`);
                
                await this.writeRtcConfig(now, offset, isDstPeriod);
                console.log('[BLE] Time synchronized.');
            }
        } catch (error) {
            console.error('[BLE] Failed to check/sync time:', error);
        }
    }

    // --- Channel Configuration ---

    public async selectChannel(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');

        // Selector writes are prone to Android "write busy" if other GATT ops overlap.
        // Serialize + retry to keep BLE reliable.
        await this.writeWithRetry(
            SERVICE_UUID,
            CHAR_UUIDS.CHANNEL_CONFIG,
            new DataView(new Uint8Array([channelId]).buffer),
            3,
            200
        );
    }

    public async readChannelConfig(channelId: number): Promise<ChannelConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');

        const deviceId = this.connectedDeviceId;
        const result = await this.enqueueGattOp(`channelConfig:read:${channelId}`, async () => {
            // Select channel first (must stay adjacent to read, otherwise the cached context can drift).
            await this.writeWithRetryInner(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.CHANNEL_CONFIG,
                new DataView(new Uint8Array([channelId]).buffer),
                3,
                150
            );

            // Wait for firmware to switch channel context before reading
            await this.delay(50);

            // Read data from device (SOURCE OF TRUTH)
            return await this.readWithRetryInner(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.CHANNEL_CONFIG,
                2,
                150
            );
        });

        const config = this.parseChannelConfig(result);
        // Update store with data READ from device
        useAppStore.getState().updateZone(config.channel_id, config);
        return config;
    }

    public async writeChannelConfig(channelId: number, configData: Uint8Array): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // Use custom fragmentation matching Growing Environment pattern (Type 2 BE)
        // This is more reliable than the generic fragmentationManager
        await this.writeChannelConfigFragmented(configData, channelId);
    }

    /**
     * Custom fragmentation for Channel Config (76 bytes) using Type 3 (Little Endian)
     * Matches the standard BleFragmentationManager pattern
     */
    private async writeChannelConfigFragmented(data: Uint8Array, channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;

        // Keep the entire fragmented write in the GATT queue so no other UI-triggered
        // reads/writes interleave mid-stream (Android returns ERROR_GATT_WRITE_REQUEST_BUSY=201).
        await this.enqueueGattOp(`channelConfig:write:${channelId}`, async () => {
            const totalSize = data.length; // 76

            // Header: [channel_id, frag_type, size_lo, size_hi] (Little Endian for type 3)
            const header = new Uint8Array(4);
            header[0] = channelId;
            header[1] = 0x03; // FRAGMENT_TYPE_FULL_LE (Little Endian size)
            header[2] = totalSize & 0xFF;           // Low byte first
            header[3] = (totalSize >> 8) & 0xFF;    // High byte second

            const mtu = 20; // Conservative MTU
            let offset = 0;

            // First packet: Header (4) + Payload chunk (16) = 20 bytes
            const firstChunkSize = Math.min(mtu - 4, data.length);
            const firstPacket = new Uint8Array(4 + firstChunkSize);
            firstPacket.set(header, 0);
            firstPacket.set(data.slice(0, firstChunkSize), 4);

            console.log(`[BLE] ChannelConfig write: sending fragment 1 (${firstPacket.length}B), channel=${channelId}, totalSize=${totalSize}`);

            try {
                await this.writeWithRetryInner(
                    deviceId,
                    SERVICE_UUID,
                    CHAR_UUIDS.CHANNEL_CONFIG,
                    new DataView(firstPacket.buffer),
                    3,
                    200
                );
            } catch (error) {
                console.error(`[BLE] ChannelConfig write: fragment 1 FAILED:`, error);
                throw error;
            }

            offset += firstChunkSize;

            // Subsequent packets: Raw payload chunks (20 bytes each)
            let fragNum = 2;
            while (offset < totalSize) {
                // 150ms delay between fragments to prevent device overflow
                await this.delay(150);

                const chunkSize = Math.min(mtu, totalSize - offset);
                const chunk = data.slice(offset, offset + chunkSize);

                console.log(`[BLE] ChannelConfig write: sending fragment ${fragNum} (${chunk.length}B), offset=${offset}`);

                try {
                    await this.writeWithRetryInner(
                        deviceId,
                        SERVICE_UUID,
                        CHAR_UUIDS.CHANNEL_CONFIG,
                        new DataView(chunk.buffer),
                        3,
                        200
                    );
                } catch (error) {
                    console.error(`[BLE] ChannelConfig write: fragment ${fragNum} FAILED at offset ${offset}:`, error);
                    throw error;
                }

                offset += chunkSize;
                fragNum++;
            }

            console.log(`[BLE] ChannelConfig write: complete (${fragNum - 1} fragments, ${totalSize} bytes)`);
        });
    }

    public async writeChannelConfigObject(config: ChannelConfigData): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const buffer = new ArrayBuffer(76);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);

        // 0: Channel ID
        view.setUint8(0, config.channel_id);

        // 1: Name Length
        // 2-65: Name (64 bytes)
        const encoder = new TextEncoder();
        const nameBytes = encoder.encode(config.name);
        const nameLen = Math.min(nameBytes.length, 63); // Max 63 chars + null terminator? Or just 64 bytes?
        // Docs say: "Name Length: 1 byte", "Name: 64 bytes (UTF-8)"
        view.setUint8(1, nameLen);
        bytes.set(nameBytes.slice(0, 64), 2);

        // 66: Auto Enabled
        view.setUint8(66, config.auto_enabled ? 1 : 0);

        // 67: Plant Type
        view.setUint8(67, config.plant_type);

        // 68: Soil Type
        view.setUint8(68, config.soil_type);

        // 69: Irrigation Method
        view.setUint8(69, config.irrigation_method);

        // 70: Coverage Type
        view.setUint8(70, config.coverage_type);

        // 71-74: Coverage Value (Union)
        if (config.coverage_type === 0) {
            // Area m2 (float)
            view.setFloat32(71, config.coverage.area_m2 || 0, true);
        } else {
            // Plant Count (uint16)
            view.setUint16(71, config.coverage.plant_count || 0, true);
        }

        // 75: Sun Percentage
        view.setUint8(75, config.sun_percentage);

        await this.writeChannelConfig(config.channel_id, bytes);
    }

    private parseChannelConfig(data: DataView): ChannelConfigData {
        const decoder = new TextDecoder('utf-8');
        // IMPORTANT: DataView may have a non-zero byteOffset; always account for it when
        // creating Uint8Array views into the underlying buffer.
        const nameBytes = new Uint8Array(data.buffer, data.byteOffset + 2, 64);
        // Find null terminator or use full length
        let nameEnd = 0;
        while (nameEnd < 64 && nameBytes[nameEnd] !== 0) nameEnd++;
        const name = this.normalizeDeviceText(decoder.decode(nameBytes.slice(0, nameEnd)));

        const coverageType = data.getUint8(70);
        const coverage: any = {};
        if (coverageType === 0) {
            coverage.area_m2 = data.getFloat32(71, true);
        } else {
            coverage.plant_count = data.getUint16(71, true);
        }

        return {
            channel_id: data.getUint8(0),
            name_len: data.getUint8(1),
            name: name,
            auto_enabled: data.getUint8(66) !== 0,
            plant_type: data.getUint8(67),
            soil_type: data.getUint8(68),
            irrigation_method: data.getUint8(69),
            coverage_type: coverageType,
            coverage: coverage,
            sun_percentage: data.getUint8(75)
        };
    }

    /**
     * Fixes common mojibake patterns when UTF-8 text was decoded as Latin-1.
     */
    private normalizeDeviceText(value: string): string {
        if (!value) return value;

        // Common mojibake marker bytes visible as Latin-1 glyphs.
        const suspectPattern = /[\u00C2\u00C3\u00C4\u00C8\u00CA\u00CE\u00CF\u00E2]/;
        const scorePattern = /[\u00C2\u00C3\u00C4\u00C8\u00CA\u00CE\u00CF\u00E2]/g;
        const score = (s: string) => (s.match(scorePattern) || []).length;

        let candidate = value;
        if (!suspectPattern.test(candidate)) return candidate;

        try {
            // Apply at most two passes in case text was double-misdecoded.
            for (let attempt = 0; attempt < 2; attempt++) {
                if (!suspectPattern.test(candidate)) break;

                const bytes = new Uint8Array(candidate.length);
                for (let i = 0; i < candidate.length; i++) {
                    bytes[i] = candidate.charCodeAt(i) & 0xff;
                }

                const fixed = new TextDecoder('utf-8').decode(bytes);
                if (score(fixed) >= score(candidate)) break;
                candidate = fixed;
            }
            return candidate;
        } catch {
            return value;
        }
    }

    // --- Valve Control ---

    public async readValveControl(): Promise<ValveControlData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual valve state from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.VALVE_CONTROL, 2, 150);
        const valveData = {
            channel_id: data.getUint8(0),
            task_type: data.getUint8(1),
            value: data.getUint16(2, true)
        };
        // Update store with data READ from device
        useAppStore.getState().updateValveStatus(valveData.channel_id, valveData);
        return valveData;
    }

    public async writeValveControl(valveId: number, action: number, duration: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // Simple write (4 bytes) - No fragmentation needed
        // NOTE: Do NOT update store after write - wait for notification to confirm valve state
        const data = new Uint8Array(4);
        data[0] = valveId;
        data[1] = action;
        data[2] = duration & 0xFF;
        data[3] = (duration >> 8) & 0xFF;

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.VALVE_CONTROL, new DataView(data.buffer), 3, 150);
    }

    // --- RTC Configuration ---

    public async readRtcConfig(): Promise<RtcData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.RTC_CONFIG, 2, 150);
        
        // RAW OUTPUT DEBUG
        const bytes = new Uint8Array(data.buffer);
        console.log(`[BLE] RTC Config RAW bytes (${bytes.length}):`, Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        const rtcData = {
            year: data.getUint8(0),
            month: data.getUint8(1),
            day: data.getUint8(2),
            hour: data.getUint8(3),
            minute: data.getUint8(4),
            second: data.getUint8(5),
            day_of_week: data.getUint8(6),
            utc_offset_minutes: data.getInt16(7, true),
            dst_active: data.getUint8(9) !== 0
        };
        console.log('[BLE] Parsed RTC:', JSON.stringify(rtcData));
        // Update store with data READ from device (this is the source of truth)
        useAppStore.getState().setRtcConfig(rtcData);

        // Check and correct time drift if needed
        this.checkTimeDrift(rtcData);

        return rtcData;
    }

    public async writeRtcConfig(date: Date, utcOffsetMinutes: number, dstActive: boolean): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // NOTE: Do NOT update store after write - wait for device to apply and notify/re-read
        const data = new Uint8Array(16);
        const view = new DataView(data.buffer);

        const year = date.getFullYear() - 2000;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();

        console.log(`[BLE] writeRtcConfig: Sending LOCAL time ${year + 2000}-${month}-${day} ${hour}:${minute}:${second}, offset=${utcOffsetMinutes}min, dst=${dstActive}`);

        view.setUint8(0, year);
        view.setUint8(1, month);
        view.setUint8(2, day);
        view.setUint8(3, hour);
        view.setUint8(4, minute);
        view.setUint8(5, second);
        view.setUint8(6, 0); // Day of week (ignored by FW)
        view.setInt16(7, utcOffsetMinutes, true); // Little Endian
        view.setUint8(9, dstActive ? 1 : 0);
        // Bytes 10-15 are reserved (0)

        // RAW OUTPUT DEBUG
        const bytes = new Uint8Array(data);
        console.log(`[BLE] writeRtcConfig RAW bytes (${bytes.length}):`, Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.RTC_CONFIG, view);
        console.log('[BLE] writeRtcConfig: Write completed successfully');
    }

    // --- Calibration ---

    public async readCalibration(): Promise<CalibrationData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual calibration state from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.CALIBRATION, 2, 150);
        const calData = {
            action: data.getUint8(0),
            pulses: data.getUint32(1, true),
            volume_ml: data.getUint32(5, true),
            pulses_per_liter: data.getUint32(9, true)
        };
        // Update store with data READ from device
        useAppStore.getState().setCalibrationState(calData);
        return calData;
    }

    public async writeCalibration(action: number, volumeMl: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // NOTE: Do NOT update store after write - calibration status comes via notification
        const data = new Uint8Array(13);
        const view = new DataView(data.buffer);

        view.setUint8(0, action);
        view.setUint32(1, 0, true); // Pulses (ignored on write)
        view.setUint32(5, volumeMl, true);
        view.setUint32(9, 0, true); // Pulses per liter (ignored on write)

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.CALIBRATION, view, 3, 150);
    }

    // --- Reset Control ---

    public async readResetStatus(): Promise<ResetControlData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual reset status from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.RESET_CONTROL, 2, 150);
        const resetData: ResetControlData = {
            reset_type: data.getUint8(0),
            channel_id: data.getUint8(1),
            confirmation_code: data.getUint32(2, true),
            status: data.getUint8(6),
            timestamp: data.getUint32(7, true),
            // Parse factory wipe progress fields from reserved bytes
            progress_pct: data.byteLength > 11 ? data.getUint8(11) : undefined,
            wipe_step: data.byteLength > 12 ? data.getUint8(12) : undefined,
            retry_count: data.byteLength > 13 ? data.getUint8(13) : undefined,
            last_error: data.byteLength > 15 ? data.getUint16(14, true) : undefined
        };
        // Update store with data READ from device
        useAppStore.getState().setResetState(resetData);
        return resetData;
    }

    public async requestReset(type: number, channelId: number = 0xFF): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const data = new Uint8Array(16);
        const view = new DataView(data.buffer);

        view.setUint8(0, type);
        view.setUint8(1, channelId);
        view.setUint32(2, 0, true); // Confirmation code 0 = Request
        view.setUint8(6, 0xFF); // Status idle
        view.setUint32(7, 0, true); // Timestamp
        // Reserved 0

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.RESET_CONTROL, view, 3, 200);
    }

    public async executeReset(type: number, channelId: number, confirmationCode: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const data = new Uint8Array(16);
        const view = new DataView(data.buffer);

        view.setUint8(0, type);
        view.setUint8(1, channelId);
        view.setUint32(2, confirmationCode, true);
        view.setUint8(6, 0xFF);
        view.setUint32(7, 0, true);

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.RESET_CONTROL, view, 3, 200);
    }

    // --- Current Task ---

    public async readCurrentTask(): Promise<CurrentTaskData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual current task from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.CURRENT_TASK, 2, 150);
        const taskData = {
            channel_id: data.getUint8(0),
            start_time: data.getUint32(1, true),
            mode: data.getUint8(5),
            target_value: data.getUint32(6, true),
            current_value: data.getUint32(10, true),
            total_volume: data.getUint32(14, true),
            status: data.getUint8(18),
            reserved: data.getUint16(19, true)
        };
        // Update store with data READ from device
        useAppStore.getState().setCurrentTask(taskData);
        return taskData;
    }

    // --- Onboarding Status ---

    public async readOnboardingStatus(): Promise<OnboardingStatusData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual onboarding status from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.ONBOARDING_STATUS, 2, 150);

        const onboardingData: OnboardingStatusData = {
            overall_completion_pct: data.getUint8(0),
            channels_completion_pct: data.getUint8(1),
            system_completion_pct: data.getUint8(2),
            schedules_completion_pct: data.getUint8(3),
            channel_config_flags: data.getBigUint64(4, true),
            system_config_flags: data.getUint32(12, true),
            schedule_config_flags: data.getUint8(16),
            onboarding_start_time: data.getUint32(17, true),
            last_update_time: data.getUint32(21, true),
            channel_extended_flags: data.byteLength >= 33 ? data.getBigUint64(25, true) : BigInt(0)
        };
        // Update store with data READ from device
        useAppStore.getState().setOnboardingState(onboardingData);
        return onboardingData;
    }

    // --- Bulk Sync Snapshot ---

    public async readBulkSyncSnapshot(): Promise<BulkSyncSnapshot | null> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        try {
            const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.BULK_SYNC_SNAPSHOT, 2, 150);

            // RAW OUTPUT DEBUG
            const bytes = new Uint8Array(data.buffer);
            console.log(`[BLE] Bulk Sync RAW bytes (${bytes.length}):`, Array.from(bytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ') + '...');
            
            const snapshot = this.parseBulkSyncSnapshot(data);
            
            // Debug timestamp
            console.log(`[BLE] Bulk Sync DEBUG: utc_timestamp=${snapshot.utc_timestamp}, timezone_offset=${snapshot.timezone_offset_min}min, dst_active=${snapshot.dst_active}`);
            const deviceLocalTime = new Date((snapshot.utc_timestamp + snapshot.timezone_offset_min * 60) * 1000);
            console.log(`[BLE] Bulk Sync DEBUG: Device thinks local time is: ${deviceLocalTime.toISOString()} (${deviceLocalTime.toLocaleTimeString()})`);
            console.log(`[BLE] Bulk Sync DEBUG: Phone UTC now: ${new Date().toISOString()}`);
            
            useAppStore.getState().setBulkSyncSnapshot(snapshot);
            await this.applyBulkSyncSnapshot(snapshot);
            console.log('[BLE] Bulk Sync Snapshot received');
            return snapshot;
        } catch (error: any) {
            console.log('[BLE] Bulk Sync Snapshot not available:', error?.message || error);
            return null;
        }
    }

    private parseBulkSyncSnapshot(view: DataView): BulkSyncSnapshot {
        if (view.byteLength < 60) {
            throw new Error(`Bulk Sync Snapshot invalid size: ${view.byteLength}`);
        }

        const flags = view.getUint8(1);
        let deviceSerial: string | undefined;
        if (view.byteLength >= 68) {
            const serialBytes = new Uint8Array(view.buffer, view.byteOffset + 60, 8);
            const zeroIdx = serialBytes.indexOf(0);
            const endIdx = zeroIdx >= 0 ? zeroIdx : serialBytes.length;
            const serial = String.fromCharCode(...Array.from(serialBytes.slice(0, endIdx))).trim();
            if (/^\d{6}$/.test(serial)) {
                deviceSerial = serial;
            }
        }

        return {
            version: view.getUint8(0),
            flags,
            rtc_valid: (flags & 0x01) !== 0,
            env_valid: (flags & 0x02) !== 0,
            rain_valid: (flags & 0x04) !== 0,
            utc_timestamp: view.getUint32(4, true),
            timezone_offset_min: view.getInt16(8, true),
            dst_active: view.getUint8(10) !== 0,
            system_mode: view.getUint8(12),
            active_alarms: view.getUint8(13),
            valve_states: view.getUint8(14),
            active_channel: view.getUint8(15),
            remaining_seconds: view.getUint16(16, true),
            flow_rate_ml_min: view.getUint16(18, true),
            temperature_c: view.getInt16(20, true) / 10,
            humidity_pct: view.getUint16(22, true) / 10,
            pressure_hpa: view.getUint16(24, true) / 10,
            dew_point_c: view.getInt16(26, true) / 10,
            vpd_kpa: view.getUint16(28, true) / 100,
            rain_today_mm: view.getUint16(32, true) / 10,
            rain_week_mm: view.getUint16(34, true) / 10,
            rain_integration_enabled: view.getUint8(36) !== 0,
            skip_active: view.getUint8(37) !== 0,
            skip_remaining_min: view.getUint16(38, true),
            temp_comp_enabled: view.getUint8(40) !== 0,
            rain_comp_enabled: view.getUint8(41) !== 0,
            temp_adjustment_pct: view.getInt8(42),
            rain_adjustment_pct: view.getInt8(43),
            pending_task_count: view.getUint8(44),
            next_task_channel: view.getUint8(45),
            next_task_in_min: view.getUint16(46, true),
            next_task_timestamp: view.getUint32(48, true),
            channel_status: Array.from(new Uint8Array(view.buffer, view.byteOffset + 52, 8)),
            device_serial: deviceSerial
        };
    }

    private async applyBulkSyncSnapshot(snapshot: BulkSyncSnapshot): Promise<void> {
        const store = useAppStore.getState();

        if (snapshot.env_valid) {
            store.setEnvData({
                temperature: snapshot.temperature_c,
                humidity: snapshot.humidity_pct,
                pressure: snapshot.pressure_hpa,
                timestamp: snapshot.utc_timestamp,
                sensor_status: 1,
                measurement_interval: 0,
                data_quality: 100
            });
        }

        if (!snapshot.rain_valid) {
            store.setRainData({
                current_hour_mm: 0,
                today_total_mm: 0,
                last_24h_mm: 0,
                current_rate_mm_h: 0,
                last_pulse_time: 0,
                total_pulses: 0,
                sensor_status: 0,
                data_quality: 0
            });
        }

        if (snapshot.rtc_valid) {
            const rtcData = this.buildRtcConfigFromSnapshot(snapshot);
            store.setRtcConfig(rtcData);
            await this.checkTimeDrift(rtcData);
        }

        if (snapshot.next_task_timestamp > 0 || snapshot.next_task_in_min > 0) {
            const timestamp = snapshot.next_task_timestamp > 0
                ? snapshot.next_task_timestamp
                : Math.floor(Date.now() / 1000) + snapshot.next_task_in_min * 60;
            const nextRun = this.formatTime(timestamp);
            store.updateSystemStatus({ nextRun });
        } else {
            store.updateSystemStatus({ nextRun: undefined });
        }
    }

    private buildRtcConfigFromSnapshot(snapshot: BulkSyncSnapshot): RtcData {
        // Create a Date from UTC timestamp, then use getUTC* methods
        // We add the offset to get local time components, but must use getUTC* 
        // because getHours() would add the PHONE's offset again!
        const offsetSeconds = snapshot.timezone_offset_min * 60;
        const localDate = new Date((snapshot.utc_timestamp + offsetSeconds) * 1000);
        return {
            year: localDate.getUTCFullYear() % 100,
            month: localDate.getUTCMonth() + 1,
            day: localDate.getUTCDate(),
            hour: localDate.getUTCHours(),
            minute: localDate.getUTCMinutes(),
            second: localDate.getUTCSeconds(),
            day_of_week: localDate.getUTCDay(),
            utc_offset_minutes: snapshot.timezone_offset_min,
            dst_active: snapshot.dst_active
        };
    }

    private formatTime(utcSeconds: number): string {
        const date = new Date(utcSeconds * 1000);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // --- Environmental Data ---

    public async readEnvironmentalData(): Promise<EnvironmentalData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual environmental data from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.ENV_DATA, 2, 150);

        const envData = this.parseEnvironmentalData(data);
        // Update store with data READ from device
        useAppStore.getState().setEnvData(envData);
        return envData;
    }

    private handleEnvNotification(data: DataView) {
        // If full packet (24 bytes), dispatch directly (rare case - when MTU allows)
        if (data.byteLength === 24) {
            // Use slice to correctly handle byteOffset
            const payload = new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + 24));
            this.dispatchToStore(CHAR_UUIDS.ENV_DATA, payload);
            return;
        }

        // Parse 3-byte header: [seq, total, len]
        const seq = data.getUint8(0);
        const total = data.getUint8(1);
        const len = data.getUint8(2);

        // Extract payload correctly using byteOffset
        const payload = new Uint8Array(data.buffer.slice(data.byteOffset + 3, data.byteOffset + 3 + len));

        console.log(`[BLE] EnvData fragment: seq=${seq}/${total}, len=${len}, receivedSoFar=${this.envReassembly?.receivedLen || 0}`);

        // Initialize reassembly if new sequence or first fragment
        if (seq === 0 || !this.envReassembly) {
            this.envReassembly = {
                seq: 0,
                total: total,
                buffer: new Uint8Array(24), // Fixed size 24 bytes
                receivedLen: 0
            };
        }

        // Safety check
        if (!this.envReassembly) return;

        // Append data
        this.envReassembly.buffer.set(payload, this.envReassembly.receivedLen);
        this.envReassembly.receivedLen += len;
        this.envReassembly.seq = seq;

        // Check completion
        if (seq + 1 === total) {
            console.log(`[BLE] EnvData complete! Total bytes=${this.envReassembly.receivedLen}`);
            // Dispatch copy of buffer
            this.dispatchToStore(CHAR_UUIDS.ENV_DATA, new Uint8Array(this.envReassembly.buffer));
            this.envReassembly = null;
        }
    }

    private parseEnvironmentalData(view: DataView): EnvironmentalData {
        return {
            temperature: view.getFloat32(0, true),
            humidity: view.getFloat32(4, true),
            pressure: view.getFloat32(8, true),
            timestamp: view.getUint32(12, true),
            sensor_status: view.getUint8(16),
            measurement_interval: view.getUint16(17, true),
            data_quality: view.getUint8(19)
        };
    }

    // --- Rain Data ---

    public async readRainData(): Promise<RainData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual rain sensor data from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.RAIN_SENSOR_DATA, 2, 150);

        const rainData = this.parseRainData(data);
        // Update store with data READ from device
        useAppStore.getState().setRainData(rainData);
        return rainData;
    }

    private parseRainData(view: DataView): RainData {
        return {
            current_hour_mm: view.getUint32(0, true) / 100,
            today_total_mm: view.getUint32(4, true) / 100,
            last_24h_mm: view.getUint32(8, true) / 100,
            current_rate_mm_h: view.getUint16(12, true) / 100,
            last_pulse_time: view.getUint32(14, true),
            total_pulses: view.getUint32(18, true),
            sensor_status: view.getUint8(22),
            data_quality: view.getUint8(23)
        };
    }

    // --- System Configuration ---

    public async readSystemConfig(): Promise<SystemConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual system config from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.SYSTEM_CONFIG, 2, 150);
        const config = this.parseSystemConfig(data);
        // Update store with data READ from device
        useAppStore.getState().setSystemConfig(config);
        return config;
    }

    public async writeSystemConfig(configData: Uint8Array): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // NOTE: Do NOT update store after write - re-read to confirm
        // Standard ATT Long Write - Client handles splitting if needed, 
        // but BleClient usually handles it if the device supports it.
        // If not, we might need to split manually. 
        // Docs say: "Fragmentation: Required for writes when MTU < 56; handled via standard ATT long write semantics"

        // We'll try direct write first. If BleClient supports long writes, it should work.
        await this.writeWithRetry(
            SERVICE_UUID,
            CHAR_UUIDS.SYSTEM_CONFIG,
            new DataView(configData.buffer)
        );
    }

    public async writeSystemConfigObject(config: Partial<SystemConfigData>): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const buffer = new ArrayBuffer(56);
        const view = new DataView(buffer);

        // 0: Version (Read Only, but we write 2)
        view.setUint8(0, 2);

        // 1: Power Mode (Default 0)
        view.setUint8(1, config.power_mode ?? 0);

        // 2: Flow Calibration (Default 750 pulses/L if not set)
        // CRITICAL: Must be 100-10000
        view.setUint32(2, config.flow_calibration ?? 750, true);

        // 6: Max Active Valves (Read Only)
        view.setUint8(6, 1);

        // 7: Num Channels (Read Only)
        view.setUint8(7, 8);

        // 8: Master Valve
        const mv = config.master_valve;
        view.setUint8(8, mv?.enabled ? 1 : 0);
        view.setInt16(9, mv?.pre_delay ?? 0, true);
        view.setInt16(11, mv?.post_delay ?? 0, true);
        view.setUint8(13, mv?.overlap_grace ?? 0);
        view.setUint8(14, mv?.auto_management ? 1 : 0);
        view.setUint8(15, 0); // Current state (Read Only)

        // 16: BME280
        const bme = config.bme280;
        view.setUint8(16, bme?.enabled ? 1 : 0);
        view.setUint16(17, bme?.measurement_interval ?? 60, true);
        view.setUint8(19, 0); // Status (Read Only)

        // 20: Compensation
        // NOTE: Rain fields are RESERVED and IGNORED by firmware (v2.x+)
        // Rain compensation is per-channel only - configure via Rain Sensor Config (char 18)
        const comp = config.compensation;
        view.setUint8(20, 0);  // _reserved_rain_enabled - ALWAYS 0 (IGNORED)
        view.setUint8(21, comp?.temp_enabled ? 1 : 0);  // Global temp compensation
        view.setFloat32(22, 0.0, true);  // _reserved_rain_sensitivity - ALWAYS 0 (IGNORED)
        view.setFloat32(26, comp?.temp_sensitivity ?? 0.05, true);  // Temp sensitivity (clamped 0.01-0.20)
        view.setUint16(30, 0, true);  // _reserved_rain_lookback_hours - ALWAYS 0 (IGNORED)
        view.setFloat32(32, 0.0, true);  // _reserved_rain_skip_threshold - ALWAYS 0 (IGNORED)
        view.setFloat32(36, comp?.temp_base_temperature ?? 20.0, true);  // Temp base (clamped -10 to 50)

        // 40: Status (Read Only) - Write 0s
        view.setUint8(40, 0);
        view.setUint8(41, 0);
        view.setUint8(42, 0);
        view.setUint8(43, 0);

        // 44: Timestamps (Read Only) - Write 0s
        view.setUint32(44, 0, true);
        view.setUint32(48, 0, true);

        // 52: Reserved - Write 0s
        view.setUint32(52, 0, true);

        await this.writeSystemConfig(new Uint8Array(buffer));
    }

    private parseSystemConfig(view: DataView): SystemConfigData {
        return {
            version: view.getUint8(0),
            power_mode: view.getUint8(1),
            flow_calibration: view.getUint32(2, true),
            max_active_valves: view.getUint8(6),
            num_channels: view.getUint8(7),
            master_valve: {
                enabled: view.getUint8(8) !== 0,
                pre_delay: view.getInt16(9, true),
                post_delay: view.getInt16(11, true),
                overlap_grace: view.getUint8(13),
                auto_management: view.getUint8(14) !== 0,
                current_state: view.getUint8(15) !== 0
            },
            bme280: {
                enabled: view.getUint8(16) !== 0,
                measurement_interval: view.getUint16(17, true),
                status: view.getUint8(19)
            },
            compensation: {
                // NOTE: Rain fields are RESERVED - firmware always returns 0
                // Rain compensation is per-channel only (v2.x+)
                _reserved_rain_enabled: view.getUint8(20) !== 0,  // Always false
                temp_enabled: view.getUint8(21) !== 0,
                _reserved_rain_sensitivity: view.getFloat32(22, true),  // Always 0.0
                temp_sensitivity: view.getFloat32(26, true),
                _reserved_rain_lookback_hours: view.getUint16(30, true),  // Always 0
                _reserved_rain_skip_threshold: view.getFloat32(32, true),  // Always 0.0
                temp_base_temperature: view.getFloat32(36, true)
            },
            status: {
                interval_mode_channels: view.getUint8(40),
                compensation_active_channels: view.getUint8(41),
                incomplete_config_channels: view.getUint8(42),
                environmental_data_quality: view.getUint8(43)
            },
            last_config_update: view.getUint32(44, true),
            last_sensor_reading: view.getUint32(48, true)
        };
    }

    /**
     * Read firmware revision string from standard BLE Device Information Service.
     * Returns null when DIS is not exposed by firmware.
     */
    public async readFirmwareRevision(): Promise<string | null> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        try {
            const data = await this.readWithRetry(
                DEVICE_INFO_SERVICE_UUID,
                DEVICE_INFO_FIRMWARE_REV_UUID,
                1,
                120
            );

            const raw = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            const bytes = Uint8Array.from(raw);
            const nullIndex = bytes.indexOf(0);
            const payload = nullIndex >= 0 ? bytes.slice(0, nullIndex) : bytes;
            const decoded = new TextDecoder().decode(payload).trim();
            return decoded.length > 0 ? decoded : null;
        } catch (error) {
            if (this.isCharacteristicNotFoundError(error)) {
                return null;
            }
            throw error;
        }
    }

    // --- Schedule Configuration ---

    public async selectScheduleChannel(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');
        await this.writeWithRetry(
            SERVICE_UUID,
            CHAR_UUIDS.SCHEDULE_CONFIG,
            new DataView(new Uint8Array([channelId]).buffer),
            3,
            200
        );
    }

    public async readScheduleConfig(channelId: number): Promise<ScheduleConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');

        const deviceId = this.connectedDeviceId;
        const data = await this.enqueueGattOp(`scheduleConfig:read:${channelId}`, async () => {
            // Select+read must be adjacent; schedule characteristic caches the selected channel.
            await this.writeWithRetryInner(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.SCHEDULE_CONFIG,
                new DataView(new Uint8Array([channelId]).buffer),
                3,
                150
            );

            // Small delay for firmware to update its response buffer.
            await this.delay(40);

            return await this.readWithRetryInner(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.SCHEDULE_CONFIG,
                2,
                150
            );
        });

        const config = this.parseScheduleConfig(data);
        // Update store with data READ from device
        useAppStore.getState().updateSchedule(config);
        return config;
    }

    public async writeScheduleConfig(config: ScheduleConfigData): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // NOTE: Do NOT update store after write - re-read to confirm
        // Schedule writes must be a single 12-byte frame (no fragmentation, no selector)
        const buffer = new ArrayBuffer(12);
        const view = new DataView(buffer);

        const clampedOffset = Math.max(-120, Math.min(120, config.solar_offset_minutes ?? 0));

        view.setUint8(0, config.channel_id);
        view.setUint8(1, config.schedule_type);
        view.setUint8(2, config.days_mask);
        view.setUint8(3, config.hour);
        view.setUint8(4, config.minute);
        view.setUint8(5, config.watering_mode);
        view.setUint16(6, config.value, true);
        view.setUint8(8, config.auto_enabled ? 1 : 0);
        view.setUint8(9, config.use_solar_timing ? 1 : 0);
        view.setUint8(10, config.solar_event ?? 0);
        view.setInt8(11, clampedOffset);

        const data = new Uint8Array(buffer);

        console.log(`[BLE] Writing schedule (12 bytes): [${Array.from(data).join(', ')}]`);
        console.log(`[BLE] Schedule: ch=${config.channel_id}, type=${config.schedule_type}, days=0x${config.days_mask.toString(16)}, ${config.hour}:${config.minute}, mode=${config.watering_mode}, value=${config.value}, auto=${config.auto_enabled ? 1 : 0}, solar=${config.use_solar_timing ? 'on' : 'off'} evt=${config.solar_event ?? 0} off=${clampedOffset}`);

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.SCHEDULE_CONFIG, new DataView(data.buffer), 3, 200);
    }

    private parseScheduleConfig(view: DataView): ScheduleConfigData {
        const hasSolarFields = view.byteLength >= 12;
        return {
            channel_id: view.getUint8(0),
            schedule_type: view.getUint8(1),
            days_mask: view.getUint8(2),
            hour: view.getUint8(3),
            minute: view.getUint8(4),
            watering_mode: view.getUint8(5),
            value: view.getUint16(6, true),
            auto_enabled: view.getUint8(8) !== 0,
            use_solar_timing: hasSolarFields ? view.getUint8(9) !== 0 : false,
            solar_event: hasSolarFields ? view.getUint8(10) : 0,
            solar_offset_minutes: hasSolarFields ? view.getInt8(11) : 0
        };
    }

    // --- Growing Environment ---

    public async readGrowingEnvironment(channelId: number): Promise<GrowingEnvData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');

        const deviceId = this.connectedDeviceId;
        const data = await this.enqueueGattOp(`growingEnv:read:${channelId}`, async () => {
            // Select channel (1B) then read full struct.
            const select = new DataView(new Uint8Array([channelId]).buffer);
            await this.writeWithRetryInner(deviceId, SERVICE_UUID, CHAR_UUIDS.GROWING_ENV, select, 3, 200);

            // Give firmware time to update the response buffer.
            await this.delay(60);

            return await this.readWithRetryInner(deviceId, SERVICE_UUID, CHAR_UUIDS.GROWING_ENV, 2, 200);
        });

        const env = this.parseGrowingEnv(data);
        // Update store with data READ from device
        useAppStore.getState().updateGrowingEnv(env);
        return env;
    }

    public async writeGrowingEnvironment(env: GrowingEnvData): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        console.log('[DEBUG BLE] writeGrowingEnvironment called with:', {
            channel_id: env.channel_id,
            plant_db_index: env.plant_db_index,
            soil_db_index: env.soil_db_index,
            irrigation_method_index: env.irrigation_method_index,
            use_area_based: env.use_area_based,
            coverage: env.coverage,
            auto_mode: env.auto_mode,
            max_volume_limit_l: env.max_volume_limit_l,
            planting_date_unix: env.planting_date_unix,
            days_after_planting: env.days_after_planting,
            latitude_deg: env.latitude_deg,
            plant_type: env.plant_type,
            specific_plant: env.specific_plant,
            water_need_factor: env.water_need_factor,
            custom_name: env.custom_name,
        });

        // NOTE: Do NOT update store after write - re-read to confirm
        // Serialize struct (71 bytes)
        const buffer = new ArrayBuffer(71);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);

        view.setUint8(0, env.channel_id);
        view.setUint16(1, env.plant_db_index, true);
        view.setUint8(3, env.soil_db_index);
        view.setUint8(4, env.irrigation_method_index);
        view.setUint8(5, env.use_area_based ? 1 : 0);

        if (env.use_area_based) {
            view.setFloat32(6, env.coverage.area_m2 || 0, true);
        } else {
            view.setUint16(6, env.coverage.plant_count || 0, true);
        }

        view.setUint8(10, env.auto_mode);
        view.setFloat32(11, env.max_volume_limit_l, true);
        view.setUint8(15, env.enable_cycle_soak ? 1 : 0);
        view.setUint32(16, env.planting_date_unix, true);
        view.setUint16(20, env.days_after_planting, true);
        view.setFloat32(22, env.latitude_deg, true);
        view.setUint8(26, env.sun_exposure_pct);

        // Legacy/Custom fields
        view.setUint8(27, env.plant_type);
        view.setUint16(28, env.specific_plant, true);
        view.setUint8(30, env.soil_type);
        view.setUint8(31, env.irrigation_method);
        view.setUint8(32, env.sun_percentage);

        const encoder = new TextEncoder();
        const nameBytes = encoder.encode(env.custom_name);
        bytes.set(nameBytes.slice(0, 32), 33);

        view.setFloat32(65, env.water_need_factor, true);
        view.setUint8(69, env.irrigation_freq_days);
        view.setUint8(70, env.prefer_area_based ? 1 : 0);

        // Use custom fragmentation for Growing Env
        await this.writeGrowingEnvFragmented(bytes, env.channel_id);
    }

    private async writeGrowingEnvFragmented(data: Uint8Array, channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;

        // Custom Header: [channel_id, frag_type, size_hi, size_lo] (Big Endian size for type 2)
        // frag_type 2 = Big Endian size
        const totalSize = data.length;
        const header = new Uint8Array(4);
        header[0] = channelId;
        header[1] = 0x02; // FRAGMENT_TYPE_FULL_BE
        header[2] = (totalSize >> 8) & 0xFF;
        header[3] = totalSize & 0xFF;

        const mtu = 20; // Conservative MTU
        const perFragmentDelayMs = 60;

        // Keep the full fragmented write serialized on the GATT queue to avoid
        // Android ERROR_GATT_WRITE_REQUEST_BUSY (201) from overlapping UI operations.
        await this.enqueueGattOp(`growingEnv:write:${channelId}`, async () => {
            const sendOnce = async () => {
                let offset = 0;

                // First packet: Header + Payload chunk
                const firstChunkSize = Math.min(mtu - 4, data.length);
                const firstPacket = new Uint8Array(4 + firstChunkSize);
                firstPacket.set(header, 0);
                firstPacket.set(data.slice(0, firstChunkSize), 4);

                await this.writeWithRetryInner(
                    deviceId,
                    SERVICE_UUID,
                    CHAR_UUIDS.GROWING_ENV,
                    new DataView(firstPacket.buffer),
                    5,
                    250
                );

                offset += firstChunkSize;
                await this.delay(perFragmentDelayMs);

                // Subsequent packets: Payload chunks
                while (offset < totalSize) {
                    const chunkSize = Math.min(mtu, totalSize - offset);
                    const chunk = data.slice(offset, offset + chunkSize);

                    await this.writeWithRetryInner(
                        deviceId,
                        SERVICE_UUID,
                        CHAR_UUIDS.GROWING_ENV,
                        new DataView(chunk.buffer),
                        5,
                        250
                    );

                    offset += chunkSize;
                    await this.delay(perFragmentDelayMs);
                }
            };

            // If Android/native gets into a congested state ("Write timeout." then 201 busy),
            // restarting the whole fragmentation session via the header frame is more reliable
            // than retrying only a single fragment.
            let lastErr: any;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await sendOnce();
                    return;
                } catch (err: any) {
                    lastErr = err;
                    if (!this.isGattCongestionError(err) || attempt === 3) {
                        throw err;
                    }
                    // Back off longer after timeouts/busy to let Android/firmware recover.
                    await this.delay(400 * attempt);
                }
            }
            throw lastErr;
        });
    }

    private parseGrowingEnv(view: DataView): GrowingEnvData {
        const decoder = new TextDecoder('utf-8');
        const nameBytes = new Uint8Array(view.buffer, 33, 32);
        let nameEnd = 0;
        while (nameEnd < 32 && nameBytes[nameEnd] !== 0) nameEnd++;
        const customName = decoder.decode(nameBytes.slice(0, nameEnd));

        const useAreaBased = view.getUint8(5) !== 0;
        const coverage: any = {};
        if (useAreaBased) {
            coverage.area_m2 = view.getFloat32(6, true);
        } else {
            coverage.plant_count = view.getUint16(6, true);
        }

        return {
            channel_id: view.getUint8(0),
            plant_db_index: view.getUint16(1, true),
            soil_db_index: view.getUint8(3),
            irrigation_method_index: view.getUint8(4),
            use_area_based: useAreaBased,
            coverage: coverage,
            auto_mode: view.getUint8(10),
            max_volume_limit_l: view.getFloat32(11, true),
            enable_cycle_soak: view.getUint8(15) !== 0,
            planting_date_unix: view.getUint32(16, true),
            days_after_planting: view.getUint16(20, true),
            latitude_deg: view.getFloat32(22, true),
            sun_exposure_pct: view.getUint8(26),
            plant_type: view.getUint8(27),
            specific_plant: view.getUint16(28, true),
            soil_type: view.getUint8(30),
            irrigation_method: view.getUint8(31),
            sun_percentage: view.getUint8(32),
            custom_name: customName,
            water_need_factor: view.getFloat32(65, true),
            irrigation_freq_days: view.getUint8(69),
            prefer_area_based: view.getUint8(70) !== 0
        };
    }

    // --- Rain Configuration ---

    public async readRainConfig(): Promise<RainConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual rain config from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.RAIN_SENSOR_CONFIG, 2, 150);
        const config = this.parseRainConfig(data);
        // Update store with data READ from device
        useAppStore.getState().setRainConfig(config);
        return config;
    }

    public async writeRainConfig(config: RainConfigData): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // NOTE: Do NOT update store after write - re-read to confirm
        const buffer = new ArrayBuffer(18);
        const view = new DataView(buffer);

        view.setFloat32(0, config.mm_per_pulse, true);
        view.setUint16(4, config.debounce_ms, true);
        view.setUint8(6, config.sensor_enabled ? 1 : 0);
        view.setUint8(7, config.integration_enabled ? 1 : 0);
        view.setFloat32(8, config.rain_sensitivity_pct, true);
        view.setFloat32(12, config.skip_threshold_mm, true);
        // Reserved bytes 16-17 are 0

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.RAIN_SENSOR_CONFIG, view, 3, 200);
    }

    private parseRainConfig(view: DataView): RainConfigData {
        return {
            mm_per_pulse: view.getFloat32(0, true),
            debounce_ms: view.getUint16(4, true),
            sensor_enabled: view.getUint8(6) !== 0,
            integration_enabled: view.getUint8(7) !== 0,
            rain_sensitivity_pct: view.getFloat32(8, true),
            skip_threshold_mm: view.getFloat32(12, true)
        };
    }

    // --- Timezone Configuration ---

    public async readTimezoneConfig(): Promise<TimezoneConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual timezone config from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.TIMEZONE_CONFIG, 2, 150);
        
        // RAW OUTPUT DEBUG
        const bytes = new Uint8Array(data.buffer);
        console.log(`[BLE] Timezone Config RAW bytes (${bytes.length}):`, Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        const config = this.parseTimezoneConfig(data);
        console.log('[BLE] Parsed Timezone Config:', JSON.stringify(config));
        // Update store with data READ from device
        useAppStore.getState().setTimezoneConfig(config);
        return config;
    }

    public async writeTimezoneConfig(config: TimezoneConfigData): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // NOTE: Do NOT update store after write - re-read to confirm
        const buffer = new ArrayBuffer(11);
        const view = new DataView(buffer);

        view.setInt16(0, config.utc_offset_minutes, true);
        view.setUint8(2, config.dst_enabled ? 1 : 0);
        view.setUint8(3, config.dst_start_month);
        view.setUint8(4, config.dst_start_week);
        view.setUint8(5, config.dst_start_dow);
        view.setUint8(6, config.dst_end_month);
        view.setUint8(7, config.dst_end_week);
        view.setUint8(8, config.dst_end_dow);
        view.setInt16(9, config.dst_offset_minutes, true);

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.TIMEZONE_CONFIG, view, 3, 200);
    }

    private parseTimezoneConfig(view: DataView): TimezoneConfigData {
        return {
            utc_offset_minutes: view.getInt16(0, true),
            dst_enabled: view.getUint8(2) !== 0,
            dst_start_month: view.getUint8(3),
            dst_start_week: view.getUint8(4),
            dst_start_dow: view.getUint8(5),
            dst_end_month: view.getUint8(6),
            dst_end_week: view.getUint8(7),
            dst_end_dow: view.getUint8(8),
            dst_offset_minutes: view.getInt16(9, true)
        };
    }

    // --- Channel Compensation Configuration ---

    /**
     * Select a channel for subsequent reads of channel compensation config.
     * Write 1 byte to select channel (0-7).
     */
    public async selectChannelCompensationConfig(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');

        await this.writeWithRetry(
            SERVICE_UUID,
            CHAR_UUIDS.CHANNEL_COMP_CONFIG,
            new DataView(new Uint8Array([channelId]).buffer),
            3,
            200
        );
    }

    /**
     * Read per-channel compensation configuration (44 bytes).
     * Optionally select channel first if channelId is provided.
     * 
     * ⚠️ Compensation only applies to TIME/VOLUME modes, NOT FAO-56 modes.
     */
    public async readChannelCompensationConfig(channelId?: number): Promise<ChannelCompensationConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const deviceId = this.connectedDeviceId;
        let data: DataView;

        // Select+read must be atomic; the characteristic caches the selected channel.
        if (channelId !== undefined) {
            if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');
            data = await this.enqueueGattOp(`channelCompConfig:read:${channelId}`, async () => {
                await this.writeWithRetryInner(
                    deviceId,
                    SERVICE_UUID,
                    CHAR_UUIDS.CHANNEL_COMP_CONFIG,
                    new DataView(new Uint8Array([channelId]).buffer),
                    3,
                    150
                );
                await this.delay(50);
                return await this.readWithRetryInner(deviceId, SERVICE_UUID, CHAR_UUIDS.CHANNEL_COMP_CONFIG, 2, 150);
            });
        } else {
            data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.CHANNEL_COMP_CONFIG, 2, 150);
        }

        const config = this.parseChannelCompensationConfig(data);
        // Update store with data READ from device
        useAppStore.getState().updateChannelCompensationConfig(config);
        return config;
    }

    /**
     * Read compensation config for all 8 channels.
     */
    public async readAllChannelCompensationConfigs(): Promise<ChannelCompensationConfigData[]> {
        const configs: ChannelCompensationConfigData[] = [];
        for (let i = 0; i < 8; i++) {
            const config = await this.readChannelCompensationConfig(i);
            configs.push(config);
            // Small delay between reads
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return configs;
    }

    /**
     * Write per-channel compensation configuration (44 bytes).
     * 
     * ⚠️ Compensation only applies to TIME/VOLUME watering modes.
     * For FAO-56 automatic modes (AUTO_QUALITY, AUTO_ECO), compensation is NEVER applied.
     */
    public async writeChannelCompensationConfig(config: ChannelCompensationConfigData): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (config.channel_id < 0 || config.channel_id > 7) throw new Error('Invalid channel ID (0-7)');

        // NOTE: Do NOT update store after write - wait for notification
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);

        // Channel ID @ 0
        view.setUint8(0, config.channel_id);

        // Rain compensation fields @ 1-15
        view.setUint8(1, config.rain.enabled ? 1 : 0);
        view.setFloat32(2, config.rain.sensitivity, true);
        view.setUint16(6, config.rain.lookback_hours, true);
        view.setFloat32(8, config.rain.skip_threshold_mm, true);
        view.setFloat32(12, config.rain.reduction_factor, true);

        // Temperature compensation fields @ 16-32
        view.setUint8(16, config.temp.enabled ? 1 : 0);
        view.setFloat32(17, config.temp.base_temperature, true);
        view.setFloat32(21, config.temp.sensitivity, true);
        view.setFloat32(25, config.temp.min_factor, true);
        view.setFloat32(29, config.temp.max_factor, true);

        // Timestamps and reserved are ignored on write (@ 33-43)
        view.setUint32(33, 0, true);
        view.setUint32(37, 0, true);
        view.setUint8(41, 0);
        view.setUint8(42, 0);
        view.setUint8(43, 0);

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.CHANNEL_COMP_CONFIG, view, 3, 200);
    }

    private parseChannelCompensationConfig(view: DataView): ChannelCompensationConfigData {
        return {
            channel_id: view.getUint8(0),
            rain: {
                enabled: view.getUint8(1) !== 0,
                sensitivity: view.getFloat32(2, true),
                lookback_hours: view.getUint16(6, true),
                skip_threshold_mm: view.getFloat32(8, true),
                reduction_factor: view.getFloat32(12, true),
            },
            temp: {
                enabled: view.getUint8(16) !== 0,
                base_temperature: view.getFloat32(17, true),
                sensitivity: view.getFloat32(21, true),
                min_factor: view.getFloat32(25, true),
                max_factor: view.getFloat32(29, true),
            },
            last_rain_calc_time: view.getUint32(33, true),
            last_temp_calc_time: view.getUint32(37, true),
        };
    }

    // --- Rain Integration Status ---

    public async readRainIntegrationStatus(): Promise<RainIntegrationStatusData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual rain integration status from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.RAIN_INTEGRATION, 2, 150);
        const status = this.parseRainIntegration(data);
        // Update store with data READ from device
        useAppStore.getState().setRainIntegration(status);
        return status;
    }

    private parseRainIntegration(view: DataView): RainIntegrationStatusData {
        // Handle 10-byte delta if needed (though read always returns full 78 bytes)
        if (view.byteLength === 10) {
            // Delta: [channel, reduction, skip, timestamp]
            // We can't fully reconstruct the status from delta, so we might need to handle this differently
            // For now, we assume full snapshot for read()
            throw new Error('Received delta packet in read()');
        }

        const channelReduction: number[] = [];
        for (let i = 0; i < 8; i++) {
            channelReduction.push(view.getFloat32(30 + i * 4, true));
        }

        const channelSkip: boolean[] = [];
        for (let i = 0; i < 8; i++) {
            channelSkip.push(view.getUint8(62 + i) !== 0);
        }

        return {
            sensor_active: view.getUint8(0) !== 0,
            integration_enabled: view.getUint8(1) !== 0,
            last_pulse_time: view.getUint32(2, true),
            calibration_mm_per_pulse: view.getFloat32(6, true),
            rainfall_last_hour: view.getFloat32(10, true),
            rainfall_last_24h: view.getFloat32(14, true),
            rainfall_last_48h: view.getFloat32(18, true),
            sensitivity_pct: view.getFloat32(22, true),
            skip_threshold_mm: view.getFloat32(26, true),
            channel_reduction_pct: channelReduction,
            channel_skip_irrigation: channelSkip,
            hourly_entries: view.getUint16(70, true),
            daily_entries: view.getUint16(72, true),
            storage_usage_bytes: view.getUint32(74, true)
        };
    }

    // --- Compensation Status ---

    public async selectCompensationChannel(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        await this.writeWithRetry(
            SERVICE_UUID,
            CHAR_UUIDS.COMPENSATION_STATUS,
            new DataView(new Uint8Array([channelId]).buffer)
        );
    }

    public async readCompensationStatus(channelId: number): Promise<CompensationStatusData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const deviceId = this.connectedDeviceId;
        return this.enqueueGattOp(`compensation:${channelId}`, async () => {
            await this.writeWithRetryInner(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.COMPENSATION_STATUS,
                new DataView(new Uint8Array([channelId]).buffer),
                3,
                150
            );

            const data = await this.readWithRetryInner(deviceId, SERVICE_UUID, CHAR_UUIDS.COMPENSATION_STATUS, 2, 150);
            const status = this.parseCompensationStatus(data);
            useAppStore.getState().updateCompensation(status);
            return status;
        });
    }

    private parseCompensationStatus(view: DataView): CompensationStatusData {
        return {
            channel_id: view.getUint8(0),
            rain: {
                active: view.getUint8(1) !== 0,
                recent_rainfall_mm: view.getFloat32(2, true),
                reduction_percentage: view.getFloat32(6, true),
                skip_watering: view.getUint8(10) !== 0,
                calculation_time: view.getUint32(11, true)
            },
            temperature: {
                active: view.getUint8(15) !== 0,
                current_temperature: view.getFloat32(16, true),
                factor: view.getFloat32(20, true),
                adjusted_requirement: view.getFloat32(24, true),
                calculation_time: view.getUint32(28, true)
            },
            any_compensation_active: view.getUint8(32) !== 0
        };
    }

    // --- Auto Calculation Status ---

    public async selectAutoCalcChannel(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        await this.writeWithRetry(
            SERVICE_UUID,
            CHAR_UUIDS.AUTO_CALC_STATUS,
            new DataView(new Uint8Array([channelId]).buffer)
        );
    }

    public async readAutoCalcStatus(channelId: number): Promise<AutoCalcStatusData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        return this.dedupeInFlight(`autocalc:${channelId}`, async () => {
            const deviceId = this.connectedDeviceId as string;
            return this.enqueueGattOp(`autocalc:${channelId}`, async () => {
                // IMPORTANT: select+read must be atomic; this characteristic caches the selected channel.
                await this.writeWithRetryInner(
                    deviceId,
                    SERVICE_UUID,
                    CHAR_UUIDS.AUTO_CALC_STATUS,
                    new DataView(new Uint8Array([channelId]).buffer),
                    3,
                    150
                );

                const data = await this.readWithRetryInner(deviceId, SERVICE_UUID, CHAR_UUIDS.AUTO_CALC_STATUS, 2, 150);
                const status = this.parseAutoCalcStatus(data);
                useAppStore.getState().setAutoCalcData(status.channel_id, status);
                return status;
            });
        });
    }

    /**
     * Reads the global Auto Calc Status using FFh (0xFF) channel selector.
     * Firmware may interpret this as either "global" or "first auto-calc channel".
     */
    public async readAutoCalcStatusGlobal(): Promise<AutoCalcStatusData> {
        const status = await this.readAutoCalcStatus(0xFF);
        // Also set globalAutoCalcStatus for components that use it directly
        useAppStore.getState().setGlobalAutoCalcStatus(status);
        return status;
    }

    public async readAutoCalcStatusRaw(channelId: number): Promise<Uint8Array> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        return this.dedupeInFlight(`autocalcRaw:${channelId}`, async () => {
            const deviceId = this.connectedDeviceId as string;
            return this.enqueueGattOp(`autocalcRaw:${channelId}`, async () => {
                await this.writeWithRetryInner(
                    deviceId,
                    SERVICE_UUID,
                    CHAR_UUIDS.AUTO_CALC_STATUS,
                    new DataView(new Uint8Array([channelId]).buffer),
                    3,
                    150
                );

                const data = await this.readWithRetryInner(deviceId, SERVICE_UUID, CHAR_UUIDS.AUTO_CALC_STATUS, 2, 150);
                return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
            });
        });
    }

    public async readAutoCalcStatusGlobalRaw(): Promise<Uint8Array> {
        return this.readAutoCalcStatusRaw(0xFF);
    }

    private parseAutoCalcStatus(view: DataView): AutoCalcStatusData {
        // DEBUG: Log raw bytes for next_irrigation_time at offset 31-34
        const b31 = view.getUint8(31);
        const b32 = view.getUint8(32);
        const b33 = view.getUint8(33);
        const b34 = view.getUint8(34);
        const nextEpoch = view.getUint32(31, true); // little-endian
        const nextDate = new Date(nextEpoch * 1000);
        console.log('[DEBUG AutoCalcStatus] next_irrigation_time parsing:', {
            rawBytes: `[${b31}, ${b32}, ${b33}, ${b34}]`,
            rawBytesHex: `0x${b31.toString(16).padStart(2, '0')} 0x${b32.toString(16).padStart(2, '0')} 0x${b33.toString(16).padStart(2, '0')} 0x${b34.toString(16).padStart(2, '0')}`,
            parsedEpoch: nextEpoch,
            asDate: nextDate.toISOString(),
            asLocalTime: nextDate.toLocaleString(),
            channel_id: view.getUint8(0),
        });

        return {
            channel_id: view.getUint8(0),
            calculation_active: view.getUint8(1),
            irrigation_needed: view.getUint8(2),
            current_deficit_mm: view.getFloat32(3, true),
            et0_mm_day: view.getFloat32(7, true),
            crop_coefficient: view.getFloat32(11, true),
            net_irrigation_mm: view.getFloat32(15, true),
            gross_irrigation_mm: view.getFloat32(19, true),
            calculated_volume_l: view.getFloat32(23, true),
            last_calculation_time: view.getUint32(27, true),
            next_irrigation_time: view.getUint32(31, true),
            days_after_planting: view.getUint16(35, true),
            phenological_stage: view.getUint8(37),
            quality_mode: view.getUint8(38),
            volume_limited: view.getUint8(39),
            auto_mode: view.getUint8(40),
            raw_mm: view.getFloat32(41, true),
            effective_rain_mm: view.getFloat32(45, true),
            calculation_error: view.getUint8(49),
            etc_mm_day: view.getFloat32(50, true),
            volume_liters: view.getFloat32(54, true),
            cycle_count: view.getUint8(58),
            cycle_duration_min: view.getUint8(59)
        };
    }

    // --- Flow Sensor ---

    public async readFlowSensor(): Promise<FlowSensorData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual flow sensor data from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.FLOW_SENSOR, 2, 150);
        const flowData = this.parseFlowSensor(data);
        // Update store with data READ from device
        useAppStore.getState().setFlowSensor(flowData);
        return flowData;
    }

    private parseFlowSensor(view: DataView): FlowSensorData {
        return {
            flow_rate_or_pulses: view.getUint32(0, true)
        };
    }

    // --- Task Queue ---

    public async readTaskQueue(): Promise<TaskQueueData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual task queue from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.TASK_QUEUE, 2, 150);
        const queueData = this.parseTaskQueue(data);
        // Update store with data READ from device
        useAppStore.getState().setTaskQueue(queueData);
        return queueData;
    }

    private parseTaskQueue(view: DataView): TaskQueueData {
        return {
            pending_count: view.getUint8(0),
            completed_tasks: view.getUint8(1),
            current_channel: view.getUint8(2),
            current_task_type: view.getUint8(3),
            current_value: view.getUint16(4, true),
            command: view.getUint8(6),
            task_id_to_delete: view.getUint8(7),
            active_task_id: view.getUint8(8)
        };
    }

    // --- Statistics ---

    public async readStatistics(channelId: number): Promise<StatisticsData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const deviceId = this.connectedDeviceId;
        return this.enqueueGattOp(`stats:${channelId}`, async () => {
            await this.writeWithRetryInner(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.STATISTICS,
                new DataView(new Uint8Array([channelId]).buffer),
                3,
                150
            );

            const data = await this.readWithRetryInner(deviceId, SERVICE_UUID, CHAR_UUIDS.STATISTICS, 2, 150);
            const statsData = this.parseStatistics(data);
            useAppStore.getState().updateStatistics(statsData);
            return statsData;
        });
    }

    private parseStatistics(view: DataView): StatisticsData {
        return {
            channel_id: view.getUint8(0),
            total_volume: view.getUint32(1, true),
            last_volume: view.getUint32(5, true),
            last_watering: view.getUint32(9, true),
            count: view.getUint16(13, true)
        };
    }

    /**
     * Read statistics for all 8 channels
     * Returns array of statistics data ordered by channel_id
     */
    public async readAllStatistics(): Promise<StatisticsData[]> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const allStats: StatisticsData[] = [];

        for (let ch = 0; ch < 8; ch++) {
            try {
                const stats = await this.readStatistics(ch);
                allStats.push(stats);
                // Small delay between reads to avoid flooding
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.warn(`[BLE] Failed to read stats for channel ${ch}:`, error);
                // Add empty stats for this channel
                allStats.push({
                    channel_id: ch,
                    total_volume: 0,
                    last_volume: 0,
                    last_watering: 0,
                    count: 0
                });
            }
        }

        return allStats;
    }

    /**
     * Reset statistics for a specific channel
     * @param channelId - Channel 0-7 to reset
     */
    public async resetChannelStatistics(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID');

        // 15-byte frame with all zeros = reset command
        const data = new Uint8Array(15);
        data[0] = channelId;
        // All other bytes stay 0 = reset signal

        console.log(`[BLE] Resetting statistics for channel ${channelId}`);
        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.STATISTICS, new DataView(data.buffer), 3, 200);
    }

    /**
     * Reset statistics for all channels
     */
    public async resetAllStatistics(): Promise<void> {
        for (let ch = 0; ch < 8; ch++) {
            try {
                await this.resetChannelStatistics(ch);
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.warn(`[BLE] Failed to reset stats for channel ${ch}:`, error);
            }
        }
    }

    // --- Alarm Status ---

    public async readAlarmStatus(): Promise<AlarmData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const store = useAppStore.getState();
        const previousAlarm = store.alarmStatus;

        // Read actual alarm status from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.ALARM_STATUS, 2, 150);
        const alarmData = this.parseAlarm(data);
        // Update store with data READ from device
        store.setAlarmStatus(alarmData);

        // Keep alarm history consistent for both READ and NOTIFY paths.
        if (alarmData.alarm_code === 0) {
            if (previousAlarm && previousAlarm.alarm_code !== 0) {
                store.clearAlarmFromHistory(previousAlarm.timestamp);
            }
        } else if (!previousAlarm || previousAlarm.timestamp !== alarmData.timestamp) {
            if (isAlarmCritical(alarmData.alarm_code)) {
                this.triggerAlarmHaptic();
            }
            store.addAlarmToHistory({
                alarm_code: alarmData.alarm_code,
                alarm_data: alarmData.alarm_data,
                timestamp: alarmData.timestamp
            });
        }
        return alarmData;
    }

    private parseAlarm(view: DataView): AlarmData {
        return {
            alarm_code: view.getUint8(0),
            alarm_data: view.getUint16(1, true),
            timestamp: view.getUint32(3, true)
        };
    }

    // --- Diagnostics ---

    public async readDiagnostics(): Promise<DiagnosticsData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual diagnostics from device (SOURCE OF TRUTH)
        const data = await this.readWithRetry(SERVICE_UUID, CHAR_UUIDS.DIAGNOSTICS, 2, 150);
        const diagData = this.parseDiagnostics(data);
        // Update store with data READ from device
        useAppStore.getState().setDiagnostics(diagData);
        return diagData;
    }

    private parseDiagnostics(view: DataView): DiagnosticsData {
        return {
            uptime: view.getUint32(0, true),
            error_count: view.getUint16(4, true),
            last_error: view.getInt8(6),
            valve_status: view.getUint8(7),
            battery_level: view.getUint8(8),
            reserved: [view.getUint8(9), view.getUint8(10), view.getUint8(11)]
        };
    }

    // --- Hydraulic Status (Characteristic #29 - UUID: de22) ---

    /**
     * Read hydraulic status for a specific channel.
     * Write channel selector byte first, then read the 48-byte response.
     * @param channelId - 0-7, or 0xFF for current active channel
     */
    public async readHydraulicStatus(channelId: number = 0xFF): Promise<HydraulicStatusData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (!(channelId === 0xFF || (channelId >= 0 && channelId <= 7))) {
            throw new Error('Invalid channel ID (0-7) or 0xFF for active channel');
        }

        const deviceId = this.connectedDeviceId;
        const data = await this.enqueueGattOp(`hydraulicStatus:read:${channelId}`, async () => {
            // Write channel selector
            const selector = new Uint8Array([channelId]);
            await this.writeWithRetryInner(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.HYDRAULIC_STATUS,
                new DataView(selector.buffer),
                3,
                200
            );

            // Give firmware time to update response buffer
            await this.delay(40);

            // Read the 48-byte response
            return await this.readWithRetryInner(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.HYDRAULIC_STATUS,
                2,
                200
            );
        });
        const hydraulicData = this.parseHydraulicStatus(data);
        useAppStore.getState().setHydraulicStatus(hydraulicData);
        return hydraulicData;
    }

    private parseHydraulicStatus(view: DataView): HydraulicStatusData {
        if (view.byteLength < 48) {
            throw new Error(`Hydraulic status data too short: ${view.byteLength}`);
        }
        return {
            channel_id: view.getUint8(0),
            profile_type: view.getUint8(1),
            lock_level: view.getUint8(2),
            lock_reason: view.getUint8(3),
            nominal_flow_ml_min: view.getUint32(4, true),
            ramp_up_time_sec: view.getUint16(8, true),
            tolerance_high_percent: view.getUint8(10),
            tolerance_low_percent: view.getUint8(11),
            is_calibrated: view.getUint8(12) === 1,
            monitoring_enabled: view.getUint8(13) === 1,
            learning_runs: view.getUint8(14),
            stable_runs: view.getUint8(15),
            estimated: view.getUint8(16) === 1,
            manual_override_active: view.getUint8(17) === 1,
            // reserved0 @ 18-19
            lock_at_epoch: view.getUint32(20, true),
            retry_after_epoch: view.getUint32(24, true),
            no_flow_runs: view.getUint8(28),
            high_flow_runs: view.getUint8(29),
            unexpected_flow_runs: view.getUint8(30),
            // reserved1 @ 31
            last_anomaly_epoch: view.getUint32(32, true),
            global_lock_level: view.getUint8(36),
            global_lock_reason: view.getUint8(37),
            // reserved2 @ 38-39
            global_lock_at_epoch: view.getUint32(40, true),
            global_retry_after_epoch: view.getUint32(44, true)
        };
    }

    // --- Task Queue Commands ---

    /**
     * Write a command to the Task Queue characteristic.
     * Commands: 0=None, 1=Start Next, 2=Pause, 3=Resume, 4=Cancel, 5=Clear All
     */
    public async writeTaskQueueCommand(command: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (command < 0 || command > 5) throw new Error('Invalid command (0-5)');

        // Build full 9-byte struct with command
        const data = new Uint8Array(9);
        const view = new DataView(data.buffer);

        // All fields except command are ignored on write
        view.setUint8(0, 0);  // pending_count (ignored)
        view.setUint8(1, 0);  // completed_tasks (ignored)
        view.setUint8(2, 0xFF);  // current_channel (ignored)
        view.setUint8(3, 0);  // current_task_type (ignored)
        view.setUint16(4, 0, true);  // current_value (ignored)
        view.setUint8(6, command);  // command - THE ONLY FIELD THAT MATTERS
        view.setUint8(7, 0);  // task_id_to_delete (reserved)
        view.setUint8(8, 0);  // active_task_id (ignored)

        console.log(`[BLE] Writing Task Queue command: ${command}`);
        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.TASK_QUEUE, view, 3, 200);
    }

    /**
     * Start the next pending task in the queue
     */
    public async startNextTask(): Promise<void> {
        await this.writeTaskQueueCommand(1);  // START_NEXT
    }

    /**
     * Pause the currently running task
     */
    public async pauseCurrentTask(): Promise<void> {
        await this.writeTaskQueueCommand(2);  // PAUSE
    }

    /**
     * Resume a paused task
     */
    public async resumeCurrentTask(): Promise<void> {
        await this.writeTaskQueueCommand(3);  // RESUME
    }

    /**
     * Cancel the currently active task
     */
    public async cancelCurrentTask(): Promise<void> {
        await this.writeTaskQueueCommand(4);  // CANCEL
    }

    /**
     * Clear all pending tasks from the queue
     */
    public async clearTaskQueue(): Promise<void> {
        await this.writeTaskQueueCommand(5);  // CLEAR_ALL
    }

    // --- Current Task Control ---

    /**
     * Write control opcode to Current Task characteristic.
     * Opcodes: 0=Stop, 1=Pause, 2=Resume
     */
    public async writeCurrentTaskControl(opcode: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (opcode < 0 || opcode > 2) throw new Error('Invalid opcode (0-2)');

        // Single byte write
        const data = new Uint8Array([opcode]);

        console.log(`[BLE] Writing Current Task control: ${opcode}`);
        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.CURRENT_TASK, new DataView(data.buffer), 3, 200);
    }

    /**
     * Stop/Cancel the current watering task
     */
    public async stopCurrentWatering(): Promise<void> {
        await this.writeCurrentTaskControl(0);  // STOP
    }

    /**
     * Pause the current watering task
     */
    public async pauseCurrentWatering(): Promise<void> {
        await this.writeCurrentTaskControl(1);  // PAUSE
    }

    /**
     * Resume a paused watering task
     */
    public async resumeCurrentWatering(): Promise<void> {
        await this.writeCurrentTaskControl(2);  // RESUME
    }

    // --- Alarm Control ---

    /**
     * Clear alarm(s) by writing to Alarm Status characteristic.
     * @param alarmCode - 0x00 or 0xFF to clear all, or specific code (0x01-0x0D) to clear specific alarm
     */
    public async clearAlarm(alarmCode: number = 0x00): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // Single byte write clears alarms
        const data = new Uint8Array([alarmCode]);

        console.log(`[BLE] Clearing alarm with code: 0x${alarmCode.toString(16)}`);
        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.ALARM_STATUS, new DataView(data.buffer), 3, 200);
    }

    /**
     * Clear all active alarms
     */
    public async clearAllAlarms(): Promise<void> {
        await this.clearAlarm(0x00);
    }

    /**
     * Acknowledge/clear a specific alarm by its code
     */
    public async acknowledgeAlarm(alarmCode: number): Promise<void> {
        if (alarmCode < 0x01 || alarmCode > 0x0D) {
            throw new Error('Invalid alarm code (0x01-0x0D)');
        }
        await this.clearAlarm(alarmCode);
    }

    // =========================================================================
    // HISTORY MANAGEMENT (Characteristic #12 - UUID: defc)
    // =========================================================================

    /**
     * Query watering history from the device.
     * Results come back via notifications as fragmented data.
     * @param historyType - 0=detailed, 1=daily, 2=monthly, 3=annual, 0xFF=clear
     * @param channelId - 0-7 or 0xFF for all channels
     * @param entryIndex - Page/offset for pagination
     * @param count - Requested entries (1-50)
     * @param startTimestamp - Optional UTC filter start
     * @param endTimestamp - Optional UTC filter end
     */
    public async queryWateringHistory(
        historyType: number = 0,
        channelId: number = 0xFF,
        entryIndex: number = 0,
        count: number = 20,
        startTimestamp: number = 0,
        endTimestamp: number = 0
    ): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // 12-byte query header
        const data = new Uint8Array(12);
        const view = new DataView(data.buffer);

        data[0] = channelId;
        data[1] = historyType;
        data[2] = entryIndex;
        data[3] = Math.min(Math.max(count, 1), 50);  // Clamp 1-50
        view.setUint32(4, startTimestamp, true);  // LE
        view.setUint32(8, endTimestamp, true);    // LE

        console.log(`[BLE] Querying watering history: type=${historyType}, ch=${channelId}, index=${entryIndex}, count=${count}`);
        // Writes to HISTORY_MGMT can be spammed by UI effects; serialize + retry.
        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.HISTORY_MGMT, view, 3, 200);
    }

    /**
     * Query watering history and wait until the response is fully received/parsed.
     * Completion is driven by notifications + fragmentation reassembly.
     */
    public async fetchWateringHistory(
        historyType: number = 0,
        channelId: number = 0xFF,
        entryIndex: number = 0,
        count: number = 20,
        startTimestamp: number = 0,
        endTimestamp: number = 0,
        timeoutMs: number = 5000
    ): Promise<void> {
        const key = `wateringHistory:${historyType}:${channelId}:${entryIndex}:${count}:${startTimestamp}:${endTimestamp}`;
        return this.dedupeInFlight(key, async () => {
            this.lastWateringRequestedType = historyType;
            const waitFor = this.createPendingVoidRequest(
                this.pendingWateringHistoryRequests,
                historyType,
                timeoutMs,
                'Watering history'
            );
            await this.queryWateringHistory(historyType, channelId, entryIndex, count, startTimestamp, endTimestamp);
            await waitFor;
        });
    }

    /**
     * Get detailed watering history (individual events)
     */
    public async getDetailedHistory(channelId: number = 0xFF, page: number = 0, count: number = 20): Promise<void> {
        await this.queryWateringHistory(0, channelId, page, count);
    }

    /**
     * Get daily aggregated watering history
     */
    public async getDailyHistory(channelId: number = 0xFF, daysBack: number = 0): Promise<void> {
        await this.queryWateringHistory(1, channelId, daysBack, 7);
    }

    /**
     * Get monthly aggregated watering history
     */
    public async getMonthlyHistory(channelId: number = 0xFF, monthsBack: number = 0): Promise<void> {
        await this.queryWateringHistory(2, channelId, monthsBack, 6);
    }

    /**
     * Get annual aggregated watering history
     */
    public async getAnnualHistory(channelId: number = 0xFF, yearsBack: number = 0): Promise<void> {
        await this.queryWateringHistory(3, channelId, yearsBack, 3);
    }

    /**
     * Clear all stored watering history (destructive!)
     */
    public async clearWateringHistory(): Promise<void> {
        await this.queryWateringHistory(0xFF, 0xFF, 0, 1);
    }

    // =========================================================================
    // RAIN HISTORY CONTROL (Characteristic #20 - UUID: de14)
    // =========================================================================

    /**
     * Query rain history from the device.
     * Results come back via notifications.
     * @param command - 0x01=hourly, 0x02=daily, 0x03=recent, 0x10=reset, 0x20=calibrate
     * @param startTimestamp - Inclusive start (0 = oldest)
     * @param endTimestamp - Inclusive end (0 = now)
     * @param maxEntries - 1-65535
     * @param dataType - Must match command (0=hourly, 1=daily)
     */
    public async queryRainHistory(
        command: number,
        startTimestamp: number = 0,
        endTimestamp: number = 0,
        maxEntries: number = 24,
        dataType: number = 0
    ): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // 16-byte command payload
        const data = new Uint8Array(16);
        const view = new DataView(data.buffer);

        data[0] = command;
        view.setUint32(1, startTimestamp, true);
        view.setUint32(5, endTimestamp, true);
        view.setUint16(9, maxEntries, true);
        data[11] = dataType;
        // reserved[4] stays 0

        console.log(`[BLE] Querying rain history: cmd=${command}, max=${maxEntries}`);
        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.RAIN_HISTORY, view, 3, 200);
    }

    /**
     * Query rain history and wait until the response is fully received/parsed.
     */
    public async fetchRainHistory(
        command: number,
        startTimestamp: number = 0,
        endTimestamp: number = 0,
        maxEntries: number = 24,
        dataType: number = 0,
        timeoutMs: number = 5000
    ): Promise<void> {
        this.lastRainExpectedDataType = dataType;
        const waitFor = this.createPendingVoidRequest(
            this.pendingRainHistoryRequests,
            dataType,
            timeoutMs,
            'Rain history'
        );
        await this.queryRainHistory(command, startTimestamp, endTimestamp, maxEntries, dataType);
        await waitFor;
    }

    /**
     * Get hourly rain data for the last N hours
     */
    public async getRainHourlyHistory(hours: number = 24): Promise<void> {
        const key = `rainHourlyHistory:${hours}`;
        return this.dedupeInFlight(key, async () => {
            const now = Math.floor(Date.now() / 1000);
            await this.queryRainHistory(0x01, now - hours * 3600, now, hours, 0);
        });
    }

    /**
     * Get daily rain data for the last N days
     */
    public async getRainDailyHistory(days: number = 7): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        await this.queryRainHistory(0x02, now - days * 86400, now, days, 1);
    }

    /**
     * Get recent rain totals (last hour, 24h, 7d) - single response
     */
    public async getRainRecentTotals(): Promise<void> {
        await this.queryRainHistory(0x03, 0, 0, 1, 0);
    }

    /**
     * Reset all rain history data (destructive!)
     */
    public async resetRainHistory(): Promise<void> {
        await this.queryRainHistory(0x10, 0, 0, 1, 0);
    }

    /**
     * Trigger rain sensor calibration
     */
    public async calibrateRainSensor(): Promise<void> {
        await this.queryRainHistory(0x20, 0, 0, 1, 0);
    }

    // =========================================================================
    // ENVIRONMENTAL HISTORY (Characteristic #22 - UUID: de16)
    // =========================================================================

    /**
     * Query environmental history from the device.
     * Results come back via notifications.
     * @param command - 0x01=detailed, 0x02=hourly, 0x03=daily, 0x04=trends, 0x05=clear
     * @param startTime - Inclusive Unix start (0 = earliest)
     * @param endTime - Inclusive Unix end (0 = now)
     * @param dataType - 0=detailed, 1=hourly, 2=daily (ignored for trends/clear)
     * @param maxRecords - 1-100
     * @param fragmentId - 0-based fragment selector for pagination
     */
    public async queryEnvHistory(
        command: number,
        startTime: number = 0,
        endTime: number = 0,
        dataType: number = 0,
        maxRecords: number = 24,
        fragmentId: number = 0
    ): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // 20-byte request (match firmware expectation)
        const data = new Uint8Array(20);
        const view = new DataView(data.buffer);

        data[0] = command;
        view.setUint32(1, startTime, true);
        view.setUint32(5, endTime, true);
        data[9] = dataType;
        data[10] = Math.min(Math.max(maxRecords, 1), 100);  // Clamp 1-100
        data[11] = fragmentId;
        // reserved[8] stays 0

        console.log(`[BLE] Querying env history: cmd=${command}, type=${dataType}, max=${maxRecords}, frag=${fragmentId}`);
        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.ENV_HISTORY, view, 3, 200);
    }

    /**
     * Environmental history uses fragment_id paging (one unified-header fragment per notify).
     * This method pages until entry_count==0 or an error status is returned.
     */
    public async fetchEnvHistoryPaged(
        command: number,
        startTime: number = 0,
        endTime: number = 0,
        dataType: number = 0,
        maxRecords: number = 24,
        timeoutMsPerFragment: number = 8000,
        maxFragments: number = 200
    ): Promise<void> {
        const store = useAppStore.getState();

        // Clear destination list for a fresh fetch
        if (dataType === 0) store.setEnvHistoryDetailed([]);
        if (dataType === 1) store.setEnvHistoryHourly([]);
        if (dataType === 2) store.setEnvHistoryDaily([]);

        let fragmentId = 0;
        for (let i = 0; i < maxFragments; i++) {
            // Web BLE notifications can occasionally be delayed; retry a timed-out fragment once.
            let header: any | null = null;
            let payload: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const res = await this.requestEnvHistoryFragment(
                        command,
                        startTime,
                        endTime,
                        dataType,
                        maxRecords,
                        fragmentId,
                        timeoutMsPerFragment
                    );
                    header = res.header;
                    payload = res.payload;
                    break;
                } catch (e: any) {
                    const msg = String(e?.message || e);
                    if (attempt === 0 && msg.toLowerCase().includes('timed out')) {
                        console.warn(`[BLE] Env history fragment ${fragmentId} timed out; retrying once...`);
                        await this.delay(120);
                        continue;
                    }
                    throw e;
                }
            }

            if (!header) {
                throw new Error(`Environmental history error: failed to fetch fragment ${fragmentId}`);
            }

            if (header.status !== 0) {
                if (header.status === 0x07) throw new Error('Environmental history rate limited');
                // Per BLE docs: 0x03 means "no data" for the requested range/command.
                // Treat it as an empty result (not an exception).
                if (header.status === 0x03) {
                    console.info('[BLE] Env history: no data for requested range');
                    break;
                }
                // Some firmware versions signal "no more pages" using status=0x06 (invalid fragment)
                // once the client requests a fragment beyond the available range.
                if (header.status === 0x06) {
                    console.warn('[BLE] Env history: device reported invalid fragment; treating as end-of-data');
                    break;
                }
                throw new Error(`Environmental history error: 0x${header.status.toString(16)}`);
            }

            if (header.entry_count === 0 || payload.byteLength === 0) {
                break;
            }

            const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
            if (dataType === 0) {
                const entries = this.parseEnvDetailedEntries(dv, header.entry_count);
                const current = useAppStore.getState().envHistoryDetailed;
                store.setEnvHistoryDetailed(current.concat(entries));
            } else if (dataType === 1) {
                const entries = this.parseEnvHourlyEntries(dv, header.entry_count);
                const current = useAppStore.getState().envHistoryHourly;
                store.setEnvHistoryHourly(current.concat(entries));
            } else if (dataType === 2) {
                const entries = this.parseEnvDailyEntries(dv, header.entry_count);
                const current = useAppStore.getState().envHistoryDaily;
                store.setEnvHistoryDaily(current.concat(entries));
            }

            fragmentId += 1;
            await this.delay(80);
        }
    }

    /**
     * Get detailed environmental samples (12B each - temp, humidity, pressure)
     */
    public async getEnvDetailedHistory(hours: number = 24): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        await this.queryEnvHistory(0x01, now - hours * 3600, now, 0, Math.min(hours, 100));
    }

    /**
     * Get hourly environmental aggregates (16B each)
     */
    public async getEnvHourlyHistory(hours: number = 24): Promise<void> {
        const key = `envHourlyHistory:${hours}`;
        return this.dedupeInFlight(key, async () => {
            const now = Math.floor(Date.now() / 1000);
            await this.queryEnvHistory(0x02, now - hours * 3600, now, 1, Math.min(hours, 100));
        });
    }

    /**
     * Get daily environmental aggregates (22B each)
     */
    public async getEnvDailyHistory(days: number = 7): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        await this.queryEnvHistory(0x03, now - days * 86400, now, 2, Math.min(days, 100));
    }

    /**
     * Get 24h trends analysis (single 24B record)
     */
    public async getEnvTrends(): Promise<void> {
        await this.queryEnvHistory(0x04, 0, 0, 0, 1);
    }

    /**
     * Clear all environmental history (destructive!)
     */
    public async clearEnvHistory(): Promise<void> {
        await this.queryEnvHistory(0x05, 0, 0, 0, 1);
    }

    // =========================================================================
    // HISTORY PARSING HELPERS
    // =========================================================================

    private getEntryCountFromPayload(headerCount: number | undefined, payloadBytes: number, entrySize: number): number {
        if (entrySize <= 0) return 0;
        const maxEntries = Math.floor(payloadBytes / entrySize);
        if (!headerCount || headerCount <= 0) return maxEntries;
        return Math.min(headerCount, maxEntries);
    }

    private resolveEntrySize(payloadBytes: number, headerCount: number | undefined, candidateSizes: number[]): number {
        const uniqueCandidates = Array.from(new Set(candidateSizes)).filter((size) => size > 0);
        if (uniqueCandidates.length === 0) return 1;

        if (headerCount && headerCount > 0 && payloadBytes % headerCount === 0) {
            const derived = payloadBytes / headerCount;
            if (uniqueCandidates.includes(derived)) {
                return derived;
            }
            const min = Math.min(...uniqueCandidates);
            const max = Math.max(...uniqueCandidates) + 4;
            if (derived >= min && derived <= max) {
                return derived;
            }
        }

        for (const size of uniqueCandidates) {
            if (payloadBytes % size === 0) {
                return size;
            }
        }

        return uniqueCandidates[0];
    }

    /**
     * Parse watering history detailed entries from notification payload
     */
    public parseWateringDetailedEntries(payload: DataView, entryCount: number): HistoryDetailedEntry[] {
        const entries: HistoryDetailedEntry[] = [];
        let offset = 0;
        const ENTRY_SIZE = 24;

        for (let i = 0; i < entryCount && offset + ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                timestamp: payload.getUint32(offset, true),
                channel_id: payload.getUint8(offset + 4),
                event_type: payload.getUint8(offset + 5),
                mode: payload.getUint8(offset + 6),
                target_value_ml: payload.getUint16(offset + 7, true),
                actual_value_ml: payload.getUint16(offset + 9, true),
                total_volume_ml: payload.getUint16(offset + 11, true),
                trigger_type: payload.getUint8(offset + 13),
                success_status: payload.getUint8(offset + 14),
                error_code: payload.getUint8(offset + 15),
                flow_rate_avg: payload.getUint16(offset + 16, true),
            });
            offset += ENTRY_SIZE;
        }
        return entries;
    }

    /**
     * Parse watering history daily aggregate entries.
     * Entry can be 15B packed or 16B aligned depending on firmware build.
     */
    public parseWateringDailyEntries(payload: DataView, entryCount: number, entrySize: number = 15): HistoryDailyEntry[] {
        const entries: HistoryDailyEntry[] = [];
        let offset = 0;
        const MIN_ENTRY_SIZE = 15;

        for (let i = 0; i < entryCount && offset + MIN_ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                day_index: payload.getUint16(offset, true),
                year: payload.getUint16(offset + 2, true),
                watering_sessions_ok: payload.getUint8(offset + 4),
                total_volume_ml: payload.getUint32(offset + 5, true),
                total_duration_est_sec: payload.getUint16(offset + 9, true),
                avg_flow_rate: payload.getUint16(offset + 11, true),
                success_rate: payload.getUint8(offset + 13),
                error_count: payload.getUint8(offset + 14),
            });
            offset += entrySize;
        }
        return entries;
    }

    /**
     * Parse watering history monthly aggregate entries.
     * Entry can be 15B packed or 16B aligned depending on firmware build.
     */
    public parseWateringMonthlyEntries(payload: DataView, entryCount: number, entrySize: number = 15): HistoryMonthlyEntry[] {
        const entries: HistoryMonthlyEntry[] = [];
        let offset = 0;
        const MIN_ENTRY_SIZE = 15;

        for (let i = 0; i < entryCount && offset + MIN_ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                month: payload.getUint8(offset),
                year: payload.getUint16(offset + 1, true),
                total_sessions: payload.getUint16(offset + 3, true),
                total_volume_ml: payload.getUint32(offset + 5, true),
                total_duration_hours: payload.getUint16(offset + 9, true),
                avg_daily_volume: payload.getUint16(offset + 11, true),
                active_days: payload.getUint8(offset + 13),
                success_rate: payload.getUint8(offset + 14),
            });
            offset += entrySize;
        }
        return entries;
    }

    /**
     * Parse watering history annual aggregate entries.
     * Entry can be 14B packed or 16B aligned depending on firmware build.
     */
    public parseWateringAnnualEntries(payload: DataView, entryCount: number, entrySize: number = 14): HistoryAnnualEntry[] {
        const entries: HistoryAnnualEntry[] = [];
        let offset = 0;
        const MIN_ENTRY_SIZE = 14;

        for (let i = 0; i < entryCount && offset + MIN_ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                year: payload.getUint16(offset, true),
                total_sessions: payload.getUint16(offset + 2, true),
                total_volume_liters: payload.getUint32(offset + 4, true),
                avg_monthly_volume_liters: payload.getUint16(offset + 8, true),
                most_active_month: payload.getUint8(offset + 10),
                success_rate: payload.getUint8(offset + 11),
                peak_month_volume_liters: payload.getUint16(offset + 12, true),
            });
            offset += entrySize;
        }
        return entries;
    }

    /**
     * Parse rain hourly entries from notification payload
     */
    public parseRainHourlyEntries(payload: DataView, entryCount: number): RainHourlyEntry[] {
        const entries: RainHourlyEntry[] = [];
        let offset = 0;
        const ENTRY_SIZE = 8;

        for (let i = 0; i < entryCount && offset + ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                hour_epoch: payload.getUint32(offset, true),
                rainfall_mm_x100: payload.getUint16(offset + 4, true),
                pulse_count: payload.getUint8(offset + 6),
                data_quality: payload.getUint8(offset + 7),
            });
            offset += ENTRY_SIZE;
        }
        return entries;
    }

    /**
     * Parse rain daily entries from notification payload
     */
    public parseRainDailyEntries(payload: DataView, entryCount: number): RainDailyEntry[] {
        const entries: RainDailyEntry[] = [];
        let offset = 0;
        const ENTRY_SIZE = 12;

        for (let i = 0; i < entryCount && offset + ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                day_epoch: payload.getUint32(offset, true),
                total_rainfall_mm_x100: payload.getUint32(offset + 4, true),
                max_hourly_mm_x100: payload.getUint16(offset + 8, true),
                active_hours: payload.getUint8(offset + 10),
                data_completeness: payload.getUint8(offset + 11),
            });
            offset += ENTRY_SIZE;
        }
        return entries;
    }

    /**
     * Parse environmental detailed entries from notification payload
     */
    public parseEnvDetailedEntries(payload: DataView, entryCount: number): EnvDetailedEntry[] {
        const entries: EnvDetailedEntry[] = [];
        let offset = 0;
        const ENTRY_SIZE = 12;

        for (let i = 0; i < entryCount && offset + ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                timestamp: payload.getUint32(offset, true),
                temperature_c_x100: payload.getInt16(offset + 4, true),
                humidity_pct_x100: payload.getUint16(offset + 6, true),
                pressure_pa: payload.getUint32(offset + 8, true),
            });
            offset += ENTRY_SIZE;
        }
        return entries;
    }

    /**
     * Parse environmental hourly entries from notification payload
     */
    public parseEnvHourlyEntries(payload: DataView, entryCount: number): EnvHourlyEntry[] {
        const entries: EnvHourlyEntry[] = [];
        let offset = 0;
        const ENTRY_SIZE = 16;
        for (let i = 0; i < entryCount && offset + ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                timestamp: payload.getUint32(offset, true),
                temp_avg_x100: payload.getInt16(offset + 4, true),
                temp_min_x100: payload.getInt16(offset + 6, true),
                temp_max_x100: payload.getInt16(offset + 8, true),
                humidity_avg_x100: payload.getUint16(offset + 10, true),
                pressure_avg_pa: payload.getUint32(offset + 12, true),
            });
            offset += ENTRY_SIZE;
        }
        return entries;
    }

    /**
     * Parse a single 24-byte environmental trend entry.
     */
    public parseEnvTrendEntry(payload: DataView): EnvTrendEntry | null {
        const ENTRY_SIZE = 24;
        if (payload.byteLength < ENTRY_SIZE) {
            return null;
        }

        return {
            temp_change_24h_x100: payload.getInt16(0, true),
            humidity_change_24h_x100: payload.getInt16(2, true),
            pressure_change_24h: payload.getInt32(4, true),
            temp_min_24h_x100: payload.getInt16(8, true),
            temp_max_24h_x100: payload.getInt16(10, true),
            humidity_min_24h_x100: payload.getUint16(12, true),
            humidity_max_24h_x100: payload.getUint16(14, true),
            temp_slope_per_hr_x100: payload.getInt16(16, true),
            humidity_slope_per_hr_x100: payload.getInt16(18, true),
            pressure_slope_per_hr: payload.getInt16(20, true),
            sample_count: payload.getUint16(22, true),
        };
    }

    // --- Flow Calibration ---

    public async startFlowCalibration(): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        await this.writeCalibration(CalibrationAction.START, 0);
        console.log('[BLE] Flow calibration started');
    }

    public async stopFlowCalibration(): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        await this.writeCalibration(CalibrationAction.STOP, 0);
        console.log('[BLE] Flow calibration stopped');
    }

    public async calculateFlowCalibration(testVolumeMl: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (!Number.isFinite(testVolumeMl) || testVolumeMl <= 0) {
            throw new Error('Invalid calibration volume (must be > 0 ml)');
        }

        const volumeMl = Math.max(1, Math.round(testVolumeMl));
        await this.writeCalibration(CalibrationAction.CALCULATED, volumeMl);
        console.log(`[BLE] Flow calibration calculated with ${volumeMl} ml`);
    }

    public async applyFlowCalibration(): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        await this.writeCalibration(CalibrationAction.APPLY, 0);
        console.log('[BLE] Flow calibration applied');
    }

    // --- Time & Location ---

    public async syncDeviceTime(): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        const now = new Date();
        const buffer = new ArrayBuffer(16);
        const view = new DataView(buffer);

        view.setUint8(0, now.getFullYear() - 2000); // Year
        view.setUint8(1, now.getMonth() + 1);       // Month
        view.setUint8(2, now.getDate());            // Day
        view.setUint8(3, now.getHours());           // Hour
        view.setUint8(4, now.getMinutes());         // Minute
        view.setUint8(5, now.getSeconds());         // Second
        view.setUint8(6, 0);                        // Day of week (ignored)

        // Offset
        const offset = -now.getTimezoneOffset(); // JS returns positive for WEST, we want positive for EAST?
        // JS getTimezoneOffset() returns minutes *difference* from UTC to Local.
        // e.g. GMT+2 returns -120. We want +120.
        // So negate it.
        view.setInt16(7, offset, true);

        view.setUint8(9, 0); // DST active? JS doesn't tell us easily if DST is active without libraries.
        // But offset includes DST if active.
        // Firmware expects "dst_active" flag. 
        // We can heuristic it or leave 0 and let user set timezone rules.
        // Docs say "dst_active... 1 if DST logic enabled".
        // Let's set 0 for now (Auto-DST logic might be handled by TimezoneConfig).

        // Write to RTC
        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.RTC_CONFIG, view, 3, 200);
    }


    // --- Reset Control ---

    public async performReset(type: number, channelId: number = 0xFF): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

        // prevent concurrent resets
        if (this.pendingResetResolver) {
            throw new Error('Reset already in progress');
        }

        return new Promise<void>(async (resolve, reject) => {
            // Setup resolver
            let codeReceived = false;

            const timeoutId = setTimeout(() => {
                this.pendingResetResolver = null;
                reject(new Error('Reset timeout'));
            }, 10000); // 10s timeout

            this.pendingResetResolver = {
                resolveCode: async (code) => {
                    if (codeReceived) return;
                    codeReceived = true;
                    try {
                        console.log(`[BLE] Got reset code ${code}, executing...`);
                        await this.writeResetControl(type, channelId, code);
                        // Now wait for completion (status 0xFF)
                    } catch (e) {
                        clearTimeout(timeoutId);
                        this.pendingResetResolver = null;
                        reject(e as Error);
                    }
                },
                resolveComplete: () => {
                    clearTimeout(timeoutId);
                    console.log('[BLE] Reset complete');
                    resolve();
                },
                reject: (e) => {
                    clearTimeout(timeoutId);
                    this.pendingResetResolver = null;
                    reject(e);
                },
                type
            };

            try {
                // Step 1: Request Code (code=0)
                console.log(`[BLE] Requesting reset type ${type}...`);
                await this.writeResetControl(type, channelId, 0);
            } catch (e) {
                clearTimeout(timeoutId);
                this.pendingResetResolver = null;
                reject(e as Error);
            }
        });
    }

    private async writeResetControl(type: number, channelId: number, code: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const buffer = new ArrayBuffer(16);
        const view = new DataView(buffer);
        view.setUint8(0, type);
        view.setUint8(1, channelId);
        view.setUint32(2, code, true);
        // rest is padding/reserved

        await this.writeWithRetry(SERVICE_UUID, CHAR_UUIDS.RESET_CONTROL, view, 3, 200);
    }

    /**
     * Parse environmental daily entries from notification payload
     */
    public parseEnvDailyEntries(payload: DataView, entryCount: number): EnvDailyEntry[] {
        const entries: EnvDailyEntry[] = [];
        let offset = 0;
        const ENTRY_SIZE = 22;

        for (let i = 0; i < entryCount && offset + ENTRY_SIZE <= payload.byteLength; i++) {
            entries.push({
                date_code: payload.getUint32(offset, true),
                temp_avg_x100: payload.getInt16(offset + 4, true),
                temp_min_x100: payload.getInt16(offset + 6, true),
                temp_max_x100: payload.getInt16(offset + 8, true),
                humidity_avg_x100: payload.getUint16(offset + 10, true),
                humidity_min_x100: payload.getUint16(offset + 12, true),
                humidity_max_x100: payload.getUint16(offset + 14, true),
                pressure_avg_pa: payload.getUint32(offset + 16, true),
                sample_count: payload.getUint16(offset + 20, true),
            });
            offset += ENTRY_SIZE;
        }
        return entries;
    }

    // ==================== SOIL MOISTURE CONFIGURATION ====================

    /**
     * Read Soil Moisture Configuration.
     * channelId: 0..7 for per-channel, 0xFF for global.
     */
    public async readSoilMoistureConfig(channelId: number): Promise<SoilMoistureConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (!(channelId === 0xFF || (channelId >= 0 && channelId <= 7))) {
            throw new Error('Invalid channel ID (0-7) or 0xFF for global');
        }

        if (this.supportsSoilMoistureConfig === false) {
            throw new Error('Soil Moisture Config not supported by this firmware');
        }

        const requestBuffer = new ArrayBuffer(8);
        const requestView = new DataView(requestBuffer);
        requestView.setUint8(0, channelId);
        requestView.setUint8(1, SOIL_MOISTURE_OPERATIONS.READ);
        // remaining bytes are 0

        const deviceId = this.connectedDeviceId;

        let data: DataView;
        try {
            // Write + read must stay adjacent; otherwise other UI-triggered GATT writes can
            // interleave and cause Android "write timeout" / congestion failures.
            data = await this.enqueueGattOp(`soilMoistureConfig:read:${channelId}`, async () => {
                await this.writeWithRetryInner(
                    deviceId,
                    CUSTOM_CONFIG_SERVICE_UUID,
                    CHAR_UUIDS.SOIL_MOISTURE_CONFIG,
                    requestView,
                    3,
                    200
                );

                // Give firmware a short moment to update the characteristic value.
                await this.delay(40);

                return await this.readWithRetryInner(
                    deviceId,
                    CUSTOM_CONFIG_SERVICE_UUID,
                    CHAR_UUIDS.SOIL_MOISTURE_CONFIG,
                    2,
                    200
                );
            });
        } catch (err: any) {
            if (this.isCharacteristicNotFoundError(err)) {
                this.supportsSoilMoistureConfig = false;
            }
            throw err;
        }

        // If we got a response once, assume feature exists for this connection.
        this.supportsSoilMoistureConfig = true;

        const parsed = this.parseSoilMoistureConfig(data);
        useAppStore.getState().setSoilMoistureConfig(parsed);
        return parsed;
    }

    /**
     * Write Soil Moisture Configuration.
     *
     * channelId: 0..7 for per-channel, 0xFF for global.
     * enabled: toggle override on/off.
     * moisture_pct: 0..100
     */
    public async writeSoilMoistureConfig(args: {
        channelId: number;
        enabled: boolean;
        moisture_pct: number;
    }): Promise<SoilMoistureConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (!(args.channelId === 0xFF || (args.channelId >= 0 && args.channelId <= 7))) {
            throw new Error('Invalid channel ID (0-7) or 0xFF for global');
        }
        if (!Number.isFinite(args.moisture_pct) || args.moisture_pct < 0 || args.moisture_pct > 100) {
            throw new Error('Invalid soil moisture percentage (0-100)');
        }

        if (this.supportsSoilMoistureConfig === false) {
            throw new Error('Soil Moisture Config not supported by this firmware');
        }

        const requestBuffer = new ArrayBuffer(8);
        const requestView = new DataView(requestBuffer);
        requestView.setUint8(0, args.channelId);
        requestView.setUint8(1, SOIL_MOISTURE_OPERATIONS.SET);
        requestView.setUint8(2, args.enabled ? 1 : 0);
        requestView.setUint8(3, Math.round(args.moisture_pct));
        // remaining bytes are 0 (status/has_data/reserved are response-only)

        const deviceId = this.connectedDeviceId;

        let data: DataView;
        try {
            data = await this.enqueueGattOp(`soilMoistureConfig:write:${args.channelId}`, async () => {
                await this.writeWithRetryInner(
                    deviceId,
                    CUSTOM_CONFIG_SERVICE_UUID,
                    CHAR_UUIDS.SOIL_MOISTURE_CONFIG,
                    requestView,
                    3,
                    200
                );

                // Read back the response/status snapshot.
                await this.delay(60);
                return await this.readWithRetryInner(
                    deviceId,
                    CUSTOM_CONFIG_SERVICE_UUID,
                    CHAR_UUIDS.SOIL_MOISTURE_CONFIG,
                    2,
                    200
                );
            });
        } catch (err: any) {
            if (this.isCharacteristicNotFoundError(err)) {
                this.supportsSoilMoistureConfig = false;
            }
            throw err;
        }

        this.supportsSoilMoistureConfig = true;

        const parsed = this.parseSoilMoistureConfig(data);
        useAppStore.getState().setSoilMoistureConfig(parsed);
        return parsed;
    }

    private parseSoilMoistureConfig(data: DataView): SoilMoistureConfigData {
        if (data.byteLength < 8) {
            throw new Error(`Soil moisture config data too short: ${data.byteLength}`);
        }

        const status = data.getUint8(4);
        if (status !== SOIL_MOISTURE_STATUS.SUCCESS) {
            console.warn(`[BLE] Soil Moisture Config non-success status: 0x${status.toString(16)}`);
        }

        return {
            channel_id: data.getUint8(0),
            operation: data.getUint8(1),
            enabled: data.getUint8(2) !== 0,
            moisture_pct: data.getUint8(3),
            status,
            has_data: data.getUint8(5) !== 0
        };
    }

    // ==================== CUSTOM SOIL CONFIGURATION ====================

    /**
     * Read custom soil configuration for a channel
     * Returns null if no custom soil is configured for the channel
     */
    public async readCustomSoilConfig(channelId: number): Promise<CustomSoilConfigData | null> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');

        const deviceId = this.connectedDeviceId;

        // Write a read request first (70 bytes)
        const requestBuffer = new ArrayBuffer(70);
        const requestView = new DataView(requestBuffer);

        requestView.setUint8(0, channelId);
        requestView.setUint8(1, CUSTOM_SOIL_OPERATIONS.READ);
        // All other bytes are 0 (reserved/empty for read request)

        const data = await this.enqueueGattOp(`customSoilConfig:read:${channelId}`, async () => {
            await this.writeWithRetryInner(
                deviceId,
                CUSTOM_CONFIG_SERVICE_UUID,
                CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
                new DataView(requestBuffer),
                3,
                200
            );

            // Give firmware time to update the response buffer.
            await this.delay(60);

            return await this.readWithRetryInner(
                deviceId,
                CUSTOM_CONFIG_SERVICE_UUID,
                CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
                2,
                200
            );
        });

        return this.parseCustomSoilConfig(data);
    }

    /**
     * Create a new custom soil configuration for a channel
     */
    public async createCustomSoilConfig(config: Omit<CustomSoilConfigData, 'operation' | 'created_timestamp' | 'modified_timestamp' | 'crc32' | 'status'>): Promise<CustomSoilConfigData> {
        return this.writeCustomSoilConfig({ ...config, operation: CUSTOM_SOIL_OPERATIONS.CREATE } as CustomSoilConfigData);
    }

    /**
     * Update an existing custom soil configuration for a channel
     */
    public async updateCustomSoilConfig(config: Omit<CustomSoilConfigData, 'operation' | 'created_timestamp' | 'modified_timestamp' | 'crc32' | 'status'>): Promise<CustomSoilConfigData> {
        return this.writeCustomSoilConfig({ ...config, operation: CUSTOM_SOIL_OPERATIONS.UPDATE } as CustomSoilConfigData);
    }

    /**
     * Delete custom soil configuration for a channel (reverts to soil_db_index)
     */
    public async deleteCustomSoilConfig(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');

        const buffer = new ArrayBuffer(70);
        const view = new DataView(buffer);

        view.setUint8(0, channelId);
        view.setUint8(1, CUSTOM_SOIL_OPERATIONS.DELETE);
        // All other bytes are 0

        const deviceId = this.connectedDeviceId;
        const responseData = await this.enqueueGattOp(`customSoil:delete:${channelId}`, async () => {
            await this.writeWithRetryInner(
                deviceId,
                CUSTOM_CONFIG_SERVICE_UUID,
                CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
                new DataView(buffer),
                3,
                200
            );

            // Give firmware time to update the response buffer.
            await this.delay(60);

            return await this.readWithRetryInner(
                deviceId,
                CUSTOM_CONFIG_SERVICE_UUID,
                CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
                2,
                200
            );
        });

        const response = this.parseCustomSoilConfig(responseData);
        if (response && response.status !== CUSTOM_SOIL_STATUS.SUCCESS) {
            throw new Error(`Delete custom soil failed with status: ${response.status}`);
        }
    }

    /**
     * Write custom soil configuration (internal method for create/update)
     */
    private async writeCustomSoilConfig(config: CustomSoilConfigData): Promise<CustomSoilConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (config.channel_id < 0 || config.channel_id > 7) throw new Error('Invalid channel ID (0-7)');

        // Validate parameters
        if (config.field_capacity < 0 || config.field_capacity > 100) {
            throw new Error('Field capacity must be 0-100%');
        }
        if (config.wilting_point < 0 || config.wilting_point > 100) {
            throw new Error('Wilting point must be 0-100%');
        }
        if (config.wilting_point >= config.field_capacity) {
            throw new Error('Wilting point must be less than field capacity');
        }
        if (config.infiltration_rate < 0) {
            throw new Error('Infiltration rate must be >= 0');
        }

        // Build the 70-byte buffer (firmware expects exactly 70 bytes)
        // Layout: 1(ch) + 1(op) + 32(name) + 20(5 floats) + 12(3 u32) + 1(status) + 3(reserved) = 70
        const buffer = new ArrayBuffer(70);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);

        view.setUint8(0, config.channel_id);
        view.setUint8(1, config.operation);

        // Name: 32 bytes UTF-8, NUL-padded (offsets 2-33)
        const encoder = new TextEncoder();
        const nameToWrite = config.name || 'Custom Soil';
        console.log('[BLE] writeCustomSoilConfig: name="' + nameToWrite + '", length=' + nameToWrite.length);
        const nameBytes = encoder.encode(nameToWrite);
        bytes.set(nameBytes.slice(0, 32), 2);
        // Ensure NUL termination
        if (nameBytes.length < 32) {
            bytes[2 + nameBytes.length] = 0;
        }

        // Floats at offsets 34-53 (5 × 4 bytes)
        view.setFloat32(34, config.field_capacity, true);
        view.setFloat32(38, config.wilting_point, true);
        view.setFloat32(42, config.infiltration_rate, true);
        view.setFloat32(46, config.bulk_density || 1.3, true);
        view.setFloat32(50, config.organic_matter || 2.0, true);

        // Timestamps (54-61), CRC (62-65), status (66), reserved (67-69) - FW fills these
        // Already zeroed from ArrayBuffer

        const deviceId = this.connectedDeviceId;
        const responseData = await this.enqueueGattOp(`customSoil:write:${config.channel_id}:${config.operation}`, async () => {
            await this.writeWithRetryInner(
                deviceId,
                CUSTOM_CONFIG_SERVICE_UUID,
                CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
                new DataView(buffer),
                3,
                200
            );

            // Give firmware time to compute CRC/timestamps and update response buffer.
            await this.delay(80);

            return await this.readWithRetryInner(
                deviceId,
                CUSTOM_CONFIG_SERVICE_UUID,
                CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
                2,
                200
            );
        });

        const response = this.parseCustomSoilConfig(responseData);
        if (!response) {
            throw new Error('Failed to read custom soil config response');
        }

        if (response.status !== CUSTOM_SOIL_STATUS.SUCCESS) {
            if (response.status === CUSTOM_SOIL_STATUS.INVALID_PARAM) {
                throw new Error('Invalid custom soil parameters');
            } else if (response.status === CUSTOM_SOIL_STATUS.NOT_FOUND) {
                throw new Error('Custom soil not found (for update operation)');
            } else {
                throw new Error(`Custom soil operation failed with status: ${response.status}`);
            }
        }

        return response;
    }

    /**
     * Parse custom soil config from BLE response
     */
    private parseCustomSoilConfig(data: DataView): CustomSoilConfigData | null {
        if (data.byteLength < 67) {
            console.warn('[BLE] Custom soil config data too short:', data.byteLength);
            return null;
        }

        const status = data.getInt8(66);
        console.log('[BLE] parseCustomSoilConfig: byteLength=' + data.byteLength + ', status=' + status);

        // If status is NOT_FOUND, no custom soil exists for this channel
        if (status === CUSTOM_SOIL_STATUS.NOT_FOUND) {
            console.log('[BLE] parseCustomSoilConfig: NOT_FOUND status, returning null');
            return null;
        }

        // Extract name (32 bytes starting at offset 2)
        const nameBytes = new Uint8Array(data.buffer, data.byteOffset + 2, 32);
        const nullIndex = nameBytes.indexOf(0);
        const decoder = new TextDecoder('utf-8');

        // Debug: show first 16 bytes of name as hex
        const hexBytes = Array.from(nameBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log('[BLE] parseCustomSoilConfig: nameBytes[0:16]=' + hexBytes + ', nullIndex=' + nullIndex);

        // Fix: if nullIndex is 0, name is empty; if -1, use full 32 bytes
        const name = nullIndex === 0 ? '' : decoder.decode(nameBytes.slice(0, nullIndex > 0 ? nullIndex : 32));
        console.log('[BLE] parseCustomSoilConfig: parsed name="' + name + '"');

        return {
            channel_id: data.getUint8(0),
            operation: data.getUint8(1),
            name,
            field_capacity: data.getFloat32(34, true),
            wilting_point: data.getFloat32(38, true),
            infiltration_rate: data.getFloat32(42, true),
            bulk_density: data.getFloat32(46, true),
            organic_matter: data.getFloat32(50, true),
            created_timestamp: data.getUint32(54, true),
            modified_timestamp: data.getUint32(58, true),
            crc32: data.getUint32(62, true),
            status
        };
    }

    private debugOnboardingFlags(data: OnboardingStatusData) {
        try {
            const baseFlags = data.channel_config_flags ?? BigInt(0);
            const extFlags = data.channel_extended_flags ?? BigInt(0);
            const schedFlags = data.schedule_config_flags ?? 0;

            const lines: string[] = [];
            for (let ch = 0; ch < 8; ch++) {
                const baseByte = Number((baseFlags >> BigInt(ch * 8)) & BigInt(0xFF));
                const extByte = Number((extFlags >> BigInt(ch * 8)) & BigInt(0xFF));
                const schedBit = (schedFlags >> ch) & 1;
                lines.push(
                    `ch${ch}: base=${baseByte.toString(2).padStart(8, '0')} ext=${extByte
                        .toString(2)
                        .padStart(8, '0')} sched=${schedBit}`
                );
            }
            console.log(`[BLE][Onboarding] flags -> ${lines.join(' | ')}`);
        } catch (err) {
            console.warn('[BLE] Failed to debug onboarding flags', err);
        }
    }

    // ============================================================================
    // Interval Mode Configuration (Cycle & Soak Durations) - Characteristic #32
    // ============================================================================

    /**
     * Read Interval Mode Configuration for a channel (Cycle & Soak durations)
     * First write channel_id, then read config
     */
    async readIntervalModeConfig(channelId: number): Promise<IntervalModeConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');
        if (this.supportsIntervalModeConfig === false) {
            throw new Error('Interval Mode Config not supported by this firmware');
        }

        const deviceId = this.connectedDeviceId;

        let result: DataView;
        try {
            result = await this.enqueueGattOp(`intervalModeConfig:read:${channelId}`, async () => {
                // Write channel_id to select context, then read the config.
                const selectView = new DataView(new Uint8Array([channelId]).buffer);
                await this.writeWithRetryInner(
                    deviceId,
                    CUSTOM_CONFIG_SERVICE_UUID,
                    CHAR_UUIDS.INTERVAL_MODE_CONFIG,
                    selectView,
                    3,
                    200
                );

                // Give firmware time to update the response buffer.
                await this.delay(60);

                return await this.readWithRetryInner(
                    deviceId,
                    CUSTOM_CONFIG_SERVICE_UUID,
                    CHAR_UUIDS.INTERVAL_MODE_CONFIG,
                    2,
                    200
                );
            });
        } catch (err: any) {
            if (this.isCharacteristicNotFoundError(err)) {
                this.supportsIntervalModeConfig = false;
            }
            throw err;
        }

        this.supportsIntervalModeConfig = true;
        return this.parseIntervalModeConfig(result);
    }

    /**
     * Write Interval Mode Configuration (Cycle & Soak durations)
     */
    async writeIntervalModeConfig(config: IntervalModeConfigData): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (config.channel_id < 0 || config.channel_id > 7) throw new Error('Invalid channel ID (0-7)');
        if (this.supportsIntervalModeConfig === false) {
            throw new Error('Interval Mode Config not supported by this firmware');
        }

        // Create 17-byte buffer (firmware expects 17 bytes)
        const buffer = new ArrayBuffer(17);
        const data = new DataView(buffer);

        data.setUint8(0, config.channel_id);
        data.setUint8(1, config.enabled ? 1 : 0);
        data.setUint16(2, config.watering_minutes, true);
        data.setUint8(4, config.watering_seconds);
        data.setUint16(5, config.pause_minutes, true);
        data.setUint8(7, config.pause_seconds);
        data.setUint8(8, 0); // configured (read-only, write 0)
        data.setUint32(9, 0, true); // last_update (read-only, write 0)
        // Reserved bytes 13-16, write zeros
        data.setUint8(13, 0);
        data.setUint8(14, 0);
        data.setUint8(15, 0);
        data.setUint8(16, 0); // Extra reserved byte (firmware expects 17 bytes)

        const deviceId = this.connectedDeviceId;
        try {
            await this.enqueueGattOp(`intervalModeConfig:write:${config.channel_id}`, async () => {
                await this.writeWithRetryInner(
                    deviceId,
                    CUSTOM_CONFIG_SERVICE_UUID,
                    CHAR_UUIDS.INTERVAL_MODE_CONFIG,
                    data,
                    3,
                    200
                );
            });
        } catch (err: any) {
            if (this.isCharacteristicNotFoundError(err)) {
                this.supportsIntervalModeConfig = false;
            }
            throw err;
        }

        this.supportsIntervalModeConfig = true;

        console.log(`[BLE] Wrote Interval Mode Config for ch${config.channel_id}: ` +
            `enabled=${config.enabled}, watering=${config.watering_minutes}m${config.watering_seconds}s, ` +
            `pause=${config.pause_minutes}m${config.pause_seconds}s`);
    }

    private parseIntervalModeConfig(result: DataView): IntervalModeConfigData {
        return {
            channel_id: result.getUint8(0),
            enabled: result.getUint8(1) !== 0,
            watering_minutes: result.getUint16(2, true),
            watering_seconds: result.getUint8(4),
            pause_minutes: result.getUint16(5, true),
            pause_seconds: result.getUint8(7),
            configured: result.getUint8(8) !== 0,
            last_update: result.getUint32(9, true),
        };
    }

    // ========================================================================
    // Config Reset (#32) and Config Status (#33)
    // ========================================================================

    /**
     * Read Config Reset status
     * Returns current reset operation status
     */
    async readConfigReset(): Promise<ConfigResetResponse> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const result = await this.readWithRetry(CUSTOM_CONFIG_SERVICE_UUID, CHAR_UUIDS.CONFIG_RESET, 2, 150);
        return this.parseConfigResetResponse(result);
    }

    private parseConfigResetResponse(data: DataView): ConfigResetResponse {
        return {
            status: data.getUint8(0),
            subsystem: data.getUint8(1),
            reserved: data.getUint16(2, true),
        };
    }

    /**
     * Read Config Status
     * Returns configuration completeness status
     */
    async readConfigStatus(): Promise<ConfigStatusResponse> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const result = await this.readWithRetry(CUSTOM_CONFIG_SERVICE_UUID, CHAR_UUIDS.CONFIG_STATUS, 2, 150);
        return this.parseConfigStatusResponse(result);
    }

    /**
     * Send Config Status command (query, validate, or reset)
     * @param command Command byte from CONFIG_STATUS_COMMANDS
     */
    async sendConfigStatusCommand(command: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const data = new Uint8Array([command]);
        const view = new DataView(data.buffer);

        // Some firmware variants expose CONFIG_STATUS as writeWithoutResponse-only.
        // Prefer no-response writes for command-style operations, then fall back.
        try {
            await this.writeWithoutResponseWithRetry(
                CUSTOM_CONFIG_SERVICE_UUID,
                CHAR_UUIDS.CONFIG_STATUS,
                view,
                3,
                200
            );
            console.log(`[BLE] Sent Config Status command (no-resp): 0x${command.toString(16)}`);
            return;
        } catch (e) {
            console.warn('[BLE] CONFIG_STATUS no-resp write failed, falling back to write-with-response:', e);
        }

        await this.writeWithRetry(CUSTOM_CONFIG_SERVICE_UUID, CHAR_UUIDS.CONFIG_STATUS, view, 3, 200);
        console.log(`[BLE] Sent Config Status command (with-resp): 0x${command.toString(16)}`);
    }

    private parseConfigStatusResponse(data: DataView): ConfigStatusResponse {
        return {
            overall_completeness: data.getUint8(0),
            channel_mask: data.getUint8(1),
            schedule_mask: data.getUint8(2),
            compensation_status: data.getUint8(3),
            custom_soil_count: data.getUint8(4),
            onboarding_complete: data.getUint8(5),
            flags: data.getUint16(6, true),
        };
    }

    // ========================================================================
    // Pack Service - Custom Plant Management
    // Service UUID: 12345678-1234-5678-9abc-def123456800
    // ========================================================================

    /**
     * Read Pack Stats - total custom plants, flash usage, change counter
     * Structure: bt_pack_stats_resp_t (26 bytes per BLE_PACK_SERVICE.md)
     */
    async readPackStats(): Promise<PackStats> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        
        console.log('[BLE] Reading Pack Stats from', CHAR_UUIDS.PACK_STATS);
        
        try {
            const result = await this.readWithRetry(PACK_SERVICE_UUID, CHAR_UUIDS.PACK_STATS, 2, 200);
            
            console.log(`[BLE] Pack Stats received: ${result.byteLength} bytes`);
            
            if (result.byteLength < 24) {
                console.error(`[BLE] Pack Stats too short: ${result.byteLength} bytes, expected 24-26`);
                throw new Error(`Invalid Pack Stats response: ${result.byteLength} bytes`);
            }
            
            return this.parsePackStats(result);
        } catch (err) {
            console.error('[BLE] Pack Stats read failed:', err);
            throw err;
        }
    }

    private parsePackStats(data: DataView): PackStats {
        // bt_pack_stats_resp_t - 26 bytes per BLE_PACK_SERVICE.md
        // Note: Some firmware versions may still use 24-byte format
        const stats: PackStats = {
            total_bytes: data.getUint32(0, true),
            used_bytes: data.getUint32(4, true),
            free_bytes: data.getUint32(8, true),
            plant_count: data.getUint16(12, true),
            pack_count: data.getUint16(14, true),
            builtin_count: data.getUint16(16, true),
            status: data.getUint8(18),
            reserved: data.getUint8(19),
            change_counter: data.getUint32(20, true),
        };
        
        console.log('[BLE] Parsed Pack Stats:', {
            total: stats.total_bytes,
            used: stats.used_bytes,
            plants: stats.plant_count,
            builtin: stats.builtin_count,
            packs: stats.pack_count,
            status: stats.status,
            counter: stats.change_counter
        });
        
        return stats;
    }

    /**
     * List installed packs
     * Returns array of PackListEntry
     */
    async listPacks(): Promise<PackListEntry[]> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;
        
        const allPacks: PackListEntry[] = [];
        let offset = 0;
        let totalCount = 0;
        
        console.log('[BLE] Listing packs...');
        
        do {
            // Write request: opcode=LIST_PACKS, offset, reserved
            const reqData = new Uint8Array(4);
            reqData[0] = 0x01; // LIST_PACKS opcode
            reqData[1] = offset & 0xFF;        // offset low byte
            reqData[2] = (offset >> 8) & 0xFF; // offset high byte
            reqData[3] = 0x00; // reserved

            const result = await this.enqueueGattOp(`packList:${offset}`, async () => {
                await this.writeWithRetryInner(
                    deviceId,
                    PACK_SERVICE_UUID,
                    CHAR_UUIDS.PACK_LIST,
                    new DataView(reqData.buffer),
                    3,
                    200
                );

                // Small delay to ensure firmware updates the response buffer
                await this.delay(60);

                return await this.readWithRetryInner(deviceId, PACK_SERVICE_UUID, CHAR_UUIDS.PACK_LIST, 2, 200);
            });

            const view = result;
            totalCount = view.getUint16(0, true);
            const returnedCount = view.getUint8(2);
            const includeBuiltin = view.getUint8(3);
            
            console.log(`[BLE] Pack list page: offset=${offset}, total=${totalCount}, returned=${returnedCount}, builtin=${includeBuiltin}`);

            if (returnedCount === 0) {
                console.warn('[BLE] Pack list returned 0 entries; stopping pagination to avoid infinite loop');
                break;
            }
            
            // Parse entries (30 bytes each, starting at offset 4)
            const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
            for (let i = 0; i < returnedCount; i++) {
                const entryOffset = 4 + (i * 30);
                const packId = view.getUint16(entryOffset, true);
                const version = view.getUint16(entryOffset + 2, true);
                const plantCount = view.getUint16(entryOffset + 4, true);
                
                // Parse name (24 bytes, null-terminated)
                const nameBytes = bytes.subarray(entryOffset + 6, entryOffset + 6 + 24);
                let nullIndex = nameBytes.indexOf(0);
                if (nullIndex === -1) nullIndex = 24;
                const name = new TextDecoder().decode(nameBytes.slice(0, nullIndex));
                
                allPacks.push({ pack_id: packId, version, plant_count: plantCount, name });
            }
            
            offset += returnedCount;
            
        } while (offset < totalCount);
        
        console.log(`[BLE] Found ${allPacks.length} packs`);
        return allPacks;
    }

    /**
     * Read Pack Transfer Status - current operation progress
     */
    async readPackTransferStatus(): Promise<PackTransferStatus> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const result = await this.readWithRetry(PACK_SERVICE_UUID, CHAR_UUIDS.PACK_TRANSFER, 2, 200);
        return this.parsePackTransferStatus(result);
    }

    private parsePackTransferStatus(data: DataView): PackTransferStatus {
        // bt_pack_xfer_status_t - 16 bytes per BLE_PACK_SERVICE.md
        return {
            state: data.getUint8(0),
            progress_pct: data.getUint8(1),
            pack_id: data.getUint16(2, true),
            bytes_received: data.getUint32(4, true),
            bytes_expected: data.getUint32(8, true),
            last_error: data.getUint8(12),
            // reserved[3] at offset 13-15
        };
    }

    /**
     * Read a Pack Plant by plant_id
     * @param plantId The plant ID to read (≥224 for custom plants)
     * @returns PackPlantV1 or null if not found
     */
    async readPackPlant(plantId: number): Promise<PackPlantV1 | null> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;
        
        // Write plant_id to select which plant to read
        const selectData = new Uint8Array(2);
        const selectView = new DataView(selectData.buffer);
        selectView.setUint16(0, plantId, true);

        const result = await this.enqueueGattOp(`packPlant:read:${plantId}`, async () => {
            await this.writeWithRetryInner(
                deviceId,
                PACK_SERVICE_UUID,
                CHAR_UUIDS.PACK_PLANT,
                selectView,
                3,
                150
            );

            await this.delay(60);

            return await this.readWithRetryInner(deviceId, PACK_SERVICE_UUID, CHAR_UUIDS.PACK_PLANT, 2, 150);
        });
        
        if (result.byteLength < 56) {
            console.log(`[BLE] Pack plant read returned insufficient data: ${result.byteLength} bytes`);
            return null;
        }
        
        return this.parsePackPlant(result);
    }

    private parsePackPlant(data: DataView): PackPlantV1 {
        // Parse common_name (48 bytes at offset 8)
        const commonNameBytes = new Uint8Array(data.buffer, data.byteOffset + 8, 48);
        let nullIndex = commonNameBytes.indexOf(0);
        if (nullIndex === -1) nullIndex = 48;
        const common_name = new TextDecoder().decode(commonNameBytes.slice(0, nullIndex));
        
        // Parse scientific_name (64 bytes at offset 56)
        const sciNameBytes = new Uint8Array(data.buffer, data.byteOffset + 56, 64);
        nullIndex = sciNameBytes.indexOf(0);
        if (nullIndex === -1) nullIndex = 64;
        const scientific_name = new TextDecoder().decode(sciNameBytes.slice(0, nullIndex));
        
        return {
            // Identification (8 bytes)
            plant_id: data.getUint16(0, true),
            pack_id: data.getUint16(2, true),
            version: data.getUint16(4, true),
            reserved: data.getUint16(6, true),
            
            // Names (112 bytes)
            common_name,
            scientific_name,
            
            // Crop Coefficients ×1000 (8 bytes)
            kc_ini_x1000: data.getUint16(120, true),
            kc_dev_x1000: data.getUint16(122, true),
            kc_mid_x1000: data.getUint16(124, true),
            kc_end_x1000: data.getUint16(126, true),
            
            // Root Depth mm (4 bytes)
            root_depth_min_mm: data.getUint16(128, true),
            root_depth_max_mm: data.getUint16(130, true),
            
            // Growth Stages days (6 bytes)
            stage_days_ini: data.getUint8(132),
            stage_days_dev: data.getUint8(133),
            stage_days_mid: data.getUint16(134, true),
            stage_days_end: data.getUint8(136),
            growth_cycle: data.getUint8(137),
            
            // Depletion and Spacing (10 bytes)
            depletion_fraction_p_x1000: data.getUint16(138, true),
            spacing_row_mm: data.getUint16(140, true),
            spacing_plant_mm: data.getUint16(142, true),
            density_x100: data.getUint16(144, true),
            canopy_max_x1000: data.getUint16(146, true),
            
            // Temperature (3 bytes)
            frost_tolerance_c: data.getInt8(148),
            temp_opt_min_c: data.getUint8(149),
            temp_opt_max_c: data.getUint8(150),
            
            // Irrigation (1 byte)
            typ_irrig_method_id: data.getUint8(151),
            
            // User-Adjustable (4 bytes)
            water_need_factor_x100: data.getUint16(152, true),
            irrigation_freq_days: data.getUint8(154),
            prefer_area_based: data.getUint8(155),
        };
    }

    /**
     * Write a custom plant to Pack Storage
     * @param plant The plant data to write (plant_id must be ≥224)
     * 
     * Structure: pack_plant_v1_t (156 bytes)
     * Offsets per PACK_SCHEMA.md v1.0.0:
     *   0-1:   plant_id (uint16_t)
     *   2-3:   pack_id (uint16_t)
     *   4-5:   version (uint16_t)
     *   6-7:   reserved (uint16_t)
     *   8-55:  common_name[48]
     *   56-119: scientific_name[64]
     *   120-121: kc_ini_x1000 (uint16_t)
     *   122-123: kc_dev_x1000 (uint16_t)
     *   124-125: kc_mid_x1000 (uint16_t)
     *   126-127: kc_end_x1000 (uint16_t)
     *   128-129: root_depth_min_mm (uint16_t)
     *   130-131: root_depth_max_mm (uint16_t)
     *   132: stage_days_ini (uint8_t)
     *   133: stage_days_dev (uint8_t)
     *   134-135: stage_days_mid (uint16_t)
     *   136: stage_days_end (uint8_t)
     *   137: growth_cycle (uint8_t)
     *   138-139: depletion_fraction_p_x1000 (uint16_t)
     *   140-141: spacing_row_mm (uint16_t)
     *   142-143: spacing_plant_mm (uint16_t)
     *   144-145: density_x100 (uint16_t)
     *   146-147: canopy_max_x1000 (uint16_t)
     *   148: frost_tolerance_c (int8_t)
     *   149: temp_opt_min_c (uint8_t)
     *   150: temp_opt_max_c (uint8_t)
     *   151: typ_irrig_method_id (uint8_t)
     *   152-153: water_need_factor_x100 (uint16_t)
     *   154: irrigation_freq_days (uint8_t)
     *   155: prefer_area_based (uint8_t)
     */
    async writePackPlant(plant: PackPlantV1): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        
        if (plant.plant_id < PLANT_ID_RANGES.CUSTOM_MIN) {
            throw new Error(`Invalid plant_id ${plant.plant_id}: custom plants must be ≥${PLANT_ID_RANGES.CUSTOM_MIN}`);
        }
        
        // Build the 156-byte payload per pack_plant_v1_t
        const data = new Uint8Array(156);
        const view = new DataView(data.buffer);
        const encoder = new TextEncoder();
        
        // Identification (8 bytes)
        view.setUint16(0, plant.plant_id, true);
        view.setUint16(2, plant.pack_id, true);
        view.setUint16(4, plant.version, true);
        view.setUint16(6, plant.reserved, true);
        
        // Names (112 bytes)
        const commonNameBytes = encoder.encode(plant.common_name);
        data.set(commonNameBytes.slice(0, 47), 8); // Leave room for null terminator
        
        const scientificNameBytes = encoder.encode(plant.scientific_name);
        data.set(scientificNameBytes.slice(0, 63), 56); // Leave room for null terminator
        
        // Crop Coefficients ×1000 (8 bytes)
        view.setUint16(120, plant.kc_ini_x1000, true);
        view.setUint16(122, plant.kc_dev_x1000, true);
        view.setUint16(124, plant.kc_mid_x1000, true);
        view.setUint16(126, plant.kc_end_x1000, true);
        
        // Root Depth mm (4 bytes)
        view.setUint16(128, plant.root_depth_min_mm, true);
        view.setUint16(130, plant.root_depth_max_mm, true);
        
        // Growth Stages days (6 bytes)
        data[132] = plant.stage_days_ini;
        data[133] = plant.stage_days_dev;
        view.setUint16(134, plant.stage_days_mid, true);
        data[136] = plant.stage_days_end;
        data[137] = plant.growth_cycle;
        
        // Depletion and Spacing (10 bytes)
        view.setUint16(138, plant.depletion_fraction_p_x1000, true);
        view.setUint16(140, plant.spacing_row_mm, true);
        view.setUint16(142, plant.spacing_plant_mm, true);
        view.setUint16(144, plant.density_x100, true);
        view.setUint16(146, plant.canopy_max_x1000, true);
        
        // Temperature (3 bytes)
        view.setInt8(148, plant.frost_tolerance_c);
        data[149] = plant.temp_opt_min_c;
        data[150] = plant.temp_opt_max_c;
        
        // Irrigation (1 byte)
        data[151] = plant.typ_irrig_method_id;
        
        // User-Adjustable (4 bytes)
        view.setUint16(152, plant.water_need_factor_x100, true);
        data[154] = plant.irrigation_freq_days;
        data[155] = plant.prefer_area_based;
        
        await this.writeWithRetry(PACK_SERVICE_UUID, CHAR_UUIDS.PACK_PLANT, new DataView(data.buffer), 3, 200);
        
        console.log(`[BLE] Wrote Pack Plant: id=${plant.plant_id}, name="${plant.common_name}"`);
    }

    /**
     * Delete a custom plant from Pack Storage
     * @param plantId The plant ID to delete (≥224)
     */
    async deletePackPlant(plantId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        
        if (plantId < PLANT_ID_RANGES.CUSTOM_MIN) {
            throw new Error(`Invalid plant_id ${plantId}: cannot delete ROM plants`);
        }
        
        // Write delete command: [operation=2][plant_id]
        const data = new Uint8Array(3);
        data[0] = PACK_OPERATIONS.DELETE;
        const view = new DataView(data.buffer);
        view.setUint16(1, plantId, true);
        
        await this.writeWithRetry(PACK_SERVICE_UUID, CHAR_UUIDS.PACK_TRANSFER, new DataView(data.buffer), 3, 200);
        
        console.log(`[BLE] Deleted Pack Plant: id=${plantId}`);
    }

    /**
     * List all custom plant IDs in Pack Storage using pagination
     * Uses PACK_PLANT characteristic with bt_pack_plant_list_req_t format
     * @returns Array of plant IDs
     */
    async listPackPlantIds(): Promise<number[]> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;
        
        const plantIds: number[] = [];
        let offset = 0;
        const maxResults = 8; // Max entries per request
        const allPacks = 0xFF; // Filter: all packs
        
        while (true) {
            // Build bt_pack_plant_list_req_t (4 bytes):
            // - uint16_t offset (little-endian)
            // - uint8_t max_results
            // - uint8_t filter_pack_id
            const reqData = new Uint8Array(4);
            const reqView = new DataView(reqData.buffer);
            reqView.setUint16(0, offset, true);
            reqData[2] = maxResults;
            reqData[3] = allPacks;

            const result = await this.enqueueGattOp(`packPlantList:${offset}`, async () => {
                await this.writeWithRetryInner(
                    deviceId,
                    PACK_SERVICE_UUID,
                    CHAR_UUIDS.PACK_PLANT,
                    new DataView(reqData.buffer),
                    3,
                    200
                );

                await this.delay(80);

                return await this.readWithRetryInner(deviceId, PACK_SERVICE_UUID, CHAR_UUIDS.PACK_PLANT, 2, 200);
            });

            const view = result;
            const totalCount = view.getUint16(0, true);
            const returnedCount = view.getUint8(2);
            
            console.log(`[BLE] Plant list page: offset=${offset}, total=${totalCount}, returned=${returnedCount}`);

            if (returnedCount === 0) {
                break;
            }
            
            // Parse entries (20 bytes each): plant_id(2) + pack_id(1) + version(1) + name(16)
            for (let i = 0; i < returnedCount; i++) {
                const entryOffset = 4 + (i * 20); // Header is 4 bytes
                const plantId = view.getUint16(entryOffset, true);
                
                // Only include custom plants (ID >= 224)
                if (plantId >= PLANT_ID_RANGES.CUSTOM_MIN) {
                    plantIds.push(plantId);
                }
            }
            
            // Check if we've received all plants
            offset += returnedCount;
            if (offset >= totalCount || returnedCount === 0) {
                break;
            }
        }
        
        console.log(`[BLE] Listed ${plantIds.length} custom plants: [${plantIds.join(', ')}]`);
        return plantIds;
    }

    /**
     * Stream plant list using notifications (new firmware protocol)
     * 
     * Protocol:
     * 1. Enable notifications on PACK_PLANT
     * 2. Write request [offset_low, offset_high, filter, 0x00] (max_count=0 = streaming mode)
     * 3. Receive notifications with entries until FLAG_COMPLETE
     * 
     * Filter values:
     *   0xFF = CUSTOM_ONLY (recommended - app has built-in CSV)
     *   0xFE = ALL (built-in + custom)
     *   0x00 = BUILTIN_ONLY
     * 
     * Notification format (4-byte header + 22-byte entries):
     *   [total_count:u16][returned_count:u8][flags:u8][entries...]
     * 
     * Entry format (22 bytes):
     *   [plant_id:u16][pack_id:u16][version:u16][name:char16]
     * 
     * Flags:
     *   0x80 = STARTING (first notification)
     *   0x00 = NORMAL (in progress)
     *   0x01 = COMPLETE (last notification)
     *   0x02 = ERROR
     * 
     * @param filter Filter mode (default: CUSTOM_ONLY)
     * @param onProgress Optional progress callback (0.0 - 1.0)
     * @returns Array of PackPlantListEntry
     */
    async streamPackPlants(
        filter: 'CUSTOM_ONLY' | 'ALL' | 'BUILTIN_ONLY' = 'CUSTOM_ONLY',
        onProgress?: (progress: number, count: number, total: number) => void
    ): Promise<PackPlantListEntry[]> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const deviceId = this.connectedDeviceId;
        
        const plants: PackPlantListEntry[] = [];
        let totalExpected = 0;
        let isComplete = false;
        let hasError = false;
        
        const FILTER_VALUES = {
            CUSTOM_ONLY: 0xFF,
            ALL: 0xFE,
            BUILTIN_ONLY: 0x00
        };
        
        const FLAG_STARTING = 0x80;
        const FLAG_COMPLETE = 0x01;
        const FLAG_ERROR = 0x02;
        
        const ENTRY_SIZE = 22; // New firmware: 22 bytes per entry
        const TIMEOUT_MS = 30000; // Idle timeout (resets on each notification)
        const FIRST_PACKET_TIMEOUT_MS = 2000; // If nothing arrives, retry request
        const MAX_RETRIES = 3;
        
        return new Promise(async (resolve, reject) => {
            let timeoutId: ReturnType<typeof setTimeout>;
            let firstPacketTimeoutId: ReturnType<typeof setTimeout>;
            let firstPacketReceived = false;
            let settled = false;
            let retryCount = 0;

            const cleanupAndReject = (err: Error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                clearTimeout(firstPacketTimeoutId);
                this.stopNotificationsQueued(deviceId, PACK_SERVICE_UUID, CHAR_UUIDS.PACK_PLANT).catch(() => {});
                reject(err);
            };

            const cleanupAndResolve = (result: PackPlantListEntry[]) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                clearTimeout(firstPacketTimeoutId);
                this.stopNotificationsQueued(deviceId, PACK_SERVICE_UUID, CHAR_UUIDS.PACK_PLANT).catch(() => {});
                resolve(result);
            };

            const armIdleTimeout = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    if (!isComplete && !hasError) {
                        console.error('[BLE] Stream timeout');
                        cleanupAndReject(new Error('Stream timeout'));
                    }
                }, TIMEOUT_MS);
            };

            const sendStreamRequest = async () => {
                // bt_pack_plant_list_req_t: [offset:LE16][filter_pack_id:U8][max_count:U8]
                // WORKAROUND: Firmware bug swaps bytes 2-3, so we swap them here
                const reqData = new Uint8Array(4);
                const view = new DataView(reqData.buffer);
                
                view.setUint16(0, 0, true);  // offset = 0 (little-endian)
                // BUG WORKAROUND: Firmware swaps filter/max, so we swap them in request
                view.setUint8(2, 0);  // max_count (swapped position)
                view.setUint8(3, FILTER_VALUES[filter]);  // filter (swapped position)

                console.log(
                    `[BLE] Sending stream request (with firmware swap workaround): [${Array.from(reqData).map(b => b.toString(16).padStart(2, '0')).join(' ')}]` +
                    ` (offset=${view.getUint16(0, true)}, filter@pos3=0x${FILTER_VALUES[filter].toString(16)}, max@pos2=0)` +
                    (retryCount > 0 ? ` retry=${retryCount}` : '')
                );

                await this.enqueueGattOp(`packStream:write:${retryCount}`, async () => {
                    await this.writeWithRetryInner(deviceId, PACK_SERVICE_UUID, CHAR_UUIDS.PACK_PLANT, view, 3, 200);
                });
            };

            const armFirstPacketTimeout = () => {
                clearTimeout(firstPacketTimeoutId);
                firstPacketTimeoutId = setTimeout(async () => {
                    if (settled || firstPacketReceived || isComplete || hasError) return;

                    retryCount++;
                    if (retryCount > MAX_RETRIES) {
                        console.error('[BLE] No stream notifications received after retries');
                        cleanupAndReject(new Error('Stream timeout (no notifications)'));
                        return;
                    }

                    console.warn('[BLE] No stream notifications received yet; retrying request');
                    try {
                        // Docs recommend retry after a short delay
                        await new Promise(r => setTimeout(r, 500));
                        await sendStreamRequest();
                        armFirstPacketTimeout();
                    } catch (e) {
                        cleanupAndReject(e instanceof Error ? e : new Error(String(e)));
                    }
                }, FIRST_PACKET_TIMEOUT_MS);
            };
            
            // Notification handler
            const handleNotification = (data: DataView) => {
                try {
                    if (settled) return;

                    firstPacketReceived = true;
                    armIdleTimeout();

                    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
                    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
                    
                    const totalCount = view.getUint16(0, true);
                    const returnedCount = view.getUint8(2);
                    const flags = view.getUint8(3);
                    
                    // Debug log
                    console.log(`[BLE] Stream notification: total=${totalCount}, returned=${returnedCount}, flags=0x${flags.toString(16).padStart(2, '0')}`);
                    
                    // Handle STARTING flag
                    if (flags & FLAG_STARTING) {
                        plants.length = 0; // Clear any previous
                        totalExpected = totalCount;
                        console.log(`[BLE] Stream starting: expecting ${totalExpected} plants`);
                    }
                    
                    // Handle ERROR flag
                    if (flags === FLAG_ERROR) {
                        hasError = true;
                        cleanupAndReject(new Error('Stream error from device'));
                        return;
                    }
                    
                    // Parse entries (22 bytes each):
                    // plant_id:u16, pack_id:u16, version:u16, name:char16
                    for (let i = 0; i < returnedCount; i++) {
                        const entryOffset = 4 + (i * ENTRY_SIZE);
                        
                        if (entryOffset + ENTRY_SIZE > bytes.length) {
                            console.warn(`[BLE] Entry ${i} exceeds buffer length, skipping`);
                            break;
                        }
                        
                        const plantId = view.getUint16(entryOffset, true);
                        const packId = view.getUint16(entryOffset + 2, true);
                        const version = view.getUint16(entryOffset + 4, true);
                        
                        // Parse name (16 bytes, null-terminated)
                        const nameBytes = bytes.slice(entryOffset + 6, entryOffset + 6 + 16);
                        let nullIndex = nameBytes.indexOf(0);
                        if (nullIndex === -1) nullIndex = 16;
                        const name = new TextDecoder().decode(nameBytes.slice(0, nullIndex));
                        
                        plants.push({ plant_id: plantId, pack_id: packId, version, name });
                    }
                    
                    // Report progress
                    if (onProgress && totalExpected > 0) {
                        onProgress(plants.length / totalExpected, plants.length, totalExpected);
                    }
                    
                    // Handle COMPLETE flag
                    if (flags === FLAG_COMPLETE) {
                        isComplete = true;
                        console.log(`[BLE] Stream complete: received ${plants.length} plants`);

                        cleanupAndResolve(plants);
                    }
                } catch (err) {
                    console.error('[BLE] Error parsing stream notification:', err);
                }
            };
            
            try {
                // Set idle timeout (resets on each notification)
                armIdleTimeout();
                
                // Enable notifications
                await this.startNotificationsQueued(deviceId, PACK_SERVICE_UUID, CHAR_UUIDS.PACK_PLANT, handleNotification);
                
                // Small delay to ensure notifications are set up
                await new Promise(r => setTimeout(r, 50));

                // Send initial streaming request
                await sendStreamRequest();

                // If we don't see any notifications soon, retry the request
                armFirstPacketTimeout();
                
            } catch (err) {
                cleanupAndReject(err instanceof Error ? err : new Error(String(err)));
            }
        });
    }

    /**
     * List all pack plants with details using streaming
     * Wrapper around streamPackPlants for backwards compatibility
     * @returns Array of PackPlantListEntry with plant_id, pack_id, version, name (custom only)
     */
    async listPackPlants(): Promise<PackPlantListEntry[]> {
        const allPlants = await this.streamPackPlants('CUSTOM_ONLY');
        
        // Filter to only custom plants (ID >= 224)
        const customPlants = allPlants.filter(p => p.plant_id >= PLANT_ID_RANGES.CUSTOM_MIN);
        console.log(`[BLE] Listed ${customPlants.length} custom plants (filtered from ${allPlants.length} total)`);
        
        return customPlants;
    }

    /**
     * Check if Pack Service is available on the connected device
     */
    async isPackServiceAvailable(): Promise<boolean> {
        if (!this.connectedDeviceId) {
            console.log('[BLE] isPackServiceAvailable: Not connected');
            return false;
        }
        
        try {
            const services = await BleClient.getServices(this.connectedDeviceId);
            const serviceUuids = services.map(s => s.uuid.toLowerCase());
            console.log('[BLE] Available services:', serviceUuids);
            
            const hasPackService = serviceUuids.includes(PACK_SERVICE_UUID.toLowerCase());
            console.log(`[BLE] Pack Service (${PACK_SERVICE_UUID}): ${hasPackService ? 'FOUND' : 'NOT FOUND'}`);
            
            if (hasPackService) {
                // Also check if PACK_STATS characteristic exists
                const packService = services.find(s => s.uuid.toLowerCase() === PACK_SERVICE_UUID.toLowerCase());
                if (packService) {
                    const charUuids = packService.characteristics?.map(c => c.uuid.toLowerCase()) || [];
                    console.log('[BLE] Pack Service characteristics:', charUuids);
                    
                    const hasPackStats = charUuids.includes(CHAR_UUIDS.PACK_STATS.toLowerCase());
                    const hasPackPlant = charUuids.includes(CHAR_UUIDS.PACK_PLANT.toLowerCase());
                    console.log(`[BLE] PACK_STATS: ${hasPackStats}, PACK_PLANT: ${hasPackPlant}`);
                }
            }
            
            return hasPackService;
        } catch (err) {
            console.error('[BLE] isPackServiceAvailable error:', err);
            return false;
        }
    }
}
