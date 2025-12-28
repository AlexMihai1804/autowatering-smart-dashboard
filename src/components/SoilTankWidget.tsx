import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { AutoCalcStatusData } from '../types/firmware_structs';

interface SoilTankWidgetProps {
    channelId: number;
}

export const SoilTankWidget: React.FC<SoilTankWidgetProps> = ({ channelId }) => {
    const autoCalcData = useAppStore((state) => state.autoCalcData[channelId]);
    const bleService = BleService.getInstance();

    useEffect(() => {
        // Fetch data on mount if connected
        if (useAppStore.getState().connectionState === 'connected') {
            bleService.readAutoCalcStatus(channelId).catch(console.error);
        }
    }, [channelId]);

    if (!autoCalcData) {
        return (
            <div className="bg-white/5 rounded-2xl p-4 animate-pulse">
                <div className="h-40 bg-white/10 rounded-xl mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-1/2"></div>
            </div>
        );
    }

    const {
        current_deficit_mm,
        et0_mm_day,
        calculated_volume_l,
        irrigation_needed,
        phenological_stage,
        calculation_active,
        etc_mm_day
    } = autoCalcData;

    // Calculate tank fill level (conceptual)
    // Assuming a max deficit or "field capacity" isn't explicitly in the status, 
    // but deficit is "mm below capacity".
    // For visualization, we can show "Deficit" as empty space.
    // Let's assume a standard root zone capacity for visualization context, or just show deficit.
    // A better metaphor might be "Water Level". 
    // Deficit = Empty Space.
    // Let's visualize a tank of height 50mm (arbitrary reference) and the water level is (50 - deficit).
    // Or just show the deficit bar growing downwards.

    // Let's use a "Tank" that is FULL when deficit is 0.
    // And empties as deficit increases.
    const maxReferenceMm = 25; // arbitrary visual scale
    const fillPercent = Math.max(0, Math.min(100, 100 * (1 - (current_deficit_mm / maxReferenceMm))));

    return (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-lg font-medium text-white">Soil Status</h3>
                    <p className="text-xs text-white/50">FAO-56 Auto Calculation</p>
                </div>
                {calculation_active === 1 ? (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                        Active
                    </span>
                ) : (
                    <span className="bg-white/10 text-white/40 text-xs px-2 py-1 rounded-full">
                        Inactive
                    </span>
                )}
            </div>

            <div className="flex gap-6 relative z-10">
                {/* Tank Visualization */}
                <div className="w-16 h-32 bg-slate-800 rounded-lg relative overflow-hidden border border-white/10 shadow-inner">
                    {/* Water Level */}
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-1000 ease-in-out opacity-80"
                        style={{ height: `${fillPercent}%` }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400/50"></div>
                    </div>

                    {/* Markers */}
                    <div className="absolute top-0 right-0 bottom-0 w-full flex flex-col justify-between p-1 pointer-events-none">
                        <div className="border-b border-white/10 h-0 w-2 ml-auto"></div>
                        <div className="border-b border-white/10 h-0 w-2 ml-auto"></div>
                        <div className="border-b border-white/10 h-0 w-2 ml-auto"></div>
                        <div className="border-b border-white/10 h-0 w-2 ml-auto"></div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex-1 grid grid-cols-1 gap-3">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <span className="text-xs text-white/50 block mb-1">Current Deficit</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-white">{current_deficit_mm.toFixed(1)}</span>
                            <span className="text-xs text-white/50">mm</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">ETc Today</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-semibold text-blue-200">{etc_mm_day.toFixed(1)}</span>
                                <span className="text-xs text-white/50">mm</span>
                            </div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">Next Vol</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-semibold text-emerald-200">{calculated_volume_l.toFixed(0)}</span>
                                <span className="text-xs text-white/50">L</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {irrigation_needed === 1 && (
                <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-3 relative z-10">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    <span className="text-sm text-blue-100">Irrigation needed based on deficit</span>
                </div>
            )}
        </div>
    );
};
