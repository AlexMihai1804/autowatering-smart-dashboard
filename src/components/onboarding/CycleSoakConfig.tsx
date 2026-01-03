/**
 * CycleSoakConfig Component
 * 
 * Smart Cycle & Soak configuration with:
 * - Auto-enable based on soil infiltration rate
 * - Auto-calculated timing
 * - Manual override option
 * - Educational explanation
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonLabel,
    IonIcon,
    IonToggle,
    IonRange,
    IonBadge,
    IonButton,
    IonAccordion,
    IonAccordionGroup,
    IonItem,
    IonChip,
} from '@ionic/react';
import {
    waterOutline,
    timerOutline,
    settingsOutline,
    informationCircleOutline,
    checkmarkCircle,
    alertCircle,
} from 'ionicons/icons';

import { SoilDBEntry } from '../../services/DatabaseService';
import { IrrigationMethodEntry } from '../../services/DatabaseService';
import {
    shouldEnableCycleSoak,
    calculateCycleSoakTiming
} from '../../services/SoilGridsService';
import { LabelWithHelp } from './WhatsThisTooltip';
import { useI18n } from '../../i18n';

interface CycleSoakConfigProps {
    /** Selected soil */
    soil: SoilDBEntry | null;
    /** Selected irrigation method */
    irrigationMethod: IrrigationMethodEntry | null;
    /** Whether Cycle & Soak is enabled */
    enabled: boolean;
    /** Whether it was auto-enabled */
    autoEnabled: boolean;
    /** Cycle duration in minutes */
    cycleMinutes: number;
    /** Soak duration in minutes */
    soakMinutes: number;
    /** Callback for changes */
    onChange: (config: {
        enabled: boolean;
        autoEnabled: boolean;
        cycleMinutes: number;
        soakMinutes: number;
    }) => void;
    /** Whether component is disabled */
    disabled?: boolean;
}

export const CycleSoakConfig: React.FC<CycleSoakConfigProps> = ({
    soil,
    irrigationMethod,
    enabled,
    autoEnabled,
    cycleMinutes,
    soakMinutes,
    onChange,
    disabled = false,
}) => {
    const { t } = useI18n();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [manualOverride, setManualOverride] = useState(false);
    const pauseLabels = t('cycleSoak.wateringPause').split(' \u2022 ');
    const wateringLabel = pauseLabels[0] || t('cycleSoak.cycleWatering');
    const pauseLabel = pauseLabels[1] || t('cycleSoak.soakAbsorption');

    // Calculate whether Cycle & Soak should be recommended
    const recommendation = useMemo(() => {
        if (!soil) return null;

        const infiltrationRate = typeof soil.infiltration_rate_mm_h === 'number'
            ? soil.infiltration_rate_mm_h
            : 10; // Default

        // Parse application rate from irrigation method (it's a string like "10-20")
        let applicationRate = 15; // Default
        if (irrigationMethod?.application_rate_mm_h) {
            const match = irrigationMethod.application_rate_mm_h.match(/(\d+)/);
            if (match) {
                applicationRate = parseInt(match[1], 10);
            }
        }

        const shouldEnable = shouldEnableCycleSoak(soil);
        const timing = calculateCycleSoakTiming(soil);

        return {
            shouldEnable,
            timing,
            infiltrationRate,
            applicationRate,
            reason: shouldEnable
                ? t('cycleSoak.reasonSlow').replace('{rate}', infiltrationRate.toFixed(1))
                : t('cycleSoak.reasonFast').replace('{rate}', infiltrationRate.toFixed(1)),
        };
    }, [soil, irrigationMethod, t]);

    // Auto-apply recommendation on mount or soil/method change
    useEffect(() => {
        if (!recommendation || manualOverride) return;

        if (recommendation.shouldEnable && !enabled) {
            onChange({
                enabled: true,
                autoEnabled: true,
                cycleMinutes: recommendation.timing.cycleMinutes,
                soakMinutes: recommendation.timing.soakMinutes,
            });
        } else if (!recommendation.shouldEnable && enabled && autoEnabled) {
            onChange({
                enabled: false,
                autoEnabled: false,
                cycleMinutes: 5,
                soakMinutes: 10,
            });
        }
    }, [recommendation?.shouldEnable]);

    const handleToggle = (newEnabled: boolean) => {
        setManualOverride(true);
        onChange({
            enabled: newEnabled,
            autoEnabled: false,
            cycleMinutes: newEnabled ? (recommendation?.timing.cycleMinutes || 5) : cycleMinutes,
            soakMinutes: newEnabled ? (recommendation?.timing.soakMinutes || 10) : soakMinutes,
        });
    };

    const handleCycleChange = (value: number) => {
        setManualOverride(true);
        onChange({
            enabled,
            autoEnabled: false,
            cycleMinutes: value,
            soakMinutes,
        });
    };

    const handleSoakChange = (value: number) => {
        setManualOverride(true);
        onChange({
            enabled,
            autoEnabled: false,
            cycleMinutes,
            soakMinutes: value,
        });
    };

    const resetToAuto = () => {
        if (!recommendation) return;
        setManualOverride(false);
        onChange({
            enabled: recommendation.shouldEnable,
            autoEnabled: true,
            cycleMinutes: recommendation.timing.cycleMinutes,
            soakMinutes: recommendation.timing.soakMinutes,
        });
    };

    return (
        <IonCard className="glass-panel">
            <IonCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IonIcon icon={waterOutline} className="text-cyber-aqua text-xl" />
                        <LabelWithHelp
                            label={t('cycleSoak.title')}
                            tooltipKey="cycle_soak"
                            className="font-bold text-white"
                        />
                    </div>
                    <IonToggle
                        checked={enabled}
                        onIonChange={(e) => handleToggle(e.detail.checked)}
                        disabled={disabled}
                    />
                </div>
            </IonCardHeader>

            <IonCardContent>
                {/* Status indicator */}
                {recommendation && (
                    <div className={`
                        rounded-lg p-3 mb-4
                        ${enabled
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                            : 'bg-white/5 border border-white/10'
                        }
                    `}>
                        <div className="flex items-start gap-2">
                            <IonIcon
                                icon={enabled ? checkmarkCircle : informationCircleOutline}
                                className={`text-lg mt-0.5 ${enabled ? 'text-cyan-400' : 'text-gray-400'}`}
                            />
                            <div className="flex-1">
                                <p className={`text-sm m-0 ${enabled ? 'text-white' : 'text-gray-400'}`}>
                                    {enabled
                                        ? `${t('cycleSoak.activated')}: ${cycleMinutes} ${t('common.minutesShort')} ${wateringLabel}, ${soakMinutes} ${t('common.minutesShort')} ${pauseLabel}`
                                        : t('cycleSoak.deactivated')
                                    }
                                </p>
                                {autoEnabled && (
                                    <IonChip outline color="primary" className="h-5 text-xs mt-1">
                                        {t('cycleSoak.auto')}
                                    </IonChip>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Recommendation explanation */}
                {recommendation && (
                    <div className="bg-white/5 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <IonIcon
                                icon={recommendation.shouldEnable ? alertCircle : checkmarkCircle}
                                className={recommendation.shouldEnable ? 'text-amber-400' : 'text-green-400'}
                            />
                            <span className="text-sm text-white font-medium">
                                {recommendation.shouldEnable ? t('zoneDetails.recommended') : t('zoneDetails.optional')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 m-0">
                            {recommendation.reason}
                        </p>

                        {/* Visual comparison */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="bg-white/5 rounded p-2 text-center">
                                <p className="text-xs text-gray-400 m-0">{t('zoneDetails.soilInfiltration')}</p>
                                <p className="text-white font-bold m-0">
                                    {recommendation.infiltrationRate} {t('common.mmPerHour')}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                                <p className="text-xs text-gray-400 m-0">{t('zoneDetails.applicationRate')}</p>
                                <p className="text-white font-bold m-0">
                                    {recommendation.applicationRate} {t('common.mmPerHour')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Timing controls (when enabled) */}
                {enabled && (
                    <div className="space-y-4">
                        {/* Cycle duration */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-300 text-sm">
                                    <IonIcon icon={timerOutline} className="mr-1 align-middle" />
                                    {t('cycleSoak.cycleWatering')}
                                </span>
                                <IonBadge color="primary">{cycleMinutes} {t('common.minutesShort')}</IonBadge>
                            </div>
                            <IonRange
                                min={2}
                                max={15}
                                step={1}
                                value={cycleMinutes}
                                onIonChange={(e) => handleCycleChange(e.detail.value as number)}
                                disabled={disabled}
                                className="mt-0"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>2 {t('common.minutesShort')}</span>
                                <span>15 {t('common.minutesShort')}</span>
                            </div>
                        </div>

                        {/* Soak duration */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-300 text-sm">
                                    <IonIcon icon={timerOutline} className="mr-1 align-middle" />
                                    {t('cycleSoak.soakAbsorption')}
                                </span>
                                <IonBadge color="secondary">{soakMinutes} {t('common.minutesShort')}</IonBadge>
                            </div>
                            <IonRange
                                min={5}
                                max={30}
                                step={5}
                                value={soakMinutes}
                                onIonChange={(e) => handleSoakChange(e.detail.value as number)}
                                disabled={disabled}
                                className="mt-0"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>5 {t('common.minutesShort')}</span>
                                <span>30 {t('common.minutesShort')}</span>
                            </div>
                        </div>

                        {/* Reset to auto button */}
                        {manualOverride && recommendation && (
                            <IonButton
                                fill="outline"
                                size="small"
                                onClick={resetToAuto}
                                disabled={disabled}
                            >
                                <IonIcon icon={settingsOutline} slot="start" />
                                {t('zoneDetails.resetToAuto')}
                            </IonButton>
                        )}
                    </div>
                )}

                {/* Educational section */}
                <IonAccordionGroup className="mt-4">
                    <IonAccordion value="info">
                        <IonItem slot="header" lines="none" className="--background-transparent">
                            <IonIcon icon={informationCircleOutline} slot="start" className="text-gray-400" />
                            <IonLabel className="text-gray-400 text-sm">
                                {t('zoneDetails.howCycleSoakWorks')}
                            </IonLabel>
                        </IonItem>
                        <div slot="content" className="px-4 pb-4">
                            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-4">
                                <p className="text-gray-300 text-sm m-0 mb-3">{t('cycleSoak.educationIntro')}</p>

                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <span className="text-cyan-400">1.</span>
                                        <p className="text-gray-400 text-sm m-0">{t('cycleSoak.educationStepCycle')}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-cyan-400">2.</span>
                                        <p className="text-gray-400 text-sm m-0">{t('cycleSoak.educationStepSoak')}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-cyan-400">3.</span>
                                        <p className="text-gray-400 text-sm m-0">{t('cycleSoak.educationStepRepeat')}</p>
                                    </div>
                                </div>

                                <div className="mt-3 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                                    <p className="text-amber-300 text-xs m-0">{t('cycleSoak.educationTip')}</p>
                                </div>
                            </div>
                        </div>
                    </IonAccordion>
                </IonAccordionGroup>
            </IonCardContent>
        </IonCard>
    );
};

export default CycleSoakConfig;
