/**
 * Watering Volume Chart Component
 * 
 * Stacked BarChart showing water volume per channel over time.
 */

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';
import { CHART_COLORS } from './index';

interface WateringDataPoint {
    date: string;
    timestamp: number;
    totalVolume: number;
    sessions: number;
    successRate: number;
    channels: { [key: number]: number };
}

interface WateringVolumeChartProps {
    data: WateringDataPoint[];
    channelNames?: { [key: number]: string };
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    stacked?: boolean;
    animate?: boolean;
}

const CustomTooltip = ({ active, payload, label, channelNames }: any) => {
    if (active && payload && payload.length) {
        const totalVolume = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
        
        return (
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl min-w-[160px]">
                <p className="text-gray-400 text-xs mb-2 border-b border-gray-700 pb-2">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => {
                        if (entry.value === 0) return null;
                        const channelId = parseInt(entry.dataKey.replace('ch', ''));
                        const name = channelNames?.[channelId] || `Zone ${channelId}`;
                        
                        return (
                            <div key={index} className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-2.5 h-2.5 rounded-sm" 
                                        style={{ backgroundColor: entry.fill || entry.color }}
                                    />
                                    <span className="text-gray-300">{name}</span>
                                </div>
                                <span className="text-white font-medium">
                                    {entry.value >= 1000 
                                        ? `${(entry.value / 1000).toFixed(1)}L`
                                        : `${entry.value}ml`
                                    }
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between">
                    <span className="text-gray-400 text-xs">Total</span>
                    <span className="text-cyan-400 font-medium text-sm">
                        {totalVolume >= 1000 
                            ? `${(totalVolume / 1000).toFixed(1)}L`
                            : `${totalVolume}ml`
                        }
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

const WateringVolumeChart: React.FC<WateringVolumeChartProps> = ({
    data,
    channelNames = {},
    height = 300,
    showLegend = true,
    showGrid = true,
    stacked = true,
    animate = true
}) => {
    if (!data || data.length === 0) {
        return (
            <div 
                className="flex items-center justify-center text-gray-500 bg-gray-800/30 rounded-lg"
                style={{ height }}
            >
                <div className="text-center">
                    <p className="text-lg">💧</p>
                    <p className="text-sm mt-2">No watering data</p>
                </div>
            </div>
        );
    }

    // Get all unique channel IDs
    const channelIds = new Set<number>();
    data.forEach(d => {
        Object.keys(d.channels).forEach(ch => channelIds.add(parseInt(ch)));
    });
    const channels = Array.from(channelIds).sort((a, b) => a - b);

    // Transform data for stacked chart
    const chartData = data.map(d => {
        const result: any = {
            label: formatDate(d.date),
            date: d.date,
            totalVolume: d.totalVolume,
            sessions: d.sessions,
            successRate: d.successRate
        };
        
        channels.forEach(ch => {
            result[`ch${ch}`] = d.channels[ch] || 0;
        });
        
        return result;
    });

    function formatDate(dateStr: string): string {
        if (dateStr.includes('T')) {
            // Hourly format: 2025-12-05T14
            const parts = dateStr.split('T');
            return `${parts[1]}:00`;
        }
        // Daily format: 2025-12-05
        const date = new Date(dateStr);
        return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
    }

    return (
        <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    {showGrid && (
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={CHART_COLORS.grid}
                            opacity={0.3}
                            vertical={false}
                        />
                    )}
                    
                    <XAxis 
                        dataKey="label"
                        stroke={CHART_COLORS.axis}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                    />
                    
                    <YAxis 
                        stroke={CHART_COLORS.axis}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                        tickFormatter={(value) => 
                            value >= 1000 ? `${(value / 1000).toFixed(0)}L` : `${value}`
                        }
                    />
                    
                    <Tooltip content={<CustomTooltip channelNames={channelNames} />} />
                    
                    {showLegend && channels.length > 1 && (
                        <Legend 
                            wrapperStyle={{ paddingTop: 10 }}
                            formatter={(value) => {
                                const channelId = parseInt(value.replace('ch', ''));
                                const name = channelNames[channelId] || `Zone ${channelId}`;
                                return <span className="text-gray-400 text-xs">{name}</span>;
                            }}
                        />
                    )}

                    {channels.map((channelId, index) => (
                        <Bar
                            key={`ch${channelId}`}
                            dataKey={`ch${channelId}`}
                            stackId={stacked ? 'volume' : undefined}
                            fill={CHART_COLORS.channels[index % CHART_COLORS.channels.length]}
                            radius={index === channels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            isAnimationActive={animate}
                            animationDuration={600}
                            animationBegin={index * 100}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WateringVolumeChart;
