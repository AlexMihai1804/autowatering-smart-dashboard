import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n';

export interface AppSettings {
  // Temperature
  useCelsius: boolean;
  
  // Units
  useMetric: boolean; // true = metric (L, m2), false = imperial (gal, ft2)
  
  // Locale
  locale: string; // e.g., 'en-US', 'ro-RO'
  
  // Theme (for future use)
  theme: 'dark' | 'light' | 'auto';
}

const SETTINGS_KEY = 'autowatering_settings';

// Detect user's region and set defaults
const detectRegionSettings = (): AppSettings => {
  // Get browser locale
  const browserLocale = navigator.language || 'en-US';
  
  // Countries that use Fahrenheit: US, Bahamas, Belize, Cayman Islands, Palau
  const fahrenheitCountries = ['US', 'BS', 'BZ', 'KY', 'PW'];
  const countryCode = browserLocale.split('-')[1]?.toUpperCase() || '';
  
  // Countries that use imperial: US, UK (partially), Myanmar, Liberia
  const imperialCountries = ['US', 'MM', 'LR'];
  
  const useCelsius = !fahrenheitCountries.includes(countryCode);
  const useMetric = !imperialCountries.includes(countryCode);
  
  return {
    useCelsius,
    useMetric,
    locale: browserLocale,
    theme: 'dark',
  };
};

// Load settings from localStorage or detect from region
const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all fields exist
      return { ...detectRegionSettings(), ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
  
  // First time - detect from region
  const detected = detectRegionSettings();
  // Save detected settings
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(detected));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
  return detected;
};

// Save settings to localStorage
const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
};

/**
 * Hook for managing app settings with localStorage persistence
 */
export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);
  const { t } = useI18n();

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettingsState(prev => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Update multiple settings at once
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Reset to detected defaults
  const resetToDefaults = useCallback(() => {
    const detected = detectRegionSettings();
    saveSettings(detected);
    setSettingsState(detected);
  }, []);

  // Temperature formatting helpers
  const formatTemperature = useCallback((celsius: number, showUnit = true): string => {
    if (settings.useCelsius) {
      const formatted = celsius.toFixed(1);
      return showUnit ? `${formatted}${t('common.degreesC')}` : formatted;
    }
    const fahrenheit = (celsius * 9/5) + 32;
    const formatted = fahrenheit.toFixed(1);
    return showUnit ? `${formatted}${t('common.degreesF')}` : formatted;
  }, [settings.useCelsius, t]);

  // Volume formatting (liters or gallons)
  const formatVolume = useCallback((liters: number, showUnit = true): string => {
    if (settings.useMetric) {
      const formatted = liters.toFixed(1);
      return showUnit ? `${formatted} ${t('common.litersShort')}` : formatted;
    }
    const gallons = liters * 0.264172;
    const formatted = gallons.toFixed(1);
    return showUnit ? `${formatted} ${t('common.gallonsShort')}` : formatted;
  }, [settings.useMetric, t]);

  // Area formatting (m2 or ft2)
  const formatArea = useCallback((squareMeters: number, showUnit = true): string => {
    if (settings.useMetric) {
      const formatted = squareMeters.toFixed(1);
      return showUnit ? `${formatted} ${t('common.squareMetersShort')}` : formatted;
    }
    const sqft = squareMeters * 10.7639;
    const formatted = sqft.toFixed(1);
    return showUnit ? `${formatted} ${t('common.squareFeetShort')}` : formatted;
  }, [settings.useMetric, t]);

  return {
    settings,
    updateSetting,
    updateSettings,
    resetToDefaults,
    formatTemperature,
    formatVolume,
    formatArea,
    // Convenience getters
    useCelsius: settings.useCelsius,
    useMetric: settings.useMetric,
    locale: settings.locale,
  };
}

export default useSettings;