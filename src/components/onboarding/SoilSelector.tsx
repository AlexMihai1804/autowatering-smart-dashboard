/**
 * SoilSelector Component
 * 
 * Smart soil selection with:
 * - Auto-detection from GPS using SoilGrids API
 * - Manual selection fallback
 * - Visual soil quiz for uncertain users
 * - Confidence indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonLabel,
    IonButton,
    IonIcon,
    IonSpinner,
    IonList,
    IonItem,
    IonChip,
    IonText,
    IonBadge,
} from '@ionic/react';
import {
    searchOutline,
    checkmarkCircle,
    alertCircle,
    refreshOutline,
    chevronDown,
    chevronUp,
    layersOutline,
} from 'ionicons/icons';

import { SoilDBEntry } from '../../services/DatabaseService';
import { SoilGridsService, SoilGridsResult } from '../../services/SoilGridsService';
import { LocationData } from '../../types/wizard';
import { WhatsThisTooltip } from './WhatsThisTooltip';
import { useAppStore } from '../../store/useAppStore';
import { useI18n } from '../../i18n';

interface SoilSelectorProps {
    /** Currently selected soil */
    value: SoilDBEntry | null;
    /** Location for auto-detection */
    location: LocationData | null;
    /** Callback when soil is selected */
    onChange: (soil: SoilDBEntry, autoDetected: boolean, confidence: 'high' | 'medium' | 'low' | null) => void;
    /** Whether the component is disabled */
    disabled?: boolean;
    /** Whether auto-detection has been attempted */
    autoDetected?: boolean;
    /** Confidence level from previous auto-detection */
    confidence?: 'high' | 'medium' | 'low' | null;
}

// Soil visual representations
const SOIL_VISUALS: Record<string, { emoji: string; color: string }> = {
    'Sand': { emoji: '???', color: '#f4d03f' },
    'LoamySand': { emoji: '???', color: '#d4ac0d' },
    'SandyLoam': { emoji: '??', color: '#b7950b' },
    'Loam': { emoji: '??', color: '#6b8e23' },
    'SiltLoam': { emoji: '??', color: '#556b2f' },
    'SandyClayLoam': { emoji: '??', color: '#8b4513' },
    'ClayLoam': { emoji: '??', color: '#a0522d' },
    'SiltyClayLoam': { emoji: '??', color: '#8b7355' },
    'SandyClay': { emoji: '??', color: '#cd853f' },
    'SiltyClay': { emoji: '??', color: '#708090' },
    'Clay': { emoji: '??', color: '#696969' },
    'PeatOrganic': { emoji: '??', color: '#2e8b57' },
    'GravellyLoam': { emoji: '??', color: '#808080' },
    'PottingMix': { emoji: '??', color: '#654321' },
    'Hydroponic': { emoji: '??', color: '#00bfff' },
};

export const SoilSelector: React.FC<SoilSelectorProps> = ({
    value,
    location,
    onChange,
    disabled = false,
    autoDetected = false,
    confidence = null,
}) => {
    const soilDb = useAppStore(state => state.soilDb);
    const { t } = useI18n();
    
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionResult, setDetectionResult] = useState<SoilGridsResult | null>(null);
    const [detectionError, setDetectionError] = useState<string | null>(null);
    const [showManualSelection, setShowManualSelection] = useState(false);
    const [hasAttemptedAutoDetect, setHasAttemptedAutoDetect] = useState(autoDetected);

    // Auto-detect when location is available and we haven't detected yet
    useEffect(() => {
        if (location && !hasAttemptedAutoDetect && !value && !isDetecting) {
            detectSoil();
        }
    }, [location]);

    const detectSoil = useCallback(async () => {
        if (!location || isDetecting) return;

        setIsDetecting(true);
        setDetectionError(t('wizard.soil.detectionFailed'));

        try {
            const result = await SoilGridsService.getInstance().detectSoilFromLocation(
                location.latitude,
                location.longitude
            );

            setDetectionResult(result);
            setHasAttemptedAutoDetect(true);

            if (result.matchedSoil) {
                onChange(result.matchedSoil, true, result.confidence);
            }
        } catch (error) {
            console.error('[SoilSelector] Detection error:', error);
            setDetectionError(t('wizard.soil.detectionFailed'));
            setShowManualSelection(true);
        } finally {
            setIsDetecting(false);
        }
    }, [location, isDetecting, onChange]);

    const handleManualSelect = (soil: SoilDBEntry) => {
        onChange(soil, false, null);
        setShowManualSelection(false);
    };

    const getConfidenceBadge = (conf: 'high' | 'medium' | 'low' | null) => {
        if (!conf) return null;
        const badges = {
            high: { color: 'success', text: t('wizard.soil.confidenceHigh'), icon: checkmarkCircle },
            medium: { color: 'warning', text: t('wizard.soil.confidenceMedium'), icon: alertCircle },
            low: { color: 'danger', text: t('wizard.soil.confidenceLow'), icon: alertCircle },
        };

        const badge = badges[conf];
        return (
            <IonBadge color={badge.color} className="flex items-center gap-1">
                <IonIcon icon={badge.icon} className="text-xs" />
                {badge.text}
            </IonBadge>
        );
    };

    const getSoilVisual = (soilType: string) => {
        return SOIL_VISUALS[soilType] || { emoji: '?', color: '#8b4513' };
    };

    // Render loading state
    if (isDetecting) {
        return (
            <IonCard className="glass-panel">
                <IonCardContent className="text-center py-8">
                    <IonSpinner name="crescent" color="primary" className="mb-4" />
                    <p className="text-white">{t('wizard.soil.detecting')}</p>
                    <p className="text-gray-400 text-sm">{t('wizard.soil.detectingSource')}</p>
                </IonCardContent>
            </IonCard>
        );
    }

    // No location yet
    if (!location) {
        return (
            <IonCard className="glass-panel">
                <IonCardContent className="text-center py-6">
                    <IonIcon icon={searchOutline} className="text-4xl text-gray-400 mb-2" />
                    <p className="text-white">{t('wizard.soil.noLocation')}</p>
                    <p className="text-gray-400 text-sm">
                        {t('wizard.soil.noLocationHint')}
                    </p>
                </IonCardContent>
            </IonCard>
        );
    }

    return (
        <div className="soil-selector">
            {/* Auto-detected result */}
            {value && !showManualSelection && (
                <IonCard className="glass-panel border border-cyber-emerald/30">
                    <IonCardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IonIcon icon={searchOutline} className="text-cyber-emerald" />
                                <IonLabel className="font-bold text-white">
                                    {autoDetected ? t('wizard.soil.autoDetectedLabel') : t('wizard.soil.selectedLabel')}
                                </IonLabel>
                                <WhatsThisTooltip tooltipKey="soil_auto_detect" size="small" />
                            </div>
                            {autoDetected && confidence && getConfidenceBadge(confidence)}
                        </div>
                    </IonCardHeader>
                    <IonCardContent>
                        {/* Selected soil display */}
                        <div className="flex items-center gap-4 mb-4">
                            <div 
                                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                                style={{ backgroundColor: getSoilVisual(value.soil_type).color + '33' }}
                            >
                                {getSoilVisual(value.soil_type).emoji}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-lg m-0">
                                    {value.texture}
                                </h3>
                                <p className="text-gray-400 text-sm m-0">
                                    {value.soil_type}
                                </p>
                            </div>
                        </div>

                        {/* Soil properties */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-white/5 rounded-lg p-2">
                                <p className="text-xs text-gray-400 m-0">{t('wizard.soil.fieldCapacity')}</p>
                                <p className="text-white font-medium m-0">
                                    {value.field_capacity_pct != null ? `${value.field_capacity_pct}${t('common.percent')}` : t('common.notAvailable')}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                                <p className="text-xs text-gray-400 m-0">{t('wizard.soil.wiltingPoint')}</p>
                                <p className="text-white font-medium m-0">
                                    {value.wilting_point_pct != null ? `${value.wilting_point_pct}${t('common.percent')}` : t('common.notAvailable')}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                                <p className="text-xs text-gray-400 m-0">{t('wizard.soil.infiltration')}</p>
                                <p className="text-white font-medium m-0">
                                    {value.infiltration_rate_mm_h != null ? `${value.infiltration_rate_mm_h} ${t('common.mmPerHour')}` : t('common.notAvailable')}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                                <p className="text-xs text-gray-400 m-0">{t('wizard.soil.availableWater')}</p>
                                <p className="text-white font-medium m-0">
                                    {value.available_water_mm_m != null ? `${value.available_water_mm_m} ${t('common.mm')}/${t('common.metersShort')}` : t('common.notAvailable')}
                                </p>
                            </div>
                        </div>

                        {/* API details (if auto-detected) */}
                        {autoDetected && detectionResult && (
                            <div className="bg-white/5 rounded-lg p-2 mb-4">
                                <p className="text-xs text-gray-400 m-0 mb-1">{t('wizard.soil.detectedComposition')}</p>
                                <div className="flex gap-2">
                                    <IonChip outline color="warning" className="text-xs">
                                        {t('wizard.soil.clay')}: {detectionResult.clay.toFixed(0)}{t('common.percent')}
                                    </IonChip>
                                    <IonChip outline color="medium" className="text-xs">
                                        {t('wizard.soil.sand')}: {detectionResult.sand.toFixed(0)}{t('common.percent')}
                                    </IonChip>
                                    <IonChip outline color="tertiary" className="text-xs">
                                        {t('wizard.soil.silt')}: {detectionResult.silt.toFixed(0)}{t('common.percent')}
                                    </IonChip>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                            <IonButton
                                fill="outline"
                                size="small"
                                onClick={() => setShowManualSelection(true)}
                                disabled={disabled}
                            >
                                <IonIcon icon={layersOutline} slot="start" />
                                {t('wizard.soil.selectAnother')}
                            </IonButton>
                            {autoDetected && (
                                <IonButton
                                    fill="clear"
                                    size="small"
                                    onClick={detectSoil}
                                    disabled={disabled || isDetecting}
                                >
                                    <IonIcon icon={refreshOutline} slot="start" />
                                    {t('wizard.soil.redetect')}
                                </IonButton>
                            )}
                        </div>
                    </IonCardContent>
                </IonCard>
            )}

            {/* Error state */}
            {detectionError && !value && (
                <IonCard className="glass-panel border border-red-500/30 mb-4">
                    <IonCardContent className="flex items-center gap-3">
                        <IonIcon icon={alertCircle} className="text-2xl text-red-400" />
                        <div className="flex-1">
                            <p className="text-white m-0">{detectionError}</p>
                        </div>
                        <IonButton size="small" onClick={detectSoil}>
                            <IonIcon icon={refreshOutline} />
                        </IonButton>
                    </IonCardContent>
                </IonCard>
            )}

            {/* Manual selection toggle */}
            {!value && !detectionError && (
                <IonButton
                    expand="block"
                    fill="outline"
                    onClick={() => setShowManualSelection(true)}
                    className="mb-4"
                >
                    <IonIcon icon={layersOutline} slot="start" />
                    {t('wizard.soil.manualSelectButton')}
                </IonButton>
            )}

            {/* Manual selection list */}
            {showManualSelection && (
                <IonCard className="glass-panel">
                    <IonCardHeader>
                        <div className="flex items-center justify-between">
                            <IonLabel className="font-bold text-white">{t('wizard.soil.manualSelectTitle')}</IonLabel>
                            <IonButton
                                fill="clear"
                                size="small"
                                onClick={() => setShowManualSelection(false)}
                            >
                                <IonIcon icon={chevronUp} />
                            </IonButton>
                        </div>
                    </IonCardHeader>
                    <IonCardContent className="p-0">
                        <IonList className="bg-transparent">
                            {soilDb
                                .filter(s => s.soil_type !== 'Hydroponic') // Hide hydroponic for outdoor
                                .map(soil => {
                                    const visual = getSoilVisual(soil.soil_type);
                                    const isSelected = value?.id === soil.id;

                                    return (
                                        <IonItem
                                            key={soil.id}
                                            button
                                            onClick={() => handleManualSelect(soil)}
                                            className={isSelected ? 'bg-white/10' : ''}
                                            disabled={disabled}
                                            lines="inset"
                                        >
                                            <div 
                                                slot="start"
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                                style={{ backgroundColor: visual.color + '33' }}
                                            >
                                                {visual.emoji}
                                            </div>
                                            <IonLabel>
                                                <h2 className="text-white font-medium">{soil.texture}</h2>
                                                <p className="text-gray-400 text-sm">
                                                    {t('wizard.soil.infiltration')}: {soil.infiltration_rate_mm_h != null ? `${soil.infiltration_rate_mm_h} ${t('common.mmPerHour')}` : t('common.notAvailable')}
                                                </p>
                                            </IonLabel>
                                            {isSelected && (
                                                <IonIcon icon={checkmarkCircle} slot="end" color="success" />
                                            )}
                                        </IonItem>
                                    );
                                })}
                        </IonList>
                    </IonCardContent>
                </IonCard>
            )}
        </div>
    );
};

export default SoilSelector;