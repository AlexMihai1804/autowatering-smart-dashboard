import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import * as MarketplaceService from '../../services/MarketplaceService';
import type { PlantSummary } from '../../types/marketplace';
import MobileHeader from '../../components/mobile/MobileHeader';

const MobileAuthorProfile: React.FC = () => {
    const { authorId } = useParams<{ authorId: string }>();
    const history = useHistory();
    const { t } = useI18n();

    const [loading, setLoading] = useState(true);
    const [plants, setPlants] = useState<PlantSummary[]>([]);
    const [authorName, setAuthorName] = useState('');
    const [nextToken, setNextToken] = useState<string | undefined>();

    useEffect(() => {
        if (!authorId) return;
        setLoading(true);
        MarketplaceService.browsePlants({ authorUid: authorId, limit: 20 })
            .then((res) => {
                setPlants(res.plants || []);
                setNextToken(res.nextToken ?? undefined);
                // Derive author name from first plant
                if (res.plants?.length > 0) {
                    setAuthorName(authorId);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [authorId]);

    const loadMore = async () => {
        if (!nextToken) return;
        const res = await MarketplaceService.browsePlants({ authorUid: authorId, nextToken, limit: 20 });
        setPlants((prev) => [...prev, ...(res.plants || [])]);
        setNextToken(res.nextToken ?? undefined);
    };

    return (
        <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
            <MobileHeader
                title={authorName || t('marketplace.authorProfile')}
                onBack={() => history.goBack()}
            />

            <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : plants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="material-symbols-outlined text-4xl text-gray-600 mb-3">eco</span>
                        <p className="text-gray-500 text-sm">{t('marketplace.noPlants')}</p>
                    </div>
                ) : (
                    <>
                        {/* Author stats */}
                        <div className="flex items-center gap-4 mb-6 p-4 bg-mobile-surface-dark rounded-xl border border-white/5">
                            <div className="w-14 h-14 rounded-full bg-mobile-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-mobile-primary text-2xl">person</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">{authorName}</h2>
                                <p className="text-xs text-gray-400">
                                    {plants.length}+ {t('marketplace.publishedPlants')}
                                </p>
                            </div>
                        </div>

                        {/* Plants grid */}
                        <h3 className="text-sm font-semibold text-gray-300 mb-3">
                            {t('marketplace.publishedPlants')}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {plants.map((plant) => (
                                <button
                                    key={plant.plantId}
                                    onClick={() => history.push(`/marketplace/plants/${plant.plantId}`)}
                                    className="bg-mobile-surface-dark rounded-xl overflow-hidden border border-white/5 text-left hover:border-mobile-primary/20"
                                >
                                    {plant.primaryImage?.url ? (
                                        <img src={plant.primaryImage?.url} alt="" className="w-full h-28 object-cover" />
                                    ) : (
                                        <div className="w-full h-28 bg-mobile-primary/5 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-3xl text-mobile-primary/40">eco</span>
                                        </div>
                                    )}
                                    <div className="p-2.5">
                                        <p className="text-xs font-medium truncate">{plant.commonNameEn || plant.commonNameRo}</p>
                                        <p className="text-[10px] text-gray-500 truncate italic">{plant.scientificName}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                            {plant.stats.rating > 0 && (
                                                <span className="flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-yellow-500 text-xs" style={{ fontSize: '10px' }}>star</span>
                                                    {plant.stats.rating.toFixed(1)}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-0.5">
                                                <span className="material-symbols-outlined text-xs" style={{ fontSize: '10px' }}>download</span>
                                                {plant.stats.downloads}
                                            </span>
                                        </div>
                                    </div>
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

export default MobileAuthorProfile;
