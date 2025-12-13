import { BleClient, BleDevice, ScanResult } from '@capacitor-community/bluetooth-le';
import { BleFragmentationManager } from './BleFragmentationManager';
import { SERVICE_UUID, CUSTOM_CONFIG_SERVICE_UUID, CHAR_UUIDS } from '../types/uuids';
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
    HistoryDetailedEntry,
    RainHourlyEntry,
    RainDailyEntry,
    EnvDetailedEntry,
    EnvHourlyEntry,
    EnvDailyEntry,
    CustomSoilConfigData,
    CUSTOM_SOIL_OPERATIONS,
    CUSTOM_SOIL_STATUS
} from '../types/firmware_structs';

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
    
    // Buffer for Environmental Data reassembly (3-byte header)
    private envReassembly: {
        seq: number;
        total: number;
        buffer: Uint8Array;
        receivedLen: number;
    } | null = null;

    private constructor() {
        this.fragmentationManager = BleFragmentationManager.getInstance();
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
                optionalServices: [SERVICE_UUID, CUSTOM_CONFIG_SERVICE_UUID]
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

    public async connect(deviceId: string): Promise<void> {
        try {
            useAppStore.getState().setConnectionState('connecting');
            console.log(`Connecting to ${deviceId}...`);
            
            await BleClient.connect(deviceId, (deviceId) => this.onDisconnect(deviceId));
            console.log('Connected!');
            
            this.connectedDeviceId = deviceId;
            useAppStore.getState().setConnectionState('connected');
            useAppStore.getState().setConnectedDeviceId(deviceId);
            
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
                const statusData = await BleClient.read(deviceId, SERVICE_UUID, CHAR_UUIDS.SYSTEM_STATUS);
                this.dispatchToStore(CHAR_UUIDS.SYSTEM_STATUS, new Uint8Array(statusData.buffer));
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
                        await BleClient.read(deviceId, SERVICE_UUID, CHAR_UUIDS.SYSTEM_STATUS);
                        console.log('Retry read success!');
                    } catch (retryError) {
                        console.error('Retry read failed too.', retryError);
                        // We continue anyway, hoping notifications might work or user accepted pairing just now
                    }
                }
            }

            // Setup notifications
            await this.setupNotifications(deviceId);

            // Wait a bit before starting the heavy data sync to let the MCU breathe
            console.log('[BLE] Waiting 500ms before Initial Data Sync...');
            await new Promise(resolve => setTimeout(resolve, 500));

            // Initial Data Sync
            console.log('[BLE] Starting Initial Data Sync Sequence...');
            try {
                // Sequential reads with delays to avoid overwhelming the MCU
                console.log('[BLE] Reading Environmental Data...');
                const env = await this.readEnvironmentalData();
                console.log('[BLE] Got Env Data:', env);
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('[BLE] Reading Rain Data...');
                const rain = await this.readRainData();
                console.log('[BLE] Got Rain Data:', rain);
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('[BLE] Reading Onboarding Status...');
                const onboarding = await this.readOnboardingStatus();
                console.log('[BLE] Got Onboarding Data:', onboarding);
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('[BLE] Reading Current Task...');
                const task = await this.readCurrentTask();
                console.log('[BLE] Got Task Data:', task);
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('[BLE] Reading Valve Control...');
                const valve = await this.readValveControl();
                console.log('[BLE] Got Valve Data:', valve);
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('[BLE] Reading RTC Config...');
                const rtc = await this.readRtcConfig();
                console.log('[BLE] Got RTC Data:', rtc);
                await this.checkTimeDrift(rtc);
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('[BLE] Reading System Config...');
                const sysConfig = await this.readSystemConfig();
                console.log('[BLE] Got System Config:', sysConfig);
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('[BLE] Reading Rain Config...');
                const rainCfg = await this.readRainConfig();
                console.log('[BLE] Got Rain Config:', rainCfg);
                await new Promise(resolve => setTimeout(resolve, 200));

                // Read all 8 channel configurations
                console.log('[BLE] Reading Channel Configs (0-7)...');
                const zones: any[] = [];
                for (let i = 0; i < sysConfig.num_channels; i++) {
                    try {
                        const channelConfig = await this.readChannelConfig(i);
                        zones.push(channelConfig);
                        console.log(`[BLE] Channel ${i}: ${channelConfig.name || '(unnamed)'}`);
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (chErr) {
                        console.warn(`[BLE] Failed to read channel ${i}:`, chErr);
                    }
                }
                useAppStore.getState().setZones(zones);

                console.log('[BLE] Initial Data Sync Complete.');
            } catch (syncError) {
                console.warn('[BLE] Initial data sync failed:', syncError);
            }
            
        } catch (error) {
            console.error('Connection failed', error);
            useAppStore.getState().setConnectionState('disconnected');
            useAppStore.getState().setConnectedDeviceId(null);
        }
    }

    public async disconnect(): Promise<void> {
        if (this.connectedDeviceId) {
            await BleClient.disconnect(this.connectedDeviceId);
            this.connectedDeviceId = null;
            useAppStore.getState().resetStore();
        }
    }

    private onDisconnect(deviceId: string) {
        console.log(`Disconnected from ${deviceId}`);
        this.connectedDeviceId = null;
        useAppStore.getState().resetStore();
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

            // 25. Environmental History (Unified header, 500ms throttle, command-response pattern)
            console.log('[BLE] Subscribing to Environmental History...');
            await BleClient.startNotifications(
                deviceId,
                SERVICE_UUID,
                CHAR_UUIDS.ENV_HISTORY,
                (value) => this.handleNotification(CHAR_UUIDS.ENV_HISTORY, value)
            );
            console.log('[BLE] Environmental History notifications enabled');
            await new Promise(resolve => setTimeout(resolve, 100));

            // 26. Rain History Control (Unified header, multi-fragment responses ~50ms apart)
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

        // List of characteristics that use custom fragmentation protocol
        // NOTE: Web Bluetooth handles ATT-level fragmentation automatically.
        // Only characteristics with APPLICATION-level fragmentation headers need special handling.
        // Onboarding Status uses unified header but Web Bluetooth reassembles it for us.
        const fragmentedCharacteristics = [
            CHAR_UUIDS.HISTORY_MGMT,
            CHAR_UUIDS.ENV_HISTORY,
            CHAR_UUIDS.RAIN_HISTORY,
            // CHAR_UUIDS.ONBOARDING_STATUS - Web Bluetooth handles this
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
                store.setCalibrationState(calData);
                break;

            case CHAR_UUIDS.RESET_CONTROL:
                const resetData: ResetControlData = {
                    reset_type: view.getUint8(0),
                    channel_id: view.getUint8(1),
                    confirmation_code: view.getUint32(2, true),
                    status: view.getUint8(6),
                    timestamp: view.getUint32(7, true)
                };
                store.setResetState(resetData);
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
                store.updateAutoCalc(this.parseAutoCalcStatus(view));
                break;

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
                if (header && header.status === 0 && header.entry_count > 0) {
                    // Skip the 12-byte echoed query header in first fragment
                    const payloadOffset = header.fragment_index === 0 ? 12 : 0;
                    const payloadView = new DataView(data.buffer, data.byteOffset + payloadOffset, data.byteLength - payloadOffset);
                    
                    if (header.data_type === 0) {  // Detailed
                        const entries = this.parseWateringDetailedEntries(payloadView, header.entry_count);
                        store.appendWateringHistory(entries);
                        console.log(`[BLE] Parsed ${entries.length} detailed watering history entries`);
                    }
                    // TODO: Add parsing for daily, monthly, annual if needed
                } else if (header) {
                    if (header.status === 0x07) {
                        console.info('[BLE] History query rate limited (status=0x07). Backing off.');
                    } else if (header.status === 0) {
                        console.info('[BLE] History query returned no data.');
                    } else {
                        console.warn(`[BLE] History query error: status=0x${header.status.toString(16)}`);
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
                store.setAlarmStatus(alarmData);
                break;

            case CHAR_UUIDS.DIAGNOSTICS:
                const diagData = this.parseDiagnostics(view);
                store.setDiagnostics(diagData);
                break;

            case CHAR_UUIDS.ENV_HISTORY:
                // Environmental History - uses unified header
                // data_type: 0=detailed, 1=hourly, 2=daily, 0x03=trends
                if (header && header.status === 0 && header.entry_count > 0) {
                    const payloadView = new DataView(data.buffer, data.byteOffset, data.byteLength);
                    
                    switch (header.data_type) {
                        case 0:  // Detailed
                            const detailedEntries = this.parseEnvDetailedEntries(payloadView, header.entry_count);
                            store.setEnvHistoryDetailed(detailedEntries);
                            console.log(`[BLE] Parsed ${detailedEntries.length} detailed env history entries`);
                            break;
                        case 1:  // Hourly
                            const hourlyEntries = this.parseEnvHourlyEntries(payloadView, header.entry_count);
                            store.setEnvHistoryHourly(hourlyEntries);
                            console.log(`[BLE] Parsed ${hourlyEntries.length} hourly env history entries`);
                            break;
                        case 2:  // Daily
                            const dailyEntries = this.parseEnvDailyEntries(payloadView, header.entry_count);
                            store.setEnvHistoryDaily(dailyEntries);
                            console.log(`[BLE] Parsed ${dailyEntries.length} daily env history entries`);
                            break;
                        case 0x03:  // Trends
                            console.log('[BLE] Received env trends data');
                            // TODO: Store trends if needed
                            break;
                    }
                } else if (header) {
                    if (header.status === 0x03) {
                        console.info('[BLE] Env history returned no data (status=0x03).');
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
                            const hourlyRain = this.parseRainHourlyEntries(payloadView, header.entry_count);
                            store.setRainHistoryHourly(hourlyRain);
                            console.log(`[BLE] Parsed ${hourlyRain.length} hourly rain history entries`);
                            break;
                        case 1:  // Daily
                            const dailyRain = this.parseRainDailyEntries(payloadView, header.entry_count);
                            store.setRainHistoryDaily(dailyRain);
                            console.log(`[BLE] Parsed ${dailyRain.length} daily rain history entries`);
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
                    }
                } else if (header) {
                    if (header.status === 0x03) {
                        console.info('[BLE] Rain history returned no data (status=0x03).');
                    } else if (header.status === 0) {
                        console.info('[BLE] Rain history returned no entries.');
                    } else {
                        console.warn(`[BLE] Rain History error: status=0x${header.status.toString(16)}`);
                    }
                }
                // TODO: Parse and store rain history entries
                // store.appendRainHistory(...)
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
            const deviceTime = new Date(
                2000 + rtcData.year,
                rtcData.month - 1, // JS months are 0-11
                rtcData.day,
                rtcData.hour,
                rtcData.minute,
                rtcData.second
            );
            
            const now = new Date();
            const diffMs = Math.abs(now.getTime() - deviceTime.getTime());
            const driftSeconds = diffMs / 1000;
            
            console.log(`[BLE] Time Check: Device=${deviceTime.toLocaleString()}, Phone=${now.toLocaleString()}, Drift=${driftSeconds.toFixed(1)}s`);

            if (driftSeconds > 60) {
                console.log('[BLE] Time drift detected (>60s). Synchronizing...');
                const offset = now.getTimezoneOffset() * -1;
                // Preserve existing DST setting
                await this.writeRtcConfig(now, offset, rtcData.dst_active);
                console.log('[BLE] Time synchronized. Waiting for device confirmation via notification or re-read.');
                // NOTE: Do NOT update store here - wait for notification or re-read to confirm
            }
        } catch (error) {
            console.error('[BLE] Failed to check/sync time:', error);
        }
    }

    // --- Channel Configuration ---

    public async selectChannel(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        await BleClient.write(
            this.connectedDeviceId, 
            SERVICE_UUID, 
            CHAR_UUIDS.CHANNEL_CONFIG, 
            new DataView(new Uint8Array([channelId]).buffer)
        );
    }

    public async readChannelConfig(channelId: number): Promise<ChannelConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        
        // Select channel first
        await this.selectChannel(channelId);
        
        // Read data from device (SOURCE OF TRUTH)
        const result = await BleClient.read(
            this.connectedDeviceId, 
            SERVICE_UUID, 
            CHAR_UUIDS.CHANNEL_CONFIG
        );
        
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
     * Custom fragmentation for Channel Config (76 bytes) using Type 2 (Big Endian)
     * Matches the pattern used by Growing Environment for consistency
     */
    private async writeChannelConfigFragmented(data: Uint8Array, channelId: number): Promise<void> {
        const totalSize = data.length; // 76
        
        // Header: [channel_id, frag_type, size_hi, size_lo] (Big Endian for type 2)
        const header = new Uint8Array(4);
        header[0] = channelId;
        header[1] = 0x02; // FRAGMENT_TYPE_FULL_BE (Big Endian size)
        header[2] = (totalSize >> 8) & 0xFF;
        header[3] = totalSize & 0xFF;

        const mtu = 20; // Conservative MTU
        let offset = 0;

        // First packet: Header (4) + Payload chunk (16) = 20 bytes
        const firstChunkSize = Math.min(mtu - 4, data.length);
        const firstPacket = new Uint8Array(4 + firstChunkSize);
        firstPacket.set(header, 0);
        firstPacket.set(data.slice(0, firstChunkSize), 4);
        
        console.log(`[BLE] ChannelConfig write: sending fragment 1 (${firstPacket.length}B)`);
        
        await BleClient.write(
            this.connectedDeviceId!,
            SERVICE_UUID,
            CHAR_UUIDS.CHANNEL_CONFIG,
            new DataView(firstPacket.buffer)
        );
        
        offset += firstChunkSize;

        // Subsequent packets: Raw payload chunks (20 bytes each)
        let fragNum = 2;
        while (offset < totalSize) {
            // 100ms delay between fragments to prevent device overflow and ensure encryption
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const chunkSize = Math.min(mtu, totalSize - offset);
            const chunk = data.slice(offset, offset + chunkSize);
            
            console.log(`[BLE] ChannelConfig write: sending fragment ${fragNum} (${chunk.length}B)`);
            
            await BleClient.write(
                this.connectedDeviceId!,
                SERVICE_UUID,
                CHAR_UUIDS.CHANNEL_CONFIG,
                new DataView(chunk.buffer)
            );
            
            offset += chunkSize;
            fragNum++;
        }
        
        console.log(`[BLE] ChannelConfig write: complete (${fragNum - 1} fragments)`);
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
        const nameBytes = new Uint8Array(data.buffer, 2, 64);
        // Find null terminator or use full length
        let nameEnd = 0;
        while (nameEnd < 64 && nameBytes[nameEnd] !== 0) nameEnd++;
        const name = decoder.decode(nameBytes.slice(0, nameEnd));

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

    // --- Valve Control ---

    public async readValveControl(): Promise<ValveControlData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual valve state from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.VALVE_CONTROL
        );
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

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.VALVE_CONTROL,
            new DataView(data.buffer)
        );
    }

    // --- RTC Configuration ---

    public async readRtcConfig(): Promise<RtcData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RTC_CONFIG
        );
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

        view.setUint8(0, date.getFullYear() - 2000);
        view.setUint8(1, date.getMonth() + 1);
        view.setUint8(2, date.getDate());
        view.setUint8(3, date.getHours());
        view.setUint8(4, date.getMinutes());
        view.setUint8(5, date.getSeconds());
        view.setUint8(6, 0); // Day of week (ignored by FW)
        view.setInt16(7, utcOffsetMinutes, true); // Little Endian
        view.setUint8(9, dstActive ? 1 : 0);
        // Bytes 10-15 are reserved (0)

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RTC_CONFIG,
            view
        );
    }

    // --- Calibration ---

    public async readCalibration(): Promise<CalibrationData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual calibration state from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.CALIBRATION
        );
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

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.CALIBRATION,
            view
        );
    }

    // --- Reset Control ---

    public async readResetStatus(): Promise<ResetControlData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual reset status from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RESET_CONTROL
        );
        const resetData: ResetControlData = {
            reset_type: data.getUint8(0),
            channel_id: data.getUint8(1),
            confirmation_code: data.getUint32(2, true),
            status: data.getUint8(6),
            timestamp: data.getUint32(7, true)
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

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RESET_CONTROL,
            view
        );
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

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RESET_CONTROL,
            view
        );
    }

    // --- Current Task ---

    public async readCurrentTask(): Promise<CurrentTaskData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual current task from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.CURRENT_TASK
        );
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.ONBOARDING_STATUS
        );
        
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

    // --- Environmental Data ---

    public async readEnvironmentalData(): Promise<EnvironmentalData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        // Read actual environmental data from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.ENV_DATA
        );
        
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RAIN_SENSOR_DATA
        );
        
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.SYSTEM_CONFIG
        );
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
        await BleClient.write(
            this.connectedDeviceId,
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

    // --- Schedule Configuration ---

    public async selectScheduleChannel(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.SCHEDULE_CONFIG,
            new DataView(new Uint8Array([channelId]).buffer)
        );
    }

    public async readScheduleConfig(channelId: number): Promise<ScheduleConfigData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        
        await this.selectScheduleChannel(channelId);
        
        // Read actual schedule from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.SCHEDULE_CONFIG
        );
        
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

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.SCHEDULE_CONFIG,
            new DataView(data.buffer)
        );
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

    public async selectGrowingEnvChannel(channelId: number): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.GROWING_ENV,
            new DataView(new Uint8Array([channelId]).buffer)
        );
    }

    public async readGrowingEnvironment(channelId: number): Promise<GrowingEnvData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        
        await this.selectGrowingEnvChannel(channelId);
        
        // Read actual growing environment from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.GROWING_ENV
        );
        
        const env = this.parseGrowingEnv(data);
        // Update store with data READ from device
        useAppStore.getState().updateGrowingEnv(env);
        return env;
    }

    public async writeGrowingEnvironment(env: GrowingEnvData): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Not connected');

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
        // Custom Header: [channel_id, frag_type, size_hi, size_lo] (Big Endian size for type 2)
        // frag_type 2 = Big Endian size
        const totalSize = data.length;
        const header = new Uint8Array  (4);
        header[0] = channelId;
        header[1] = 0x02; // FRAGMENT_TYPE_FULL_BE
        header[2] = (totalSize >> 8) & 0xFF;
        header[3] = totalSize & 0xFF;

        const mtu = 20; // Conservative MTU
        let offset = 0;

        // First packet: Header + Payload chunk
        const firstChunkSize = Math.min(mtu - 4, data.length);
        const firstPacket = new Uint8Array(4 + firstChunkSize);
        firstPacket.set(header, 0);
        firstPacket.set(data.slice(0, firstChunkSize), 4);
        
        await BleClient.write(
            this.connectedDeviceId!,
            SERVICE_UUID,
            CHAR_UUIDS.GROWING_ENV,
            new DataView(firstPacket.buffer)
        );
        
        offset += firstChunkSize;

        // Subsequent packets: Payload chunks
        while (offset < totalSize) {
            const chunkSize = Math.min(mtu, totalSize - offset);
            const chunk = data.slice(offset, offset + chunkSize);
            
            await BleClient.write(
                this.connectedDeviceId!,
                SERVICE_UUID,
                CHAR_UUIDS.GROWING_ENV,
                new DataView(chunk.buffer)
            );
            
            offset += chunkSize;
            // Small delay to prevent congestion
            await new Promise(resolve => setTimeout(resolve, 20));
        }
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RAIN_SENSOR_CONFIG
        );
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

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RAIN_SENSOR_CONFIG,
            view
        );
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.TIMEZONE_CONFIG
        );
        const config = this.parseTimezoneConfig(data);
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

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.TIMEZONE_CONFIG,
            view
        );
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
        
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.CHANNEL_COMP_CONFIG,
            new DataView(new Uint8Array([channelId]).buffer)
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
        
        // Select channel if specified
        if (channelId !== undefined) {
            await this.selectChannelCompensationConfig(channelId);
            // Small delay for firmware to process selection
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.CHANNEL_COMP_CONFIG
        );
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

        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.CHANNEL_COMP_CONFIG,
            view
        );
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RAIN_INTEGRATION
        );
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
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.COMPENSATION_STATUS,
            new DataView(new Uint8Array([channelId]).buffer)
        );
    }

    public async readCompensationStatus(channelId: number): Promise<CompensationStatusData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        
        await this.selectCompensationChannel(channelId);
        
        // Read actual compensation status from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.COMPENSATION_STATUS
        );
        
        const status = this.parseCompensationStatus(data);
        // Update store with data READ from device
        useAppStore.getState().updateCompensation(status);
        return status;
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
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.AUTO_CALC_STATUS,
            new DataView(new Uint8Array([channelId]).buffer)
        );
    }

    public async readAutoCalcStatus(channelId: number): Promise<AutoCalcStatusData> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        
        await this.selectAutoCalcChannel(channelId);
        
        // Read actual auto-calc status from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.AUTO_CALC_STATUS
        );
        
        const status = this.parseAutoCalcStatus(data);
        // Update store with data READ from device
        useAppStore.getState().updateAutoCalc(status);
        return status;
    }

    private parseAutoCalcStatus(view: DataView): AutoCalcStatusData {
        return {
            channel_id: view.getUint8(0),
            calculation_active: view.getUint8(1) !== 0,
            irrigation_needed: view.getUint8(2) !== 0,
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
            volume_limited: view.getUint8(39) !== 0,
            auto_mode: view.getUint8(40),
            raw_mm: view.getFloat32(41, true),
            effective_rain_mm: view.getFloat32(45, true),
            calculation_error: view.getUint8(49) !== 0,
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.FLOW_SENSOR
        );
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.TASK_QUEUE
        );
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
        
        // Select channel first
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.STATISTICS,
            new DataView(new Uint8Array([channelId]).buffer)
        );
        
        // Read actual statistics from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.STATISTICS
        );
        const statsData = this.parseStatistics(data);
        // Update store with data READ from device
        useAppStore.getState().updateStatistics(statsData);
        return statsData;
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
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.STATISTICS,
            new DataView(data.buffer)
        );
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
        // Read actual alarm status from device (SOURCE OF TRUTH)
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.ALARM_STATUS
        );
        const alarmData = this.parseAlarm(data);
        // Update store with data READ from device
        useAppStore.getState().setAlarmStatus(alarmData);
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
        const data = await BleClient.read(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.DIAGNOSTICS
        );
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
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.TASK_QUEUE,
            view
        );
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
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.CURRENT_TASK,
            new DataView(data.buffer)
        );
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
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.ALARM_STATUS,
            new DataView(data.buffer)
        );
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
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.HISTORY_MGMT,
            view
        );
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
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.RAIN_HISTORY,
            view
        );
    }

    /**
     * Get hourly rain data for the last N hours
     */
    public async getRainHourlyHistory(hours: number = 24): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        await this.queryRainHistory(0x01, now - hours * 3600, now, hours, 0);
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

        // 12-byte request (match firmware expectation)
        const data = new Uint8Array(12);
        const view = new DataView(data.buffer);

        data[0] = command;
        view.setUint32(1, startTime, true);
        view.setUint32(5, endTime, true);
        data[9] = dataType;
        data[10] = Math.min(Math.max(maxRecords, 1), 100);  // Clamp 1-100
        data[11] = fragmentId;
        // reserved[7] stays 0

        console.log(`[BLE] Querying env history: cmd=${command}, type=${dataType}, max=${maxRecords}, frag=${fragmentId}`);
        await BleClient.write(
            this.connectedDeviceId,
            SERVICE_UUID,
            CHAR_UUIDS.ENV_HISTORY,
            view
        );
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
        const now = Math.floor(Date.now() / 1000);
        await this.queryEnvHistory(0x02, now - hours * 3600, now, 1, Math.min(hours, 100));
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

    // ==================== CUSTOM SOIL CONFIGURATION ====================

    /**
     * Read custom soil configuration for a channel
     * Returns null if no custom soil is configured for the channel
     */
    public async readCustomSoilConfig(channelId: number): Promise<CustomSoilConfigData | null> {
        if (!this.connectedDeviceId) throw new Error('Not connected');
        if (channelId < 0 || channelId > 7) throw new Error('Invalid channel ID (0-7)');

        // Write a read request first (70 bytes)
        const requestBuffer = new ArrayBuffer(70);
        const requestView = new DataView(requestBuffer);
        
        requestView.setUint8(0, channelId);
        requestView.setUint8(1, CUSTOM_SOIL_OPERATIONS.READ);
        // All other bytes are 0 (reserved/empty for read request)

        await BleClient.write(
            this.connectedDeviceId,
            CUSTOM_CONFIG_SERVICE_UUID,
            CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
            new DataView(requestBuffer)
        );

        // Read the response
        const data = await BleClient.read(
            this.connectedDeviceId,
            CUSTOM_CONFIG_SERVICE_UUID,
            CHAR_UUIDS.CUSTOM_SOIL_CONFIG
        );

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

        await BleClient.write(
            this.connectedDeviceId,
            CUSTOM_CONFIG_SERVICE_UUID,
            CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
            new DataView(buffer)
        );

        // Read response to check status
        const responseData = await BleClient.read(
            this.connectedDeviceId,
            CUSTOM_CONFIG_SERVICE_UUID,
            CHAR_UUIDS.CUSTOM_SOIL_CONFIG
        );

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
        const nameBytes = encoder.encode(config.name || 'Custom Soil');
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

        await BleClient.write(
            this.connectedDeviceId,
            CUSTOM_CONFIG_SERVICE_UUID,
            CHAR_UUIDS.CUSTOM_SOIL_CONFIG,
            new DataView(buffer)
        );

        // Read response to get the complete config with timestamps and status
        const responseData = await BleClient.read(
            this.connectedDeviceId,
            CUSTOM_CONFIG_SERVICE_UUID,
            CHAR_UUIDS.CUSTOM_SOIL_CONFIG
        );

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
        
        // If status is NOT_FOUND, no custom soil exists for this channel
        if (status === CUSTOM_SOIL_STATUS.NOT_FOUND) {
            return null;
        }

        // Extract name (32 bytes starting at offset 2)
        const nameBytes = new Uint8Array(data.buffer, data.byteOffset + 2, 32);
        const nullIndex = nameBytes.indexOf(0);
        const decoder = new TextDecoder('utf-8');
        const name = decoder.decode(nameBytes.slice(0, nullIndex > 0 ? nullIndex : 32));

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
}
