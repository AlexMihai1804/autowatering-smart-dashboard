/**
 * Offline Mode Support
 * 
 * 4.6: Cache plant/soil databases for offline use
 */

import { useState, useEffect, useCallback } from 'react';

const CACHE_KEYS = {
    PLANT_DB: 'offline_plant_db',
    SOIL_DB: 'offline_soil_db',
    IRRIGATION_DB: 'offline_irrigation_db',
    LAST_SYNC: 'offline_last_sync',
};

export interface OfflineData {
    plants: any[];
    soils: any[];
    irrigationMethods: any[];
    lastSync: Date | null;
}

export const useOfflineMode = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [hasCachedData, setHasCachedData] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    
    // Check for cached data on mount
    useEffect(() => {
        checkCachedData();
    }, []);
    
    // Listen for online/offline events
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    
    const checkCachedData = useCallback(() => {
        try {
            const hasPlants = localStorage.getItem(CACHE_KEYS.PLANT_DB) !== null;
            const hasSoils = localStorage.getItem(CACHE_KEYS.SOIL_DB) !== null;
            setHasCachedData(hasPlants && hasSoils);
            
            const syncTime = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
            if (syncTime) {
                setLastSync(new Date(syncTime));
            }
        } catch (e) {
            console.warn('[Offline] Failed to check cached data:', e);
        }
    }, []);
    
    const cacheData = useCallback((data: { plants?: any[]; soils?: any[]; irrigationMethods?: any[] }) => {
        try {
            if (data.plants) {
                localStorage.setItem(CACHE_KEYS.PLANT_DB, JSON.stringify(data.plants));
            }
            if (data.soils) {
                localStorage.setItem(CACHE_KEYS.SOIL_DB, JSON.stringify(data.soils));
            }
            if (data.irrigationMethods) {
                localStorage.setItem(CACHE_KEYS.IRRIGATION_DB, JSON.stringify(data.irrigationMethods));
            }
            
            const now = new Date();
            localStorage.setItem(CACHE_KEYS.LAST_SYNC, now.toISOString());
            setLastSync(now);
            setHasCachedData(true);
            
            console.log('[Offline] Data cached successfully');
        } catch (e) {
            console.error('[Offline] Failed to cache data:', e);
        }
    }, []);
    
    const getCachedData = useCallback((): OfflineData => {
        try {
            const plants = JSON.parse(localStorage.getItem(CACHE_KEYS.PLANT_DB) || '[]');
            const soils = JSON.parse(localStorage.getItem(CACHE_KEYS.SOIL_DB) || '[]');
            const irrigationMethods = JSON.parse(localStorage.getItem(CACHE_KEYS.IRRIGATION_DB) || '[]');
            const syncTime = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
            
            return {
                plants,
                soils,
                irrigationMethods,
                lastSync: syncTime ? new Date(syncTime) : null,
            };
        } catch (e) {
            console.error('[Offline] Failed to get cached data:', e);
            return { plants: [], soils: [], irrigationMethods: [], lastSync: null };
        }
    }, []);
    
    const clearCache = useCallback(() => {
        try {
            localStorage.removeItem(CACHE_KEYS.PLANT_DB);
            localStorage.removeItem(CACHE_KEYS.SOIL_DB);
            localStorage.removeItem(CACHE_KEYS.IRRIGATION_DB);
            localStorage.removeItem(CACHE_KEYS.LAST_SYNC);
            setHasCachedData(false);
            setLastSync(null);
        } catch (e) {
            console.error('[Offline] Failed to clear cache:', e);
        }
    }, []);
    
    return {
        isOnline,
        hasCachedData,
        lastSync,
        cacheData,
        getCachedData,
        clearCache,
    };
};

export default useOfflineMode;
