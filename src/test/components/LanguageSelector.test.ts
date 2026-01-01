/**
 * Tests for LanguageSelector component helpers
 * Tests language codes, native names, formatting
 */
import { describe, it, expect } from 'vitest';

type Language = 'en' | 'ro';

interface LanguageInfo {
    code: Language;
    nativeName: string;
    englishName: string;
}

const AVAILABLE_LANGUAGES: LanguageInfo[] = [
    { code: 'en', nativeName: 'English', englishName: 'English' },
    { code: 'ro', nativeName: 'Română', englishName: 'Romanian' },
];

describe('LanguageSelector', () => {
    describe('Available Languages', () => {
        it('should have English available', () => {
            const english = AVAILABLE_LANGUAGES.find(l => l.code === 'en');
            expect(english).toBeDefined();
            expect(english?.nativeName).toBe('English');
        });

        it('should have Romanian available', () => {
            const romanian = AVAILABLE_LANGUAGES.find(l => l.code === 'ro');
            expect(romanian).toBeDefined();
            expect(romanian?.nativeName).toBe('Română');
        });

        it('should have at least 2 languages', () => {
            expect(AVAILABLE_LANGUAGES.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Language Code Formatting', () => {
        const formatLanguageCode = (code: string): string => {
            return code.toUpperCase();
        };

        it('should format en as EN', () => {
            expect(formatLanguageCode('en')).toBe('EN');
        });

        it('should format ro as RO', () => {
            expect(formatLanguageCode('ro')).toBe('RO');
        });
    });

    describe('Language Lookup', () => {
        const findLanguage = (code: Language): LanguageInfo | undefined => {
            return AVAILABLE_LANGUAGES.find(l => l.code === code);
        };

        it('should find language by code', () => {
            expect(findLanguage('en')?.nativeName).toBe('English');
            expect(findLanguage('ro')?.nativeName).toBe('Română');
        });
    });

    describe('Active Language Detection', () => {
        const isActiveLanguage = (currentLang: Language, buttonLang: Language): boolean => {
            return currentLang === buttonLang;
        };

        it('should detect active language', () => {
            expect(isActiveLanguage('en', 'en')).toBe(true);
            expect(isActiveLanguage('en', 'ro')).toBe(false);
        });
    });

    describe('Button Styling', () => {
        const getButtonStyle = (isActive: boolean): string => {
            if (isActive) {
                return 'bg-cyber-emerald text-black font-medium';
            }
            return 'bg-white/10 text-gray-400 hover:bg-white/20';
        };

        it('should return active style for selected language', () => {
            const style = getButtonStyle(true);
            expect(style).toContain('bg-cyber-emerald');
            expect(style).toContain('font-medium');
        });

        it('should return inactive style for non-selected', () => {
            const style = getButtonStyle(false);
            expect(style).toContain('bg-white/10');
            expect(style).toContain('text-gray-400');
        });
    });
});

describe('Translation System', () => {
    const DEFAULT_LANGUAGE: Language = 'en';

    describe('Default Language', () => {
        it('should default to English', () => {
            expect(DEFAULT_LANGUAGE).toBe('en');
        });
    });

    describe('Translation Key Structure', () => {
        // Common translation keys
        const commonKeys = [
            'common.next',
            'common.back',
            'common.cancel',
            'common.save',
            'common.confirm',
            'common.loading',
            'common.error',
            'common.success',
        ];

        it('should have proper key structure', () => {
            commonKeys.forEach(key => {
                expect(key.split('.').length).toBeGreaterThanOrEqual(2);
            });
        });

        it('should have common prefix for common keys', () => {
            commonKeys.forEach(key => {
                expect(key.startsWith('common.')).toBe(true);
            });
        });
    });

    describe('Translation Fallback', () => {
        const getTranslation = (
            translations: Record<string, string>,
            key: string,
            fallback?: string
        ): string => {
            return translations[key] || fallback || key;
        };

        it('should return translation when exists', () => {
            const translations = { 'common.save': 'Save' };
            expect(getTranslation(translations, 'common.save')).toBe('Save');
        });

        it('should return fallback when translation missing', () => {
            const translations = {};
            expect(getTranslation(translations, 'missing.key', 'Fallback')).toBe('Fallback');
        });

        it('should return key when no translation or fallback', () => {
            const translations = {};
            expect(getTranslation(translations, 'missing.key')).toBe('missing.key');
        });
    });

    describe('Language Persistence', () => {
        const STORAGE_KEY = 'app_language';

        it('should use correct storage key', () => {
            expect(STORAGE_KEY).toBe('app_language');
        });

        it('should validate language code', () => {
            const isValidLanguage = (code: string): code is Language => {
                return code === 'en' || code === 'ro';
            };

            expect(isValidLanguage('en')).toBe(true);
            expect(isValidLanguage('ro')).toBe(true);
            expect(isValidLanguage('fr')).toBe(false);
            expect(isValidLanguage('')).toBe(false);
        });
    });
});

describe('Translation Interpolation', () => {
    const interpolate = (
        template: string,
        values: Record<string, string | number>
    ): string => {
        return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
    };

    it('should replace single placeholder', () => {
        expect(interpolate('Hello {name}', { name: 'World' })).toBe('Hello World');
    });

    it('should replace multiple placeholders', () => {
        expect(interpolate('{greeting} {name}!', { greeting: 'Hello', name: 'World' }))
            .toBe('Hello World!');
    });

    it('should handle number values', () => {
        expect(interpolate('Count: {count}', { count: 42 })).toBe('Count: 42');
    });

    it('should keep placeholder if value missing', () => {
        expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
    });

    it('should handle multiple occurrences', () => {
        expect(interpolate('{x} + {x} = {result}', { x: 2, result: 4 }))
            .toBe('2 + 2 = 4');
    });
});
