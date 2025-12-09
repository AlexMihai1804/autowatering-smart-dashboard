/**
 * IrrigationMethodSelector - COMPACT Version
 * 
 * Simplified irrigation method selection:
 * - Horizontal scrollable chips for quick selection
 * - Shows recommendation if plant selected
 * - Expandable list for all methods
 */

import React, { useMemo, useState } from 'react';
import {
    IonCard,
    IonCardContent,
    IonLabel,
    IonIcon,
    IonChip,
    IonBadge,
    IonButton,
    IonList,
    IonItem,
    IonAccordion,
    IonAccordionGroup,
} from '@ionic/react';
import {
    checkmarkCircle,
    waterOutline,
    chevronDown,
} from 'ionicons/icons';

import { IrrigationMethodEntry, PlantDBEntry } from '../../services/DatabaseService';
import { IRRIGATION_METHOD_VISUALS } from '../../utils/onboardingHelpers';

interface IrrigationMethodSelectorCompactProps {
    value: IrrigationMethodEntry | null;
    methods: IrrigationMethodEntry[];
    selectedPlant: PlantDBEntry | null;
    onChange: (method: IrrigationMethodEntry) => void;
    disabled?: boolean;
}

// Get emoji for method
const getEmoji = (codeEnum: string): string => {
    if (IRRIGATION_METHOD_VISUALS[codeEnum]) {
        return IRRIGATION_METHOD_VISUALS[codeEnum].emoji;
    }
    // Fallback based on type
    if (codeEnum.includes('DRIP')) return '💧';
    if (codeEnum.includes('SPRINKLER')) return '🌧️';
    if (codeEnum.includes('MICRO')) return '🔬';
    if (codeEnum.includes('MANUAL')) return '🪣';
    return '💦';
};

export const IrrigationMethodSelectorCompact: React.FC<IrrigationMethodSelectorCompactProps> = ({
    value,
    methods,
    selectedPlant,
    onChange,
    disabled = false,
}) => {
    const [showAllMethods, setShowAllMethods] = useState(false);

    // Get top recommendations based on plant
    const { topMethods, otherMethods } = useMemo(() => {
        if (!selectedPlant) {
            // No plant - show common methods first
            const commonEnums = ['IRRIG_DRIP_SURFACE', 'IRRIG_SPRINKLER_ROTARY', 'IRRIG_DRIP_SUB', 'IRRIG_MICRO_SPRAY', 'IRRIG_MANUAL_HOSE'];
            const common = methods.filter(m => commonEnums.includes(m.code_enum));
            const others = methods.filter(m => !commonEnums.includes(m.code_enum));
            return { topMethods: common.slice(0, 5), otherMethods: others };
        }

        const plantRecommends = selectedPlant.typ_irrig_method?.toUpperCase() || '';
        
        // Sort by recommendation match
        const sorted = [...methods].sort((a, b) => {
            const aMatches = a.code_enum.includes(plantRecommends) || plantRecommends.includes(a.code_enum.replace('IRRIG_', ''));
            const bMatches = b.code_enum.includes(plantRecommends) || plantRecommends.includes(b.code_enum.replace('IRRIG_', ''));
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            return 0;
        });

        return { 
            topMethods: sorted.slice(0, 5), 
            otherMethods: sorted.slice(5) 
        };
    }, [methods, selectedPlant]);

    // If value is selected and shown, display compact
    if (value && !showAllMethods) {
        return (
            <IonCard className="glass-panel">
                <IonCardContent className="py-3">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">{getEmoji(value.code_enum)}</div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-bold m-0">{value.name}</h3>
                                <IonBadge color="success" className="text-xs">
                                    <IonIcon icon={checkmarkCircle} className="mr-1" />
                                    Selectat
                                </IonBadge>
                            </div>
                            <p className="text-gray-400 text-sm m-0">
                                Eficiență: {value.efficiency_pct || 'N/A'}% • {value.application_rate_mm_h || 'N/A'} mm/h
                            </p>
                        </div>
                        <IonButton 
                            fill="outline" 
                            size="small"
                            onClick={() => setShowAllMethods(true)}
                            disabled={disabled}
                        >
                            Schimbă
                        </IonButton>
                    </div>
                </IonCardContent>
            </IonCard>
        );
    }

    return (
        <IonCard className="glass-panel">
            <IonCardContent className="py-3">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <IonIcon icon={waterOutline} className="text-xl text-cyber-aqua" />
                    <IonLabel className="font-bold text-white">Metodă de irigare</IonLabel>
                </div>

                {/* Quick selection chips - horizontal scroll */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                    {topMethods.map((method, idx) => {
                        const isSelected = value?.id === method.id;
                        const isRecommended = idx === 0 && selectedPlant;
                        
                        return (
                            <IonChip
                                key={method.id}
                                onClick={() => {
                                    onChange(method);
                                    setShowAllMethods(false);
                                }}
                                color={isSelected ? 'success' : 'medium'}
                                outline={!isSelected}
                                className="flex-shrink-0 py-2"
                                disabled={disabled}
                            >
                                <span className="text-lg mr-1">{getEmoji(method.code_enum)}</span>
                                <span className="text-sm">{method.name}</span>
                                {isRecommended && !isSelected && (
                                    <span className="ml-1 text-yellow-400">⭐</span>
                                )}
                                {isSelected && <IonIcon icon={checkmarkCircle} className="ml-1" />}
                            </IonChip>
                        );
                    })}
                </div>

                {/* More methods accordion */}
                {otherMethods.length > 0 && (
                    <IonAccordionGroup>
                        <IonAccordion value="more">
                            <IonItem slot="header" lines="none" className="--background-transparent">
                                <IonIcon icon={chevronDown} slot="start" className="text-gray-400" />
                                <IonLabel className="text-gray-400 text-sm">
                                    Mai multe metode ({otherMethods.length})
                                </IonLabel>
                            </IonItem>
                            <div slot="content" className="pb-2">
                                <IonList className="bg-transparent">
                                    {otherMethods.map((method) => {
                                        const isSelected = value?.id === method.id;
                                        return (
                                            <IonItem
                                                key={method.id}
                                                button
                                                onClick={() => {
                                                    onChange(method);
                                                    setShowAllMethods(false);
                                                }}
                                                className={isSelected ? 'bg-cyber-emerald/10' : ''}
                                                lines="inset"
                                                disabled={disabled}
                                            >
                                                <span className="text-xl mr-3">{getEmoji(method.code_enum)}</span>
                                                <IonLabel>
                                                    <h3 className="text-white m-0">{method.name}</h3>
                                                    <p className="text-gray-400 text-xs m-0">
                                                        {method.efficiency_pct}% eficiență
                                                    </p>
                                                </IonLabel>
                                                {isSelected && (
                                                    <IonIcon icon={checkmarkCircle} slot="end" color="success" />
                                                )}
                                            </IonItem>
                                        );
                                    })}
                                </IonList>
                            </div>
                        </IonAccordion>
                    </IonAccordionGroup>
                )}

                {/* Cancel button if editing */}
                {value && showAllMethods && (
                    <IonButton
                        fill="clear"
                        size="small"
                        expand="block"
                        onClick={() => setShowAllMethods(false)}
                        className="mt-2"
                    >
                        Anulează
                    </IonButton>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default IrrigationMethodSelectorCompact;
