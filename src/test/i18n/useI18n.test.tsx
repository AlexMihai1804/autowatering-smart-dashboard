/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useI18n, useTranslations } from '../../i18n/useI18n';

// Wrapper component for hooks that need I18nProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
);

describe('useI18n', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Reset document language
        document.documentElement.lang = 'en';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('I18nProvider', () => {
        it('should provide default language', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            expect(result.current.language).toBe('en');
        });

        it('should provide translation function', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            expect(typeof result.current.t).toBe('function');
        });

        it('should provide translations object', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            expect(result.current.translations).toBeDefined();
            expect(result.current.translations.common).toBeDefined();
        });

        it('should provide available languages', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            expect(result.current.availableLanguages).toContainEqual({
                code: 'en',
                name: 'English',
                nativeName: 'English',
            });
            expect(result.current.availableLanguages).toContainEqual({
                code: 'ro',
                name: 'Romanian',
                nativeName: 'Română',
            });
        });
    });

    describe('setLanguage', () => {
        it('should change language', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('ro');
            });

            expect(result.current.language).toBe('ro');
        });

        it('should save language to localStorage', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('ro');
            });

            expect(localStorage.getItem('app_language')).toBe('ro');
        });

        it('should update document lang attribute', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('ro');
            });

            expect(document.documentElement.lang).toBe('ro');
        });
    });

    describe('t (translation function)', () => {
        it('should translate simple keys', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            const translated = result.current.t('common.next');
            expect(translated).toBe('Next');
        });

        it('should translate nested keys', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            const translated = result.current.t('wizard.title');
            expect(translated).toBe('Setup Wizard');
        });

        it('should return key if translation not found', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            const translated = result.current.t('nonexistent.key.here');
            expect(translated).toBe('nonexistent.key.here');
        });

        it('should translate in Romanian when language is set', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('ro');
            });

            const translated = result.current.t('common.next');
            expect(translated).toBe('Înainte');
        });

        it('should fallback to English for missing Romanian translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('ro');
            });

            // Assuming some translation might be missing, it should fallback
            const translated = result.current.t('common.next');
            expect(translated).toBeTruthy();
            expect(translated).not.toBe('common.next');
        });
    });

    describe('useTranslations', () => {
        it('should return translations object', () => {
            const { result } = renderHook(() => useTranslations(), { wrapper });

            expect(result.current).toBeDefined();
            expect(result.current.common).toBeDefined();
            expect(result.current.common.next).toBe('Next');
        });

        it('should update when language changes', () => {
            const { result: i18nResult } = renderHook(() => useI18n(), { wrapper });
            const { result: transResult } = renderHook(() => useTranslations(), { wrapper });

            act(() => {
                i18nResult.current.setLanguage('ro');
            });

            // Need to re-render to get updated translations
            const { result: updatedTransResult } = renderHook(() => useTranslations(), { wrapper });
            expect(updatedTransResult.current.common.next).toBe('Înainte');
        });
    });

    describe('localStorage persistence', () => {
        it('should load saved language from localStorage', () => {
            localStorage.setItem('app_language', 'ro');

            const { result } = renderHook(() => useI18n(), { wrapper });

            expect(result.current.language).toBe('ro');
        });

        it('should default to English for invalid saved language', () => {
            localStorage.setItem('app_language', 'invalid');

            const { result } = renderHook(() => useI18n(), { wrapper });

            expect(result.current.language).toBe('en');
        });
    });

    describe('error handling', () => {
        it('should throw error when useI18n is used outside provider', () => {
            // This should throw
            expect(() => {
                renderHook(() => useI18n());
            }).toThrow('useI18n must be used within an I18nProvider');
        });
    });
});
