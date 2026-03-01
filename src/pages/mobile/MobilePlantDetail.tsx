import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import { useAppStore } from '../../store/useAppStore';
import * as MarketplaceService from '../../services/MarketplaceService';
import { marketplaceDeviceSyncService } from '../../services/marketplaceDeviceSync';
import type { AiChatMessage, MarketplacePlant, Review } from '../../types/marketplace';
import MobileHeader from '../../components/mobile/MobileHeader';
import PlantGrowingGuide from '../../components/mobile/PlantGrowingGuide';
import AdvancedSection from '../../components/mobile/AdvancedSection';
import { useUxPrefsStore } from '../../store/useUxPrefsStore';
import { getLocalizedMarketplacePlantName } from '../../utils/plantNameHelpers';
import { translatePlantCategory } from '../../utils/i18nHelpers';

/** Status of a plant relative to the device */
type DevicePlantStatus = 'not_on_device' | 'synced' | 'update_available';
type DetailTab = 'overview' | 'guide' | 'device';

function normalizeDescription(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isPlaceholderDescription(plant: MarketplacePlant, description: string): boolean {
    const d = normalizeDescription(description);
    if (!d) return true;
    if (/\bnan\b/i.test(d)) return true;
    if (d.includes('â') || d.includes('�')) return true;

    const candidates = [
        `${plant.commonNameEn} (${plant.scientificName})`,
        `${plant.commonNameRo} (${plant.scientificName})`,
        `${plant.commonNameEn}`,
        `${plant.commonNameRo}`,
        `${plant.scientificName}`,
    ]
        .map((v) => normalizeDescription(v || ''))
        .filter(Boolean);

    return candidates.includes(d);
}

function generatePlantDescription(plant: MarketplacePlant): string {
    const d = (plant.plantData ?? {}) as Record<string, unknown>;
    const parts: string[] = [];

    const cycle = d.growth_cycle ? `${String(d.growth_cycle).toLowerCase()} ` : '';
    const use = d.primary_use ? `, cultivated for ${String(d.primary_use).replace(/_/g, ' ').toLowerCase()}` : '';
    const indoor = d.indoor_ok === true ? ', also suitable for indoor growing' : '';
    const name = plant.commonNameEn || plant.scientificName || 'This plant';
    const sci = plant.scientificName ? ` (${plant.scientificName})` : '';
    parts.push(`${name}${sci} is a ${cycle}${(plant.category || '').toLowerCase()} plant${use}${indoor}.`);

    const tMin = d.temp_opt_min_c != null ? Number(d.temp_opt_min_c) : null;
    const tMax = d.temp_opt_max_c != null ? Number(d.temp_opt_max_c) : null;
    const frost = d.frost_tolerance_c != null ? Number(d.frost_tolerance_c) : null;
    const phMin = d.ph_min != null ? Number(d.ph_min) : null;
    const phMax = d.ph_max != null ? Number(d.ph_max) : null;
    const clim: string[] = [];
    if (tMin !== null && tMax !== null) clim.push(`grows best at ${tMin}–${tMax}°C`);
    if (phMin !== null && phMax !== null) {
        const desc = phMax < 6.5 ? 'acidic' : phMin > 7 ? 'alkaline' : 'neutral to slightly acidic';
        clim.push(`prefers ${desc} soil (pH ${phMin}–${phMax})`);
    }
    if (frost !== null) clim.push(`tolerates frost down to ${frost}°C`);
    if (clim.length > 0) parts.push(`It ${clim.join(', ')}.`);

    const tolMap: Record<string, string> = { HIGH: 'high', MED: 'moderate', LOW: 'low' };
    const tol: string[] = [];
    if (d.drought_tolerance) tol.push(`${tolMap[String(d.drought_tolerance)] ?? String(d.drought_tolerance)} drought tolerance`);
    if (d.shade_tolerance) tol.push(`${tolMap[String(d.shade_tolerance)] ?? String(d.shade_tolerance)} shade tolerance`);
    const kc = d.kc_mid != null ? Number(d.kc_mid) : NaN;
    if (!isNaN(kc)) tol.push(`${kc > 1.0 ? 'high' : kc > 0.7 ? 'moderate' : 'low'} water needs`);
    if (tol.length > 0) parts.push(`The plant has ${tol.join(', ')}.`);

    return parts.join(' ');
}

const MobilePlantDetail: React.FC = () => {
    const { plantId } = useParams<{ plantId: string }>();
    const history = useHistory();
    const { t, language } = useI18n();
    const { user, isAuthenticated } = useAuth();

    const {
        currentPlant,
        currentPlantLoading,
        currentPlantReviews,
        currentPlantComments,
        setCurrentPlant,
        setCurrentPlantLoading,
        setCurrentPlantReviews,
        setCurrentPlantComments,
    } = useMarketplaceStore();

    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [installing, setInstalling] = useState(false);
    const [showImageIndex, setShowImageIndex] = useState(0);
    // Touch swipe state for image carousel
    const touchStartX = useRef<number>(0);
    const touchDeltaX = useRef<number>(0);
    const isSwiping = useRef(false);
    const carouselRef = useRef<HTMLDivElement>(null);
    const [syncingToDevice, setSyncingToDevice] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [removingFromDevice, setRemovingFromDevice] = useState(false);
    const [devicePlantStatus, setDevicePlantStatus] = useState<DevicePlantStatus>('not_on_device');

    const { connectionState } = useAppStore();
    const { isAdvanced: advancedMode } = useUxPrefsStore();
    const { devicePlantMap } = useMarketplaceStore();
    const isConnected = connectionState === 'connected';
    // ROM/official plants → always on device when connected
    // Custom marketplace plants → check devicePlantMap (synced via CRC16)
    const isOnDevice = plantId
        ? (plantId in devicePlantMap) || (isConnected && !!currentPlant?.isOfficial)
        : false;
    const isRomPlant = !!currentPlant?.isOfficial;

    // Review form
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewBody, setReviewBody] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Comment form
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // Inline expand state
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);

    // ── Load plant ────────────────────────────────────────────────
    const loadPlant = useCallback(async () => {
        if (!plantId) return;
        setCurrentPlantLoading(true);
        try {
            const res = await MarketplaceService.getPlantDetail(plantId);
            setCurrentPlant(res.plant);
        } catch (err) {
            console.error('Failed to load plant:', err);
        } finally {
            setCurrentPlantLoading(false);
        }
    }, [plantId]);

    useEffect(() => {
        loadPlant();
        return () => setCurrentPlant(null);
    }, [plantId]);

    // AI-generated description state
    const [aiDescription, setAiDescription] = useState<Record<string, string> | null>(null);
    const [aiDescLoading, setAiDescLoading] = useState(false);

    // ── Load reviews ──────────────────────────────────────────────
    useEffect(() => {
        if (!plantId) return;
        MarketplaceService.getPlantReviews(plantId).then((res) =>
            setCurrentPlantReviews(res.reviews)
        ).catch(console.error);
    }, [plantId]);

    // ── Load comments ─────────────────────────────────────────────
    useEffect(() => {
        if (!plantId) return;
        MarketplaceService.getPlantComments(plantId).then((res) =>
            setCurrentPlantComments(res.comments)
        ).catch(console.error);
    }, [plantId]);

    // ── Auto-generate AI description when missing ─────────────────
    useEffect(() => {
        if (!currentPlant || !plantId) return;
        const enDesc = (currentPlant.descriptionEn || '').trim();
        const hasEn = !!enDesc && !isPlaceholderDescription(currentPlant, enDesc);

        // Check if we have a translation for the current language
        const langDesc = language === 'en'
            ? enDesc
            : (currentPlant.descriptions?.[language] || '').trim();
        const hasLang = !!langDesc && langDesc.length > 50;

        if (hasEn && (language === 'en' || hasLang)) return; // all good
        if (aiDescription || aiDescLoading) return;          // already done / in-flight

        setAiDescLoading(true);

        if (hasEn && !hasLang && language !== 'en') {
            // EN exists but current language translation is missing → translate only
            MarketplaceService.aiTranslateDescription(plantId, language)
                .then((res) => {
                    setAiDescription({ en: enDesc, [language]: res.description });
                    const latest = useMarketplaceStore.getState().currentPlant;
                    if (latest) {
                        setCurrentPlant({
                            ...latest,
                            descriptions: { ...latest.descriptions, [language]: res.description },
                        });
                    }
                })
                .catch((err) => console.warn('AI translation failed:', err))
                .finally(() => setAiDescLoading(false));
        } else {
            // Generate EN + auto-translate to current language
            MarketplaceService.aiGenerateDescription(plantId, language)
                .then((res) => {
                    const translated = (res as Record<string, unknown>)[`description_${language}`] as string || '';
                    setAiDescription({ en: res.descriptionEn, [language]: translated });
                    const latest = useMarketplaceStore.getState().currentPlant;
                    if (latest) {
                        setCurrentPlant({
                            ...latest,
                            descriptionEn: res.descriptionEn || latest.descriptionEn,
                            descriptions: {
                                ...latest.descriptions,
                                en: res.descriptionEn,
                                ...(translated ? { [language]: translated } : {}),
                            },
                        });
                    }
                })
                .catch((err) => console.warn('AI description gen failed:', err))
                .finally(() => setAiDescLoading(false));
        }
    }, [currentPlant?.plantId, language]);

    // ── Install ───────────────────────────────────────────────────
    const handleInstall = async () => {
        if (!plantId || !isAuthenticated) return;
        setInstalling(true);
        try {
            await MarketplaceService.installPlant(plantId);
            // Could show toast
        } catch (err) {
            console.error('Install failed:', err);
        } finally {
            setInstalling(false);
        }
    };

    // ── Sync to device ──────────────────────────────────────────
    const handleSyncToDevice = async () => {
        if (!currentPlant || !isConnected) return;
        setSyncingToDevice(true);
        setSyncSuccess(false);
        try {
            if (devicePlantStatus === 'update_available') {
                await marketplaceDeviceSyncService.updatePlantOnDevice(currentPlant);
            } else {
                await marketplaceDeviceSyncService.syncPlantToDevice(currentPlant);
            }
            setSyncSuccess(true);
            setDevicePlantStatus('synced');
            setTimeout(() => setSyncSuccess(false), 3000);
        } catch (err) {
            console.error('Sync to device failed:', err);
        } finally {
            setSyncingToDevice(false);
        }
    };

    // ── Remove from device ──────────────────────────────────────
    const handleRemoveFromDevice = async () => {
        if (!plantId || !isConnected) return;
        setRemovingFromDevice(true);
        try {
            await marketplaceDeviceSyncService.removePlantFromDevice(plantId);
            setDevicePlantStatus('not_on_device');
        } catch (err) {
            console.error('Remove from device failed:', err);
        } finally {
            setRemovingFromDevice(false);
        }
    };

    // ── Submit review ─────────────────────────────────────────────
    const handleSubmitReview = async () => {
        if (!plantId) return;
        setSubmittingReview(true);
        try {
            await MarketplaceService.createReview(plantId, {
                rating: reviewRating,
                title: reviewTitle,
                body: reviewBody,
            });
            setReviewTitle('');
            setReviewBody('');
            // Reload reviews
            const res = await MarketplaceService.getPlantReviews(plantId);
            setCurrentPlantReviews(res.reviews);
        } catch (err) {
            console.error('Review failed:', err);
        } finally {
            setSubmittingReview(false);
        }
    };

    // ── Submit comment ────────────────────────────────────────────
    const handleSubmitComment = async () => {
        if (!plantId || !commentText.trim()) return;
        setSubmittingComment(true);
        try {
            await MarketplaceService.createComment(plantId, commentText.trim());
            setCommentText('');
            const res = await MarketplaceService.getPlantComments(plantId);
            setCurrentPlantComments(res.comments);
        } catch (err) {
            console.error('Comment failed:', err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const plant = currentPlant;

    if (currentPlantLoading || !plant) {
        return (
            <div className="flex flex-col h-screen bg-mobile-bg-dark text-white">
                <MobileHeader title="" onBack={() => history.goBack()} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    const primaryImage = plant.images.find(i => i.isPrimary) || plant.images[0];
    const localizedPlantName = getLocalizedMarketplacePlantName(plant, language) || plant.scientificName;
    const localizedCategory = translatePlantCategory(plant.category, t);
    const displayTags = (() => {
        const seen = new Set<string>();
        const normalizedCategory = (plant.category || '').trim().toLowerCase();
        const out: string[] = [];

        for (const rawTag of plant.tags || []) {
            const tag = String(rawTag || '').trim();
            if (!tag) continue;
            if (/^PLANT_[A-Z0-9_]+$/.test(tag)) continue;

            const normalized = tag.toLowerCase();
            if (normalized === normalizedCategory) continue;
            if (seen.has(normalized)) continue;
            seen.add(normalized);

            out.push(tag.replace(/_/g, ' '));
        }

        return out;
    })();

    return (
        <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
            <MobileHeader
                title=""
                onBack={() => history.goBack()}
                rightAction={
                    plant.authorUid === user?.uid ? (
                        <button onClick={() => history.push(`/marketplace/plants/${plantId}/edit`)}>
                            <span className="material-symbols-outlined text-mobile-primary">edit</span>
                        </button>
                    ) : undefined
                }
            />

            <main className="flex-1 overflow-y-auto pb-28">
                {/* Image gallery with swipe */}
                <div
                    ref={carouselRef}
                    className="relative aspect-[4/3] bg-mobile-surface-dark overflow-hidden touch-pan-y"
                    onTouchStart={(e) => {
                        touchStartX.current = e.touches[0].clientX;
                        touchDeltaX.current = 0;
                        isSwiping.current = false;
                    }}
                    onTouchMove={(e) => {
                        const delta = e.touches[0].clientX - touchStartX.current;
                        touchDeltaX.current = delta;
                        if (Math.abs(delta) > 15) isSwiping.current = true;
                    }}
                    onTouchEnd={() => {
                        if (!isSwiping.current || !plant.images.length) return;
                        const threshold = 50;
                        if (touchDeltaX.current < -threshold && showImageIndex < plant.images.length - 1) {
                            setShowImageIndex(showImageIndex + 1);
                        } else if (touchDeltaX.current > threshold && showImageIndex > 0) {
                            setShowImageIndex(showImageIndex - 1);
                        }
                        touchDeltaX.current = 0;
                        isSwiping.current = false;
                    }}
                >
                    {plant.images.length > 0 ? (
                        <>
                            <img
                                src={plant.images[showImageIndex]?.url || ''}
                                alt={localizedPlantName}
                                className="w-full h-full object-cover transition-opacity duration-200"
                                onError={(e) => {
                                    // Hide broken external images
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            {/* Navigation arrows */}
                            {plant.images.length > 1 && showImageIndex > 0 && (
                                <button
                                    onClick={() => setShowImageIndex(showImageIndex - 1)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-white text-lg">chevron_left</span>
                                </button>
                            )}
                            {plant.images.length > 1 && showImageIndex < plant.images.length - 1 && (
                                <button
                                    onClick={() => setShowImageIndex(showImageIndex + 1)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-white text-lg">chevron_right</span>
                                </button>
                            )}
                            {/* Dot indicators */}
                            {plant.images.length > 1 && (
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {plant.images.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setShowImageIndex(i)}
                                            className={`w-2 h-2 rounded-full transition-colors ${
                                                i === showImageIndex ? 'bg-mobile-primary' : 'bg-white/40'
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}
                            {/* Image counter */}
                            {plant.images.length > 1 && (
                                <div className="absolute top-3 right-3 bg-black/50 rounded-full px-2 py-0.5">
                                    <span className="text-[10px] text-white/80">
                                        {showImageIndex + 1}/{plant.images.length}
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-6xl text-gray-600">eco</span>
                        </div>
                    )}
                </div>

                {/* Plant info */}
                <div className="px-4 pt-4">
                    <h1 className="text-xl font-bold text-white">
                        {localizedPlantName}
                    </h1>
                    <p className="text-sm text-gray-400 italic mt-0.5">{plant.scientificName}</p>

                    <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1 text-yellow-400">
                            <span className="material-symbols-outlined text-base">star</span>
                            {plant.stats.rating.toFixed(1)} ({plant.stats.ratingCount})
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                            <span className="material-symbols-outlined text-base">download</span>
                            {plant.stats.downloads}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                            <span className="material-symbols-outlined text-base">visibility</span>
                            {plant.stats.views}
                        </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="px-2.5 py-1 rounded-full bg-mobile-primary/10 text-mobile-primary text-xs font-medium">
                            {localizedCategory}
                        </span>
                        {displayTags.map((tag) => (
                            <span key={tag} className="px-2.5 py-1 rounded-full bg-white/5 text-gray-400 text-xs">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-4 mt-4 gap-1 border-b border-white/5">
                    {(['overview', 'guide', 'device'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab
                                    ? 'text-mobile-primary border-mobile-primary'
                                    : 'text-gray-500 border-transparent'
                            }`}
                        >
                            {tab === 'overview'
                                ? t('marketplace.overviewTab')
                                : tab === 'guide'
                                ? t('marketplace.guideTab')
                                : t('marketplace.deviceTab')}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="px-4 pt-4">
                    {/* ─── OVERVIEW TAB ─── */}
                    {activeTab === 'overview' && (
                        <div>
                            {aiDescLoading ? (
                                <div className="flex items-center gap-2 py-2">
                                    <div className="w-4 h-4 border-2 border-mobile-primary/40 border-t-mobile-primary rounded-full animate-spin" />
                                    <span className="text-xs text-gray-500">{t('marketplace.generatingDescription')}</span>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                                    {(() => {
                                        // Priority chain: current language → EN → local fallback
                                        // Never fall back to a random other language (no hardcoded RO)
                                        if (language !== 'en') {
                                            const langDesc = plant.descriptions?.[language] || aiDescription?.[language] || '';
                                            if (langDesc && langDesc.length > 50) return langDesc;
                                        }
                                        const enDesc = plant.descriptions?.en || plant.descriptionEn || aiDescription?.en || '';
                                        if (enDesc && enDesc.length > 50) return enDesc;
                                        return generatePlantDescription(plant);
                                    })()}
                                </p>
                            )}

                            {/* Quick Facts grid */}
                            {plant.plantData && Object.keys(plant.plantData).length > 0 && (() => {
                                const d = plant.plantData as Record<string, unknown>;
                                type FactItem = { icon: string; label: string; value: string; color?: string };
                                const simpleFacts: FactItem[] = [];
                                const advancedFacts: FactItem[] = [];

                                // --- SIMPLE facts (always visible) ---
                                // Growth cycle
                                if (d.growth_cycle) simpleFacts.push({
                                    icon: 'schedule', label: t('marketplace.qfCycle'),
                                    value: String(d.growth_cycle),
                                });
                                // Temperature range
                                if (d.temp_opt_min_c != null && d.temp_opt_max_c != null) simpleFacts.push({
                                    icon: 'thermostat', label: t('marketplace.qfTemp'),
                                    value: `${d.temp_opt_min_c}–${d.temp_opt_max_c}°C`,
                                });
                                // Water needs (from Kc mid)
                                if (d.kc_mid != null) {
                                    const kc = typeof d.kc_mid === 'number' ? d.kc_mid : parseFloat(String(d.kc_mid));
                                    const level = kc > 1.0
                                        ? t('marketplace.qfWaterHigh')
                                        : kc > 0.7
                                            ? t('marketplace.qfWaterMedium')
                                            : t('marketplace.qfWaterLow');
                                    simpleFacts.push({ icon: 'water_drop', label: t('marketplace.qfWater'), value: level, color: 'text-blue-300' });
                                }
                                // Indoor
                                if (d.indoor_ok != null) simpleFacts.push({
                                    icon: d.indoor_ok ? 'home' : 'park', label: t('marketplace.qfIndoor'),
                                    value: d.indoor_ok ? t('common.yes') : t('common.no'),
                                });
                                // Primary use
                                if (d.primary_use) simpleFacts.push({
                                    icon: 'category', label: t('marketplace.qfUse'),
                                    value: String(d.primary_use).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                                });
                                // Irrigation
                                if (d.typ_irrig_method) simpleFacts.push({
                                    icon: 'water', label: t('marketplace.qfIrrigation'),
                                    value: String(d.typ_irrig_method).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                                });

                                // --- ADVANCED facts (only in advanced mode) ---
                                // Frost tolerance
                                if (d.frost_tolerance_c != null) advancedFacts.push({
                                    icon: 'ac_unit', label: t('marketplace.qfFrost'),
                                    value: `${d.frost_tolerance_c}°C`, color: 'text-blue-400',
                                });
                                // pH range
                                if (d.ph_min != null && d.ph_max != null) advancedFacts.push({
                                    icon: 'science', label: 'pH',
                                    value: `${d.ph_min} – ${d.ph_max}`,
                                });
                                // Kc values (FAO-56)
                                if (d.kc_ini != null || d.kc_mid != null || d.kc_end != null) {
                                    const parts: string[] = [];
                                    if (d.kc_ini != null) parts.push(`ini ${d.kc_ini}`);
                                    if (d.kc_mid != null) parts.push(`mid ${d.kc_mid}`);
                                    if (d.kc_end != null) parts.push(`end ${d.kc_end}`);
                                    advancedFacts.push({
                                        icon: 'analytics', label: 'Kc (FAO-56)',
                                        value: parts.join(' / '), color: 'text-amber-400',
                                    });
                                }

                                if (simpleFacts.length === 0 && advancedFacts.length === 0) return null;

                                const renderFactGrid = (items: FactItem[]) => (
                                    <div className="grid grid-cols-2 gap-2">
                                        {items.map((fact, i) => (
                                            <div key={i} className="bg-mobile-surface-dark rounded-xl px-3 py-2.5 border border-white/5 flex items-center gap-2">
                                                <span className={`material-symbols-outlined text-base ${fact.color || 'text-mobile-primary'}`}>
                                                    {fact.icon}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-gray-500 leading-tight">{fact.label}</p>
                                                    <p className="text-xs text-white font-medium truncate">{fact.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );

                                return (
                                    <div className="mt-4">
                                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-mobile-primary text-base">fact_check</span>
                                            {t('marketplace.quickFacts')}
                                        </h3>
                                        {simpleFacts.length > 0 && renderFactGrid(simpleFacts)}
                                        {advancedMode && advancedFacts.length > 0 && (
                                            <AdvancedSection title={t('marketplace.technicalDetails')} subtitle={t('marketplace.technicalDetailsDesc')} defaultOpen={true}>
                                                {renderFactGrid(advancedFacts)}
                                            </AdvancedSection>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Chat button */}
                            <button
                                onClick={() => history.push(`/marketplace/plants/${plantId}/chat`)}
                                className="mt-6 w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-mobile-primary/20 to-emerald-500/10 border border-mobile-primary/30"
                            >
                                <span className="material-symbols-outlined text-mobile-primary">smart_toy</span>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-white">
                                        {t('marketplace.askAi')}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {t('marketplace.askAiSubtitle')}
                                    </p>
                                </div>
                            </button>

                            {/* Inline Reviews (collapsed) */}
                            {currentPlantReviews.length > 0 && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-white">
                                            {t('marketplace.reviews')} ({currentPlantReviews.length})
                                        </h3>
                                        {currentPlantReviews.length > 2 && (
                                            <button
                                                onClick={() => setShowAllReviews(!showAllReviews)}
                                                className="text-xs text-mobile-primary"
                                            >
                                                {showAllReviews ? t('common.showLess') : t('common.showAll')}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {(showAllReviews ? currentPlantReviews : currentPlantReviews.slice(0, 2)).map((review) => (
                                            <div
                                                key={review.reviewId}
                                                className="bg-mobile-surface-dark rounded-xl p-3 border border-white/5"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <span
                                                                key={s}
                                                                className={`material-symbols-outlined text-xs ${
                                                                    s <= review.rating ? 'text-yellow-400' : 'text-gray-600'
                                                                }`}
                                                            >
                                                                star
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] text-gray-500">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {review.title && (
                                                    <p className="text-xs font-medium text-white">{review.title}</p>
                                                )}
                                                {review.body && (
                                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{review.body}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Write review */}
                                    {isAuthenticated && plant.authorUid !== user?.uid && (
                                        <div className="bg-mobile-surface-dark rounded-xl p-4 border border-white/5 mt-3">
                                            <p className="text-sm font-medium text-white mb-2">
                                                {t('marketplace.writeReview')}
                                            </p>
                                            <div className="flex gap-1 mb-3">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button key={star} onClick={() => setReviewRating(star)} className="p-0.5">
                                                        <span
                                                            className={`material-symbols-outlined text-2xl ${
                                                                star <= reviewRating ? 'text-yellow-400' : 'text-gray-600'
                                                            }`}
                                                        >
                                                            star
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={reviewTitle}
                                                onChange={(e) => setReviewTitle(e.target.value)}
                                                placeholder={t('marketplace.reviewTitle')}
                                                className="w-full bg-mobile-bg-dark rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 mb-2 border border-white/5"
                                            />
                                            <textarea
                                                value={reviewBody}
                                                onChange={(e) => setReviewBody(e.target.value)}
                                                placeholder={t('marketplace.reviewBody')}
                                                rows={3}
                                                className="w-full bg-mobile-bg-dark rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-white/5 resize-none"
                                            />
                                            <button
                                                onClick={handleSubmitReview}
                                                disabled={submittingReview}
                                                className="mt-2 px-4 py-2 rounded-lg bg-mobile-primary text-black text-sm font-medium disabled:opacity-50"
                                            >
                                                {submittingReview ? t('common.loading') : t('marketplace.submitReview')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Inline Comments (collapsed) */}
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-white">
                                        {t('marketplace.comments')} ({currentPlantComments.length})
                                    </h3>
                                    {currentPlantComments.length > 3 && (
                                        <button
                                            onClick={() => setShowAllComments(!showAllComments)}
                                            className="text-xs text-mobile-primary"
                                        >
                                            {showAllComments ? t('common.showLess') : t('common.showAll')}
                                        </button>
                                    )}
                                </div>

                                {/* Comment input */}
                                {isAuthenticated && (
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder={t('marketplace.writeComment')}
                                            className="flex-1 bg-mobile-surface-dark rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 border border-white/5"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmitComment();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleSubmitComment}
                                            disabled={submittingComment || !commentText.trim()}
                                            className="px-3 py-2.5 rounded-xl bg-mobile-primary text-black disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-xl">send</span>
                                        </button>
                                    </div>
                                )}

                                {currentPlantComments.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">
                                        {t('marketplace.noComments')}
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {(showAllComments ? currentPlantComments : currentPlantComments.slice(0, 3)).map((comment) => (
                                            <div
                                                key={comment.commentId}
                                                className={`bg-mobile-surface-dark rounded-xl p-3 border border-white/5 ${
                                                    comment.parentId ? 'ml-8' : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] text-gray-500">
                                                        {new Date(comment.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-300">{comment.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── GUIDE TAB ─── */}
                    {activeTab === 'guide' && (
                        <PlantGrowingGuide
                            plantData={plant.plantData}
                            careGuide={plant.careGuide}
                        />
                    )}

                    {/* ─── DEVICE TAB ─── */}
                    {activeTab === 'device' && (
                        <div>
                            {!isConnected && !isOnDevice && (
                                <div className="flex flex-col items-center py-10 text-center">
                                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">bluetooth_disabled</span>
                                    <p className="text-sm text-gray-400">{t('marketplace.deviceOffline')}</p>
                                </div>
                            )}

                            {!isConnected && isOnDevice && (
                                <div className="bg-mobile-surface-dark rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-2xl text-mobile-primary">check_circle</span>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('marketplace.synced')}</p>
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <span className="material-symbols-outlined text-xs text-amber-400">cloud_off</span>
                                                {t('marketplace.deviceOffline')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-mobile-bg-dark rounded-xl p-3">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('marketplace.devicePlantId')}</p>
                                            <p className="text-sm text-white mt-0.5 font-mono">#{devicePlantMap[plantId!]}</p>
                                        </div>
                                        <div className="bg-mobile-bg-dark rounded-xl p-3">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('marketplace.deviceVersion')}</p>
                                            <p className="text-sm text-white mt-0.5">v{plant.version ?? 1}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 text-center mt-4">
                                        {t('marketplace.connectToManage')}
                                    </p>
                                </div>
                            )}

                            {isConnected && !isOnDevice && (
                                <div className="flex flex-col items-center py-8">
                                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-4">bluetooth_searching</span>
                                    <p className="text-sm text-gray-400 mb-6 text-center">
                                        {t('marketplace.notOnDevice')}
                                    </p>
                                    <button
                                        onClick={handleSyncToDevice}
                                        disabled={syncingToDevice}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-mobile-primary text-black font-medium disabled:opacity-60"
                                    >
                                        {syncingToDevice ? (
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-xl">bluetooth_searching</span>
                                                {t('marketplace.syncToDevice')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {isConnected && isOnDevice && isRomPlant && (
                                <div className="bg-mobile-surface-dark rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-2xl text-mobile-primary">memory</span>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('marketplace.builtInPlant')}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {t('marketplace.builtInPlantDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-mobile-bg-dark rounded-xl p-3">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('marketplace.romPlantId')}</p>
                                            <p className="text-sm text-white mt-0.5 font-mono">#{currentPlant?.romPlantId ?? '—'}</p>
                                        </div>
                                        <div className="bg-mobile-bg-dark rounded-xl p-3">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('marketplace.deviceVersion')}</p>
                                            <p className="text-sm text-white mt-0.5">v{plant.version ?? 1}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isConnected && isOnDevice && !isRomPlant && (
                                <div className="bg-mobile-surface-dark rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-2xl text-mobile-primary">bluetooth_connected</span>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t('marketplace.synced')}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {devicePlantStatus === 'update_available'
                                                    ? t('marketplace.updateAvailable')
                                                    : t('marketplace.upToDate')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-mobile-bg-dark rounded-xl p-3">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('marketplace.devicePlantId')}</p>
                                            <p className="text-sm text-white mt-0.5 font-mono">#{devicePlantMap[plantId!]}</p>
                                        </div>
                                        <div className="bg-mobile-bg-dark rounded-xl p-3">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('marketplace.deviceVersion')}</p>
                                            <p className="text-sm text-white mt-0.5">v{plant.version ?? 1}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {devicePlantStatus === 'update_available' && (
                                            <button
                                                onClick={handleSyncToDevice}
                                                disabled={syncingToDevice}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 font-medium disabled:opacity-60"
                                            >
                                                {syncingToDevice ? (
                                                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-xl">system_update_alt</span>
                                                        {t('marketplace.updateOnDevice')}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleRemoveFromDevice}
                                            disabled={removingFromDevice}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-medium disabled:opacity-60"
                                        >
                                            {removingFromDevice ? (
                                                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-xl">delete_outline</span>
                                                    {t('marketplace.removeFromDevice')}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {syncSuccess && (
                                        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-mobile-primary/10 border border-mobile-primary/30">
                                            <span className="material-symbols-outlined text-mobile-primary text-base">check</span>
                                            <p className="text-xs text-mobile-primary">{t('marketplace.synced')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom action bar – install / status */}
            {isOnDevice ? (
                <div className="fixed bottom-0 left-0 right-0 bg-mobile-surface-dark/95 backdrop-blur border-t border-white/5 p-4 pb-safe">
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-mobile-primary/10 border border-mobile-primary/30">
                        <span className="material-symbols-outlined text-mobile-primary text-xl">check_circle</span>
                        <span className="text-sm font-medium text-mobile-primary">
                            {isRomPlant ? t('marketplace.builtInPlant') : t('marketplace.onDevice')}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="fixed bottom-0 left-0 right-0 bg-mobile-surface-dark/95 backdrop-blur border-t border-white/5 p-4 pb-safe">
                    <button
                        onClick={handleInstall}
                        disabled={installing || !isAuthenticated}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-mobile-primary text-black font-medium disabled:opacity-50"
                    >
                        {installing ? (
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">download</span>
                                {t('marketplace.install')}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MobilePlantDetail;
