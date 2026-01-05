/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { I18nProvider } from '../../i18n';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
    clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); })
};

vi.stubGlobal('localStorage', mockLocalStorage);

// Mock navigator.language as 'ro-RO' (Romania uses Celsius)
Object.defineProperty(navigator, 'language', { value: 'ro-RO', writable: true });

import { useSettings, AppSettings } from '../../hooks/useSettings';

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
);

const renderUseSettings = () => renderHook(() => useSettings(), { wrapper });

describe('useSettings', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should detect region settings on first load', () => {
            const { result } = renderUseSettings();

            expect(result.current.settings).toBeDefined();
            // Romania uses Celsius
            expect(result.current.useCelsius).toBe(true);
        });

        it('should load saved settings from localStorage', () => {
            const savedSettings: AppSettings = {
                useCelsius: false,
                useMetric: false,
                locale: 'en-US',
                theme: 'light'
            };
            mockStorage['autowatering_settings'] = JSON.stringify(savedSettings);

            const { result } = renderUseSettings();

            expect(result.current.useCelsius).toBe(false);
            expect(result.current.useMetric).toBe(false);
        });
    });

    describe('updateSetting', () => {
        it('should update a single setting and persist', () => {
            const { result } = renderUseSettings();

            act(() => {
                result.current.updateSetting('useCelsius', false);
            });

            expect(result.current.useCelsius).toBe(false);
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('updateSettings', () => {
        it('should update multiple settings at once', () => {
            const { result } = renderUseSettings();

            act(() => {
                result.current.updateSettings({ useCelsius: false, theme: 'light' });
            });

            expect(result.current.useCelsius).toBe(false);
            expect(result.current.settings.theme).toBe('light');
        });
    });

    describe('formatters', () => {
        it('should format temperature correctly in Celsius', () => {
            const { result } = renderUseSettings();
            act(() => { result.current.updateSetting('useCelsius', true); });
            expect(result.current.formatTemperature(25)).toBe('25.0\u00B0C');
        });

        it('should format temperature correctly in Fahrenheit', () => {
            const { result } = renderUseSettings();
            act(() => { result.current.updateSetting('useCelsius', false); });
            expect(result.current.formatTemperature(25)).toBe('77.0\u00B0F');
        });

        it('should format volume correctly in metric', () => {
            const { result } = renderUseSettings();
            act(() => { result.current.updateSetting('useMetric', true); });
            expect(result.current.formatVolume(10)).toBe('10.0 L');
        });

        it('should format volume correctly in imperial', () => {
            const { result } = renderUseSettings();
            act(() => { result.current.updateSetting('useMetric', false); });
            expect(result.current.formatVolume(10)).toContain('gal');
        });

        it('should format area correctly', () => {
            const { result } = renderUseSettings();
            act(() => { result.current.updateSetting('useMetric', true); });
            expect(result.current.formatArea(100)).toBe('100.0 m2');
        });
    });

    describe('resetToDefaults', () => {
        it('should reset settings to detected defaults', () => {
            const { result } = renderUseSettings();

            act(() => {
                result.current.updateSetting('theme', 'light');
                result.current.resetToDefaults();
            });

            expect(result.current.settings.theme).toBe('dark'); // Default
        });
    });
});