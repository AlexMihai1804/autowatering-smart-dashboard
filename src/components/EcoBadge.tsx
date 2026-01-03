import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { useI18n } from '../i18n';

export const EcoBadge: React.FC = () => {
    const rainIntegration = useAppStore((state) => state.rainIntegration);
    const bleService = BleService.getInstance();
    const connectionState = useAppStore((state) => state.connectionState);
    const { t, language } = useI18n();

    useEffect(() => {
        if (connectionState === 'connected') {
            bleService.readRainIntegrationStatus().catch(console.error);
        }
    }, [connectionState]);

    if (!rainIntegration) return null;

    const {
        integration_enabled,
        rainfall_last_24h,
        channel_skip_irrigation,
        sensor_active
    } = rainIntegration;

    if (!integration_enabled && !sensor_active) return null;

    const skippedCount = channel_skip_irrigation.filter(s => s).length;
    const isRaining = rainfall_last_24h > 0 || sensor_active;
    const zonePluralSuffix = language === 'ro'
        ? (skippedCount === 1 ? 'a' : 'e')
        : (skippedCount === 1 ? '' : 's');

    return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 min-h-[72px] flex items-center justify-between mb-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRaining ? 'bg-emerald-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    <span className="material-symbols-outlined text-2xl">
                        {isRaining ? 'rainy' : 'water_drop'}
                    </span>
                </div>
                <div>
                    <h3 className="text-white font-semibold text-sm">
                        {isRaining ? t('ecoBadge.rainDetected') : t('ecoBadge.monitor')}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-200 text-xs">
                            {t('ecoBadge.last24h').replace('{amount}', rainfall_last_24h.toFixed(1))}
                        </span>
                        {skippedCount > 0 && (
                            <span className="text-emerald-400 text-xs bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                {t('ecoBadge.zonesPaused')
                                    .replace('{count}', String(skippedCount))
                                    .replace('{plural}', zonePluralSuffix)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Action/Chevron? or just a badge */}
            {/* Maybe navigate to settings if clicked? */}
        </div>
    );
};
