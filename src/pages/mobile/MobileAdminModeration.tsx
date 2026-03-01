import React, { useEffect, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import MobileHeader from '../../components/mobile/MobileHeader';
import * as api from '../../services/MarketplaceService';
import type { MarketplacePlant, ModerationResult } from '../../types/marketplace';

type QueueFilter = 'pending_review' | 'ai_flagged' | 'all';

const MobileAdminModeration: React.FC = () => {
    const { t } = useI18n();
    const history = useHistory();
    const { isAdmin, loading: authLoading } = useAdminAuth();

    const [plants, setPlants] = useState<MarketplacePlant[]>([]);
    const [filter, setFilter] = useState<QueueFilter>('pending_review');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [aiResults, setAiResults] = useState<Record<string, ModerationResult>>({});

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const status = filter === 'all' ? undefined : filter;
            const res = await api.getModerationQueue({ status, limit: 30 });
            setPlants(res.plants);
        } catch {
            setPlants([]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        if (!authLoading && isAdmin) fetchQueue();
    }, [authLoading, isAdmin, fetchQueue]);

    const handleModerate = async (plantId: string, action: 'approve' | 'reject') => {
        setActionLoading(plantId);
        try {
            await api.moderatePlant(plantId, action);
            setPlants(prev => prev.filter(p => p.plantId !== plantId));
        } catch {
            // silently fail
        } finally {
            setActionLoading(null);
        }
    };

    const handleAiReview = async (plantId: string) => {
        setActionLoading(plantId);
        try {
            const res = await api.aiModeratePlant(plantId);
            setAiResults(prev => ({ ...prev, [plantId]: res.moderation }));
        } catch {
            // silently fail
        } finally {
            setActionLoading(null);
        }
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
                <MobileHeader title={t('admin.moderationQueue')} showBackButton onBack={() => history.goBack()} />
                <div className="p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">shield</span>
                    <p className="text-white font-bold">{t('admin.accessDenied')}</p>
                </div>
            </div>
        );
    }

    const filters: { value: QueueFilter; label: string }[] = [
        { value: 'pending_review', label: t('admin.filterPending') },
        { value: 'ai_flagged', label: t('admin.filterFlagged') },
        { value: 'all', label: t('admin.filterAll') },
    ];

    const scoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="min-h-screen bg-mobile-bg-dark pb-24">
            <MobileHeader
                title={t('admin.moderationQueue')}
                showBackButton
                onBack={() => history.push('/admin')}
                rightAction={
                    <button onClick={fetchQueue} className="p-2 rounded-full hover:bg-white/10">
                        <span className="material-symbols-outlined text-white">refresh</span>
                    </button>
                }
            />

            {/* Filter Tabs */}
            <div className="px-4 pb-3 flex gap-2">
                {filters.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            filter === f.value
                                ? 'bg-mobile-primary text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Queue */}
            <div className="px-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : plants.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-gray-600 mb-2 block">task_alt</span>
                        <p className="text-gray-400 text-sm">{t('admin.queueEmpty')}</p>
                    </div>
                ) : (
                    plants.map(plant => {
                        const ai = aiResults[plant.plantId];
                        const isBusy = actionLoading === plant.plantId;

                        return (
                            <div key={plant.plantId} className="bg-mobile-surface-dark rounded-2xl border border-white/5 overflow-hidden">
                                {/* Plant Header */}
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        {/* Thumbnail */}
                                        <div className="w-16 h-16 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden">
                                            {plant.images?.[0]?.url ? (
                                                <img src={plant.images[0].url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-2xl text-gray-600">eco</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-white truncate">{plant.commonNameEn}</h3>
                                            <p className="text-xs text-gray-400 italic truncate">{plant.scientificName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                                    plant.status === 'pending_review' ? 'bg-yellow-400/20 text-yellow-400' :
                                                    plant.status === 'ai_flagged' ? 'bg-red-400/20 text-red-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {plant.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                                <span className="text-[10px] text-gray-500">{plant.category}</span>
                                            </div>
                                        </div>

                                        {/* Preview link */}
                                        <button
                                            onClick={() => history.push(`/marketplace/plants/${plant.plantId}`)}
                                            className="p-2 rounded-full hover:bg-white/10"
                                        >
                                            <span className="material-symbols-outlined text-sm text-gray-400">open_in_new</span>
                                        </button>
                                    </div>

                                    {/* Description preview */}
                                    {plant.descriptionEn && (
                                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">{plant.descriptionEn}</p>
                                    )}

                                    {/* Author & Date */}
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                                        <span>{t('admin.authorLabel')}: {plant.authorUid.substring(0, 8)}...</span>
                                        <span>{new Date(plant.createdAt).toLocaleDateString()}</span>
                                        <span>v{plant.version}</span>
                                    </div>
                                </div>

                                {/* AI Moderation Results */}
                                {ai && (
                                    <div className="px-4 pb-3 border-t border-white/5 pt-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-sm text-purple-400">psychology</span>
                                            <span className="text-xs font-semibold text-purple-400">{t('admin.aiScore')}</span>
                                            <span className={`text-sm font-bold ml-auto ${scoreColor(ai.overallScore)}`}>
                                                {ai.overallScore}/100
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                                            <div className="text-center">
                                                <p className="text-gray-500">{t('admin.accuracy')}</p>
                                                <p className={`font-bold ${scoreColor(ai.scores.scientificAccuracy)}`}>
                                                    {ai.scores.scientificAccuracy}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-500">{t('admin.completeness')}</p>
                                                <p className={`font-bold ${scoreColor(ai.scores.completeness)}`}>
                                                    {ai.scores.completeness}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-500">{t('admin.quality')}</p>
                                                <p className={`font-bold ${scoreColor(ai.scores.quality)}`}>
                                                    {ai.scores.quality}
                                                </p>
                                            </div>
                                        </div>
                                        {ai.recommendation && (
                                            <p className={`text-xs font-semibold mt-2 text-center ${
                                                ai.recommendation === 'approve' ? 'text-green-400' :
                                                ai.recommendation === 'reject' ? 'text-red-400' : 'text-yellow-400'
                                            }`}>
                                                {t('admin.aiRecommends')}: {ai.recommendation.toUpperCase()}
                                            </p>
                                        )}
                                        {ai.issues.length > 0 && (
                                            <div className="mt-2">
                                                {ai.issues.map((issue, i) => (
                                                    <p key={i} className="text-[10px] text-red-300">• {issue}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex border-t border-white/5">
                                    <button
                                        onClick={() => handleAiReview(plant.plantId)}
                                        disabled={isBusy}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-purple-400 hover:bg-purple-400/10 transition-colors disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-sm">psychology</span>
                                        {t('admin.aiReview')}
                                    </button>
                                    <button
                                        onClick={() => handleModerate(plant.plantId, 'approve')}
                                        disabled={isBusy}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-green-400 hover:bg-green-400/10 transition-colors border-x border-white/5 disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        {t('admin.approve')}
                                    </button>
                                    <button
                                        onClick={() => handleModerate(plant.plantId, 'reject')}
                                        disabled={isBusy}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                        {t('admin.reject')}
                                    </button>
                                </div>

                                {/* Loading overlay */}
                                {isBusy && (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-2xl">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MobileAdminModeration;
