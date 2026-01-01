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

// Mock matchMedia
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
}));
vi.stubGlobal('matchMedia', mockMatchMedia);

import { useTheme, Theme } from '../../hooks/useTheme';

describe('useTheme', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should default to dark theme', () => {
            const { result } = renderHook(() => useTheme());
            expect(result.current.theme).toBe('dark');
            expect(result.current.isDark).toBe(true);
        });

        it('should load saved theme from localStorage', () => {
            mockStorage['app_theme'] = 'light';

            const { result } = renderHook(() => useTheme());
            expect(result.current.theme).toBe('light');
            expect(result.current.isDark).toBe(false);
        });
    });

    describe('setTheme', () => {
        it('should update theme and persist', () => {
            const { result } = renderHook(() => useTheme());

            act(() => {
                result.current.setTheme('light');
            });

            expect(result.current.theme).toBe('light');
            expect(result.current.isDark).toBe(false);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('app_theme', 'light');
        });

        it('should support system theme', () => {
            const { result } = renderHook(() => useTheme());

            act(() => {
                result.current.setTheme('system');
            });

            expect(result.current.theme).toBe('system');
            // resolvedTheme depends on matchMedia mock (returns dark)
            expect(result.current.resolvedTheme).toBe('dark');
        });
    });
});
