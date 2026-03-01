import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import * as MarketplaceService from '../../services/MarketplaceService';
import MobileHeader from '../../components/mobile/MobileHeader';

const MobileMarketplaceSearch: React.FC = () => {
    const history = useHistory();
    const { t } = useI18n();

    const [query, setQuery] = useState('');
    const [answer, setAnswer] = useState('');
    const [citations, setCitations] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        setAnswer('');
        try {
            const res = await MarketplaceService.aiSearch(query.trim());
            setAnswer(res.answer);
            setCitations(res.citations || []);
        } catch (err: any) {
            setError(err.message || t('marketplace.searchFailed'));
        } finally {
            setLoading(false);
        }
    };

    const suggestedQueries = [
        t('marketplace.searchSuggestionIndoorLowLight'),
        t('marketplace.searchSuggestionDroughtSucculents'),
        t('marketplace.searchSuggestionTomatoFao56'),
        t('marketplace.searchSuggestionMediterraneanHerbs'),
    ];

    return (
        <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
            <MobileHeader
                title={t('marketplace.aiSearchTitle')}
                onBack={() => history.goBack()}
            />

            <main className="flex-1 overflow-y-auto px-4 pb-24">
                {/* Search input */}
                <div className="mt-2 mb-4">
                    <div className="relative">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('marketplace.aiSearchPlaceholder')}
                            rows={3}
                            className="w-full bg-mobile-surface-dark rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 border border-white/5 focus:border-mobile-primary/40 focus:outline-none resize-none"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !query.trim()}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-mobile-primary text-black font-medium disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">auto_awesome</span>
                                {t('marketplace.searchWithAi')}
                            </>
                        )}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* Answer */}
                {answer && (
                    <div className="bg-mobile-surface-dark rounded-2xl border border-white/5 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-mobile-primary">auto_awesome</span>
                            <span className="text-sm font-medium text-mobile-primary">{t('marketplace.aiAnswer')}</span>
                        </div>
                        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                            {answer}
                        </div>
                    </div>
                )}

                {/* Suggestions */}
                {!answer && !loading && (
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                            {t('marketplace.trySearching')}
                        </p>
                        {suggestedQueries.map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => {
                                    setQuery(suggestion);
                                }}
                                className="w-full text-left mb-2 px-4 py-3 rounded-xl bg-mobile-surface-dark border border-white/5 text-sm text-gray-300 active:bg-white/5"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MobileMarketplaceSearch;
