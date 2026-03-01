import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth';
import { useAppStore } from '../../store/useAppStore';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import * as MarketplaceService from '../../services/MarketplaceService';
import { marketplaceDeviceSyncService } from '../../services/marketplaceDeviceSync';
import type { PackDetail, PlantSummary } from '../../types/marketplace';
import MobileHeader from '../../components/mobile/MobileHeader';

const MobilePackDetail: React.FC = () => {
    const { packId } = useParams<{ packId: string }>();
    const history = useHistory();
    const { t } = useI18n();
    const { isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(true);
    const [pack, setPack] = useState<PackDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [installing, setInstalling] = useState(false);
    const [syncingAll, setSyncingAll] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');

    const { connectionState } = useAppStore();
    const { devicePlantMap } = useMarketplaceStore();
    const isConnected = connectionState === 'connected';

    useEffect(() => {
        if (!packId) return;
        setLoading(true);
        MarketplaceService.getPackDetail(packId)
            .then((res) => setPack(res.pack))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [packId]);

    const handleInstallAll = async () => {
        if (!pack) return;
        setInstalling(true);
        try {
            await MarketplaceService.installPackPlants(pack.plantIds);
            // Refresh library count
        } catch (err: any) {
            setError(err.message);
        } finally {
            setInstalling(false);
        }
    };

    const handleSyncAllToDevice = async () => {
        if (!pack || !pack.plants || !isConnected) return;
        setSyncingAll(true);
        try {
            // First install all to library
            await MarketplaceService.installPackPlants(pack.plantIds);
            // Then fetch full plant details and sync to device
            const plantsToSync = [];
            for (const ps of pack.plants) {
                if (!(ps.plantId in devicePlantMap)) {
                    const res = await MarketplaceService.getPlantDetail(ps.plantId);
                    plantsToSync.push(res.plant);
                }
            }
            if (plantsToSync.length > 0) {
                await marketplaceDeviceSyncService.syncMultiplePlantsToDevice(
                    plantsToSync,
                    (done, total) => setSyncProgress(`${done}/${total}`)
                );
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSyncingAll(false);
            setSyncProgress('');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen bg-mobile-bg-dark text-white">
                <MobileHeader title="" onBack={() => history.goBack()} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!pack) {
        return (
            <div className="flex flex-col h-screen bg-mobile-bg-dark text-white">
                <MobileHeader title="" onBack={() => history.goBack()} />
                <div className="flex-1 flex items-center justify-center px-8">
                    <p className="text-gray-400">{error || t('marketplace.packNotFound')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
            <MobileHeader
                title={pack.nameEn}
                onBack={() => history.goBack()}
            />

            <main className="flex-1 overflow-y-auto pb-28">
                {/* Cover image */}
                {pack.coverImageKey && (
                    <div className="w-full h-48 bg-mobile-surface-dark flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-mobile-primary/40">image</span>
                    </div>
                )}

                {/* Pack info */}
                <div className="px-4 pt-4 pb-3">
                    <h1 className="text-xl font-bold mb-1">{pack.nameEn}</h1>
                    <p className="text-sm text-gray-400 mb-3">{pack.descriptionEn}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <button
                            onClick={() => history.push(`/marketplace/authors/${pack.authorUid}`)}
                            className="flex items-center gap-1 text-mobile-primary"
                        >
                            <span className="material-symbols-outlined text-sm">person</span>
                            {pack.authorUid}
                        </button>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">eco</span>
                            {pack.plantIds.length} {t('marketplace.plants')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">download</span>
                            {pack.stats.downloads}
                        </span>
                    </div>

                    {/* Tags */}
                    {pack.tags && pack.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {pack.tags.map((tag) => (
                                <span key={tag} className="px-2 py-0.5 bg-mobile-primary/10 text-mobile-primary text-xs rounded-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Plants list */}
                <div className="px-4">
                    <h2 className="text-sm font-semibold text-gray-300 mb-3">
                        {t('marketplace.plantsInPack')}
                    </h2>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3">
                            <p className="text-xs text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        {(pack.plants || []).map((plant: PlantSummary) => (
                            <button
                                key={plant.plantId}
                                onClick={() => history.push(`/marketplace/plants/${plant.plantId}`)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-mobile-surface-dark border border-white/5 hover:border-mobile-primary/20 text-left"
                            >
                                {plant.primaryImage?.url ? (
                                    <img
                                        src={plant.primaryImage?.url}
                                        alt=""
                                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-mobile-primary/10 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-mobile-primary text-xl">eco</span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{plant.commonNameEn || plant.commonNameRo}</p>
                                    <p className="text-xs text-gray-500 truncate italic">{plant.scientificName}</p>
                                </div>
                                <span className="material-symbols-outlined text-gray-500 text-lg">chevron_right</span>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* Bottom action buttons */}
            {isAuthenticated && (
                <div className="fixed bottom-0 left-0 right-0 bg-mobile-surface-dark/95 backdrop-blur border-t border-white/5 p-4 pb-safe">
                    <div className="flex gap-3">
                        {isConnected && (
                            <button
                                onClick={handleSyncAllToDevice}
                                disabled={syncingAll || installing}
                                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-mobile-surface-dark border border-white/10 text-white font-medium disabled:opacity-50"
                            >
                                {syncingAll ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs">{syncProgress || '...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">bluetooth_searching</span>
                                        <span className="text-xs">{t('marketplace.syncAllToDevice')}</span>
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            onClick={handleInstallAll}
                            disabled={installing || syncingAll}
                            className="flex-1 py-3.5 rounded-xl bg-mobile-primary text-black font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {installing ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">download</span>
                                    {t('marketplace.installAll')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobilePackDetail;
