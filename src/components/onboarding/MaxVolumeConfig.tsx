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
} from 'ionicons/icons';

import { SoilDBEntry, PlantDBEntry } from '../../services/DatabaseService';
import { LabelWithHelp } from './WhatsThisTooltip';

interface MaxVolumeConfigProps {
    /** Selected soil */
    soil: SoilDBEntry | null;
    /** Selected plant */
    plant: PlantDBEntry | null;
    /** Root depth in mm */
    rootDepth: number;
    /** Current max volume value in mm */
    maxVolume: number;
    /** Whether auto-calculation is enabled */
    autoCalculated: boolean;
    /** Callback for changes */
    onChange: (config: {
        maxVolume: number;
        autoCalculated: boolean;
    }) => void;
    /** Whether component is disabled */
    disabled?: boolean;
}

export const MaxVolumeConfig: React.FC<MaxVolumeConfigProps> = ({
    soil,
    plant,
    rootDepth,
    maxVolume,
    autoCalculated,
    onChange,
    disabled = false,
}) => {
    const [manualValue, setManualValue] = useState<number>(maxVolume);

    // Calculate recommended max volume
    const recommendation = useMemo(() => {
        if (!soil) return null;

        const awc = typeof soil.available_water_mm_m === 'number' 
            ? soil.available_water_mm_m 
            : 150; // Default mm per meter

        const fc = typeof soil.field_capacity_pct === 'number'
            ? soil.field_capacity_pct
            : 25; // Default %

        const wp = typeof soil.wilting_point_pct === 'number'
            ? soil.wilting_point_pct
            : 12; // Default %

        // Calculate using FAO-56 formula
        // RAW = AWC × Root Depth × MAD (50%)
        const depthM = rootDepth / 1000; // Convert mm to m
        const totalAvailableWater = awc * depthM; // mm
        const mad = 0.5; // 50% Management Allowable Depletion (default)
        const readilyAvailableWater = totalAvailableWater * mad;
        const calculatedVolume = Math.max(5, Math.round(readilyAvailableWater * 10) / 10);

        return {
            volume: calculatedVolume,
            awc,
            fc,
            wp,
            rootDepthMm: rootDepth,
            totalAvailable: totalAvailableWater,
            readilyAvailable: readilyAvailableWater,
        };
    }, [soil, rootDepth]);

    // Auto-apply when recommendation changes
    useEffect(() => {
        if (!recommendation || !autoCalculated) return;
        
        if (Math.abs(recommendation.volume - maxVolume) > 0.5) {
            onChange({
                maxVolume: recommendation.volume,
                autoCalculated: true,
            });
        }
    }, [recommendation?.volume, autoCalculated]);

    const handleManualChange = (value: number) => {
        setManualValue(value);
        onChange({
            maxVolume: value,
            autoCalculated: false,
        });
    };

    const handleAutoToggle = (auto: boolean) => {
        if (auto && recommendation) {
            onChange({
                maxVolume: recommendation.volume,
                autoCalculated: true,
            });
        } else {
            onChange({
                maxVolume: manualValue || maxVolume,
                autoCalculated: false,
            });
        }
    };

    const resetToAuto = () => {
        if (!recommendation) return;
        onChange({
            maxVolume: recommendation.volume,
            autoCalculated: true,
        });
    };

    // Get severity color based on how much we're deviating from recommendation
    const getDeviationSeverity = (): 'success' | 'warning' | 'danger' => {
        if (!recommendation || autoCalculated) return 'success';
        
        const diff = Math.abs(maxVolume - recommendation.volume);
        const percentDiff = diff / recommendation.volume;
        
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
                            label="Volum maxim per udare" 
                            tooltipKey="max_volume"
                            className="font-bold text-white"
                        />
                    </div>
                    <IonBadge color={getDeviationSeverity()} className="text-lg px-3 py-1">
                        {maxVolume.toFixed(1)} mm
                    </IonBadge>
                </div>
            </IonCardHeader>

            <IonCardContent>
                {/* Auto-calculation toggle */}
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                        <IonIcon icon={calculatorOutline} className="text-cyan-400" />
                        <span className="text-white text-sm">Calcul automat</span>
                        {autoCalculated && (
                            <IonChip outline color="primary" className="h-5 text-xs">
                                🤖 Activ
                            </IonChip>
                        )}
                    </div>
                    <IonToggle
                        checked={autoCalculated}
                        onIonChange={(e) => handleAutoToggle(e.detail.checked)}
                        disabled={disabled || !recommendation}
                    />
                </div>

                {/* Calculation details (when auto is on) */}
                {recommendation && autoCalculated && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-4 mb-4 border border-blue-500/20">
                        <h4 className="text-white font-medium m-0 mb-3 flex items-center gap-2">
                            <IonIcon icon={calculatorOutline} />
                            Cum am calculat:
                        </h4>
                        
                        <div className="space-y-3">
                            {/* Input parameters */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 rounded p-2">
                                    <div className="flex items-center gap-1 mb-1">
                                        <IonIcon icon={layersOutline} className="text-xs text-gray-400" />
                                        <span className="text-xs text-gray-400">Apă disponibilă</span>
                                    </div>
                                    <p className="text-white font-medium m-0">
                                        {recommendation.awc} mm/m
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded p-2">
                                    <div className="flex items-center gap-1 mb-1">
                                        <IonIcon icon={leafOutline} className="text-xs text-gray-400" />
                                        <span className="text-xs text-gray-400">Adâncime rădăcini</span>
                                    </div>
                                    <p className="text-white font-medium m-0">
                                        {recommendation.rootDepthMm} mm
                                    </p>
                                </div>
                            </div>

                            {/* Calculation steps */}
                            <div className="text-sm text-gray-300 space-y-1">
                                <p className="m-0">
                                    1. Apă totală disponibilă: {recommendation.awc} × {(recommendation.rootDepthMm / 1000).toFixed(2)} m = <strong>{recommendation.totalAvailable.toFixed(1)} mm</strong>
                                </p>
                                <p className="m-0">
                                    2. Cu 50% MAD (depletion acceptabil): {recommendation.totalAvailable.toFixed(1)} × 0.5 = <strong>{recommendation.readilyAvailable.toFixed(1)} mm</strong>
                                </p>
                                <p className="m-0">
                                    3. Rotunjit: <strong>{recommendation.volume.toFixed(1)} mm</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manual slider (when auto is off) */}
                {!autoCalculated && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300 text-sm">Ajustează manual:</span>
                            {recommendation && (
                                <span className="text-xs text-gray-500">
                                    Recomandat: {recommendation.volume.toFixed(1)} mm
                                </span>
                            )}
                        </div>
                        <IonRange
                            min={5}
                            max={50}
                            step={0.5}
                            value={maxVolume}
                            onIonChange={(e) => handleManualChange(e.detail.value as number)}
                            disabled={disabled}
                            pin
                            pinFormatter={(value) => `${value} mm`}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>5 mm</span>
                            <span>50 mm</span>
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
                                    ⚠️ Valoarea diferă semnificativ de cea recomandată ({recommendation.volume.toFixed(1)} mm)
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
                                Folosește valoarea calculată
                            </IonButton>
                        )}
                    </div>
                )}

                {/* Quick input for advanced users */}
                {!autoCalculated && (
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-gray-400 text-sm">Sau introdu direct:</span>
                        <IonInput
                            type="number"
                            value={maxVolume}
                            onIonChange={(e) => {
                                const val = parseFloat(e.detail.value || '0');
                                if (val > 0 && val <= 100) {
                                    handleManualChange(val);
                                }
                            }}
                            className="w-24 bg-white/5 rounded text-center"
                            placeholder="mm"
                            disabled={disabled}
                        />
                        <span className="text-gray-400 text-sm">mm</span>
                    </div>
                )}

                {/* Educational section */}
                <IonAccordionGroup>
                    <IonAccordion value="info">
                        <IonItem slot="header" lines="none" className="--background-transparent">
                            <IonIcon icon={informationCircleOutline} slot="start" className="text-gray-400" />
                            <IonLabel className="text-gray-400 text-sm">
                                Ce înseamnă volumul maxim?
                            </IonLabel>
                        </IonItem>
                        <div slot="content" className="px-4 pb-4">
                            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg p-4">
                                <p className="text-gray-300 text-sm m-0 mb-3">
                                    <strong>Volumul maxim per udare</strong> reprezintă cantitatea maximă de apă ce poate fi aplicată într-o singură sesiune de irigare.
                                </p>
                                
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-start gap-2">
                                        <span className="text-blue-400">📊</span>
                                        <p className="text-gray-400 text-sm m-0">
                                            <strong>Prea mult:</strong> Apa se scurge sub zona rădăcinilor (risipă)
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-blue-400">📉</span>
                                        <p className="text-gray-400 text-sm m-0">
                                            <strong>Prea puțin:</strong> Rădăcinile rămân superficiale
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-400">✅</span>
                                        <p className="text-gray-400 text-sm m-0">
                                            <strong>Optim:</strong> Apa ajunge la adâncimea rădăcinilor
                                        </p>
                                    </div>
                                </div>

                                <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                                    <p className="text-cyan-300 text-xs m-0">
                                        💡 <strong>Formula FAO-56:</strong> RAW = AWC × Adâncime × MAD (50%)
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
