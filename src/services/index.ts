/**
 * Services Index
 * 
 * Central export point for all BLE and device services.
 */

// Core BLE Service
export { BleService } from './BleService';

// High-level services
export { 
    ResetService, 
    initResetService, 
    getResetService,
    RESET_NAMES,
    RESET_DESCRIPTIONS,
    resetRequiresChannel
} from './ResetService';
export type { ResetResult, ResetProgress } from './ResetService';

export { 
    CalibrationService, 
    initCalibrationService, 
    getCalibrationService,
    DEFAULT_PULSES_PER_LITER,
    MIN_CALIBRATION_VOLUME_ML,
    RECOMMENDED_CALIBRATION_VOLUME_ML,
    getCalibrationAccuracy,
    formatCalibration,
    calculateFlowRate
} from './CalibrationService';
export type { CalibrationResult, CalibrationProgress, CalibrationStage } from './CalibrationService';

// Fragmentation manager
export { BleFragmentationManager } from './BleFragmentationManager';

// Database service
export { DatabaseService } from './DatabaseService';

// SoilGrids service (auto-detect soil from GPS)
export { 
    SoilGridsService,
    shouldEnableCycleSoak,
    calculateRecommendedMaxVolume,
    calculateCycleSoakTiming
} from './SoilGridsService';
export type { SoilGridsResult } from './SoilGridsService';

// History service
export { 
    HistoryService, 
    getHistoryService 
} from './HistoryService';
export type { 
    DateRange, 
    HistoryStats, 
    EnvStats, 
    RainStats,
    AggregatedWateringData,
    AggregatedEnvData,
    AggregatedRainData,
    TrendData,
    CacheMetadata,
    HistoryDataType,
    AggregationPeriod
} from './HistoryService';

/**
 * Initialize all high-level services
 * Call this after BleService is ready
 */
export function initializeServices(bleService: import('./BleService').BleService): void {
    const { initResetService } = require('./ResetService');
    const { initCalibrationService } = require('./CalibrationService');
    
    initResetService(bleService);
    initCalibrationService(bleService);
    
    console.log('[Services] All services initialized');
}
