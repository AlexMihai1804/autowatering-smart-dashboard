/**
 * Smart Defaults Hook
 * 
 * Provides intelligent default values based on:
 * - Previously configured zones
 * - Common patterns
 * - Location-based suggestions
 * 
 * 4.3: Smart Defaults
 */

import { useMemo } from 'react';
import type { UnifiedZoneConfig, LocationData } from '../types/wizard';
import type { PlantDBEntry, SoilDBEntry, IrrigationMethodEntry } from '../services/DatabaseService';
import { translations, Language, DEFAULT_LANGUAGE } from '../i18n/translations';

export interface SmartDefaults {
    /** Suggested location based on other zones */
    location: LocationData | null;
    /** Suggested plant based on common patterns */
    plant: PlantDBEntry | null;
    /** Suggested soil based on GPS detection or other zones */
    soil: SoilDBEntry | null;
    /** Suggested irrigation method */
    irrigationMethod: IrrigationMethodEntry | null;
    /** Suggested coverage value */
    coverageValue: number;
    /** Suggested coverage type */
    coverageType: 'area' | 'plants';
    /** Suggested sun exposure */
    sunExposure: number;
    /** Whether to suggest cycle & soak */
    enableCycleSoak: boolean;
    /** Source of suggestions */
    source: 'previous_zone' | 'common_defaults' | 'none';
}

export interface UseSmartDefaultsOptions {
    /** Current zone index */
    currentZoneIndex: number;
    /** All zone configurations */
    zoneConfigs: UnifiedZoneConfig[];
    /** Detected location (if any) */
    detectedLocation?: LocationData | null;
    /** Detected soil (if any) */
    detectedSoil?: SoilDBEntry | null;
}

export const useSmartDefaults = ({
    currentZoneIndex,
    zoneConfigs,
    detectedLocation,
    detectedSoil,
}: UseSmartDefaultsOptions): SmartDefaults => {
    
    return useMemo(() => {
        // Find the most recently configured zone (before current)
        const previousZones = zoneConfigs
            .slice(0, currentZoneIndex)
            .filter(z => z.enabled && (z.plant || z.soil));
        
        // If we have a previous zone, use its settings as defaults
        if (previousZones.length > 0) {
            const prevZone = previousZones[previousZones.length - 1];
            
            return {
                // Use location from previous zone if available
                location: prevZone.location || detectedLocation || null,
                // Don't suggest same plant - each zone is different
                plant: null,
                // Use same soil - usually consistent across property
                soil: detectedSoil || prevZone.soil || null,
                // Use same irrigation method - often consistent
                irrigationMethod: prevZone.irrigationMethod || null,
                // Default coverage values
                coverageValue: 10, // 10 m² as default
                coverageType: 'area',
                // Use similar sun exposure
                sunExposure: prevZone.sunExposure,
                // Use same cycle & soak setting
                enableCycleSoak: prevZone.enableCycleSoak,
                source: 'previous_zone',
            };
        }
        
        // No previous zones - use common defaults
        return {
            location: detectedLocation || null,
            plant: null,
            soil: detectedSoil || null,
            irrigationMethod: null,
            coverageValue: 10,
            coverageType: 'area',
            sunExposure: 80, // Assume mostly sunny
            enableCycleSoak: false,
            source: previousZones.length > 0 ? 'previous_zone' : 'common_defaults',
        };
    }, [currentZoneIndex, zoneConfigs, detectedLocation, detectedSoil]);
};

/**
 * Get clone-able properties from a source zone
 */
export const getCloneableProperties = (sourceZone: UnifiedZoneConfig): Partial<UnifiedZoneConfig> => {
    return {
        // Location can be shared
        location: sourceZone.location,
        // Soil is usually consistent
        soil: sourceZone.soil,
        soilAutoDetected: sourceZone.soilAutoDetected,
        soilDetectionConfidence: sourceZone.soilDetectionConfidence,
        customSoilFromDetection: sourceZone.customSoilFromDetection,
        // Irrigation method can vary, but useful as suggestion
        irrigationMethod: sourceZone.irrigationMethod,
        // Environment settings
        sunExposure: sourceZone.sunExposure,
        enableCycleSoak: sourceZone.enableCycleSoak,
        cycleSoakAutoEnabled: sourceZone.cycleSoakAutoEnabled,
        cycleMinutes: sourceZone.cycleMinutes,
        soakMinutes: sourceZone.soakMinutes,
    };
};

/**
 * Get suggested zone name based on index
 */
export const getSuggestedZoneName = (index: number, language: Language = DEFAULT_LANGUAGE): string => {
    const zoneLabel = translations[language]?.zones?.zone || translations.en.zones.zone;
    return `${zoneLabel} ${index + 1}`;
};

export default useSmartDefaults;
