/**
 * IrrigationMethodSelector Component
 * 
 * Smart irrigation method selection with:
 * - Visual representations (emoji/icons)
 * - Smart sorting based on selected plant
 * - Detailed descriptions
 * - Coverage indicators
 */

import React, { useMemo, useState } from 'react';
import {
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonLabel,
    IonIcon,
    IonChip,
    IonBadge,
    IonList,
    IonItem,
    IonSearchbar,
} from '@ionic/react';
import {
    checkmarkCircle,
    waterOutline,
    speedometerOutline,
    thumbsUpOutline,
} from 'ionicons/icons';

import { IrrigationMethodEntry, PlantDBEntry } from '../../services/DatabaseService';
import { 
    IRRIGATION_METHOD_VISUALS,
    type IrrigationMethodVisual 
} from '../../utils/onboardingHelpers';
import { WhatsThisTooltip } from './WhatsThisTooltip';
import { useI18n } from '../../i18n';

interface IrrigationMethodSelectorProps {
    /** Currently selected method */
    value: IrrigationMethodEntry | null;
    /** Available irrigation methods */
    methods: IrrigationMethodEntry[];
    /** Selected plant (for smart sorting) */
    selectedPlant: PlantDBEntry | null;
    /** Callback when method is selected */
    onChange: (method: IrrigationMethodEntry) => void;
    /** Whether the component is disabled */
    disabled?: boolean;
}

// Method category colors based on code_enum
const getMethodCategory = (codeEnum: string): string => {
    if (codeEnum.includes('DRIP')) return 'drip';
    if (codeEnum.includes('SPRINKLER')) return 'sprinkler';
    if (codeEnum.includes('MICRO')) return 'micro';
    if (codeEnum.includes('MANUAL')) return 'manual';
    if (codeEnum.includes('BASIN') || codeEnum.includes('FURROW')) return 'surface';
    return 'other';
};

const CATEGORY_COLORS: Record<string, string> = {
    drip: 'primary',
    sprinkler: 'secondary',
    surface: 'tertiary',
    micro: 'success',
    manual: 'warning',
    other: 'medium',
};

export const IrrigationMethodSelector: React.FC<IrrigationMethodSelectorProps> = ({
    value,
    methods,
    selectedPlant,
    onChange,
    disabled = false,
}) => {
    const { t, language } = useI18n();
    const percentUnit = t('common.percent');
    const [searchText, setSearchText] = useState('');
    const selectedPlantName = selectedPlant
        ? (language === 'ro' ? selectedPlant.common_name_ro : selectedPlant.common_name_en)
        : '';

    // Sort methods: plant-recommended first, then by name
    const sortedMethods = useMemo(() => {
        if (!selectedPlant) return [...methods];
        
        const plantRecommends = selectedPlant.typ_irrig_method?.toUpperCase() || '';
        
        return [...methods].sort((a, b) => {
            const aMatches = a.code_enum.includes(plantRecommends) || plantRecommends.includes(a.code_enum.replace('IRRIG_', ''));
            const bMatches = b.code_enum.includes(plantRecommends) || plantRecommends.includes(b.code_enum.replace('IRRIG_', ''));
            
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [methods, selectedPlant]);

    // Filter by search
    const filteredMethods = useMemo(() => {
        if (!searchText.trim()) return sortedMethods;
        
        const searchLower = searchText.toLowerCase();
        return sortedMethods.filter(m => 
            m.name.toLowerCase().includes(searchLower) ||
            m.code_enum.toLowerCase().includes(searchLower) ||
            m.recommended_for?.toLowerCase().includes(searchLower)
        );
    }, [sortedMethods, searchText]);

    // Get top recommendations (first 3 from sorted list)
    const topRecommendations = useMemo(() => {
        return sortedMethods.slice(0, 3);
    }, [sortedMethods]);

    const getMethodVisual = (codeEnum: string): IrrigationMethodVisual => {
        // Try direct match
        if (IRRIGATION_METHOD_VISUALS[codeEnum]) {
            return IRRIGATION_METHOD_VISUALS[codeEnum];
        }
        
        // Try partial match
        for (const [key, visual] of Object.entries(IRRIGATION_METHOD_VISUALS)) {
            if (codeEnum.includes(key.replace('IRRIG_', ''))) {
                return visual;
            }
        }
        
        // Default
        return { emoji: '💧', descriptionKey: 'wizard.irrigationMethod.descriptionFallback', bgColor: 'from-blue-500/20 to-cyan-500/20' };
    };

    const isRecommended = (method: IrrigationMethodEntry): boolean => {
        return topRecommendations.some(r => r.id === method.id);
    };

    return (
        <div className="irrigation-method-selector">
            {/* Header with info */}
            <div className="flex items-center gap-2 mb-3">
                <IonIcon icon={waterOutline} className="text-cyber-aqua text-xl" />
                <IonLabel className="text-white font-bold">{t('wizard.irrigationMethod.title')}</IonLabel>
                <WhatsThisTooltip tooltipKey="irrigation_method" size="small" />
            </div>

            {/* Search bar */}
            <IonSearchbar
                value={searchText}
                onIonInput={(e) => setSearchText(e.detail.value || '')}
                placeholder={t('wizard.irrigationMethod.searchPlaceholder')}
                className="mb-4"
                debounce={200}
            />

            {/* Top recommendations (only show if plant selected) */}
            {selectedPlant && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <IonIcon icon={thumbsUpOutline} className="text-green-400" />
                        <span className="text-gray-300 text-sm">{t('wizard.irrigationMethod.recommendedFor').replace('{plant}', selectedPlantName)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {topRecommendations.map(method => {
                            const visual = getMethodVisual(method.code_enum);
                            const isSelected = value?.id === method.id;
                            
                            return (
                                <IonChip
                                    key={method.id}
                                    onClick={() => !disabled && onChange(method)}
                                    color={isSelected ? 'success' : 'medium'}
                                    outline={!isSelected}
                                    className="h-auto py-2"
                                >
                                    <span className="text-lg mr-1">{visual.emoji}</span>
                                    <span>{method.name}</span>
                                    {isSelected && <IonIcon icon={checkmarkCircle} className="ml-1" />}
                                </IonChip>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Currently selected */}
            {value && (
                <IonCard className="glass-panel border border-cyber-emerald/30 mb-4">
                    <IonCardContent className="py-3">
                        <div className="flex items-center gap-3">
                            <div 
                                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${getMethodVisual(value.code_enum).bgColor}`}
                            >
                                {getMethodVisual(value.code_enum).emoji}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-bold m-0">{value.name}</h3>
                                    {isRecommended(value) && (
                                        <IonBadge color="success" className="text-xs">
                                            {t('wizard.irrigationMethod.recommendedBadge')}
                                        </IonBadge>
                                    )}
                                </div>
                                <p className="text-gray-400 text-sm m-0">
                                    {t(getMethodVisual(value.code_enum).descriptionKey)}
                                </p>
                            </div>
                            <IonIcon icon={checkmarkCircle} className="text-cyber-emerald text-2xl" />
                        </div>

                        {/* Method details */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="bg-white/5 rounded-lg p-2">
                                <p className="text-xs text-gray-400 m-0">{t('wizard.irrigationMethod.efficiencyLabel')}</p>
                                <p className="text-white font-medium m-0">
                                    {value.efficiency_pct != null ? `${value.efficiency_pct}${percentUnit}` : t('common.notAvailable')}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                                <p className="text-xs text-gray-400 m-0">{t('wizard.irrigationMethod.applicationRateLabel')}</p>
                                <p className="text-white font-medium m-0">
                                    {value.application_rate_mm_h || t('common.notAvailable')}
                                </p>
                            </div>
                        </div>
                    </IonCardContent>
                </IonCard>
            )}

            {/* All methods list */}
            <IonCard className="glass-panel">
                <IonCardHeader className="pb-1">
                    <IonLabel className="text-gray-300 text-sm">
                        {t('wizard.irrigationMethod.allMethods').replace('{count}', String(filteredMethods.length))}
                    </IonLabel>
                </IonCardHeader>
                <IonCardContent className="p-0">
                    <IonList className="bg-transparent max-h-80 overflow-y-auto">
                        {filteredMethods.map((method, index) => {
                            const visual = getMethodVisual(method.code_enum);
                            const isSelected = value?.id === method.id;
                            const recommended = isRecommended(method);
                            const category = getMethodCategory(method.code_enum);
                            
                            return (
                                <IonItem
                                    key={method.id}
                                    button
                                    onClick={() => onChange(method)}
                                    className={`${isSelected ? 'bg-cyber-emerald/10' : ''} ${recommended && !isSelected ? 'bg-green-500/5' : ''}`}
                                    disabled={disabled}
                                    lines="inset"
                                >
                                    <div 
                                        slot="start"
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gradient-to-br ${visual.bgColor}`}
                                    >
                                        {visual.emoji}
                                    </div>
                                    <IonLabel>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-white font-medium m-0">{method.name}</h2>
                                            {recommended && (
                                                <IonBadge color="success" className="text-xs opacity-70">
                                                    {t('wizard.irrigationMethod.recommendedBadge')}
                                                </IonBadge>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm m-0">
                                            {method.recommended_for || t(visual.descriptionKey)}
                                        </p>
                                        <div className="flex gap-2 mt-1">
                                            <IonChip 
                                                outline 
                                                color={CATEGORY_COLORS[category] || 'medium'}
                                                className="h-5 text-xs m-0"
                                            >
                                                {t(`wizard.irrigationMethod.categories.${category}`)}
                                            </IonChip>
                                            {method.efficiency_pct != null && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <IonIcon icon={speedometerOutline} />
                                                    {method.efficiency_pct}{percentUnit}
                                                </span>
                                            )}
                                        </div>
                                    </IonLabel>
                                    {isSelected && (
                                        <IonIcon 
                                            icon={checkmarkCircle} 
                                            slot="end" 
                                            color="success" 
                                            className="text-xl"
                                        />
                                    )}
                                </IonItem>
                            );
                        })}

                        {filteredMethods.length === 0 && (
                            <IonItem>
                                <IonLabel className="text-center text-gray-400">{t('wizard.irrigationMethod.noResults').replace('{query}', searchText)}</IonLabel>
                            </IonItem>
                        )}
                    </IonList>
                </IonCardContent>
            </IonCard>

            {/* Info about sorting */}
            {selectedPlant && (
                <p className="text-xs text-gray-500 text-center mt-2">{t('wizard.irrigationMethod.sortedNote')}</p>
            )}
        </div>
    );
};

export default IrrigationMethodSelector;
