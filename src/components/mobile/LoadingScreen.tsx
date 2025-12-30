import React from 'react';
import { useAppStore } from '../../store/useAppStore';

/**
 * Full-screen loading component for initial app/data loading with progress bar
 */
const LoadingScreen: React.FC = () => {
    const { syncProgress, syncMessage } = useAppStore();

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-mobile-bg-dark">
            {/* Logo/Icon with pulse animation */}
            <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full bg-mobile-primary/20 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-5xl text-mobile-primary">
                        water_drop
                    </span>
                </div>
                {/* Outer ring animation */}
                <div className="absolute inset-0 rounded-full border-2 border-mobile-primary/30 animate-ping" style={{ animationDuration: '2s' }}></div>
            </div>

            {/* Loading text */}
            <h2 className="text-xl font-bold text-white mb-2">AutoWater</h2>
            <p className="text-mobile-text-muted text-sm mb-6">{syncMessage}</p>

            {/* Progress bar */}
            <div className="w-64 mb-4">
                <div className="h-1.5 bg-mobile-border-dark rounded-full overflow-hidden">
                    <div
                        className="h-full bg-mobile-primary rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${syncProgress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between mt-2">
                    <span className="text-xs text-mobile-text-muted">{Math.round(syncProgress)}%</span>
                    <span className="text-xs text-mobile-text-muted">Loading data...</span>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
