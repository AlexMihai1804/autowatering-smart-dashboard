/**
 * Hooks Index
 * 
 * Re-exports all custom hooks for easy importing
 */

// Existing hooks
export { useCalibration } from './useCalibration';
export { useMediaQuery } from './useMediaQuery';
export { useReset } from './useReset';

// New UX enhancement hooks (3.x - 4.x)
export { useTheme, type Theme, type UseThemeReturn } from './useTheme';
export { useOfflineMode, type UseOfflineModeReturn } from './useOfflineMode';
export { useConfigExport, type ConfigExportData, type UseConfigExportReturn } from './useConfigExport';
export { useVoiceInput, type UseVoiceInputReturn } from './useVoiceInput';
export { useHaptics, type UseHapticsReturn } from './useHaptics';
export { useSmartDefaults, type SmartDefaults, getCloneableProperties, getSuggestedZoneName } from './useSmartDefaults';
