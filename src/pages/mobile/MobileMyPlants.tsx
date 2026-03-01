import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth';
import * as MarketplaceService from '../../services/MarketplaceService';
import type { PlantSummary } from '../../types/marketplace';
import MobileHeader from '../../components/mobile/MobileHeader';
import { getLocalizedMarketplacePlantName } from '../../utils/plantNameHelpers';

type StatusFilter = 'all' | 'draft' | 'pending_review' | 'approved' | 'rejected';

const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'pending_review', 'approved', 'rejected'];

const STATUS_COLORS: Record<string, string> = {
    draft: 'text-gray-400 bg-gray-400/10',
    pending_review: 'text-yellow-400 bg-yellow-400/10',
    approved: 'text-mobile-primary bg-mobile-primary/10',
    rejected: 'text-red-400 bg-red-400/10',
};

const MobileMyPlants: React.FC = () => {
    const history = useHistory();
    const { t, language } = useI18n();
    const { isAuthenticated, user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [plants, setPlants] = useState<PlantSummary[]>([]);
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [nextToken, setNextToken] = useState<string | undefined>();

    useEffect(() => {
        if (!isAuthenticated || !user?.uid) return;
        setLoading(true);
        MarketplaceService.browsePlants({
            authorUid: user.uid,
            status: filter === 'all' ? undefined : filter,
            limit: 20,
        })
            .then((res) => {
                setPlants(res.plants || []);
                setNextToken(res.nextToken ?? undefined);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isAuthenticated, user?.uid, filter]);

    const loadMore = async () => {
        if (!nextToken || !user?.uid) return;
        const res = await MarketplaceService.browsePlants({
            authorUid: user.uid,
            status: filter === 'all' ? undefined : filter,
            nextToken,
            limit: 20,
        });
        setPlants((prev) => [...prev, ...(res.plants || [])]);
        setNextToken(res.nextToken ?? undefined);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col h-screen bg-mobile-bg-dark text-white">
                <MobileHeader title="" onBack={() => history.goBack()} />
                <div className="flex-1 flex items-center justify-center px-8 text-center">
                    <p className="text-gray-400">{t('marketplace.signInRequired')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
            <MobileHeader
                title={t('marketplace.myPlants')}
                onBack={() => history.goBack()}
            />

            {/* Add plant button */}
            <div className="flex justify-end px-4 pt-2">
                <button
                    onClick={() => history.push('/marketplace/plants/new/edit')}
                    className="w-9 h-9 rounded-full bg-mobile-primary/10 flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-mobile-primary text-lg">add</span>
                </button>
            </div>

            {/* Status filter */}
            <div className="px-4 py-3 overflow-x-auto shrink-0">
                <div className="flex gap-2 w-max">
                    {STATUS_FILTERS.map((key) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                filter === key
                                    ? 'bg-mobile-primary text-black'
                                    : 'bg-mobile-surface-dark text-gray-400 border border-white/10'
                            }`}
                        >
                            {t(`marketplace.status.${key}`)}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto px-4 pb-20">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : plants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <span className="material-symbols-outlined text-4xl text-gray-600 mb-3">eco</span>
                        <p className="text-gray-500 text-sm mb-4">
                            {filter === 'all'
                                ? t('marketplace.noAuthoredPlants')
                                : t('marketplace.noFilteredPlants')}
                        </p>
                        <button
                            onClick={() => history.push('/marketplace/plants/new/edit')}
                            className="px-5 py-2.5 rounded-xl bg-mobile-primary text-black text-sm font-medium"
                        >
                            {t('marketplace.createFirst')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {plants.map((plant) => (
                                <button
                                    key={plant.plantId}
                                    onClick={() => history.push(`/marketplace/plants/${plant.plantId}`)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-mobile-surface-dark border border-white/5 text-left hover:border-mobile-primary/20"
                                >
                                    {plant.primaryImage?.url ? (
                                        <img
                                            src={plant.primaryImage?.url}
                                            alt=""
                                            className="w-14 h-14 rounded-lg object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg bg-mobile-primary/10 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-mobile-primary text-2xl">eco</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {getLocalizedMarketplacePlantName(plant, language) || plant.scientificName}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate italic">{plant.scientificName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[plant.status || 'draft'] || STATUS_COLORS.draft}`}>
                                                {t(`marketplace.status.${(plant.status || 'draft') as StatusFilter}`)}
                                            </span>
                                            {plant.stats.rating > 0 && (
                                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: '10px' }}>star</span>
                                                    {plant.stats.rating.toFixed(1)}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>download</span>
                                                {plant.stats.downloads}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            history.push(`/marketplace/plants/${plant.plantId}/edit`);
                                        }}
                                        className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-gray-400 text-lg">edit</span>
                                    </button>
                                </button>
                            ))}
                        </div>

                        {nextToken && (
                            <button
                                onClick={loadMore}
                                className="w-full mt-4 py-3 rounded-xl bg-mobile-surface-dark border border-white/10 text-sm text-gray-400"
                            >
                                {t('marketplace.loadMore')}
                            </button>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default MobileMyPlants;
