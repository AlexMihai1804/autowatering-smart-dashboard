// ============================================================================
// Channel Configuration Wizard Types
// ============================================================================

import { PlantDBEntry, SoilDBEntry, IrrigationMethodEntry } from '../services/DatabaseService';

// ============================================================================
// Watering Mode - 4 options
// ============================================================================
export type WateringMode = 'fao56_auto' | 'fao56_eco' | 'duration' | 'volume';

export const WATERING_MODE_LABELS: Record<WateringMode, string> = {
    fao56_auto: 'FAO-56 Auto',
    fao56_eco: 'FAO-56 Eco',
    duration: 'Duration',
    volume: 'Volume'
};

export const WATERING_MODE_DESCRIPTIONS: Record<WateringMode, string> = {
    fao56_auto: 'Smart calculation - 100% water needs based on plant, soil & weather',
    fao56_eco: 'Eco mode - 70% water needs for water saving',
    duration: 'Manual - fixed duration in minutes',
    volume: 'Manual - fixed volume in liters'
};

export const WATERING_MODE_ICONS: Record<WateringMode, string> = {
    fao56_auto: '🌱',
    fao56_eco: '💧',
    duration: '⏱️',
    volume: '🚿'
};

// ============================================================================
// Location Data
// ============================================================================
export interface LocationData {
    latitude: number;
    longitude: number;
    source: 'gps' | 'map' | 'manual';
    accuracy?: number;  // GPS accuracy in meters
}

// ============================================================================
// Schedule Configuration
// ============================================================================
export type ScheduleType = 'daily' | 'periodic' | 'auto';

export interface ScheduleConfig {
    enabled: boolean;
    type: ScheduleType;
    daysMask: number;       // Bitmask for daily (bit 0=Mon, bit 6=Sun) or interval days for periodic
    hour: number;           // 0-23
    minute: number;         // 0-59
    value: number;          // Duration in minutes or volume in liters (for manual modes)
    useSolarTiming: boolean;
    solarEvent: 'sunrise' | 'sunset';
    solarOffsetMinutes: number; // -120..120
}

// ============================================================================
// Unified Zone Configuration - all data for one channel
// ============================================================================
export interface UnifiedZoneConfig {
    channelId: number;          // 0-7
    enabled: boolean;           // Whether this zone is configured
    skipped: boolean;           // Whether user skipped this zone
    
    // Basic info
    name: string;
    wateringMode: WateringMode;
    
    // FAO-56 specific (only used when wateringMode is fao56_auto or fao56_eco)
    plant: PlantDBEntry | null;
    soil: SoilDBEntry | null;
    soilAutoDetected: boolean;      // Whether soil was auto-detected from GPS
    soilDetectionConfidence: 'high' | 'medium' | 'low' | null;
    // Custom Soil from SoilGrids detection (calculated from clay/sand/silt)
    customSoilFromDetection: {
        enabled: boolean;           // Use custom soil instead of DB match
        clay: number;               // Clay % detected
        sand: number;               // Sand % detected  
        silt: number;               // Silt % detected
        field_capacity: number;     // Calculated FC %
        wilting_point: number;      // Calculated WP %
        infiltration_rate: number;  // Calculated mm/hr
        bulk_density: number;       // Estimated g/cm³
        organic_matter: number;     // Estimated %
        name: string;               // e.g., "Detected Heavy clay"
    } | null;
    irrigationMethod: IrrigationMethodEntry | null;
    
    // Environment (FAO-56 only)
    location: LocationData | null;
    sunExposure: number;            // 0-100 percent
    coverageType: 'area' | 'plants';
    coverageValue: number;          // m² or plant count
    plantingDate: number | null;    // Unix timestamp (optional)
    maxVolumeLimit: number;         // Safety limit in liters
    
    // Cycle & Soak (auto-calculated based on soil, can be overridden)
    enableCycleSoak: boolean;
    cycleSoakAutoEnabled: boolean;  // Whether it was auto-enabled
    cycleMinutes: number;
    soakMinutes: number;
    
    // Schedule (all modes)
    schedule: ScheduleConfig;
}

// ============================================================================
// Wizard Step Definition
// ============================================================================
export type WizardStep = 
    | 'mode'        // Step 1: Name + Mode selection
    | 'plant'       // Step 2: Plant selection (FAO-56 only)
    | 'location'    // Step 3: Location/GPS (FAO-56 only) - MOVED UP for soil auto-detect
    | 'soil'        // Step 4: Soil selection with auto-detect (FAO-56 only)
    | 'irrigation'  // Step 5: Irrigation method (FAO-56 only)
    | 'environment' // Step 6: Coverage + Sun + Cycle&Soak + Max Volume (FAO-56 only)
    | 'schedule'    // Step 7: Schedule configuration
    | 'summary';    // Step 8: Zone summary before save

// Steps for FAO-56 modes (location before soil for auto-detect)
export const FAO56_STEPS: WizardStep[] = ['mode', 'plant', 'location', 'soil', 'irrigation', 'environment', 'schedule', 'summary'];

// Steps for manual modes (duration/volume)
export const MANUAL_STEPS: WizardStep[] = ['mode', 'schedule', 'summary'];

// ============================================================================
// Wizard State
// ============================================================================
export type WizardPhase = 'zones' | 'final_summary' | 'complete';

export interface ChannelWizardState {
    isOpen: boolean;
    phase: WizardPhase;
    
    // Zone navigation
    currentZoneIndex: number;       // 0-7
    currentStep: WizardStep;
    
    // Skip logic
    skipAllRemaining: boolean;
    
    // Shared location (GPS acquired once, used for all zones)
    sharedLocation: LocationData | null;
    useSharedLocationForAll: boolean;   // Checkbox: "Use this location for all zones"
    
    // Shared soil (auto-detected from shared location)
    sharedSoil: import('../services/DatabaseService').SoilDBEntry | null;
    sharedSoilConfidence: 'high' | 'medium' | 'low' | null;
    
    // All zones configuration
    zones: UnifiedZoneConfig[];
    
    // Tile download state
    tilesDownloading: boolean;
    tilesProgress: number;          // 0-100
}

// ============================================================================
// Default Values
// ============================================================================
export const DEFAULT_SCHEDULE: ScheduleConfig = {
    enabled: true,
    type: 'auto',
    daysMask: 0b1111111,    // All days (auto ignores but keeps safe default)
    hour: 6,
    minute: 0,
    value: 15,              // 15 minutes default for manual modes
    useSolarTiming: false,
    solarEvent: 'sunrise',
    solarOffsetMinutes: 0
};

export const DEFAULT_ZONE_CONFIG: Omit<UnifiedZoneConfig, 'channelId'> = {
    enabled: false,
    skipped: false,
    name: '',
    wateringMode: 'fao56_auto',
    plant: null,
    soil: null,
    soilAutoDetected: false,
    soilDetectionConfidence: null,
    customSoilFromDetection: null,  // Custom soil from GPS detection
    irrigationMethod: null,
    location: null,
    sunExposure: 70,              // Default 70% (most common outdoor scenario)
    coverageType: 'area',
    coverageValue: 10,
    plantingDate: null,
    maxVolumeLimit: 50,
    enableCycleSoak: false,
    cycleSoakAutoEnabled: false,
    cycleMinutes: 5,
    soakMinutes: 10,
    schedule: { ...DEFAULT_SCHEDULE }
};

export const DEFAULT_WIZARD_STATE: ChannelWizardState = {
    isOpen: false,
    phase: 'zones',
    currentZoneIndex: 0,
    currentStep: 'mode',
    skipAllRemaining: false,
    sharedLocation: null,
    useSharedLocationForAll: false,
    sharedSoil: null,
    sharedSoilConfidence: null,
    zones: [],
    tilesDownloading: false,
    tilesProgress: 0
};

// ============================================================================
// Helper functions
// ============================================================================

export function isFao56Mode(mode: WateringMode): boolean {
    return mode === 'fao56_auto' || mode === 'fao56_eco';
}

export function getStepsForMode(mode: WateringMode): WizardStep[] {
    return isFao56Mode(mode) ? FAO56_STEPS : MANUAL_STEPS;
}

export function getStepIndex(step: WizardStep, mode: WateringMode): number {
    const steps = getStepsForMode(mode);
    return steps.indexOf(step);
}

export function getNextStep(currentStep: WizardStep, mode: WateringMode): WizardStep | null {
    const steps = getStepsForMode(mode);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex >= steps.length - 1) {
        return null;
    }
    return steps[currentIndex + 1];
}

export function getPrevStep(currentStep: WizardStep, mode: WateringMode): WizardStep | null {
    const steps = getStepsForMode(mode);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex <= 0) {
        return null;
    }
    return steps[currentIndex - 1];
}

export function createInitialZones(numChannels: number = 8): UnifiedZoneConfig[] {
    return Array.from({ length: numChannels }, (_, i) => ({
        ...DEFAULT_ZONE_CONFIG,
        channelId: i,
        name: `Zone ${i + 1}`
    }));
}

export function canProceedFromStep(step: WizardStep, zone: UnifiedZoneConfig): { canProceed: boolean; error?: string } {
    switch (step) {
        case 'mode':
            if (!zone.name.trim()) {
                return { canProceed: false, error: 'Please enter a zone name' };
            }
            return { canProceed: true };
            
        case 'plant':
            if (isFao56Mode(zone.wateringMode) && !zone.plant) {
                return { canProceed: false, error: 'Please select a plant' };
            }
            return { canProceed: true };
            
        case 'soil':
            if (isFao56Mode(zone.wateringMode) && !zone.soil) {
                return { canProceed: false, error: 'Please select a soil type' };
            }
            return { canProceed: true };
            
        case 'irrigation':
            if (isFao56Mode(zone.wateringMode) && !zone.irrigationMethod) {
                return { canProceed: false, error: 'Please select an irrigation method' };
            }
            return { canProceed: true };
            
        case 'environment':
            if (isFao56Mode(zone.wateringMode) && !zone.location) {
                return { canProceed: false, error: 'Please set your location' };
            }
            if (zone.coverageValue <= 0) {
                return { canProceed: false, error: 'Please enter a valid coverage value' };
            }
            return { canProceed: true };
            
        case 'schedule':
            if (zone.schedule.enabled) {
                if (!isFao56Mode(zone.wateringMode) && zone.schedule.value <= 0) {
                    return { canProceed: false, error: 'Please enter a valid duration/volume' };
                }
            }
            return { canProceed: true };
            
        case 'summary':
            return { canProceed: true };
            
        default:
            return { canProceed: true };
    }
}
