import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth';
import * as MarketplaceService from '../../services/MarketplaceService';
import type { AiChatMessage } from '../../types/marketplace';
import MobileHeader from '../../components/mobile/MobileHeader';

const MobilePlantChat: React.FC = () => {
    const { plantId } = useParams<{ plantId: string }>();
    const history = useHistory();
    const { t } = useI18n();
    const { isAuthenticated } = useAuth();

    const [plantName, setPlantName] = useState('');
    const [messages, setMessages] = useState<AiChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load plant name
    useEffect(() => {
        if (!plantId) return;
        MarketplaceService.getPlantDetail(plantId)
            .then((res) => setPlantName(res.plant.commonNameEn || res.plant.commonNameRo || res.plant.scientificName))
            .catch(() => setPlantName('Plant'))
            .finally(() => setInitialLoading(false));
    }, [plantId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || loading || !plantId) return;

        const userMsg: AiChatMessage = { role: 'user', content: text };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const history = [...messages, userMsg];
            const res = await MarketplaceService.aiPlantChat(plantId, text, history);
            const assistantMsg: AiChatMessage = { role: 'assistant', content: res.response };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err: any) {
            const errMsg: AiChatMessage = {
                role: 'assistant',
                content: t('marketplace.chatError'),
            };
            setMessages((prev) => [...prev, errMsg]);
        } finally {
            setLoading(false);
        }
    }, [input, loading, plantId, messages, t]);

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
                title={plantName ? `AI · ${plantName}` : t('marketplace.plantChat')}
                onBack={() => history.goBack()}
            />

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
                {initialLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-mobile-primary text-3xl">smart_toy</span>
                        </div>
                        <h3 className="text-sm font-medium mb-1">
                            {t('marketplace.chatWelcome')}
                        </h3>
                        <p className="text-xs text-gray-500 text-center max-w-[260px]">
                            {t('marketplace.chatHint')}
                        </p>

                        {/* Suggested questions */}
                        <div className="mt-6 space-y-2 w-full max-w-sm">
                            {[
                                `What's the ideal watering schedule for ${plantName || 'this plant'}?`,
                                'What soil conditions does it prefer?',
                                'What are the FAO-56 crop coefficients?',
                                'How to protect from common pests?',
                            ].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => {
                                        setInput(q);
                                    }}
                                    className="w-full text-left px-4 py-3 rounded-xl bg-mobile-surface-dark border border-white/5 text-xs text-gray-400 hover:border-mobile-primary/20"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                                        msg.role === 'user'
                                            ? 'bg-mobile-primary text-black rounded-br-md'
                                            : 'bg-mobile-surface-dark border border-white/5 text-gray-200 rounded-bl-md'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-mobile-surface-dark border border-white/5 rounded-2xl rounded-bl-md px-4 py-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 bg-mobile-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-mobile-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-mobile-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="shrink-0 bg-mobile-surface-dark/95 backdrop-blur border-t border-white/5 px-4 py-3 pb-safe">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder={t('marketplace.chatPlaceholder')}
                        disabled={loading}
                        className="flex-1 bg-mobile-bg-dark rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 border border-white/5 focus:border-mobile-primary/40 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="w-11 h-11 rounded-xl bg-mobile-primary text-black flex items-center justify-center disabled:opacity-50 shrink-0"
                    >
                        <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobilePlantChat;
