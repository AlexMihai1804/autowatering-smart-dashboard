import React from 'react';
import { HydraulicStatusData, HydraulicLockLevel, HydraulicLockReason, HydraulicProfileType } from '../types/firmware_structs';

interface HydraulicDetailsCardProps {
    data: HydraulicStatusData | null | undefined;
}

const HydraulicDetailsCard: React.FC<HydraulicDetailsCardProps> = ({ data }) => {
    if (!data) return null;

    const {
        lock_level,
        lock_reason,
        profile_type,
        nominal_flow_ml_min,
        tolerance_high_percent,
        tolerance_low_percent,
        learning_runs,
        stable_runs,
        estimated
    } = data;

    const isLocked = lock_level !== HydraulicLockLevel.NONE;
    const isLearning = learning_runs > 0 && stable_runs < 5; // Assuming 5 runs needed for stability

    return (

        <div className="bg-mobile-surface-dark rounded-2xl p-0 border border-mobile-border-dark overflow-hidden">
            {/* Header / Status Banner */}
            <div className={`p-4 flex items-center justify-between border-b border-white/5 ${isLocked ? 'bg-red-500/10' : isLearning ? 'bg-amber-500/10' : 'bg-green-500/10'
                }`}>
                <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-full flex items-center justify-center ${isLocked ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                        isLearning ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                        }`}>
                        <span className="material-symbols-outlined">
                            {isLocked ? 'lock' : isLearning ? 'school' : 'verified_user'}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base">Protection Monitor</h3>
                        <p className={`text-xs font-medium ${isLocked ? 'text-red-400' : isLearning ? 'text-amber-400' : 'text-green-400'
                            }`}>
                            {isLocked ? 'SYSTEM LOCKED' : isLearning ? 'LEARNING PHASE' : 'ACTIVE & SECURE'}
                        </p>
                    </div>
                </div>

                {/* Profile Badge */}
                <div className="px-2 py-1 rounded-lg bg-black/20 text-[10px] font-bold text-white/50 uppercase tracking-widest border border-white/5">
                    {profile_type === HydraulicProfileType.AUTO ? 'AUTO' :
                        profile_type === HydraulicProfileType.SPRAY ? 'SPRAY' :
                            profile_type === HydraulicProfileType.DRIP ? 'DRIP' : 'UNK'}
                </div>
            </div>

            {/* Lock Status (only if locked) */}
            {isLocked && (
                <div className="p-4 bg-red-500/5 border-b border-red-500/10">
                    <div className="flex gap-3">
                        <span className="material-symbols-outlined text-red-500 shrink-0">warning</span>
                        <div>
                            <p className="text-white font-bold text-sm">
                                {lock_reason === HydraulicLockReason.HIGH_FLOW ? 'High Flow Alert' :
                                    lock_reason === HydraulicLockReason.NO_FLOW ? 'No Flow Alert' :
                                        lock_reason === HydraulicLockReason.UNEXPECTED ? 'Leak Detected' :
                                            lock_reason === HydraulicLockReason.MAINLINE_LEAK ? 'Mainline Rupture' : 'Anomaly Detected'}
                            </p>
                            <p className="text-red-300/80 text-xs mt-1 leading-relaxed">
                                Zone was automatically locked to prevent damage. Please inspect the irrigation line and reset the zone.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 divide-x divide-white/5 bg-white/[0.02]">
                <div className="p-4 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-mobile-text-muted uppercase tracking-wider mb-1">Flow Rate</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white tracking-tight">
                            {(nominal_flow_ml_min / 1000).toFixed(1)}
                        </span>
                        <span className="text-sm font-medium text-mobile-text-muted">L/m</span>
                    </div>
                    {estimated && <span className="text-[10px] text-amber-500 font-bold mt-1 px-1.5 py-0.5 bg-amber-500/10 rounded">ESTIMATED</span>}
                </div>

                <div className="p-4 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-mobile-text-muted uppercase tracking-wider mb-1">Variance</span>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-white bg-white/5 px-2 py-1 rounded-md">-{tolerance_low_percent}%</span>
                        <span className="text-white/20">/</span>
                        <span className="text-sm font-bold text-white bg-white/5 px-2 py-1 rounded-md">+{tolerance_high_percent}%</span>
                    </div>
                </div>
            </div>

            {/* Learning Status */}
            {isLearning && (
                <div className="p-3 bg-amber-500/5 text-center border-t border-amber-500/10">
                    <p className="text-amber-400 text-xs font-medium">
                        Calibrating System • Run {stable_runs}/5
                    </p>
                </div>
            )}
        </div>
    );

};

export default HydraulicDetailsCard;
