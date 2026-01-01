import { describe, it, expect } from 'vitest';
import { en, ro, translations, DEFAULT_LANGUAGE, Language } from '../../i18n/translations';

describe('translations', () => {
    describe('DEFAULT_LANGUAGE', () => {
        it('should be set to English', () => {
            expect(DEFAULT_LANGUAGE).toBe('en');
        });
    });

    describe('translations object', () => {
        it('should contain English translations', () => {
            expect(translations.en).toBeDefined();
        });

        it('should contain Romanian translations', () => {
            expect(translations.ro).toBeDefined();
        });

        it('should have same structure for all languages', () => {
            const enKeys = Object.keys(translations.en);
            const roKeys = Object.keys(translations.ro);

            expect(enKeys).toEqual(roKeys);
        });
    });

    describe('English translations (en)', () => {
        it('should have common translations', () => {
            expect(en.common).toBeDefined();
            expect(en.common.next).toBe('Next');
            expect(en.common.back).toBe('Back');
            expect(en.common.cancel).toBe('Cancel');
            expect(en.common.save).toBe('Save');
        });

        it('should have wizard translations', () => {
            expect(en.wizard).toBeDefined();
            expect(en.wizard.title).toBe('Setup Wizard');
        });

        it('should have settings translations', () => {
            expect(en.settings).toBeDefined();
            expect(en.settings.language).toBe('Language');
        });

        it('should have zones translations', () => {
            expect(en.zones).toBeDefined();
            expect(en.zones.zone).toBe('Zone');
            expect(en.zones.zones).toBe('Zones');
        });

        it('should have errors translations', () => {
            expect(en.errors).toBeDefined();
            expect(en.errors.connectionLost).toBeDefined();
        });

        it('should have categories translations', () => {
            expect(en.categories).toBeDefined();
            expect(en.categories.vegetables).toBe('Vegetables');
            expect(en.categories.fruits).toBe('Fruits');
            expect(en.categories.lawn).toBe('Lawn');
        });
    });

    describe('Romanian translations (ro)', () => {
        it('should have common translations', () => {
            expect(ro.common).toBeDefined();
            expect(ro.common.next).toBe('Înainte');
            expect(ro.common.back).toBe('Înapoi');
            expect(ro.common.cancel).toBe('Anulează');
            expect(ro.common.save).toBe('Salvează');
        });

        it('should have wizard translations', () => {
            expect(ro.wizard).toBeDefined();
            expect(ro.wizard.title).toBeDefined();
        });

        it('should have settings translations', () => {
            expect(ro.settings).toBeDefined();
            expect(ro.settings.language).toBeDefined();
        });

        it('should have zones translations', () => {
            expect(ro.zones).toBeDefined();
            expect(ro.zones.zone).toBeDefined();
        });

        it('should have categories translations', () => {
            expect(ro.categories).toBeDefined();
            expect(ro.categories.vegetables).toBeDefined();
        });
    });

    describe('translation completeness', () => {
        // Helper to get all string values from nested object
        const getStringPaths = (obj: any, prefix = ''): string[] => {
            const paths: string[] = [];
            for (const key of Object.keys(obj)) {
                const newPrefix = prefix ? `${prefix}.${key}` : key;
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    paths.push(...getStringPaths(obj[key], newPrefix));
                } else {
                    paths.push(newPrefix);
                }
            }
            return paths;
        };

        it('should have equal number of translation keys for en and ro', () => {
            const enPaths = getStringPaths(en);
            const roPaths = getStringPaths(ro);

            expect(enPaths.length).toBe(roPaths.length);
        });

        it('should have matching keys between en and ro', () => {
            const enPaths = getStringPaths(en).sort();
            const roPaths = getStringPaths(ro).sort();

            expect(enPaths).toEqual(roPaths);
        });

        it('should not have empty string values in en', () => {
            const checkEmpty = (obj: any, path = ''): string[] => {
                const emptyPaths: string[] = [];
                for (const key of Object.keys(obj)) {
                    const newPath = path ? `${path}.${key}` : key;
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        emptyPaths.push(...checkEmpty(obj[key], newPath));
                    } else if (obj[key] === '') {
                        emptyPaths.push(newPath);
                    }
                }
                return emptyPaths;
            };

            const emptyPaths = checkEmpty(en);
            expect(emptyPaths).toEqual([]);
        });
    });

    describe('Language type', () => {
        it('should accept valid language codes', () => {
            const validLanguages: Language[] = ['en', 'ro'];
            expect(validLanguages).toContain('en');
            expect(validLanguages).toContain('ro');
        });
    });
});
