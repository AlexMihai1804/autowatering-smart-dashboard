import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import { useAppStore } from '../../store/useAppStore';
import * as MarketplaceService from '../../services/MarketplaceService';
import { marketplaceDeviceSyncService } from '../../services/marketplaceDeviceSync';
import { isRomPlant, isCustomPlant, PLANT_ID_RANGES } from '../../types/firmware_structs';
import MobileHeader from '../../components/mobile/MobileHeader';

type TabType = 'library' | 'device';

const MobileMyLibrary: React.FC = () => {
    const history = useHistory();
    const location = useLocation();
    const { t } = useI18n();
    const { isAuthenticated } = useAuth();
    const {
        library,
        libraryLoading,
        setLibrary,
        setLibraryLoading,
        removeFromLibrary,
        syncingPlantIds,
        devicePlantMap,
    } = useMarketplaceStore();
    const { connectionState, customPlants, packStats } = useAppStore();
    const isConnected = connectionState === 'connected';

    // Parse ?tab=device from URL (e.g. when redirected from device settings)
    const params = new URLSearchParams(location.search);
    const initialTab = (params.get('tab') as TabType) || 'library';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    const [removingId, setRemovingId] = useState<string | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);

    const loadLibrary = useCallback(async () => {
        setLibraryLoading(true);
        try {
            const res = await MarketplaceService.getUserLibrary();
            setLibrary(res.library);
        } catch (err) {
            console.error('Failed to load library:', err);
        } finally {
            setLibraryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) loadLibrary();
    }, [isAuthenticated]);

    const handleRemove = async (plantId: string) => {
        setRemovingId(plantId);
        try {
            await MarketplaceService.removePlantFromLibrary(plantId);
            removeFromLibrary(plantId);
        } catch (err) {
            console.error('Remove failed:', err);
        } finally {
            setRemovingId(null);
        }
    };

    const handleSyncToDevice = async (plantId: string) => {
        if (!isConnected) return;
        setSyncingId(plantId);
        try {
            const plant = await MarketplaceService.getPlantDetail(plantId);
            await marketplaceDeviceSyncService.syncPlantToDevice(plant.plant);
            setSuccessId(plantId);
            setTimeout(() => setSuccessId(null), 2000);
        } catch (err) {
            console.error('Sync to device failed:', err);
        } finally {
            setSyncingId(null);
        }
    };

    const handleRemoveFromDevice = async (plantId: string) => {
        try {
            await marketplaceDeviceSyncService.removePlantFromDevice(plantId);
        } catch (err) {
            console.error('Remove from device failed:', err);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col h-screen bg-mobile-bg-dark text-white">
                <MobileHeader
                    title={t('marketplace.myLibrary')}
                    onBack={() => history.goBack()}
                />
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                    <span className="material-symbols-outlined text-5xl text-gray-500 mb-4">lock</span>
                    <p className="text-gray-400 text-sm">
                        {t('marketplace.signInRequired')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
            <MobileHeader
                title={t('marketplace.myLibrary')}
                onBack={() => history.goBack()}
                rightAction={
                    <button onClick={() => history.push('/marketplace/my-plants')}>
                        <span className="material-symbols-outlined text-mobile-primary">edit_note</span>
                    </button>
                }
            />

            {/* Tab Switcher */}
            <div className="flex px-4 gap-2 mb-3">
                <button
                    onClick={() => setActiveTab('library')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'library'
                            ? 'bg-mobile-primary/20 text-mobile-primary border border-mobile-primary/40'
                            : 'bg-mobile-surface-dark text-gray-400 border border-white/5'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm align-middle mr-1">local_library</span>
                    {t('marketplace.libraryTab')}
                </button>
                <button
                    onClick={() => setActiveTab('device')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'device'
                            ? 'bg-mobile-primary/20 text-mobile-primary border border-mobile-primary/40'
                            : 'bg-mobile-surface-dark text-gray-400 border border-white/5'
                    }`}
                >
                    <span className="material-symbols-outlined text-sm align-middle mr-1">bluetooth</span>
                    {t('marketplace.onDeviceTab')}
                    {customPlants.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-mobile-primary/20 text-mobile-primary text-[10px] font-bold">
                            {customPlants.length}
                        </span>
                    )}
                </button>
            </div>

            <main className="flex-1 overflow-y-auto px-4 pb-24">
                {activeTab === 'library' ? (
                    <LibraryTabContent
                        library={library}
                        libraryLoading={libraryLoading}
                        isConnected={isConnected}
                        syncingPlantIds={syncingPlantIds}
                        syncingId={syncingId}
                        successId={successId}
                        removingId={removingId}
                        devicePlantMap={devicePlantMap}
                        t={t}
                        history={history}
                        onSyncToDevice={handleSyncToDevice}
                        onRemove={handleRemove}
                        onRemoveFromDevice={handleRemoveFromDevice}
                    />
                ) : (
                    <DeviceTabContent
                        isConnected={isConnected}
                        customPlants={customPlants}
                        packStats={packStats}
                        t={t}
                        history={history}
                    />
                )}
            </main>
        </div>
    );
};

// ── Library Tab ────────────────────────────────────────────────────────

interface LibraryTabProps {
    library: ReturnType<typeof useMarketplaceStore.getState>['library'];
    libraryLoading: boolean;
    isConnected: boolean;
    syncingPlantIds: string[];
    syncingId: string | null;
    successId: string | null;
    removingId: string | null;
    devicePlantMap: Record<string, number>;
    t: (key: string) => string;
    history: ReturnType<typeof useHistory>;
    onSyncToDevice: (plantId: string) => void;
    onRemove: (plantId: string) => void;
    onRemoveFromDevice: (plantId: string) => void;
}

const LibraryTabContent: React.FC<LibraryTabProps> = ({
    library,
    libraryLoading,
    isConnected,
    syncingPlantIds,
    syncingId,
    successId,
    removingId,
    devicePlantMap,
    t,
    history,
    onSyncToDevice,
    onRemove,
    onRemoveFromDevice,
}) => {
    if (libraryLoading && library.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <div className="w-8 h-8 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin mb-3" />
                {t('common.loading')}
            </div>
        );
    }

    if (library.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <span className="material-symbols-outlined text-5xl mb-3">local_library</span>
                <p className="text-sm mb-4">{t('marketplace.emptyLibrary')}</p>
                <button
                    onClick={() => history.push('/marketplace')}
                    className="px-6 py-2.5 rounded-xl bg-mobile-primary text-black text-sm font-medium"
                >
                    {t('marketplace.browseMarketplace')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs text-gray-500 mb-1">
                {library.length} {t('marketplace.plantsInLibrary')}
            </p>
            {library.map((plant) => {
                const isOnDevice = plant.plantId in devicePlantMap;
                const isSyncing =
                    syncingId === plant.plantId || syncingPlantIds.includes(plant.plantId);
                const justSynced = successId === plant.plantId;

                return (
                    <div
                        key={plant.plantId}
                        className="bg-mobile-surface-dark rounded-xl border border-white/5 p-3 flex items-center gap-3"
                    >
                        {/* Thumbnail */}
                        <button
                            onClick={() => history.push(`/marketplace/plants/${plant.plantId}`)}
                            className="w-14 h-14 rounded-xl bg-mobile-bg-dark overflow-hidden shrink-0"
                        >
                            {plant.primaryImage?.url ? (
                                <img src={plant.primaryImage.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl text-gray-600">eco</span>
                                </div>
                            )}
                        </button>

                        {/* Info */}
                        <button
                            onClick={() => history.push(`/marketplace/plants/${plant.plantId}`)}
                            className="flex-1 min-w-0 text-left"
                        >
                            <p className="text-sm font-medium text-white truncate">
                                {plant.commonNameEn || plant.scientificName}
                            </p>
                            <p className="text-xs text-gray-500 italic truncate">{plant.scientificName}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                                {isOnDevice || plant.syncedToDevice ? (
                                    <span className="text-mobile-primary flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-xs">bluetooth_connected</span>
                                        {t('marketplace.synced')}
                                    </span>
                                ) : (
                                    <span className="text-gray-500">
                                        {t('marketplace.notSynced')}
                                    </span>
                                )}
                            </div>
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            {/* Sync to device / remove from device button */}
                            {isConnected && (
                                isOnDevice || plant.syncedToDevice ? (
                                    <button
                                        onClick={() => onRemoveFromDevice(plant.plantId)}
                                        className="p-2 text-mobile-primary hover:text-orange-400 transition-colors"
                                        title={t('marketplace.removeFromDevice')}
                                    >
                                        <span className="material-symbols-outlined text-xl">bluetooth_disabled</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onSyncToDevice(plant.plantId)}
                                        disabled={isSyncing}
                                        className="p-2 text-gray-400 hover:text-mobile-primary transition-colors disabled:opacity-40"
                                        title={t('marketplace.syncToDevice')}
                                    >
                                        {isSyncing ? (
                                            <div className="w-5 h-5 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                                        ) : justSynced ? (
                                            <span className="material-symbols-outlined text-xl text-mobile-primary">check_circle</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-xl">bluetooth_searching</span>
                                        )}
                                    </button>
                                )
                            )}

                            {/* Remove from library */}
                            <button
                                onClick={() => onRemove(plant.plantId)}
                                disabled={removingId === plant.plantId}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                            >
                                {removingId === plant.plantId ? (
                                    <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-xl">delete_outline</span>
                                )}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── On Device Tab ──────────────────────────────────────────────────────

interface DeviceTabProps {
    isConnected: boolean;
    customPlants: ReturnType<typeof useAppStore.getState>['customPlants'];
    packStats: ReturnType<typeof useAppStore.getState>['packStats'];
    t: (key: string) => string;
    history: ReturnType<typeof useHistory>;
}

const DeviceTabContent: React.FC<DeviceTabProps> = ({
    isConnected,
    customPlants,
    packStats,
    t,
    history,
}) => {
    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <span className="material-symbols-outlined text-5xl mb-3">bluetooth_disabled</span>
                <p className="text-sm">{t('marketplace.connectDeviceToSync')}</p>
            </div>
        );
    }

    // Storage info
    const usedPercent = packStats
        ? Math.round((packStats.used_bytes / packStats.total_bytes) * 100)
        : 0;

    return (
        <div className="flex flex-col gap-3 mt-2">
            {/* Storage bar */}
            {packStats && (
                <div className="bg-mobile-surface-dark rounded-xl border border-white/5 p-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>
                            {customPlants.length} {t('marketplace.devicePlantsCount')}
                        </span>
                        <span>{t('marketplace.storageUsed').replace('{percent}', String(usedPercent))}</span>
                    </div>
                    <div className="w-full h-1.5 bg-mobile-bg-dark rounded-full overflow-hidden">
                        <div
                            className="h-full bg-mobile-primary rounded-full transition-all"
                            style={{ width: `${usedPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {customPlants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <span className="material-symbols-outlined text-5xl mb-3">memory</span>
                    <p className="text-sm mb-4">{t('marketplace.noDevicePlants')}</p>
                    <button
                        onClick={() => history.push('/marketplace')}
                        className="px-6 py-2.5 rounded-xl bg-mobile-primary text-black text-sm font-medium"
                    >
                        {t('marketplace.browseMarketplace')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {customPlants.map((plant) => {
                        const isRom = isRomPlant(plant.plant_id);
                        const isCustom = isCustomPlant(plant.plant_id);

                        return (
                            <div
                                key={plant.plant_id}
                                className="bg-mobile-surface-dark rounded-xl border border-white/5 p-3 flex items-center gap-3"
                            >
                                {/* Icon based on type */}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                    isRom ? 'bg-blue-500/10' : 'bg-mobile-primary/10'
                                }`}>
                                    <span className={`material-symbols-outlined text-xl ${
                                        isRom ? 'text-blue-400' : 'text-mobile-primary'
                                    }`}>
                                        {isRom ? 'verified' : 'eco'}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {plant.name || `Plant #${plant.plant_id}`}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                                        <span className={isRom ? 'text-blue-400' : 'text-mobile-primary'}>
                                            {isRom ? t('marketplace.romPlant') : t('marketplace.customPlant')}
                                        </span>
                                        <span className="text-gray-600">
                                            {t('marketplace.devicePlantId')}: {plant.plant_id}
                                        </span>
                                    </div>
                                </div>

                                {/* Chevron */}
                                <span className="material-symbols-outlined text-gray-600">chevron_right</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create custom plant button */}
            <button
                onClick={() => history.push('/marketplace/plants/new/edit')}
                className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-gray-400 text-sm"
            >
                <span className="material-symbols-outlined text-lg">add</span>
                {t('marketplace.createPlant')}
            </button>
        </div>
    );
};

export default MobileMyLibrary;
