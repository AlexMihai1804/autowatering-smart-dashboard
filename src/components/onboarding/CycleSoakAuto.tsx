/**
 * CycleSoakAuto Component
 * 
 * Simplified Cycle & Soak - Auto by default
 * Shows result with "Modify" button only if user wants to change
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    IonCard,
    IonCardContent,
    IonLabel,
    IonIcon,
    IonBadge,
    IonButton,
    IonRange,
    IonChip,
} from '@ionic/react';
import {
    waterOutline,
    timerOutline,
    settingsOutline,
    checkmarkCircle,
    closeCircle,
} from 'ionicons/icons';

import { SoilDBEntry, IrrigationMethodEntry } from '../../services/DatabaseService';
import {
    shouldEnableCycleSoak,
    calculateCycleSoakTiming
} from '../../services/SoilGridsService';
import { useI18n } from '../../i18n';

interface CycleSoakAutoProps {
    soil: SoilDBEntry | null;
    irrigationMethod: IrrigationMethodEntry | null;
    enabled: boolean;
    autoEnabled: boolean;
    cycleMinutes: number;
    soakMinutes: number;
    slope_percent?: number;  // NEW: Terrain slope for smart recommendations
    onChange: (config: {
        enabled: boolean;
        autoEnabled: boolean;
        cycleMinutes: number;
        soakMinutes: number;
    }) => void;
    disabled?: boolean;
}

export const CycleSoakAuto: React.FC<CycleSoakAutoProps> = ({
    soil,
    irrigationMethod,
    enabled,
    autoEnabled,
    cycleMinutes,
    soakMinutes,
    slope_percent = 0,  // Default to flat terrain
    onChange,
    disabled = false,
}) => {
    const { t } = useI18n();
    const [showManualConfig, setShowManualConfig] = useState(false);
    const minutesShort = t('common.minutesShort');
    const separator = ' \u2022 ';
    const pauseLabels = t('cycleSoak.wateringPause').split(separator);
    const wateringLabel = pauseLabels[0] || t('cycleSoak.cycleWatering');
    const pauseLabel = pauseLabels[1] || t('cycleSoak.soakAbsorption');

    // Calculate auto recommendation
    const autoConfig = useMemo(() => {
        if (!soil) return null;

        const shouldEnable = shouldEnableCycleSoak(soil, slope_percent);
        const timing = calculateCycleSoakTiming(soil, slope_percent);
        const infiltrationRate = typeof soil.infiltration_rate_mm_h === 'number'
            ? soil.infiltration_rate_mm_h
            : 10;

        // Build recommendation reason
        let reason = t('cycleSoak.reasonFast')
            .replace('{rate}', infiltrationRate.toFixed(1));
        if (shouldEnable) {
            if (slope_percent > 3) {
                reason = t('cycleSoak.reasonSlope')
                    .replace('{slope}', slope_percent.toFixed(1))
                    .replace('{rate}', infiltrationRate.toFixed(1));
            } else {
                reason = t('cycleSoak.reasonSlow')
                    .replace('{rate}', infiltrationRate.toFixed(1));
            }
        }

        return {
            shouldEnable,
            cycleMinutes: timing.cycleMinutes,
            soakMinutes: timing.soakMinutes,
            infiltrationRate,
            reason,
        };
    }, [soil, slope_percent, t]);

    // Auto-apply on mount or when soil changes
    useEffect(() => {
        if (!autoConfig || showManualConfig) return;

        // Always auto-apply when:
        // 1. autoEnabled is true (was already auto-configured, update for new soil)
        // 2. OR enabled is false (user hasn't manually enabled, so apply auto)
        // This ensures Cycle & Soak is auto-enabled based on soil infiltration
        if (autoEnabled || !enabled) {
            console.log(`[CycleSoakAuto] Auto-applying: shouldEnable=${autoConfig.shouldEnable}, ` +
                `cycleMin=${autoConfig.cycleMinutes}, soakMin=${autoConfig.soakMinutes}, ` +
                `infiltration=${autoConfig.infiltrationRate}mm/h`);
            onChange({
                enabled: autoConfig.shouldEnable,
                autoEnabled: true,
                cycleMinutes: autoConfig.cycleMinutes,
                soakMinutes: autoConfig.soakMinutes,
            });
        }
    }, [autoConfig?.shouldEnable, soil?.id]);

    const handleManualSave = () => {
        setShowManualConfig(false);
    };

    const handleResetToAuto = () => {
        if (!autoConfig) return;
        setShowManualConfig(false);
        onChange({
            enabled: autoConfig.shouldEnable,
            autoEnabled: true,
            cycleMinutes: autoConfig.cycleMinutes,
            soakMinutes: autoConfig.soakMinutes,
        });
    };

    // No soil selected
    if (!soil) {
        return (
            <IonCard className="glass-panel opacity-50">
                <IonCardContent className="py-3">
                    <div className="flex items-center gap-2">
                        <IonIcon icon={waterOutline} className="text-gray-400 text-xl" />
                        <span className="text-gray-400">{t('cycleSoak.selectSoilFirst')}</span>
                    </div>
                </IonCardContent>
            </IonCard>
        );
    }

    // Manual config mode
    if (showManualConfig) {
        return (
            <IonCard className="glass-panel border border-cyber-aqua/30">
                <IonCardContent className="py-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <IonIcon icon={waterOutline} className="text-cyber-aqua text-xl" />
                            <IonLabel className="font-bold text-white">{t('cycleSoak.title')}</IonLabel>
                        </div>
                        <IonButton
                            fill="clear"
                            size="small"
                            onClick={handleResetToAuto}
                        >
                            <IonIcon icon={settingsOutline} slot="start" />
                            {t('cycleSoak.auto')}
                        </IonButton>
                    </div>

                    {/* Enable/Disable chips */}
                    <div className="flex gap-2 mb-4">
                        <IonChip
                            color={enabled ? 'success' : 'medium'}
                            outline={!enabled}
                            onClick={() => onChange({ enabled: true, autoEnabled: false, cycleMinutes, soakMinutes })}
                        >
                            <IonIcon icon={checkmarkCircle} />
                            {t('cycleSoak.activated')}
                        </IonChip>
                        <IonChip
                            color={!enabled ? 'danger' : 'medium'}
                            outline={enabled}
                            onClick={() => onChange({ enabled: false, autoEnabled: false, cycleMinutes, soakMinutes })}
                        >
                            <IonIcon icon={closeCircle} />
                            {t('cycleSoak.deactivated')}
                        </IonChip>
                    </div>

                    {/* Timing sliders (only when enabled) */}
                    {enabled && (
                        <div className="space-y-4">
                            {/* Cycle duration */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-300 text-sm">
                                        <IonIcon icon={timerOutline} className="mr-1 align-middle" />
                                        {t('cycleSoak.cycleWatering')}
                                    </span>
                                    <IonBadge color="primary">{cycleMinutes} {minutesShort}</IonBadge>
                                </div>
                                <IonRange
                                    min={2}
                                    max={15}
                                    step={1}
                                    value={cycleMinutes}
                                    onIonChange={(e) => onChange({
                                        enabled,
                                        autoEnabled: false,
                                        cycleMinutes: e.detail.value as number,
                                        soakMinutes
                                    })}
                                    disabled={disabled}
                                />
                            </div>

                            {/* Soak duration */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-300 text-sm">
                                        <IonIcon icon={timerOutline} className="mr-1 align-middle" />
                                        {t('cycleSoak.soakAbsorption')}
                                    </span>
                                    <IonBadge color="secondary">{soakMinutes} {minutesShort}</IonBadge>
                                </div>
                                <IonRange
                                    min={5}
                                    max={30}
                                    step={5}
                                    value={soakMinutes}
                                    onIonChange={(e) => onChange({
                                        enabled,
                                        autoEnabled: false,
                                        cycleMinutes,
                                        soakMinutes: e.detail.value as number
                                    })}
                                    disabled={disabled}
                                />
                            </div>
                        </div>
                    )}

                    {/* Done button */}
                    <IonButton
                        expand="block"
                        size="small"
                        onClick={handleManualSave}
                        className="mt-3"
                    >
                        {t('cycleSoak.done')}
                    </IonButton>
                </IonCardContent>
            </IonCard>
        );
    }

    // Normal display - auto mode result
    return (
        <IonCard className="glass-panel">
            <IonCardContent className="py-3">
                <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-cyan-500/20' : 'bg-gray-500/20'
                        }`}>
                        <IonIcon
                            icon={waterOutline}
                            className={`text-xl ${enabled ? 'text-cyan-400' : 'text-gray-400'}`}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{t('cycleSoak.title')}</span>
                            {autoEnabled && (
                                <IonChip outline color="primary" className="h-5 text-xs m-0">
                                    {t('cycleSoak.auto')}
                                </IonChip>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm m-0">
                            {enabled
                                ? `${cycleMinutes} ${minutesShort} ${wateringLabel}${separator}${soakMinutes} ${minutesShort} ${pauseLabel}`
                                : autoConfig?.reason || t('cycleSoak.deactivated')
                            }
                        </p>
                    </div>

                    {/* Status badge + modify button */}
                    <div className="flex items-center gap-2">
                        <IonBadge color={enabled ? 'success' : 'medium'}>
                            {enabled ? t('cycleSoak.active') : t('cycleSoak.off')}
                        </IonBadge>
                        <IonButton
                            fill="clear"
                            size="small"
                            onClick={() => setShowManualConfig(true)}
                            disabled={disabled}
                        >
                            <IonIcon icon={settingsOutline} />
                        </IonButton>
                    </div>
                </div>
            </IonCardContent>
        </IonCard>
    );
};

export default CycleSoakAuto;
