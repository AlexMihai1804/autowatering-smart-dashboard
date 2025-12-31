/**
 * MaxVolumeConfig Component
 * 
 * Smart maximum volume configuration with:
 * - Auto-calculation based on soil, plant, and root depth
 * - Educational explanation
 * - Manual override option
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonLabel,
    IonIcon,
    IonRange,
    IonBadge,
    IonButton,
    IonAccordion,
    IonAccordionGroup,
    IonItem,
    IonChip,
    IonToggle,
    IonInput,
} from '@ionic/react';
import {
    beakerOutline,
    calculatorOutline,
    settingsOutline,
    informationCircleOutline,
    leafOutline,
    layersOutline,
    appsOutline,
} from 'ionicons/icons';

import { SoilDBEntry, PlantDBEntry } from '../../services/DatabaseService';
import { LabelWithHelp } from './WhatsThisTooltip';
import { useI18n } from '../../i18n';

interface MaxVolumeConfigProps {
    /** Selected soil */
    soil: SoilDBEntry | null;
    /** Selected plant */
    plant: PlantDBEntry | null;
    /** Root depth in mm */
    rootDepth: number;
    /** Current max volume limit in Liters */
    maxVolumeLimit: number;
    /** Coverage type */
    coverageType: 'area' | 'plants';
    /** Coverage value (m2 or count) */
    coverageValue: number;
    /** Callback for changes */
    onChange: (liters: number) => void;
    /** Whether component is disabled */
    disabled?: boolean;
}

export const MaxVolumeConfig: React.FC<MaxVolumeConfigProps> = ({
    soil,
    plant,
    rootDepth,
    maxVolumeLimit,
    coverageType,
    coverageValue,
    onChange,
    disabled = false,
}) => {
    const { t } = useI18n();
    const [autoCalculated, setAutoCalculated] = useState(true);

    // Calculate recommended max volume
    const recommendation = useMemo(() => {
        if (coverageType === 'plants') {
            // Simple formula for plants: 2L per plant (as per plan)
            // Or maybe scale by plant size? For now, stick to plan.
            const volumeLiters = Math.max(1, Math.round(coverageValue * 2));
            return {
                volumeLiters,
                details: '2L per plant',
                depthMm: 0
            };
        }

        // Area based calculation
        if (!soil) return null;

        const awc = typeof soil.available_water_mm_m === 'number'
            ? soil.available_water_mm_m
            : 150; // Default mm per meter

        // Calculate using FAO-56 formula
        // RAW = AWC × Root Depth × MAD (50%)
        const depthM = rootDepth / 1000; // Convert mm to m
        const totalAvailableWater = awc * depthM; // mm
        const mad = 0.5; // 50% Management Allowable Depletion (default)
        const readilyAvailableWater = totalAvailableWater * mad;

        // Volume (L) = Depth (mm) * Area (m²)
        const volumeLiters = Math.max(5, Math.round(readilyAvailableWater * coverageValue));

        return {
            volumeLiters,
            details: `RAW (${readilyAvailableWater.toFixed(1)}mm) × Area (${coverageValue}m²)`,
            depthMm: readilyAvailableWater,
            awc,
            rootDepthMm: rootDepth,
            totalAvailable: totalAvailableWater,
        };
    }, [soil, rootDepth, coverageType, coverageValue]);

    // Auto-apply when recommendation changes
    useEffect(() => {
        if (!recommendation || !autoCalculated) return;

        if (Math.abs(recommendation.volumeLiters - maxVolumeLimit) > 1) {
            onChange(recommendation.volumeLiters);
        }
    }, [recommendation?.volumeLiters, autoCalculated]);

    const handleManualChange = (value: number) => {
        setAutoCalculated(false);
        onChange(value);
    };

    const resetToAuto = () => {
        if (!recommendation) return;
        setAutoCalculated(true);
        onChange(recommendation.volumeLiters);
    };

    // Get severity color based on how much we're deviating from recommendation
    const getDeviationSeverity = (): 'success' | 'warning' | 'danger' => {
        if (!recommendation || autoCalculated) return 'success';

        const diff = Math.abs(maxVolumeLimit - recommendation.volumeLiters);
        const percentDiff = diff / recommendation.volumeLiters;

        if (percentDiff < 0.2) return 'success';
        if (percentDiff < 0.5) return 'warning';
        return 'danger';
    };

    return (
        <IonCard className="glass-panel">
            <IonCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IonIcon icon={beakerOutline} className="text-blue-400 text-xl" />
                        <LabelWithHelp
                            label={t('maxVolume.safetyLimit')}
                            tooltipKey="max_volume"
                            className="font-bold text-white"
                        />
                    </div>
                    <IonBadge color={getDeviationSeverity()} className="text-lg px-3 py-1">
                        {maxVolumeLimit} L
                    </IonBadge>
                </div>
            </IonCardHeader>

            <IonCardContent>
                {/* Auto-calculation toggle */}
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                        <IonIcon icon={calculatorOutline} className="text-cyan-400" />
                        <span className="text-white text-sm">{t('cycleSoak.auto')}</span>
                        {autoCalculated && (
                            <IonChip outline color="primary" className="h-5 text-xs">
                                🤖 {t('cycleSoak.active')}
                            </IonChip>
                        )}
                    </div>
                    <IonToggle
                        checked={autoCalculated}
                        onIonChange={(e) => setAutoCalculated(e.detail.checked)}
                        disabled={disabled || !recommendation}
                    />
                </div>

                {/* Calculation details (when auto is on) */}
                {recommendation && autoCalculated && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-4 mb-4 border border-blue-500/20">
                        <h4 className="text-white font-medium m-0 mb-3 flex items-center gap-2">
                            <IonIcon icon={calculatorOutline} />
                            {t('zoneDetails.howWeCalculated')}
                        </h4>

                        <div className="space-y-3">
                            {coverageType === 'area' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/5 rounded p-2">
                                            <div className="flex items-center gap-1 mb-1">
                                                <IonIcon icon={layersOutline} className="text-xs text-gray-400" />
                                                <span className="text-xs text-gray-400">{t('zoneDetails.availableWater')}</span>
                                            </div>
                                            <p className="text-white font-medium m-0">
                                                {recommendation.awc} mm/m
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded p-2">
                                            <div className="flex items-center gap-1 mb-1">
                                                <IonIcon icon={leafOutline} className="text-xs text-gray-400" />
                                                <span className="text-xs text-gray-400">{t('zoneDetails.rootDepth')}</span>
                                            </div>
                                            <p className="text-white font-medium m-0">
                                                {recommendation.rootDepthMm} mm
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-300 space-y-1">
                                        <p className="m-0">
                                            1. RAW (mm): {recommendation.depthMm?.toFixed(1)} mm
                                        </p>
                                        <p className="m-0">
                                            2. Volum: {recommendation.depthMm?.toFixed(1)} mm × {coverageValue} m² = <strong>{recommendation.volumeLiters} L</strong>
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-gray-300">
                                    <p className="m-0">
                                        Calcul simplificat: 2 Litri × {coverageValue} plante = <strong>{recommendation.volumeLiters} L</strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Manual slider (when auto is off) */}
                {!autoCalculated && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300 text-sm">{t('zoneDetails.adjustManually')}</span>
                            {recommendation && (
                                <span className="text-xs text-gray-500">
                                    {t('zoneDetails.recommendedValue')} {recommendation.volumeLiters} L
                                </span>
                            )}
                        </div>
                        <IonRange
                            min={5}
                            max={500}
                            step={5}
                            value={maxVolumeLimit}
                            onIonChange={(e) => handleManualChange(e.detail.value as number)}
                            disabled={disabled}
                            pin
                            pinFormatter={(value) => `${value} L`}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>5 L</span>
                            <span>500 L</span>
                        </div>

                        {/* Deviation warning */}
                        {recommendation && getDeviationSeverity() !== 'success' && (
                            <div className={`
                                mt-3 p-2 rounded border
                                ${getDeviationSeverity() === 'warning'
                                    ? 'bg-amber-500/10 border-amber-500/20'
                                    : 'bg-red-500/10 border-red-500/20'
                                }
                            `}>
                                <p className={`text-xs m-0 ${getDeviationSeverity() === 'warning' ? 'text-amber-300' : 'text-red-300'}`}>
                                    ⚠️ {t('zoneDetails.valueDiffers')} ({recommendation.volumeLiters} L)
                                </p>
                            </div>
                        )}

                        {/* Reset button */}
                        {recommendation && (
                            <IonButton
                                fill="outline"
                                size="small"
                                onClick={resetToAuto}
                                disabled={disabled}
                                className="mt-3"
                            >
                                <IonIcon icon={settingsOutline} slot="start" />
                                {t('zoneDetails.useCalculatedValue')}
                            </IonButton>
                        )}
                    </div>
                )}

                {/* Quick input for advanced users */}
                {!autoCalculated && (
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-gray-400 text-sm">{t('zoneDetails.orEnterDirectly')}</span>
                        <IonInput
                            type="number"
                            value={maxVolumeLimit}
                            onIonChange={(e) => {
                                const val = parseFloat(e.detail.value || '0');
                                if (val > 0 && val <= 1000) {
                                    handleManualChange(val);
                                }
                            }}
                            className="w-24 bg-white/5 rounded text-center"
                            placeholder="L"
                            disabled={disabled}
                        />
                        <span className="text-gray-400 text-sm">L</span>
                    </div>
                )}

                {/* Educational section */}
                <IonAccordionGroup>
                    <IonAccordion value="info">
                        <IonItem slot="header" lines="none" className="--background-transparent">
                            <IonIcon icon={informationCircleOutline} slot="start" className="text-gray-400" />
                            <IonLabel className="text-gray-400 text-sm">
                                {t('zoneDetails.whatIsMaxVolume')}
                            </IonLabel>
                        </IonItem>
                        <div slot="content" className="px-4 pb-4">
                            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg p-4">
                                <p className="text-gray-300 text-sm m-0 mb-3">
                                    <strong>Limita de volum</strong> este o măsură de siguranță pentru a preveni udarea excesivă în caz de erori de calcul sau senzori.
                                </p>

                                <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                                    <p className="text-cyan-300 text-xs m-0">
                                        💡 <strong>Sfat:</strong> Setează această valoare cu 20-30% mai mare decât necesarul zilnic maxim estimat.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </IonAccordion>
                </IonAccordionGroup>
            </IonCardContent>
        </IonCard>
    );
};

export default MaxVolumeConfig;
