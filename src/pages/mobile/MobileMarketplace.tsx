import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import { useAppStore } from '../../store/useAppStore';
import * as MarketplaceService from '../../services/MarketplaceService';
import { PLANT_CATEGORIES } from '../../types/marketplace';
import { PLANT_ID_RANGES } from '../../types/firmware_structs';
import MobileHeader from '../../components/mobile/MobileHeader';
import { marketplaceDeviceSyncService } from '../../services/marketplaceDeviceSync';
import { getLocalizedMarketplacePlantName } from '../../utils/plantNameHelpers';
import { translatePlantCategory } from '../../utils/i18nHelpers';

type DeviceFilter = 'all' | 'on_device' | 'not_installed';

const MobileMarketplace: React.FC = () => {
    const history = useHistory();
    const { t, language } = useI18n();
    const { isAuthenticated } = useAuth();
    const {
        plants,
        plantsNextToken,
        plantsLoading,
        plantsCategory,
        plantsSort,
        plantsSearch,
        packs,
        packsLoading,
        setPlants,
        appendPlants,
        setPlantsLoading,
        setPlantsCategory,
        setPlantsSort,
        setPlantsSearch,
        setPacks,
        setPacksLoading,
    } = useMarketplaceStore();

    const { connectionState } = useAppStore();
    const { devicePlantMap } = useMarketplaceStore();
    const isConnected = connectionState === 'connected';
    const getPlantName = useCallback(
        (plant: typeof plants[number]) => getLocalizedMarketplacePlantName(plant, language),
        [language],
    );
    const getPackName = useCallback(
        (pack: typeof packs[number]) => (
            language === 'ro'
                ? (pack.nameRo || pack.nameEn)
                : (pack.nameEn || pack.nameRo)
        ),
        [language],
    );
    const getCategoryLabel = useCallback((category: string) => translatePlantCategory(category, t), [t]);

    const [searchInput, setSearchInput] = useState(plantsSearch);
    const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all');
    const reconciledRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLElement>(null);

    // ── Load plants ───────────────────────────────────────────────
    const loadPlants = useCallback(async (reset = false) => {
        setPlantsLoading(true);
        try {
            const res = await MarketplaceService.browsePlants({
                category: plantsCategory || undefined,
                sort: plantsSort,
                search: plantsSearch || undefined,
                locale: language,
                limit: 20,
                nextToken: reset ? undefined : plantsNextToken || undefined,
            });
            if (reset) {
                setPlants(res.plants, res.nextToken);
            } else {
                appendPlants(res.plants, res.nextToken);
            }
        } catch (err) {
            console.error('Failed to load plants:', err);
        } finally {
            setPlantsLoading(false);
        }
    }, [plantsCategory, plantsSort, plantsSearch, plantsNextToken, language]);

    useEffect(() => {
        loadPlants(true);
    }, [plantsCategory, plantsSort, plantsSearch, language]);

    // ── Load packs (for inline collections section) ──────────────
    const loadPacks = useCallback(async () => {
        setPacksLoading(true);
        try {
            const res = await MarketplaceService.browsePacks({ limit: 6 });
            setPacks(res.packs, res.nextToken);
        } catch (err) {
            console.error('Failed to load packs:', err);
        } finally {
            setPacksLoading(false);
        }
    }, []);

    useEffect(() => {
        if (packs.length === 0) loadPacks();
    }, []);

    // ── Search debounce ───────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            setPlantsSearch(searchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Warm client-side search expansion cache for repeated queries.
    useEffect(() => {
        const query = searchInput.trim();
        if (!query) return;

        const timer = setTimeout(() => {
            MarketplaceService.expandMarketplaceSearch(query, language).catch(() => {
                // Keep browse responsive even if expansion endpoint fails.
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [searchInput, language]);

    // ── Reconcile device map silently when connected ─────────────
    // Per BLE docs: only reconcile CUSTOM plants (≥224) via CRC16.
    // ROM plants (1-223) are always on-device; identified via isOfficial flag.
    useEffect(() => {
        if (!isConnected || plants.length === 0 || reconciledRef.current) return;
        reconciledRef.current = true;

        const abortController = new AbortController();
        const cloudIds = plants.map((p) => p.plantId);
        marketplaceDeviceSyncService
            .reconcileDeviceMap(cloudIds, abortController.signal)
            .catch((err) => {
                if (!abortController.signal.aborted) {
                    console.warn('[Marketplace] Reconcile failed:', err);
                }
            });

        return () => {
            abortController.abort();
        };
    }, [isConnected, plants.length > 0]);

    // ── Infinite scroll: prefetch when approaching bottom ────────
    useEffect(() => {
        const sentinel = sentinelRef.current;
        const root = scrollContainerRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry?.isIntersecting) {
                    const { plantsNextToken: token, plantsLoading: loading } =
                        useMarketplaceStore.getState();
                    if (token && !loading) {
                        loadPlants(false);
                    }
                }
            },
            {
                root: root || null,
                // Trigger 400px before the sentinel enters the viewport
                rootMargin: '0px 0px 400px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadPlants]);

    // ── Helper: is a plant on the device? ───────────────────────
    // ROM/official plants (isOfficial) → always on device when connected
    // Custom marketplace plants → check devicePlantMap (synced via CRC16)
    const isPlantOnDevice = useCallback(
        (p: typeof plants[0]) => {
            if (isConnected && p.isOfficial) return true;
            return p.plantId in devicePlantMap;
        },
        [isConnected, devicePlantMap]
    );

    // ── Apply device filter on top of server-filtered plants ────
    const displayPlants = useMemo(() => {
        if (deviceFilter === 'all') return plants;
        if (deviceFilter === 'on_device') return plants.filter(isPlantOnDevice);
        return plants.filter((p) => !isPlantOnDevice(p));
    }, [plants, devicePlantMap, deviceFilter, isPlantOnDevice]);

    // Count: all 223 ROM plants (when connected) + custom plants in devicePlantMap
    // This is independent of how many pages are loaded, so the badge is always correct.
    const installedCount = useMemo(() => {
        const romCount = isConnected ? PLANT_ID_RANGES.ROM_MAX : 0;
        const customCount = Object.keys(devicePlantMap).length;
        return romCount + customCount;
    }, [isConnected, devicePlantMap]);

    return (
        <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
            {/* Header */}
            <MobileHeader
                title={t('marketplace.title')}
                rightAction={
                    isAuthenticated ? (
                        <button
                            onClick={() => history.push('/marketplace/library')}
                            className="p-2"
                        >
                            <span className="material-symbols-outlined text-mobile-primary text-2xl">
                                local_library
                            </span>
                        </button>
                    ) : undefined
                }
            />

            {/* Search bar */}
            <div className="px-4 pb-3">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                        search
                    </span>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={t('marketplace.searchPlaceholder')}
                        className="w-full bg-mobile-surface-dark rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 border border-white/5 focus:border-mobile-primary/40 focus:outline-none"
                    />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}
                </div>

                {/* AI Search button */}
                <button
                    onClick={() => history.push('/marketplace/ai-search')}
                    className="mt-2 w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-mobile-primary/20 to-emerald-500/10 border border-mobile-primary/30 text-mobile-primary text-sm"
                >
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    {t('marketplace.aiSearch')}
                </button>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setPlantsCategory('')}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        !plantsCategory
                            ? 'bg-mobile-primary text-black'
                            : 'bg-mobile-surface-dark text-gray-400 border border-white/10'
                    }`}
                >
                    {t('marketplace.allCategories')}
                </button>
                {PLANT_CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setPlantsCategory(cat)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            plantsCategory === cat
                                ? 'bg-mobile-primary text-black'
                                : 'bg-mobile-surface-dark text-gray-400 border border-white/10'
                        }`}
                    >
                        {getCategoryLabel(cat)}
                    </button>
                ))}
            </div>

            {/* Device filter chips */}
            <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
                {([
                    { key: 'all' as const, label: t('marketplace.filterAll'), icon: null },
                    { key: 'on_device' as const, label: t('marketplace.filterOnDevice'), icon: 'bluetooth_connected' },
                    { key: 'not_installed' as const, label: t('marketplace.filterNotInstalled'), icon: null },
                ] as const).map(({ key, label, icon }) => (
                    <button
                        key={key}
                        onClick={() => setDeviceFilter(key)}
                        className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            deviceFilter === key
                                ? 'bg-white/15 text-white border border-white/20'
                                : 'text-gray-500 border border-transparent'
                        }`}
                    >
                        {icon && <span className="material-symbols-outlined text-xs">{icon}</span>}
                        {label}
                        {key === 'on_device' && installedCount > 0 && (
                            <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${
                                deviceFilter === 'on_device'
                                    ? 'bg-mobile-primary/30 text-mobile-primary'
                                    : 'bg-white/10 text-gray-400'
                            }`}>
                                {installedCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Sort bar */}
            <div className="flex gap-2 px-4 pb-3">
                {(['newest', 'top_rated', 'most_downloaded'] as const).map((sort) => (
                    <button
                        key={sort}
                        onClick={() => setPlantsSort(sort)}
                        className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                            plantsSort === sort
                                ? 'text-white bg-white/10'
                                : 'text-gray-500'
                        }`}
                    >
                        {sort === 'newest'
                            ? t('marketplace.sortNewest')
                            : sort === 'top_rated'
                            ? t('marketplace.sortTopRated')
                            : t('marketplace.sortPopular')}
                    </button>
                ))}
            </div>

            {/* Content */}
            <main ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pb-24">
                {/* Collections (packs) section */}
                {packs.length > 0 && !plantsSearch && deviceFilter === 'all' && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-white">{t('marketplace.collections')}</h3>
                        </div>
                        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                            {packs.map((pack) => (
                                <button
                                    key={pack.packId}
                                    onClick={() => history.push(`/marketplace/packs/${pack.packId}`)}
                                    className="shrink-0 w-36 bg-mobile-surface-dark rounded-xl border border-white/5 p-3 text-left transition-transform active:scale-95"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-mobile-primary/10 flex items-center justify-center mb-2">
                                        <span className="material-symbols-outlined text-mobile-primary text-xl">
                                            inventory_2
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-white truncate">
                                        {getPackName(pack)}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        {pack.plantCount} {t('marketplace.plantsCount')}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Plants grid */}
                {plantsLoading && plants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="w-8 h-8 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin mb-3" />
                        {t('common.loading')}
                    </div>
                ) : displayPlants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <span className="material-symbols-outlined text-5xl mb-3">
                            {deviceFilter === 'on_device' ? 'smartphone' : 'eco'}
                        </span>
                        <p className="text-sm">
                            {deviceFilter === 'on_device'
                                ? t('marketplace.noDevicePlants')
                                : t('marketplace.noPlants')}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            {displayPlants.map((plant) => {
                                const onDevice = isPlantOnDevice(plant);
                                return (
                                    <button
                                        key={plant.plantId}
                                        onClick={() => history.push(`/marketplace/plants/${plant.plantId}`)}
                                        className="bg-mobile-surface-dark rounded-2xl border border-white/5 overflow-hidden text-left transition-transform active:scale-95"
                                    >
                                        {/* Image */}
                                        <div className="aspect-square bg-mobile-bg-dark flex items-center justify-center relative">
                                            {plant.primaryImage?.url ? (
                                                <img
                                                    src={plant.primaryImage.url}
                                                    alt={getPlantName(plant) || plant.scientificName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="material-symbols-outlined text-4xl text-gray-600">
                                                    eco
                                                </span>
                                            )}
                                            {/* Installed checkmark */}
                                            {onDevice && (
                                                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
                                                    <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                                                        <span className="material-symbols-outlined text-base text-mobile-primary">
                                                            check_circle
                                                        </span>
                                                    </div>
                                                    {!isConnected && (
                                                        <div className="w-4 h-4 rounded-full bg-black/60 flex items-center justify-center -ml-1.5 -mt-3">
                                                            <span className="material-symbols-outlined text-[10px] text-gray-400">
                                                                cloud_off
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div className="p-3">
                                            <p className="text-sm font-medium text-white truncate">
                                                {getPlantName(plant) || plant.scientificName}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate italic">
                                                {plant.scientificName}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                                <span className="flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-yellow-400 text-sm">
                                                        star
                                                    </span>
                                                    {plant.stats.rating.toFixed(1)}
                                                </span>
                                                <span className="flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-sm">
                                                        download
                                                    </span>
                                                    {plant.stats.downloads}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {/* Infinite scroll sentinel */}
                        <div ref={sentinelRef} className="h-1" />
                        {plantsNextToken && plantsLoading && (
                            <div className="flex justify-center py-4">
                                <div className="w-6 h-6 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* FAB: Create Plant */}
            {isAuthenticated && (
                <button
                    onClick={() => history.push('/marketplace/plants/new/edit')}
                    className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-mobile-primary text-black flex items-center justify-center shadow-lg shadow-mobile-primary/30 active:scale-90 transition-transform"
                >
                    <span className="material-symbols-outlined text-2xl">add</span>
                </button>
            )}
        </div>
    );
};

export default MobileMarketplace;
