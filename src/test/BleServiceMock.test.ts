/**
 * BleServiceMock Unit Tests
 * 
 * Tests for the mock BLE service used in development/testing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BleServiceMock } from '../services/BleServiceMock';

describe('BleServiceMock', () => {
    let mockService: BleServiceMock;

    beforeEach(() => {
        mockService = new BleServiceMock();
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    describe('Constructor', () => {
        it('should start with connected = false', () => {
            expect(mockService.connected).toBe(false);
        });
    });

    describe('initialize', () => {
        it('should complete without error', async () => {
            await expect(mockService.initialize()).resolves.toBeUndefined();
        });
    });

    describe('scan', () => {
        it('should return mock device list', async () => {
            const devices = await mockService.scan();
            
            expect(devices).toBeInstanceOf(Array);
            expect(devices.length).toBe(1);
            expect(devices[0]).toEqual({
                deviceId: 'MOCK_DEVICE_01',
                name: 'AutoWatering',
                rssi: -50
            });
        });
    });

    describe('connect', () => {
        it('should set connected to true', async () => {
            expect(mockService.connected).toBe(false);
            
            await mockService.connect('MOCK_DEVICE_01');
            
            expect(mockService.connected).toBe(true);
        });

        it('should resolve successfully', async () => {
            await expect(mockService.connect('any-device')).resolves.toBeUndefined();
        });
    });

    describe('disconnect', () => {
        it('should set connected to false', async () => {
            // First connect
            await mockService.connect('MOCK_DEVICE_01');
            expect(mockService.connected).toBe(true);
            
            // Then disconnect
            await mockService.disconnect('MOCK_DEVICE_01');
            expect(mockService.connected).toBe(false);
        });

        it('should resolve successfully', async () => {
            await expect(mockService.disconnect('any-device')).resolves.toBeUndefined();
        });
    });

    describe('write', () => {
        it('should resolve successfully', async () => {
            const value = new DataView(new ArrayBuffer(4));
            await expect(
                mockService.write('service-uuid', 'char-uuid', value)
            ).resolves.toBeUndefined();
        });
    });

    describe('read', () => {
        it('should return a DataView', async () => {
            const result = await mockService.read('service-uuid', 'char-uuid');
            
            expect(result).toBeInstanceOf(DataView);
            expect(result.byteLength).toBe(4);
        });
    });

    describe('startNotifications', () => {
        it('should call callback when connected', async () => {
            vi.useFakeTimers();
            
            const callback = vi.fn();
            await mockService.connect('MOCK_DEVICE_01');
            await mockService.startNotifications('service-uuid', 'char-uuid', callback);
            
            // Fast-forward time to trigger interval
            vi.advanceTimersByTime(1000);
            
            expect(callback).toHaveBeenCalled();
            expect(callback).toHaveBeenCalledWith(expect.any(DataView));
            
            vi.useRealTimers();
        });

        it('should not call callback when disconnected', async () => {
            vi.useFakeTimers();
            
            const callback = vi.fn();
            // Don't connect - leave disconnected
            await mockService.startNotifications('service-uuid', 'char-uuid', callback);
            
            // Fast-forward time
            vi.advanceTimersByTime(1000);
            
            expect(callback).not.toHaveBeenCalled();
            
            vi.useRealTimers();
        });
    });
});
