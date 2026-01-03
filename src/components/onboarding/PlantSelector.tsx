/**
 * PlantSelector Component
 * 
 * Smart plant selection with:
 * - Category chips with emojis for quick filtering
 * - Search functionality
 * - Visual cards with Kc indicator
 * - Common plants highlighted
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
    IonSegment,
    IonSegmentButton,
} from '@ionic/react';
import {
    checkmarkCircle,
    leafOutline,
    searchOutline,
    gridOutline,
    listOutline,
    starOutline,
} from 'ionicons/icons';

import { PlantDBEntry } from '../../services/DatabaseService';
import { 
    PLANT_CATEGORIES, 
    getPlantCategory,
    type PlantCategoryId,
    type PlantCategoryInfo,
} from '../../utils/onboardingHelpers';
import { WhatsThisTooltip } from './WhatsThisTooltip';
import { useI18n } from '../../i18n';

interface PlantSelectorProps {
    /** Currently selected plant */
    value: PlantDBEntry | null;
    /** Available plants */
    plants: PlantDBEntry[];
    /** Callback when plant is selected */
    onChange: (plant: PlantDBEntry) => void;
    /** Whether the component is disabled */
    disabled?: boolean;
}

// Get Kc indicator color - FAO-56 Kc values typically range from 0.3 to 1.2+
// Low: < 0.85, Medium: 0.85-1.0, High: > 1.0
const getKcColor = (kc: number | null): string => {
    if (kc == null) return 'medium';
    if (kc < 0.85) return 'success';  // Low water need (drought tolerant)
    if (kc <= 1.0) return 'warning';  // Medium water need
    return 'danger';  // High water need
};

const getKcLabel = (kc: number | null, t: (key: string) => string): string => {
    if (kc == null) return t('common.notAvailable');
    if (kc < 0.85) return t('wizard.plant.waterNeedLow');
    if (kc <= 1.0) return t('wizard.plant.waterNeedMedium');
    return t('wizard.plant.waterNeedHigh');
};

export const PlantSelector: React.FC<PlantSelectorProps> = ({
    value,
    plants,
    onChange,
    disabled = false,
}) => {
    const { t } = useI18n();
    const [searchText, setSearchText] = useState('');
    const [activeCategory, setActiveCategory] = useState<PlantCategoryId | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // 2.2: Popular plants list (by common_name_en for reliable matching)
    const POPULAR_PLANTS = [
        'Lawn Grass',      // Gazon
        'Tomatoes',        // Roșii
        'Peppers',         // Ardei
        'Roses',           // Trandafiri
        'Apple Tree',      // Măr
        'Grapevine',       // Viță de vie
        'Lavender',        // Lavandă
        'Basil',           // Busuioc
    ];

    // Get popular plants from available plants
    const popularPlants = useMemo(() => {
        return POPULAR_PLANTS
            .map(name => plants.find(p => 
                p.common_name_en.toLowerCase() === name.toLowerCase()
            ))
            .filter((p): p is PlantDBEntry => p !== undefined)
            .slice(0, 8);
    }, [plants]);

    // Group plants by category
    const plantsByCategory = useMemo(() => {
        const grouped: Record<PlantCategoryId | 'all', PlantDBEntry[]> = {
            all: plants,
            legume: [],
            fructe: [],
            gazon: [],
            flori: [],
            copaci: [],
            arbusti: [],
            aromate: [],
            altele: [],
        };

        plants.forEach(plant => {
            const category = getPlantCategory(plant);
            grouped[category].push(plant);
        });

        return grouped;
    }, [plants]);

    // Filter plants by search and category
    const filteredPlants = useMemo(() => {
        let result = activeCategory === 'all' ? plants : plantsByCategory[activeCategory];

        if (searchText.trim()) {
            const searchLower = searchText.toLowerCase();
            result = result.filter((p: PlantDBEntry) =>
                p.common_name_ro.toLowerCase().includes(searchLower) ||
                p.common_name_en.toLowerCase().includes(searchLower) ||
                p.scientific_name?.toLowerCase().includes(searchLower) ||
                p.category?.toLowerCase().includes(searchLower)
            );
        }

        // Sort: selected first, then by name
        return result.sort((a: PlantDBEntry, b: PlantDBEntry) => {
            if (value?.id === a.id) return -1;
            if (value?.id === b.id) return 1;
            return a.common_name_ro.localeCompare(b.common_name_ro);
        });
    }, [plants, plantsByCategory, activeCategory, searchText, value]);

    // Get category count
    const getCategoryCount = (cat: PlantCategoryId | 'all'): number => {
        return plantsByCategory[cat]?.length || 0;
    };

    const getCategoryEmoji = (cat: PlantCategoryId): string => {
        return PLANT_CATEGORIES[cat]?.emoji || '🌱';
    };

    return (
        <div className="plant-selector">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <IonIcon icon={leafOutline} className="text-green-400 text-xl" />
                <IonLabel className="text-white font-bold">{t('wizard.plant.title')}</IonLabel>
                <WhatsThisTooltip tooltipKey="kc" size="small" />
            </div>

            {/* Search bar */}
            <IonSearchbar
                value={searchText}
                onIonInput={(e) => setSearchText(e.detail.value || '')}
                placeholder={t('wizard.plant.searchPlaceholder')}
                className="mb-3"
                debounce={200}
            />

            {/* Category chips */}
            <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2">
                <IonChip
                    onClick={() => setActiveCategory('all')}
                    color={activeCategory === 'all' ? 'primary' : 'medium'}
                    outline={activeCategory !== 'all'}
                >
                    ?? {t('wizard.plant.allCategories')} ({plants.length})
                </IonChip>
                {(Object.keys(PLANT_CATEGORIES) as PlantCategoryId[]).map(cat => {
                    const count = getCategoryCount(cat);
                    if (count === 0) return null;
                    
                    return (
                        <IonChip
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            color={activeCategory === cat ? 'primary' : 'medium'}
                            outline={activeCategory !== cat}
                        >
                            {PLANT_CATEGORIES[cat].emoji} {t(PLANT_CATEGORIES[cat].labelKey)} ({count})
                        </IonChip>
                    );
                })}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">
                    {filteredPlants.length} {t('wizard.plant.plantsLabel')}
                </span>
                <IonSegment 
                    value={viewMode} 
                    onIonChange={(e) => setViewMode(e.detail.value as 'grid' | 'list')}
                    className="w-auto"
                >
                    <IonSegmentButton value="grid" className="min-w-0 px-2">
                        <IonIcon icon={gridOutline} />
                    </IonSegmentButton>
                    <IonSegmentButton value="list" className="min-w-0 px-2">
                        <IonIcon icon={listOutline} />
                    </IonSegmentButton>
                </IonSegment>
            </div>

            {/* Currently selected (compact display) */}
            {value && (
                <IonCard className="glass-panel border border-cyber-emerald/30 mb-4">
                    <IonCardContent className="py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center text-2xl">
                                {getCategoryEmoji(getPlantCategory(value))}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold m-0">{value.common_name_ro}</h3>
                                <p className="text-gray-400 text-sm m-0">{value.scientific_name}</p>
                            </div>
                            <div className="text-right">
                                <IonBadge color={getKcColor(value.kc_mid)}>
                                    Kc: {value.kc_mid != null ? value.kc_mid.toFixed(2) : t('common.notAvailable')}
                                </IonBadge>
                                <p className="text-xs text-gray-500 m-0 mt-1">
                                    {getKcLabel(value.kc_mid, t)}
                                </p>
                            </div>
                            <IonIcon icon={checkmarkCircle} className="text-cyber-emerald text-xl" />
                        </div>
                    </IonCardContent>
                </IonCard>
            )}

            {/* 2.2: Popular plants section - show when no search/category filter */}
            {!searchText && activeCategory === 'all' && !value && popularPlants.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <IonIcon icon={starOutline} className="text-yellow-400" />
                        <span className="text-gray-300 text-sm font-medium">{t('wizard.plant.popular')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {popularPlants.map((plant: PlantDBEntry) => (
                            <IonChip
                                key={plant.id}
                                onClick={() => !disabled && onChange(plant)}
                                color="warning"
                                outline
                                className="cursor-pointer"
                            >
                                {getCategoryEmoji(getPlantCategory(plant))} {plant.common_name_ro}
                            </IonChip>
                        ))}
                    </div>
                </div>
            )}

            {/* Plants list/grid */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {filteredPlants.map((plant: PlantDBEntry) => {
                        const isSelected = value?.id === plant.id;
                        const category = getPlantCategory(plant);
                        
                        return (
                            <div
                                key={plant.id}
                                onClick={() => !disabled && onChange(plant)}
                                className={`
                                    glass-panel rounded-xl p-3 cursor-pointer transition-all
                                    ${isSelected ? 'border border-cyber-emerald ring-2 ring-cyber-emerald/30' : 'border border-white/10 hover:border-white/30'}
                                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <div className="flex items-start gap-2 mb-2">
                                    <span className="text-2xl">{getCategoryEmoji(category)}</span>
                                    {isSelected && (
                                        <IonIcon icon={checkmarkCircle} className="text-cyber-emerald ml-auto" />
                                    )}
                                </div>
                                <h4 className="text-white font-medium text-sm m-0 mb-1 line-clamp-1">
                                    {plant.common_name_ro}
                                </h4>
                                <p className="text-gray-500 text-xs m-0 line-clamp-1">
                                    {plant.scientific_name}
                                </p>
                                <div className="mt-2">
                                    <IonBadge color={getKcColor(plant.kc_mid)} className="text-xs">
                                        {getKcLabel(plant.kc_mid, t)}
                                    </IonBadge>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <IonCard className="glass-panel">
                    <IonCardContent className="p-0">
                        <IonList className="bg-transparent max-h-96 overflow-y-auto">
                            {filteredPlants.map((plant: PlantDBEntry) => {
                                const isSelected = value?.id === plant.id;
                                const category = getPlantCategory(plant);
                                
                                return (
                                    <IonItem
                                        key={plant.id}
                                        button
                                        onClick={() => onChange(plant)}
                                        className={isSelected ? 'bg-cyber-emerald/10' : ''}
                                        disabled={disabled}
                                        lines="inset"
                                    >
                                        <span slot="start" className="text-2xl">
                                            {getCategoryEmoji(category)}
                                        </span>
                                        <IonLabel>
                                            <h2 className="text-white font-medium">{plant.common_name_ro}</h2>
                                            <p className="text-gray-400 text-sm">{plant.scientific_name}</p>
                                            <p className="text-gray-500 text-xs">{plant.category}</p>
                                        </IonLabel>
                                        <div slot="end" className="text-right">
                                            <IonBadge color={getKcColor(plant.kc_mid)}>
                                                Kc: {plant.kc_mid != null ? plant.kc_mid.toFixed(2) : t('common.notAvailable')}
                                            </IonBadge>
                                            {isSelected && (
                                                <IonIcon icon={checkmarkCircle} color="success" className="block mt-1" />
                                            )}
                                        </div>
                                    </IonItem>
                                );
                            })}

                            {filteredPlants.length === 0 && (
                                <IonItem>
                                    <IonLabel className="text-center text-gray-400 py-4">
                                        <IonIcon icon={searchOutline} className="text-3xl mb-2" />
                                        <p>{t('wizard.plant.noResultsTitle')}</p>
                                        <p className="text-sm">{t('wizard.plant.noResultsHint')}</p>
                                    </IonLabel>
                                </IonItem>
                            )}
                        </IonList>
                    </IonCardContent>
                </IonCard>
            )}

            {/* Kc explanation */}
            <div className="mt-3 bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-300 font-medium">{t('wizard.plant.kcMeaning')}</span>
                    <WhatsThisTooltip tooltipKey="kc" size="small" />
                </div>
                <div className="flex gap-2 text-xs">
                    <IonBadge color="success">{t('wizard.plant.kcLegendLow')}</IonBadge>
                    <IonBadge color="warning">{t('wizard.plant.kcLegendMedium')}</IonBadge>
                    <IonBadge color="danger">{t('wizard.plant.kcLegendHigh')}</IonBadge>
                </div>
            </div>
        </div>
    );
};

export default PlantSelector;
