import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import MobileHeader from '../../components/mobile/MobileHeader';
import * as api from '../../services/MarketplaceService';

interface AdminStats {
    totalPlants: string;
    pendingReview: string;
    approved: string;
    rejected: string;
    totalPacks: string;
    totalUsers: string;
    totalReviews: string;
    totalDownloads: string;
}

const MobileAdminDashboard: React.FC = () => {
    const { t } = useI18n();
    const history = useHistory();
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!isAdmin) return;
        api.getAdminStats()
            .then(res => setStats(res.stats as unknown as AdminStats))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isAdmin, authLoading]);

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
                <MobileHeader title={t('admin.title')} showBackButton onBack={() => history.goBack()} />
                <div className="p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">shield</span>
                    <h2 className="text-lg font-bold text-white mb-2">{t('admin.accessDenied')}</h2>
                    <p className="text-sm text-gray-400">{t('admin.accessDeniedDesc')}</p>
                </div>
            </div>
        );
    }

    const statCards: { key: keyof AdminStats; labelKey: string; icon: string; color: string }[] = [
        { key: 'totalPlants', labelKey: 'admin.totalPlants', icon: 'eco', color: 'text-mobile-primary' },
        { key: 'pendingReview', labelKey: 'admin.pendingReview', icon: 'pending_actions', color: 'text-yellow-400' },
        { key: 'approved', labelKey: 'admin.approved', icon: 'check_circle', color: 'text-green-400' },
        { key: 'rejected', labelKey: 'admin.rejected', icon: 'cancel', color: 'text-red-400' },
        { key: 'totalPacks', labelKey: 'admin.totalPacks', icon: 'inventory_2', color: 'text-blue-400' },
        { key: 'totalUsers', labelKey: 'admin.totalUsers', icon: 'group', color: 'text-purple-400' },
        { key: 'totalReviews', labelKey: 'admin.totalReviews', icon: 'rate_review', color: 'text-orange-400' },
        { key: 'totalDownloads', labelKey: 'admin.totalDownloads', icon: 'download', color: 'text-cyan-400' },
    ];

    const navCards: { path: string; labelKey: string; descKey: string; icon: string; color: string }[] = [
        { path: '/admin/moderation', labelKey: 'admin.moderationQueue', descKey: 'admin.moderationDesc', icon: 'gavel', color: 'from-yellow-500/20 to-orange-500/10' },
        { path: '/admin/plants', labelKey: 'admin.plantManager', descKey: 'admin.plantManagerDesc', icon: 'forest', color: 'from-green-500/20 to-emerald-500/10' },
    ];

    return (
        <div className="min-h-screen bg-mobile-bg-dark pb-24">
            <MobileHeader
                title={t('admin.title')}
                subtitle={t('admin.subtitle')}
                showBackButton
                onBack={() => history.goBack()}
            />

            <div className="px-4 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {statCards.map(card => (
                        <div key={card.key} className="bg-mobile-surface-dark rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`material-symbols-outlined text-xl ${card.color}`}>{card.icon}</span>
                                <span className="text-xs text-gray-400">{t(card.labelKey)}</span>
                            </div>
                            <p className="text-2xl font-bold text-white">
                                {loading ? '—' : (stats?.[card.key] ?? '0')}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Nav Cards */}
                <div className="space-y-3">
                    {navCards.map(card => (
                        <button
                            key={card.path}
                            onClick={() => history.push(card.path)}
                            className={`w-full bg-gradient-to-r ${card.color} border border-white/5 rounded-2xl p-5 flex items-center gap-4 text-left`}
                        >
                            <span className="material-symbols-outlined text-3xl text-white">{card.icon}</span>
                            <div className="flex-1">
                                <p className="text-base font-bold text-white">{t(card.labelKey)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{t(card.descKey)}</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-500">chevron_right</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MobileAdminDashboard;
