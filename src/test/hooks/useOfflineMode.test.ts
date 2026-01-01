/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineMode } from '../../hooks/useOfflineMode';

describe('useOfflineMode Hook', () => {
    let addEventListenerSpy: any;
    let removeEventListenerSpy: any;
    let setItemSpy: any;
    let getItemSpy: any;
    let removeItemSpy: any;
    let store: Record<string, string> = {};

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset store
        store = {};

        // Mock window events
        addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        // Mock localStorage
        setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
            store[key] = value.toString();
        });

        getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
            return store[key] || null;
        });

        removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
            delete store[key];
        });

        // Default online status
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with current online status', () => {
        const { result } = renderHook(() => useOfflineMode());
        expect(result.current.isOnline).toBe(true);
    });

    it('should update online status on window events', () => {
        const { result } = renderHook(() => useOfflineMode());

        act(() => {
            const offlineEvent = new Event('offline');
            window.dispatchEvent(offlineEvent);
        });
        expect(result.current.isOnline).toBe(false);

        act(() => {
            const onlineEvent = new Event('online');
            window.dispatchEvent(onlineEvent);
        });
        expect(result.current.isOnline).toBe(true);
    });

    it('should cache data and set cached flag', () => {
        const { result } = renderHook(() => useOfflineMode());

        const mockData = {
            plants: [{ id: 1, name: 'Rose' }],
            soils: [{ id: 1, type: 'Clay' }],
            irrigationMethods: [{ id: 1, method: 'Drip' }]
        };

        act(() => {
            result.current.cacheData(mockData);
        });

        expect(setItemSpy).toHaveBeenCalledWith('offline_plant_db', JSON.stringify(mockData.plants));
        expect(setItemSpy).toHaveBeenCalledWith('offline_soil_db', JSON.stringify(mockData.soils));
        expect(setItemSpy).toHaveBeenCalledWith('offline_irrigation_db', JSON.stringify(mockData.irrigationMethods));
        expect(setItemSpy).toHaveBeenCalledWith('offline_last_sync', expect.any(String));

        expect(result.current.hasCachedData).toBe(true);
        expect(result.current.lastSync).toBeInstanceOf(Date);
    });

    it('should check cached data on mount', async () => {
        // Pre-populate storage
        localStorage.setItem('offline_plant_db', '[]');
        localStorage.setItem('offline_soil_db', '[]');

        const { result } = renderHook(() => useOfflineMode());

        await waitFor(() => {
            expect(result.current.hasCachedData).toBe(true);
        });
    });

    it('should retrieve cached data', async () => {
        const mockData = {
            plants: [{ id: 1, name: 'Rose' }],
            soils: [{ id: 1, type: 'Clay' }],
            irrigationMethods: [{ id: 1, method: 'Drip' }]
        };

        // Pre-populate storage
        localStorage.setItem('offline_plant_db', JSON.stringify(mockData.plants));
        localStorage.setItem('offline_soil_db', JSON.stringify(mockData.soils));
        localStorage.setItem('offline_irrigation_db', JSON.stringify(mockData.irrigationMethods));
        localStorage.setItem('offline_last_sync', new Date().toISOString());

        const { result } = renderHook(() => useOfflineMode());

        let cached;
        // getCachedData is synchronous, but initial load might take a tick? No, useOfflineMode doesn't auto-load content to state.
        // It just checks existence. 
        // But getCachedData reads from localStorage.

        act(() => {
            cached = result.current.getCachedData();
        });

        expect(cached).toEqual({
            plants: mockData.plants,
            soils: mockData.soils,
            irrigationMethods: mockData.irrigationMethods,
            lastSync: expect.any(Date)
        });
    });

    it('should clear cache', () => {
        const { result } = renderHook(() => useOfflineMode());

        // Cache first
        act(() => {
            result.current.cacheData({ plants: [] });
        });
        expect(result.current.hasCachedData).toBe(true); // Technically depends on plants AND soils being present for checkCachedData logic, but let's see implementation

        // Force hasCachedData true for test if needed, or better, cache everything
        act(() => {
            result.current.cacheData({ plants: [], soils: [] });
        });

        act(() => {
            result.current.clearCache();
        });

        expect(removeItemSpy).toHaveBeenCalledWith('offline_plant_db');
        expect(removeItemSpy).toHaveBeenCalledWith('offline_soil_db');
        expect(removeItemSpy).toHaveBeenCalledWith('offline_irrigation_db');
        expect(removeItemSpy).toHaveBeenCalledWith('offline_last_sync');

        expect(result.current.hasCachedData).toBe(false);
        expect(result.current.lastSync).toBeNull();
    });
});
