import React from 'react';

/**
 * Base skeleton with shimmer animation
 */
export const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`skeleton-shimmer rounded-xl bg-mobile-surface-dark ${className}`}></div>
);

/**
 * Skeleton for a zone card in the zones list
 */
export const ZoneCardSkeleton: React.FC = () => (
    <div className="bg-mobile-surface-dark rounded-xl p-4 border-2 border-mobile-border-dark animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3 items-center">
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-mobile-border-dark"></div>
                <div>
                    {/* Title */}
                    <div className="h-4 w-24 bg-mobile-border-dark rounded mb-2"></div>
                    {/* Subtitle */}
                    <div className="h-3 w-32 bg-mobile-border-dark/60 rounded"></div>
                </div>
            </div>
            {/* Status badge */}
            <div className="h-5 w-12 bg-mobile-border-dark rounded-full"></div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between">
            <div className="h-3 w-28 bg-mobile-border-dark/60 rounded"></div>
            <div className="h-8 w-16 bg-mobile-border-dark rounded-full"></div>
        </div>
    </div>
);

/**
 * Skeleton for the dashboard status card
 */
export const DashboardCardSkeleton: React.FC = () => (
    <div className="rounded-3xl bg-mobile-surface-dark border border-mobile-border-dark p-6 animate-pulse">
        <div className="flex justify-between items-start mb-6">
            <div>
                <div className="h-3 w-28 bg-mobile-border-dark rounded mb-3"></div>
                <div className="h-8 w-36 bg-mobile-border-dark rounded mb-2"></div>
                <div className="h-3 w-20 bg-mobile-border-dark/60 rounded"></div>
            </div>
            <div className="h-12 w-12 rounded-full bg-mobile-border-dark"></div>
        </div>
        {/* Progress bar */}
        <div className="h-3 w-full bg-mobile-border-dark rounded-full"></div>
    </div>
);

/**
 * Skeleton for sensor stat cards
 */
export const SensorCardSkeleton: React.FC = () => (
    <div className="bg-mobile-surface-dark p-5 rounded-3xl border border-mobile-border-dark h-32 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-mobile-border-dark"></div>
            <div className="h-3 w-12 bg-mobile-border-dark rounded"></div>
        </div>
        <div className="h-6 w-20 bg-mobile-border-dark rounded"></div>
    </div>
);

/**
 * Skeleton for history chart area
 */
export const ChartSkeleton: React.FC = () => (
    <div className="bg-mobile-surface-dark rounded-[2rem] p-6 border border-mobile-border-dark animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-mobile-border-dark"></div>
                <div>
                    <div className="h-3 w-28 bg-mobile-border-dark rounded mb-2"></div>
                    <div className="h-8 w-20 bg-mobile-border-dark rounded"></div>
                </div>
            </div>
            <div className="h-4 w-16 bg-mobile-border-dark rounded"></div>
        </div>
        {/* Chart placeholder */}
        <div className="h-56 w-full bg-mobile-border-dark/50 rounded-xl flex items-end justify-between px-4 pb-4 gap-2">
            {[40, 60, 30, 80, 50, 70, 45].map((h, i) => (
                <div
                    key={i}
                    className="flex-1 bg-mobile-border-dark rounded-t"
                    style={{ height: `${h}%` }}
                ></div>
            ))}
        </div>
    </div>
);

/**
 * Skeleton for settings list items
 */
export const SettingsListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <div
                key={i}
                className="flex items-center gap-4 p-4 bg-mobile-surface-dark rounded-2xl border border-mobile-border-dark animate-pulse"
            >
                <div className="w-10 h-10 rounded-full bg-mobile-border-dark"></div>
                <div className="flex-1">
                    <div className="h-4 w-32 bg-mobile-border-dark rounded mb-1"></div>
                    <div className="h-3 w-48 bg-mobile-border-dark/60 rounded"></div>
                </div>
                <div className="w-5 h-5 bg-mobile-border-dark rounded"></div>
            </div>
        ))}
    </div>
);

/**
 * Weather widget skeleton
 */
export const WeatherWidgetSkeleton: React.FC = () => (
    <div className="flex items-center justify-between bg-mobile-surface-dark rounded-xl p-4 border border-mobile-border-dark animate-pulse">
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="h-8 w-16 bg-mobile-border-dark rounded"></div>
                <div className="w-8 h-8 rounded-full bg-mobile-border-dark"></div>
            </div>
            <div className="h-3 w-24 bg-mobile-border-dark/60 rounded"></div>
        </div>
        <div className="h-16 w-px bg-mobile-border-dark"></div>
        <div className="flex flex-col items-end gap-2">
            <div className="h-3 w-16 bg-mobile-border-dark/60 rounded"></div>
            <div className="h-4 w-12 bg-mobile-border-dark rounded"></div>
            <div className="h-5 w-20 bg-mobile-border-dark rounded-full"></div>
        </div>
    </div>
);

/**
 * Full dashboard loading skeleton
 */
export const DashboardLoadingSkeleton: React.FC = () => (
    <div className="p-4 space-y-6 animate-fade-in">
        {/* Main status card */}
        <DashboardCardSkeleton />

        {/* Sensor grid */}
        <div className="grid grid-cols-2 gap-4">
            <SensorCardSkeleton />
            <SensorCardSkeleton />
            <div className="col-span-2">
                <SensorCardSkeleton />
            </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
            <div className="h-14 w-full bg-mobile-border-dark rounded-3xl animate-pulse"></div>
            <div className="h-14 w-full bg-mobile-surface-dark border border-mobile-border-dark rounded-3xl animate-pulse"></div>
        </div>
    </div>
);

/**
 * Zones list loading skeleton
 */
export const ZonesLoadingSkeleton: React.FC = () => (
    <div className="px-4 space-y-4 animate-fade-in">
        {/* Weather widget */}
        <WeatherWidgetSkeleton />

        {/* Section header */}
        <div className="flex items-center justify-between my-4">
            <div className="h-5 w-32 bg-mobile-border-dark rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-mobile-border-dark rounded animate-pulse"></div>
        </div>

        {/* Zone cards */}
        <div className="space-y-4">
            <ZoneCardSkeleton />
            <ZoneCardSkeleton />
            <ZoneCardSkeleton />
        </div>
    </div>
);

export default {
    SkeletonBase,
    ZoneCardSkeleton,
    DashboardCardSkeleton,
    SensorCardSkeleton,
    ChartSkeleton,
    SettingsListSkeleton,
    WeatherWidgetSkeleton,
    DashboardLoadingSkeleton,
    ZonesLoadingSkeleton,
};
