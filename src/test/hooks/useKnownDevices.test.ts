/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
    clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); })
};

vi.stubGlobal('localStorage', mockLocalStorage);

import { useKnownDevices, KnownDevice } from '../../hooks/useKnownDevices';

describe('useKnownDevices', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should start with empty devices', () => {
            const { result } = renderHook(() => useKnownDevices());

            expect(result.current.devices).toEqual([]);
            expect(result.current.lastDeviceId).toBeNull();
            expect(result.current.isLoaded).toBe(true);
        });

        it('should load devices from localStorage', () => {
            const savedDevices: KnownDevice[] = [{
                id: 'device-1',
                name: 'My Device',
                originalName: 'AutoWater-1234',
                addedAt: 1000,
                lastConnected: 2000
            }];
            mockStorage['autowater_known_devices'] = JSON.stringify(savedDevices);

            const { result } = renderHook(() => useKnownDevices());

            expect(result.current.devices.length).toBe(1);
            expect(result.current.devices[0].name).toBe('My Device');
        });
    });

    describe('addDevice', () => {
        it('should add a new device', () => {
            const { result } = renderHook(() => useKnownDevices());

            act(() => {
                result.current.addDevice('new-id', 'New Device');
            });

            expect(result.current.devices.length).toBe(1);
            expect(result.current.devices[0].id).toBe('new-id');
            expect(result.current.lastDeviceId).toBe('new-id');
        });

        it('should update existing device lastConnected', () => {
            const { result } = renderHook(() => useKnownDevices());

            act(() => {
                result.current.addDevice('device-1', 'Device 1');
            });

            const firstConnected = result.current.devices[0].lastConnected;

            // Wait a bit and add again
            act(() => {
                result.current.addDevice('device-1', 'Device 1');
            });

            expect(result.current.devices.length).toBe(1);
            expect(result.current.devices[0].lastConnected).toBeGreaterThanOrEqual(firstConnected);
        });
    });

    describe('removeDevice', () => {
        it('should remove a device', () => {
            const { result } = renderHook(() => useKnownDevices());

            act(() => {
                result.current.addDevice('device-1', 'Device 1');
                result.current.addDevice('device-2', 'Device 2');
            });

            act(() => {
                result.current.removeDevice('device-1');
            });

            expect(result.current.devices.length).toBe(1);
            expect(result.current.devices[0].id).toBe('device-2');
        });

        it('should clear lastDeviceId if removed', () => {
            const { result } = renderHook(() => useKnownDevices());

            act(() => {
                result.current.addDevice('device-1', 'Device 1');
            });

            expect(result.current.lastDeviceId).toBe('device-1');

            act(() => {
                result.current.removeDevice('device-1');
            });

            expect(result.current.lastDeviceId).toBeNull();
        });
    });

    describe('renameDevice', () => {
        it('should rename an existing device', () => {
            const { result } = renderHook(() => useKnownDevices());

            act(() => {
                result.current.addDevice('device-1', 'Old Name');
            });

            act(() => {
                result.current.renameDevice('device-1', 'New Name');
            });

            expect(result.current.devices[0].name).toBe('New Name');
        });
    });

    describe('clearLastDevice', () => {
        it('should clear the last device ID', () => {
            const { result } = renderHook(() => useKnownDevices());

            act(() => {
                result.current.addDevice('device-1', 'Device 1');
            });

            act(() => {
                result.current.clearLastDevice();
            });

            expect(result.current.lastDeviceId).toBeNull();
        });
    });
});
