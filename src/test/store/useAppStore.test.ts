/**
 * Tests for useAppStore - state management store
 */
import { describe, it, expect, beforeEach } from 'vitest';

describe('useAppStore', () => {
    describe('initial state', () => {
        it('should have disconnected connection state by default', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const connectionState = useAppStore.getState().connectionState;
            expect(connectionState).toBe('disconnected');
        });

        it('should have empty discovered devices', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const devices = useAppStore.getState().discoveredDevices;
            expect(devices).toEqual([]);
        });

        it('should have null connected device id', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const deviceId = useAppStore.getState().connectedDeviceId;
            expect(deviceId).toBeNull();
        });

        it('should have zones defined', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const zones = useAppStore.getState().zones;
            expect(Array.isArray(zones)).toBe(true);
        });

        it('should have syncProgress property', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const state = useAppStore.getState();
            expect('syncProgress' in state).toBe(true);
        });

        it('should have isInitialSyncComplete property', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const state = useAppStore.getState();
            expect('isInitialSyncComplete' in state).toBe(true);
        });
    });

    describe('connection actions', () => {
        beforeEach(async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            useAppStore.getState().setConnectionState('disconnected');
        });

        it('should update connection state', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            useAppStore.getState().setConnectionState('connected');
            expect(useAppStore.getState().connectionState).toBe('connected');
        });

        it('should allow scanning state', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            useAppStore.getState().setConnectionState('scanning');
            expect(useAppStore.getState().connectionState).toBe('scanning');
        });

        it('should allow connecting state', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            useAppStore.getState().setConnectionState('connecting');
            expect(useAppStore.getState().connectionState).toBe('connecting');
        });
    });

    describe('device discovery actions', () => {
        it('should add discovered device', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const device = { deviceId: 'test-device-1', name: 'AutoWater', rssi: -50 };
            useAppStore.getState().addDiscoveredDevice(device);

            const devices = useAppStore.getState().discoveredDevices;
            expect(devices.some(d => d.deviceId === 'test-device-1')).toBe(true);
        });

        it('should set connected device id', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            useAppStore.getState().setConnectedDeviceId('device-123');
            expect(useAppStore.getState().connectedDeviceId).toBe('device-123');
        });
    });

    describe('zone actions', () => {
        it('should set zones array', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const zones = [
                { channel_id: 0, enabled: true, name: 'Zone 1' },
                { channel_id: 1, enabled: false, name: 'Zone 2' }
            ];
            useAppStore.getState().setZones(zones as any);
            expect(useAppStore.getState().zones.length).toBe(2);
        });
    });

    describe('sync progress actions', () => {
        it('should update sync progress', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            useAppStore.getState().setSyncProgress(50, 'Loading zones...');

            expect(useAppStore.getState().syncProgress).toBe(50);
            expect(useAppStore.getState().syncMessage).toBe('Loading zones...');
        });

        it('should set initial sync complete', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            useAppStore.getState().setInitialSyncComplete(true);
            expect(useAppStore.getState().isInitialSyncComplete).toBe(true);
        });
    });

    describe('config actions', () => {
        it('should set RTC config', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const rtcConfig = { timestamp: Date.now(), gmt_offset_minutes: 120, daylight_saving: false, force_sync: false };
            useAppStore.getState().setRtcConfig(rtcConfig as any);
            expect(useAppStore.getState().rtcConfig).toBeDefined();
        });

        it('should set calibration state', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const calibration = { is_calibrating: true, pulse_count: 100, elapsed_ms: 5000, previous_ppl: 450, step: 1, volume_ml: 1000 };
            useAppStore.getState().setCalibrationState(calibration as any);
            expect(useAppStore.getState().calibrationState).toBeDefined();
        });

        it('should set reset state', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const resetState = { reset_type: 1, channel_mask: 0xFF, confirm_required: false, confirm_code: 0, status: 0 };
            useAppStore.getState().setResetState(resetState as any);
            expect(useAppStore.getState().resetState).toBeDefined();
        });

        it('should set onboarding state', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const onboarding = { is_complete: false, completed_channels: 0 };
            useAppStore.getState().setOnboardingState(onboarding as any);
            expect(useAppStore.getState().onboardingState).toBeDefined();
        });
    });

    describe('environmental data actions', () => {
        it('should set env data', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const envData = { temperature: 25.5, humidity: 60, timestamp: Date.now() };
            useAppStore.getState().setEnvData(envData as any);
            expect(useAppStore.getState().envData).toBeDefined();
        });

        it('should set rain data', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const rainData = { amount_mm: 5.2, timestamp: Date.now() };
            useAppStore.getState().setRainData(rainData as any);
            expect(useAppStore.getState().rainData).toBeDefined();
        });
    });

    describe('alarm actions', () => {
        it('should set alarm popup dismissed', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            useAppStore.getState().setAlarmPopupDismissed(true);
            expect(useAppStore.getState().alarmPopupDismissed).toBe(true);
        });

        it('should set last seen alarm timestamp', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const timestamp = Date.now();
            useAppStore.getState().setLastSeenAlarmTimestamp(timestamp);
            expect(useAppStore.getState().lastSeenAlarmTimestamp).toBe(timestamp);
        });
    });

    describe('wizard state', () => {
        it('should have wizard state property', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const state = useAppStore.getState();
            expect('wizardState' in state).toBe(true);
        });

        it('should have wizardState with properties', async () => {
            const { useAppStore } = await import('../../store/useAppStore');
            const wizardState = useAppStore.getState().wizardState;
            expect(wizardState).toBeDefined();
            expect(typeof wizardState).toBe('object');
        });
    });
});
