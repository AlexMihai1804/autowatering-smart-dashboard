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
export { useTheme, type Theme } from './useTheme';
export { useOfflineMode } from './useOfflineMode';
export { useConfigExport } from './useConfigExport';
export { useVoiceInput } from './useVoiceInput';
export { useHaptics } from './useHaptics';
export { useSmartDefaults, type SmartDefaults, getCloneableProperties, getSuggestedZoneName } from './useSmartDefaults';
