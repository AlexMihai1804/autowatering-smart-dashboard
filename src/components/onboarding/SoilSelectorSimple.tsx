/**
 * SoilSelector Component - SIMPLIFIED
 * 
 * Simple soil selection:
 * - Auto-detect from GPS when location available
 * - Simple display with "Change" button
 * - Manual selection in accordion
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    IonCard,
    IonCardContent,
    IonLabel,
    IonButton,
    IonIcon,
    IonSpinner,
    IonList,
    IonItem,
    IonBadge,
} from '@ionic/react';
import {
    checkmarkCircle,
    layersOutline,
    locationOutline,
    alertCircleOutline,
} from 'ionicons/icons';

import { SoilDBEntry } from '../../services/DatabaseService';
import SoilGridsServiceInstance, { SoilGridsResult, estimateSoilParametersFromTexture, CustomSoilParameters } from '../../services/SoilGridsService';
import { LocationData } from '../../types/wizard';
import { useAppStore } from '../../store/useAppStore';
import { useI18n } from '../../i18n';

// Helper function to translate soil texture
const translateSoilTexture = (texture: string, t: (key: string) => string): string => {
    const textureMap: Record<string, string> = {
        'Sand': 'soilTextures.sand',
        'Loamy Sand': 'soilTextures.loamySand',
        'Sandy Loam': 'soilTextures.sandyLoam',
        'Loam': 'soilTextures.loam',
        'Silt Loam': 'soilTextures.siltLoam',
        'Clay Loam': 'soilTextures.clayLoam'
    };
    
    const key = textureMap[texture];
    return key ? t(key) : texture;
};

interface SoilSelectorProps {
    /** Currently selected soil */
    value: SoilDBEntry | null;
    /** Location for auto-detection */
    location: LocationData | null;
    /** Callback when soil is selected */
    onChange: (soil: SoilDBEntry, autoDetected: boolean, confidence: 'high' | 'medium' | 'low' | null) => void;
    /** Callback when custom soil is detected from SoilGrids */
    onCustomSoilDetected?: (customSoil: {
        enabled: boolean;
        clay: number;
        sand: number;
        silt: number;
        field_capacity: number;
        wilting_point: number;
        infiltration_rate: number;
        bulk_density: number;
        organic_matter: number;
        name: string;
    } | null) => void;
    /** Whether the component is disabled */
    disabled?: boolean;
}

// Soil type visual mapping
const SOIL_EMOJI: Record<string, string> = {
    'Sand': '\u2022',
    'Loamy Sand': '\u2022',
    'Sandy Loam': '??',
    'Loam': '??',
    'Silt Loam': '??',
    'Silt': '??',
    'Sandy Clay Loam': '??',
    'Clay Loam': '??',
    'Silty Clay Loam': '??',
    'Sandy Clay': '??',
    'Silty Clay': '??',
    'Clay': '??',
};

export const SoilSelector: React.FC<SoilSelectorProps> = ({
    value,
    location,
    onChange,
    onCustomSoilDetected,
    disabled = false,
}) => {
    const { soilDb } = useAppStore();
    const { t, language } = useI18n();
    const [isDetecting, setIsDetecting] = useState(false);
    const [hasAttemptedDetection, setHasAttemptedDetection] = useState(false);
    const [showManualList, setShowManualList] = useState(false);
    const [detectionFailed, setDetectionFailed] = useState(false);
    const [detectedTexture, setDetectedTexture] = useState<{clay: number; sand: number; silt: number} | null>(null);

    // Auto-detect when location becomes available
    useEffect(() => {
        if (location && !value && !hasAttemptedDetection && !isDetecting) {
            detectSoil();
        }
    }, [location, value, hasAttemptedDetection]);

    const detectSoil = useCallback(async () => {
        if (!location || isDetecting) return;

        setIsDetecting(true);
        setHasAttemptedDetection(true);
        setDetectionFailed(false);

        try {
            const result = await SoilGridsServiceInstance.detectSoilFromLocation(
                location.latitude,
                location.longitude
            );

            if (result?.matchedSoil) {
                // Check if it's a fallback result (API was unavailable)
                if (result.source === 'fallback') {
                    console.log('[SoilSelector] API unavailable, showing manual selection');
                    setDetectionFailed(true);
                    // Clear custom soil on fallback
                    onCustomSoilDetected?.(null);
                } else {
                    // Save detected texture values
                    setDetectedTexture({
                        clay: result.clay,
                        sand: result.sand,
                        silt: result.silt
                    });
                    
                    // Calculate custom soil parameters from texture using pedotransfer functions
                    const customParams = estimateSoilParametersFromTexture(
                        result.clay,
                        result.sand,
                        result.silt,
                        { language }
                    );
                    
                    // Always create custom soil from detected values for more accurate FAO-56
                    console.log('[SoilSelector] Creating custom soil from detected texture:', {
                        clay: result.clay,
                        sand: result.sand,
                        silt: result.silt,
                        customParams
                    });
                    
                    onCustomSoilDetected?.({
                        enabled: true,
                        clay: result.clay,
                        sand: result.sand,
                        silt: result.silt,
                        field_capacity: customParams.field_capacity,
                        wilting_point: customParams.wilting_point,
                        infiltration_rate: customParams.infiltration_rate,
                        bulk_density: customParams.bulk_density,
                        organic_matter: customParams.organic_matter,
                        name: customParams.name
                    });
                    
                    onChange(result.matchedSoil, true, result.confidence);
                }
            } else {
                setDetectionFailed(true);
                onCustomSoilDetected?.(null);
            }
        } catch (error) {
            console.error('[SoilSelector] Detection failed:', error);
            setDetectionFailed(true);
        } finally {
            setIsDetecting(false);
        }
    }, [location, onChange, isDetecting]);

    // Loading state
    if (isDetecting) {
        return (
            <IonCard className="glass-panel">
                <IonCardContent className="flex items-center gap-3 py-4">
                    <IonSpinner name="crescent" color="primary" />
                    <div>
                        <p className="text-white m-0">{t('wizard.soil.detecting')}</p>
                        <p className="text-gray-400 text-sm m-0">{t('wizard.soil.detectingSource')}</p>
                    </div>
                </IonCardContent>
            </IonCard>
        );
    }

    // Soil selected - simple display
    if (value && !showManualList) {
        const emoji = SOIL_EMOJI[value.texture] || '??';
        const hasCustomSoil = detectedTexture !== null;
        
        return (
            <IonCard className="glass-panel">
                <IonCardContent className="py-3">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">{emoji}</div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-white font-bold m-0">{value.texture}</h3>
                                <IonBadge color="success" className="text-xs">
                                    <IonIcon icon={checkmarkCircle} className="mr-1" />
                                    {t('common.selected')}
                                </IonBadge>
                                {hasCustomSoil && (
                                    <IonBadge color="tertiary" className="text-xs">
                                        {t('wizard.soil.customFromGps')}
                                    </IonBadge>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm m-0">
                                {t('wizard.soil.infiltration')}: {value.infiltration_rate_mm_h} {t('common.mmPerHour')}
                                {hasCustomSoil && detectedTexture && (
                                    <span className="ml-2">
                                        {' \u2022 '}{t('wizard.soil.clay')}: {detectedTexture.clay.toFixed(0)}{t('common.percent')}
                                    </span>
                                )}
                            </p>
                        </div>
                        <IonButton 
                            fill="outline" 
                            size="small"
                            onClick={() => setShowManualList(true)}
                            disabled={disabled}
                        >
                            {t('common.change')}
                        </IonButton>
                    </div>
                </IonCardContent>
            </IonCard>
        );
    }

    // No soil selected OR showing manual list
    return (
        <IonCard className="glass-panel">
            <IonCardContent className="py-3">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <IonIcon icon={layersOutline} className="text-xl text-amber-500" />
                    <IonLabel className="font-bold text-white">{t('wizard.soil.title')}</IonLabel>
                    {!location && !detectionFailed && (
                        <IonBadge color="warning" className="text-xs">
                            <IonIcon icon={locationOutline} className="mr-1" />
                            {t('wizard.soil.noLocation')}
                        </IonBadge>
                    )}
                </div>

                {/* Detection failed message */}
                {detectionFailed && (
                    <div className="flex items-center gap-2 mb-3 px-2 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                        <IonIcon icon={alertCircleOutline} className="text-orange-400" />
                        <span className="text-sm text-orange-300">
                            {t('wizard.soil.autoDetectUnavailable')}
                        </span>
                    </div>
                )}

                {/* Soil list */}
                <IonList className="bg-transparent">
                    {soilDb.map((soil) => {
                        const emoji = SOIL_EMOJI[soil.texture] || '??';
                        const isSelected = value?.id === soil.id;
                        
                        return (
                            <IonItem
                                key={soil.id}
                                button
                                onClick={() => {
                                    // Manual selection - disable custom soil
                                    onCustomSoilDetected?.(null);
                                    onChange(soil, false, null);
                                    setShowManualList(false);
                                }}
                                className={`bg-transparent ${isSelected ? 'border-l-2 border-cyber-emerald' : ''}`}
                                lines="inset"
                                disabled={disabled}
                            >
                                <span className="text-2xl mr-3">{emoji}</span>
                                <IonLabel>
                                    <h2 className="text-white">{translateSoilTexture(soil.texture, t)}</h2>
                                    <p className="text-gray-400 text-sm">
                                        {t('wizard.soil.infiltration')}: {soil.infiltration_rate_mm_h} {t('common.mmPerHour')}
                                        {' \u2022 '}
                                        {t('wizard.soil.fieldCapacity')}: {soil.field_capacity_pct}{t('common.percent')}
                                    </p>
                                </IonLabel>
                                {isSelected && (
                                    <IonIcon icon={checkmarkCircle} color="success" slot="end" />
                                )}
                            </IonItem>
                        );
                    })}
                </IonList>

                {/* Cancel button if was showing list */}
                {showManualList && value && (
                    <IonButton 
                        fill="clear" 
                        expand="block" 
                        size="small"
                        onClick={() => setShowManualList(false)}
                        className="mt-2"
                    >
                        {t('common.cancel')}
                    </IonButton>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default SoilSelector;
