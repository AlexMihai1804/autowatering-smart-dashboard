/**
 * i18n Hook and Context
 * 
 * Provides translation functionality throughout the app
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys, DEFAULT_LANGUAGE } from './translations';

// Storage key
const LANGUAGE_STORAGE_KEY = 'app_language';

// Context type
interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    translations: TranslationKeys;
    availableLanguages: { code: Language; name: string; nativeName: string }[];
}

// Available languages
const AVAILABLE_LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ro', name: 'Romanian', nativeName: 'Română' },
];

// Create context
const I18nContext = createContext<I18nContextType | null>(null);

// Provider props
interface I18nProviderProps {
    children: ReactNode;
}

// Get saved language from storage
const getSavedLanguage = (): Language => {
    try {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && (saved === 'en' || saved === 'ro')) {
            return saved as Language;
        }
    } catch (e) {
        console.warn('[i18n] Failed to read saved language:', e);
    }
    return DEFAULT_LANGUAGE;
};

// Save language to storage
const saveLanguage = (lang: Language): void => {
    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
        console.warn('[i18n] Failed to save language:', e);
    }
};

// Provider component
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(getSavedLanguage);
    
    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        saveLanguage(lang);
        
        // Update document lang attribute for accessibility
        document.documentElement.lang = lang;
    }, []);
    
    // Set initial document language
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);
    
    // Translation function - supports dot notation like 'wizard.welcome.title'
    const t = useCallback((key: string): string => {
        const keys = key.split('.');
        let result: unknown = translations[language];
        
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = (result as Record<string, unknown>)[k];
            } else {
                // Fallback to English if key not found
                let fallback: unknown = translations.en;
                for (const fk of keys) {
                    if (fallback && typeof fallback === 'object' && fk in fallback) {
                        fallback = (fallback as Record<string, unknown>)[fk];
                    } else {
                        console.warn(`[i18n] Translation key not found: ${key}`);
                        return key; // Return key as fallback
                    }
                }
                return typeof fallback === 'string' ? fallback : key;
            }
        }
        
        return typeof result === 'string' ? result : key;
    }, [language]);
    
    const value: I18nContextType = {
        language,
        setLanguage,
        t,
        translations: translations[language],
        availableLanguages: AVAILABLE_LANGUAGES,
    };
    
    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
};

// Hook to use translations
export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};

// Simple hook that just returns translations object (for components that prefer object access)
export const useTranslations = (): TranslationKeys => {
    const { translations } = useI18n();
    return translations;
};

// Export types
export type { Language, TranslationKeys };
