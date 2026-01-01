/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => false
    }
}));

import { useHaptics } from '../../hooks/useHaptics';

describe('useHaptics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('non-native platform', () => {
        it('should report haptics not available', () => {
            const { result } = renderHook(() => useHaptics());
            expect(result.current.isAvailable).toBe(false);
        });

        it('should provide all haptic methods', () => {
            const { result } = renderHook(() => useHaptics());

            expect(result.current.lightTap).toBeDefined();
            expect(result.current.mediumTap).toBeDefined();
            expect(result.current.heavyTap).toBeDefined();
            expect(result.current.success).toBeDefined();
            expect(result.current.warning).toBeDefined();
            expect(result.current.error).toBeDefined();
            expect(result.current.selectionChanged).toBeDefined();
        });

        it('should not throw when calling haptic methods on non-native', async () => {
            const { result } = renderHook(() => useHaptics());

            await expect(result.current.lightTap()).resolves.toBeUndefined();
            await expect(result.current.success()).resolves.toBeUndefined();
            await expect(result.current.error()).resolves.toBeUndefined();
        });
    });
});
