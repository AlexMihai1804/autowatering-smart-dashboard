import React, { useEffect, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import MobileHeader from '../../components/mobile/MobileHeader';
import * as api from '../../services/MarketplaceService';
import type { PlantSummary, PlantStatus } from '../../types/marketplace';

type StatusFilter = PlantStatus | 'all';

const MobileAdminPlants: React.FC = () => {
    const { t } = useI18n();
    const history = useHistory();
    const { isAdmin, loading: authLoading } = useAdminAuth();

    const [plants, setPlants] = useState<PlantSummary[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [nextToken, setNextToken] = useState<string | undefined>(undefined);

    const fetchPlants = useCallback(async (append = false) => {
        setLoading(true);
        try {
            const opts: api.BrowsePlantsOpts = {
                limit: 30,
                ...(append && nextToken ? { nextToken } : {}),
                ...(search ? { search } : {}),
            };
            const res = await api.browsePlants(opts);
            const items = res.plants;
            if (append) {
                setPlants(prev => [...prev, ...items]);
            } else {
                setPlants(items);
            }
            setNextToken(res.nextToken ?? undefined);
        } catch {
            if (!append) setPlants([]);
        } finally {
            setLoading(false);
        }
    }, [nextToken, search]);

    useEffect(() => {
        if (!authLoading && isAdmin) fetchPlants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAdmin, statusFilter]);

    const handleSearch = () => {
        setNextToken(undefined);
        fetchPlants();
    };

    const filteredPlants = statusFilter === 'all'
        ? plants
        : plants.filter(p => p.status === statusFilter);

    const statusBadge = (status?: PlantStatus) => {
        if (!status) return null;
        const map: Record<string, string> = {
            draft: 'bg-gray-500/20 text-gray-400',
            pending_review: 'bg-yellow-400/20 text-yellow-400',
            approved: 'bg-green-400/20 text-green-400',
            rejected: 'bg-red-400/20 text-red-400',
            ai_flagged: 'bg-purple-400/20 text-purple-400',
        };
        return (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[status] || 'bg-gray-500/20 text-gray-400'}`}>
                {status.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-mobile-bg-dark flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-mobile-bg-dark">
                <MobileHeader title={t('admin.plantManager')} showBackButton onBack={() => history.goBack()} />
                <div className="p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">shield</span>
                    <p className="text-white font-bold">{t('admin.accessDenied')}</p>
                </div>
            </div>
        );
    }

    const statusFilters: { value: StatusFilter; label: string }[] = [
        { value: 'all', label: t('admin.filterAll') },
        { value: 'approved', label: t('admin.approved') },
        { value: 'pending_review', label: t('admin.filterPending') },
        { value: 'rejected', label: t('admin.rejected') },
        { value: 'draft', label: t('admin.draft') },
        { value: 'ai_flagged', label: t('admin.filterFlagged') },
    ];

    return (
        <div className="min-h-screen bg-mobile-bg-dark pb-24">
            <MobileHeader
                title={t('admin.plantManager')}
                subtitle={`${filteredPlants.length} ${t('marketplace.plants').toLowerCase()}`}
                showBackButton
                onBack={() => history.push('/admin')}
            />

            {/* Search Bar */}
            <div className="px-4 pb-3">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder={t('marketplace.searchPlaceholder')}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-mobile-primary/50"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-4 bg-mobile-primary/20 text-mobile-primary rounded-xl text-sm font-medium hover:bg-mobile-primary/30"
                    >
                        {t('marketplace.search')}
                    </button>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
                {statusFilters.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                            statusFilter === f.value
                                ? 'bg-mobile-primary text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Plants List */}
            <div className="px-4 space-y-2">
                {loading && plants.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredPlants.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-gray-600 mb-2 block">search_off</span>
                        <p className="text-gray-400 text-sm">{t('admin.noPlantsFound')}</p>
                    </div>
                ) : (
                    <>
                        {filteredPlants.map(plant => (
                            <button
                                key={plant.plantId}
                                onClick={() => history.push(`/marketplace/plants/${plant.plantId}`)}
                                className="w-full bg-mobile-surface-dark rounded-xl border border-white/5 p-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
                            >
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-lg bg-white/5 flex-shrink-0 overflow-hidden">
                                    {plant.primaryImage?.url ? (
                                        <img src={plant.primaryImage.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-600">eco</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-white truncate">{plant.commonNameEn}</p>
                                        {statusBadge(plant.status)}
                                    </div>
                                    <p className="text-xs text-gray-400 italic truncate">{plant.scientificName}</p>
                                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                                        <span className="flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-[10px]">star</span>
                                            {plant.stats.rating.toFixed(1)}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-[10px]">download</span>
                                            {plant.stats.downloads}
                                        </span>
                                        <span>{plant.category}</span>
                                    </div>
                                </div>

                                <span className="material-symbols-outlined text-gray-500 text-sm">chevron_right</span>
                            </button>
                        ))}

                        {/* Load More */}
                        {nextToken && (
                            <button
                                onClick={() => fetchPlants(true)}
                                disabled={loading}
                                className="w-full py-3 text-sm text-mobile-primary font-medium hover:bg-white/5 rounded-xl transition-colors disabled:opacity-40"
                            >
                                {loading ? t('admin.loading') : t('admin.loadMore')}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MobileAdminPlants;
