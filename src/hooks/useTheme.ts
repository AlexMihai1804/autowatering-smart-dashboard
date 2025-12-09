/**
 * Theme Management Hook
 * 
 * 4.5: Dark/light theme with system preference
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = 'app_theme';

const getSystemTheme = (): 'dark' | 'light' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
};

const getSavedTheme = (): Theme => {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
            return saved;
        }
    } catch (e) {
        console.warn('[Theme] Failed to read saved theme:', e);
    }
    return 'dark'; // Default to dark for this app
};

const applyTheme = (theme: 'dark' | 'light') => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update Ionic theme
    if (theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
};

export const useTheme = () => {
    const [theme, setThemeState] = useState<Theme>(getSavedTheme);
    const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(
        getSavedTheme() === 'system' ? getSystemTheme() : getSavedTheme() as 'dark' | 'light'
    );
    
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch (e) {
            console.warn('[Theme] Failed to save theme:', e);
        }
    }, []);
    
    // Apply theme on change
    useEffect(() => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        setResolvedTheme(resolved);
        applyTheme(resolved);
    }, [theme]);
    
    // Listen for system theme changes
    useEffect(() => {
        if (theme !== 'system') return;
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            const newTheme = e.matches ? 'dark' : 'light';
            setResolvedTheme(newTheme);
            applyTheme(newTheme);
        };
        
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);
    
    return {
        theme,
        resolvedTheme,
        setTheme,
        isDark: resolvedTheme === 'dark',
    };
};

export default useTheme;
