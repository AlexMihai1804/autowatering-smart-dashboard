/**
 * Haptic Feedback Hook
 * 
 * Provides haptic feedback for touch interactions
 * Uses Capacitor Haptics plugin when available
 * 
 * 4.2: Haptic Feedback
 * 
 * Note: Install @capacitor/haptics for full functionality:
 *   npm install @capacitor/haptics
 *   npx cap sync
 */

import { useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

// Check if we're on a native platform
const isNative = Capacitor.isNativePlatform();

export interface UseHapticsReturn {
    /** Light tap feedback - for button presses */
    lightTap: () => Promise<void>;
    /** Medium tap feedback - for selections */
    mediumTap: () => Promise<void>;
    /** Heavy tap feedback - for important actions */
    heavyTap: () => Promise<void>;
    /** Success feedback - for completed actions */
    success: () => Promise<void>;
    /** Warning feedback - for warnings */
    warning: () => Promise<void>;
    /** Error feedback - for errors */
    error: () => Promise<void>;
    /** Selection changed feedback */
    selectionChanged: () => Promise<void>;
    /** Whether haptics are available */
    isAvailable: boolean;
}

export const useHaptics = (): UseHapticsReturn => {
    const isAvailable = useMemo(() => isNative, []);
    
    // Stub implementations - will work when @capacitor/haptics is installed
    // For now, these are no-ops that can be wired up later
    const lightTap = useCallback(async () => {
        if (!isNative) return;
        // Haptics.impact({ style: ImpactStyle.Light })
        console.debug('[Haptics] Light tap');
    }, []);
    
    const mediumTap = useCallback(async () => {
        if (!isNative) return;
        console.debug('[Haptics] Medium tap');
    }, []);
    
    const heavyTap = useCallback(async () => {
        if (!isNative) return;
        console.debug('[Haptics] Heavy tap');
    }, []);
    
    const success = useCallback(async () => {
        if (!isNative) return;
        console.debug('[Haptics] Success');
    }, []);
    
    const warning = useCallback(async () => {
        if (!isNative) return;
        console.debug('[Haptics] Warning');
    }, []);
    
    const error = useCallback(async () => {
        if (!isNative) return;
        console.debug('[Haptics] Error');
    }, []);
    
    const selectionChanged = useCallback(async () => {
        if (!isNative) return;
        console.debug('[Haptics] Selection changed');
    }, []);
    
    return {
        lightTap,
        mediumTap,
        heavyTap,
        success,
        warning,
        error,
        selectionChanged,
        isAvailable,
    };
};

export default useHaptics;
